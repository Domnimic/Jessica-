import { RoverEngineUpgrades } from '../types/game';

export const ROVER_UPGRADE_STORAGE_KEY = 'mars_rover_engine_upgrades_v1';
export const MAX_ROVER_UPGRADE_LEVEL = 5;
export const ROVER_UPGRADE_COSTS = [1, 2, 3, 4, 5] as const;

export type RoverUpgradeTrack = 'topSpeedLevel' | 'boostRecoveryLevel';

export const DEFAULT_ROVER_UPGRADES: RoverEngineUpgrades = {
  topSpeedLevel: 0,
  boostRecoveryLevel: 0,
  availableCrystals: 0,
  totalCrystalsEarned: 0,
  totalCrystalsSpent: 0,
};

export interface RoverUpgradeStats {
  baseMaxSpeedMps: number;
  boostMaxSpeedMps: number;
  baseMaxKmh: number;
  boostMaxKmh: number;
  boostRecoveryMultiplier: number;
  drivingRecoveryPerSec: number;
  parkedRecoveryPerSec: number;
}

export function clampUpgradeLevel(level: unknown): number {
  const n = typeof level === 'number' && Number.isFinite(level) ? Math.floor(level) : 0;
  return Math.max(0, Math.min(MAX_ROVER_UPGRADE_LEVEL, n));
}

export function getRoverUpgradeStats(
  upgrades: Pick<RoverEngineUpgrades, 'topSpeedLevel' | 'boostRecoveryLevel'>
): RoverUpgradeStats {
  const speedLvl = clampUpgradeLevel(upgrades.topSpeedLevel);
  const recoveryLvl = clampUpgradeLevel(upgrades.boostRecoveryLevel);

  const baseMaxSpeedMps = 8.2 + speedLvl * 1.0; // 8.2 -> 13.2 m/s
  const boostMaxSpeedMps = 12.6 + speedLvl * 1.2; // 12.6 -> 18.6 m/s
  const boostRecoveryMultiplier = 1.0 + recoveryLvl * 0.36; // 1.0x -> 2.80x

  return {
    baseMaxSpeedMps,
    boostMaxSpeedMps,
    baseMaxKmh: Math.round(baseMaxSpeedMps * 3.6),
    boostMaxKmh: Math.round(boostMaxSpeedMps * 3.6),
    boostRecoveryMultiplier,
    drivingRecoveryPerSec: Math.round(10 * boostRecoveryMultiplier * 10) / 10,
    parkedRecoveryPerSec: Math.round(18 * boostRecoveryMultiplier * 10) / 10,
  };
}

export function getUpgradeCostForNextLevel(currentLevel: number): number | null {
  const lvl = clampUpgradeLevel(currentLevel);
  if (lvl >= MAX_ROVER_UPGRADE_LEVEL) return null;
  return ROVER_UPGRADE_COSTS[lvl];
}

export function hasAffordableUpgrade(state: RoverEngineUpgrades): boolean {
  const speedCost = getUpgradeCostForNextLevel(state.topSpeedLevel);
  const recCost = getUpgradeCostForNextLevel(state.boostRecoveryLevel);
  return (
    (speedCost !== null && state.availableCrystals >= speedCost) ||
    (recCost !== null && state.availableCrystals >= recCost)
  );
}

export function loadRoverUpgradeState(): RoverEngineUpgrades {
  try {
    const raw = window.localStorage.getItem(ROVER_UPGRADE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROVER_UPGRADES };
    const parsed = JSON.parse(raw) as Partial<RoverEngineUpgrades>;
    return {
      topSpeedLevel: clampUpgradeLevel(parsed.topSpeedLevel),
      boostRecoveryLevel: clampUpgradeLevel(parsed.boostRecoveryLevel),
      availableCrystals: Math.max(0, Math.floor(Number(parsed.availableCrystals) || 0)),
      totalCrystalsEarned: Math.max(0, Math.floor(Number(parsed.totalCrystalsEarned) || 0)),
      totalCrystalsSpent: Math.max(0, Math.floor(Number(parsed.totalCrystalsSpent) || 0)),
    };
  } catch {
    return { ...DEFAULT_ROVER_UPGRADES };
  }
}

export function saveRoverUpgradeState(state: RoverEngineUpgrades): void {
  try {
    window.localStorage.setItem(ROVER_UPGRADE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function creditRoverCrystals(state: RoverEngineUpgrades, amount: number): RoverEngineUpgrades {
  const add = Math.max(0, Math.floor(amount));
  if (add === 0) return state;
  const next: RoverEngineUpgrades = {
    ...state,
    availableCrystals: state.availableCrystals + add,
    totalCrystalsEarned: state.totalCrystalsEarned + add,
  };
  saveRoverUpgradeState(next);
  return next;
}

export function purchaseRoverUpgrade(
  state: RoverEngineUpgrades,
  track: RoverUpgradeTrack
): { updated: RoverEngineUpgrades; success: boolean; cost: number; newLevel: number } {
  const currentLevel = clampUpgradeLevel(state[track]);
  const cost = getUpgradeCostForNextLevel(currentLevel);
  if (cost === null || state.availableCrystals < cost) {
    return { updated: state, success: false, cost: cost ?? 0, newLevel: currentLevel };
  }

  const newLevel = currentLevel + 1;
  const next: RoverEngineUpgrades = {
    ...state,
    [track]: newLevel,
    availableCrystals: state.availableCrystals - cost,
    totalCrystalsSpent: state.totalCrystalsSpent + cost,
  };
  saveRoverUpgradeState(next);
  return { updated: next, success: true, cost, newLevel };
}
