import React from 'react';
import { RoverCustomization } from '../types/game';
import {
  DEFAULT_ROVER_CUSTOMIZATION,
  ROVER_CHASSIS_COLORS,
  ROVER_HEADLIGHT_TINTS,
  ROVER_PRESETS,
  ROVER_ROOF_ADDONS,
  ROVER_SOLAR_TINTS,
  ROVER_TRIM_COLORS,
  ROVER_WHEEL_STYLES,
} from '../data/roverCustomization';
import { sounds } from '../audio/SoundEffects';

interface RoverCustomizeModalProps {
  isOpen: boolean;
  customization: RoverCustomization;
  onChangeCustomization: (next: RoverCustomization) => void;
  onClose: () => void;
}

export const RoverCustomizeModal: React.FC<RoverCustomizeModalProps> = ({
  isOpen,
  customization,
  onChangeCustomization,
  onClose,
}) => {
  if (!isOpen) return null;

  const activeWheel =
    ROVER_WHEEL_STYLES.find((w) => w.id === customization.wheelStyle) || ROVER_WHEEL_STYLES[0];

  const updateField = <K extends keyof RoverCustomization>(
    key: K,
    value: RoverCustomization[K]
  ) => {
    sounds.playClick();
    onChangeCustomization({
      ...customization,
      [key]: value,
    });
  };

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/80 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-950 border border-cyan-400/70 flex items-center justify-center text-2xl">
              🛞
            </div>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-2xl text-cyan-200">
                Mars Rover Garage & Customizer
              </h2>
              <p className="text-xs text-slate-400">
                Changes apply directly to your live 3D Curiosity Rover
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
            aria-label="Close Rover Customizer"
          >
            ✕
          </button>
        </div>

        {/* Live Vector Preview Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="font-game font-bold text-sm text-white">
              {customization.roverNameTag || 'CURIOSITY ROVER'}
            </span>
            <span className="text-[11px] text-cyan-300 font-semibold">
              Roof: {ROVER_ROOF_ADDONS.find((r) => r.id === customization.roofAddon)?.label} · Wheels: {activeWheel.label}
            </span>
          </div>

          <svg
            viewBox="0 0 360 132"
            className="w-full h-32 rounded-xl bg-slate-900/90 border border-slate-800"
            role="img"
            aria-label="Rover customization schematic preview"
          >
            {/* Horizon ground */}
            <rect x="0" y="106" width="360" height="26" fill="#291512" />
            <line x1="0" y1="106" x2="360" y2="106" stroke="#7c2d12" strokeWidth="2" />

            {/* Headlight Beam */}
            <polygon
              points="262,64 352,44 352,96 262,74"
              fill={customization.headlightTint}
              opacity="0.22"
            />
            <circle cx="262" cy="69" r="5" fill={customization.headlightTint} />

            {/* Roof Modules */}
            {customization.roofAddon === 'solar' && (
              <g>
                <rect x="112" y="34" width="128" height="7" rx="2" fill={customization.solarTint} stroke={customization.trimColor} strokeWidth="1.5" />
                <line x1="176" y1="41" x2="176" y2="52" stroke="#64748b" strokeWidth="4" />
              </g>
            )}
            {customization.roofAddon === 'cargo' && (
              <g>
                <rect x="122" y="39" width="102" height="12" rx="3" fill="#1e293b" />
                <rect x="132" y="29" width="36" height="12" rx="5" fill={customization.chassisColor} stroke={customization.trimColor} strokeWidth="1.5" />
                <rect x="176" y="29" width="36" height="12" rx="5" fill={customization.trimColor} />
              </g>
            )}
            {customization.roofAddon === 'radar' && (
              <g>
                <rect x="166" y="32" width="10" height="20" fill="#334155" />
                <ellipse cx="171" cy="24" rx="26" ry="8" transform="rotate(-18 171 24)" fill={customization.chassisColor} stroke={customization.trimColor} strokeWidth="2" />
                <circle cx="179" cy="14" r="3.5" fill={customization.trimColor} />
              </g>
            )}
            {customization.roofAddon === 'turbo' && (
              <g>
                <polygon points="118,50 146,24 188,24 172,50" fill={customization.chassisColor} stroke={customization.trimColor} strokeWidth="1.5" />
                <rect x="100" y="38" width="22" height="12" rx="3" fill={customization.trimColor} />
                <circle cx="98" cy="44" r="5" fill={customization.headlightTint} />
              </g>
            )}

            {/* Main Solar Deck & Camera Mast */}
            <rect x="115" y="47" width="136" height="6" rx="2" fill={customization.solarTint} />
            <rect x="224" y="22" width="6" height="28" fill="#334155" />
            <rect x="215" y="12" width="24" height="13" rx="3" fill={customization.chassisColor} />
            <circle cx="232" cy="18" r="3" fill="#38bdf8" />

            {/* Chassis + Foil Trim */}
            <rect x="108" y="52" width="148" height="28" rx="6" fill={customization.chassisColor} />
            <rect x="112" y="76" width="140" height="9" rx="3" fill={customization.trimColor} />

            {/* Suspension Struts & 3 Side Rocker-Bogie Wheels */}
            {[124, 182, 240].map((cx) => (
              <g key={cx}>
                <line x1={cx} y1="84" x2={cx} y2="96" stroke="#475569" strokeWidth="4" />
                <circle cx={cx} cy="96" r="14" fill={activeWheel.tireHex} stroke="#0f172a" strokeWidth="2" />
                <circle cx={cx} cy="96" r="6.5" fill={activeWheel.rimHex} />
              </g>
            ))}
          </svg>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Quick Factory & Custom Presets
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  sounds.playRoverInteract();
                  onChangeCustomization({ ...preset.config });
                }}
                className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-game font-bold text-slate-100 transition touch-manipulation"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Nameplate */}
        <div className="mb-4">
          <label
            htmlFor="rover-nameplate-input"
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5"
          >
            Rover Nameplate (Displayed in 3D World)
          </label>
          <input
            id="rover-nameplate-input"
            type="text"
            maxLength={18}
            value={customization.roverNameTag}
            onChange={(e) =>
              onChangeCustomization({
                ...customization,
                roverNameTag: e.target.value.toUpperCase().slice(0, 18),
              })
            }
            placeholder="CURIOSITY ROVER"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-sm font-game font-bold text-white uppercase tracking-wide"
          />
        </div>

        {/* Colors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Chassis Paint */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Chassis Paint
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ROVER_CHASSIS_COLORS.map((swatch) => {
                const active = customization.chassisColor === swatch.hex;
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => updateField('chassisColor', swatch.hex)}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition touch-manipulation ${
                      active
                        ? 'bg-slate-800 border-cyan-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="truncate">{swatch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Foil / Trim & Solar */}
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Thermal Foil Trim
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROVER_TRIM_COLORS.map((swatch) => {
                  const active = customization.trimColor === swatch.hex;
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => updateField('trimColor', swatch.hex)}
                      className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition touch-manipulation ${
                        active
                          ? 'bg-slate-800 border-cyan-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="truncate">{swatch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Solar Panel & Headlight Tint
              </div>
              <div className="flex flex-wrap gap-2">
                {ROVER_SOLAR_TINTS.map((s) => (
                  <button
                    key={`solar-${s.id}`}
                    type="button"
                    title={`Solar: ${s.label}`}
                    onClick={() => updateField('solarTint', s.hex)}
                    className={`w-9 h-9 rounded-xl border-2 transition touch-manipulation ${
                      customization.solarTint === s.hex
                        ? 'border-cyan-400 scale-105'
                        : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: s.hex }}
                    aria-label={`Solar tint ${s.label}`}
                  />
                ))}
                <div className="w-px h-9 bg-slate-700 mx-0.5" />
                {ROVER_HEADLIGHT_TINTS.map((h) => (
                  <button
                    key={`beam-${h.id}`}
                    type="button"
                    title={`Lights: ${h.label}`}
                    onClick={() => updateField('headlightTint', h.hex)}
                    className={`w-9 h-9 rounded-xl border-2 transition touch-manipulation ${
                      customization.headlightTint === h.hex
                        ? 'border-white scale-105'
                        : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: h.hex }}
                    aria-label={`Headlight tint ${h.label}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Roof Module */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Roof Equipment Module
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROVER_ROOF_ADDONS.map((addon) => {
              const active = customization.roofAddon === addon.id;
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => updateField('roofAddon', addon.id)}
                  className={`min-h-[54px] p-2.5 rounded-2xl border text-left transition touch-manipulation ${
                    active
                      ? 'bg-cyan-950/90 border-cyan-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-lg mb-0.5">{addon.icon}</div>
                  <div className="font-game font-bold text-xs">{addon.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wheel Rims & Grouser Finish */}
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            6-Wheel Rocker-Bogie Rim Style
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROVER_WHEEL_STYLES.map((wheel) => {
              const active = customization.wheelStyle === wheel.id;
              return (
                <button
                  key={wheel.id}
                  type="button"
                  onClick={() => updateField('wheelStyle', wheel.id)}
                  className={`min-h-[48px] p-2.5 rounded-2xl border text-left transition touch-manipulation ${
                    active
                      ? 'bg-amber-950/70 border-amber-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="w-4 h-4 rounded-full border-2"
                      style={{ backgroundColor: wheel.rimHex, borderColor: wheel.tireHex }}
                    />
                    <span className="font-game font-bold text-xs">{wheel.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">{wheel.detail}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onChangeCustomization({ ...DEFAULT_ROVER_CUSTOMIZATION });
            }}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-game font-bold text-sm transition touch-manipulation"
          >
            ↺ Reset Factory
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playRoverRepair();
              onClose();
            }}
            className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-game font-bold text-sm sm:text-base shadow-lg transition active:scale-[0.98] touch-manipulation"
          >
            ✅ Apply Build & Return to Mars
          </button>
        </div>
      </div>
    </div>
  );
};
