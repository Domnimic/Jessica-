import React from 'react';
import { Home } from 'lucide-react';
import { CheckpointData } from '../types/game';
import { sounds } from '../audio/SoundEffects';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  crystalsCount: number;
  activeCheckpoint: CheckpointData;
  onRespawnCheckpoint: () => void;
  onRestart: () => void;
  onGoHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  crystalsCount,
  activeCheckpoint,
  onRespawnCheckpoint,
  onRestart,
  onGoHome,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-600 rounded-3xl p-6 sm:p-7 shadow-2xl text-center">
        {/* Distress Icon */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-rose-950/80 border-2 border-rose-500 flex items-center justify-center text-3xl shadow-lg shadow-rose-900/50">
          ⚠️
        </div>

        <h2 className="font-game font-bold text-2xl text-rose-400 mb-1">
          OUT OF OXYGEN!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
          Your suit life-support oxygen tanks ran out in the thin Martian atmosphere. Automated emergency medical drones deployed to extract you!
        </p>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</div>
            <div className="text-lg font-bold font-mono-numbers text-amber-400">{score} XP</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Crystals Saved</div>
            <div className="text-lg font-bold font-mono-numbers text-cyan-400">{crystalsCount} / 10</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onRespawnCheckpoint();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-game font-bold text-base shadow-xl shadow-emerald-500/30 transition transform active:scale-98 flex items-center justify-center gap-2 touch-manipulation"
          >
            <span>📍</span>
            <span>Respawn at {activeCheckpoint.name}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="w-full py-2.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-game font-bold text-xs uppercase tracking-wider transition touch-manipulation active:scale-98"
          >
            🔄 Full Restart from Landing
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onGoHome();
            }}
            data-interactive-ui="true"
            className="w-full py-3 px-6 rounded-2xl bg-slate-800/90 hover:bg-amber-950/80 border border-slate-600 hover:border-amber-400/80 text-amber-200 font-game font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md touch-manipulation active:scale-98"
          >
            <Home className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Go Back to Home</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 leading-normal">
          Tip: Oxygen refill stations are located at the Research Base and at the Curiosity Rover!
        </p>
      </div>
    </div>
  );
};
