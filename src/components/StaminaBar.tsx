import React from 'react';
import { StaminaData } from '../types/game';

interface StaminaBarProps {
  staminaData: StaminaData;
  isDrivingRover?: boolean;
  embedded?: boolean;
}

export const StaminaBar: React.FC<StaminaBarProps> = React.memo(({
  staminaData,
  isDrivingRover = false,
  embedded = false,
}) => {
  const pct = Math.max(0, Math.min(100, (staminaData.stamina / Math.max(1, staminaData.maxStamina)) * 100));
  const isCritical = staminaData.isExhausted || pct <= 20;
  const isLow = !isCritical && pct <= 45;
  const isDepleting =
    !isDrivingRover &&
    (staminaData.activityState === 'RUNNING' || staminaData.activityState === 'JUMPING');
  const isReplenishing =
    pct < 99.5 &&
    (isDrivingRover ||
      staminaData.activityState === 'WALKING' ||
      staminaData.activityState === 'RECOVERING');

  const containerClass = isCritical
    ? 'bg-rose-950/90 border-rose-500 ring-1 ring-rose-500/50'
    : staminaData.activityState === 'RUNNING' && !isDrivingRover
    ? 'bg-slate-950/85 border-amber-400/80'
    : isLow
    ? 'bg-amber-950/85 border-amber-500/80'
    : 'bg-slate-950/80 border-emerald-500/70';

  const fillClass = isCritical
    ? 'bg-gradient-to-r from-rose-600 to-orange-500'
    : isLow
    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
    : isDepleting
    ? 'bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400'
    : 'bg-gradient-to-r from-emerald-500 to-teal-300';

  const activityBadge = (() => {
    if (isDrivingRover) {
      return {
        label: pct < 99.5 ? 'ROVER +REGEN' : 'ROVER',
        cls: 'text-emerald-300',
      };
    }
    switch (staminaData.activityState) {
      case 'EXHAUSTED':
        return { label: 'EXHAUSTED', cls: 'text-rose-300' };
      case 'RUNNING':
        return { label: 'SPRINT', cls: 'text-amber-300' };
      case 'JUMPING':
        return { label: 'JUMP', cls: 'text-orange-300' };
      case 'WALKING':
        return {
          label: pct < 99.5 ? '+REGEN' : 'WALK',
          cls: pct < 99.5 ? 'text-emerald-300' : 'text-slate-400',
        };
      case 'RECOVERING':
      default:
        return {
          label: pct < 99.5 ? '+REGEN' : 'READY',
          cls: pct < 99.5 ? 'text-emerald-300' : 'text-slate-400',
        };
    }
  })();

  if (embedded) {
    return (
      <div
        data-testid="stamina-bar"
        className={`flex flex-col w-full rounded-lg px-1 py-0.5 transition-colors ${
          isCritical ? 'bg-rose-950/70 ring-1 ring-rose-500/60' : ''
        }`}
      >
        <div className="flex items-center justify-between text-[9px] font-bold mb-0.5 leading-none">
          <span className="flex items-center gap-0.5">
            <span>⚡</span>
            <span
              className={
                isCritical
                  ? 'text-rose-300'
                  : isDepleting
                  ? 'text-amber-200'
                  : 'text-emerald-300'
              }
            >
              STAMINA
            </span>
          </span>
          <span className="flex items-center gap-1 font-mono-numbers text-[9px]">
            <span className={`hidden sm:inline text-[8px] font-sans uppercase ${activityBadge.cls}`}>
              {isReplenishing && !isDrivingRover && staminaData.activityState === 'RECOVERING'
                ? activityBadge.label
                : activityBadge.label}
            </span>
            <span
              className={
                isCritical
                  ? 'text-rose-300'
                  : isLow
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }
            >
              {Math.round(pct)}%
            </span>
          </span>
        </div>

        <div className="relative w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${fillClass}`}
            style={{ width: `${pct}%` }}
          />
          {staminaData.isExhausted && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80"
              style={{ left: '25%' }}
              title="Sprint Recovery Threshold (25%)"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="stamina-bar"
      className={`flex flex-col w-24 [@media(min-height:520px)]:w-28 sm:w-32 p-1 [@media(min-height:520px)]:p-1.5 rounded-xl border shadow-lg transition-colors ${containerClass}`}
    >
      {/* Header: Stamina Label & Percentage */}
      <div className="flex items-center justify-between text-[9px] [@media(min-height:520px)]:text-[10px] font-bold mb-0.5">
        <span className="flex items-center gap-0.5">
          <span>⚡</span>
          <span
            className={
              isCritical
                ? 'text-rose-300'
                : isDepleting
                ? 'text-amber-200'
                : 'text-emerald-300'
            }
          >
            STAMINA
          </span>
        </span>
        <span
          className={`font-mono-numbers text-[10px] [@media(min-height:520px)]:text-[11px] ${
            isCritical
              ? 'text-rose-300'
              : isLow
              ? 'text-amber-300'
              : 'text-emerald-300'
          }`}
        >
          {Math.round(pct)}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-1.5 [@media(min-height:520px)]:h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
        {/* 25% Exhaustion Recovery Threshold Tick */}
        {staminaData.isExhausted && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80"
            style={{ left: '25%' }}
            title="Sprint Recovery Threshold (25%)"
          />
        )}
      </div>

      {/* Footer: Activity & Live Speed Multiplier */}
      <div className="hidden [@media(min-height:580px)]:flex mt-0.5 items-center justify-between text-[8px] font-bold uppercase tracking-wider gap-1">
        <span className={`truncate ${activityBadge.cls}`}>
          {isReplenishing && !isDrivingRover && staminaData.activityState === 'RECOVERING'
            ? activityBadge.label
            : activityBadge.label}
        </span>
        {!isDrivingRover && (
          <span
            className={`font-mono-numbers shrink-0 ${
              staminaData.isExhausted
                ? 'text-rose-300'
                : staminaData.speedMultiplier > 1.1
                ? 'text-amber-300'
                : 'text-slate-400'
            }`}
          >
            {staminaData.movementSpeedMps.toFixed(1)}m/s
          </span>
        )}
      </div>
    </div>
  );
});
