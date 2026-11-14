import React from 'react';
import { sounds } from '../audio/SoundEffects';
import { RoverDurabilityData } from '../types/game';

interface RoverCommModalProps {
  isOpen: boolean;
  durability: RoverDurabilityData;
  roverName?: string;
  availableCrystals?: number;
  hasAffordableUpgrade?: boolean;
  onClose: () => void;
  onDriveRover: () => void;
  onRefillO2: () => void;
  onRepairRover: () => void;
  onCustomizeRover?: () => void;
  onOpenAutoPilot?: () => void;
  onOpenUpgrades?: () => void;
}

export const RoverCommModal: React.FC<RoverCommModalProps> = ({
  isOpen,
  durability,
  roverName = 'Curiosity Rover',
  availableCrystals = 0,
  hasAffordableUpgrade = false,
  onClose,
  onDriveRover,
  onRefillO2,
  onRepairRover,
  onCustomizeRover,
  onOpenAutoPilot,
  onOpenUpgrades,
}) => {
  if (!isOpen) return null;

  const pct = Math.max(0, Math.min(100, durability.integrity));
  const needsRepair = pct < 99.5;
  const barColor =
    pct < 35
      ? 'bg-gradient-to-r from-rose-600 to-red-400'
      : pct < 60
      ? 'bg-gradient-to-r from-orange-500 to-amber-400'
      : pct < 85
      ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
      : 'bg-gradient-to-r from-cyan-500 to-emerald-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-800/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-cyan-300">
                {roverName} Link
              </h2>
              <p className="text-xs text-slate-300">
                Automated Science Rover & Deep Space Relay
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Rover Transmission Dialogue */}
        <div className="space-y-4 mb-6 overflow-y-auto pr-1">
          <div className="bg-cyan-950/50 border border-cyan-700/60 p-4 rounded-2xl text-xs sm:text-sm text-cyan-100 leading-relaxed font-mono">
            <div className="text-[11px] font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <span>●</span>
              <span>RADIO LINK: ACTIVE · SIGNAL 99.4%</span>
            </div>
            &ldquo;Greetings Astronaut! Curiosity robotic laboratory reports all 6 wheels and rocker-bogie suspension {needsRepair ? `show ${Math.round(100 - pct)}% terrain wear—ready for hull maintenance` : 'operational at peak integrity'}. ChemCam laser analysis confirms surface regolith rich in iron oxide, basalt, and hydrated silica.&rdquo;
          </div>

          {/* Hull Durability Diagnostics */}
          <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-game font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Hull & Suspension Durability</span>
              </span>
              <span className="font-mono-numbers font-bold text-cyan-300">
                {Math.round(pct)}% ({durability.status === 'LIMP_MODE' ? 'LIMP MODE' : durability.status})
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Drive Power: {Math.round(durability.speedMultiplier * 100)}%</span>
              <span>Logged Collisions: {durability.collisionCount}</span>
            </div>
          </div>

          {/* Educational Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold mb-0.5">Power Source</div>
              <div className="text-slate-200">Radioisotope Thermoelectric Generator (RTG)</div>
            </div>
            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold mb-0.5">Wheel System</div>
              <div className="text-slate-200">6-Wheel Rocker-Bogie All-Terrain Grousers</div>
            </div>
            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold mb-0.5">Scientific Tools</div>
              <div className="text-slate-200">MastCam Stereo, ChemCam Laser, Robotic Arm</div>
            </div>
            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold mb-0.5">Life Support</div>
              <div className="text-emerald-400 font-bold">Emergency O2 Transfer Available</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              sounds.playClick();
              onDriveRover();
              onClose();
            }}
            className="flex-1 min-w-[170px] py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-game font-bold text-sm shadow-lg shadow-cyan-500/30 transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🚗</span>
            <span>Take Controls & Drive</span>
          </button>

          {onOpenAutoPilot && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAutoPilot();
              }}
              className="py-3 px-4 rounded-2xl bg-sky-950/90 hover:bg-sky-900 border border-sky-400/70 text-sky-100 font-game font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              <span>🧭</span>
              <span>Auto-Pilot</span>
            </button>
          )}

          {onOpenUpgrades && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenUpgrades();
              }}
              className={`py-3 px-4 rounded-2xl border font-game font-bold text-sm transition flex items-center justify-center gap-1.5 ${
                hasAffordableUpgrade
                  ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/70 text-amber-100'
              }`}
            >
              <span>⚙️</span>
              <span>Engine Upgrades</span>
              <span className="font-mono-numbers text-xs opacity-90">(💎 {availableCrystals})</span>
            </button>
          )}

          {onCustomizeRover && (
            <button
              onClick={() => {
                sounds.playClick();
                onCustomizeRover();
              }}
              className="py-3 px-4 rounded-2xl bg-purple-950/90 hover:bg-purple-900 border border-purple-400/70 text-purple-100 font-game font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              <span>🎨</span>
              <span>Customize</span>
            </button>
          )}

          <button
            onClick={onRepairRover}
            className={`py-3 px-4 rounded-2xl font-game font-bold text-sm transition flex items-center justify-center gap-1.5 ${
              needsRepair
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <span>🛠️</span>
            <span>{needsRepair ? 'Repair Hull (100%)' : 'Hull 100%'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onRefillO2();
            }}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-game font-bold text-sm transition flex items-center justify-center gap-1.5"
          >
            <span>💨</span>
            <span>Refill O2</span>
          </button>
        </div>
      </div>
    </div>
  );
};
