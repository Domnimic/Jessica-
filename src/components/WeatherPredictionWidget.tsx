import React, { useState } from 'react';
import { WeatherData } from '../types/game';
import { sounds } from '../audio/SoundEffects';

interface WeatherPredictionWidgetProps {
  weather: WeatherData;
  onTriggerStorm?: () => void;
  className?: string;
}

export const WeatherPredictionWidget: React.FC<WeatherPredictionWidgetProps> = React.memo(({
  weather,
  onTriggerStorm,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const forecast = weather.forecast;

  // Format time display MM:SS
  const mins = Math.floor(forecast.secondsUntil / 60);
  const secs = forecast.secondsUntil % 60;
  const formattedCountdown = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Threat badge color styling
  const threatStyles = {
    nominal: {
      bg: 'bg-emerald-950/90',
      border: 'border-emerald-500/70',
      text: 'text-emerald-300',
      badge: 'bg-emerald-900/80 text-emerald-300 border-emerald-600',
      label: 'NOMINAL',
    },
    low: {
      bg: 'bg-teal-950/90',
      border: 'border-teal-500/70',
      text: 'text-teal-300',
      badge: 'bg-teal-900/80 text-teal-300 border-teal-600',
      label: 'LOW THREAT',
    },
    moderate: {
      bg: 'bg-amber-950/90',
      border: 'border-amber-500/80',
      text: 'text-amber-300',
      badge: 'bg-amber-900/80 text-amber-300 border-amber-500',
      label: 'ADVISORY',
    },
    high: {
      bg: 'bg-orange-950/90',
      border: 'border-orange-500',
      text: 'text-orange-200',
      badge: 'bg-orange-900/90 text-orange-200 border-orange-400',
      label: 'HIGH ALERT',
    },
    critical: {
      bg: 'bg-rose-950/95',
      border: 'border-rose-500',
      text: 'text-rose-200',
      badge: 'bg-rose-900 text-rose-100 border-rose-400',
      label: 'CRITICAL',
    },
  }[forecast.threatLevel] || {
    bg: 'bg-slate-900/90',
    border: 'border-slate-700',
    text: 'text-slate-300',
    badge: 'bg-slate-800 text-slate-300 border-slate-600',
    label: 'NOMINAL',
  };

  const trendIcon =
    forecast.pressureTrend === 'falling' ? '↘ Falling' :
    forecast.pressureTrend === 'rising' ? '↗ Rising' : '→ Steady';

  return (
    <div
      className={`pointer-events-auto rounded-2xl border shadow-xl transition-all duration-200 ${threatStyles.bg} ${threatStyles.border} ${className}`}
    >
      {/* --- HEADER SUMMARY BAR (Always Visible) --- */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          onClick={() => {
            sounds.playClick();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2 text-left flex-1 min-w-0 group"
          title="Toggle Martian Weather Prediction & Satellite Forecast"
        >
          {/* Satellite Radar Icon */}
          <div className="w-6 h-6 rounded-lg bg-black/40 border border-slate-700/80 flex items-center justify-center text-xs shrink-0 group-hover:border-amber-500/80 transition-colors">
            {weather.type === 'storm' ? '🌪️' : weather.type === 'warning' ? '⚠️' : '📡'}
          </div>

          {/* Quick Headline */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">
                Weather Radar
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${threatStyles.badge}`}
              >
                {threatStyles.label}
              </span>
            </div>
            <div className="text-xs font-game font-bold text-slate-100 truncate flex items-center gap-1.5">
              <span>{forecast.upcomingEvent}</span>
              <span className="text-amber-400 font-mono-numbers text-[11px]">
                ({formattedCountdown})
              </span>
            </div>
          </div>
        </button>

        {/* Action / Expand Button */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setIsExpanded(!isExpanded);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-slate-500 transition-colors"
          >
            {isExpanded ? '▴ Less' : '▾ Forecast'}
          </button>
        </div>
      </div>

      {/* --- EXPANDED METEOROLOGICAL TELEMETRY DRAWER --- */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 text-xs text-slate-200 flex flex-col gap-2.5">
          {/* Satellite Status & Countdown Header */}
          <div className="flex items-center justify-between text-[11px] bg-black/40 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-amber-400">🛰️</span>
              <span className="font-mono text-[10px] tracking-wide">
                ORBITAL SAT-4 METEOROLOGY
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">COUNTDOWN:</span>
              <span className="font-mono-numbers font-bold text-amber-400 text-xs">
                {formattedCountdown}
              </span>
            </div>
          </div>

          {/* Barometric Pressure & Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Barometer */}
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Atmospheric Pressure
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-mono-numbers font-bold text-slate-100">
                  {forecast.barometricPressure}
                </span>
                <span className="text-[10px] text-slate-400">mbar</span>
              </div>
              <span
                className={`text-[10px] font-semibold mt-0.5 ${
                  forecast.pressureTrend === 'falling'
                    ? 'text-rose-400'
                    : forecast.pressureTrend === 'rising'
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                Trend: {trendIcon}
              </span>
            </div>

            {/* Expected Visibility & Impact */}
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Forecasted Impact
              </span>
              <div className="flex flex-col mt-0.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Visibility:</span>
                  <span className="font-mono-numbers font-bold text-amber-300">
                    ~{forecast.expectedVisibility}m
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-0.5">
                  <span className="text-slate-400">O2 Depletion:</span>
                  <span
                    className={`font-mono-numbers font-bold ${
                      forecast.expectedO2Drain > 1 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {forecast.expectedO2Drain}× drain
                  </span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5">
                {forecast.expectedO2Drain > 1 ? 'Requires shelter to negate' : 'Safe for EVA operations'}
              </span>
            </div>
          </div>

          {/* Survival & Preparation Directives */}
          <div className="bg-amber-950/40 border border-amber-600/40 p-2 rounded-xl flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
              <span>🛡️</span>
              <span>Survival Protocol & Shelters</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 leading-snug">
              {forecast.safetyAdvisory}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-amber-200/90">
              <span className="bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-700/50">
                🏠 Base Station: [-40, -32]
              </span>
              <span className="bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-700/50">
                🚜 Rover Cabin: [28, -24]
              </span>
            </div>
          </div>

          {/* Manual Storm Simulation Trigger (Optional testing control) */}
          {onTriggerStorm && weather.type === 'clear' && (
            <button
              onClick={() => {
                sounds.playClick();
                onTriggerStorm();
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 text-rose-200 text-[11px] font-game font-bold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm"
            >
              <span>🌪️</span>
              <span>Simulate Storm Front (Instant Test)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});
