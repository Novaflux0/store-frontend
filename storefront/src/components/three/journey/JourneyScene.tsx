'use client';

import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  CatmullRomCurve3,
  Object3D,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
} from 'three';

import { useTheme } from '@/hooks/useTheme';

import type { DeviceTier } from '../device-tier';
import { Filaments } from './Filaments';
import { JourneyState, budgetDpr, coreFit, stageAt } from './journey-math';
import { PALETTES, type Palette } from './palette';
import { LightBulb } from './LightBulb';

export interface JourneySceneProps {
  readonly tier: Exclude<DeviceTier, 'off'>;
  /** False while the journey is off-screen or the tab is hidden: the render loop stops. */
  readonly active: boolean;
  /** Document offsets of the `data-journey-stage` markers, kept current by JourneyCanvas. */
  readonly markers: RefObject<readonly number[]>;
}

type LiveRef = RefObject<JourneyState>;

const SATELLITE_COUNT = 5;
const STEP_COUNT = 5;
const STEP_SPACING = 2.2;
/** Height of the process path: the empty band above the section heading. */
const PATH_Y = 2;
/** Reading line as a share of the viewport height: the stage changes as a section crosses it. */
const READING_LINE = 0.5;

/**
 * Caps the drawing buffer at MAX_CANVAS_PIXELS whenever the canvas size or pixel ratio
 * changes (including after AdaptiveDpr), so a huge viewport cannot exhaust GPU memory.
 * When the canvas shrinks again, a ratio this component lowered goes back up to the
 * canvas's own ratio; a ratio AdaptiveDpr lowered for performance is left alone.
 */
function PixelBudget() {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const dpr = useThree((state) => state.viewport.dpr);
  const initialDpr = useThree((state) => state.viewport.initialDpr);
  const setDpr = useThree((state) => state.setDpr);
  const cappedTo = useRef<number | null>(null);
  useEffect(() => {
    const target = budgetDpr(width, height, initialDpr);
    if (dpr > target) {
      cappedTo.current = target;
      setDpr(target);
    } else if (cappedTo.current === dpr && dpr < target) {
      cappedTo.current = target < initialDpr ? target : null;
      setDpr(target);
    }
  }, [width, height, dpr, initialDpr, setDpr]);
  return null;
}

/** Turns the scroll position into the current pose and moves the camera. Runs first. */
function Rig({
  live,
  markers,
}: {
  readonly live: LiveRef;
  readonly markers: JourneySceneProps['markers'];
}) {
  useFrame((state, delta) => {
    const target = stageAt(window.scrollY + window.innerHeight * READING_LINE, markers.current);
    const current = live.current;
    // Starts at the right stage after a reload mid-page, then eases towards the target.
    current.advance(target, delta);

    const { camera, gl } = state;
    camera.position.z = current.pose.cameraZ;
    camera.position.y = current.pose.cameraY;
    camera.lookAt(0, 0, 0);
    const opacity = current.pose.opacity.toFixed(2);
    if (gl.domElement.style.opacity !== opacity) gl.domElement.style.opacity = opacity;
  });
  return null;
}

/** Small crystals orbiting the core, one per service (one draw call). */
function Satellites({ colors, live }: { readonly colors: Palette; readonly live: LiveRef }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { satellites, coreX, coreY, coreScale } = live.current.pose;
    mesh.visible = satellites > 0.01;
    if (!mesh.visible) return;
    const t = state.clock.elapsedTime;
    const fit = coreFit(state.size.width / state.size.height);
    const radius = (1.6 + satellites * 1.4) * Math.max(coreScale, 0.6) * fit;
    for (let i = 0; i < SATELLITE_COUNT; i += 1) {
      const angle = t * 0.4 + (i / SATELLITE_COUNT) * Math.PI * 2;
      dummy.position.set(
        coreX + Math.cos(angle) * radius,
        coreY + Math.sin(angle) * radius * 0.35,
        Math.sin(angle) * radius,
      );
      dummy.rotation.set(t * 0.6 + i, t * 0.8, 0);
      dummy.scale.setScalar(0.22 * satellites * fit);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, SATELLITE_COUNT]}
      frustumCulled={false}
    >
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={colors.violet} toneMapped={false} />
    </instancedMesh>
  );
}

/**
 * The process path: a glowing curve through one node per step. It slides sideways as
 * the process section scrolls, so the current step's node passes the centre.
 */
function ProcessPath({ colors, live }: { readonly colors: Palette; readonly live: LiveRef }) {
  const groupRef = useRef<Group>(null);
  const tubeMaterialRef = useRef<MeshBasicMaterial>(null);
  const nodesRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const points = useMemo(
    () =>
      Array.from(
        { length: STEP_COUNT },
        (_, i) => new Vector3(i * STEP_SPACING, Math.sin(i * 1.3) * 0.6, -Math.cos(i * 0.9) * 0.6),
      ),
    [],
  );
  const curve = useMemo(() => new CatmullRomCurve3(points), [points]);

  useFrame(() => {
    const group = groupRef.current;
    const nodes = nodesRef.current;
    if (!group || !nodes) return;
    const { pose, process } = live.current;
    group.visible = pose.path > 0.01;
    if (!group.visible) return;
    group.position.set(-process * (STEP_COUNT - 1) * STEP_SPACING, PATH_Y + (1 - pose.path) * 2, 0);
    if (tubeMaterialRef.current) tubeMaterialRef.current.opacity = pose.path * 0.8;
    const active = Math.min(STEP_COUNT - 1, Math.floor(process * STEP_COUNT));
    points.forEach((point, i) => {
      dummy.position.copy(point);
      dummy.scale.setScalar((i === active ? 0.24 : 0.13) * pose.path);
      dummy.updateMatrix();
      nodes.setMatrixAt(i, dummy.matrix);
    });
    nodes.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <tubeGeometry args={[curve, 160, 0.02, 8, false]} />
        <meshBasicMaterial
          ref={tubeMaterialRef}
          color={colors.cyan}
          transparent
          toneMapped={false}
        />
      </mesh>
      <instancedMesh ref={nodesRef} args={[undefined, undefined, STEP_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={colors.violet} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/**
 * Procedural scroll journey behind the whole home page (no external model): the hero
 * light bulb over a web of glowing filaments, satellites for the services, the web
 * dimming for the work, a path through the process steps, and a final convergence at
 * the call to action.
 * About 12 draw calls. Bloom only on the high tier, only while performance holds, and
 * only in the dark theme (on a light background it would wash the frame out). R3F
 * disposes the JSX-declared geometries and materials on unmount.
 */
export default function JourneyScene({ tier, active, markers }: JourneySceneProps) {
  const [degraded, setDegraded] = useState(tier === 'low');
  const [visible, setVisible] = useState(false);
  const [theme] = useTheme();
  const colors = PALETTES[theme];
  const live = useRef(new JourneyState());

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <Canvas
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.75]}
        frameloop={active ? 'always' : 'never'}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 40 }}
        eventSource={document.body}
        eventPrefix="client"
        onCreated={() => {
          setVisible(true);
        }}
      >
        <color attach="background" args={[colors.bg]} />
        <PerformanceMonitor
          onDecline={() => {
            setDegraded(true);
          }}
          onFallback={() => {
            setDegraded(true);
          }}
        />
        <AdaptiveDpr pixelated />
        <PixelBudget />
        <Rig live={live} markers={markers} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} color={colors.cyan} />
        <Filaments detail={degraded ? 'low' : 'high'} theme={theme} live={live} />
        <LightBulb
          colors={colors}
          live={live}
          detail={degraded ? 'low' : 'high'}
          glow={theme === 'dark'}
        />
        <Satellites colors={colors} live={live} />
        <ProcessPath colors={colors} live={live} />
        {tier === 'high' && !degraded && theme === 'dark' ? (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.2} luminanceSmoothing={0.3} />
          </EffectComposer>
        ) : null}
      </Canvas>
    </div>
  );
}
