import React, { useEffect, useRef, useState } from 'react';
import {
  CheckpointData,
  GameMode,
  GAME_MODES,
  InteractivePrompt,
  Mission,
  WeatherData,
  DayNightData,
  FlightData,
  WindData,
  DailyBountyBoardState,
  TriviaStats,
  RoverDurabilityData,
  RoverDriveTelemetry,
  RoverEngineUpgrades,
  HiddenAreaData,
  SatelliteRelayData,
  StaminaData,
  AutoPilotState,
} from '../types/game';
import { ChatMessage } from '../types/multiplayer';
import { VirtualJoystick } from './VirtualJoystick';
import { MultiplayerFeed } from './MultiplayerFeed';
import { MiniMap } from './MiniMap';
import { WeatherPredictionWidget } from './WeatherPredictionWidget';
import { StaminaBar } from './StaminaBar';
import { BountyCountdownText } from './BountyCountdownText';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant, VoiceSpeakingState } from '../audio/VoiceAssistant';

interface HUDProps {
  gameMode: GameMode;
  oxygen: number;
  score: number;
  crystalsCount: number;
  currentMission: Mission | null;
  activeCheckpoint: CheckpointData;
  interactivePrompt: InteractivePrompt | null;
  isDrivingRover: boolean;
  roverHeadlights?: boolean;
  roverDurability: RoverDurabilityData;
  roverTelemetry: RoverDriveTelemetry;
  isRunning: boolean;
  isMuted: boolean;
  astroneerSoundtrack: boolean;
  isUnderground: boolean;
  hiddenAreas: HiddenAreaData[];
  satelliteRelays: SatelliteRelayData[];
  playerPos: { x: number; z: number };
  playerHeading: number;
  spaceStationPos: { x: number; z: number };
  roverPos: { x: number; z: number };
  activeObjective: { x: number; z: number; title: string } | null;
  checkpoints: CheckpointData[];
  crystals: { id: number; x: number; z: number; collected: boolean }[];
  weather: WeatherData;
  dayNight: DayNightData;
  flight: FlightData;
  wind: WindData;
  stamina: StaminaData;
  onToggleMute: () => void;
  onToggleAstroneerSoundtrack: () => void;
  onOpenAudioSettings: () => void;
  onOpenScienceLab: () => void;
  onPause: () => void;
  onJump: () => void;
  onToggleGlide: () => void;
  onInteract: () => void;
  onToggleSprint: () => void;
  onResetCamera: () => void;
  onRotateCamera?: (deltaYaw: number) => void;
  onCameraTurnHold?: (dir: -1 | 0 | 1) => void;
  onExitRover: () => void;
  onRepairRover: () => void;
  onToggleRoverHeadlights?: () => void;
  onOpenRoverCustomize?: () => void;
  onOpenRoverUpgrades?: () => void;
  roverUpgrades?: RoverEngineUpgrades;
  hasAffordableRoverUpgrade?: boolean;
  roverNameTag?: string;
  autoPilotState?: AutoPilotState;
  onOpenAutoPilot?: () => void;
  onCancelAutoPilot?: () => void;
  onRoverPedalChange: (fwd: number, turn: number) => void;
  onRoverBoostToggle: (active: boolean) => void;
  onRoverJump: () => void;
  onRoverHorn: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onTriggerStorm: () => void;
  onCycleSolTime: () => void;
  onPhotoMode: () => void;
  roomId?: string | null;
  remoteCrew?: { id: string; name: string; x: number; z: number; color: string }[];
  chatMessages?: ChatMessage[];
  onOpenFriendsLobby: () => void;
  onSendChat?: (text: string) => void;
  onSendPing?: (label: string) => void;
  dailyBounties: DailyBountyBoardState;
  bountyResetCountdown?: string;
  onOpenDailyBounties: () => void;
  triviaStats: TriviaStats;
  onTriggerTriviaScan: () => void;
  discoveredTabletsCount: number;
  totalTabletsCount: number;
  tabletsList: { id: string; x: number; z: number; discovered: boolean }[];
  onOpenMarsHistory: () => void;
  onOpenLeaderboard?: () => void;
  careerCorrectCount?: number;
  careerRank?: number | null;
}

export const HUD: React.FC<HUDProps> = React.memo(({
  gameMode,
  oxygen,
  score,
  crystalsCount,
  currentMission,
  activeCheckpoint,
  interactivePrompt,
  isDrivingRover,
  roverHeadlights = true,
  roverDurability,
  roverTelemetry,
  isRunning,
  isMuted,
  astroneerSoundtrack,
  isUnderground,
  hiddenAreas,
  satelliteRelays,
  playerPos,
  playerHeading,
  spaceStationPos,
  roverPos,
  activeObjective,
  checkpoints,
  crystals,
  weather,
  dayNight,
  flight,
  wind,
  stamina,
  onToggleMute,
  onToggleAstroneerSoundtrack,
  onOpenAudioSettings,
  onOpenScienceLab,
  onPause,
  onJump,
  onToggleGlide,
  onInteract,
  onToggleSprint,
  onResetCamera,
  onRotateCamera,
  onCameraTurnHold,
  onExitRover,
  onRepairRover,
  onToggleRoverHeadlights,
  onOpenRoverCustomize,
  onOpenRoverUpgrades,
  roverUpgrades,
  hasAffordableRoverUpgrade = false,
  roverNameTag = 'CURIOSITY ROVER',
  autoPilotState,
  onOpenAutoPilot,
  onCancelAutoPilot,
  onRoverPedalChange,
  onRoverBoostToggle,
  onRoverJump,
  onRoverHorn,
  onJoystickMove,
  onTriggerStorm,
  onCycleSolTime,
  onPhotoMode,
  roomId = null,
  remoteCrew = [],
  chatMessages = [],
  onOpenFriendsLobby,
  onSendChat,
  onSendPing,
  dailyBounties,
  bountyResetCountdown,
  onOpenDailyBounties,
  triviaStats,
  onTriggerTriviaScan,
  discoveredTabletsCount,
  totalTabletsCount,
  tabletsList,
  onOpenMarsHistory,
  onOpenLeaderboard,
  careerCorrectCount = 0,
  careerRank = null,
}) => {
  const [isMissionCollapsed, setIsMissionCollapsed] = useState(false);
  const [voiceSpeakingState, setVoiceSpeakingState] = useState<VoiceSpeakingState>(() =>
    voiceAssistant.getSpeakingState()
  );
  const pedalStateRef = useRef({ fwd: 0, turn: 0 });
  const camHoldStartRef = useRef<number>(0);

  useEffect(() => {
    return voiceAssistant.subscribeSpeaking(setVoiceSpeakingState);
  }, []);

  const updateRoverPedal = (partial: { fwd?: number; turn?: number }) => {
    const next = {
      fwd: partial.fwd !== undefined ? partial.fwd : pedalStateRef.current.fwd,
      turn: partial.turn !== undefined ? partial.turn : pedalStateRef.current.turn,
    };
    pedalStateRef.current = next;
    onRoverPedalChange(next.fwd, next.turn);
  };

  const isInfiniteO2 = gameMode === 'exploration' || gameMode === 'trivia';
  const isO2Critical = oxygen <= 20 && !isInfiniteO2;
  const isO2Warning = oxygen <= 35 && oxygen > 20 && !isInfiniteO2;
  const roverIntegrityPct = Math.max(0, Math.min(100, roverDurability.integrity));
  const isRoverDamageCritical = isDrivingRover && roverIntegrityPct < 25;
  const modeInfo = GAME_MODES.find((m) => m.id === gameMode) || GAME_MODES[0];

  const bountiesCompleted = dailyBounties.bounties.filter((b) => b.completed).length;
  const activeLocationBounty = dailyBounties.bounties.find(
    (b) => b.category === 'reach_location' && !b.completed && b.targetLocation
  );
  const bountyRadarTarget = activeLocationBounty?.targetLocation
    ? {
        x: activeLocationBounty.targetLocation.x,
        z: activeLocationBounty.targetLocation.z,
        label: activeLocationBounty.targetLocation.label,
      }
    : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2 [@media(min-height:520px)]:p-3 sm:p-4 z-20 overflow-hidden">
      {/* --- ROVER CRITICAL DAMAGE SCREEN EDGE PULSE (<25% INTEGRITY) --- */}
      {isRoverDamageCritical && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0 border-[3px] border-red-500/75 shadow-[inset_0_0_85px_18px_rgba(239,68,68,0.55)] animate-rover-damage-pulse"
        />
      )}

      {/* --- TOP CLUSTER (Title & Smaller Mission beside top-left; Combined Vitals + Cam below them beside MiniMap top-right) --- */}
      <div className="relative z-10 flex items-start justify-between gap-2 w-full">
        {/* Top-Left: Status Badges + Smaller Mission Card Beside Them */}
        <div className="flex flex-row items-start gap-1.5 min-w-0 pointer-events-none">
          {/* Compact Title, Mode & World Badges Column */}
          <div className="flex flex-col gap-1 max-w-[166px] sm:max-w-[205px] min-w-0 pointer-events-none">
            <div className="flex flex-wrap items-center gap-1 self-start pointer-events-auto">
              <div className="inline-flex items-center gap-1 bg-slate-950/85 border border-amber-600/70 px-2 py-0.5 rounded-lg shadow-md backdrop-blur-none">
                <span className="text-sm leading-none">🪐</span>
                <div className="font-game font-bold text-[10px] sm:text-xs text-amber-400 leading-tight tracking-wide whitespace-nowrap">
                  MARS SURVIVAL
                </div>
              </div>

              {/* Mode Pill */}
              <div className="inline-flex items-center gap-0.5 bg-slate-900/85 border border-slate-700 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold text-slate-300 shadow">
                <span>{modeInfo.icon}</span>
                <span className="hidden lg:inline">{modeInfo.name}</span>
              </div>

              {/* Checkpoint Pill */}
              <div className="hidden [@media(min-height:520px)]:inline-flex items-center gap-0.5 bg-slate-900/85 border border-emerald-600/70 px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-emerald-300 shadow">
                <span>📍</span>
                <span className="truncate max-w-[78px] sm:max-w-[100px]">{activeCheckpoint.name}</span>
              </div>

              {/* Sol Time Clock Badge */}
              <button
                onClick={() => {
                  sounds.playClick();
                  onCycleSolTime();
                }}
                data-interactive-ui="true"
                title="Click to advance Martian Sol Time (Day → Sunset → Night → Dawn)"
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold shadow transition-colors active:scale-95 ${
                  dayNight.phase === 'night'
                    ? 'bg-indigo-950/90 border border-indigo-500/70 text-indigo-200'
                    : dayNight.phase === 'dusk'
                    ? 'bg-amber-950/90 border border-orange-500/70 text-orange-200'
                    : dayNight.phase === 'dawn'
                    ? 'bg-rose-950/90 border border-rose-500/70 text-rose-200'
                    : 'bg-slate-900/90 border border-amber-600/70 text-amber-300'
                }`}
              >
                <span>
                  {dayNight.phase === 'night'
                    ? '🌙'
                    : dayNight.phase === 'dusk'
                    ? '🌅'
                    : dayNight.phase === 'dawn'
                    ? '🌄'
                    : '☀️'}
                </span>
                <span className="font-mono-numbers font-bold">
                  {dayNight.timeFormatted}
                </span>
              </button>

              {/* Dynamic Weather Pill */}
              <div
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold shadow transition-colors ${
                  weather.type === 'storm'
                    ? 'bg-rose-950/90 border border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : weather.type === 'warning'
                    ? 'bg-amber-950/90 border border-amber-500 text-amber-200'
                    : weather.type === 'clearing'
                    ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-200'
                    : 'bg-slate-900/85 border border-slate-700 text-slate-300'
                }`}
              >
                <span>
                  {weather.type === 'storm'
                    ? '🌪️'
                    : weather.type === 'warning'
                    ? '⚠️'
                    : weather.type === 'clearing'
                    ? '🌤️'
                    : '☀️'}
                </span>
                <span>
                  {weather.type === 'storm'
                    ? `STORM ${weather.visibilityMeters}m`
                    : weather.type === 'warning'
                    ? `${weather.timeRemaining}s`
                    : weather.type === 'clearing'
                    ? 'CLEAR'
                    : `${weather.visibilityMeters}m`}
                </span>
              </div>

              {/* Daily Bounties Pill Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenDailyBounties();
                }}
                data-interactive-ui="true"
                title="View Daily Mars Bounties & Reset Timer (Key: B)"
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold shadow border transition-colors active:scale-95 ${
                  bountiesCompleted === dailyBounties.bounties.length
                    ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-400 text-emerald-200'
                    : 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/80 text-amber-200'
                }`}
              >
                <span>🏆</span>
                <span>
                  {bountiesCompleted}/{dailyBounties.bounties.length}
                </span>
              </button>

              {/* Mars History Codex Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenMarsHistory();
                }}
                data-interactive-ui="true"
                title="Open Mars History & Historian Badges Codex (Key: H)"
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold shadow border transition-colors active:scale-95 ${
                  discoveredTabletsCount === totalTabletsCount
                    ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-400 text-emerald-200'
                    : 'bg-teal-950/90 hover:bg-teal-900 border-teal-500/80 text-teal-200'
                }`}
              >
                <span>📜</span>
                <span>
                  {discoveredTabletsCount}/{totalTabletsCount}
                </span>
              </button>

              {/* Correct-Answers Leaderboard Button */}
              {onOpenLeaderboard && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onOpenLeaderboard();
                  }}
                  data-interactive-ui="true"
                  title="View Explorer Correct-Answers Leaderboard (Key: K)"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold shadow border border-emerald-500/80 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 transition-colors active:scale-95"
                >
                  <span>🏅</span>
                  <span>
                    {careerRank ? `#${careerRank}` : 'Ranks'}
                  </span>
                </button>
              )}

              {/* Underground Subterranean Base Indicator & Quick Lab Button */}
              {isUnderground && (
                <>
                  <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-[9px] font-bold shadow">
                    <span>🕳️</span>
                    <span>-28m</span>
                  </div>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenScienceLab();
                    }}
                    data-interactive-ui="true"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-950/95 hover:bg-emerald-900 border border-emerald-400 text-emerald-200 text-[9px] font-bold shadow transition active:scale-95"
                  >
                    <span>🔬</span>
                    <span>Lab</span>
                  </button>
                </>
              )}
            </div>

            {/* Weather Prediction & Forecast Widget (shown only on taller displays) */}
            <div className="hidden [@media(min-height:600px)]:block self-start pointer-events-auto">
              <WeatherPredictionWidget weather={weather} onTriggerStorm={onTriggerStorm} />
            </div>
          </div>

          {/* Smaller Mission Card Placed BESIDE Top-Left Badges */}
          {currentMission && (gameMode === 'mission' || gameMode === 'survival') && (
            <div
              data-interactive-ui="true"
              className="pointer-events-auto bg-slate-950/85 border border-slate-700/85 rounded-xl p-1.5 shadow-lg backdrop-blur-none text-[10px] text-slate-200 w-[148px] [@media(min-height:540px)]:w-[168px] sm:w-[190px] shrink-0"
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-0.5 font-game font-bold text-amber-300 text-[10px] truncate">
                  <span>🎯</span>
                  <span className="truncate">M{currentMission.id}: {currentMission.title}</span>
                </div>
                <button
                  onClick={() => setIsMissionCollapsed(!isMissionCollapsed)}
                  title={isMissionCollapsed ? 'Expand Mission' : 'Collapse Mission'}
                  className="text-slate-400 hover:text-slate-200 text-[9px] font-bold w-4 h-4 rounded bg-slate-800/85 flex items-center justify-center shrink-0 leading-none"
                >
                  {isMissionCollapsed ? '▾' : '▴'}
                </button>
              </div>

              {!isMissionCollapsed && (
                <>
                  <p className="text-[9px] text-slate-300 mb-1 leading-tight line-clamp-2">
                    {currentMission.instructions}
                  </p>

                  <div className="flex items-center justify-between text-[8px] font-mono-numbers text-slate-400 mb-0.5">
                    <span>PROGRESS</span>
                    <span className="font-bold text-amber-400">
                      {currentMission.currentCount}/{currentMission.targetCount}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(
                          (currentMission.currentCount / currentMission.targetCount) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="hidden [@media(min-height:600px)]:flex mt-1 text-[8px] text-emerald-400 font-semibold items-center gap-0.5 truncate">
                    <span>🎁</span>
                    <span className="truncate">{currentMission.rewardText}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Compact Trivia Expedition Field Scanner Card Placed BESIDE Badges */}
          {gameMode === 'trivia' && (
            <div className="pointer-events-auto bg-slate-950/90 border border-cyan-500/70 rounded-xl p-1.5 sm:p-2 shadow-xl text-[10px] text-slate-200 w-[166px] sm:w-[205px] shrink-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 font-game font-bold text-cyan-300 text-[10px] truncate">
                  <span>🧠</span>
                  <span className="truncate">Trivia Scanner</span>
                </div>
                <button
                  onClick={() => {
                    sounds.playClick();
                    onTriggerTriviaScan();
                  }}
                  data-interactive-ui="true"
                  className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/70 text-cyan-200 text-[9px] font-bold transition active:scale-95 shrink-0"
                >
                  ⚡ Scan
                </button>
              </div>

              <div className="flex items-center justify-between text-[8px] font-mono-numbers text-slate-400 mb-0.5">
                <span>NEXT SCAN</span>
                <span className="font-bold text-cyan-300">
                  {triviaStats.scanMeters}m / {triviaStats.scanThreshold}m
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-[width] duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((triviaStats.scanMeters / Math.max(1, triviaStats.scanThreshold)) * 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono-numbers text-slate-300 border-t border-slate-800 pt-0.5">
                <span className="text-emerald-300 font-bold">
                  ✓ {triviaStats.correctCount}/{triviaStats.answeredCount}
                </span>
                <span className="text-amber-300 font-bold">🔥 {triviaStats.streak}</span>
                <span className="text-cyan-300 font-bold">+{triviaStats.totalXpEarned} XP</span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Combined (Oxygen + Stamina + Flight) BESIDE MiniMap, Camera Controls DOWN under those three */}
        <div className="flex items-start justify-end gap-1.5 min-w-0 pointer-events-none">
          {/* Column BESIDE MiniMap: Quick Counters & Toolbar + Combined Vitals (O2/Stamina/Flight) + Cam Below Those Three */}
          <div className="flex flex-col items-end gap-1 pointer-events-none">
            {/* Crystal/Score Counters + Small Toolbar Icons */}
            <div className="flex flex-col items-end gap-1 pointer-events-auto">
              <div className="flex items-center justify-end gap-1">
                <div className="flex items-center gap-0.5 bg-slate-950/85 border border-fuchsia-600/70 px-1.5 py-0.5 rounded-lg shadow text-[10px] font-bold text-fuchsia-300">
                  <span>💎</span>
                  <span className="font-mono-numbers">{crystalsCount}/10</span>
                </div>

                <div className="flex items-center gap-0.5 bg-slate-950/85 border border-amber-600/70 px-1.5 py-0.5 rounded-lg shadow text-[10px] font-bold text-amber-300">
                  <span>⭐</span>
                  <span className="font-mono-numbers">{score} XP</span>
                </div>
              </div>

              {/* Small Quick Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-end gap-1 max-w-[152px] [@media(min-height:560px)]:max-w-[174px]">
                {isDrivingRover && (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onToggleRoverHeadlights?.();
                    }}
                    data-interactive-ui="true"
                    title="Toggle Rover High-Beam Headlights (Key: L)"
                    className={`w-6 h-6 rounded-lg border text-[11px] flex items-center justify-center transition shadow active:scale-95 ${
                      roverHeadlights
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    💡
                  </button>
                )}

                <button
                  onClick={() => {
                    sounds.playClick();
                    onTriggerStorm();
                  }}
                  data-interactive-ui="true"
                  title="Trigger Martian Dust Storm"
                  className={`w-6 h-6 rounded-lg border text-[11px] flex items-center justify-center transition shadow active:scale-95 ${
                    weather.type === 'storm'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700 text-amber-300'
                  }`}
                >
                  🌪️
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    onCycleSolTime();
                  }}
                  data-interactive-ui="true"
                  title="Advance Martian Sol Time (Day → Sunset → Night → Dawn)"
                  className="w-6 h-6 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] flex items-center justify-center transition shadow active:scale-95"
                >
                  {dayNight.phase === 'night'
                    ? '🌙'
                    : dayNight.phase === 'dusk'
                    ? '🌅'
                    : dayNight.phase === 'dawn'
                    ? '🌄'
                    : '☀️'}
                </button>

                <button
                  onClick={() => {
                    onPhotoMode();
                  }}
                  data-interactive-ui="true"
                  title="Photo Mode — Capture 3D View as PNG (Key: P)"
                  className="w-6 h-6 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-500/80 text-amber-200 text-[11px] flex items-center justify-center transition shadow active:scale-95"
                >
                  📸
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    onOpenFriendsLobby();
                  }}
                  data-interactive-ui="true"
                  title={roomId ? `Crew Room (${1 + remoteCrew.length} Players)` : 'Multiplayer Crew & Invite Friends'}
                  className={`relative w-6 h-6 rounded-lg border text-[11px] flex items-center justify-center transition shadow active:scale-95 ${
                    roomId
                      ? 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700 text-cyan-300'
                  }`}
                >
                  <span>👥</span>
                  {roomId && (
                    <span className="absolute -top-1 -right-1 px-1 rounded-full bg-cyan-400 text-slate-950 text-[8px] font-extrabold leading-tight">
                      {1 + remoteCrew.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    onToggleAstroneerSoundtrack();
                  }}
                  data-interactive-ui="true"
                  title={astroneerSoundtrack ? 'Soundtrack: Relaxing Astroneer Chill' : 'Soundtrack: Standard Mars'}
                  className={`w-6 h-6 rounded-lg border text-[11px] flex items-center justify-center transition shadow active:scale-95 ${
                    astroneerSoundtrack
                      ? 'bg-teal-950/90 hover:bg-teal-900 border-teal-400 text-teal-200'
                      : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  🎵
                </button>

                <button
                  onClick={() => {
                    sounds.unlockAudio();
                    sounds.playClick();
                    voiceAssistant.unlock();
                    voiceAssistant.speakMissionBriefing(
                      currentMission && !currentMission.completed ? currentMission.title : null,
                      currentMission && !currentMission.completed ? currentMission.instructions : null,
                      oxygen,
                      isInfiniteO2,
                      isDrivingRover
                    );
                  }}
                  data-interactive-ui="true"
                  title="AI Mission Assistant: Speak current mission briefing & guidance"
                  className="w-6 h-6 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/75 text-cyan-200 text-[11px] flex items-center justify-center transition shadow active:scale-95"
                >
                  🎙️
                </button>

                <button
                  onClick={() => {
                    sounds.unlockAudio();
                    sounds.playClick();
                    voiceAssistant.unlock();
                    voiceAssistant.speakEducationalFact(true);
                  }}
                  data-interactive-ui="true"
                  title="AI Mission Assistant: Hear an educational Mars science fact"
                  className="w-6 h-6 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-400/70 text-sky-200 text-[11px] flex items-center justify-center transition shadow active:scale-95"
                >
                  🪐
                </button>

                {voiceSpeakingState.lastAnnouncementText && (
                  <button
                    onClick={() => {
                      sounds.unlockAudio();
                      voiceAssistant.repeatLastAnnouncement();
                    }}
                    data-interactive-ui="true"
                    title="Repeat Last AI Announcement"
                    className="w-6 h-6 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 flex items-center justify-center text-[11px] transition shadow active:scale-95"
                  >
                    🔁
                  </button>
                )}

                <button
                  onClick={() => {
                    sounds.playClick();
                    onOpenAudioSettings();
                  }}
                  data-interactive-ui="true"
                  title="Audio, AI Voice & Camera FOV Settings (70°–110°)"
                  className="w-6 h-6 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 flex items-center justify-center text-[11px] transition shadow active:scale-95"
                >
                  🎛️
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    onToggleMute();
                  }}
                  data-interactive-ui="true"
                  title="Mute / Unmute All Sounds"
                  className="w-6 h-6 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[11px] transition shadow active:scale-95"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    onPause();
                  }}
                  data-interactive-ui="true"
                  title="Pause Expedition"
                  className="w-6 h-6 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[11px] font-bold transition shadow active:scale-95"
                >
                  ⏸️
                </button>
              </div>
            </div>

            {/* COMBINED VITALS PANEL (Oxygen + Stamina + Flight combined neatly beside MiniMap) */}
            <div
              className={`pointer-events-auto flex flex-col gap-1 w-[144px] [@media(min-height:520px)]:w-[162px] sm:w-[184px] p-1.5 rounded-xl border shadow-xl backdrop-blur-none transition-colors ${
                isO2Critical
                  ? 'bg-rose-950/90 border-rose-500 ring-2 ring-rose-500/50'
                  : isO2Warning || (weather.type === 'storm' && !weather.isSheltered && !isInfiniteO2)
                  ? 'bg-amber-950/90 border-amber-500/80'
                  : 'bg-slate-950/88 border-cyan-600/65'
              }`}
            >
              {/* 1. OXYGEN */}
              <div data-testid="oxygen-bar" className="flex flex-col w-full px-1 py-0.5">
                <div className="flex items-center justify-between text-[9px] font-bold mb-0.5 leading-none">
                  <span className="flex items-center gap-0.5">
                    <span>💨</span>
                    <span className={isO2Critical ? 'text-rose-300' : 'text-cyan-300'}>
                      OXYGEN
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-mono-numbers text-[9px]">
                    {weather.type === 'storm' && !isInfiniteO2 && (
                      <span className={weather.isSheltered ? 'text-emerald-300' : 'text-rose-300'}>
                        {weather.isSheltered ? 'SAFE' : `×${weather.oxygenMultiplier}`}
                      </span>
                    )}
                    <span
                      className={
                        isInfiniteO2
                          ? 'text-emerald-400'
                          : isO2Critical
                          ? 'text-rose-400'
                          : isO2Warning
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }
                    >
                      {isInfiniteO2 ? 'INF' : `${Math.round(oxygen)}%`}
                    </span>
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`h-full transition-[width] duration-200 ${
                      isInfiniteO2
                        ? 'bg-emerald-500'
                        : isO2Critical
                        ? 'bg-rose-500'
                        : isO2Warning
                        ? 'bg-amber-500'
                        : weather.type === 'storm' && !weather.isSheltered
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    }`}
                    style={{ width: isInfiniteO2 ? '100%' : `${oxygen}%` }}
                  />
                </div>

                {isO2Critical && (
                  <span className="text-[8px] text-rose-300 font-bold uppercase tracking-wider text-center mt-0.5">
                    ⚠️ Low O2!
                  </span>
                )}
              </div>

              <div className="h-px bg-slate-800/90 mx-0.5" />

              {/* 2. STAMINA */}
              <StaminaBar staminaData={stamina} isDrivingRover={isDrivingRover} embedded />

              <div className="h-px bg-slate-800/90 mx-0.5" />

              {/* 3. FLIGHT + COMPACT WIND READOUT */}
              <div className="flex flex-col w-full px-1 py-0.5">
                <div className="flex items-center justify-between text-[9px] font-bold mb-0.5 leading-none">
                  <span className="flex items-center gap-0.5">
                    <span>🪽</span>
                    <span className={flight.isGliding ? 'text-sky-200' : 'text-sky-300'}>
                      FLIGHT
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono-numbers ml-0.5">
                      {flight.isAirborne
                        ? `${flight.altitude.toFixed(0)}m`
                        : `${wind.cardinal}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-mono-numbers text-[9px]">
                    <span
                      className={`hidden sm:inline text-[8px] font-sans uppercase ${
                        flight.isGliding
                          ? 'text-sky-300'
                          : flight.isRegenerating
                          ? 'text-emerald-300'
                          : flight.energy < 10
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {flight.isGliding
                        ? 'GLIDE'
                        : flight.isRegenerating
                        ? '+REGEN'
                        : flight.isAirborne
                        ? 'AIR'
                        : 'READY'}
                    </span>
                    <span className="text-amber-300">{Math.round(flight.energy)}%</span>
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`h-full transition-[width] duration-150 ${
                      flight.isGliding
                        ? 'bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-300'
                        : flight.energy <= 15
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-sky-500 to-amber-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, flight.energy))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CAMERA CONTROLS PUT DOWN UNDER THOSE THREE (Oxygen, Stamina & Flight) */}
            <div className="pointer-events-auto flex items-center gap-0.5 bg-slate-950/85 border border-slate-700/85 p-0.5 rounded-xl shadow-md">
              <button
                onClick={() => {
                  sounds.playClick();
                  if (performance.now() - camHoldStartRef.current < 200) {
                    onRotateCamera?.(-Math.PI / 4);
                  }
                }}
                onPointerDown={() => {
                  camHoldStartRef.current = performance.now();
                  onCameraTurnHold?.(-1);
                }}
                onPointerUp={() => onCameraTurnHold?.(0)}
                onPointerLeave={() => onCameraTurnHold?.(0)}
                onPointerCancel={() => onCameraTurnHold?.(0)}
                data-interactive-ui="true"
                title="Rotate Camera Left 360° (Tap 45° / Hold Spin · Key: Q)"
                className="w-6 h-6 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-game font-bold flex items-center justify-center transition active:scale-95 touch-none"
              >
                ⟲
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onResetCamera();
                }}
                data-interactive-ui="true"
                title="Reset Camera behind Astronaut (Key: R)"
                className="px-2 h-6 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-game font-bold flex items-center justify-center gap-1 transition active:scale-95"
              >
                <span>🔄</span>
                <span>Cam</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  if (performance.now() - camHoldStartRef.current < 200) {
                    onRotateCamera?.(Math.PI / 4);
                  }
                }}
                onPointerDown={() => {
                  camHoldStartRef.current = performance.now();
                  onCameraTurnHold?.(1);
                }}
                onPointerUp={() => onCameraTurnHold?.(0)}
                onPointerLeave={() => onCameraTurnHold?.(0)}
                onPointerCancel={() => onCameraTurnHold?.(0)}
                data-interactive-ui="true"
                title="Rotate Camera Right 360° (Tap 45° / Hold Spin · Key: X)"
                className="w-6 h-6 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-game font-bold flex items-center justify-center transition active:scale-95 touch-none"
              >
                ⟳
              </button>
            </div>
          </div>

          {/* Far Top-Right Corner: Mini-Map Radar Navigation (with Local / Tactical Zoom Toggle) */}
          <MiniMap
            playerPos={playerPos}
            playerHeading={playerHeading}
            isDrivingRover={isDrivingRover}
            spaceStationPos={spaceStationPos}
            roverPos={roverPos}
            activeObjective={activeObjective}
            checkpoints={checkpoints}
            crystals={crystals}
            weather={weather}
            remoteCrew={remoteCrew}
            bountyTarget={bountyRadarTarget}
            tablets={tabletsList}
            hiddenAreas={hiddenAreas}
            satelliteRelays={satelliteRelays}
            autoPilotTarget={autoPilotState?.active ? autoPilotState.target : null}
            onOpenAutoPilot={onOpenAutoPilot}
          />
        </div>
      </div>

      {/* --- AI MISSION ASSISTANT LIVE VOICE SUBTITLE STRIP --- */}
      {voiceSpeakingState.isSpeaking && voiceSpeakingState.text && (
        <div className="relative z-10 self-center mt-1 mb-1 pointer-events-auto max-w-xl">
          <div className="bg-slate-950/90 border border-cyan-400/80 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs text-cyan-100">
            <span className="text-base leading-none shrink-0">🎙️</span>
            <p className="leading-snug flex-1">
              <span className="font-game font-bold text-cyan-300 uppercase tracking-wider mr-1.5">
                Mission AI:
              </span>
              <span>{voiceSpeakingState.text}</span>
            </p>
            <button
              type="button"
              onClick={() => voiceAssistant.stopAll()}
              data-interactive-ui="true"
              title="Stop AI Voice"
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[10px] font-bold shrink-0"
            >
              ⏹
            </button>
          </div>
        </div>
      )}

      {/* --- DUST STORM ATMOSPHERIC WARNING BANNER --- */}
      {weather.type === 'warning' && !isDrivingRover && (
        <div className="self-center my-auto pointer-events-auto">
          <div className="bg-amber-950/95 border-2 border-amber-400 px-6 py-3.5 rounded-3xl shadow-2xl flex items-center gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="font-game font-bold text-amber-300 text-sm sm:text-base">
                MARTIAN DUST STORM IMMINENT ({weather.timeRemaining}s)
              </div>
              <div className="text-xs text-amber-100 max-w-xs">
                Gale winds approaching! Visibility drops to ~28m & suit O2 drain surges to 2.5x. Seek shelter inside Base or Rover!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ROVER DRIVING HUD & DURABILITY BAR --- */}
      {isDrivingRover && (() => {
        const pct = roverIntegrityPct;
        const isSevereDamage = pct < 25;
        const isCritical = pct < 35;
        const isDamaged = pct < 60;
        const isWorn = pct < 85;
        const needsRepair = pct < 99.5;

        const barColor = isSevereDamage
          ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-400'
          : isCritical
          ? 'bg-gradient-to-r from-rose-600 to-red-400'
          : isDamaged
          ? 'bg-gradient-to-r from-orange-500 to-amber-400'
          : isWorn
          ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
          : 'bg-gradient-to-r from-cyan-500 to-emerald-400';

        const statusLabel =
          roverDurability.status === 'LIMP_MODE'
            ? 'LIMP MODE'
            : roverDurability.status;

        const statusBadgeClass = isSevereDamage
          ? 'bg-red-600/40 border-red-400 text-red-100'
          : isCritical
          ? 'bg-rose-500/25 border-rose-400 text-rose-200'
          : isDamaged
          ? 'bg-orange-500/25 border-orange-400 text-orange-200'
          : isWorn
          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
          : 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200';

        const stressInfo =
          roverDurability.terrainStress === 'IMPACT'
            ? { text: '💥 OBSTACLE IMPACT!', cls: 'text-rose-300 font-bold' }
            : roverDurability.terrainStress === 'ROUGH_SLOPE'
            ? { text: '🪨 HARSH SLOPE WEAR', cls: 'text-amber-300 font-bold' }
            : roverDurability.terrainStress === 'STORM_GRIT'
            ? { text: '🌪️ STORM GRIT ABRASION', cls: 'text-orange-300 font-bold' }
            : { text: 'TERRAIN NOMINAL', cls: 'text-slate-400' };

        return (
          <div className="relative z-10 self-center mt-auto mb-1 pointer-events-auto max-w-[calc(100%-260px)] sm:max-w-[540px]">
            {isSevereDamage && (
              <div
                role="status"
                aria-live="polite"
                className="mb-1.5 mx-auto w-fit max-w-full px-3 py-1 rounded-2xl bg-red-950/95 border-2 border-red-500 shadow-lg shadow-red-600/50 flex items-center gap-1.5 animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.95)] shrink-0" />
                <span className="text-xs leading-none shrink-0">⚠️</span>
                <span className="font-game font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-red-100">
                  Damage Indicator: Hull Critical ({Math.round(pct)}%)
                </span>
                <span className="hidden md:inline text-[10px] font-bold text-red-300 uppercase">
                  · Repair Needed
                </span>
              </div>
            )}
            <div
              className={`bg-slate-950/92 border-2 px-3 sm:px-4 py-2 [@media(min-height:520px)]:py-2.5 rounded-2xl [@media(min-height:520px)]:rounded-3xl shadow-2xl flex flex-col gap-1.5 w-full transition-colors ${
                isSevereDamage
                  ? 'border-red-500 ring-2 ring-red-500/60 shadow-red-600/45'
                  : isCritical
                  ? 'border-rose-500 shadow-rose-500/30'
                  : roverTelemetry.isDrifting
                  ? 'border-fuchsia-400 shadow-fuchsia-500/30'
                  : roverTelemetry.boostActive
                  ? 'border-amber-400 shadow-amber-500/30'
                  : 'border-cyan-400 shadow-cyan-500/20'
              }`}
            >
              {/* Top Row: Rover Identity + Speedometer + Gear + Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1 rounded-2xl bg-slate-900 border border-cyan-500/60 flex items-baseline gap-1">
                    <span className="font-mono-numbers font-extrabold text-lg sm:text-xl text-cyan-300 leading-none">
                      {Math.round(roverTelemetry.speedKmh)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">km/h</span>
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                        roverTelemetry.gear === 'BOOST'
                          ? 'bg-amber-400 text-slate-950'
                          : roverTelemetry.gear === 'R'
                          ? 'bg-rose-500/30 text-rose-300'
                          : roverTelemetry.gear === 'D'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {roverTelemetry.gear}
                    </span>
                  </div>

                  <div>
                    <div className="font-game font-bold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                      <span>{roverNameTag || 'CURIOSITY ROVER'}</span>
                      <span className="font-mono-numbers text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-200">
                        {Math.round(roverDurability.speedMultiplier * 100)}% PWR
                      </span>
                      {roverUpgrades && (roverUpgrades.topSpeedLevel > 0 || roverUpgrades.boostRecoveryLevel > 0) && (
                        <span className="font-mono-numbers text-[10px] px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/60 text-amber-300">
                          SPD Lv{roverUpgrades.topSpeedLevel} · RCV Lv{roverUpgrades.boostRecoveryLevel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-300 flex-wrap">
                      <span>Boost:</span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-[width] duration-100"
                          style={{ width: `${Math.round(roverTelemetry.boostEnergy)}%` }}
                        />
                      </div>
                      {roverTelemetry.isAirborne && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-400 text-cyan-200 font-bold text-[9px] uppercase tracking-wider">
                          🚀 AIRBORNE
                        </span>
                      )}
                      {roverTelemetry.isDrifting && (
                        <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/30 border border-fuchsia-400 text-fuchsia-200 font-bold text-[9px] uppercase tracking-wider">
                          💨 DRIFTING!
                        </span>
                      )}
                      {!roverTelemetry.isAirborne && !roverTelemetry.isDrifting && (
                        <span className="hidden sm:inline text-slate-400">· O2 Sheltered</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {onOpenAutoPilot && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onOpenAutoPilot();
                      }}
                      data-interactive-ui="true"
                      title="Open Rover Auto-Pilot Waypoint Navigation Map"
                      className={`px-2.5 py-1.5 rounded-xl border font-game font-bold text-[11px] sm:text-xs flex items-center gap-1 transition shadow active:scale-95 ${
                        autoPilotState?.active
                          ? 'bg-cyan-400 border-white text-slate-950'
                          : 'bg-sky-950/90 hover:bg-sky-900 border-sky-400/70 text-sky-100'
                      }`}
                    >
                      <span>🧭</span>
                      <span className="hidden sm:inline">
                        {autoPilotState?.active ? 'Waypoints' : 'Auto-Pilot'}
                      </span>
                    </button>
                  )}

                  {onOpenRoverUpgrades && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onOpenRoverUpgrades();
                      }}
                      data-interactive-ui="true"
                      title="Upgrade Rover Top Speed & Boost Recovery using Crystals"
                      className={`px-2.5 py-1.5 rounded-xl border font-game font-bold text-[11px] sm:text-xs flex items-center gap-1 transition shadow active:scale-95 ${
                        hasAffordableRoverUpgrade
                          ? 'bg-amber-400 hover:bg-amber-300 border-white text-slate-950 shadow-amber-400/40'
                          : 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/70 text-amber-100'
                      }`}
                    >
                      <span>⚙️</span>
                      <span className="hidden sm:inline">Upgrades</span>
                      <span className="font-mono-numbers text-[10px]">
                        💎{roverUpgrades?.availableCrystals ?? 0}
                      </span>
                    </button>
                  )}

                  {onOpenRoverCustomize && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onOpenRoverCustomize();
                      }}
                      data-interactive-ui="true"
                      title="Customize Rover Paint, Roof Module & Wheels"
                      className="px-2.5 py-1.5 rounded-xl border border-purple-400/70 bg-purple-950/90 hover:bg-purple-900 text-purple-100 font-game font-bold text-[11px] sm:text-xs flex items-center gap-1 transition shadow active:scale-95"
                    >
                      <span>🎨</span>
                      <span className="hidden sm:inline">Customize</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onToggleRoverHeadlights?.();
                    }}
                    data-interactive-ui="true"
                    title="Toggle Rover High-Beam Headlights (Key: L)"
                    className={`px-2.5 py-1.5 rounded-xl border font-game font-bold text-[11px] sm:text-xs flex items-center gap-1 transition shadow active:scale-95 ${
                      roverHeadlights
                        ? 'bg-amber-400 hover:bg-amber-300 border-white text-slate-950'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span>💡</span>
                    <span>{roverHeadlights ? 'Lights' : 'Off'}</span>
                  </button>

                  <button
                    onClick={onRepairRover}
                    data-interactive-ui="true"
                    title="Repair Rover Chassis & Suspension to 100%"
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl border font-game font-bold text-[11px] sm:text-xs flex items-center gap-1 transition shadow active:scale-95 ${
                      isSevereDamage
                        ? 'bg-red-500 hover:bg-red-400 border-red-200 text-white shadow-red-500/60 animate-pulse'
                        : needsRepair
                        ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-200 text-slate-950 shadow-emerald-500/40'
                        : 'bg-slate-800/90 hover:bg-slate-700 border-slate-600 text-slate-300'
                    }`}
                  >
                    <span>🛠️</span>
                    <span>{needsRepair ? 'Repair' : '100%'}</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onExitRover();
                    }}
                    data-interactive-ui="true"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-game font-bold text-[11px] sm:text-xs uppercase tracking-wider transition shadow"
                  >
                    Exit
                  </button>
                </div>
              </div>

              {/* Bottom Row: Rover Durability Bar */}
              <div
                className={`rounded-2xl px-3 py-2 border transition-colors ${
                  isSevereDamage
                    ? 'bg-red-950/75 border-red-500/90 animate-pulse'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-game font-bold uppercase tracking-wider ${
                        isSevereDamage ? 'text-red-200' : 'text-slate-200'
                      }`}
                    >
                      {isSevereDamage ? '🚨' : '🛡️'} Rover Durability
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide ${stressInfo.cls}`}>
                      · {stressInfo.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {roverDurability.collisionCount > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono-numbers">
                        {roverDurability.collisionCount} hit{roverDurability.collisionCount === 1 ? '' : 's'}
                      </span>
                    )}
                    <span
                      className={`font-mono-numbers font-extrabold text-xs sm:text-sm ${
                        isSevereDamage
                          ? 'text-red-300'
                          : isCritical
                          ? 'text-rose-400'
                          : isDamaged
                          ? 'text-orange-300'
                          : isWorn
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700/80">
                  <div
                    className={`h-full rounded-full transition-[width] duration-150 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Active Auto-Pilot Navigation Telemetry Bar */}
              {autoPilotState?.active && autoPilotState.target && (
                <div className="bg-cyan-950/80 border border-cyan-400/70 rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-game font-bold text-cyan-200 truncate">
                      🧭 AUTO-PILOT → {autoPilotState.target.title}
                    </div>
                    <div className="font-mono-numbers text-[11px] text-slate-300">
                      {autoPilotState.distanceMeters} m remaining · ~{autoPilotState.etaSeconds} s ·{' '}
                      <span className="font-bold text-amber-300">
                        {autoPilotState.reversingRecovery
                          ? 'REVERSING CLEARANCE'
                          : autoPilotState.avoidingObstacle
                          ? 'AVOIDING OBSTACLE'
                          : 'CRUISE LOCKED'}
                      </span>
                    </div>
                  </div>
                  {onCancelAutoPilot && (
                    <button
                      onClick={onCancelAutoPilot}
                      data-interactive-ui="true"
                      className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-game font-bold text-[11px] transition shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* --- CONTEXTUAL INTERACTION PROMPT --- */}
      {interactivePrompt && !isDrivingRover && (
        <div className="self-center my-auto pointer-events-auto animate-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              sounds.playClick();
              onInteract();
            }}
            data-interactive-ui="true"
            className="group flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-game font-bold px-6 py-3.5 rounded-3xl shadow-2xl shadow-cyan-500/50 border-2 border-white/50 transition transform active:scale-95"
          >
            <span className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-lg">
              ⚡
            </span>
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider opacity-80 text-slate-900">
                {interactivePrompt.title}
              </div>
              <div className="text-sm sm:text-base leading-tight">
                {interactivePrompt.actionText} <span className="hidden sm:inline opacity-75 font-normal">(Press E)</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* --- BOTTOM CLUSTER (Virtual Joystick bottom-left; Jump, Interact, Glide, Walk bottom-right) --- */}
      <div className="relative z-10 flex items-end justify-between w-full pointer-events-none">
        {/* Bottom-Left: Virtual Joystick or Rover Left/Right Steering + Multiplayer Feed */}
        <div className="flex flex-col items-start gap-1.5 pointer-events-none">
          {(gameMode === 'multiplayer' || Boolean(roomId)) && (
            <div className="pointer-events-auto max-h-24 [@media(min-height:560px)]:max-h-40 overflow-hidden">
              <MultiplayerFeed
                roomId={roomId}
                messages={chatMessages}
                onSendMessage={onSendChat}
                onSendPing={onSendPing}
              />
            </div>
          )}
          {isDrivingRover ? (
            <div className="flex items-center gap-2 pb-0.5 [@media(min-height:520px)]:pb-1.5 pointer-events-auto touch-none select-none">
              <button
                onPointerDown={() => updateRoverPedal({ turn: -1 })}
                onPointerUp={() => updateRoverPedal({ turn: 0 })}
                onPointerLeave={() => updateRoverPedal({ turn: 0 })}
                onPointerCancel={() => updateRoverPedal({ turn: 0 })}
                data-interactive-ui="true"
                className="w-14 h-14 [@media(min-height:520px)]:w-16 [@media(min-height:520px)]:h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-900/90 active:bg-cyan-500 active:text-slate-950 border-2 border-cyan-500/80 text-cyan-200 flex flex-col items-center justify-center font-game font-bold shadow-xl touch-none select-none"
              >
                <span className="text-xl leading-none">◀</span>
                <span className="text-[9px] uppercase mt-0.5">LEFT</span>
              </button>
              <button
                onPointerDown={() => updateRoverPedal({ turn: 1 })}
                onPointerUp={() => updateRoverPedal({ turn: 0 })}
                onPointerLeave={() => updateRoverPedal({ turn: 0 })}
                onPointerCancel={() => updateRoverPedal({ turn: 0 })}
                data-interactive-ui="true"
                className="w-14 h-14 [@media(min-height:520px)]:w-16 [@media(min-height:520px)]:h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-900/90 active:bg-cyan-500 active:text-slate-950 border-2 border-cyan-500/80 text-cyan-200 flex flex-col items-center justify-center font-game font-bold shadow-xl touch-none select-none"
              >
                <span className="text-xl leading-none">▶</span>
                <span className="text-[9px] uppercase mt-0.5">RIGHT</span>
              </button>
            </div>
          ) : (
            <div className="pb-0.5 [@media(min-height:520px)]:pb-1.5 pointer-events-auto">
              <VirtualJoystick onMove={onJoystickMove} />
            </div>
          )}
        </div>

        {/* Bottom-Right: Touch Action Buttons (Walk, Interact, Glide, Jump) / Rover Drive Pedals */}
        <div className="flex items-end justify-end gap-1.5 sm:gap-2.5 pb-0.5 [@media(min-height:520px)]:pb-1.5 pointer-events-auto">
          {/* Rover Horn + Pedals when driving */}
          {isDrivingRover && (
            <div className="flex items-end gap-1.5 touch-none select-none">
              <button
                onClick={onRoverHorn}
                data-interactive-ui="true"
                title="Rover Chime Horn (Key: V)"
                className="w-11 h-12 [@media(min-height:520px)]:w-13 [@media(min-height:520px)]:h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-500 text-slate-200 flex flex-col items-center justify-center font-game font-bold shadow-xl active:scale-90 touch-none"
              >
                <span className="text-base leading-none">🔊</span>
                <span className="text-[8px] uppercase mt-0.5">HORN</span>
              </button>

              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onRoverJump();
                }}
                data-interactive-ui="true"
                title={`Short-Burst Thruster Jump (Space) · Uses ${roverTelemetry.jumpCost}% Boost Energy`}
                className={`w-12 h-14 [@media(min-height:520px)]:w-14 [@media(min-height:520px)]:h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-game font-bold shadow-xl active:scale-95 transition touch-none ${
                  roverTelemetry.isAirborne
                    ? 'bg-cyan-400 border-white text-slate-950 shadow-cyan-400/60'
                    : roverTelemetry.boostEnergy >= roverTelemetry.jumpCost
                    ? 'bg-sky-950/95 hover:bg-sky-900 border-cyan-400 text-cyan-200 shadow-cyan-500/30'
                    : 'bg-slate-900/80 border-slate-700 text-slate-500'
                }`}
              >
                <span className="text-base leading-none">🚀</span>
                <span className="text-[8px] uppercase mt-0.5 font-extrabold">JUMP</span>
              </button>

              <button
                onPointerDown={() => onRoverBoostToggle(true)}
                onPointerUp={() => onRoverBoostToggle(false)}
                onPointerLeave={() => onRoverBoostToggle(false)}
                onPointerCancel={() => onRoverBoostToggle(false)}
                data-interactive-ui="true"
                title="Hold for Turbo Boost (Shift)"
                className={`w-12 h-14 [@media(min-height:520px)]:w-14 [@media(min-height:520px)]:h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-game font-bold shadow-xl active:scale-95 touch-none ${
                  roverTelemetry.boostActive
                    ? 'bg-amber-400 border-white text-slate-950 shadow-amber-400/60'
                    : 'bg-slate-900/90 border-amber-500/80 text-amber-300'
                }`}
              >
                <span className="text-base leading-none">⚡</span>
                <span className="text-[8px] uppercase mt-0.5">BOOST</span>
              </button>

              <button
                onPointerDown={() => updateRoverPedal({ fwd: -1 })}
                onPointerUp={() => updateRoverPedal({ fwd: 0 })}
                onPointerLeave={() => updateRoverPedal({ fwd: 0 })}
                onPointerCancel={() => updateRoverPedal({ fwd: 0 })}
                data-interactive-ui="true"
                className="w-12 h-14 [@media(min-height:520px)]:w-14 [@media(min-height:520px)]:h-16 rounded-2xl bg-rose-950/90 active:bg-rose-500 active:text-white border-2 border-rose-500/80 text-rose-200 flex flex-col items-center justify-center font-game font-bold shadow-xl touch-none"
              >
                <span className="text-base leading-none">▼</span>
                <span className="text-[8px] uppercase mt-0.5">REV</span>
              </button>

              <button
                onPointerDown={() => updateRoverPedal({ fwd: 1 })}
                onPointerUp={() => updateRoverPedal({ fwd: 0 })}
                onPointerLeave={() => updateRoverPedal({ fwd: 0 })}
                onPointerCancel={() => updateRoverPedal({ fwd: 0 })}
                data-interactive-ui="true"
                className="w-14 h-16 [@media(min-height:520px)]:w-16 [@media(min-height:520px)]:h-20 sm:w-20 sm:h-24 rounded-2xl bg-gradient-to-t from-emerald-600 to-cyan-500 active:from-emerald-400 active:to-cyan-300 border-2 border-white/80 text-slate-950 flex flex-col items-center justify-center font-game font-bold shadow-2xl touch-none"
              >
                <span className="text-xl sm:text-2xl leading-none">▲</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold mt-0.5">DRIVE</span>
              </button>
            </div>
          )}

          {/* Sprint / Walk Toggle Button */}
          {!isDrivingRover && (
            <button
              onClick={() => {
                sounds.playClick();
                onToggleSprint();
              }}
              data-interactive-ui="true"
              className={`w-12 h-12 [@media(min-height:520px)]:w-13 [@media(min-height:520px)]:h-13 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center text-xs font-bold shadow-xl active:scale-90 transition select-none ${
                stamina.isExhausted
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-300'
                  : isRunning
                  ? 'bg-amber-500 border-amber-200 text-slate-950 shadow-amber-500/50'
                  : 'bg-slate-900/90 border-slate-600 text-slate-300'
              }`}
            >
              <span className="text-sm [@media(min-height:520px)]:text-base leading-none">
                {stamina.isExhausted ? '😮‍💨' : '🏃'}
              </span>
              <span className="text-[8px] [@media(min-height:520px)]:text-[9px] uppercase font-bold mt-0.5">
                {stamina.isExhausted ? 'Tired' : isRunning ? 'Fast' : 'Walk'}
              </span>
            </button>
          )}

          {/* Interact Button (always accessible on bottom-right; highlights bright when POI is in range) */}
          {!isDrivingRover && (
            <button
              onClick={() => {
                sounds.playClick();
                onInteract();
              }}
              data-interactive-ui="true"
              title={interactivePrompt ? `${interactivePrompt.title}: ${interactivePrompt.actionText} (Key: E)` : 'Interact with nearby Mars Station, Rover, Tablet or Relay (Key: E)'}
              className={`w-13 h-13 [@media(min-height:520px)]:w-15 [@media(min-height:520px)]:h-15 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center font-game font-bold shadow-2xl active:scale-90 transition select-none touch-none ${
                interactivePrompt
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 border-white text-slate-950 shadow-cyan-500/50 ring-2 ring-cyan-200/70'
                  : 'bg-slate-900/85 hover:bg-slate-800 border-cyan-600/60 text-cyan-200 opacity-80'
              }`}
            >
              <span className="text-base [@media(min-height:520px)]:text-lg leading-none">⚡</span>
              <span className="text-[9px] [@media(min-height:520px)]:text-[10px] uppercase leading-tight mt-0.5">
                Interact
              </span>
            </button>
          )}

          {/* Rover Repair Touch Button (when driving & worn) */}
          {isDrivingRover && roverDurability.integrity < 99.5 && (
            <button
              onClick={onRepairRover}
              data-interactive-ui="true"
              title="Repair Rover Hull to 100%"
              className="w-12 h-12 [@media(min-height:520px)]:w-14 [@media(min-height:520px)]:h-14 rounded-full border-2 bg-gradient-to-tr from-emerald-500 to-teal-300 border-white text-slate-950 flex flex-col items-center justify-center font-game font-bold shadow-2xl shadow-emerald-500/50 active:scale-90 transition select-none"
            >
              <span className="text-lg leading-none">🛠️</span>
              <span className="text-[8px] uppercase tracking-wider font-extrabold leading-none mt-0.5">
                REPAIR
              </span>
            </button>
          )}

          {/* Rover Headlights Touch Button (when driving) */}
          {isDrivingRover && (
            <button
              onClick={() => {
                sounds.playClick();
                onToggleRoverHeadlights?.();
              }}
              data-interactive-ui="true"
              title="Toggle Rover High-Beam Headlights (Key: L)"
              className={`w-12 h-12 [@media(min-height:520px)]:w-14 [@media(min-height:520px)]:h-14 rounded-full border-2 flex flex-col items-center justify-center font-game font-bold shadow-2xl active:scale-90 transition select-none ${
                roverHeadlights
                  ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 border-white text-slate-950 shadow-amber-500/60'
                  : 'bg-slate-900/90 border-slate-600 text-slate-300 hover:border-slate-400'
              }`}
            >
              <span className="text-lg leading-none">💡</span>
              <span className="text-[8px] uppercase tracking-wider font-extrabold leading-none mt-0.5">
                {roverHeadlights ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Glide Toggle Button (Desktop + Android Tablet/Phone Touch) */}
          {!isDrivingRover && (
            <button
              onClick={() => {
                onToggleGlide();
              }}
              data-interactive-ui="true"
              title="Toggle Sky Glider Wings (Key: G)"
              className={`w-13 h-13 [@media(min-height:520px)]:w-15 [@media(min-height:520px)]:h-15 sm:w-[68px] sm:h-[68px] rounded-full border-3 flex flex-col items-center justify-center font-game font-bold shadow-2xl active:scale-90 transition select-none touch-none ${
                flight.isGliding
                  ? 'bg-gradient-to-tr from-sky-400 to-cyan-300 border-white text-slate-950 shadow-sky-400/60 ring-2 ring-sky-200/70'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-sky-500/80 text-sky-200'
              }`}
            >
              <span className="text-lg sm:text-xl leading-none">🪽</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold leading-tight mt-0.5">
                {flight.isGliding ? 'CLOSE' : 'GLIDE'}
              </span>
            </button>
          )}

          {/* Jump / Mid-Air Wing Flap Button */}
          {!isDrivingRover && (
            <button
              onClick={() => {
                onJump();
              }}
              data-interactive-ui="true"
              title={
                flight.isGliding
                  ? 'Wing Flap Upward Boost (Space)'
                  : flight.isAirborne
                  ? 'Open Glider Wings (Space)'
                  : 'Mars Low-Gravity Jump (Space)'
              }
              className={`w-16 h-16 [@media(min-height:520px)]:w-18 [@media(min-height:520px)]:h-18 sm:w-20 sm:h-20 rounded-full border-4 flex flex-col items-center justify-center font-game font-bold shadow-2xl active:scale-90 transition select-none touch-none ${
                flight.isGliding
                  ? 'bg-gradient-to-tr from-amber-300 via-sky-300 to-cyan-300 border-white text-slate-950 shadow-sky-400/60'
                  : flight.isAirborne
                  ? 'bg-gradient-to-tr from-sky-500 to-cyan-400 border-sky-100 text-slate-950 shadow-sky-500/50'
                  : 'bg-gradient-to-tr from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 border-amber-200 text-slate-950 shadow-amber-500/50'
              }`}
            >
              <span className="text-xl sm:text-2xl leading-none">
                {flight.isGliding ? '✨' : flight.isAirborne ? '🪽' : '🚀'}
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold mt-0.5">
                {flight.isGliding ? 'FLAP' : flight.isAirborne ? 'OPEN' : 'JUMP'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
