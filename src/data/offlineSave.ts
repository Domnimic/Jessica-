import { GameMode, SuitColor } from '../types/game';

const OFFLINE_SAVE_KEY = 'mars_offline_expedition_save_v1';

export interface OfflineExpeditionSave {
  version: 1;
  savedAt: number;
  gameMode: Exclude<GameMode, 'multiplayer'>;
  suitColor: SuitColor;
  oxygen: number;
  score: number;
  activeCheckpointId: string;
  playerPos: { x: number; z: number };
  roverPos: { x: number; z: number; rotationY: number };
  roverHeadlightsOn: boolean;
  collectedCrystalIds: number[];
  completedMissionIds: number[];
  discoveredHiddenAreaIds: string[];
  alignedRelayIds: string[];
  completedLabIds: string[];
  towerActivated: boolean;
}

export function loadOfflineSave(): OfflineExpeditionSave | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OfflineExpeditionSave>;
    if (parsed.version !== 1 || !parsed.savedAt || !parsed.gameMode) {
      return null;
    }
    return {
      version: 1,
      savedAt: Number(parsed.savedAt),
      gameMode:
        parsed.gameMode === 'exploration' ||
        parsed.gameMode === 'survival' ||
        parsed.gameMode === 'trivia'
          ? parsed.gameMode
          : 'mission',
      suitColor: parsed.suitColor || 'white',
      oxygen: typeof parsed.oxygen === 'number' ? Math.max(15, Math.min(100, parsed.oxygen)) : 100,
      score: typeof parsed.score === 'number' ? Math.max(0, parsed.score) : 0,
      activeCheckpointId: String(parsed.activeCheckpointId || 'landing'),
      playerPos: {
        x: typeof parsed.playerPos?.x === 'number' ? parsed.playerPos.x : 0,
        z: typeof parsed.playerPos?.z === 'number' ? parsed.playerPos.z : 0,
      },
      roverPos: {
        x: typeof parsed.roverPos?.x === 'number' ? parsed.roverPos.x : 28,
        z: typeof parsed.roverPos?.z === 'number' ? parsed.roverPos.z : -24,
        rotationY: typeof parsed.roverPos?.rotationY === 'number' ? parsed.roverPos.rotationY : -Math.PI * 0.4,
      },
      roverHeadlightsOn: parsed.roverHeadlightsOn ?? true,
      collectedCrystalIds: Array.isArray(parsed.collectedCrystalIds) ? parsed.collectedCrystalIds : [],
      completedMissionIds: Array.isArray(parsed.completedMissionIds) ? parsed.completedMissionIds : [],
      discoveredHiddenAreaIds: Array.isArray(parsed.discoveredHiddenAreaIds)
        ? parsed.discoveredHiddenAreaIds
        : [],
      alignedRelayIds: Array.isArray(parsed.alignedRelayIds) ? parsed.alignedRelayIds : [],
      completedLabIds: Array.isArray(parsed.completedLabIds) ? parsed.completedLabIds : [],
      towerActivated: Boolean(parsed.towerActivated),
    };
  } catch {
    return null;
  }
}

export function saveOfflineExpedition(save: OfflineExpeditionSave): void {
  try {
    window.localStorage.setItem(OFFLINE_SAVE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota issues safely
  }
}

export function clearOfflineSave(): void {
  try {
    window.localStorage.removeItem(OFFLINE_SAVE_KEY);
  } catch {
    // Ignore
  }
}
