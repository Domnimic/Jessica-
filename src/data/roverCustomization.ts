import { RoverCustomization, RoverRoofAddon, RoverWheelStyle } from '../types/game';

export const ROVER_CUSTOMIZATION_STORAGE_KEY = 'mars_rover_customization_v1';

export const DEFAULT_ROVER_CUSTOMIZATION: RoverCustomization = {
  chassisColor: '#f1f5f9',
  trimColor: '#eab308',
  solarTint: '#1e1b4b',
  wheelStyle: 'standard',
  headlightTint: '#fef08a',
  roofAddon: 'solar',
  roverNameTag: 'CURIOSITY ROVER',
};

export interface ColorSwatchOption {
  id: string;
  label: string;
  hex: string;
}

export const ROVER_CHASSIS_COLORS: ColorSwatchOption[] = [
  { id: 'pearl', label: 'NASA Pearl', hex: '#f1f5f9' },
  { id: 'canyon', label: 'Olympus Orange', hex: '#f97316' },
  { id: 'cobalt', label: 'Orbital Blue', hex: '#3b82f6' },
  { id: 'emerald', label: 'Terra Mint', hex: '#10b981' },
  { id: 'titanium', label: 'Basalt Slate', hex: '#475569' },
  { id: 'crimson', label: 'Ares Crimson', hex: '#ef4444' },
];

export const ROVER_TRIM_COLORS: ColorSwatchOption[] = [
  { id: 'gold', label: 'Kapton Gold', hex: '#eab308' },
  { id: 'cyan', label: 'Cryo Cyan', hex: '#06b6d4' },
  { id: 'silver', label: 'Chrome Alloy', hex: '#cbd5e1' },
  { id: 'magenta', label: 'Ion Violet', hex: '#a855f7' },
];

export const ROVER_SOLAR_TINTS: ColorSwatchOption[] = [
  { id: 'indigo', label: 'Deep Silicon', hex: '#1e1b4b' },
  { id: 'teal', label: 'Cryo Cell', hex: '#0f766e' },
  { id: 'sapphire', label: 'Orbital Blue', hex: '#1d4ed8' },
  { id: 'amber', label: 'Solar Amber', hex: '#92400e' },
];

export const ROVER_HEADLIGHT_TINTS: ColorSwatchOption[] = [
  { id: 'warm', label: 'Solar White', hex: '#fef08a' },
  { id: 'ice', label: 'Xenon Cyan', hex: '#67e8f9' },
  { id: 'emerald', label: 'Geo Scan Green', hex: '#6ee7b7' },
  { id: 'amber', label: 'Dust Fog Amber', hex: '#fdba74' },
];

export interface WheelStyleOption {
  id: RoverWheelStyle;
  label: string;
  rimHex: string;
  tireHex: string;
  detail: string;
}

export const ROVER_WHEEL_STYLES: WheelStyleOption[] = [
  {
    id: 'standard',
    label: 'Flight Titanium',
    rimHex: '#64748b',
    tireHex: '#334155',
    detail: 'Balanced rocker-bogie grousers',
  },
  {
    id: 'gold_alloy',
    label: 'Gold Foil Hubs',
    rimHex: '#f59e0b',
    tireHex: '#1e293b',
    detail: 'High-contrast thermal alloy rims',
  },
  {
    id: 'cyan_mag',
    label: 'Cryo Mag-Ring',
    rimHex: '#22d3ee',
    tireHex: '#0f172a',
    detail: 'Illuminated polar rim rings',
  },
  {
    id: 'amber_heavy',
    label: 'Canyon Tread',
    rimHex: '#fb923c',
    tireHex: '#292524',
    detail: 'Rugged basalt grip finish',
  },
];

export interface RoofAddonOption {
  id: RoverRoofAddon;
  label: string;
  icon: string;
  description: string;
}

export const ROVER_ROOF_ADDONS: RoofAddonOption[] = [
  {
    id: 'solar',
    label: 'Solar Array',
    icon: '☀️',
    description: 'Twin deployable photovoltaic wing panels',
  },
  {
    id: 'cargo',
    label: 'Science Cargo Rack',
    icon: '🧰',
    description: 'Expedition sample pods & storage frame',
  },
  {
    id: 'radar',
    label: 'Deep-Space Radar',
    icon: '📡',
    description: 'Rotating high-gain orbital telemetry dish',
  },
  {
    id: 'turbo',
    label: 'Turbo Radiator Fins',
    icon: '🚀',
    description: 'Twin aerodynamic RTG cooling vents',
  },
];

export interface RoverPresetOption {
  id: string;
  name: string;
  config: RoverCustomization;
}

export const ROVER_PRESETS: RoverPresetOption[] = [
  {
    id: 'classic',
    name: 'Curiosity Classic',
    config: { ...DEFAULT_ROVER_CUSTOMIZATION },
  },
  {
    id: 'canyon',
    name: 'Canyon Runner',
    config: {
      chassisColor: '#f97316',
      trimColor: '#cbd5e1',
      solarTint: '#0f766e',
      wheelStyle: 'amber_heavy',
      headlightTint: '#fdba74',
      roofAddon: 'turbo',
      roverNameTag: 'CANYON RUNNER',
    },
  },
  {
    id: 'cyber',
    name: 'Cryo Explorer',
    config: {
      chassisColor: '#3b82f6',
      trimColor: '#06b6d4',
      solarTint: '#1d4ed8',
      wheelStyle: 'cyan_mag',
      headlightTint: '#67e8f9',
      roofAddon: 'radar',
      roverNameTag: 'CRYO SCOUT VII',
    },
  },
  {
    id: 'gold',
    name: 'Science Cruiser',
    config: {
      chassisColor: '#10b981',
      trimColor: '#eab308',
      solarTint: '#0f766e',
      wheelStyle: 'gold_alloy',
      headlightTint: '#6ee7b7',
      roofAddon: 'cargo',
      roverNameTag: 'TERRA SCIENCE 1',
    },
  },
];

export function loadRoverCustomization(): RoverCustomization {
  try {
    const raw = window.localStorage.getItem(ROVER_CUSTOMIZATION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROVER_CUSTOMIZATION };
    const parsed = JSON.parse(raw) as Partial<RoverCustomization>;
    return {
      chassisColor:
        typeof parsed.chassisColor === 'string' && parsed.chassisColor.startsWith('#')
          ? parsed.chassisColor
          : DEFAULT_ROVER_CUSTOMIZATION.chassisColor,
      trimColor:
        typeof parsed.trimColor === 'string' && parsed.trimColor.startsWith('#')
          ? parsed.trimColor
          : DEFAULT_ROVER_CUSTOMIZATION.trimColor,
      solarTint:
        typeof parsed.solarTint === 'string' && parsed.solarTint.startsWith('#')
          ? parsed.solarTint
          : DEFAULT_ROVER_CUSTOMIZATION.solarTint,
      wheelStyle: ROVER_WHEEL_STYLES.some((w) => w.id === parsed.wheelStyle)
        ? (parsed.wheelStyle as RoverWheelStyle)
        : DEFAULT_ROVER_CUSTOMIZATION.wheelStyle,
      headlightTint:
        typeof parsed.headlightTint === 'string' && parsed.headlightTint.startsWith('#')
          ? parsed.headlightTint
          : DEFAULT_ROVER_CUSTOMIZATION.headlightTint,
      roofAddon: ROVER_ROOF_ADDONS.some((r) => r.id === parsed.roofAddon)
        ? (parsed.roofAddon as RoverRoofAddon)
        : DEFAULT_ROVER_CUSTOMIZATION.roofAddon,
      roverNameTag:
        typeof parsed.roverNameTag === 'string' && parsed.roverNameTag.trim().length > 0
          ? parsed.roverNameTag.trim().slice(0, 18).toUpperCase()
          : DEFAULT_ROVER_CUSTOMIZATION.roverNameTag,
    };
  } catch {
    return { ...DEFAULT_ROVER_CUSTOMIZATION };
  }
}

export function saveRoverCustomization(config: RoverCustomization): void {
  try {
    window.localStorage.setItem(ROVER_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}
