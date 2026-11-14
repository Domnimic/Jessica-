import React from 'react';
import { DailyBountyBoardState } from '../types/game';
import { sounds } from '../audio/SoundEffects';
import { BountyCountdownText } from './BountyCountdownText';

interface DailyBountyModalProps {
  isOpen: boolean;
  board: DailyBountyBoardState;
  resetCountdown?: string;
  playerPos: { x: number; z: number };
  onClose: () => void;
}

export const DailyBountyModal: React.FC<DailyBountyModalProps> = ({
  isOpen,
  board,
  resetCountdown,
  playerPos,
  onClose,
}) => {
  if (!isOpen) return null;

  const completedCount = board.bounties.filter((b) => b.completed).length;
  const totalCount = board.bounties.length;
  const allCompleted = completedCount === totalCount;

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none"
    >
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-amber-500/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-950 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                SOL CONTRACTS · {board.dateKey}
              </div>
              <h2 className="font-game font-bold text-xl sm:text-2xl text-white leading-tight">
                Daily Mars Bounties
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-right">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Daily Reset In
              </div>
              <div className="font-mono-numbers font-bold text-sm text-amber-300">
                ⏱ {resetCountdown || <BountyCountdownText />}
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              aria-label="Close Daily Bounties"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Bounty Cards List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {board.bounties.map((bounty) => {
            const pct = Math.min(100, Math.round((bounty.currentCount / bounty.targetCount) * 100));
            const distMeters = bounty.targetLocation
              ? Math.round(
                  Math.hypot(
                    playerPos.x - bounty.targetLocation.x,
                    playerPos.z - bounty.targetLocation.z
                  )
                )
              : null;

            return (
              <div
                key={bounty.id}
                className={`p-4 rounded-2xl border-2 transition ${
                  bounty.completed
                    ? 'bg-emerald-950/35 border-emerald-500/70'
                    : 'bg-slate-900/90 border-slate-700/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                        bounty.completed
                          ? 'bg-emerald-500/20 border-emerald-400/60'
                          : 'bg-amber-500/15 border-amber-500/40'
                      }`}
                    >
                      {bounty.completed ? '✅' : bounty.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-game font-bold text-base text-white">
                          {bounty.title}
                        </h3>
                        {bounty.completed && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                        {bounty.description}
                      </p>
                      {bounty.targetLocation && !bounty.completed && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-500/40 text-[11px] font-mono-numbers text-amber-300">
                          <span>📍 Gold Beacon Tracked on Radar</span>
                          {distMeters !== null && (
                            <span className="font-bold text-amber-200">· {distMeters}m away</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unique Score & Badge Reward */}
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-xl font-mono-numbers font-extrabold text-xs border ${
                        bounty.completed
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                      }`}
                    >
                      +{bounty.rewardScore} XP
                    </span>
                    <span className="mt-1 text-[10px] font-semibold text-cyan-300">
                      🏅 {bounty.rewardBadge}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] font-mono-numbers mb-1">
                    <span className="text-slate-400 uppercase font-bold">
                      {bounty.completed ? 'Contract Fulfilled' : 'Progress'}
                    </span>
                    <span
                      className={`font-bold ${
                        bounty.completed ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {Math.min(bounty.currentCount, bounty.targetCount)} / {bounty.targetCount}{' '}
                      {bounty.unitLabel}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        bounty.completed
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Daily Tri-Bounty Grand Bonus */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-3 ${
              board.grandBonusClaimed
                ? 'bg-amber-950/45 border-amber-400'
                : 'bg-slate-900/80 border-amber-600/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{allCompleted ? '🌟' : '🎁'}</span>
              <div>
                <div className="font-game font-bold text-sm text-amber-300">
                  Daily Tri-Bounty Completion Bonus
                </div>
                <div className="text-xs text-slate-300">
                  Complete all 3 time-limited objectives before midnight reset
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono-numbers text-xs font-bold text-slate-300">
                {completedCount} / {totalCount}
              </span>
              <span
                className={`px-3 py-1 rounded-xl font-mono-numbers font-extrabold text-xs border ${
                  board.grandBonusClaimed
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                }`}
              >
                {board.grandBonusClaimed ? '✓ +500 XP CLAIMED' : `+${board.grandBonusPoints} XP BONUS`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Progress auto-saves for today&apos;s Sol date. New bounties rotate daily at 00:00.
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-game font-bold text-sm shadow-lg transition active:scale-95"
          >
            Continue Expedition
          </button>
        </div>
      </div>
    </div>
  );
};
