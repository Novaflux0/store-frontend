/**
 * 3D quality tier (doc §6.3 rule 2):
 *  - `off`:  no WebGL, WebGL only in software (no GPU acceleration: every frame would
 *            block the main thread), or the user asked to save data; static fallback only.
 *  - `low`:  phones and low-power devices; fewer filaments, no postprocessing.
 *  - `high`: desktops with enough cores and memory; full scene with bloom.
 */
export type DeviceTier = 'off' | 'low' | 'high';

export interface DeviceSignals {
  readonly hardwareConcurrency?: number | undefined;
  /** `navigator.deviceMemory` in GiB (Chromium only). */
  readonly deviceMemory?: number | undefined;
  /** `matchMedia('(pointer: coarse)').matches`: touch-first device. */
  readonly coarsePointer: boolean;
  /** `navigator.connection.saveData`. */
  readonly saveData?: boolean | undefined;
  readonly webgl: boolean;
  /** WebGL works, but only with a major performance caveat (a software rasterizer). */
  readonly softwareWebgl?: boolean | undefined;
}

const LOW_CORES = 4;
const LOW_MEMORY_GIB = 4;

export function classifyDevice(signals: DeviceSignals): DeviceTier {
  if (!signals.webgl || signals.softwareWebgl === true || signals.saveData === true) return 'off';
  if (signals.coarsePointer) return 'low';
  if (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= LOW_CORES) {
    return 'low';
  }
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= LOW_MEMORY_GIB) return 'low';
  return 'high';
}

interface NavigatorWithHints extends Navigator {
  readonly deviceMemory?: number;
  readonly connection?: { readonly saveData?: boolean };
}

/** Renderer names of CPU rasterizers: WebGL works there, but every frame blocks the main thread. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE_RENDERER.test(renderer);
}

interface WebGlProbe {
  /** The (unmasked where available) renderer name, '' when unknown. */
  readonly renderer: string;
}

/**
 * Creates a WebGL context, optionally refusing one with a major performance caveat
 * (`failIfMajorPerformanceCaveat`), and reads its renderer name. A fresh canvas per
 * probe, since a canvas keeps the first context type it gets; the probe context is
 * released at once. Null when no context could be created.
 */
function probeWebGl(refuseSoftware: boolean): WebGlProbe | null {
  try {
    const attributes: WebGLContextAttributes = { failIfMajorPerformanceCaveat: refuseSoftware };
    const webgl2 = document.createElement('canvas').getContext('webgl2', attributes);
    const context = webgl2 ?? document.createElement('canvas').getContext('webgl', attributes);
    if (context === null) return null;
    const info = context.getExtension('WEBGL_debug_renderer_info');
    const renderer: unknown = context.getParameter(
      info?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER,
    );
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer: typeof renderer === 'string' ? renderer : '' };
  } catch {
    return null;
  }
}

/** Reads the signals from the browser. Call only on the client. */
export function detectDeviceTier(): DeviceTier {
  const nav: NavigatorWithHints = navigator;
  const webgl = probeWebGl(false);
  return classifyDevice({
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    saveData: nav.connection?.saveData,
    webgl: webgl !== null,
    softwareWebgl:
      webgl !== null && (isSoftwareRenderer(webgl.renderer) || probeWebGl(true) === null),
  });
}
