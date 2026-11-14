import React, { useState } from 'react';
import { SPACE_STATION_FACTS } from '../data/missionsAndQuiz';
import { SUIT_COLORS, SuitColor } from '../types/game';
import { sounds } from '../audio/SoundEffects';

interface BaseInfoModalProps {
  isOpen: boolean;
  activeSuitColor: SuitColor;
  onSelectSuitColor: (color: SuitColor) => void;
  onRestInBay: () => void;
  onClose: () => void;
}

export const BaseInfoModal: React.FC<BaseInfoModalProps> = ({
  isOpen,
  activeSuitColor,
  onSelectSuitColor,
  onRestInBay,
  onClose,
}) => {
  const [selectedFactId, setSelectedFactId] = useState<string>(SPACE_STATION_FACTS[0].id);

  if (!isOpen) return null;

  const currentFact = SPACE_STATION_FACTS.find((f) => f.id === selectedFactId) || SPACE_STATION_FACTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-sky-500 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sky-800/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🛰️</span>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-sky-300">
                Mars Research Station Database
              </h2>
              <p className="text-xs text-slate-300">
                Pressurized Habitat, Science Kiosks & Crew Quarters
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

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4">
          {/* Fact Kiosk Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {SPACE_STATION_FACTS.map((fact) => (
              <button
                key={fact.id}
                onClick={() => {
                  sounds.playComputerInterface();
                  setSelectedFactId(fact.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col items-center justify-center text-center ${
                  fact.id === selectedFactId
                    ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-md shadow-sky-950'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xl mb-1">{fact.icon}</span>
                <span className="text-[11px] font-bold line-clamp-1">{fact.title}</span>
              </button>
            ))}
          </div>

          {/* Active Kiosk Fact Card */}
          <div className="bg-sky-950/40 border border-sky-700/60 p-4 rounded-2xl">
            <div className="flex items-center gap-2 font-game font-bold text-sky-300 text-base mb-1">
              <span>{currentFact.icon}</span>
              <span>{currentFact.title}</span>
            </div>
            <div className="text-sm font-semibold text-slate-100 mb-2">
              {currentFact.fact}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentFact.detail}
            </p>
          </div>

          {/* Astronaut Rest Pods Action */}
          <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🛌</span>
              <div>
                <div className="font-game font-bold text-sm text-slate-200">
                  Pressurized Rest Pods
                </div>
                <div className="text-xs text-slate-400">
                  Rest inside radiation-shielded bunk to restore 100% O2 and stamina.
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onRestInBay();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-game font-bold text-xs uppercase tracking-wider transition shadow-md shrink-0"
            >
              Rest & Heal
            </button>
          </div>

          {/* Spacesuit Customization Bay */}
          <div className="bg-slate-800/60 border border-slate-700 p-3.5 rounded-2xl">
            <div className="font-game font-bold text-sm text-amber-300 mb-2 flex items-center gap-1.5">
              <span>🎨</span>
              <span>Spacesuit Customization Bay</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SUIT_COLORS.map((suit) => (
                <button
                  key={suit.id}
                  onClick={() => {
                    sounds.playClick();
                    onSelectSuitColor(suit.id);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    activeSuitColor === suit.id
                      ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border-2 shadow-sm"
                    style={{ backgroundColor: suit.hex, borderColor: suit.accent }}
                  />
                  <span className="text-[10px] font-bold text-slate-200 text-center line-clamp-1">
                    {suit.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-game font-bold text-sm shadow-lg shadow-sky-500/30 transition"
        >
          Return to Mars Surface 🚀
        </button>
      </div>
    </div>
  );
};
