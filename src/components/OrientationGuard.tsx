import React, { useEffect, useState } from 'react';
import { requestFullscreenLandscape } from '../utils/orientation';
import { sounds } from '../audio/SoundEffects';

interface OrientationState {
  isPortrait: boolean;
  shouldPromptRotation: boolean;
}

function measureOrientation(): OrientationState {
  if (typeof window === 'undefined') {
    return { isPortrait: false, shouldPromptRotation: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h > w * 1.03; // small 3% tolerance for near-square windows
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const isTouchDevice = hasCoarsePointer || navigator.maxTouchPoints > 0;
  // Prompt whenever held vertically on touch devices OR on narrow vertical viewports
  const shouldPromptRotation = isPortrait && (isTouchDevice || w < 900);
  return { isPortrait, shouldPromptRotation };
}

export const OrientationGuard: React.FC = () => {
  const [orientation, setOrientation] = useState<OrientationState>(() => measureOrientation());
  const [dismissedInSession, setDismissedInSession] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const next = measureOrientation();
      setOrientation(next);
      // Reset dismissal once device returns to landscape so future portrait holds show guidance again
      if (!next.isPortrait) {
        setDismissedInSession(false);
        setStatusMessage(null);
      }
    };

    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    const mq =
      typeof window.matchMedia === 'function' ? window.matchMedia('(orientation: portrait)') : null;
    mq?.addEventListener?.('change', sync);

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      mq?.removeEventListener?.('change', sync);
    };
  }, []);

  if (!orientation.shouldPromptRotation || dismissedInSession) {
    return null;
  }

  const handleFullscreenLandscape = async () => {
    sounds.unlockAudio();
    sounds.playClick();
    const locked = await requestFullscreenLandscape();
    if (!locked && window.innerHeight > window.innerWidth) {
      setStatusMessage(
        'Please turn your device sideways (enable Auto-Rotate if rotation lock is active).'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rotate device to landscape mode"
      data-interactive-ui="true"
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[#070a12]/95 px-6 py-8 text-center select-none"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 border-amber-500/70 bg-slate-950/95 p-6 shadow-2xl shadow-amber-950/50 flex flex-col items-center gap-4">
        {/* Animated Rotate-to-Landscape Device Illustration */}
        <div className="relative w-24 h-20 flex items-center justify-center" aria-hidden="true">
          <div className="w-11 h-16 rounded-xl border-2 border-amber-400/90 bg-slate-900 flex flex-col items-center justify-between p-1.5 shadow-lg shadow-amber-500/20 animate-rotate-device">
            <div className="w-4 h-1 rounded-full bg-slate-600" />
            <div className="text-base leading-none">🪐</div>
            <div className="w-2.5 h-2.5 rounded-full border border-amber-400/70" />
          </div>
          <span className="absolute -right-1 top-1 text-xl text-cyan-300 font-bold">↻</span>
        </div>

        <div>
          <div className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 mb-2">
            16:9 Horizontal Mode Recommended
          </div>
          <h2 className="font-game font-bold text-xl text-white tracking-wide">
            Rotate Device to Landscape
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <strong className="text-amber-300">Mars Survival: Last Explorer</strong> uses a widescreen 16:9 layout for full 360° camera rotation, bottom-left joystick, and bottom-right action controls.
          </p>
        </div>

        <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 text-left text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">1.</span>
            <span>Turn your phone or tablet horizontally.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">2.</span>
            <span>Make sure device Rotation Lock / Portrait Lock is turned off.</span>
          </div>
        </div>

        {statusMessage && (
          <p className="text-[11px] font-medium text-amber-300 bg-amber-950/70 border border-amber-500/40 rounded-xl px-3 py-2">
            {statusMessage}
          </p>
        )}

        <div className="w-full flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => void handleFullscreenLandscape()}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-game font-bold text-sm shadow-lg shadow-amber-500/30 transition active:scale-95"
          >
            Switch to Fullscreen Landscape
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setDismissedInSession(true);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95"
          >
            Continue Anyway (16:9 Letterboxed View)
          </button>
        </div>
      </div>
    </div>
  );
};
