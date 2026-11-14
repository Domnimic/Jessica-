export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type SuitColor =
  | 'white'
  | 'purple'
  | 'blue'
  | 'red'
  | 'green'
  | 'pink'
  | 'gold'
  | 'orange'
  | 'cyan'
  | 'black'
  | 'silver'
  | 'teal';

export interface SuitColorConfig {
  id: SuitColor;
  name: string;
  hex: string;
  accent: string;
}

export const SUIT_COLORS: SuitColorConfig[] = [
  { id: 'white', name: 'Standard White', hex: '#f8fafc', accent: '#0284c7' },
  { id: 'silver', name: 'Lunar Titanium', hex: '#cbd5e1', accent: '#818cf8' },
  { id: 'black', name: 'Stealth Obsidian', hex: '#1e293b', accent: '#38bdf8' },
  { id: 'blue', name: 'Deep Space Blue', hex: '#3b82f6', accent: '#60a5fa' },
  { id: 'cyan', name: 'Cryo Cyan', hex: '#06b6d4', accent: '#67e8f9' },
  { id: 'teal', name: 'Quantum Teal', hex: '#14b8a6', accent: '#5eead4' },
  { id: 'green', name: 'Astro Green', hex: '#10b981', accent: '#34d399' },
  { id: 'gold', name: 'Solar Gold', hex: '#f59e0b', accent: '#fde047' },
  { id: 'orange', name: 'Ares Orange', hex: '#f97316', accent: '#fdba74' },
  { id: 'red', name: 'Martian Red', hex: '#ef4444', accent: '#f87171' },
  { id: 'pink', name: 'Nebula Pink', hex: '#ec4899', accent: '#f472b6' },
  { id: 'purple', name: 'Cosmic Purple', hex: '#a855f7', accent: '#c084fc' },
];

export type GameMode = 'multiplayer' | 'exploration' | 'survival' | 'mission' | 'trivia';

export type WeatherType = 'clear' | 'warning' | 'storm' | 'clearing';

export type WeatherThreatLevel = 'nominal' | 'low' | 'moderate' | 'high' | 'critical';

export interface WeatherForecast {
  upcomingEvent: string;
  secondsUntil: number;
  threatLevel: WeatherThreatLevel;
  barometricPressure: number;
  pressureTrend: 'falling' | 'steady' | 'rising';
  expectedVisibility: number;
  expectedO2Drain: number;
  safetyAdvisory: string;
}

export interface WeatherData {
  type: WeatherType;
  name: string;
  intensity: number; // 0.0 (calm) to 1.0 (peak storm)
  visibilityMeters: number;
  oxygenMultiplier: number;
  timeRemaining: number;
  isSheltered: boolean;
  forecast: WeatherForecast;
}

export type TimeOfDayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface DayNightData {
  timeOfSol: number; // 0.00 to 24.00
  timeFormatted: string; // "14:30"
  phase: TimeOfDayPhase;
  phaseName: string;
  solarProgress: number; // 0 to 1
  isNight: boolean;
  sunElevationDeg: number;
}

export interface FlightData {
  energy: number; // 0 to 100
  isGliding: boolean;
  isAirborne: boolean;
  isRegenerating: boolean;
  verticalSpeed: number; // m/s
  airSpeed: number; // m/s
  altitude: number; // meters above ground
}

export type StaminaActivityState =
  | 'RUNNING'
  | 'JUMPING'
  | 'WALKING'
  | 'RECOVERING'
  | 'EXHAUSTED';

export interface StaminaData {
  stamina: number; // 0 to 100
  maxStamina: number; // 100
  isExhausted: boolean;
  activityState: StaminaActivityState;
  movementSpeedMps: number; // live horizontal speed in m/s
  speedMultiplier: number; // 1.6x sprint, 1.0x walk, 0.72x exhausted
}

export interface WindData {
  angleRad: number; // Direction wind blows TOWARDS in XZ world space (0 = +Z South, PI/2 = +X East)
  cardinal: string; // e.g., 'NE', 'ENE', 'W'
  speedMps: number; // Wind speed in m/s
  gusting: boolean;
  relativeLabel: 'TAILWIND' | 'HEADWIND' | 'CROSSWIND' | 'CALM';
}

export type RoverDurabilityStatus = 'OPTIMAL' | 'WORN' | 'DAMAGED' | 'CRITICAL' | 'LIMP_MODE';

export type RoverTerrainStress = 'SMOOTH' | 'ROUGH_SLOPE' | 'STORM_GRIT' | 'IMPACT';

export interface RoverDurabilityData {
  integrity: number; // 0 to 100
  status: RoverDurabilityStatus;
  terrainStress: RoverTerrainStress;
  collisionCount: number;
  speedMultiplier: number; // 1.0 optimal down to 0.30 limp-home mode
}

export interface GameModeInfo {
  id: GameMode;
  name: string;
  tagline: string;
  description: string;
  icon: string;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: 'mission',
    name: 'Mission Mode',
    tagline: '6 Core Story Missions & Quiz',
    description: 'Complete 6 expedition directives, field-test & repair the Rover, uplink to Earth, and earn your Explorer Medal!',
    icon: '🎯',
  },
  {
    id: 'survival',
    name: 'Survival Mode',
    tagline: 'Manage Oxygen & Reach Checkpoints',
    description: 'Oxygen decreases over time. Locate refill stations, survive the harsh Martian climate, and respawn at active checkpoints.',
    icon: '💨',
  },
  {
    id: 'exploration',
    name: 'Exploration Mode',
    tagline: 'Free Roam & Science Discovery',
    description: 'Relaxed free exploration with infinite oxygen. Read educational tablets, find crystals, and admire Mars landmarks.',
    icon: '🧭',
  },
  {
    id: 'multiplayer',
    name: 'Multiplayer Mode',
    tagline: 'Explore Alongside Cadet Crew',
    description: '4 simulated astronaut teammates roam Mars with you. Share discovery alerts, live chat feed, and co-op tasks!',
    icon: '👥',
  },
  {
    id: 'trivia',
    name: 'Trivia Expedition',
    tagline: 'Field Discovery Quizzes & XP',
    description: 'Explore Mars freely as randomized science trivia encounters trigger across terrain, awarding Bonus XP & streak rewards!',
    icon: '🧠',
  },
];

export interface CrystalData {
  id: number;
  name: string;
  mineralType: string;
  scientificFact: string;
  position: [number, number, number];
  collected: boolean;
  color: string;
  points: number;
}

export interface CheckpointData {
  id: string;
  name: string;
  position: [number, number, number];
  activated: boolean;
  description: string;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  instructions: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  rewardPoints: number;
  rewardOxygen?: number;
  rewardText: string;
  targetLocation?: [number, number, number];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MultiplayerAstronaut {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  targetPosition: [number, number, number];
  rotationY: number;
  walkCycle: number;
  isMoving: boolean;
  currentAction: string;
}

export type GameScreen = 'title' | 'playing' | 'paused' | 'quiz' | 'victory' | 'gameover' | 'roverInfo' | 'baseInfo' | 'photo';

export interface InteractivePrompt {
  id: string;
  title: string;
  actionText: string;
  distance: number;
  onInteract: () => void;
}

export interface StationFact {
  id: string;
  title: string;
  icon: string;
  fact: string;
  detail: string;
}

export type DailyBountyCategory =
  | 'collect_crystals'
  | 'reach_location'
  | 'glide_distance'
  | 'drive_rover'
  | 'foot_distance';

export interface DailyBounty {
  id: string;
  dateKey: string;
  title: string;
  description: string;
  icon: string;
  category: DailyBountyCategory;
  targetCount: number;
  currentCount: number;
  unitLabel: string;
  completed: boolean;
  claimed: boolean;
  rewardScore: number;
  rewardBadge: string;
  targetLocation?: {
    x: number;
    z: number;
    radius: number;
    label: string;
  };
}

export interface DailyBountyBoardState {
  dateKey: string;
  bounties: DailyBounty[];
  grandBonusClaimed: boolean;
  grandBonusPoints: number;
}

export type TriviaCategory =
  | 'Geology'
  | 'Atmosphere'
  | 'Missions'
  | 'Moons & Orbit'
  | 'Human Survival'
  | 'Astrobiology & Water';

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export interface TriviaStats {
  answeredCount: number;
  correctCount: number;
  streak: number;
  bestStreak: number;
  totalXpEarned: number;
  scanMeters: number;
  scanThreshold: number;
}

export type HistoryEra =
  | 'Ancient Mars'
  | 'First Landers'
  | 'Robotic Scouts'
  | 'Colony Era';

export interface HistoryTabletData {
  id: string;
  title: string;
  era: HistoryEra;
  yearLabel: string;
  locationName: string;
  regionHint: string;
  position: [number, number, number];
  loreText: string;
  historianBadge: string;
  badgeIcon: string;
  xpReward: number;
  color: string;
  discovered: boolean;
}

export interface HistorianRankTier {
  id: string;
  title: string;
  requiredCount: number;
  icon: string;
  bonusXp: number;
}

export interface RoverDriveTelemetry {
  speedKmh: number;
  gear: 'P' | 'D' | 'R' | 'BOOST';
  boostActive: boolean;
  boostEnergy: number; // 0..100
  lightsOn: boolean;
  isAirborne: boolean;
  jumpCost: number;
  isDrifting: boolean;
  driftIntensity: number; // 0..1
}

export interface HiddenAreaData {
  id: string;
  name: string;
  category: 'cave' | 'secret_lab';
  position: [number, number, number];
  radius: number;
  description: string;
  scienceFact: string;
  xpReward: number;
  badgeName: string;
  color: string;
  discovered: boolean;
}

export interface LabExperiment {
  id: string;
  title: string;
  icon: string;
  category: string;
  safetyNote: string;
  summary: string;
  setupDescription: string;
  paramLabel: string;
  paramUnit: string;
  minVal: number;
  maxVal: number;
  idealRange: [number, number];
  step: number;
  defaultVal: number;
  outcomeSuccess: string;
  outcomeFact: string;
  xpReward: number;
}

export interface SatelliteRelayData {
  id: string;
  name: string;
  orbitLink: string;
  position: [number, number, number];
  targetAzimuth: number;
  targetElevation: number;
  targetFreqMhz: number;
  aligned: boolean;
  xpReward: number;
  signalFact: string;
}

export type RoverRoofAddon = 'solar' | 'cargo' | 'radar' | 'turbo';

export type RoverWheelStyle = 'standard' | 'gold_alloy' | 'cyan_mag' | 'amber_heavy';

export interface RoverCustomization {
  chassisColor: string;
  trimColor: string;
  solarTint: string;
  wheelStyle: RoverWheelStyle;
  headlightTint: string;
  roofAddon: RoverRoofAddon;
  roverNameTag: string;
}

export type AutoPilotCategory =
  | 'objective'
  | 'landmark'
  | 'crystal'
  | 'hidden_area'
  | 'satellite'
  | 'checkpoint';

export interface AutoPilotWaypoint {
  id: string;
  title: string;
  category: AutoPilotCategory;
  x: number;
  z: number;
  icon: string;
  subtitle?: string;
}

export interface AutoPilotState {
  active: boolean;
  target: AutoPilotWaypoint | null;
  distanceMeters: number;
  etaSeconds: number;
  avoidingObstacle: boolean;
  reversingRecovery: boolean;
}

export interface RoverEngineUpgrades {
  topSpeedLevel: number; // 0..5
  boostRecoveryLevel: number; // 0..5
  availableCrystals: number;
  totalCrystalsEarned: number;
  totalCrystalsSpent: number;
}

export type LeaderboardFilter = 'all' | 'trivia' | 'quiz';

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  suitColor: SuitColor;
  correctCount: number;
  answeredCount: number;
  bestStreak: number;
  triviaCorrect: number;
  triviaAnswered: number;
  quizCorrect: number;
  quizAnswered: number;
  bestQuizScore: number;
  xpEarned: number;
  updatedAt: number;
}

export interface LocalLeaderboardProfile extends LeaderboardEntry {
  currentQuizStreak: number;
  pendingSync: boolean;
}
