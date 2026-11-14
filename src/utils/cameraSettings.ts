export const DEFAULT_CAMERA_FOV = 95;
export const MIN_CAMERA_FOV = 70;
export const MAX_CAMERA_FOV = 110;

const CAMERA_FOV_STORAGE_KEY = 'mars_camera_fov_v1';

export function clampCameraFov(fov: number): number {
  if (!Number.isFinite(fov)) return DEFAULT_CAMERA_FOV;
  return Math.round(Math.max(MIN_CAMERA_FOV, Math.min(MAX_CAMERA_FOV, fov)));
}

export function loadCameraFov(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_CAMERA_FOV;
    }
    const raw = window.localStorage.getItem(CAMERA_FOV_STORAGE_KEY);
    if (!raw) return DEFAULT_CAMERA_FOV;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_CAMERA_FOV;
    return clampCameraFov(parsed);
  } catch {
    return DEFAULT_CAMERA_FOV;
  }
}

export function saveCameraFov(fov: number): number {
  const clamped = clampCameraFov(fov);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CAMERA_FOV_STORAGE_KEY, String(clamped));
    }
  } catch {
    // Ignore storage errors in restricted WebViews
  }
  return clamped;
}
