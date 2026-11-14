import { registerSW } from 'virtual:pwa-register';

export interface PwaState {
  offlineReady: boolean;
  needRefresh: boolean;
}

type Listener = (state: PwaState) => void;

let currentState: PwaState = {
  offlineReady: false,
  needRefresh: false,
};

const listeners = new Set<Listener>();
let updateServiceWorkerFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let initialized = false;

function notify() {
  listeners.forEach((fn) => fn({ ...currentState }));
}

export function initPwaRegistration() {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  initialized = true;

  try {
    updateServiceWorkerFn = registerSW({
      immediate: true,
      onOfflineReady() {
        currentState = { ...currentState, offlineReady: true };
        notify();
      },
      onNeedRefresh() {
        currentState = { ...currentState, needRefresh: true };
        notify();
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration && registration.active) {
          currentState = { ...currentState, offlineReady: true };
          notify();
        }
      },
      onRegisterError() {
        // Ignore gracefully if restricted by iframe sandbox or private browsing
      },
    });
  } catch {
    // Graceful no-op when service worker API is unavailable
  }
}

export function getPwaState(): PwaState {
  return { ...currentState };
}

export function subscribePwaState(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export async function applyPwaUpdate() {
  if (updateServiceWorkerFn) {
    await updateServiceWorkerFn(true);
  }
}
