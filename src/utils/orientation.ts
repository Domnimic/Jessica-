/**
 * Best-effort helpers for locking screen orientation to horizontal landscape
 * on supported mobile/tablet browsers, PWAs, and fullscreen sessions.
 */

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'landscape-primary' | 'landscape-secondary' | 'portrait' | 'any') => Promise<void>;
  unlock?: () => void;
};

export async function tryLockLandscapeOrientation(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof screen === 'undefined') return false;
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
      return true;
    }
  } catch {
    // Browsers restrict orientation.lock() outside fullscreen or installed PWAs
  }
  return false;
}

export async function requestFullscreenLandscape(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    if (!document.fullscreenElement) {
      if (typeof root.requestFullscreen === 'function') {
        await root.requestFullscreen();
      } else if (typeof root.webkitRequestFullscreen === 'function') {
        await root.webkitRequestFullscreen();
      }
    }
  } catch {
    // Ignore fullscreen rejection if unsupported (e.g. iOS Safari)
  }
  return tryLockLandscapeOrientation();
}
