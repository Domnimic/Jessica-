import React from 'react';
import { RoverEngineUpgrades } from '../types/game';
import {
  MAX_ROVER_UPGRADE_LEVEL,
  RoverUpgradeTrack,
  getRoverUpgradeStats,
  getUpgradeCostForNextLevel,
} from '../data/roverUpgrades';
import { sounds } from '../audio/SoundEffects';

interface RoverUpgradeModalProps {
  isOpen: boolean;
  upgrades: RoverEngineUpgrades;
  roverName?: string;
  onUpgrade: (track: RoverUpgradeTrack) => void;
  onClose: () => void;
}

export const RoverUpgradeModal: React.FC<RoverUpgradeModalProps> = ({
  isOpen,
  upgrades,
  roverName = 'Curiosity Rover',
  onUpgrade,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentStats = getRoverUpgradeStats(upgrades);
  const nextSpeedStats = getRoverUpgradeStats({
    topSpeedLevel: Math.min(MAX_ROVER_UPGRADE_LEVEL, upgrades.topSpeedLevel + 1),
    boostRecoveryLevel: upgrades.boostRecoveryLevel,
  });
  const nextRecoveryStats = getRoverUpgradeStats({
    topSpeedLevel: upgrades.topSpeedLevel,
    boostRecoveryLevel: Math.min(MAX_ROVER_UPGRADE_LEVEL, upgrades.boostRecoveryLevel + 1),
  });

  const speedCost = getUpgradeCostForNextLevel(upgrades.topSpeedLevel);
  const recoveryCost = getUpgradeCostForNextLevel(upgrades.boostRecoveryLevel);
  const canAffordSpeed = speedCost !== null && upgrades.availableCrystals >= speedCost;
  const canAffordRecovery = recoveryCost !== null && upgrades.availableCrystals >= recoveryCost;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 pointer-events-auto select-none"
      data-interactive-ui="true"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">⚙️</span>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-amber-300">
                {roverName} Engine Upgrades
              </h2>
              <p className="text-xs text-slate-400">
                Spend gathered Energy Crystals for permanent drivetrain &amp; thruster upgrades
              </p>
            </div>
          </div>

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

        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Crystal Reserve & Current Specs Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-fuchsia-950/60 border border-fuchsia-500/70 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">
                Available Crystals
              </div>
              <div className="font-mono-numbers font-extrabold text-xl text-white mt-0.5">
                💎 {upgrades.availableCrystals}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-700 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Cruise Top Speed
              </div>
              <div className="font-mono-numbers font-extrabold text-lg text-cyan-200 mt-0.5">
                {currentStats.baseMaxKmh} km/h
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-700 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Boost Top Speed
              </div>
              <div className="font-mono-numbers font-extrabold text-lg text-amber-200 mt-0.5">
                {currentStats.boostMaxKmh} km/h
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-700 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Boost Regen Rate
              </div>
              <div className="font-mono-numbers font-extrabold text-lg text-emerald-200 mt-0.5">
                +{currentStats.drivingRecoveryPerSec}/s
              </div>
            </div>
          </div>

          {/* Upgrade Track 1: Top Speed */}
          <div className="bg-slate-950/85 border border-cyan-500/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  <h3 className="font-game font-bold text-base text-cyan-200">
                    Ion Drive Turbines (Top Speed)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Increases both cruise speed (+3.6 km/h) and turbo boost speed (+4.3 km/h) per tier.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-950 border border-cyan-500/60 font-mono-numbers font-bold text-xs text-cyan-200 shrink-0">
                Lv {upgrades.topSpeedLevel} / {MAX_ROVER_UPGRADE_LEVEL}
              </span>
            </div>

            {/* Level Pips */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: MAX_ROVER_UPGRADE_LEVEL }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 rounded-full transition-colors ${
                    i < upgrades.topSpeedLevel
                      ? 'bg-gradient-to-r from-cyan-400 to-sky-300 shadow-sm shadow-cyan-400/50'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-xs font-mono-numbers text-slate-300">
                {speedCost === null ? (
                  <span className="text-emerald-300 font-bold">
                    ✓ MAXED ({currentStats.baseMaxKmh} / {currentStats.boostMaxKmh} km/h)
                  </span>
                ) : (
                  <span>
                    Next: <strong className="text-cyan-300">{currentStats.baseMaxKmh} → {nextSpeedStats.baseMaxKmh} km/h</strong>{' '}
                    (Boost <strong className="text-amber-300">{nextSpeedStats.boostMaxKmh} km/h</strong>)
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!canAffordSpeed}
                onClick={() => onUpgrade('topSpeedLevel')}
                className={`px-4 py-2 rounded-xl font-game font-bold text-xs sm:text-sm transition active:scale-95 ${
                  speedCost === null
                    ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 cursor-default'
                    : canAffordSpeed
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {speedCost === null ? 'MAX LEVEL' : `Upgrade · 💎 ${speedCost}`}
              </button>
            </div>
          </div>

          {/* Upgrade Track 2: Boost Energy Recovery Rate */}
          <div className="bg-slate-950/85 border border-emerald-500/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h3 className="font-game font-bold text-base text-emerald-200">
                    RTG Capacitor Array (Boost Recovery)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recharges rover boost energy faster for longer turbo sprints and more frequent Jump bursts.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-500/60 font-mono-numbers font-bold text-xs text-emerald-200 shrink-0">
                Lv {upgrades.boostRecoveryLevel} / {MAX_ROVER_UPGRADE_LEVEL}
              </span>
            </div>

            {/* Level Pips */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: MAX_ROVER_UPGRADE_LEVEL }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 rounded-full transition-colors ${
                    i < upgrades.boostRecoveryLevel
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-sm shadow-emerald-400/50'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-xs font-mono-numbers text-slate-300">
                {recoveryCost === null ? (
                  <span className="text-emerald-300 font-bold">
                    ✓ MAXED ({currentStats.boostRecoveryMultiplier.toFixed(2)}× Regen Rate)
                  </span>
                ) : (
                  <span>
                    Next:{' '}
                    <strong className="text-emerald-300">
                      {currentStats.drivingRecoveryPerSec} → {nextRecoveryStats.drivingRecoveryPerSec} %/s
                    </strong>{' '}
                    (Parked <strong className="text-teal-200">{nextRecoveryStats.parkedRecoveryPerSec}%/s</strong>)
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!canAffordRecovery}
                onClick={() => onUpgrade('boostRecoveryLevel')}
                className={`px-4 py-2 rounded-xl font-game font-bold text-xs sm:text-sm transition active:scale-95 ${
                  recoveryCost === null
                    ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 cursor-default'
                    : canAffordRecovery
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {recoveryCost === null ? 'MAX LEVEL' : `Upgrade · 💎 ${recoveryCost}`}
              </button>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <span>
              💡 Gather <strong className="text-fuchsia-300">Energy Crystals</strong> across Mars to unlock permanent upgrades!
            </span>
            <span className="font-mono-numbers text-[11px] text-slate-400">
              Total Spent: 💎 {upgrades.totalCrystalsSpent}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-game font-bold text-sm transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
