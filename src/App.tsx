/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MarsGameEngine } from './game/Engine';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { QuizModal } from './components/QuizModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';
import { RoverCommModal } from './components/RoverCommModal';
import { BaseInfoModal } from './components/BaseInfoModal';
import { PhotoModeModal } from './components/PhotoModeModal';
import { FriendsModal } from './components/FriendsModal';
import { DailyBountyModal } from './components/DailyBountyModal';
import { TriviaExpeditionModal } from './components/TriviaExpeditionModal';
import { MarsHistoryModal } from './components/MarsHistoryModal';
import { ScienceLabModal } from './components/ScienceLabModal';
import { SatelliteMissionModal } from './components/SatelliteMissionModal';
import { RoverCustomizeModal } from './components/RoverCustomizeModal';
import { RoverAutoPilotModal } from './components/RoverAutoPilotModal';
import { RoverUpgradeModal } from './components/RoverUpgradeModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { NotificationToast, ToastItem } from './components/NotificationToast';
import { INITIAL_MISSIONS, INITIAL_CHECKPOINTS } from './data/missionsAndQuiz';
import { INITIAL_HIDDEN_AREAS, INITIAL_SATELLITE_RELAYS } from './data/expeditionExtensions';
import { loadRoverCustomization, saveRoverCustomization } from './data/roverCustomization';
import {
  RoverUpgradeTrack,
  loadRoverUpgradeState,
  creditRoverCrystals,
  purchaseRoverUpgrade,
  hasAffordableUpgrade,
} from './data/roverUpgrades';
import { pickRandomTriviaQuestion } from './data/triviaQuestions';
import {
  INITIAL_HISTORY_TABLETS,
  loadDiscoveredTabletIds,
  saveDiscoveredTabletIds,
  getEarnedHistorianRank,
} from './data/marsHistory';
import {
  loadDailyBountyBoard,
  saveDailyBountyBoard,
  getTodayDateKey,
  generateDailyBountiesForDate,
} from './data/dailyBounties';
import {
  GameMode,
  GameScreen,
  InteractivePrompt,
  Mission,
  SuitColor,
  CheckpointData,
  WeatherData,
  DayNightData,
  FlightData,
  WindData,
  DailyBountyBoardState,
  TriviaQuestion,
  TriviaStats,
  HistoryTabletData,
  RoverDurabilityData,
  RoverDriveTelemetry,
  RoverEngineUpgrades,
  HiddenAreaData,
  SatelliteRelayData,
  StaminaData,
  RoverCustomization,
  AutoPilotWaypoint,
  AutoPilotState,
  LeaderboardEntry,
  LocalLeaderboardProfile,
} from './types/game';
import {
  loadLocalLeaderboardProfile,
  saveLocalLeaderboardProfile,
  loadCachedLeaderboard,
  recordLeaderboardAnswer,
  recordScienceQuizFinish,
  mergeAndSortLeaderboard,
  fetchRemoteLeaderboard,
  submitRemoteLeaderboardProfile,
} from './data/leaderboard';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { ChatMessage, ConnectionStatus, RemotePlayerState } from './types/multiplayer';
import { MultiplayerClient } from './network/MultiplayerClient';
import { sounds } from './audio/SoundEffects';
import { voiceAssistant } from './audio/VoiceAssistant';
import { SoundSettingsModal } from './components/SoundSettingsModal';
import { AudioSettings } from './types/audio';
import { OfflineIndicator } from './components/PWAControls';
import { OrientationGuard } from './components/OrientationGuard';
import { tryLockLandscapeOrientation } from './utils/orientation';
import { loadCameraFov, saveCameraFov } from './utils/cameraSettings';
import {
  OfflineExpeditionSave,
  loadOfflineSave,
  saveOfflineExpedition,
  clearOfflineSave,
} from './data/offlineSave';

const SPACE_STATION_POS = { x: -40, z: -32 };

function getOrCreateTabPlayerId(): string {
  try {
    const existing = window.sessionStorage.getItem('mars_tab_player_id');
    if (existing) return existing;
    const created = `exp-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem('mars_tab_player_id', created);
    return created;
  } catch {
    return `exp-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getInitialPlayerName(): string {
  try {
    const saved = window.localStorage.getItem('mars_player_name');
    if (saved && saved.trim()) return saved.trim().slice(0, 20);
  } catch {}
  return `Explorer-${Math.floor(100 + Math.random() * 900)}`;
}

function getRoomCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (!code) return null;
    const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    return clean.length >= 3 ? clean : null;
  } catch {
    return null;
  }
}

function setRoomCodeInUrl(code: string | null) {
  try {
    const url = new URL(window.location.href);
    if (code) {
      url.searchParams.set('room', code);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {}
}

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MarsGameEngine | null>(null);
  const localPlayerIdRef = useRef<string>(getOrCreateTabPlayerId());
  const mpClientRef = useRef<MultiplayerClient | null>(null);

  // Game UI States
  const initialUrlRoom = useMemo(() => getRoomCodeFromUrl(), []);
  const [screen, setScreen] = useState<GameScreen>('title');
  const [gameMode, setGameMode] = useState<GameMode>(initialUrlRoom ? 'multiplayer' : 'mission');
  const [suitColor, setSuitColor] = useState<SuitColor>('white');
  const [playerName, setPlayerName] = useState<string>(getInitialPlayerName);
  const [oxygen, setOxygen] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [crystalsCount, setCrystalsCount] = useState<number>(0);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>(INITIAL_CHECKPOINTS);
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointData>(INITIAL_CHECKPOINTS[0]);
  const [interactivePrompt, setInteractivePrompt] = useState<InteractivePrompt | null>(null);
  const [isDrivingRover, setIsDrivingRover] = useState<boolean>(false);
  const [roverHeadlights, setRoverHeadlights] = useState<boolean>(true);
  const [roverDurability, setRoverDurability] = useState<RoverDurabilityData>({
    integrity: 100,
    status: 'OPTIMAL',
    terrainStress: 'SMOOTH',
    collisionCount: 0,
    speedMultiplier: 1.0,
  });
  const [roverTelemetry, setRoverTelemetry] = useState<RoverDriveTelemetry>({
    speedKmh: 0,
    gear: 'P',
    boostEnergy: 100,
    boostActive: false,
    lightsOn: true,
    isAirborne: false,
    jumpCost: 20,
    isDrifting: false,
    driftIntensity: 0,
  });
  const [isUnderground, setIsUnderground] = useState<boolean>(false);
  const [hiddenAreas, setHiddenAreas] = useState<HiddenAreaData[]>(INITIAL_HIDDEN_AREAS);
  const [satelliteRelays, setSatelliteRelays] = useState<SatelliteRelayData[]>(INITIAL_SATELLITE_RELAYS);
  const [completedLabIds, setCompletedLabIds] = useState<string[]>([]);
  const [isScienceLabOpen, setIsScienceLabOpen] = useState<boolean>(false);
  const [activeSatelliteRelay, setActiveSatelliteRelay] = useState<SatelliteRelayData | null>(null);
  const [roverCustomization, setRoverCustomization] = useState<RoverCustomization>(() =>
    loadRoverCustomization()
  );
  const [isRoverCustomizeOpen, setIsRoverCustomizeOpen] = useState<boolean>(false);
  const [roverUpgrades, setRoverUpgrades] = useState<RoverEngineUpgrades>(() =>
    loadRoverUpgradeState()
  );
  const [isRoverUpgradeOpen, setIsRoverUpgradeOpen] = useState<boolean>(false);
  const roverUpgradesRef = useRef<RoverEngineUpgrades>(roverUpgrades);
  useEffect(() => {
    roverUpgradesRef.current = roverUpgrades;
  }, [roverUpgrades]);
  const [isAutoPilotOpen, setIsAutoPilotOpen] = useState<boolean>(false);
  const [autoPilotState, setAutoPilotState] = useState<AutoPilotState>({
    active: false,
    target: null,
    distanceMeters: 0,
    etaSeconds: 0,
    avoidingObstacle: false,
    reversingRecovery: false,
  });
  const roverCustomizationRef = useRef<RoverCustomization>(roverCustomization);
  useEffect(() => {
    roverCustomizationRef.current = roverCustomization;
  }, [roverCustomization]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => sounds.getSettings());
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getIsMuted());
  const [cameraFov, setCameraFov] = useState<number>(() => loadCameraFov());
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [photoFlash, setPhotoFlash] = useState<boolean>(false);
  const [isTransitioningHome, setIsTransitioningHome] = useState<boolean>(false);
  const homeTransitionTimerRef = useRef<number | null>(null);
  const [savedExpedition, setSavedExpedition] = useState<OfflineExpeditionSave | null>(() =>
    loadOfflineSave()
  );

  // Real-Time Multiplayer Room States
  const [roomId, setRoomId] = useState<string | null>(initialUrlRoom);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerState[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState<boolean>(false);

  // Daily Bounties System State
  const [dailyBounties, setDailyBounties] = useState<DailyBountyBoardState>(() =>
    loadDailyBountyBoard()
  );
  const [isBountyModalOpen, setIsBountyModalOpen] = useState<boolean>(false);
  const dailyBountiesRef = useRef<DailyBountyBoardState>(dailyBounties);
  useEffect(() => {
    dailyBountiesRef.current = dailyBounties;
  }, [dailyBounties]);

  // Trivia Expedition Mode States
  const [activeTriviaQuestion, setActiveTriviaQuestion] = useState<TriviaQuestion | null>(null);
  const [triviaStats, setTriviaStats] = useState<TriviaStats>({
    answeredCount: 0,
    correctCount: 0,
    streak: 0,
    bestStreak: 0,
    totalXpEarned: 0,
    scanMeters: 0,
    scanThreshold: 32,
  });
  const usedTriviaIdsRef = useRef<Set<string>>(new Set());

  // Global Correct-Answers Leaderboard State
  const { isOnline } = useOnlineStatus();
  const [leaderboardProfile, setLeaderboardProfile] = useState<LocalLeaderboardProfile>(() =>
    loadLocalLeaderboardProfile(playerName, suitColor)
  );
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() =>
    loadCachedLeaderboard()
  );
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const leaderboardProfileRef = useRef<LocalLeaderboardProfile>(leaderboardProfile);
  useEffect(() => {
    leaderboardProfileRef.current = leaderboardProfile;
  }, [leaderboardProfile]);

  const careerRank = useMemo(() => {
    const sorted = mergeAndSortLeaderboard(leaderboardEntries, leaderboardProfile, 'all');
    const idx = sorted.findIndex((e) => e.playerId === leaderboardProfile.playerId);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboardEntries, leaderboardProfile]);

  // Mars History Codex & Hidden Lore Tablets States
  const [discoveredTabletIds, setDiscoveredTabletIds] = useState<string[]>(() =>
    loadDiscoveredTabletIds()
  );
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [lastDiscoveredTabletId, setLastDiscoveredTabletId] = useState<string | null>(null);
  const [tabletsList, setTabletsList] = useState<
    { id: string; x: number; z: number; discovered: boolean }[]
  >(() => {
    const savedSet = new Set(loadDiscoveredTabletIds());
    return INITIAL_HISTORY_TABLETS.map((t) => ({
      id: t.id,
      x: t.position[0],
      z: t.position[2],
      discovered: savedSet.has(t.id),
    }));
  });
  const discoveredTabletIdsRef = useRef<string[]>(discoveredTabletIds);
  useEffect(() => {
    discoveredTabletIdsRef.current = discoveredTabletIds;
  }, [discoveredTabletIds]);

  // Keep latest player metadata in refs for callbacks
  const playerNameRef = useRef<string>(playerName);
  const suitColorRef = useRef<SuitColor>(suitColor);
  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);
  useEffect(() => {
    suitColorRef.current = suitColor;
  }, [suitColor]);

  // Day-Night Sol Cycle State
  const [dayNight, setDayNight] = useState<DayNightData>({
    timeOfSol: 11.5,
    timeFormatted: '11:30',
    phase: 'day',
    phaseName: 'Martian Sol Day',
    solarProgress: 0.48,
    isNight: false,
    sunElevationDeg: 78,
  });

  // Weather System State
  const [weather, setWeather] = useState<WeatherData>({
    type: 'clear',
    name: 'Clear Atmospheric Skies',
    intensity: 0,
    visibilityMeters: 180,
    oxygenMultiplier: 1.0,
    timeRemaining: 45,
    isSheltered: false,
    forecast: {
      upcomingEvent: 'Approaching Dust Storm',
      secondsUntil: 45,
      threatLevel: 'nominal',
      barometricPressure: 6.12,
      pressureTrend: 'steady',
      expectedVisibility: 28,
      expectedO2Drain: 2.5,
      safetyAdvisory: 'Atmosphere clear and stable. Safe for crystal harvesting and surveying.',
    },
  });

  // Sky-Inspired Flight Energy & Martian Wind States
  const [flightData, setFlightData] = useState<FlightData>({
    energy: 100,
    isGliding: false,
    isAirborne: false,
    isRegenerating: false,
    verticalSpeed: 0,
    airSpeed: 0,
    altitude: 0,
  });

  const [windData, setWindData] = useState<WindData>({
    angleRad: 1.15,
    cardinal: 'ENE',
    speedMps: 4.6,
    gusting: false,
    relativeLabel: 'CROSSWIND',
  });

  const [staminaData, setStaminaData] = useState<StaminaData>({
    stamina: 100,
    maxStamina: 100,
    isExhausted: false,
    activityState: 'RECOVERING',
    movementSpeedMps: 0,
    speedMultiplier: 1.0,
  });

  // Mini-Map Radar Tracking States
  const [playerPos, setPlayerPos] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [playerHeading, setPlayerHeading] = useState<number>(0);
  const [roverPos, setRoverPos] = useState<{ x: number; z: number }>({ x: 28, z: -24 });
  const [crystalsList, setCrystalsList] = useState<{ id: number; x: number; z: number; collected: boolean }[]>([
    { id: 1, x: 14, z: 16, collected: false },
    { id: 2, x: -18, z: 22, collected: false },
    { id: 3, x: 36, z: -14, collected: false },
    { id: 4, x: -28, z: -10, collected: false },
    { id: 5, x: 52, z: 32, collected: false },
    { id: 6, x: -54, z: 18, collected: false },
    { id: 7, x: 16, z: -52, collected: false },
    { id: 8, x: -64, z: -42, collected: false },
    { id: 9, x: 64, z: -58, collected: false },
    { id: 10, x: -10, z: -68, collected: false },
  ]);

  // Active mission & radar objective target computation
  const currentMission = missions.find((m) => !m.completed) || missions[missions.length - 1];

  const activeObjective = React.useMemo(() => {
    if (!currentMission || currentMission.completed) return null;

    if (currentMission.id === 1) {
      return { x: 18, z: 22, title: 'Red Basin Overlook' };
    }
    if (currentMission.id === 2) {
      const uncollected = crystalsList.filter((c) => !c.collected);
      if (uncollected.length > 0) {
        let nearest = uncollected[0];
        let minD = Infinity;
        for (const c of uncollected) {
          const d = Math.hypot(playerPos.x - c.x, playerPos.z - c.z);
          if (d < minD) {
            minD = d;
            nearest = c;
          }
        }
        return { x: nearest.x, z: nearest.z, title: 'Energy Crystal' };
      }
      return null;
    }
    if (currentMission.id === 3) {
      return { x: roverPos.x, z: roverPos.z, title: 'Curiosity Rover' };
    }
    if (currentMission.id === 4) {
      return { x: -40, z: -32, title: 'Research Base Station' };
    }
    if (currentMission.id === 5) {
      return { x: -51, z: -46, title: 'Earth Comm Tower' };
    }
    if (currentMission.id === 6) {
      return {
        x: roverPos.x,
        z: roverPos.z,
        title: roverDurability.integrity < 99.5 ? 'Repair Mars Rover' : 'Mars Rover (Test Terrain)',
      };
    }
    if (currentMission.id === 7) {
      const nextHidden = hiddenAreas.find((a) => !a.discovered);
      if (nextHidden) {
        return {
          x: nextHidden.position[0],
          z: nextHidden.position[2],
          title: nextHidden.name,
        };
      }
    }
    if (currentMission.id === 8) {
      return isUnderground
        ? { x: -47.5, z: -36.5, title: 'Subterranean Science Lab Bench' }
        : { x: -26, z: -32, title: 'Underground Base Elevator' };
    }
    if (currentMission.id === 9) {
      const nextRelay = satelliteRelays.find((r) => !r.aligned);
      if (nextRelay) {
        return {
          x: nextRelay.position[0],
          z: nextRelay.position[2],
          title: `${nextRelay.name} Dish`,
        };
      }
    }
    if (currentMission.targetLocation) {
      return {
        x: currentMission.targetLocation[0],
        z: currentMission.targetLocation[2],
        title: currentMission.title,
      };
    }
    return null;
  }, [currentMission, crystalsList, playerPos, roverPos, roverDurability.integrity, hiddenAreas, isUnderground, satelliteRelays]);

  const showNotification = useCallback((title: string, message: string, type?: 'normal' | 'warning' | 'success') => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
    });
  }, []);

  // Safe, idempotent updater for Daily Bounty progress, rewards & midnight rollover
  const applyBountyProgress = useCallback(
    (
      delta?: {
        crystals?: number;
        glideMeters?: number;
        roverMeters?: number;
        footMeters?: number;
      },
      reachedBountyId?: string
    ) => {
      const currentBoard = dailyBountiesRef.current;
      const todayKey = getTodayDateKey();
      const baseBoard =
        currentBoard.dateKey === todayKey ? currentBoard : generateDailyBountiesForDate(todayKey);

      let didChange = currentBoard.dateKey !== todayKey;
      const newlyCompletedTitles: { title: string; rewardScore: number; rewardBadge: string }[] = [];

      const updatedBounties = baseBoard.bounties.map((b) => {
        if (b.completed) return b;

        let increment = 0;
        if (b.category === 'collect_crystals' && delta?.crystals) {
          increment = delta.crystals;
        } else if (b.category === 'glide_distance' && delta?.glideMeters) {
          increment = delta.glideMeters;
        } else if (b.category === 'drive_rover' && delta?.roverMeters) {
          increment = delta.roverMeters;
        } else if (b.category === 'foot_distance' && delta?.footMeters) {
          increment = delta.footMeters;
        } else if (b.category === 'reach_location' && reachedBountyId && b.id === reachedBountyId) {
          increment = b.targetCount;
        }

        if (increment <= 0) return b;

        didChange = true;
        const nextCount = Math.min(b.targetCount, b.currentCount + increment);
        const nowCompleted = nextCount >= b.targetCount;
        if (nowCompleted) {
          newlyCompletedTitles.push({
            title: b.title,
            rewardScore: b.rewardScore,
            rewardBadge: b.rewardBadge,
          });
        }
        return {
          ...b,
          currentCount: nextCount,
          completed: nowCompleted,
          claimed: nowCompleted ? true : b.claimed,
        };
      });

      if (!didChange) return;

      const allComplete = updatedBounties.every((b) => b.completed);
      const awardGrandBonus = allComplete && !baseBoard.grandBonusClaimed;

      const nextBoard: DailyBountyBoardState = {
        ...baseBoard,
        bounties: updatedBounties,
        grandBonusClaimed: baseBoard.grandBonusClaimed || awardGrandBonus,
      };

      dailyBountiesRef.current = nextBoard;
      setDailyBounties(nextBoard);
      saveDailyBountyBoard(nextBoard);

      if (newlyCompletedTitles.length > 0) {
        let totalXp = 0;
        newlyCompletedTitles.forEach((item) => {
          totalXp += item.rewardScore;
        });
        if (awardGrandBonus) {
          totalXp += nextBoard.grandBonusPoints;
        }
        engineRef.current?.addScore(totalXp);
        sounds.playMissionComplete();

        const first = newlyCompletedTitles[0];
        showNotification(
          awardGrandBonus ? 'ALL DAILY BOUNTIES COMPLETE!' : 'DAILY BOUNTY COMPLETE!',
          awardGrandBonus
            ? `${first.title} + Grand Tri-Bounty Bonus! (+${totalXp} XP)`
            : `${first.title} · Badge "${first.rewardBadge}" unlocked! (+${first.rewardScore} XP)`,
          'success'
        );
      }
    },
    [showNotification]
  );

  // Sync 3D Golden Beacon on Mars Terrain whenever Daily Bounties update
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const locBounty = dailyBounties.bounties.find(
      (b) => b.category === 'reach_location' && !b.completed && b.targetLocation
    );
    if (locBounty?.targetLocation) {
      engine.setDailyBountyTarget({
        id: locBounty.id,
        x: locBounty.targetLocation.x,
        z: locBounty.targetLocation.z,
        radius: locBounty.targetLocation.radius,
      });
    } else {
      engine.setDailyBountyTarget(null);
    }
  }, [dailyBounties]);

  // Automatic daily rollover check (checked every 30s; live 1s countdown renders locally in BountyCountdownText)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const todayKey = getTodayDateKey();
      if (dailyBountiesRef.current.dateKey !== todayKey) {
        const freshBoard = generateDailyBountiesForDate(todayKey);
        dailyBountiesRef.current = freshBoard;
        setDailyBounties(freshBoard);
        saveDailyBountyBoard(freshBoard);
        showNotification(
          'NEW DAILY BOUNTIES AVAILABLE!',
          'Sol contracts have rotated for the new day. Check your Daily Bounty Board!',
          'normal'
        );
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [showNotification]);

  // Derive radar markers for connected friends
  const [remoteCrewForMap, setRemoteCrewForMap] = useState<
    { id: string; name: string; x: number; z: number; color: string }[]
  >([]);
  const syncRemoteCrewForMap = useCallback((eng: MarsGameEngine | null) => {
    if (!eng) return;
    const next = eng.getRemotePlayersForMap();
    setRemoteCrewForMap((prev) => (prev.length === 0 && next.length === 0 ? prev : next));
  }, []);

  // Initialize Game Engine + Multiplayer WebSocket Client once
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const localId = localPlayerIdRef.current;

    const mpClient = new MultiplayerClient(localId, {
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onRoomInit: (snapshot) => {
        setRoomId(snapshot.roomId);
        setChatMessages(snapshot.chatHistory || []);
        setRemotePlayers(snapshot.players.filter((p) => p.id !== localId));

        const eng = engineRef.current;
        if (eng) {
          eng.syncRemoteSnapshot(snapshot);
          setCrystalsList(eng.getCrystalsList());
          syncRemoteCrewForMap(eng);
        }
      },
      onPlayerJoined: (player) => {
        if (player.id === localId) return;
        setRemotePlayers((prev) => {
          const filtered = prev.filter((p) => p.id !== player.id);
          return [...filtered, player];
        });
        engineRef.current?.upsertRemotePlayer(player);
        syncRemoteCrewForMap(engineRef.current);
        sounds.playMissionComplete();
        showNotification('FRIEND JOINED MARS!', `${player.name} landed in your crew room!`, 'success');
      },
      onPlayerMoved: (delta) => {
        if (delta.id === localId) return;
        engineRef.current?.moveRemotePlayer(delta);
        setRemotePlayers((prev) =>
          prev.map((p) => (p.id === delta.id ? { ...p, ...delta } : p))
        );
      },
      onPlayerMetaUpdated: (playerId, name, color) => {
        if (playerId === localId) return;
        engineRef.current?.updateRemotePlayerMeta(playerId, name, color);
        setRemotePlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, name, suitColor: color } : p))
        );
      },
      onPlayerLeft: (playerId, name) => {
        if (playerId === localId) return;
        engineRef.current?.removeRemotePlayer(playerId);
        setRemotePlayers((prev) => prev.filter((p) => p.id !== playerId));
        syncRemoteCrewForMap(engineRef.current);
        showNotification('CREW UPDATE', `${name} left the mission room.`, 'normal');
      },
      onRoverState: (roverState) => {
        engineRef.current?.applyRemoteRoverState(roverState);
        setRoverPos({ x: roverState.x, z: roverState.z });
      },
      onRoverBusy: (driverName) => {
        showNotification('ROVER IN USE', `${driverName} is currently driving the Curiosity Rover!`, 'warning');
      },
      onCrystalCollected: (crystalId, collectorName) => {
        const eng = engineRef.current;
        if (eng) {
          eng.applyRemoteCrystalCollected(crystalId, collectorName);
          setCrystalsList(eng.getCrystalsList());
        }
      },
      onCheckpointActivated: (checkpointId, activatorName) => {
        engineRef.current?.applyRemoteCheckpointActivated(checkpointId, activatorName);
      },
      onMissionCompleted: (missionId) => {
        engineRef.current?.applyRemoteMissionCompleted(missionId);
      },
      onTowerActivated: (activatedBy) => {
        engineRef.current?.applyRemoteTowerActivated(activatedBy);
      },
      onChatMessage: (message) => {
        setChatMessages((prev) => [...prev.slice(-39), message]);
      },
      onPingEmoted: (ping) => {
        engineRef.current?.spawnRemotePing(ping);
        if (ping.senderId !== localId) {
          sounds.playClick();
          showNotification('CREW LOCATION PING', `${ping.senderName}: "${ping.label}"`, 'normal');
        }
      },
    });
    mpClientRef.current = mpClient;

    const engine = new MarsGameEngine(
      canvasContainerRef.current,
      {
        onOxygenChange: (o2) => setOxygen(o2),
        onOxygenAlert: (msg) => showNotification('OXYGEN ALERT', msg, 'warning'),
        onScoreChange: (pts) => setScore(pts),
        onCrystalsChange: (count) => {
          setCrystalsCount(count);
          if (engineRef.current) {
            setCrystalsList(engineRef.current.getCrystalsList());
          }
        },
        onCrystalBankCredit: (amount) => {
          const next = creditRoverCrystals(roverUpgradesRef.current, amount);
          roverUpgradesRef.current = next;
          setRoverUpgrades(next);
        },
        onMissionProgress: (missionId, current, completed) => {
          setMissions((prev) =>
            prev.map((m) =>
              m.id === missionId ? { ...m, currentCount: current, completed } : m
            )
          );
        },
        onCheckpointChange: (cp) => {
          setActiveCheckpoint(cp);
          setCheckpoints((prev) =>
            prev.map((item) => (item.id === cp.id ? { ...item, activated: true } : item))
          );
        },
        onPlayerPositionChange: (pos, heading, rPos) => {
          setPlayerPos(pos);
          setPlayerHeading(heading);
          setRoverPos(rPos);
          syncRemoteCrewForMap(engineRef.current);
        },
        onWeatherChange: (w) => setWeather(w),
        onTimeUpdate: (td) => setDayNight(td),
        onFlightUpdate: (f) => setFlightData(f),
        onWindUpdate: (wnd) => setWindData(wnd),
        onStaminaChange: (stam) => setStaminaData(stam),
        onRoverDurabilityChange: (durability) => setRoverDurability(durability),
        onRoverDriveTelemetryChange: (tele) => setRoverTelemetry(tele),
        onUndergroundStateChange: (ug) => setIsUnderground(ug),
        onHiddenAreaDiscover: (_area, all) => setHiddenAreas(all),
        onInteractivePromptChange: (prompt) => setInteractivePrompt(prompt),
        onRoverHeadlightsChange: (enabled) => setRoverHeadlights(enabled),
        onAutoPilotChange: (apState) => setAutoPilotState(apState),
        onOpenQuiz: () => {
          engineRef.current?.pause();
          setScreen('quiz');
        },
        onOpenRoverComm: () => {
          engineRef.current?.pause();
          setScreen('roverInfo');
        },
        onOpenBaseInfo: () => {
          engineRef.current?.pause();
          sounds.setMusicContext('research_base');
          setScreen('baseInfo');
        },
        onOpenScienceLab: () => {
          engineRef.current?.pause();
          setIsScienceLabOpen(true);
        },
        onOpenSatelliteRelay: (relay) => {
          engineRef.current?.pause();
          setActiveSatelliteRelay(relay);
        },
        onGameOver: () => {
          setScreen('gameover');
        },
        onVictory: () => {
          setScreen('victory');
        },
        onNotification: (title, message, type) => showNotification(title, message, type),
        // Outgoing real-time multiplayer state sync
        onLocalStateSync: (state) => mpClientRef.current?.sendPlayerUpdate(state),
        onLocalRoverSync: (x, y, z, rotY, headlightsOn) =>
          mpClientRef.current?.sendRoverUpdate(x, y, z, rotY, headlightsOn),
        onLocalRoverDriveToggle: (entering) => {
          if (entering) {
            mpClientRef.current?.claimRover();
          } else {
            mpClientRef.current?.releaseRover();
          }
        },
        onLocalRoverHeadlightsToggle: (enabled) => mpClientRef.current?.sendRoverHeadlights(enabled),
        onLocalCrystalCollect: (crystalId) => mpClientRef.current?.sendCrystalCollected(crystalId),
        onLocalCheckpointActivate: (checkpointId) =>
          mpClientRef.current?.sendCheckpointActivated(checkpointId),
        onLocalMissionComplete: (missionId) => mpClientRef.current?.sendMissionCompleted(missionId),
        onLocalTowerActivate: () => mpClientRef.current?.sendTowerActivated(),
        onBountyProgressDelta: (delta) => applyBountyProgress(delta),
        onBountyTargetReached: (bountyId) => applyBountyProgress(undefined, bountyId),
        onTriviaTrigger: (nextThreshold) => {
          const nextQ = pickRandomTriviaQuestion(usedTriviaIdsRef.current);
          setActiveTriviaQuestion(nextQ);
          setTriviaStats((prev) => ({
            ...prev,
            scanMeters: 0,
            scanThreshold: nextThreshold,
          }));
        },
        onTriviaScanProgress: (scanMeters, scanThreshold) => {
          setTriviaStats((prev) =>
            prev.scanMeters === scanMeters && prev.scanThreshold === scanThreshold
              ? prev
              : { ...prev, scanMeters, scanThreshold }
          );
        },
        onTabletDiscover: (tablet: HistoryTabletData) => {
          const prevIds = discoveredTabletIdsRef.current;
          if (prevIds.includes(tablet.id)) return;
          const nextIds = [...prevIds, tablet.id];
          const prevRank = getEarnedHistorianRank(prevIds.length);
          const nextRank = getEarnedHistorianRank(nextIds.length);
          const unlockedNewRank = nextRank && nextRank.id !== prevRank?.id ? nextRank : null;

          discoveredTabletIdsRef.current = nextIds;
          setDiscoveredTabletIds(nextIds);
          saveDiscoveredTabletIds(nextIds);
          setLastDiscoveredTabletId(tablet.id);
          if (engineRef.current) {
            setTabletsList(engineRef.current.getTabletsList());
          }

          const totalXp = tablet.xpReward + (unlockedNewRank ? unlockedNewRank.bonusXp : 0);
          engineRef.current?.addScore(totalXp);

          showNotification(
            unlockedNewRank
              ? `HISTORIAN RANK: ${unlockedNewRank.title.toUpperCase()}!`
              : 'LORE TABLET DISCOVERED!',
            unlockedNewRank
              ? `Found "${tablet.title}" + Badge "${tablet.historianBadge}" & ${unlockedNewRank.icon} Rank Bonus! (+${totalXp} XP)`
              : `"${tablet.title}" archived! Badge "${tablet.historianBadge}" unlocked (+${tablet.xpReward} XP).`,
            'success'
          );
        },
      },
      localId
    );

    engineRef.current = engine;
    engine.setPlayerNameTag(playerNameRef.current);
    engine.applyRoverCustomization(roverCustomizationRef.current);
    engine.applyEngineUpgrades(roverUpgradesRef.current);
    setCrystalsList(engine.getCrystalsList());
    setHiddenAreas(engine.getHiddenAreasList());
    setSatelliteRelays(engine.getSatelliteRelaysList());
    engine.syncDiscoveredTablets(discoveredTabletIdsRef.current);
    setTabletsList(engine.getTabletsList());

    // Initial Daily Bounty 3D beacon placement if active
    const initialLoc = dailyBountiesRef.current.bounties.find(
      (b) => b.category === 'reach_location' && !b.completed && b.targetLocation
    );
    if (initialLoc?.targetLocation) {
      engine.setDailyBountyTarget({
        id: initialLoc.id,
        x: initialLoc.targetLocation.x,
        z: initialLoc.targetLocation.z,
        radius: initialLoc.targetLocation.radius,
      });
    }

    // Auto-connect if launched via ?room=CODE invite link
    if (initialUrlRoom) {
      engine.setLiveRoomActive(true);
      mpClient.joinRoom(initialUrlRoom, playerNameRef.current, suitColorRef.current);
    }

    return () => {
      if (homeTransitionTimerRef.current !== null) {
        window.clearTimeout(homeTransitionTimerRef.current);
      }
      mpClient.dispose();
      mpClientRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, [showNotification, initialUrlRoom, applyBountyProgress, syncRemoteCrewForMap]);

  // Room & Friend Handlers
  const handleCreateRoom = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showNotification(
        'OFFLINE MODE',
        'Crew Multiplayer Rooms require internet. All Solo modes work offline!',
        'warning'
      );
      return;
    }

    let code = '';
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { roomId?: string };
        if (data.roomId) code = data.roomId;
      }
    } catch {}

    if (!code) {
      showNotification(
        'SERVER UNREACHABLE',
        'Could not reach Crew Room server right now. You can continue playing Solo offline!',
        'warning'
      );
      return;
    }

    setRoomId(code);
    setRoomCodeInUrl(code);
    setGameMode('multiplayer');
    engineRef.current?.setGameMode('multiplayer');
    engineRef.current?.setLiveRoomActive(true);
    mpClientRef.current?.joinRoom(code, playerName, suitColor);
    showNotification('CREW ROOM CREATED!', `Room ${code} is live! Share the invite link with friends.`, 'success');
  };

  const handleJoinRoom = (code: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showNotification(
        'OFFLINE MODE',
        'Crew Multiplayer Rooms require internet. All Solo modes work offline!',
        'warning'
      );
      return;
    }
    const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    if (!clean) return;
    setRoomId(clean);
    setRoomCodeInUrl(clean);
    setGameMode('multiplayer');
    engineRef.current?.setGameMode('multiplayer');
    engineRef.current?.setLiveRoomActive(true);
    mpClientRef.current?.joinRoom(clean, playerName, suitColor);
    showNotification('JOINING CREW ROOM...', `Connecting to room ${clean}...`, 'normal');
  };

  const handleLeaveRoom = () => {
    mpClientRef.current?.leaveRoom();
    engineRef.current?.setLiveRoomActive(false);
    setRoomId(null);
    setRemotePlayers([]);
    setRemoteCrewForMap([]);
    setChatMessages([]);
    setConnectionStatus('disconnected');
    setRoomCodeInUrl(null);
    showNotification('LEFT CREW ROOM', 'Returned to solo expedition mode.', 'normal');
  };

  const handleChangePlayerName = (nextName: string) => {
    const trimmed = nextName.slice(0, 20);
    setPlayerName(trimmed);
    try {
      window.localStorage.setItem('mars_player_name', trimmed);
    } catch {}
    engineRef.current?.setPlayerNameTag(trimmed);
    mpClientRef.current?.updatePlayerMeta(trimmed, suitColor);
    const updatedProfile: LocalLeaderboardProfile = {
      ...leaderboardProfileRef.current,
      name: trimmed.trim() || 'Commander',
      pendingSync: leaderboardProfileRef.current.answeredCount > 0,
    };
    leaderboardProfileRef.current = updatedProfile;
    setLeaderboardProfile(updatedProfile);
    saveLocalLeaderboardProfile(updatedProfile);
  };

  const handleSendChat = useCallback((text: string) => {
    mpClientRef.current?.sendChat(text);
  }, []);

  const handleSendPing = useCallback(
    (label: string = 'Over here!') => {
      if (!engineRef.current || !roomId) return;
      const pos = engineRef.current.getPlayerPosition();
      mpClientRef.current?.sendPing(pos.x, pos.y, pos.z, label);
      sounds.playClick();
      showNotification('PING SENT', `Beacon dropped for crew: "${label}"`, 'success');
    },
    [roomId, showNotification]
  );

  // Audio settings subscription, Menu music context, and AI voice dialogue gating
  useEffect(() => {
    sounds.setMusicContext('menu');
    const unsubscribe = sounds.subscribe((next) => {
      setAudioSettings(next);
      setIsMuted(next.muted);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const dialogueActive =
      screen === 'quiz' ||
      screen === 'roverInfo' ||
      screen === 'baseInfo' ||
      isBountyModalOpen ||
      isHistoryModalOpen ||
      isFriendsModalOpen ||
      isScienceLabOpen ||
      isRoverCustomizeOpen ||
      isRoverUpgradeOpen ||
      isAutoPilotOpen ||
      isLeaderboardOpen ||
      Boolean(activeSatelliteRelay) ||
      Boolean(activeTriviaQuestion);
    voiceAssistant.setDialogueActive(dialogueActive);
  }, [
    screen,
    isBountyModalOpen,
    isHistoryModalOpen,
    isFriendsModalOpen,
    isScienceLabOpen,
    isRoverCustomizeOpen,
    isRoverUpgradeOpen,
    isAutoPilotOpen,
    isLeaderboardOpen,
    activeSatelliteRelay,
    activeTriviaQuestion,
  ]);

  const syncLeaderboardWithServer = useCallback(
    async (profileOverride?: LocalLeaderboardProfile) => {
      const target = profileOverride ?? leaderboardProfileRef.current;
      setIsLeaderboardLoading(true);
      try {
        if (target.answeredCount > 0 || target.pendingSync) {
          const submitted = await submitRemoteLeaderboardProfile(target);
          if (submitted) {
            setLeaderboardEntries(submitted.entries);
            const cleared: LocalLeaderboardProfile = {
              ...leaderboardProfileRef.current,
              pendingSync: false,
            };
            leaderboardProfileRef.current = cleared;
            setLeaderboardProfile(cleared);
            saveLocalLeaderboardProfile(cleared);
            return;
          }
        }
        const remote = await fetchRemoteLeaderboard();
        if (remote) {
          setLeaderboardEntries(remote);
        }
      } finally {
        setIsLeaderboardLoading(false);
      }
    },
    []
  );

  // Sync leaderboard on startup & whenever connectivity restores
  useEffect(() => {
    if (!isOnline) return;
    void syncLeaderboardWithServer();
  }, [isOnline, syncLeaderboardWithServer]);

  const persistSoloOfflineProgress = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const snapshot = eng.exportOfflineSaveState();
    if (snapshot) {
      saveOfflineExpedition(snapshot);
      setSavedExpedition(snapshot);
    }
  }, []);

  // Periodic local auto-save during active solo play + page background/close flush
  useEffect(() => {
    if (screen !== 'playing' || gameMode === 'multiplayer') return;
    const saveTimer = window.setInterval(() => {
      persistSoloOfflineProgress();
    }, 5000);

    const handleVisibility = () => {
      if (document.hidden) persistSoloOfflineProgress();
    };
    const handleUnload = () => {
      persistSoloOfflineProgress();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(saveTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [screen, gameMode, persistSoloOfflineProgress]);

  // Handle Game Screen Transitions
  const handleStartGame = () => {
    sounds.unlockAudio();
    void tryLockLandscapeOrientation();
    setScreen('playing');
    engineRef.current?.setGameMode(gameMode);
    engineRef.current?.setSuitColor(suitColor);
    engineRef.current?.setPlayerNameTag(playerName);
    if (roomId) {
      engineRef.current?.setLiveRoomActive(true);
    }
    engineRef.current?.start();
  };

  const handleContinueSavedExpedition = () => {
    const save = savedExpedition || loadOfflineSave();
    const eng = engineRef.current;
    if (!save || !eng) return;
    sounds.unlockAudio();
    void tryLockLandscapeOrientation();
    setGameMode(save.gameMode);
    setSuitColor(save.suitColor);
    setCompletedLabIds(save.completedLabIds);
    if (save.collectedCrystalIds.length > 0 && roverUpgradesRef.current.totalCrystalsEarned === 0) {
      const seeded = creditRoverCrystals(roverUpgradesRef.current, save.collectedCrystalIds.length);
      roverUpgradesRef.current = seeded;
      setRoverUpgrades(seeded);
    }
    eng.applyEngineUpgrades(roverUpgradesRef.current);
    eng.restoreOfflineSaveState(save);
    setCrystalsList(eng.getCrystalsList());
    setHiddenAreas(eng.getHiddenAreasList());
    setSatelliteRelays(eng.getSatelliteRelaysList());
    setRoverPos({ x: save.roverPos.x, z: save.roverPos.z });
    setScreen('playing');
    showNotification(
      'OFFLINE SAVE RESTORED',
      `Resumed ${save.gameMode.toUpperCase()} expedition (${save.collectedCrystalIds.length}/10 Crystals, ${save.score} XP).`,
      'success'
    );
  };

  const handleSelectMode = (mode: GameMode) => {
    setGameMode(mode);
    engineRef.current?.setGameMode(mode);
  };

  const handleSelectSuit = (color: SuitColor) => {
    setSuitColor(color);
    engineRef.current?.setSuitColor(color);
    mpClientRef.current?.updatePlayerMeta(playerName, color);
    const updatedProfile: LocalLeaderboardProfile = {
      ...leaderboardProfileRef.current,
      suitColor: color,
      pendingSync: leaderboardProfileRef.current.answeredCount > 0,
    };
    leaderboardProfileRef.current = updatedProfile;
    setLeaderboardProfile(updatedProfile);
    saveLocalLeaderboardProfile(updatedProfile);
  };

  const handlePause = useCallback(() => {
    setScreen((prev) => {
      if (prev === 'playing') {
        persistSoloOfflineProgress();
        engineRef.current?.pause();
        return 'paused';
      }
      return prev;
    });
  }, [persistSoloOfflineProgress]);

  const handleResume = useCallback(() => {
    setScreen('playing');
    engineRef.current?.resume();
  }, []);

  const resetUiStateToFreshGame = useCallback(() => {
    setOxygen(100);
    setScore(0);
    setCrystalsCount(0);
    setMissions(INITIAL_MISSIONS);
    setCheckpoints(INITIAL_CHECKPOINTS);
    setActiveCheckpoint(INITIAL_CHECKPOINTS[0]);
    setInteractivePrompt(null);
    setIsDrivingRover(false);
    setRoverHeadlights(true);
    setIsRunning(false);
    setCapturedPhotoUrl(null);
    setIsBountyModalOpen(false);
    setIsHistoryModalOpen(false);
    setIsFriendsModalOpen(false);
    setPlayerPos({ x: 0, z: 0 });
    setPlayerHeading(0);
    setRoverPos({ x: 28, z: -24 });
    setRoverDurability({
      integrity: 100,
      status: 'OPTIMAL',
      terrainStress: 'SMOOTH',
      collisionCount: 0,
      speedMultiplier: 1.0,
    });
    setRoverTelemetry({
      speedKmh: 0,
      gear: 'P',
      boostEnergy: 100,
      boostActive: false,
      lightsOn: true,
      isAirborne: false,
      jumpCost: 20,
      isDrifting: false,
      driftIntensity: 0,
    });
    setIsUnderground(false);
    setCompletedLabIds([]);
    setIsScienceLabOpen(false);
    setActiveSatelliteRelay(null);
    setIsRoverCustomizeOpen(false);
    setIsRoverUpgradeOpen(false);
    setIsAutoPilotOpen(false);
    setAutoPilotState({
      active: false,
      target: null,
      distanceMeters: 0,
      etaSeconds: 0,
      avoidingObstacle: false,
      reversingRecovery: false,
    });
    setStaminaData({
      stamina: 100,
      maxStamina: 100,
      isExhausted: false,
      activityState: 'RECOVERING',
      movementSpeedMps: 0,
      speedMultiplier: 1.0,
    });
    setFlightData({
      energy: 100,
      isGliding: false,
      isAirborne: false,
      isRegenerating: false,
      verticalSpeed: 0,
      airSpeed: 0,
      altitude: 0,
    });
    setActiveTriviaQuestion(null);
    usedTriviaIdsRef.current.clear();
    setTriviaStats({
      answeredCount: 0,
      correctCount: 0,
      streak: 0,
      bestStreak: 0,
      totalXpEarned: 0,
      scanMeters: 0,
      scanThreshold: 32,
    });
    if (engineRef.current) {
      setCrystalsList(engineRef.current.getCrystalsList());
      setHiddenAreas(engineRef.current.getHiddenAreasList());
      setSatelliteRelays(engineRef.current.getSatelliteRelaysList());
    }
  }, []);

  const handleRestart = () => {
    clearOfflineSave();
    setSavedExpedition(null);
    setScreen('playing');
    engineRef.current?.restartGame(true);
    resetUiStateToFreshGame();
  };

  const handleGoHome = useCallback(() => {
    if (isTransitioningHome) return;
    persistSoloOfflineProgress();
    engineRef.current?.pause();
    sounds.stopAtmosphere();
    voiceAssistant.stopAll();
    setIsAudioSettingsOpen(false);
    setIsTransitioningHome(true);

    if (homeTransitionTimerRef.current !== null) {
      window.clearTimeout(homeTransitionTimerRef.current);
    }

    homeTransitionTimerRef.current = window.setTimeout(() => {
      engineRef.current?.returnToMainMenu();
      resetUiStateToFreshGame();
      setToast(null);
      setScreen('title');

      homeTransitionTimerRef.current = window.setTimeout(() => {
        setIsTransitioningHome(false);
        homeTransitionTimerRef.current = null;
      }, 60);
    }, 240);
  }, [isTransitioningHome, persistSoloOfflineProgress, resetUiStateToFreshGame]);

  const handleRespawnAtCheckpoint = () => {
    setScreen('playing');
    engineRef.current?.respawnAtLastCheckpoint();
    setIsDrivingRover(false);
  };

  const handleToggleMute = useCallback(() => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handleUpdateAudioSettings = useCallback((partial: Partial<AudioSettings>) => {
    sounds.unlockAudio();
    sounds.updateSettings(partial);
    if (partial.astroneerSoundtrack !== undefined) {
      engineRef.current?.refreshMusicTrack();
    }
  }, []);

  const handleChangeCameraFov = useCallback((fov: number) => {
    const clamped = saveCameraFov(fov);
    setCameraFov(clamped);
    engineRef.current?.setCameraFov(clamped);
  }, []);

  const handleToggleAstroneerSoundtrack = useCallback(() => {
    sounds.unlockAudio();
    const nextVal = !sounds.getSettings().astroneerSoundtrack;
    sounds.updateSettings({ astroneerSoundtrack: nextVal });
    engineRef.current?.refreshMusicTrack();
    showNotification(
      nextVal ? 'ASTRONEER SOUNDTRACK ON' : 'STANDARD MARS SOUNDTRACK',
      nextVal
        ? 'Playing warm, relaxing cosmic arpeggios while you explore.'
        : 'Switched back to classic Space Adventure theme.',
      'normal'
    );
  }, [showNotification]);

  const handleOpenAudioSettings = useCallback(() => {
    sounds.unlockAudio();
    if (screen === 'playing') {
      engineRef.current?.pause();
    }
    setIsAudioSettingsOpen(true);
  }, [screen]);

  const handleCloseAudioSettings = useCallback(() => {
    setIsAudioSettingsOpen(false);
    if (screen === 'playing') {
      engineRef.current?.resume();
    }
  }, [screen]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    engineRef.current?.setJoystickVector(x, y);
  }, []);

  const handleJump = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);

  const handleToggleGlide = useCallback(() => {
    engineRef.current?.toggleGliding();
  }, []);

  const handleInteract = useCallback(() => {
    engineRef.current?.triggerInteraction();
  }, []);

  const handleToggleSprint = useCallback(() => {
    const running = engineRef.current?.toggleRunning() || false;
    setIsRunning(running);
  }, []);

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCamera();
  }, []);

  const handleRotateCamera = useCallback((deltaYaw: number) => {
    engineRef.current?.rotateCamera(deltaYaw);
  }, []);

  const handleCameraTurnHold = useCallback((dir: -1 | 0 | 1) => {
    engineRef.current?.setCameraTurnHold(dir);
  }, []);

  const handleDriveRover = useCallback(() => {
    const nowDriving = engineRef.current?.toggleRoverDrive() ?? false;
    setIsDrivingRover(nowDriving);
    handleResume();
  }, [handleResume]);

  const handleExitRover = useCallback(() => {
    const nowDriving = engineRef.current?.toggleRoverDrive() ?? false;
    setIsDrivingRover(nowDriving);
  }, []);

  const handleQuizAnswerEvaluated = useCallback(
    (isCorrect: boolean) => {
      const updated = recordLeaderboardAnswer(
        leaderboardProfileRef.current,
        'quiz',
        isCorrect,
        isCorrect ? 10 : 0
      );
      leaderboardProfileRef.current = updated;
      setLeaderboardProfile(updated);
      void syncLeaderboardWithServer(updated);
    },
    [syncLeaderboardWithServer]
  );

  const handleQuizCompleted = (quizScore: number, passed: boolean) => {
    const updated = recordScienceQuizFinish(leaderboardProfileRef.current, quizScore);
    leaderboardProfileRef.current = updated;
    setLeaderboardProfile(updated);
    void syncLeaderboardWithServer(updated);

    engineRef.current?.handleQuizCompleted(quizScore, passed);
    showNotification(
      passed ? `QUIZ FINAL SCORE: ${quizScore}/100` : `QUIZ COMPLETE: ${quizScore}/100`,
      passed
        ? 'Outstanding science score! Preparing Mars Mission completion...'
        : 'Score at least 70 points to earn your Mars Science Academy badge!',
      passed ? 'success' : 'normal'
    );
  };

  const handleRestInBay = () => {
    engineRef.current?.refillOxygen();
    showNotification('ASTRONAUT RESTED', 'Rest pods restored 100% O2 and stamina.', 'success');
  };

  const handleTriggerStorm = useCallback(() => {
    engineRef.current?.triggerDustStorm();
  }, []);

  const handleCycleSolTime = useCallback(() => {
    engineRef.current?.cycleTimeOfSol();
  }, []);

  const handleToggleRoverHeadlights = useCallback(() => {
    engineRef.current?.toggleRoverHeadlights();
  }, []);

  const handleRepairRover = useCallback(() => {
    engineRef.current?.repairRover();
  }, []);

  const handleRoverPedalChange = useCallback((fwd: number, turn: number) => {
    engineRef.current?.setRoverPedals(fwd, turn);
  }, []);

  const handleRoverBoostToggle = useCallback((active: boolean) => {
    engineRef.current?.setRoverBoost(active);
  }, []);

  const handleRoverJump = useCallback(() => {
    engineRef.current?.triggerRoverJump();
  }, []);

  const handleRoverHorn = useCallback(() => {
    engineRef.current?.triggerRoverHorn();
  }, []);

  const handleOpenScienceLab = useCallback(() => {
    if (screen === 'playing') {
      engineRef.current?.pause();
    }
    setIsScienceLabOpen(true);
  }, [screen]);

  const handleCloseScienceLab = useCallback(() => {
    setIsScienceLabOpen(false);
    if (screen === 'playing') {
      engineRef.current?.resume();
    }
  }, [screen]);

  const handleCompleteLabExperiment = useCallback((experimentId: string, xpReward: number) => {
    setCompletedLabIds((prev) => (prev.includes(experimentId) ? prev : [...prev, experimentId]));
    engineRef.current?.recordLabExperimentComplete(experimentId, xpReward);
  }, []);

  const handleAlignSatelliteSuccess = useCallback((relayId: string) => {
    engineRef.current?.completeSatelliteRelayAlignment(relayId);
    if (engineRef.current) {
      setSatelliteRelays(engineRef.current.getSatelliteRelaysList());
    }
    setActiveSatelliteRelay((prev) => (prev && prev.id === relayId ? { ...prev, aligned: true } : prev));
  }, []);

  const handleCloseSatelliteModal = useCallback(() => {
    setActiveSatelliteRelay(null);
    if (screen === 'playing') {
      engineRef.current?.resume();
    }
  }, [screen]);

  const handleOpenRoverCustomize = useCallback(() => {
    engineRef.current?.pause();
    if (screen === 'roverInfo') {
      setScreen('playing');
    }
    setIsRoverCustomizeOpen(true);
  }, [screen]);

  const handleCloseRoverCustomize = useCallback(() => {
    setIsRoverCustomizeOpen(false);
    engineRef.current?.resume();
  }, []);

  const handleChangeRoverCustomization = useCallback((next: RoverCustomization) => {
    setRoverCustomization(next);
    saveRoverCustomization(next);
    engineRef.current?.applyRoverCustomization(next);
  }, []);

  const handleOpenRoverUpgrades = useCallback(() => {
    engineRef.current?.pause();
    if (screen === 'roverInfo') {
      setScreen('playing');
    }
    setIsRoverUpgradeOpen(true);
  }, [screen]);

  const handleCloseRoverUpgrades = useCallback(() => {
    setIsRoverUpgradeOpen(false);
    engineRef.current?.resume();
  }, []);

  const handlePurchaseRoverUpgrade = useCallback(
    (track: RoverUpgradeTrack) => {
      const result = purchaseRoverUpgrade(roverUpgradesRef.current, track);
      if (!result.success) {
        showNotification(
          'INSUFFICIENT CRYSTALS',
          `Need ${result.cost} Energy Crystals for the next upgrade tier!`,
          'warning'
        );
        return;
      }
      roverUpgradesRef.current = result.updated;
      setRoverUpgrades(result.updated);
      engineRef.current?.applyEngineUpgrades(result.updated);
      sounds.playMissionComplete();
      showNotification(
        'ROVER ENGINE UPGRADED!',
        track === 'topSpeedLevel'
          ? `Ion Drive Turbines upgraded to Lv ${result.newLevel}! Top & boost speed increased.`
          : `RTG Capacitor Array upgraded to Lv ${result.newLevel}! Boost recovery rate increased.`,
        'success'
      );
    },
    [showNotification]
  );

  const handleOpenAutoPilot = useCallback(() => {
    engineRef.current?.pause();
    if (screen === 'roverInfo') {
      setScreen('playing');
    }
    setIsAutoPilotOpen(true);
  }, [screen]);

  const handleCloseAutoPilot = useCallback(() => {
    setIsAutoPilotOpen(false);
    engineRef.current?.resume();
  }, []);

  const handleStartAutoPilot = useCallback((waypoint: AutoPilotWaypoint) => {
    setIsAutoPilotOpen(false);
    engineRef.current?.resume();
    engineRef.current?.startRoverAutoPilot(waypoint);
  }, []);

  const handleCancelAutoPilot = useCallback(() => {
    engineRef.current?.cancelRoverAutoPilot('user');
  }, []);

  const handleOpenFriendsLobby = useCallback(() => {
    setIsFriendsModalOpen(true);
  }, []);

  const handleCloseFriendsLobby = useCallback(() => {
    setIsFriendsModalOpen(false);
  }, []);

  const handleDismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handlePingCrew = useCallback(() => {
    handleSendPing('Gather at my location!');
  }, [handleSendPing]);

  const handleRefillO2Modal = useCallback(() => {
    engineRef.current?.refillOxygen();
  }, []);

  const handleRefreshLeaderboard = useCallback(() => {
    void syncLeaderboardWithServer();
  }, [syncLeaderboardWithServer]);

  const hasAffordableRoverUpgrade = useMemo(
    () => hasAffordableUpgrade(roverUpgrades),
    [roverUpgrades]
  );

  const dailyBountiesCompleted = useMemo(
    () => dailyBounties.bounties.filter((b) => b.completed).length,
    [dailyBounties]
  );

  const activeBountyModalTarget = useMemo(
    () => dailyBounties.bounties.find((b) => !b.completed && b.targetLocation)?.targetLocation ?? null,
    [dailyBounties]
  );

  const completedMissionsCount = useMemo(
    () => missions.filter((m) => m.completed).length,
    [missions]
  );

  const handleEnterPhotoMode = useCallback(() => {
    if (!engineRef.current) return;
    const dataUrl = engineRef.current.captureScreenshot();
    if (!dataUrl) {
      showNotification('PHOTO CAPTURE FAILED', 'Unable to read 3D canvas frame.', 'warning');
      return;
    }
    sounds.playCameraShutter();
    setPhotoFlash(true);
    setTimeout(() => setPhotoFlash(false), 180);
    engineRef.current.pause();
    setCapturedPhotoUrl(dataUrl);
    setScreen('photo');
  }, [showNotification]);

  const handleClosePhotoMode = () => {
    setCapturedPhotoUrl(null);
    setScreen('playing');
    engineRef.current?.resume();
  };

  const handlePhotoDownloadSuccess = (filename: string) => {
    showNotification('PHOTO SAVED!', `Exported ${filename} to your device.`, 'success');
  };

  const handleOpenDailyBounties = useCallback(() => {
    if (screen === 'playing') {
      engineRef.current?.pause();
    }
    setIsBountyModalOpen(true);
  }, [screen]);

  const handleCloseDailyBounties = useCallback(() => {
    setIsBountyModalOpen(false);
    if (screen === 'playing') {
      engineRef.current?.resume();
    }
  }, [screen]);

  const handleTriviaAnswerSubmit = useCallback(
    (_question: TriviaQuestion, isCorrect: boolean, bonusAwarded: number) => {
      if (isCorrect && bonusAwarded > 0) {
        engineRef.current?.addScore(bonusAwarded);
        showNotification(
          'TRIVIA BONUS XP!',
          `Correct Martian science analysis! +${bonusAwarded} Bonus XP added.`,
          'success'
        );
      }
      const updatedProfile = recordLeaderboardAnswer(
        leaderboardProfileRef.current,
        'trivia',
        isCorrect,
        bonusAwarded
      );
      leaderboardProfileRef.current = updatedProfile;
      setLeaderboardProfile(updatedProfile);
      void syncLeaderboardWithServer(updatedProfile);

      setTriviaStats((prev) => {
        const nextStreak = isCorrect ? prev.streak + 1 : 0;
        return {
          ...prev,
          answeredCount: prev.answeredCount + 1,
          correctCount: prev.correctCount + (isCorrect ? 1 : 0),
          streak: nextStreak,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          totalXpEarned: prev.totalXpEarned + bonusAwarded,
        };
      });
    },
    [showNotification, syncLeaderboardWithServer]
  );

  const handleOpenLeaderboard = useCallback(() => {
    if (screen === 'playing' && !activeTriviaQuestion) {
      engineRef.current?.pause();
    }
    setIsLeaderboardOpen(true);
    void syncLeaderboardWithServer();
  }, [screen, activeTriviaQuestion, syncLeaderboardWithServer]);

  const handleCloseLeaderboard = useCallback(() => {
    setIsLeaderboardOpen(false);
    if (screen === 'playing' && !activeTriviaQuestion) {
      engineRef.current?.resume();
    }
  }, [screen, activeTriviaQuestion]);

  const handleCloseTriviaEncounter = useCallback(() => {
    setActiveTriviaQuestion(null);
    if (screen === 'playing') {
      engineRef.current?.resume();
    }
  }, [screen]);

  const handleTriggerTriviaScanNow = useCallback(() => {
    engineRef.current?.triggerTriviaScanNow();
  }, []);

  const handleOpenMarsHistory = useCallback(() => {
    if (screen === 'playing') {
      engineRef.current?.pause();
    }
    setIsHistoryModalOpen(true);
  }, [screen]);

  const handleCloseMarsHistory = useCallback(() => {
    setIsHistoryModalOpen(false);
    if (screen === 'playing') {
      engineRef.current?.resume();
    }
  }, [screen]);

  const handleResetHistoryCodex = useCallback(() => {
    discoveredTabletIdsRef.current = [];
    setDiscoveredTabletIds([]);
    saveDiscoveredTabletIds([]);
    setLastDiscoveredTabletId(null);
    engineRef.current?.syncDiscoveredTablets([]);
    if (engineRef.current) {
      setTabletsList(engineRef.current.getTabletsList());
    }
    showNotification(
      'CODEX RESET',
      'All 8 hidden Mars History tablets are ready to be discovered again!',
      'normal'
    );
  }, [showNotification]);

  // Keyboard shortcuts 'P' (Photo Mode), 'B' (Daily Bounties), 'H' (Mars History), and 'K' (Leaderboard) during gameplay
  useEffect(() => {
    if (screen !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || isFriendsModalOpen) return;
      if (e.code === 'KeyP' && !e.repeat && !isBountyModalOpen && !isHistoryModalOpen && !isLeaderboardOpen) {
        handleEnterPhotoMode();
      }
      if (e.code === 'KeyB' && !e.repeat && !isHistoryModalOpen && !isLeaderboardOpen) {
        if (isBountyModalOpen) {
          handleCloseDailyBounties();
        } else {
          handleOpenDailyBounties();
        }
      }
      if (e.code === 'KeyH' && !e.repeat && !isBountyModalOpen && !isLeaderboardOpen) {
        if (isHistoryModalOpen) {
          handleCloseMarsHistory();
        } else {
          handleOpenMarsHistory();
        }
      }
      if (e.code === 'KeyK' && !e.repeat && !isBountyModalOpen && !isHistoryModalOpen) {
        if (isLeaderboardOpen) {
          handleCloseLeaderboard();
        } else {
          handleOpenLeaderboard();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    handleEnterPhotoMode,
    isFriendsModalOpen,
    isBountyModalOpen,
    isHistoryModalOpen,
    isLeaderboardOpen,
    handleOpenDailyBounties,
    handleCloseDailyBounties,
    handleOpenMarsHistory,
    handleCloseMarsHistory,
    handleOpenLeaderboard,
    handleCloseLeaderboard,
  ]);

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-[#070a12] flex items-center justify-center overflow-hidden select-none touch-none">
      {/* Responsive 16:9 Horizontal Landscape Game Stage */}
      <div className="relative aspect-video w-[min(100vw,calc(100dvh*16/9))] h-[min(100dvh,calc(100vw*9/16))] overflow-hidden bg-[#120908] shadow-[0_0_70px_rgba(0,0,0,0.9)] select-none touch-none">
        {/* 3D WebGL Canvas isolated mount container */}
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Offline Connectivity Banner */}
        <OfflineIndicator />

        {/* Notifications Toast */}
        <NotificationToast toast={toast} onDismiss={handleDismissToast} />

      {/* Title Screen Modal */}
      {screen === 'title' && (
        <TitleScreen
          selectedMode={gameMode}
          onSelectMode={handleSelectMode}
          selectedSuit={suitColor}
          onSelectSuit={handleSelectSuit}
          playerName={playerName}
          onChangePlayerName={handleChangePlayerName}
          roomId={roomId}
          remoteCrewCount={remotePlayers.length}
          onOpenFriendsLobby={handleOpenFriendsLobby}
          onOpenDailyBounties={handleOpenDailyBounties}
          dailyBountiesCompleted={dailyBountiesCompleted}
          dailyBountiesTotal={dailyBounties.bounties.length}
          onOpenMarsHistory={handleOpenMarsHistory}
          discoveredTabletsCount={discoveredTabletIds.length}
          totalTabletsCount={INITIAL_HISTORY_TABLETS.length}
          onOpenLeaderboard={handleOpenLeaderboard}
          careerCorrectCount={leaderboardProfile.correctCount}
          careerRank={careerRank}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenAudioSettings={handleOpenAudioSettings}
          savedExpedition={savedExpedition}
          onContinueSaved={handleContinueSavedExpedition}
          onStart={handleStartGame}
        />
      )}

      {/* Main HUD overlay during gameplay */}
      {screen === 'playing' && (
        <HUD
          gameMode={gameMode}
          oxygen={oxygen}
          score={score}
          crystalsCount={crystalsCount}
          currentMission={currentMission}
          activeCheckpoint={activeCheckpoint}
          interactivePrompt={interactivePrompt}
          isDrivingRover={isDrivingRover}
          roverHeadlights={roverHeadlights}
          roverDurability={roverDurability}
          roverTelemetry={roverTelemetry}
          isRunning={isRunning}
          isMuted={isMuted}
          astroneerSoundtrack={audioSettings.astroneerSoundtrack}
          isUnderground={isUnderground}
          hiddenAreas={hiddenAreas}
          satelliteRelays={satelliteRelays}
          playerPos={playerPos}
          playerHeading={playerHeading}
          spaceStationPos={SPACE_STATION_POS}
          roverPos={roverPos}
          activeObjective={activeObjective}
          checkpoints={checkpoints}
          crystals={crystalsList}
          weather={weather}
          dayNight={dayNight}
          flight={flightData}
          wind={windData}
          stamina={staminaData}
          onToggleMute={handleToggleMute}
          onToggleAstroneerSoundtrack={handleToggleAstroneerSoundtrack}
          onOpenAudioSettings={handleOpenAudioSettings}
          onOpenScienceLab={handleOpenScienceLab}
          onPause={handlePause}
          onJump={handleJump}
          onToggleGlide={handleToggleGlide}
          onInteract={handleInteract}
          onToggleSprint={handleToggleSprint}
          onResetCamera={handleResetCamera}
          onRotateCamera={handleRotateCamera}
          onCameraTurnHold={handleCameraTurnHold}
          onExitRover={handleExitRover}
          onRepairRover={handleRepairRover}
          onToggleRoverHeadlights={handleToggleRoverHeadlights}
          onOpenRoverCustomize={handleOpenRoverCustomize}
          onOpenRoverUpgrades={handleOpenRoverUpgrades}
          roverUpgrades={roverUpgrades}
          hasAffordableRoverUpgrade={hasAffordableRoverUpgrade}
          roverNameTag={roverCustomization.roverNameTag}
          autoPilotState={autoPilotState}
          onOpenAutoPilot={handleOpenAutoPilot}
          onCancelAutoPilot={handleCancelAutoPilot}
          onRoverPedalChange={handleRoverPedalChange}
          onRoverBoostToggle={handleRoverBoostToggle}
          onRoverJump={handleRoverJump}
          onRoverHorn={handleRoverHorn}
          onJoystickMove={handleJoystickMove}
          onTriggerStorm={handleTriggerStorm}
          onCycleSolTime={handleCycleSolTime}
          onPhotoMode={handleEnterPhotoMode}
          roomId={roomId}
          remoteCrew={remoteCrewForMap}
          chatMessages={chatMessages}
          onOpenFriendsLobby={handleOpenFriendsLobby}
          onSendChat={handleSendChat}
          onSendPing={handleSendPing}
          dailyBounties={dailyBounties}
          onOpenDailyBounties={handleOpenDailyBounties}
          triviaStats={triviaStats}
          onTriggerTriviaScan={handleTriggerTriviaScanNow}
          discoveredTabletsCount={discoveredTabletIds.length}
          totalTabletsCount={INITIAL_HISTORY_TABLETS.length}
          tabletsList={tabletsList}
          onOpenMarsHistory={handleOpenMarsHistory}
          onOpenLeaderboard={handleOpenLeaderboard}
          careerCorrectCount={leaderboardProfile.correctCount}
          careerRank={careerRank}
        />
      )}

        {/* Camera Shutter Flash Effect */}
        {photoFlash && (
          <div className="absolute inset-0 z-40 bg-white/75 pointer-events-none transition-opacity duration-150" />
        )}

      {/* Friends Multiplayer Lobby & Invite Modal */}
      {isFriendsModalOpen && (
        <FriendsModal
          isOpen={isFriendsModalOpen}
          roomId={roomId}
          connectionStatus={connectionStatus}
          playerName={playerName}
          suitColor={suitColor}
          localPos={playerPos}
          remotePlayers={remotePlayers}
          onChangePlayerName={handleChangePlayerName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onPingCrew={handlePingCrew}
          onClose={handleCloseFriendsLobby}
          onNotify={showNotification}
        />
      )}

      {/* Daily Mars Bounties Modal */}
      {isBountyModalOpen && (
        <DailyBountyModal
          isOpen={isBountyModalOpen}
          board={dailyBounties}
          playerPos={playerPos}
          onClose={handleCloseDailyBounties}
        />
      )}

      {/* Trivia Expedition Random Field Encounter Modal */}
      {activeTriviaQuestion !== null && (
        <TriviaExpeditionModal
          question={activeTriviaQuestion}
          stats={triviaStats}
          onSubmitAnswer={handleTriviaAnswerSubmit}
          onContinue={handleCloseTriviaEncounter}
          onOpenLeaderboard={handleOpenLeaderboard}
        />
      )}

      {/* Mars History & Historian Badges Codex Modal */}
      {isHistoryModalOpen && (
        <MarsHistoryModal
          isOpen={isHistoryModalOpen}
          discoveredIds={discoveredTabletIds}
          playerPos={playerPos}
          initialSelectedId={lastDiscoveredTabletId}
          onResetCodex={handleResetHistoryCodex}
          onClose={handleCloseMarsHistory}
        />
      )}

      {/* Safe Mars Science Laboratory Experiments Modal */}
      {isScienceLabOpen && (
        <ScienceLabModal
          isOpen={isScienceLabOpen}
          completedIds={completedLabIds}
          onCompleteExperiment={handleCompleteLabExperiment}
          onClose={handleCloseScienceLab}
        />
      )}

      {/* Satellite Communication Relay Alignment Modal */}
      {activeSatelliteRelay !== null && (
        <SatelliteMissionModal
          relay={activeSatelliteRelay}
          onAlignSuccess={handleAlignSatelliteSuccess}
          onClose={handleCloseSatelliteModal}
        />
      )}

      {/* Curiosity Rover Communication Dialogue */}
      {screen === 'roverInfo' && (
        <RoverCommModal
          isOpen
          durability={roverDurability}
          roverName={roverCustomization.roverNameTag}
          availableCrystals={roverUpgrades.availableCrystals}
          hasAffordableUpgrade={hasAffordableRoverUpgrade}
          onClose={handleResume}
          onDriveRover={handleDriveRover}
          onRefillO2={handleRefillO2Modal}
          onRepairRover={handleRepairRover}
          onCustomizeRover={handleOpenRoverCustomize}
          onOpenAutoPilot={handleOpenAutoPilot}
          onOpenUpgrades={handleOpenRoverUpgrades}
        />
      )}

      {/* Mars Rover Engine Upgrades Workshop Modal */}
      {isRoverUpgradeOpen && (
        <RoverUpgradeModal
          isOpen={isRoverUpgradeOpen}
          upgrades={roverUpgrades}
          roverName={roverCustomization.roverNameTag}
          onUpgrade={handlePurchaseRoverUpgrade}
          onClose={handleCloseRoverUpgrades}
        />
      )}

      {/* Mars Rover Customization Studio Modal */}
      {isRoverCustomizeOpen && (
        <RoverCustomizeModal
          isOpen={isRoverCustomizeOpen}
          customization={roverCustomization}
          onChangeCustomization={handleChangeRoverCustomization}
          onClose={handleCloseRoverCustomize}
        />
      )}

      {/* Mars Rover Auto-Pilot Waypoint Map Modal */}
      {isAutoPilotOpen && (
        <RoverAutoPilotModal
          isOpen={isAutoPilotOpen}
          autopilot={autoPilotState}
          roverPos={roverPos}
          spaceStationPos={SPACE_STATION_POS}
          activeObjective={activeObjective}
          bountyTarget={activeBountyModalTarget}
          checkpoints={checkpoints}
          crystals={crystalsList}
          hiddenAreas={hiddenAreas}
          satelliteRelays={satelliteRelays}
          roverSpeedMultiplier={roverDurability.speedMultiplier}
          onStartAutoPilot={handleStartAutoPilot}
          onCancelAutoPilot={handleCancelAutoPilot}
          onClose={handleCloseAutoPilot}
        />
      )}

      {/* Research Station Database & Rest Bay Modal */}
      {screen === 'baseInfo' && (
        <BaseInfoModal
          isOpen
          activeSuitColor={suitColor}
          onSelectSuitColor={handleSelectSuit}
          onRestInBay={handleRestInBay}
          onClose={handleResume}
        />
      )}

      {/* Mars Science Quiz Modal */}
      {screen === 'quiz' && (
        <QuizModal
          isOpen
          onClose={handleResume}
          onQuizComplete={handleQuizCompleted}
          onAnswerEvaluated={handleQuizAnswerEvaluated}
          onOpenLeaderboard={handleOpenLeaderboard}
        />
      )}

      {/* Global Explorer Correct-Answers Leaderboard Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          isOpen={isLeaderboardOpen}
          entries={leaderboardEntries}
          localProfile={leaderboardProfile}
          isLoading={isLeaderboardLoading}
          isOnline={isOnline}
          onRefresh={handleRefreshLeaderboard}
          onClose={handleCloseLeaderboard}
        />
      )}

      {/* Out of Oxygen Game Over Modal */}
      {screen === 'gameover' && (
        <GameOverModal
          isOpen
          score={score}
          crystalsCount={crystalsCount}
          activeCheckpoint={activeCheckpoint}
          onRespawnCheckpoint={handleRespawnAtCheckpoint}
          onRestart={handleRestart}
          onGoHome={handleGoHome}
        />
      )}

      {/* Expedition Victory Modal */}
      {screen === 'victory' && (
        <VictoryModal
          isOpen
          score={score}
          crystalsCount={crystalsCount}
          completedMissionsCount={completedMissionsCount}
          totalMissionsCount={missions.length}
          onContinueExploring={handleResume}
          onRestart={handleRestart}
        />
      )}

      {/* Photo Mode Preview & PNG Export Modal */}
      {screen === 'photo' && (
        <PhotoModeModal
          isOpen
          rawDataUrl={capturedPhotoUrl}
          playerPos={playerPos}
          activeCheckpointName={activeCheckpoint.name}
          crystalsCount={crystalsCount}
          dayNight={dayNight}
          weather={weather}
          isDrivingRover={isDrivingRover}
          onClose={handleClosePhotoMode}
          onDownloadSuccess={handlePhotoDownloadSuccess}
        />
      )}

      {/* Pause Menu Modal */}
      {screen === 'paused' && (
        <PauseModal
          isOpen
          gameMode={gameMode}
          onSelectMode={handleSelectMode}
          activeSuit={suitColor}
          onSelectSuit={handleSelectSuit}
          activeCheckpoint={activeCheckpoint}
          onRespawnAtCheckpoint={handleRespawnAtCheckpoint}
          missions={missions}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenAudioSettings={handleOpenAudioSettings}
          onResume={handleResume}
          onRestart={handleRestart}
          onGoHome={handleGoHome}
        />
      )}

      {/* Audio, AI Assistant Voice & Camera Settings Modal */}
      {isAudioSettingsOpen && (
        <SoundSettingsModal
          isOpen={isAudioSettingsOpen}
          settings={audioSettings}
          cameraFov={cameraFov}
          onChangeCameraFov={handleChangeCameraFov}
          onUpdateSettings={handleUpdateAudioSettings}
          onClose={handleCloseAudioSettings}
        />
      )}

        {/* Smooth Screen Transition Veil when Returning to Home */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-[70] bg-[#120908] transition-opacity duration-300 ease-in-out ${
            isTransitioningHome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />
      </div>

      {/* Clear Portrait Rotation Prompt when Mobile / Tablet is Held Vertically */}
      <OrientationGuard />
    </div>
  );
}
