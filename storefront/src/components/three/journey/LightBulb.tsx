'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  LatheGeometry,
  MathUtils,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  Vector2,
  type Group,
  type InstancedMesh,
  type LineBasicMaterial,
  type MeshBasicMaterial,
  type PointsMaterial,
  type SpriteMaterial,
} from 'three';

import { GLASS_START, bulbLight, bulbProfile, heroPin } from './bulb-math';
import { bulbInput } from './bulb-input';
import { createGlowTexture } from './glow-texture';
import { coreFit, type JourneyState } from './journey-math';
import { mulberry32, type Palette } from './palette';

/** The model is 1 unit tall, centred on its origin; this sizes it for the journey poses. */
const POSE_SCALE = 3.2;
const SEGMENTS = { low: 8, high: 11 } as const;
const SHARD_COUNT = 14;
/** Slow automatic spin (radians per second) the bulb returns to after a drag. */
const AUTO_SPIN = 0.35;
const DRAG_SPEED = 0.009;

/** Colours that fit each theme: pale glass lines on dark, deep teal on light. */
const BULB_COLORS = {
  dark: { line: '#c4eef3', node: '#e9fbff', light: '#fff1c1' },
  light: { line: '#0e7490', node: '#0e7490', light: '#f59e0b' },
} as const;

export interface LightBulbProps {
  readonly colors: Palette;
  readonly live: RefObject<JourneyState>;
  readonly detail: keyof typeof SEGMENTS;
  /** Dark theme: additive glow. Light theme: plain blending (additive would vanish). */
  readonly glow: boolean;
}

/**
 * Low-poly bulb: the lathe of `bulbProfile`, vertices nudged so the facets look
 * hand-cut, each facet with its own translucency (the screw base more solid than the
 * glass), the facet edges as wires and the vertices as glowing nodes. The filament is
 * a small coil inside the glass.
 */
function buildBulb(detail: keyof typeof SEGMENTS) {
  const random = mulberry32(23);
  const profile = bulbProfile().map(([radius, height]) => new Vector2(radius, height - 0.5));
  const lathe = new LatheGeometry(profile, SEGMENTS[detail]);

  // Nudge every distinct vertex once (seam duplicates move together, so no cracks).
  const position = lathe.getAttribute('position');
  const offsets = new Map<string, readonly [number, number, number]>();
  const nodePositions: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let offset = offsets.get(key);
    if (!offset) {
      const radial = Math.hypot(x, z) > 1e-4 ? 1 + (random() - 0.5) * 0.09 : 1;
      offset = [radial, (random() - 0.5) * 0.012, radial];
      offsets.set(key, offset);
      nodePositions.push(x * radial, y + offset[1], z * radial);
    }
    position.setXYZ(i, x * offset[0], y + offset[1], z * offset[2]);
  }

  const edges = new EdgesGeometry(lathe, 1);
  const nodes = new BufferGeometry();
  nodes.setAttribute('position', new BufferAttribute(new Float32Array(nodePositions), 3));

  const facets = lathe.toNonIndexed();
  const facetPositions = facets.getAttribute('position');
  const facetColors = new Float32Array(facetPositions.count * 4);
  for (let corner = 0; corner < facetPositions.count; corner += 3) {
    const centreY =
      (facetPositions.getY(corner) +
        facetPositions.getY(corner + 1) +
        facetPositions.getY(corner + 2)) /
        3 +
      0.5;
    const base = centreY < GLASS_START;
    const alpha = base
      ? 0.18 + random() * 0.12
      : random() < 0.2
        ? 0.14 + random() * 0.12
        : 0.02 + random() * 0.06;
    for (let k = 0; k < 3; k += 1) facetColors.set([1, 1, 1, alpha], (corner + k) * 4);
  }
  facets.setAttribute('color', new BufferAttribute(facetColors, 4));
  lathe.dispose();

  // Filament: a stem up from the base and a small coil across the middle of the glass.
  const filamentPoints: number[] = [];
  const segment = (a: readonly number[], b: readonly number[]) => filamentPoints.push(...a, ...b);
  segment([-0.03, GLASS_START - 0.5, 0], [-0.03, 0.02, 0]);
  segment([0.03, GLASS_START - 0.5, 0], [0.03, 0.02, 0]);
  for (let i = 0; i < 8; i += 1) {
    const x0 = -0.06 + (i / 8) * 0.12;
    const x1 = -0.06 + ((i + 1) / 8) * 0.12;
    segment([x0, 0.02 + (i % 2) * 0.035, 0], [x1, 0.02 + ((i + 1) % 2) * 0.035, 0]);
  }
  const filament = new BufferGeometry();
  filament.setAttribute('position', new BufferAttribute(new Float32Array(filamentPoints), 3));

  // Floating shards around the glass, like the triangles in the artwork.
  const shard = new BufferGeometry();
  shard.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0.05, 0, -0.045, -0.03, 0, 0.045, -0.03, 0]), 3),
  );
  const dummy = new Object3D();
  const shardMatrices = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const angle = (i / SHARD_COUNT) * Math.PI * 2 + random() * 0.4;
    const distance = 0.42 + random() * 0.22;
    dummy.position.set(
      Math.cos(angle) * distance,
      0.15 + (random() - 0.35) * 0.55,
      Math.sin(angle) * distance,
    );
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.setScalar(0.6 + random() * 0.9);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });

  return { facets, edges, nodes, filament, shard, shardMatrices };
}

/**
 * The hero light bulb (the site owner's artwork, built in 3D): it floats above the
 * wireframe hand, spins slowly on its own and can be turned by dragging (mouse, or a
 * sideways swipe on touch screens, forwarded by `BulbStage`). Its filament blinks on
 * and off. In the hero it is pinned to the `BulbStage` anchor, so it lines up with the
 * hand image at any screen size; as the page scrolls on it follows the journey poses,
 * and it lights up steadily at the call to action.
 */
export function LightBulb({ colors, live, detail, glow }: LightBulbProps) {
  const groupRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const shardsRef = useRef<Group>(null);
  const innerOrbitRef = useRef<Group>(null);
  const outerOrbitRef = useRef<Group>(null);
  const shardFillRef = useRef<InstancedMesh>(null);
  const shardWireRef = useRef<InstancedMesh>(null);
  const facetMaterialRef = useRef<MeshBasicMaterial>(null);
  const edgeMaterialRef = useRef<LineBasicMaterial>(null);
  const nodeMaterialRef = useRef<PointsMaterial>(null);
  const filamentMaterialRef = useRef<LineBasicMaterial>(null);
  const coreGlowRef = useRef<SpriteMaterial>(null);
  const haloRef = useRef<SpriteMaterial>(null);
  const motion = useRef({ yaw: 0.4, pitch: 0, velocity: AUTO_SPIN });

  const bulb = useMemo(() => buildBulb(detail), [detail]);
  const texture = useMemo(() => createGlowTexture(), []);
  const palette = BULB_COLORS[glow ? 'dark' : 'light'];
  const blending = glow ? AdditiveBlending : NormalBlending;

  useEffect(
    () => () => {
      bulb.facets.dispose();
      bulb.edges.dispose();
      bulb.nodes.dispose();
      bulb.filament.dispose();
      bulb.shard.dispose();
    },
    [bulb],
  );
  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );
  // Instance matrices of the shards, written once per layout.
  useEffect(() => {
    for (const mesh of [shardFillRef.current, shardWireRef.current]) {
      if (!mesh) continue;
      bulb.shardMatrices.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [bulb]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const spin = spinRef.current;
    if (!group || !spin) return;
    const { pose, stage } = live.current;
    const t = state.clock.elapsedTime;

    // Where the journey pose puts it, and where the hero's anchor (above the hand) is.
    let x = pose.coreX;
    let y = pose.coreY;
    let scale = pose.coreScale * POSE_SCALE * coreFit(state.size.width / state.size.height);
    const pin = heroPin(stage);
    const anchor = bulbInput.anchor;
    if (pin > 0 && anchor && state.camera instanceof PerspectiveCamera) {
      const rect = anchor.getBoundingClientRect();
      const distance = state.camera.position.z;
      const worldPerPx =
        (2 * Math.tan(MathUtils.degToRad(state.camera.fov) / 2) * distance) / state.size.height;
      const anchorX = (rect.left + rect.width / 2 - state.size.width / 2) * worldPerPx;
      const anchorY = -(rect.top + rect.height / 2 - state.size.height / 2) * worldPerPx;
      x = MathUtils.lerp(x, anchorX, pin);
      y = MathUtils.lerp(y, anchorY, pin);
      scale = MathUtils.lerp(scale, rect.height * worldPerPx, pin);
    }
    group.position.set(x, y + Math.sin(t * 1.1) * 0.025 * scale, 0);
    group.scale.setScalar(scale);

    // Spin: dragged by the visitor, otherwise coasting back to the slow automatic turn.
    const m = motion.current;
    const { dx, dy } = bulbInput.consume();
    if (bulbInput.dragging) {
      const turn = dx * DRAG_SPEED;
      m.yaw += turn;
      m.pitch = MathUtils.clamp(m.pitch + dy * DRAG_SPEED, -0.5, 0.5);
      m.velocity = delta > 0 ? MathUtils.lerp(m.velocity, turn / delta, 0.5) : m.velocity;
    } else {
      m.velocity = MathUtils.damp(m.velocity, AUTO_SPIN, 1.2, delta);
      m.yaw += m.velocity * delta;
      m.pitch = MathUtils.damp(m.pitch, 0, 1.5, delta);
    }
    spin.rotation.set(m.pitch, m.yaw, Math.sin(t * 0.4) * 0.05);
    if (shardsRef.current) shardsRef.current.rotation.y = -t * 0.12;
    if (innerOrbitRef.current) innerOrbitRef.current.rotation.z = t * 0.45;
    if (outerOrbitRef.current) outerOrbitRef.current.rotation.z = -t * 0.3;

    // Blink, held steady and bright as the journey converges at the call to action.
    const light = Math.max(bulbLight(t), pose.converge);
    if (facetMaterialRef.current) facetMaterialRef.current.opacity = 0.5 + light * 0.2;
    if (edgeMaterialRef.current) edgeMaterialRef.current.opacity = 0.6 + light * 0.25;
    if (nodeMaterialRef.current) nodeMaterialRef.current.size = 0.05 * (0.8 + light * 0.4);
    if (filamentMaterialRef.current) filamentMaterialRef.current.opacity = 0.15 + light * 0.5;
    if (coreGlowRef.current) coreGlowRef.current.opacity = light * 0.35;
    if (haloRef.current) haloRef.current.opacity = light * (glow ? 0.14 : 0.3);
  });

  return (
    <group ref={groupRef}>
      <sprite scale={2.4} position={[0, 0.12, 0]}>
        <spriteMaterial
          ref={haloRef}
          map={texture}
          color={palette.light}
          transparent
          depthWrite={false}
          blending={blending}
          toneMapped={false}
        />
      </sprite>
      <group ref={spinRef}>
        <mesh geometry={bulb.facets}>
          <meshBasicMaterial
            ref={facetMaterialRef}
            color={palette.line}
            vertexColors
            transparent
            side={DoubleSide}
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </mesh>
        <lineSegments geometry={bulb.edges}>
          <lineBasicMaterial
            ref={edgeMaterialRef}
            color={palette.line}
            transparent
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </lineSegments>
        <points geometry={bulb.nodes}>
          <pointsMaterial
            ref={nodeMaterialRef}
            map={texture}
            color={palette.node}
            size={0.05}
            transparent
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </points>
        <lineSegments geometry={bulb.filament}>
          <lineBasicMaterial
            ref={filamentMaterialRef}
            color={palette.light}
            transparent
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </lineSegments>
        <sprite scale={0.42} position={[0, 0.04, 0]}>
          <spriteMaterial
            ref={coreGlowRef}
            map={texture}
            color={palette.light}
            transparent
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </sprite>
      </group>
      <group ref={shardsRef}>
        <instancedMesh
          ref={shardFillRef}
          args={[bulb.shard, undefined, SHARD_COUNT]}
          frustumCulled={false}
        >
          <meshBasicMaterial
            color={palette.line}
            transparent
            opacity={0.18}
            side={DoubleSide}
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </instancedMesh>
        <instancedMesh
          ref={shardWireRef}
          args={[bulb.shard, undefined, SHARD_COUNT]}
          frustumCulled={false}
        >
          <meshBasicMaterial
            color={palette.line}
            wireframe
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={blending}
            toneMapped={false}
          />
        </instancedMesh>
      </group>
      {/* Two tilted orbit rings around the glass, each carrying a glowing spark. */}
      <group position={[0, 0.12, 0]}>
        <group rotation={[1.2, 0, 0.35]}>
          <group ref={innerOrbitRef}>
            <mesh>
              <torusGeometry args={[0.62, 0.003, 6, 160]} />
              <meshBasicMaterial
                color={colors.cyan}
                transparent
                opacity={0.6}
                depthWrite={false}
                blending={blending}
                toneMapped={false}
              />
            </mesh>
            <sprite scale={0.09} position={[0.62, 0, 0]}>
              <spriteMaterial
                map={texture}
                color={colors.cyan}
                transparent
                depthWrite={false}
                blending={blending}
                toneMapped={false}
              />
            </sprite>
          </group>
        </group>
        <group rotation={[1.0, 0.55, -0.6]}>
          <group ref={outerOrbitRef}>
            <mesh>
              <torusGeometry args={[0.74, 0.0025, 6, 180]} />
              <meshBasicMaterial
                color={colors.violet}
                transparent
                opacity={0.5}
                depthWrite={false}
                blending={blending}
                toneMapped={false}
              />
            </mesh>
            <sprite scale={0.08} position={[-0.74, 0, 0]}>
              <spriteMaterial
                map={texture}
                color={colors.violet}
                transparent
                depthWrite={false}
                blending={blending}
                toneMapped={false}
              />
            </sprite>
          </group>
        </group>
      </group>
      <Sparkles
        count={detail === 'high' ? 40 : 20}
        scale={[1.4, 1.4, 1.4]}
        size={2}
        speed={0.3}
        noise={0.5}
        opacity={0.8}
        color={colors.cyan}
      />
    </group>
  );
}
