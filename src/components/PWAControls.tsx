import React, { useState } from 'react';
import { Download, RefreshCw, Share, WifiOff, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { applyPwaUpdate } from '../pwa/registerPwa';
import { sounds } from '../audio/SoundEffects';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isOnline, isOfflineReady, needRefresh } = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" data-interactive-ui="true">
        {needRefresh && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              void applyPwaUpdate();
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-game font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Update Ready</span>
          </button>
        )}

        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              void install();
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-game font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{compact ? 'Install App' : 'Install for Offline Play'}</span>
          </button>
        )}

        {!isInstalled && !isInstallable && isIOS && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowIOSGuide(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/60 text-amber-200 text-xs font-game font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Share className="w-3.5 h-3.5" />
            <span>Install on iOS</span>
          </button>
        )}

        <div
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shadow-sm ${
            !isOnline
              ? 'bg-amber-950/90 border-amber-500/70 text-amber-200'
              : isOfflineReady
              ? 'bg-emerald-950/85 border-emerald-500/60 text-emerald-200'
              : 'bg-slate-900/85 border-slate-700 text-slate-300'
          }`}
          title={
            !isOnline
              ? 'Playing offline with local game files and auto-save'
              : isOfflineReady
              ? 'Game assets cached for offline play'
              : 'Preparing offline game cache'
          }
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-300" />
              <span>Offline Mode</span>
            </>
          ) : isOfflineReady ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Offline Ready</span>
            </>
          ) : (
            <span>Solo Play Ready</span>
          )}
        </div>
      </div>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          data-interactive-ui="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border-2 border-amber-500/70 p-5 shadow-2xl text-left">
            <h3 className="font-game text-lg font-bold text-amber-300">
              Install Mars Survival on iPhone / iPad
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Install this game to play fullscreen anytime, even in Airplane Mode:
            </p>
            <ol className="mt-3 space-y-2 text-xs sm:text-sm text-slate-200 list-decimal list-inside">
              <li>
                Tap the <strong className="text-sky-300">Share</strong> button in Safari&apos;s toolbar.
              </li>
              <li>
                Scroll down and tap <strong className="text-amber-300">Add to Home Screen</strong>.
              </li>
              <li>Launch MarsExplorer from your Home Screen offline anytime!</li>
            </ol>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowIOSGuide(false);
              }}
              className="mt-4 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2 text-xs sm:text-sm font-game font-bold text-slate-950 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[65] pointer-events-none flex items-center gap-2 rounded-xl bg-amber-950/95 border border-amber-400/80 px-3 py-1 text-[10px] sm:text-[11px] font-bold text-amber-100 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span>Offline Mode · Solo Expedition &amp; Local Save Active</span>
    </div>
  );
};
