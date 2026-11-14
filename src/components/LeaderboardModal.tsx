import React, { useMemo, useState } from 'react';
import {
  LeaderboardEntry,
  LeaderboardFilter,
  LocalLeaderboardProfile,
  SUIT_COLORS,
} from '../types/game';
import { getMetricForFilter, mergeAndSortLeaderboard } from '../data/leaderboard';
import { sounds } from '../audio/SoundEffects';

interface LeaderboardModalProps {
  isOpen: boolean;
  entries: LeaderboardEntry[];
  localProfile: LocalLeaderboardProfile;
  isLoading: boolean;
  isOnline: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

const FILTER_OPTIONS: { id: LeaderboardFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Questions', icon: '🏆' },
  { id: 'trivia', label: 'Trivia Expedition', icon: '🧠' },
  { id: 'quiz', label: 'Science Quiz', icon: '🧪' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  entries,
  localProfile,
  isLoading,
  isOnline,
  onRefresh,
  onClose,
}) => {
  const [filter, setFilter] = useState<LeaderboardFilter>('all');

  const rankedEntries = useMemo(
    () => mergeAndSortLeaderboard(entries, localProfile, filter),
    [entries, localProfile, filter]
  );

  if (!isOpen) return null;

  const myIndex = rankedEntries.findIndex((e) => e.playerId === localProfile.playerId);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myMetric = getMetricForFilter(localProfile, filter);
  const myAccuracy =
    myMetric.answered > 0 ? Math.round((myMetric.correct / myMetric.answered) * 100) : 0;

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/70 flex items-center justify-center text-2xl">
              🏅
            </div>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-amber-300 leading-tight">
                Explorer Correct-Answers Leaderboard
              </h2>
              <p className="text-xs text-slate-400">
                See which Mars explorers got the most Science Quiz &amp; Trivia answers correct
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onRefresh();
              }}
              disabled={isLoading}
              title="Refresh Leaderboard"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-game font-bold text-cyan-200 transition disabled:opacity-50"
            >
              {isLoading ? 'Syncing...' : '↻ Refresh'}
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Your Standing Summary Card */}
        <div className="bg-gradient-to-r from-cyan-950/80 via-slate-950/90 to-amber-950/60 border border-cyan-500/60 rounded-2xl p-3.5 sm:p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/70 text-center min-w-[64px]">
                <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  Your Rank
                </div>
                <div className="font-mono-numbers font-extrabold text-lg text-white leading-tight">
                  {myRank ? `#${myRank}` : '—'}
                </div>
              </div>

              <div>
                <div className="font-game font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>{localProfile.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-[10px] font-bold uppercase">
                    You
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono-numbers mt-0.5 flex flex-wrap items-center gap-2.5">
                  <span>
                    Best Streak: <strong className="text-amber-300">🔥 {localProfile.bestStreak}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Best Quiz: <strong className="text-emerald-300">{localProfile.bestQuizScore}/100</strong>
                  </span>
                  <span>·</span>
                  <span
                    className={
                      !isOnline
                        ? 'text-amber-300'
                        : localProfile.pendingSync
                        ? 'text-cyan-300'
                        : 'text-emerald-300'
                    }
                  >
                    {!isOnline
                      ? 'Offline Cached'
                      : localProfile.pendingSync
                      ? 'Sync Pending'
                      : 'Live Synced'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div className="bg-slate-950/80 border border-emerald-500/50 rounded-xl px-3 py-1.5">
                <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  Correct
                </div>
                <div className="font-mono-numbers font-extrabold text-lg text-white leading-tight">
                  ✓ {myMetric.correct}
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Accuracy
                </div>
                <div className="font-mono-numbers font-extrabold text-sm sm:text-base text-cyan-200 leading-tight">
                  {myAccuracy}% <span className="text-[10px] text-slate-400">({myMetric.correct}/{myMetric.answered})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setFilter(opt.id);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-game font-bold flex items-center gap-1.5 transition ${
                  filter === opt.id
                    ? 'bg-amber-500 border-amber-200 text-slate-950 shadow'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono-numbers text-slate-400">
            {rankedEntries.length} Explorer{rankedEntries.length === 1 ? '' : 's'} Ranked
          </div>
        </div>

        {/* Ranked Leaderboard Table */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {rankedEntries.length === 0 ? (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-2">🧪</div>
              <h3 className="font-game font-bold text-base text-slate-200 mb-1">
                No Explorers Ranked Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Answer questions in the <strong className="text-emerald-300">Research Base Science Quiz</strong> or launch{' '}
                <strong className="text-cyan-300">Trivia Expedition Mode</strong> to record your correct answers and claim #1!
              </p>
            </div>
          ) : (
            rankedEntries.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.playerId === localProfile.playerId;
              const metric = getMetricForFilter(entry, filter);
              const accuracy =
                metric.answered > 0 ? Math.round((metric.correct / metric.answered) * 100) : 0;
              const suitMeta = SUIT_COLORS.find((s) => s.id === entry.suitColor) || SUIT_COLORS[0];

              const medal =
                rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

              const rowStyle =
                rank === 1
                  ? 'bg-gradient-to-r from-amber-950/70 via-slate-950 to-slate-950 border-amber-400/80'
                  : rank === 2
                  ? 'bg-gradient-to-r from-slate-800/80 via-slate-950 to-slate-950 border-slate-400/70'
                  : rank === 3
                  ? 'bg-gradient-to-r from-orange-950/60 via-slate-950 to-slate-950 border-orange-500/60'
                  : isMe
                  ? 'bg-cyan-950/50 border-cyan-400/70'
                  : 'bg-slate-950/85 border-slate-800';

              return (
                <div
                  key={entry.playerId}
                  className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition ${rowStyle} ${
                    isMe ? 'ring-1 ring-cyan-400/70' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono-numbers font-extrabold shrink-0 ${
                        rank <= 3
                          ? 'text-xl bg-black/35 border border-white/10'
                          : 'text-xs text-slate-300 bg-slate-900 border border-slate-700'
                      }`}
                    >
                      {medal}
                    </div>

                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                      style={{ backgroundColor: suitMeta.hex, borderColor: suitMeta.accent }}
                      title={`${suitMeta.name} Suit`}
                    />

                    <div className="min-w-0">
                      <div className="font-game font-bold text-sm text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{entry.name}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-400/60 text-cyan-200 text-[9px] font-bold uppercase shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-numbers flex flex-wrap items-center gap-2">
                        <span>
                          {metric.correct}/{metric.answered} ({accuracy}%)
                        </span>
                        <span>·</span>
                        <span className="text-amber-300">🔥 {entry.bestStreak} streak</span>
                        {filter === 'all' && (
                          <>
                            <span className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline text-slate-500">
                              Trivia {entry.triviaCorrect} · Quiz {entry.quizCorrect}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-numbers font-extrabold text-base sm:text-lg text-emerald-300 leading-none">
                      ✓ {metric.correct}
                    </div>
                    <div className="text-[10px] font-mono-numbers text-slate-400 mt-0.5">
                      {entry.xpEarned > 0 ? `+${entry.xpEarned} XP` : `Quiz Best ${entry.bestQuizScore}`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400">
            Sorted by <strong className="text-emerald-300">Most Correct Answers</strong>, then Best Streak &amp; Accuracy.
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-game font-bold text-sm transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
