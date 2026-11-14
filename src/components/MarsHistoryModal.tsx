import React, { useMemo, useState } from 'react';
import { HistoryTabletData } from '../types/game';
import {
  HISTORIAN_RANK_TIERS,
  INITIAL_HISTORY_TABLETS,
  getEarnedHistorianRank,
} from '../data/marsHistory';
import { sounds } from '../audio/SoundEffects';

interface MarsHistoryModalProps {
  isOpen: boolean;
  discoveredIds: string[];
  playerPos: { x: number; z: number };
  initialSelectedId?: string | null;
  onResetCodex: () => void;
  onClose: () => void;
}

export const MarsHistoryModal: React.FC<MarsHistoryModalProps> = ({
  isOpen,
  discoveredIds,
  playerPos,
  initialSelectedId = null,
  onResetCodex,
  onClose,
}) => {
  const discoveredSet = useMemo(() => new Set(discoveredIds), [discoveredIds]);

  const [selectedId, setSelectedId] = useState<string>(
    () =>
      initialSelectedId ||
      discoveredIds[discoveredIds.length - 1] ||
      INITIAL_HISTORY_TABLETS[0].id
  );

  // Sync if opened immediately upon discovering a specific tablet
  React.useEffect(() => {
    if (isOpen && initialSelectedId) {
      setSelectedId(initialSelectedId);
    }
  }, [isOpen, initialSelectedId]);

  if (!isOpen) return null;

  const discoveredCount = discoveredIds.length;
  const totalCount = INITIAL_HISTORY_TABLETS.length;
  const currentRank = getEarnedHistorianRank(discoveredCount);

  const selectedTablet: HistoryTabletData =
    INITIAL_HISTORY_TABLETS.find((t) => t.id === selectedId) || INITIAL_HISTORY_TABLETS[0];
  const isSelectedDiscovered = discoveredSet.has(selectedTablet.id);
  const selectedDist = Math.round(
    Math.hypot(
      playerPos.x - selectedTablet.position[0],
      playerPos.z - selectedTablet.position[2]
    )
  );

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 pointer-events-auto select-none"
    >
      <div className="w-full max-w-4xl bg-slate-950 border-2 border-teal-500/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-950/90 via-slate-900 to-cyan-950/90 border-b border-teal-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/60 flex items-center justify-center text-2xl">
              📜
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                ARCHIVAL CODEX · {discoveredCount} / {totalCount} TABLETS DISCOVERED
              </div>
              <h2 className="font-game font-bold text-xl sm:text-2xl text-white leading-tight">
                Mars History & Historian Badges
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                currentRank
                  ? 'bg-amber-950/80 border-amber-400/70 text-amber-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <span>{currentRank ? currentRank.icon : '🔒'}</span>
              <span>{currentRank ? currentRank.title : 'Initiate Seeker (0/2)'}</span>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              aria-label="Close Mars History"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Historian Rank Milestones Strip */}
        <div className="px-6 py-3 bg-slate-900/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {HISTORIAN_RANK_TIERS.map((tier) => {
            const unlocked = discoveredCount >= tier.requiredCount;
            return (
              <div
                key={tier.id}
                className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  unlocked
                    ? 'bg-emerald-950/45 border-emerald-500/70 text-emerald-200'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{unlocked ? tier.icon : '🔒'}</span>
                  <div>
                    <div className="font-game font-bold leading-tight">{tier.title}</div>
                    <div className="text-[10px] opacity-80">
                      Discover {tier.requiredCount} Tablets · +{tier.bonusXp} XP
                    </div>
                  </div>
                </div>
                {unlocked && (
                  <span className="text-[10px] font-extrabold uppercase text-emerald-300">
                    Earned
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Main 2-Column Lore Reader */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: 8 Tablet Entries List */}
          <div className="md:col-span-5 space-y-2">
            {INITIAL_HISTORY_TABLETS.map((tablet, idx) => {
              const found = discoveredSet.has(tablet.id);
              const isSelected = tablet.id === selectedTablet.id;
              const dist = Math.round(
                Math.hypot(playerPos.x - tablet.position[0], playerPos.z - tablet.position[2])
              );

              return (
                <button
                  key={tablet.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedId(tablet.id);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-teal-950/70 border-teal-400 ring-1 ring-teal-400/50'
                      : found
                      ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700'
                      : 'bg-slate-900/45 hover:bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border ${
                        found
                          ? 'bg-teal-500/20 border-teal-400/60'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      {found ? tablet.badgeIcon : '❔'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        #{idx + 1} · {tablet.era}
                      </div>
                      <div
                        className={`font-game font-bold text-xs sm:text-sm truncate ${
                          found ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {found ? tablet.title : 'Undiscovered Lore Tablet'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right font-mono-numbers text-[10px]">
                    {found ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold">
                        Logged
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold">{dist}m</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Selected Tablet Lore & Historian Badge Detail */}
          <div className="md:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            {isSelectedDiscovered ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-950 border border-teal-500/60 text-teal-300 text-[11px] font-bold uppercase tracking-wider">
                    {selectedTablet.era} · {selectedTablet.yearLabel}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-mono-numbers text-[11px] font-bold">
                    +{selectedTablet.xpReward} XP Claimed
                  </span>
                </div>

                <h3 className="font-game font-bold text-xl sm:text-2xl text-white mb-1">
                  {selectedTablet.title}
                </h3>
                <div className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>
                    {selectedTablet.locationName} ({selectedTablet.position[0]},{' '}
                    {selectedTablet.position[2]})
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-sm text-slate-200 leading-relaxed mb-5">
                  {selectedTablet.loreText}
                </div>

                {/* Unique Historian Badge Unlocked */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-950 border border-amber-500/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl">
                      {selectedTablet.badgeIcon}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        Unique Historian Badge Unlocked
                      </div>
                      <div className="font-game font-bold text-base text-amber-200">
                        {selectedTablet.historianBadge}
                      </div>
                    </div>
                  </div>
                  <span className="text-emerald-300 text-xs font-extrabold uppercase">✓ Verified</span>
                </div>
              </div>
            ) : (
              <div className="my-auto text-center py-6 px-3">
                <div className="text-5xl mb-3">🗿</div>
                <div className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">
                  Encrypted Holo-Monolith · {selectedTablet.era}
                </div>
                <h3 className="font-game font-bold text-xl text-slate-200 mb-2">
                  Tablet Signal Unscanned
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                  Locate this hidden holographic stone monolith on the Martian surface to decrypt its
                  history entry and unlock the{' '}
                  <strong className="text-amber-300">&ldquo;{selectedTablet.historianBadge}&rdquo;</strong>{' '}
                  Historian Badge.
                </p>

                <div className="inline-flex flex-col sm:flex-row items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950 border border-teal-500/40 text-xs">
                  <span className="text-teal-300 font-bold">
                    🧭 Signal Hint: {selectedTablet.regionHint}
                  </span>
                  <span className="font-mono-numbers font-extrabold text-amber-300">
                    ({selectedDist}m away · look for cyan blips on Radar)
                  </span>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Collected Tablets: {discoveredCount} / {totalCount}</span>
              <span>Walk or drive within 3m of any glowing tablet to archive it</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {discoveredCount > 0 ? (
            <button
              onClick={() => {
                sounds.playClick();
                onResetCodex();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition"
            >
              ↺ Reset Discovered Tablets
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              8 holographic lore tablets hidden across Mars craters & dunes
            </div>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-game font-bold text-sm shadow-lg transition active:scale-95"
          >
            Back to Mars Exploration
          </button>
        </div>
      </div>
    </div>
  );
};
