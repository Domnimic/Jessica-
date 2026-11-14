import React from 'react';
import { Home } from 'lucide-react';
import { GameMode, GAME_MODES, Mission, SUIT_COLORS, SuitColor, CheckpointData } from '../types/game';
import { sounds } from '../audio/SoundEffects';
import { PWAInstallButton } from './PWAControls';

interface PauseModalProps {
  isOpen: boolean;
  gameMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  activeSuit: SuitColor;
  onSelectSuit: (suit: SuitColor) => void;
  activeCheckpoint: CheckpointData;
  onRespawnAtCheckpoint: () => void;
  missions: Mission[];
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenAudioSettings: () => void;
  onResume: () => void;
  onRestart: () => void;
  onGoHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  gameMode,
  onSelectMode,
  activeSuit,
  onSelectSuit,
  activeCheckpoint,
  onRespawnAtCheckpoint,
  missions,
  isMuted,
  onToggleMute,
  onOpenAudioSettings,
  onResume,
  onRestart,
  onGoHome,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏸️</span>
            <div>
              <h2 className="font-game font-bold text-xl text-slate-100">Expedition Paused</h2>
              <div className="text-xs text-emerald-400 font-semibold">
                Active Checkpoint: {activeCheckpoint.name}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onResume();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Game Mode Switcher */}
        <div className="mb-4">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
            Change Game Mode:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {GAME_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  sounds.playClick();
                  onSelectMode(mode.id);
                }}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 justify-center ${
                  gameMode === mode.id
                    ? 'bg-amber-950 border-amber-400 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Spacesuit Customization */}
        <div className="mb-4">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
            Spacesuit Color:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUIT_COLORS.map((suit) => (
              <button
                key={suit.id}
                onClick={() => {
                  sounds.playClick();
                  onSelectSuit(suit.id);
                }}
                className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                  activeSuit === suit.id
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border-2"
                  style={{ backgroundColor: suit.hex, borderColor: suit.accent }}
                />
                <span>{suit.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Missions Checklist (if in mission/survival mode) */}
        {(gameMode === 'mission' || gameMode === 'survival') && (
          <div className="mb-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
              Mission Directives ({missions.filter((m) => m.completed).length} / {missions.length} Done)
            </h3>
            <div className="space-y-1.5">
              {missions.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                    m.completed
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-game font-bold flex items-center gap-1">
                      <span>{m.completed ? '✅' : '⏳'}</span>
                      <span>Mission {m.id}: {m.title}</span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">{m.description}</div>
                  </div>
                  <div className="font-mono-numbers text-xs font-bold shrink-0 self-center">
                    {m.completed ? 'DONE' : `${m.currentCount} / ${m.targetCount}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Setting */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/70 p-3 rounded-2xl border border-slate-700 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
            <span className="text-xs font-medium text-slate-200">Martian Audio &amp; AI Voice</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenAudioSettings();
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 font-game font-bold text-xs tracking-wide transition touch-manipulation"
            >
              🎛️ Audio &amp; FOV Settings
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onToggleMute();
              }}
              className={`px-3 py-1.5 rounded-xl font-game font-bold text-xs uppercase tracking-wider transition touch-manipulation ${
                isMuted ? 'bg-slate-700 text-slate-300' : 'bg-emerald-600 text-white'
              }`}
            >
              {isMuted ? 'Unmute' : 'Active'}
            </button>
          </div>
        </div>

        {/* Offline App Install & Auto-Save Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700 mb-4">
          <PWAInstallButton compact />
          {gameMode !== 'multiplayer' && (
            <span className="text-[11px] font-bold text-emerald-300">
              💾 Progress auto-saved locally
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => {
              sounds.playClick();
              onResume();
            }}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-game font-bold text-base transition shadow-lg shadow-amber-500/20"
          >
            ▶ Resume Expedition
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onRespawnAtCheckpoint();
            }}
            className="w-full py-2.5 px-6 rounded-2xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/70 text-emerald-200 font-game font-bold text-xs uppercase tracking-wider transition"
          >
            📍 Respawn at Last Checkpoint ({activeCheckpoint.name})
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="w-full py-2.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-game font-bold text-xs transition touch-manipulation active:scale-98"
          >
            🔄 Restart Expedition from Landing
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
      </div>
    </div>
  );
};
