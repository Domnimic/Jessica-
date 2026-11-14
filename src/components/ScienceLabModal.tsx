import React, { useState } from 'react';
import { LAB_EXPERIMENTS } from '../data/expeditionExtensions';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant } from '../audio/VoiceAssistant';
import {
  AtmosphericPressureTesterStation,
  MineralDrillGameStation,
  SoilAnalysisScannerStation,
} from './lab/LabInteractiveStations';

interface ScienceLabModalProps {
  isOpen: boolean;
  completedIds: string[];
  onCompleteExperiment: (experimentId: string, xpReward: number) => void;
  onClose: () => void;
}

type LabViewId =
  | 'station_soil_scanner'
  | 'station_pressure_tester'
  | 'station_mineral_drill'
  | string;

const INTERACTIVE_STATIONS: {
  id: LabViewId;
  title: string;
  icon: string;
  xp: number;
}[] = [
  { id: 'station_soil_scanner', title: 'Soil Analysis Scanner', icon: '🧪', xp: 140 },
  { id: 'station_pressure_tester', title: 'Pressure Tester', icon: '🌬️', xp: 140 },
  { id: 'station_mineral_drill', title: 'Mineral Drill Game', icon: '⛏️', xp: 160 },
];

export const ScienceLabModal: React.FC<ScienceLabModalProps> = ({
  isOpen,
  completedIds,
  onCompleteExperiment,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<LabViewId>('station_soil_scanner');
  const [sliderValues, setSliderValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    LAB_EXPERIMENTS.forEach((e) => {
      initial[e.id] = e.defaultVal;
    });
    return initial;
  });
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const totalActivities = INTERACTIVE_STATIONS.length + LAB_EXPERIMENTS.length;
  const isStationView = INTERACTIVE_STATIONS.some((s) => s.id === activeId);
  const activeChamber = LAB_EXPERIMENTS.find((e) => e.id === activeId) || LAB_EXPERIMENTS[0];
  const val = sliderValues[activeChamber.id] ?? activeChamber.defaultVal;
  const isCompleted = completedIds.includes(activeChamber.id);
  const inRange = val >= activeChamber.idealRange[0] && val <= activeChamber.idealRange[1];

  const handleRunExperiment = () => {
    if (inRange) {
      sounds.playLabExperiment(true);
      voiceAssistant.speakCue('lab_experiment');
      setFeedback({ ok: true, text: activeChamber.outcomeSuccess });
      onCompleteExperiment(activeChamber.id, activeChamber.xpReward);
    } else {
      sounds.playLabExperiment(false);
      const hint =
        val < activeChamber.idealRange[0]
          ? `Too low! Try increasing ${activeChamber.paramLabel} closer to ${activeChamber.idealRange[0]}–${activeChamber.idealRange[1]} ${activeChamber.paramUnit}.`
          : `Too high! Lower ${activeChamber.paramLabel} safely into ${activeChamber.idealRange[0]}–${activeChamber.idealRange[1]} ${activeChamber.paramUnit}.`;
      setFeedback({ ok: false, text: hint });
    }
  };

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-purple-500/80 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-950/90 border border-purple-400/70 flex items-center justify-center text-2xl">
              🔬
            </div>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-2xl text-purple-200">
                Mars Science Laboratory
              </h2>
              <p className="text-xs text-slate-400 font-mono-numbers">
                Interactive Stations & Chamber Trials · Completed: {completedIds.length}/{totalActivities}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold touch-manipulation"
            aria-label="Close Science Lab"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Interactive Experiment Stations */}
        <div className="mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
            Interactive Lab Stations
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {INTERACTIVE_STATIONS.map((st) => {
              const done = completedIds.includes(st.id);
              const selected = st.id === activeId;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveId(st.id);
                    setFeedback(null);
                  }}
                  className={`min-h-[48px] p-2.5 rounded-2xl border text-left transition touch-manipulation ${
                    selected
                      ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-lg shadow-cyan-900/30'
                      : done
                      ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200 hover:bg-emerald-950/70'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-base mb-0.5">
                    <span>{st.icon}</span>
                    {done && <span className="text-[11px] font-bold text-emerald-400">DONE</span>}
                  </div>
                  <div className="font-game font-bold text-xs leading-tight">{st.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Sealed Chamber Parameter Experiments */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">
            Chamber Parameter Trials
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LAB_EXPERIMENTS.map((exp) => {
              const done = completedIds.includes(exp.id);
              const selected = exp.id === activeId;
              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveId(exp.id);
                    setFeedback(null);
                  }}
                  className={`min-h-[48px] p-2.5 rounded-2xl border text-left transition touch-manipulation ${
                    selected
                      ? 'bg-purple-950/90 border-purple-400 text-white shadow-lg shadow-purple-900/40'
                      : done
                      ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200 hover:bg-emerald-950/70'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-base mb-0.5">
                    <span>{exp.icon}</span>
                    {done && <span className="text-[11px] font-bold text-emerald-400">DONE</span>}
                  </div>
                  <div className="font-game font-bold text-xs leading-tight">{exp.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Station OR Chamber Experiment */}
        <div className="mb-4">
          {activeId === 'station_soil_scanner' && (
            <SoilAnalysisScannerStation
              isCompleted={completedIds.includes('station_soil_scanner')}
              onComplete={onCompleteExperiment}
            />
          )}

          {activeId === 'station_pressure_tester' && (
            <AtmosphericPressureTesterStation
              isCompleted={completedIds.includes('station_pressure_tester')}
              onComplete={onCompleteExperiment}
            />
          )}

          {activeId === 'station_mineral_drill' && (
            <MineralDrillGameStation
              isCompleted={completedIds.includes('station_mineral_drill')}
              onComplete={onCompleteExperiment}
            />
          )}

          {!isStationView && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {activeChamber.category}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-semibold">
                  🛡️ {activeChamber.safetyNote}
                </span>
              </div>

              <h3 className="font-game font-bold text-lg text-white mb-1">
                {activeChamber.icon} {activeChamber.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mb-3">{activeChamber.summary}</p>
              <p className="text-xs text-cyan-200 bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-2.5 mb-4">
                🎯 <strong>Goal:</strong> {activeChamber.setupDescription}
              </p>

              {/* Animated Visual Reaction Meter */}
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 mb-4">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-2">
                  <span className="text-slate-200">{activeChamber.paramLabel}</span>
                  <span
                    className={`font-mono-numbers text-base ${
                      inRange ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {val} {activeChamber.paramUnit}
                  </span>
                </div>

                <input
                  type="range"
                  min={activeChamber.minVal}
                  max={activeChamber.maxVal}
                  step={activeChamber.step}
                  value={val}
                  onChange={(e) => {
                    setSliderValues((prev) => ({
                      ...prev,
                      [activeChamber.id]: Number(e.target.value),
                    }));
                    setFeedback(null);
                  }}
                  className="w-full h-3 rounded-full accent-purple-400 cursor-pointer touch-pan-x"
                />

                <div className="flex justify-between text-[10px] font-mono-numbers text-slate-500 mt-1">
                  <span>
                    {activeChamber.minVal} {activeChamber.paramUnit}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Safe Target Zone: {activeChamber.idealRange[0]}–{activeChamber.idealRange[1]} {activeChamber.paramUnit}
                  </span>
                  <span>
                    {activeChamber.maxVal} {activeChamber.paramUnit}
                  </span>
                </div>
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-2xl border text-xs sm:text-sm mb-3 ${
                    feedback.ok
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                      : 'bg-amber-950/90 border-amber-400 text-amber-100'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {feedback.ok ? '✅ Experiment Success!' : '🔧 Adjust Settings & Try Again'}
                  </div>
                  <div>{feedback.text}</div>
                  {feedback.ok && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/30 text-xs text-emerald-300">
                      <strong>Mars Science Fact:</strong> {activeChamber.outcomeFact}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleRunExperiment}
                className="w-full min-h-[46px] py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-game font-bold text-sm sm:text-base shadow-lg transition active:scale-[0.98] touch-manipulation"
              >
                {isCompleted
                  ? '🔬 Run Experiment Again'
                  : `⚡ Activate Experiment (+${activeChamber.xpReward} XP)`}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-full min-h-[44px] py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-game font-bold text-sm transition touch-manipulation"
        >
          ← Return to Mars Expedition
        </button>
      </div>
    </div>
  );
};
