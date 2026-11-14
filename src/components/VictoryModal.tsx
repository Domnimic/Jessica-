import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant } from '../audio/VoiceAssistant';

interface VictoryModalProps {
  isOpen: boolean;
  score: number;
  crystalsCount: number;
  completedMissionsCount?: number;
  totalMissionsCount?: number;
  onContinueExploring: () => void;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  score,
  crystalsCount,
  completedMissionsCount = 6,
  totalMissionsCount = 6,
  onContinueExploring,
  onRestart,
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.setMusicContext('victory');
      sounds.playEarthContactSuccess();
      voiceAssistant.speakCue('victory', true);

      // Confetti burst
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#f59e0b', '#38bdf8', '#10b981', '#f43f5e'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 350);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Victory Trophy */}
        <div className="text-6xl mb-3 animate-bounce">🏆</div>

        <h2 className="font-game font-bold text-3xl sm:text-4xl text-amber-400 mb-1">
          MISSION ACCOMPLISHED!
        </h2>
        <div className="text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-4">
          Master Mars Planetary Explorer
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          You mastered mobility in Martian gravity, discovered the Curiosity Rover, gathered rare crystal minerals, connected Earth via the high-gain antenna, and passed the Science Academy!
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xs text-slate-400 uppercase font-semibold">Missions</div>
            <div className="text-xl font-bold font-mono-numbers text-emerald-400">
              {completedMissionsCount} / {totalMissionsCount} ✓
            </div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xs text-slate-400 uppercase font-semibold">Crystals</div>
            <div className="text-xl font-bold font-mono-numbers text-cyan-400">{crystalsCount} / 10</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-xs text-slate-400 uppercase font-semibold">Explorer XP</div>
            <div className="text-xl font-bold font-mono-numbers text-amber-400">{score}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              sounds.playClick();
              onContinueExploring();
            }}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-game font-bold text-base shadow-lg shadow-emerald-500/30 transition transform active:scale-98"
          >
            🌍 Continue Free Roam
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-game font-bold text-base transition"
          >
            🔄 Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
