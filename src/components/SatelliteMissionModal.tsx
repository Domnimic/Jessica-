import React, { useEffect, useState } from 'react';
import { SatelliteRelayData } from '../types/game';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant } from '../audio/VoiceAssistant';

interface SatelliteMissionModalProps {
  relay: SatelliteRelayData | null;
  onAlignSuccess: (relayId: string) => void;
  onClose: () => void;
}

export const SatelliteMissionModal: React.FC<SatelliteMissionModalProps> = ({
  relay,
  onAlignSuccess,
  onClose,
}) => {
  const [azimuth, setAzimuth] = useState(90);
  const [elevation, setElevation] = useState(25);
  const [freqMhz, setFreqMhz] = useState(410.0);

  useEffect(() => {
    if (relay) {
      setAzimuth(relay.aligned ? relay.targetAzimuth : Math.max(0, relay.targetAzimuth - 45));
      setElevation(relay.aligned ? relay.targetElevation : Math.max(10, relay.targetElevation - 18));
      setFreqMhz(relay.aligned ? relay.targetFreqMhz : 410.0);
    }
  }, [relay]);

  if (!relay) return null;

  const azDiff = Math.abs(azimuth - relay.targetAzimuth);
  const elDiff = Math.abs(elevation - relay.targetElevation);
  const fDiff = Math.abs(freqMhz - relay.targetFreqMhz);

  const azScore = Math.max(0, 1 - azDiff / 90);
  const elScore = Math.max(0, 1 - elDiff / 45);
  const fScore = Math.max(0, 1 - fDiff / 25);
  const signalPct = Math.round(((azScore + elScore + fScore) / 3) * 100);
  const isLockedInRange = azDiff <= 8 && elDiff <= 5 && fDiff <= 2.5;

  const handleConfirmLock = () => {
    if (!isLockedInRange) {
      sounds.playLabExperiment(false);
      return;
    }
    sounds.playSatelliteLock();
    voiceAssistant.speakCue('satellite_aligned');
    onAlignSuccess(relay.id);
  };

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/90 border border-amber-400/60 flex items-center justify-center text-xl">
              📡
            </div>
            <div>
              <h2 className="font-game font-bold text-lg text-amber-300">{relay.name}</h2>
              <p className="text-xs text-slate-400">Orbital Target: {relay.orbitLink}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Live Signal Meter */}
        <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-300 uppercase tracking-wider">ORBITAL CARRIER SIGNAL</span>
            <span
              className={`font-mono-numbers text-sm ${
                isLockedInRange ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {signalPct}% {isLockedInRange ? '· READY TO LOCK!' : ''}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                isLockedInRange
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-amber-500 to-orange-400'
              }`}
              style={{ width: `${signalPct}%` }}
            />
          </div>
        </div>

        {/* Dish Sliders */}
        <div className="space-y-3 mb-4">
          <div className="bg-slate-800/75 border border-slate-700 rounded-2xl p-3">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-200">Dish Azimuth (Target: {relay.targetAzimuth}°)</span>
              <span className="font-mono-numbers text-cyan-300">{azimuth}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={azimuth}
              onChange={(e) => setAzimuth(Number(e.target.value))}
              className="w-full h-3 accent-amber-400 cursor-pointer touch-pan-x"
            />
          </div>

          <div className="bg-slate-800/75 border border-slate-700 rounded-2xl p-3">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-200">Dish Elevation (Target: {relay.targetElevation}°)</span>
              <span className="font-mono-numbers text-cyan-300">{elevation}°</span>
            </div>
            <input
              type="range"
              min={10}
              max={85}
              step={1}
              value={elevation}
              onChange={(e) => setElevation(Number(e.target.value))}
              className="w-full h-3 accent-amber-400 cursor-pointer touch-pan-x"
            />
          </div>

          <div className="bg-slate-800/75 border border-slate-700 rounded-2xl p-3">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-200">UHF Carrier (Target: {relay.targetFreqMhz} MHz)</span>
              <span className="font-mono-numbers text-cyan-300">{freqMhz.toFixed(1)} MHz</span>
            </div>
            <input
              type="range"
              min={395}
              max={445}
              step={0.5}
              value={freqMhz}
              onChange={(e) => setFreqMhz(Number(e.target.value))}
              className="w-full h-3 accent-cyan-400 cursor-pointer touch-pan-x"
            />
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-950/75 border border-slate-800 rounded-2xl p-3 mb-4">
          <strong className="text-cyan-300">🛰️ Space Fact:</strong> {relay.signalFact}
        </div>

        <button
          type="button"
          onClick={handleConfirmLock}
          disabled={!isLockedInRange && !relay.aligned}
          className={`w-full py-3 px-6 rounded-2xl font-game font-bold text-sm sm:text-base transition touch-manipulation ${
            relay.aligned
              ? 'bg-emerald-600 text-white'
              : isLockedInRange
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-lg'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {relay.aligned
            ? '✓ Orbital Signal Active'
            : isLockedInRange
            ? `📡 Lock Orbital Relay (+${relay.xpReward} XP)`
            : 'Align Sliders Near Target Values to Lock'}
        </button>
      </div>
    </div>
  );
};
