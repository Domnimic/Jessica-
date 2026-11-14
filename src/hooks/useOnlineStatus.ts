import { useEffect, useState } from 'react';
import { getPwaState, PwaState, subscribePwaState } from '../pwa/registerPwa';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pwaState, setPwaState] = useState<PwaState>(() => getPwaState());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubPwa = subscribePwaState(setPwaState);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubPwa();
    };
  }, []);

  return {
    isOnline,
    isOfflineReady: pwaState.offlineReady,
    needRefresh: pwaState.needRefresh,
  };
}
