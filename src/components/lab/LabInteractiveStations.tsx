import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../../audio/SoundEffects';
import { voiceAssistant } from '../../audio/VoiceAssistant';

interface StationProps {
  isCompleted: boolean;
  onComplete: (stationId: string, xpReward: number) => void;
}

/* ============================================================================
 * STATION 1: SOIL ANALYSIS LASER SCANNER
 * ============================================================================ */

interface SoilSample {
  id: string;
  name: string;
  site: string;
  moisturePct: number;
  ph: number;
  bands: {
    id: string;
    formula: string;
    mineral: string;
    targetNm: number;
    toleranceNm: number;
    pct: number;
    color: string;
  }[];
  fact: string;
}

const SOIL_SAMPLES: SoilSample[] = [
  {
    id: 'jezero_clay',
    name: 'Jezero Riverbed Clay',
    site: 'Ancient Delta Bed',
    moisturePct: 2.8,
    ph: 7.4,
    bands: [
      { id: 'fe', formula: 'Fe2O3', mineral: 'Iron Oxide (Hematite)', targetNm: 310, toleranceNm: 26, pct: 34, color: '#f97316' },
      { id: 'si', formula: 'SiO2', mineral: 'Hydrated Clay Silica', targetNm: 520, toleranceNm: 26, pct: 46, color: '#38bdf8' },
      { id: 'mg', formula: 'MgSO4', mineral: 'Magnesium Sulfate', targetNm: 690, toleranceNm: 26, pct: 20, color: '#a855f7' },
    ],
    fact: 'Hydrated clays in Jezero Crater formed billions of years ago when calm liquid water flowed into a Martian lake!',
  },
  {
    id: 'basalt_dust',
    name: 'Olympus Basalt Regolith',
    site: 'Volcanic Plains',
    moisturePct: 0.6,
    ph: 8.1,
    bands: [
      { id: 'fe', formula: 'Fe2O3', mineral: 'Rust Surface Dust', targetNm: 270, toleranceNm: 26, pct: 42, color: '#ef4444' },
      { id: 'ol', formula: '(Mg,Fe)2SiO4', mineral: 'Volcanic Olivine', targetNm: 470, toleranceNm: 26, pct: 38, color: '#22c55e' },
      { id: 'ca', formula: 'CaAl2Si2O8', mineral: 'Plagioclase Feldspar', targetNm: 650, toleranceNm: 26, pct: 20, color: '#38bdf8' },
    ],
    fact: 'Martian volcanic basalt is rich in iron and olivine—giving dusty soil its signature reddish-orange glow.',
  },
  {
    id: 'evaporite_ridge',
    name: 'Sulfur Ridge Evaporite',
    site: 'Gale Salt Pan',
    moisturePct: 1.9,
    ph: 6.9,
    bands: [
      { id: 'gy', formula: 'CaSO4·2H2O', mineral: 'Gypsum Salt Vein', targetNm: 340, toleranceNm: 26, pct: 39, color: '#facc15' },
      { id: 'si', formula: 'SiO2', mineral: 'Opaline Silica', targetNm: 540, toleranceNm: 26, pct: 33, color: '#22d3ee' },
      { id: 'cl', formula: 'ClO4-', mineral: 'Perchlorate Trace', targetNm: 710, toleranceNm: 26, pct: 28, color: '#c084fc' },
    ],
    fact: 'White gypsum salt veins prove ancient salty groundwater once percolated right through cracks in Martian bedrock!',
  },
];

export const SoilAnalysisScannerStation: React.FC<StationProps> = ({
  isCompleted,
  onComplete,
}) => {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [wavelengthNm, setWavelengthNm] = useState(240);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [scanMsg, setScanMsg] = useState<string>(
    'Sweep the UV-Vis laser spectrometer (220–780 nm) over each peak and tap Lock Band.'
  );

  const sample = SOIL_SAMPLES[sampleIdx];
  const matchedBand = sample.bands.find(
    (b) => Math.abs(wavelengthNm - b.targetNm) <= b.toleranceNm
  );
  const allSampleLocked = sample.bands.every((b) => lockedIds.includes(b.id));

  const handleSelectSample = (idx: number) => {
    sounds.playClick();
    setSampleIdx(idx);
    setLockedIds([]);
    setWavelengthNm(240);
    setScanMsg(`Loaded ${SOIL_SAMPLES[idx].name}. Sweep the laser across all 3 mineral bands.`);
  };

  const handleLockBand = () => {
    if (!matchedBand) {
      sounds.playLabExperiment(false);
      setScanMsg(
        'No absorption peak aligned here. Move the wavelength slider directly over a glowing peak marker!'
      );
      return;
    }

    if (lockedIds.includes(matchedBand.id)) {
      sounds.playClick();
      setScanMsg(`${matchedBand.formula} (${matchedBand.mineral}) already archived for this core.`);
      return;
    }

    const next = [...lockedIds, matchedBand.id];
    setLockedIds(next);

    if (next.length >= sample.bands.length) {
      sounds.playLabExperiment(true);
      voiceAssistant.speakCue('lab_experiment');
      setScanMsg(
        `Full geochemical profile verified for ${sample.name}! +140 XP recorded.`
      );
      onComplete('station_soil_scanner', 140);
    } else {
      sounds.playComputerInterface();
      setScanMsg(
        `Locked ${matchedBand.formula} (${matchedBand.pct}% composition)! Find ${
          sample.bands.length - next.length
        } more peak${sample.bands.length - next.length === 1 ? '' : 's'}.`
      );
    }
  };

  // Build SVG spectrum path across 220..780 nm
  const spectrumPoints = (() => {
    const pts: string[] = [];
    for (let nm = 220; nm <= 780; nm += 8) {
      let signal = 16 + Math.sin(nm * 0.04) * 3;
      for (const band of sample.bands) {
        const dist = (nm - band.targetNm) / 22;
        signal += 58 * Math.exp(-dist * dist);
      }
      const x = ((nm - 220) / (780 - 220)) * 320;
      const y = 92 - Math.min(82, signal);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();

  const cursorX = ((wavelengthNm - 220) / (780 - 220)) * 320;

  return (
    <div className="bg-slate-950/85 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Station 1 · UV-Laser Regolith Spectrometer
          </span>
          <h3 className="font-game font-bold text-lg text-white">
            🧪 Martian Soil Analysis Scanner
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full border border-emerald-500/50 bg-emerald-950/80 text-emerald-300 text-[11px] font-bold">
          {isCompleted ? 'STATUS: CERTIFIED' : `BANDS: ${lockedIds.length}/${sample.bands.length}`}
        </span>
      </div>

      {/* Core Sample Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SOIL_SAMPLES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelectSample(idx)}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition touch-manipulation ${
              idx === sampleIdx
                ? 'bg-cyan-950/90 border-cyan-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="font-game font-bold text-xs">{s.name}</div>
            <div className="text-[10px] text-slate-400">{s.site}</div>
          </button>
        ))}
      </div>

      {/* Live Spectrometer SVG Graph */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-semibold">Optical Absorption Spectrum</span>
          <span className="font-mono-numbers text-cyan-300 font-bold">
            {wavelengthNm} nm {matchedBand ? `· PEAK: ${matchedBand.formula}` : '· SCANNING'}
          </span>
        </div>

        <svg
          viewBox="0 0 320 96"
          className="w-full h-28 bg-slate-950 rounded-xl border border-slate-800"
          role="img"
          aria-label="Soil laser spectroscopy absorption chart"
        >
          {/* Baseline grid */}
          <line x1="0" y1="30" x2="320" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="0" y1="62" x2="320" y2="62" stroke="#1e293b" strokeDasharray="3 3" />

          {/* Target band regions */}
          {sample.bands.map((b) => {
            const cx = ((b.targetNm - 220) / (780 - 220)) * 320;
            const locked = lockedIds.includes(b.id);
            return (
              <g key={b.id}>
                <circle
                  cx={cx}
                  cy={18}
                  r={locked ? 6 : 4.5}
                  fill={locked ? '#34d399' : b.color}
                  opacity={0.9}
                />
                <text
                  x={cx}
                  y={90}
                  textAnchor="middle"
                  fill={locked ? '#6ee7b7' : '#94a3b8'}
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {b.formula}
                </text>
              </g>
            );
          })}

          {/* Curve */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            points={spectrumPoints}
          />

          {/* Laser Scan Beam */}
          <line
            x1={cursorX}
            y1="0"
            x2={cursorX}
            y2="96"
            stroke={matchedBand ? '#34d399' : '#f472b6'}
            strokeWidth="2"
          />
        </svg>

        {/* Wavelength Tuner */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Spectrometer Laser Frequency</span>
            <span className="font-mono-numbers text-slate-400">220 nm – 780 nm</span>
          </div>
          <input
            type="range"
            min={220}
            max={780}
            step={5}
            value={wavelengthNm}
            onChange={(e) => setWavelengthNm(Number(e.target.value))}
            className="w-full h-3 rounded-full accent-cyan-400 cursor-pointer touch-pan-x"
          />
          <div className="grid grid-cols-3 gap-2 pt-1">
            {sample.bands.map((b) => {
              const locked = lockedIds.includes(b.id);
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border px-2.5 py-2 text-xs ${
                    locked
                      ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{b.formula}</span>
                    <span className="font-mono-numbers">{locked ? `${b.pct}%` : '---'}</span>
                  </div>
                  <div className="text-[10px] truncate">{locked ? b.mineral : `~${b.targetNm} nm`}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Soil Chemistry Telemetry & Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 font-mono-numbers text-slate-300">
        <span>Moisture: {sample.moisturePct}% H2O</span>
        <span>Soil pH: {sample.ph}</span>
        <span>Sample Temp: -18°C</span>
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 text-xs ${
          allSampleLocked
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100'
            : 'bg-slate-900/90 border-slate-700 text-slate-200'
        }`}
      >
        <div className="font-semibold">{scanMsg}</div>
        {allSampleLocked && (
          <div className="mt-1.5 text-emerald-300 border-t border-emerald-500/30 pt-1.5">
            <strong>Field Discovery:</strong> {sample.fact}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleLockBand}
        className={`w-full min-h-[46px] py-3 px-4 rounded-2xl font-game font-bold text-sm transition active:scale-[0.98] touch-manipulation ${
          matchedBand
            ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
        }`}
      >
        {matchedBand
          ? `🔒 Lock Spectral Band (${matchedBand.formula})`
          : '📡 Aim Laser Over Peak to Lock'}
      </button>
    </div>
  );
};

/* ============================================================================
 * STATION 2: ATMOSPHERIC PRESSURE TESTER
 * ============================================================================ */

interface PressureScenario {
  id: string;
  name: string;
  altitudeLabel: string;
  targetMbar: number;
  toleranceMbar: number;
  description: string;
  scienceFact: string;
}

const PRESSURE_SCENARIOS: PressureScenario[] = [
  {
    id: 'gale_surface',
    name: 'Gale Crater Surface',
    altitudeLabel: '-4.5 km Datum',
    targetMbar: 7.4,
    toleranceMbar: 0.45,
    description: 'Deep canyon floors trap slightly denser carbon dioxide air near the surface.',
    scienceFact: 'Earth sea level averages 1,013 mbar—Mars averages ~6.1 mbar, less than 1% as thick as Earth!',
  },
  {
    id: 'olympus_summit',
    name: 'Olympus Mons Peak',
    altitudeLabel: '+21.9 km Summit',
    targetMbar: 0.7,
    toleranceMbar: 0.35,
    description: 'Evacuate the chamber to match Mars’s tallest shield volcano (3x taller than Everest).',
    scienceFact: 'At the top of Olympus Mons, the air pressure is roughly 0.07 kPa—nearly a vacuum!',
  },
  {
    id: 'storm_front',
    name: 'Dust Storm Surge',
    altitudeLabel: 'Barometric Wave',
    targetMbar: 9.2,
    toleranceMbar: 0.45,
    description: 'Pressurize the manifold to simulate a seasonal Martian thermal tide + dust front.',
    scienceFact: 'Because Mars air is 95.3% CO2, up to 25% of the atmosphere freezes onto the winter ice caps every year!',
  },
];

export const AtmosphericPressureTesterStation: React.FC<StationProps> = ({
  isCompleted,
  onComplete,
}) => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [chamberMbar, setChamberMbar] = useState(4.5);
  const [verifiedScenarios, setVerifiedScenarios] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>(
    'Use Pump / Vent controls to match the target Martian barometric pressure.'
  );
  const [lastResultOk, setLastResultOk] = useState<boolean | null>(null);

  const scenario = PRESSURE_SCENARIOS[scenarioIdx];
  const diff = Math.abs(chamberMbar - scenario.targetMbar);
  const withinTarget = diff <= scenario.toleranceMbar;
  const kpa = (chamberMbar * 0.1).toFixed(2);
  const earthPct = ((chamberMbar / 1013.25) * 100).toFixed(2);

  // Needle angle: -115 deg (0.2 mbar) to +115 deg (12.0 mbar)
  const norm = Math.max(0, Math.min(1, (chamberMbar - 0.2) / (12.0 - 0.2)));
  const needleAngle = -115 + norm * 230;

  const adjustPressure = (delta: number) => {
    sounds.playClick();
    setLastResultOk(null);
    setChamberMbar((prev) => {
      const next = Math.round(Math.max(0.2, Math.min(12.0, prev + delta)) * 10) / 10;
      return next;
    });
  };

  const handleRunEquilibrium = () => {
    if (withinTarget) {
      sounds.playLabExperiment(true);
      voiceAssistant.speakCue('lab_experiment');
      setLastResultOk(true);
      if (!verifiedScenarios.includes(scenario.id)) {
        setVerifiedScenarios((prev) => [...prev, scenario.id]);
      }
      setStatusMsg(
        `Equilibrium verified at ${chamberMbar.toFixed(1)} mbar (${kpa} kPa)! ${scenario.scienceFact}`
      );
      onComplete('station_pressure_tester', 140);
    } else {
      sounds.playLabExperiment(false);
      setLastResultOk(false);
      setStatusMsg(
        chamberMbar < scenario.targetMbar
          ? `Pressure too low (${chamberMbar.toFixed(1)} mbar). Pump more CO2 toward ${scenario.targetMbar.toFixed(1)} mbar.`
          : `Pressure too high (${chamberMbar.toFixed(1)} mbar). Vent valve toward ${scenario.targetMbar.toFixed(1)} mbar.`
      );
    }
  };

  return (
    <div className="bg-slate-950/85 border border-sky-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
            Station 2 · Barometric Test Chamber
          </span>
          <h3 className="font-game font-bold text-lg text-white">
            🌬️ Atmospheric Pressure Tester
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full border border-sky-500/50 bg-sky-950/80 text-sky-200 text-[11px] font-bold font-mono-numbers">
          {isCompleted ? 'CALIBRATED · 100%' : `TESTS: ${verifiedScenarios.length}/3`}
        </span>
      </div>

      {/* Scenario Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PRESSURE_SCENARIOS.map((sc, idx) => {
          const done = verifiedScenarios.includes(sc.id);
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                sounds.playClick();
                setScenarioIdx(idx);
                setLastResultOk(null);
                setStatusMsg(sc.description);
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition touch-manipulation ${
                idx === scenarioIdx
                  ? 'bg-sky-950/90 border-sky-400 text-white'
                  : done
                  ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-game font-bold text-xs">
                <span>{sc.name}</span>
                {done && <span className="text-emerald-400">OK</span>}
              </div>
              <div className="text-[10px] font-mono-numbers text-slate-400">
                Target: {sc.targetMbar.toFixed(1)} mbar · {sc.altitudeLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Gauge + Gas Mix Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 items-center">
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 180 115"
            className="w-44 h-28"
            role="img"
            aria-label="Martian barometric dial"
          >
            <path
              d="M 22 96 A 70 70 0 1 1 158 96"
              fill="none"
              stroke="#1e293b"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 22 96 A 70 70 0 1 1 158 96"
              fill="none"
              stroke={withinTarget ? '#34d399' : '#38bdf8'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="280"
              strokeDashoffset={280 - norm * 280}
            />
            <g transform={`translate(90, 88) rotate(${needleAngle})`}>
              <line x1="0" y1="4" x2="0" y2="-56" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="0" r="6" fill="#38bdf8" />
            </g>
            <text
              x="90"
              y="108"
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {chamberMbar.toFixed(1)} mbar ({kpa} kPa)
            </text>
          </svg>
        </div>

        <div className="space-y-2 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Target Band ({scenario.name})
            </div>
            <div className="font-mono-numbers font-bold text-sm text-sky-300">
              {scenario.targetMbar.toFixed(1)} mbar ± {scenario.toleranceMbar.toFixed(2)} mbar
            </div>
            <div className="font-mono-numbers text-[11px] text-slate-400 mt-0.5">
              Earth Equivalent: {earthPct}% of 1 atm
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Mars Air Composition
            </div>
            <div className="font-mono-numbers text-[11px] text-slate-200 flex justify-between">
              <span>CO2 95.3%</span>
              <span>N2 2.6%</span>
              <span>Ar 1.9%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tactile Valve & Slider Controls */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => adjustPressure(-1.0)}
            className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-mono-numbers font-bold text-xs touch-manipulation"
          >
            Vent -1.0
          </button>
          <button
            type="button"
            onClick={() => adjustPressure(-0.2)}
            className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-mono-numbers font-bold text-xs touch-manipulation"
          >
            Vent -0.2
          </button>
          <button
            type="button"
            onClick={() => adjustPressure(0.2)}
            className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-mono-numbers font-bold text-xs touch-manipulation"
          >
            Pump +0.2
          </button>
          <button
            type="button"
            onClick={() => adjustPressure(1.0)}
            className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-mono-numbers font-bold text-xs touch-manipulation"
          >
            Pump +1.0
          </button>
        </div>

        <input
          type="range"
          min={0.2}
          max={12.0}
          step={0.1}
          value={chamberMbar}
          onChange={(e) => {
            setLastResultOk(null);
            setChamberMbar(Number(e.target.value));
          }}
          className="w-full h-3 rounded-full accent-sky-400 cursor-pointer touch-pan-x"
        />
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 text-xs ${
          lastResultOk === true
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100'
            : lastResultOk === false
            ? 'bg-amber-950/80 border-amber-500 text-amber-100'
            : 'bg-slate-900/90 border-slate-700 text-slate-200'
        }`}
      >
        {statusMsg}
      </div>

      <button
        type="button"
        onClick={handleRunEquilibrium}
        className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-game font-bold text-sm shadow-lg transition active:scale-[0.98] touch-manipulation"
      >
        🧪 Run Equilibrium Chamber Test (+140 XP)
      </button>
    </div>
  );
};

/* ============================================================================
 * STATION 3: MINERAL CHEMICAL COMPOSITION DRILL GAME
 * ============================================================================ */

interface CoreVein {
  id: string;
  name: string;
  hardnessLabel: string;
  dominantId: string;
  elements: { id: string; formula: string; label: string; pct: number; color: string }[];
  fact: string;
}

const CORE_VEINS: CoreVein[] = [
  {
    id: 'hematite_vein',
    name: 'Hematite Blueberries Vein',
    hardnessLabel: 'Medium Basalt',
    dominantId: 'fe',
    elements: [
      { id: 'fe', formula: 'Fe2O3', label: 'Hematite Iron Oxide', pct: 58, color: '#f97316' },
      { id: 'si', formula: 'SiO2', label: 'Quartz Silica', pct: 27, color: '#38bdf8' },
      { id: 'mg', formula: 'MgSO4', label: 'Sulfate Salt', pct: 15, color: '#a855f7' },
    ],
    fact: 'NASA’s Opportunity rover found tiny round hematite pebbles ("blueberries") that formed in ancient Martian water!',
  },
  {
    id: 'olivine_crust',
    name: 'Green Olivine Bedrock',
    hardnessLabel: 'Dense Igneous Rock',
    dominantId: 'ol',
    elements: [
      { id: 'ol', formula: 'Mg2SiO4', label: 'Magnesium Olivine', pct: 52, color: '#22c55e' },
      { id: 'fe', formula: 'Fe2O3', label: 'Iron Dust Coat', pct: 29, color: '#ef4444' },
      { id: 'al', formula: 'Al2O3', label: 'Alumina Silicate', pct: 19, color: '#60a5fa' },
    ],
    fact: 'Bright green olivine grains survive only where Mars has been dry for millions of years—giving a timeline of Martian climate!',
  },
];

export const MineralDrillGameStation: React.FC<StationProps> = ({
  isCompleted,
  onComplete,
}) => {
  const [veinIdx, setVeinIdx] = useState(0);
  const [depthCm, setDepthCm] = useState(0); // 0 to 120 cm
  const [heatC, setHeatC] = useState(15); // 15 to 100 C
  const [isDrilling, setIsDrilling] = useState(false);
  const [overheated, setOverheated] = useState(false);
  const [pickedFormulaId, setPickedFormulaId] = useState<string | null>(null);
  const [drillStatus, setDrillStatus] = useState(
    'Hold DRILL CORE to bore 120 cm into Mars bedrock. Use Coolant Flush if bit heat passes 75°C!'
  );

  const vein = CORE_VEINS[veinIdx];
  const coreExtracted = depthCm >= 120;
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDrilling || coreExtracted || overheated) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setDepthCm((d) => {
        const nextD = Math.min(120, d + 4);
        if (nextD >= 120) {
          setIsDrilling(false);
          sounds.playComputerInterface();
          setDrillStatus(
            'Core extracted (120 cm)! Inspect the chemical breakdown below and identify the dominant mineral.'
          );
        }
        return nextD;
      });
      setHeatC((h) => {
        const nextH = Math.min(100, h + 6);
        if (nextH >= 100) {
          setIsDrilling(false);
          setOverheated(true);
          sounds.playLabExperiment(false);
          setDrillStatus(
            'Thermal safety pause! Tap Coolant Flush to cool the diamond drill bit safely.'
          );
        }
        return nextH;
      });
    }, 110);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isDrilling, coreExtracted, overheated]);

  // Passive ambient cooling when stopped
  useEffect(() => {
    if (isDrilling) return;
    const id = window.setInterval(() => {
      setHeatC((h) => {
        const cooled = Math.max(15, h - 3);
        if (overheated && cooled <= 48) {
          setOverheated(false);
        }
        return cooled;
      });
    }, 240);
    return () => window.clearInterval(id);
  }, [isDrilling, overheated]);

  const handleCoolantFlush = () => {
    sounds.playOxygenRefill();
    setHeatC(15);
    setOverheated(false);
    setDrillStatus('Cryo coolant flushed! Drill bit temperature nominal at 15°C.');
  };

  const handlePulseDrill = () => {
    if (coreExtracted || overheated) return;
    sounds.playClick();
    setDepthCm((d) => Math.min(120, d + 12));
    setHeatC((h) => {
      const next = Math.min(100, h + 11);
      if (next >= 100) setOverheated(true);
      return next;
    });
  };

  const handleResetDrill = (idx: number) => {
    sounds.playClick();
    setVeinIdx(idx);
    setDepthCm(0);
    setHeatC(15);
    setIsDrilling(false);
    setOverheated(false);
    setPickedFormulaId(null);
    setDrillStatus(`Loaded ${CORE_VEINS[idx].name}. Hold DRILL CORE to extract a 120 cm core.`);
  };

  const handleIdentifyElement = (elId: string) => {
    setPickedFormulaId(elId);
    if (elId === vein.dominantId) {
      sounds.playLabExperiment(true);
      voiceAssistant.speakCue('lab_experiment');
      setDrillStatus(`Verified dominant mineral! ${vein.fact}`);
      onComplete('station_mineral_drill', 160);
    } else {
      sounds.playLabExperiment(false);
      setDrillStatus(
        'Check the percentage bar chart—pick the mineral formula with the highest percentage!'
      );
    }
  };

  const currentLayer =
    depthCm < 40 ? 'Layer 1: Loose Rust Dust (0–40 cm)' : depthCm < 85 ? 'Layer 2: Fractured Shale (40–85 cm)' : 'Layer 3: Deep Mineral Vein (85–120 cm)';

  return (
    <div className="bg-slate-950/85 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Station 3 · Core Drill & Chemical Assay Game
          </span>
          <h3 className="font-game font-bold text-lg text-white">
            ⛏️ Mineral Chemical Composition Drill
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full border border-amber-500/50 bg-amber-950/80 text-amber-200 text-[11px] font-bold font-mono-numbers">
          {isCompleted ? 'ASSAY COMPLETE' : `${depthCm} / 120 cm`}
        </span>
      </div>

      {/* Vein Selector */}
      <div className="grid grid-cols-2 gap-2">
        {CORE_VEINS.map((v, idx) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleResetDrill(idx)}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition touch-manipulation ${
              idx === veinIdx
                ? 'bg-amber-950/80 border-amber-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="font-game font-bold text-xs">{v.name}</div>
            <div className="text-[10px] text-slate-400">{v.hardnessLabel}</div>
          </button>
        ))}
      </div>

      {/* Drill Depth & Bit Heat Gauges */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-200 font-semibold">{currentLayer}</span>
          <span className="font-mono-numbers font-bold text-amber-300">{depthCm} cm</span>
        </div>
        <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-100"
            style={{ width: `${Math.round((depthCm / 120) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold">
            Drill Bit Heat {overheated ? '(THERMAL PAUSE)' : heatC >= 75 ? '(WARM - FLUSH)' : '(NOMINAL)'}
          </span>
          <span
            className={`font-mono-numbers font-bold ${
              heatC >= 75 ? 'text-rose-400' : 'text-cyan-300'
            }`}
          >
            {heatC}°C / 100°C
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-100 ${
              heatC >= 80 ? 'bg-rose-500' : heatC >= 55 ? 'bg-amber-400' : 'bg-cyan-400'
            }`}
            style={{ width: `${heatC}%` }}
          />
        </div>

        {/* Interactive Drill Buttons */}
        {!coreExtracted && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              disabled={overheated}
              onPointerDown={() => setIsDrilling(true)}
              onPointerUp={() => setIsDrilling(false)}
              onPointerLeave={() => setIsDrilling(false)}
              onPointerCancel={() => setIsDrilling(false)}
              className={`min-h-[46px] rounded-xl font-game font-bold text-xs transition touch-manipulation ${
                overheated
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : isDrilling
                  ? 'bg-amber-400 text-slate-950 shadow-lg'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950'
              }`}
            >
              {isDrilling ? '⚙️ DRILLING CORE...' : '⬇️ HOLD TO DRILL'}
            </button>

            <button
              type="button"
              disabled={overheated}
              onClick={handlePulseDrill}
              className="min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 text-slate-100 font-game font-bold text-xs touch-manipulation"
            >
              ⚡ Pulse Drill (+12 cm)
            </button>

            <button
              type="button"
              onClick={handleCoolantFlush}
              className="min-h-[46px] rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 font-game font-bold text-xs touch-manipulation"
            >
              ❄️ Coolant Flush
            </button>
          </div>
        )}
      </div>

      {/* Extracted Core Chemical Assay */}
      {coreExtracted && (
        <div className="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-emerald-300">
            🔬 Core Sample Extracted! Tap the Dominant Mineral Formula (+160 XP):
          </div>
          <div className="space-y-2">
            {vein.elements.map((el) => {
              const selected = pickedFormulaId === el.id;
              const isAnswer = el.id === vein.dominantId;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => handleIdentifyElement(el.id)}
                  className={`w-full min-h-[46px] p-2.5 rounded-xl border text-left transition touch-manipulation ${
                    selected && isAnswer
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                      : selected
                      ? 'bg-amber-950/90 border-amber-400 text-amber-100'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>
                      {el.formula} · {el.label}
                    </span>
                    <span className="font-mono-numbers">{el.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${el.pct}%`, backgroundColor: el.color }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-xs text-slate-200">
        {drillStatus}
      </div>
    </div>
  );
};
