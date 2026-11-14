import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMarsTerrain, getMarsHeight } from './terrain';
import { setupMarsEnvironment, MarsEnvironmentAssets } from './environment';
import { createRobloxAstronaut, AstronautCharacter } from './characters/AstronautModel';
import { createMarsRover, RoverObject } from './models/RoverModel';
import { createResearchBase, BaseObject } from './models/BaseModel';
import { createCrystalManager, CrystalManager } from './models/CrystalModel';
import { createTabletManager, TabletManager } from './models/TabletModel';
import { createHiddenAreasManager, HiddenAreasManager } from './models/HiddenAreasModel';
import { createUndergroundBase, UndergroundBaseObject, UNDERGROUND_CHAMBER_Y } from './models/UndergroundBaseModel';
import { createSatelliteRelayManager, SatelliteRelayManager } from './models/SatelliteRelayModel';
import { createMultiplayerSystem, MultiplayerSystem } from './characters/MultiplayerSystem';
import { RemotePlayersManager } from './characters/RemotePlayersManager';
import { createCheckpointManager, CheckpointManager } from './models/CheckpointModel';
import { createOrbitCamera, OrbitCameraControls } from './camera/OrbitCamera';
import { WeatherSystem } from './weather';
import { WindSystem } from './wind';
import { DayNightSystem } from './dayNight';
import { TrailSystem } from './effects/TrailSystem';
import { FlightEffects } from './effects/FlightEffects';
import { CollisionWorld, ColliderOptions } from './physics/CollisionWorld';
import { CrystalData, InteractivePrompt, Mission, CheckpointData, GameMode, SUIT_COLORS, SuitColor, WeatherData, DayNightData, FlightData, WindData, HistoryTabletData, RoverDurabilityData, RoverDriveTelemetry, HiddenAreaData, SatelliteRelayData, StaminaActivityState, StaminaData, RoverCustomization, RoverEngineUpgrades, AutoPilotWaypoint, AutoPilotState } from '../types/game';
import { PingBeaconData, RemotePlayerState, RoomSnapshot, SharedRoverState } from '../types/multiplayer';
import { INITIAL_CHECKPOINTS } from '../data/missionsAndQuiz';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant } from '../audio/VoiceAssistant';
import { detectDevicePerformanceProfile, DevicePerformanceProfile } from './deviceProfile';
import { OfflineExpeditionSave } from '../data/offlineSave';
import { loadCameraFov, saveCameraFov } from '../utils/cameraSettings';

// Pre-allocated math objects to eliminate garbage collection inside animation loop
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _roverVec = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _windPush = new THREE.Vector3();
const _leftWingTip = new THREE.Vector3();
const _rightWingTip = new THREE.Vector3();
const _resolvedXZ = { x: 0, z: 0 };
const _resolvedVel = { x: 0, z: 0 };

// Martian surface gravity: ~38% of Earth's 9.81 m/s²
const MARS_GRAVITY = -3.72;
const MARS_JUMP_VELOCITY = 5.65;
const PLAYER_COLLISION_RADIUS = 0.52;
const PLAYER_HEIGHT = 2.05;

export interface GameEngineCallbacks {
  onOxygenChange: (oxygen: number) => void;
  onOxygenAlert: (message: string) => void;
  onScoreChange: (score: number) => void;
  onCrystalsChange: (collectedCount: number) => void;
  onCrystalBankCredit?: (amount: number) => void;
  onMissionProgress: (missionId: number, current: number, completed: boolean) => void;
  onCheckpointChange: (checkpoint: CheckpointData) => void;
  onInteractivePromptChange: (prompt: InteractivePrompt | null) => void;
  onPlayerPositionChange?: (
    pos: { x: number; z: number },
    heading: number,
    roverPos: { x: number; z: number }
  ) => void;
  onWeatherChange?: (weather: WeatherData) => void;
  onTimeUpdate?: (timeData: DayNightData) => void;
  onFlightUpdate?: (flight: FlightData) => void;
  onWindUpdate?: (wind: WindData) => void;
  onStaminaChange?: (stamina: StaminaData) => void;
  onRoverDurabilityChange?: (durability: RoverDurabilityData) => void;
  onRoverDriveTelemetryChange?: (telemetry: RoverDriveTelemetry) => void;
  onUndergroundStateChange?: (isUnderground: boolean) => void;
  onHiddenAreaDiscover?: (area: HiddenAreaData, allAreas: HiddenAreaData[]) => void;
  onOpenQuiz: () => void;
  onOpenRoverComm: () => void;
  onOpenBaseInfo: () => void;
  onOpenScienceLab?: () => void;
  onOpenSatelliteRelay?: (relay: SatelliteRelayData) => void;
  onGameOver: () => void;
  onVictory: () => void;
  onRoverHeadlightsChange?: (enabled: boolean) => void;
  onAutoPilotChange?: (state: AutoPilotState) => void;
  onNotification: (title: string, message: string, type?: 'normal' | 'warning' | 'success') => void;
  // Real-time multiplayer outgoing callbacks
  onLocalStateSync?: (state: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
    speed: number;
    isRunning: boolean;
    isGrounded: boolean;
    isJumping: boolean;
    isDrivingRover: boolean;
    isGliding?: boolean;
  }) => void;
  onLocalRoverSync?: (x: number, y: number, z: number, rotationY: number, headlightsOn: boolean) => void;
  onLocalRoverDriveToggle?: (entering: boolean) => void;
  onLocalRoverHeadlightsToggle?: (headlightsOn: boolean) => void;
  onLocalCrystalCollect?: (crystalId: number) => void;
  onLocalCheckpointActivate?: (checkpointId: string) => void;
  onLocalMissionComplete?: (missionId: number) => void;
  onLocalTowerActivate?: () => void;
  // Daily Bounty progress callbacks
  onBountyProgressDelta?: (delta: {
    crystals?: number;
    glideMeters?: number;
    roverMeters?: number;
    footMeters?: number;
  }) => void;
  onBountyTargetReached?: (bountyId: string) => void;
  // Trivia Expedition callbacks
  onTriviaTrigger?: (nextThreshold: number) => void;
  onTriviaScanProgress?: (scanMeters: number, scanThreshold: number) => void;
  // Mars History Lore Tablet callback
  onTabletDiscover?: (tablet: HistoryTabletData) => void;
}

export class MarsGameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private orbitControls!: OrbitCameraControls;
  private isSoftwareGl: boolean = false;
  private deviceProfile!: DevicePerformanceProfile;
  private currentPixelRatio: number = 1;
  private shadowUpdateInterval: number = 1;
  private shadowFrameCounter: number = 0;
  private fpsAccumTime: number = 0;
  private fpsFrameCount: number = 0;
  private slowFpsWindows: number = 0;
  private fastFpsWindows: number = 0;
  private frameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Scene entities
  private terrainMesh!: THREE.Mesh;
  private terrainTex!: THREE.CanvasTexture;
  private environmentAssets!: MarsEnvironmentAssets;
  private weatherSystem!: WeatherSystem;
  private windSystem!: WindSystem;
  private dayNightSystem!: DayNightSystem;
  private trailSystem!: TrailSystem;
  private flightEffects!: FlightEffects;
  private player!: AstronautCharacter;
  private rover!: RoverObject;
  private base!: BaseObject;
    private crystalManager!: CrystalManager;
  private tabletManager!: TabletManager;
  private hiddenAreasManager!: HiddenAreasManager;
  private undergroundBase!: UndergroundBaseObject;
  private satelliteRelayManager!: SatelliteRelayManager;
  private multiplayer!: MultiplayerSystem;
  private remotePlayers!: RemotePlayersManager;
  private checkpointManager!: CheckpointManager;
  private poiPoolLights: THREE.PointLight[] = [];
  private contactShadow!: THREE.Mesh;
  private collisionWorld: CollisionWorld = new CollisionWorld();
  private localPlayerId: string = 'local-player';
  private isLiveRoomActive: boolean = false;
  private remoteRoverDriverName: string | null = null;

  // Player physics, Mars gravity & Sky-inspired flight state
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerVelocityY: number = 0;
  private airVelX: number = 0;
  private airVelZ: number = 0;
  private playerHeading: number = 0;
  private bankAngle: number = 0;
  private isGrounded: boolean = true;
  private isJumping: boolean = false;
  private isGliding: boolean = false;
  private flightEnergy: number = 100;
  private flightUiTimer: number = 0;
  private stamina: number = 100;
  private isStaminaExhausted: boolean = false;
  private staminaActivityState: StaminaActivityState = 'RECOVERING';
  private staminaSpeedMultiplier: number = 1.0;
  private staminaUiTimer: number = 0;
  private hasWarnedExhausted: boolean = false;
  private isRunningInput: boolean = false;
  private cameraTurnHold: number = 0;
  private currentSpeed: number = 0;
  private metersWalked: number = 0;

  // Rover Drive Mode, Pedals, Boost & Durability Telemetry
  private isDrivingRover: boolean = false;
  private miniMapTimer: number = 0;
  private roverDurabilityTimer: number = 0;
  private roverTelemetryTimer: number = 0;
  private roverPedalState = { forward: 0, turn: 0, boost: false };
  private lastRoverTelemetry: RoverDriveTelemetry | null = null;
  private roverWarned60: boolean = false;
  private roverWarned30: boolean = false;
  private roverWarned0: boolean = false;
  private roverDriftDustTimer: number = 0;
  private roverLowBoostWarnTimer: number = 0;
  private creditedCrystalIds: Set<number> = new Set();

  // Rover Auto-Pilot Waypoint Navigation State (Zero-GC)
  private autopilotBeaconGroup!: THREE.Group;
  private autopilotRingMesh!: THREE.Mesh;
  private autopilotTarget: AutoPilotWaypoint | null = null;
  private autopilotAvoiding: boolean = false;
  private autopilotReverseTimer: number = 0;
  private autopilotReverseTurnSign: number = 1;
  private autopilotProgressTimer: number = 0;
  private autopilotLastCheckX: number = 0;
  private autopilotLastCheckZ: number = 0;
  private autopilotUiTimer: number = 0;
  private lastAutopilotUiState: AutoPilotState | null = null;
  private readonly _autopilotSteerScratch = {
    turnInput: 0,
    forwardScale: 1,
    avoiding: false,
  };

  // Underground Base & Expedition Extension State
  private isInsideUndergroundBase: boolean = false;
  private hasEnteredUndergroundOnce: boolean = false;
  private completedLabExperiments: Set<string> = new Set();

  // Mode and Oxygen state
  private gameMode: GameMode = 'mission';
  private oxygen: number = 100;
  private lastEmittedOxygen: number = 100;
  private oxygenThrottleTimer: number = 0;
  private score: number = 0;
  private crystalsCollected: number = 0;
  private hasWarned30: boolean = false;
  private hasWarned15: boolean = false;
  private hasSpokenGameStart: boolean = false;
  private hasDiscoveredRover: boolean = false;
  private hasDiscoveredBase: boolean = false;
  private wasInsideBaseAirlock: boolean = false;
  private missionAreaZone: 'none' | 'rover_mission' | 'tower_mission' = 'none';
  private discoveredCrystalIds: Set<number> = new Set();
  private isEngineRunning: boolean = false;

  // CPU Optimization & Event Throttling Caches
  private collisionCheckTimer: number = 0;
  private promptCheckTimer: number = 0;
  private lastPromptId: string | null = null;
  private lastEmittedPlayerX: number = 0;
  private lastEmittedPlayerZ: number = 0;
  private lastEmittedPlayerHeading: number = 0;

  // Input state
  private keysHeld = new Set<string>();
  private joystickVector = { x: 0, y: 0 };
  private cleanupListeners: (() => void)[] = [];

  // Active missions local state
  private missionsState: Map<number, { current: number; completed: boolean }> = new Map();

  // Daily Bounty 3D location beacon & batched movement accumulators
  private bountyBeaconGroup!: THREE.Group;
  private bountyDiamondMesh!: THREE.Mesh;
  private activeBountyTarget: { id: string; x: number; z: number; radius: number } | null = null;
  private bountyGlideAccum: number = 0;
  private bountyRoverAccum: number = 0;
  private bountyFootAccum: number = 0;
  private bountyFlushTimer: number = 0;

  // Trivia Expedition random encounter tracker
  private triviaTravelAccum: number = 0;
  private triviaNextThreshold: number = 32;
  private triviaCooldownTimer: number = 4;
  private triviaUiTimer: number = 0;
  private lastTriviaScanMeters: number = -1;
  private lastTriviaScanThreshold: number = -1;

  // Telemetry deduplication caches & pre-allocated sync payload (zero per-frame React/GC churn)
  private lastFlightTelemetry: FlightData | null = null;
  private lastStaminaTelemetry: StaminaData | null = null;
  private lastRoverDurabilityTelemetry: RoverDurabilityData | null = null;
  private readonly _localSyncPayload = {
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    speed: 0,
    isRunning: false,
    isGrounded: true,
    isJumping: false,
    isDrivingRover: false,
    isGliding: false,
  };

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks, localPlayerId: string = 'local-player') {
    this.container = container;
    this.callbacks = callbacks;
    this.localPlayerId = localPlayerId;

    this.detectGpuAndInitRenderer();
    this.initSceneAndLighting();
    this.initWorldEntities();
    this.setupInputHandlers();
    this.initMissionsState();
  }

  private detectGpuAndInitRenderer() {
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.deviceProfile = detectDevicePerformanceProfile();
    this.currentPixelRatio = this.isSoftwareGl ? 1 : this.deviceProfile.initialPixelRatio;
    this.shadowUpdateInterval = this.isSoftwareGl ? 1 : this.deviceProfile.shadowUpdateInterval;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.deviceProfile.antialias,
      powerPreference: 'high-performance',
      alpha: false,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = this.deviceProfile.shadowMapType;
    if (!this.isSoftwareGl && this.shadowUpdateInterval > 1) {
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);
  }

  private initSceneAndLighting() {
    this.scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const aspect = (this.container.clientWidth || window.innerWidth) /
                   (this.container.clientHeight || window.innerHeight);
    this.orbitControls = createOrbitCamera(aspect, new THREE.Vector3(0, 1.2, 0), loadCameraFov());

    const cleanupCam = this.orbitControls.setupTouchAndMouseListeners(this.renderer.domElement);
    this.cleanupListeners.push(cleanupCam);
  }

  private initWorldEntities() {
    // 1. Mars Terrain (scaled mesh density per device tier)
    const { mesh: terrain, texture: tTex } = createMarsTerrain(this.deviceProfile.terrainSegments);
    this.terrainMesh = terrain;
    this.terrainTex = tTex;
    this.scene.add(this.terrainMesh);

    // 2. Atmospheric Environment, Dynamic Day-Night Cycle & Weather
    this.environmentAssets = setupMarsEnvironment(this.scene, this.isSoftwareGl, {
      dustCount: this.deviceProfile.dustCount,
      shadowMapSize: this.deviceProfile.shadowMapSize,
      shadowFrustum: this.deviceProfile.shadowFrustum,
    });
    this.dayNightSystem = new DayNightSystem(
      this.scene,
      this.environmentAssets.sunLight,
      this.environmentAssets.hemiLight,
      this.environmentAssets.skyDome,
      this.environmentAssets.phobos,
      this.environmentAssets.deimos,
      {
        onTimeUpdate: (d) => this.callbacks.onTimeUpdate?.(d),
      },
      this.deviceProfile.starCount
    );
    this.weatherSystem = new WeatherSystem(
      this.scene,
      this.environmentAssets.sunLight,
      this.environmentAssets.hemiLight,
      {
        onWeatherUpdate: (w) => this.callbacks.onWeatherChange?.(w),
        onStormWarning: (secs) => {
          this.callbacks.onNotification(
            '⚠️ DUST STORM WARNING',
            `Approaching Martian dust storm in ${secs}s! Seek shelter at Base or Rover to protect O2.`,
            'warning'
          );
        },
        onStormStart: () => {
          this.callbacks.onNotification(
            '🌪️ DUST STORM ACTIVE!',
            'Heavy winds & swirling dust! Visibility low · O2 consumption surged to 2.5x outside shelter.',
            'warning'
          );
        },
        onStormEnd: () => {
          this.callbacks.onNotification(
            '☀️ STORM CLEARED',
            'Martian skies clearing. Visibility restored and life support stabilized.',
            'success'
          );
        },
      },
      this.deviceProfile.stormCount
    );

    // 3. Player Character
    this.player = createRobloxAstronaut('#f8fafc', 'Commander', 'Mars Explorer');
    const spawnX = 0;
    const spawnZ = 0;
    const spawnY = getMarsHeight(spawnX, spawnZ);
    this.playerPos.set(spawnX, spawnY, spawnZ);
    this.player.group.position.copy(this.playerPos);
    this.scene.add(this.player.group);

    // Player Ground Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a0505,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.set(spawnX, spawnY + 0.04, spawnZ);
    this.scene.add(this.contactShadow);

    // 4. Driveable Mars Exploration Rover
    this.rover = createMarsRover(28, -24);
    this.scene.add(this.rover.group);

    // 5. Expanded Research Base & Space Station
    this.base = createResearchBase(-40, -32);
    this.scene.add(this.base.group);

    // 6. 10 Scientific Energy Crystals
    this.crystalManager = createCrystalManager();
    this.scene.add(this.crystalManager.group);

    // 6b. 8 Hidden Mars History Lore Tablets
    this.tabletManager = createTabletManager();
    this.scene.add(this.tabletManager.group);

    // 6c. Hidden Martian Caves & Secret Research Sites
    this.hiddenAreasManager = createHiddenAreasManager();
    this.scene.add(this.hiddenAreasManager.group);

    // 6d. Subterranean Underground Mars Research Base & Surface Airlock Elevator
    this.undergroundBase = createUndergroundBase();
    this.scene.add(this.undergroundBase.group);

    // 6e. 3 Surface Satellite Communication Relay Dishes
    this.satelliteRelayManager = createSatelliteRelayManager();
    this.scene.add(this.satelliteRelayManager.group);

    // 7. Checkpoints System
    this.checkpointManager = createCheckpointManager(INITIAL_CHECKPOINTS);
    this.scene.add(this.checkpointManager.group);

    // 8. Trail System & Wind / Flight Visual Effects
    this.trailSystem = new TrailSystem(this.scene);
    const windStreakCount =
      this.deviceProfile.tier === 'phone' ? 60 : this.deviceProfile.tier === 'tablet' ? 85 : 110;
    this.windSystem = new WindSystem(
      this.scene,
      (wind) => this.callbacks.onWindUpdate?.(wind),
      windStreakCount
    );
    this.flightEffects = new FlightEffects(this.scene);

    // 9. Simulated Multiplayer Astronauts (shown only when NOT in a live friend room)
    this.multiplayer = createMultiplayerSystem(this.trailSystem);
    this.scene.add(this.multiplayer.group);

    // 10. Real-Time Friend Crew Astronauts Manager
    this.remotePlayers = new RemotePlayersManager(this.localPlayerId, this.trailSystem);
    this.scene.add(this.remotePlayers.group);

    // 10b. Daily Bounty 3D Golden Beacon (shown when a location bounty is active)
    this.initDailyBountyBeacon();
    this.initAutoPilotBeacon();

    // 10c. Shared 2-light PointLight pool for nearest active surface POIs (zero shader recompiles)
    for (let i = 0; i < 2; i++) {
      const poiLight = new THREE.PointLight(0xffffff, 0, 14, 1.5);
      poiLight.visible = true;
      this.scene.add(poiLight);
      this.poiPoolLights.push(poiLight);
    }

    // 11. Build Three.js Spatial Collision World (rocks, base buildings, towers, pads, tablets, rover, caves, underground, relays)
    this.collisionWorld.clear();
    this.environmentAssets.rockColliders.forEach((rock, index) => {
      this.collisionWorld.addCylinder({
        id: `mars_rock_${index}`,
        tag: 'rock',
        x: rock.x,
        z: rock.z,
        radius: rock.radius,
        minY: rock.minY,
        maxY: rock.maxY,
        walkableTop: rock.walkableTop,
        stepHeight: rock.walkableTop ? 0.65 : 0.45,
        blocksCamera: rock.radius >= 1.4,
      });
    });
    this.base.registerColliders(this.collisionWorld);
    this.checkpointManager.registerColliders(this.collisionWorld);
    this.tabletManager.registerColliders(this.collisionWorld);
    this.hiddenAreasManager.registerColliders(this.collisionWorld);
    this.undergroundBase.registerColliders(this.collisionWorld);
    this.satelliteRelayManager.registerColliders(this.collisionWorld);
    this.rover.updateCollider(this.collisionWorld);

    // Ensure initial spawn position rests cleanly on pad/ground support
    const initialSupportY = this.getSupportGroundY(spawnX, spawnY + 1, spawnZ);
    this.playerPos.y = initialSupportY;
    this.player.group.position.copy(this.playerPos);
    this.contactShadow.position.set(spawnX, initialSupportY + 0.04, spawnZ);

    // 12. Pre-warm and compile WebGL shaders to eliminate initial camera hitch, then render opening frame
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.orbitControls.camera);
    }
    this.orbitControls.update(this.playerPos, this.playerHeading, 0, false, 0, this.collisionWorld);
    this.renderer.render(this.scene, this.orbitControls.camera);
  }

  /**
   * Registers any newly added Three.js Object3D hierarchy into the solid collision system
   * using a world-space THREE.Box3 bounding box.
   */
  public registerSolidObject(object: THREE.Object3D, options: ColliderOptions & { shrinkXZ?: number } = {}): string | null {
    return this.collisionWorld.addFromObject3D(object, options);
  }

  private getSupportGroundY(x: number, y: number, z: number): number {
    const baseTerrainY = this.isInsideUndergroundBase ? UNDERGROUND_CHAMBER_Y : getMarsHeight(x, z);
    return this.collisionWorld.getFloorSupportY(
      x,
      y,
      z,
      PLAYER_COLLISION_RADIUS,
      baseTerrainY
    );
  }

  private initDailyBountyBeacon() {
    this.bountyBeaconGroup = new THREE.Group();
    this.bountyBeaconGroup.visible = false;

    const ringGeo = new THREE.RingGeometry(2.4, 3.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.14;
    this.bountyBeaconGroup.add(ringMesh);

    const beamGeo = new THREE.CylinderGeometry(0.28, 0.75, 22, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 11.0;
    this.bountyBeaconGroup.add(beamMesh);

    const diamondGeo = new THREE.OctahedronGeometry(0.95, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.2,
    });
    this.bountyDiamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
    this.bountyDiamondMesh.position.y = 3.2;
    this.bountyBeaconGroup.add(this.bountyDiamondMesh);

    this.scene.add(this.bountyBeaconGroup);
  }

  public setDailyBountyTarget(target: { id: string; x: number; z: number; radius: number } | null) {
    this.activeBountyTarget = target;
    if (!this.bountyBeaconGroup) return;
    if (!target) {
      this.bountyBeaconGroup.visible = false;
      return;
    }
    const groundY = getMarsHeight(target.x, target.z);
    this.bountyBeaconGroup.position.set(target.x, groundY, target.z);
    this.bountyBeaconGroup.visible = true;
  }

  private initAutoPilotBeacon() {
    this.autopilotBeaconGroup = new THREE.Group();
    this.autopilotBeaconGroup.visible = false;

    const apRingGeo = new THREE.RingGeometry(2.0, 2.7, 32);
    apRingGeo.rotateX(-Math.PI / 2);
    const apRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.autopilotRingMesh = new THREE.Mesh(apRingGeo, apRingMat);
    this.autopilotRingMesh.position.y = 0.18;
    this.autopilotBeaconGroup.add(this.autopilotRingMesh);

    const apBeamGeo = new THREE.CylinderGeometry(0.18, 0.55, 18, 14, 1, true);
    const apBeamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const apBeamMesh = new THREE.Mesh(apBeamGeo, apBeamMat);
    apBeamMesh.position.y = 9.0;
    this.autopilotBeaconGroup.add(apBeamMesh);

    this.scene.add(this.autopilotBeaconGroup);
  }

  private initMissionsState() {
    for (let i = 1; i <= 9; i++) {
      this.missionsState.set(i, { current: 0, completed: false });
    }
  }

  private setupInputHandlers() {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      if (!this.isEngineRunning) return;
      this.keysHeld.add(e.code);

      if (e.code === 'KeyE') {
        this.triggerInteraction();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          if (this.isDrivingRover) {
            this.triggerRoverJump();
          } else {
            this.triggerJump();
          }
        }
      }
      if (e.code === 'KeyV' && !e.repeat && this.isDrivingRover) {
        this.triggerRoverHorn();
      }
      if ((e.code === 'KeyG' || e.code === 'KeyF') && !e.repeat) {
        this.toggleGliding();
      }
      if (e.code === 'KeyR') {
        this.resetCamera();
      }
      if (e.code === 'KeyL') {
        this.toggleRoverHeadlights();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.isRunningInput = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.isRunningInput = false;
      }
    };

    const onWindowBlur = () => {
      this.keysHeld.clear();
      this.joystickVector = { x: 0, y: 0 };
      this.isRunningInput = false;
      this.cameraTurnHold = 0;
    };

    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.deviceProfile.maxPixelRatio));
      this.renderer.setSize(w, h);
      this.orbitControls.camera.aspect = w / h;
      this.orbitControls.camera.updateProjectionMatrix();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      resizeObserver = new ResizeObserver(() => {
        onResize();
      });
      resizeObserver.observe(this.container);
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        this.keysHeld.clear();
        this.joystickVector = { x: 0, y: 0 };
        this.isRunningInput = false;
        this.cameraTurnHold = 0;
      } else {
        this.clock.getDelta();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);

    this.cleanupListeners.push(() => {
      resizeObserver?.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
    if (mode === 'exploration' || mode === 'trivia') {
      this.oxygen = 100;
      this.hasWarned30 = false;
      this.hasWarned15 = false;
      this.callbacks.onOxygenChange(100);
    }
    if (mode === 'trivia') {
      this.triviaTravelAccum = 0;
      this.triviaNextThreshold = Math.round(24 + Math.random() * 16);
      this.triviaCooldownTimer = 3;
      this.callbacks.onTriviaScanProgress?.(0, this.triviaNextThreshold);
    }
    this.multiplayer.group.visible =
      !this.isInsideUndergroundBase && !this.isLiveRoomActive && (mode === 'multiplayer' || mode === 'mission');
    if (this.isEngineRunning || this.hasSpokenGameStart) {
      this.syncMusicForCurrentMode();
    }
  }

  private syncMusicForCurrentMode() {
    if (this.isInsideUndergroundBase || this.wasInsideBaseAirlock) {
      sounds.crossfadeTracks('research_base', 2.0);
      return;
    }

    const useAstroneerChill = sounds.getSettings().astroneerSoundtrack;
    const m4Done = this.missionsState.get(4)?.completed ?? false;
    const m5Done = this.missionsState.get(5)?.completed ?? false;
    const isFinalMissionStage =
      (this.gameMode === 'mission' || this.gameMode === 'multiplayer') &&
      ((m4Done && !m5Done) || this.base.isTowerActivated);

    if (isFinalMissionStage) {
      sounds.crossfadeTracks('final_mission', 2.0);
    } else if (this.gameMode === 'exploration' || this.gameMode === 'trivia') {
      if (this.missionAreaZone === 'tower_mission') {
        sounds.crossfadeTracks('final_mission', 2.0);
      } else if (this.missionAreaZone === 'rover_mission') {
        sounds.crossfadeTracks('mission', 2.0);
      } else {
        sounds.crossfadeTracks(useAstroneerChill ? 'astroneer_chill' : 'exploration', 2.0);
      }
    } else if (this.gameMode === 'survival') {
      sounds.crossfadeTracks(
        this.oxygen <= 30 ? 'survival_low_o2' : 'survival',
        this.oxygen <= 30 ? 1.2 : 2.0
      );
    } else {
      sounds.crossfadeTracks(useAstroneerChill ? 'astroneer_chill' : 'mission', 2.0);
    }
  }

  public refreshMusicTrack() {
    if (this.isEngineRunning || this.hasSpokenGameStart) {
      this.syncMusicForCurrentMode();
    }
  }

  private currentSuitColor: SuitColor = 'white';

  public setSuitColor(colorId: string) {
    const config = SUIT_COLORS.find((c) => c.id === colorId) || SUIT_COLORS[0];
    this.currentSuitColor = config.id;
    this.player.setSuitColor(config.hex, config.accent);
  }

  public setPlayerNameTag(name: string) {
    this.player.setNameTagText(name.trim() || 'Commander', this.isLiveRoomActive ? 'Crew Explorer' : 'Mars Explorer');
  }

  public setLiveRoomActive(active: boolean) {
    this.isLiveRoomActive = active;
    this.multiplayer.group.visible =
      !this.isInsideUndergroundBase && !active && (this.gameMode === 'multiplayer' || this.gameMode === 'mission');
    if (!active) {
      this.remotePlayers.clearAll();
      this.remoteRoverDriverName = null;
    }
  }

  public setJoystickVector(vx: number, vy: number) {
    this.joystickVector = { x: vx, y: vy };
    // If joystick is pushed firmly towards the edge (>0.7), trigger sprint
    const len = Math.hypot(vx, vy);
    if (len > 0.75) {
      this.isRunningInput = true;
    } else if (len < 0.3) {
      this.isRunningInput = false;
    }
  }

  public setRunning(running: boolean) {
    this.isRunningInput = running;
  }

  public toggleRunning() {
    this.isRunningInput = !this.isRunningInput;
    return this.isRunningInput;
  }

  public triggerJump() {
    if (this.isDrivingRover) return;

    if (this.isGrounded) {
      // Mars low-gravity launch jump (~38% Earth gravity), consumes stamina
      const jumpCost = 12;
      const jumpPowerScale = this.isStaminaExhausted ? 0.80 : 1.0;
      this.stamina = Math.max(0, this.stamina - jumpCost);
      if (this.stamina <= 0.05) {
        this.stamina = 0;
        this.isStaminaExhausted = true;
      }
      this.staminaActivityState = this.isStaminaExhausted ? 'EXHAUSTED' : 'JUMPING';

      this.isGrounded = false;
      this.isJumping = true;
      this.isGliding = false;
      this.playerVelocityY = MARS_JUMP_VELOCITY * jumpPowerScale;
      sounds.playJump();
      this.emitFlightTelemetry();
      this.emitStaminaTelemetry();
      return;
    }

    // Mid-air Sky-inspired progression: open glider if folded, or perform wing flap boost!
    if (!this.isGliding) {
      this.setGliding(true);
    } else {
      this.triggerWingFlap();
    }
  }

  public triggerWingFlap() {
    if (this.isDrivingRover || this.isGrounded) return;
    if (this.flightEnergy < 12) {
      this.callbacks.onNotification(
        'LOW FLIGHT ENERGY',
        'Touch down on Mars terrain or collect an Energy Crystal to recharge wings!',
        'warning'
      );
      return;
    }

    this.flightEnergy = Math.max(0, this.flightEnergy - 14);
    this.playerVelocityY = Math.max(this.playerVelocityY + 3.4, 4.35);
    this.player.triggerWingFlapPose();
    sounds.playWingFlap();

    // Burst golden-cyan energy motes from both wingtips
    this.player.leftWingTip.getWorldPosition(_leftWingTip);
    this.player.rightWingTip.getWorldPosition(_rightWingTip);
    this.flightEffects.emitWingtipTrails(0.05, _leftWingTip, _rightWingTip, true);

    this.emitFlightTelemetry();
  }

  public setGliding(active: boolean) {
    if (this.isDrivingRover) {
      this.isGliding = false;
      return;
    }

    if (active) {
      if (this.flightEnergy < 5) {
        this.callbacks.onNotification(
          'FLIGHT ENERGY DEPLETED',
          'Land on the Martian surface to regenerate flight energy.',
          'warning'
        );
        return;
      }
      if (this.isGrounded) {
        // Launch off ground smoothly into a glide when pressing Glide while grounded
        this.isGrounded = false;
        this.isJumping = true;
        this.playerVelocityY = 3.9;
        const speed = Math.max(6.8, this.currentSpeed);
        this.airVelX = Math.sin(this.playerHeading) * speed;
        this.airVelZ = Math.cos(this.playerHeading) * speed;
      }
      if (!this.isGliding) {
        this.isGliding = true;
        sounds.playGlideOpen(true);
      }
    } else if (this.isGliding) {
      this.isGliding = false;
      this.bankAngle = 0;
      sounds.playGlideOpen(false);
    }

    this.emitFlightTelemetry();
  }

  public toggleGliding(): boolean {
    this.setGliding(!this.isGliding);
    return this.isGliding;
  }

  private emitFlightTelemetry(force = false) {
    const groundY = this.getSupportGroundY(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    const energy = Number(this.flightEnergy.toFixed(1));
    const isGliding = this.isGliding;
    const isAirborne = !this.isGrounded;
    const isRegenerating = (this.isGrounded || this.isDrivingRover) && this.flightEnergy < 100;
    const verticalSpeed = Number(this.playerVelocityY.toFixed(1));
    const airSpeed = Number(Math.hypot(this.airVelX, this.airVelZ).toFixed(1));
    const altitude = Math.max(0, Number((this.playerPos.y - groundY).toFixed(1)));

    const prev = this.lastFlightTelemetry;
    if (
      !force &&
      prev &&
      prev.energy === energy &&
      prev.isGliding === isGliding &&
      prev.isAirborne === isAirborne &&
      prev.isRegenerating === isRegenerating &&
      prev.verticalSpeed === verticalSpeed &&
      prev.airSpeed === airSpeed &&
      prev.altitude === altitude
    ) {
      return;
    }

    const next: FlightData = {
      energy,
      isGliding,
      isAirborne,
      isRegenerating,
      verticalSpeed,
      airSpeed,
      altitude,
    };
    this.lastFlightTelemetry = next;
    this.callbacks.onFlightUpdate?.(next);
  }

  private emitStaminaTelemetry(force = false) {
    const stamina = Math.round(this.stamina * 10) / 10;
    const isExhausted = this.isStaminaExhausted;
    const activityState = this.staminaActivityState;
    const movementSpeedMps = Number(this.currentSpeed.toFixed(1));
    const speedMultiplier = Number(this.staminaSpeedMultiplier.toFixed(2));

    const prev = this.lastStaminaTelemetry;
    if (
      !force &&
      prev &&
      prev.stamina === stamina &&
      prev.isExhausted === isExhausted &&
      prev.activityState === activityState &&
      prev.movementSpeedMps === movementSpeedMps &&
      prev.speedMultiplier === speedMultiplier
    ) {
      return;
    }

    const next: StaminaData = {
      stamina,
      maxStamina: 100,
      isExhausted,
      activityState,
      movementSpeedMps,
      speedMultiplier,
    };
    this.lastStaminaTelemetry = next;
    this.callbacks.onStaminaChange?.(next);
  }

  public resetCamera() {
    const heading = this.isDrivingRover ? this.rover.rotationY : this.playerHeading;
    this.orbitControls.resetCamera(heading);
    sounds.playClick();
  }

  public rotateCamera(deltaYaw: number, deltaPitch: number = 0) {
    this.orbitControls.rotateBy(deltaYaw, deltaPitch);
  }

  public setCameraTurnHold(direction: -1 | 0 | 1) {
    this.cameraTurnHold = direction;
  }

  public setCameraFov(fovDeg: number) {
    const saved = saveCameraFov(fovDeg);
    this.orbitControls.setFov(saved);
    if (this.renderer && this.scene) {
      this.renderer.render(this.scene, this.orbitControls.camera);
    }
  }

  public getCameraFov(): number {
    return this.orbitControls.getFov();
  }

  public toggleRoverDrive(): boolean {
    if (!this.isDrivingRover && this.remoteRoverDriverName) {
      this.callbacks.onNotification(
        'ROVER IN USE',
        `${this.remoteRoverDriverName} is currently driving the Curiosity Rover!`,
        'warning'
      );
      return false;
    }

    this.isDrivingRover = !this.isDrivingRover;
    this.isGliding = false;
    sounds.playRoverInteract();
    this.callbacks.onLocalRoverDriveToggle?.(this.isDrivingRover);

    if (this.isDrivingRover) {
      // Board rover
      this.player.group.visible = false;
      this.contactShadow.visible = false;
      sounds.setRoverEngineState(true, 0.15);
      this.callbacks.onNotification(
        'ROVER DRIVE MODE ACTIVE',
        'Use joystick or WASD to drive the Curiosity Rover across Mars!',
        'success'
      );
    } else {
      // Exit rover cleanly beside chassis without overlapping rocks/structures
      if (this.autopilotTarget) {
        this.cancelRoverAutoPilot('reset');
      }
      sounds.setRoverEngineState(false, 0);
      this.player.group.visible = true;
      this.contactShadow.visible = true;
      const exitX = this.rover.position[0] + 2.6;
      const exitZ = this.rover.position[2];
      const baseExitY = getMarsHeight(exitX, exitZ);
      this.collisionWorld.resolveHorizontalCollision(
        exitX,
        baseExitY,
        exitZ,
        PLAYER_COLLISION_RADIUS,
        PLAYER_HEIGHT,
        _resolvedXZ
      );
      const exitGroundY = this.getSupportGroundY(_resolvedXZ.x, baseExitY + 1.0, _resolvedXZ.z);
      this.playerPos.set(_resolvedXZ.x, exitGroundY, _resolvedXZ.z);
      this.player.group.position.copy(this.playerPos);
      this.callbacks.onNotification(
        'EXITED ROVER',
        'Astronaut on foot in spacesuit mode.',
        'normal'
      );
    }
    this.emitFlightTelemetry();
    return this.isDrivingRover;
  }

  public triggerInteraction() {
    const prompt = this.getCurrentInteractivePrompt();
    if (prompt) {
      sounds.playClick();
      prompt.onInteract();
    }
  }

  private getCurrentInteractivePrompt(): InteractivePrompt | null {
    // --- SUBTERRANEAN UNDERGROUND RESEARCH BASE INTERACTIONS ---
    if (this.isInsideUndergroundBase) {
      const distReturn = Math.hypot(
        this.playerPos.x - this.undergroundBase.undergroundReturnPos[0],
        this.playerPos.z - this.undergroundBase.undergroundReturnPos[2]
      );
      if (distReturn < 4.5) {
        return {
          id: 'ug_return_surface',
          title: 'Subterranean Airlock Lift',
          actionText: 'Ascend to Mars Surface Base',
          distance: distReturn,
          onInteract: () => this.exitUndergroundBase(),
        };
      }

      const distUgLab = Math.hypot(
        this.playerPos.x - this.undergroundBase.undergroundLabBenchPos[0],
        this.playerPos.z - this.undergroundBase.undergroundLabBenchPos[2]
      );
      if (distUgLab < 4.8) {
        return {
          id: 'ug_science_lab',
          title: 'Subterranean Science Laboratory',
          actionText: 'Run Safe Mars Lab Experiments',
          distance: distUgLab,
          onInteract: () => {
            sounds.playComputerInterface();
            this.callbacks.onOpenScienceLab?.();
          },
        };
      }

      const distUgO2 = Math.hypot(
        this.playerPos.x - this.undergroundBase.undergroundO2Pos[0],
        this.playerPos.z - this.undergroundBase.undergroundO2Pos[2]
      );
      if (distUgO2 < 4.5) {
        return {
          id: 'ug_o2_station',
          title: 'Underground Hydroponics O2 Pod',
          actionText: 'Refill Oxygen & Stamina (100%)',
          distance: distUgO2,
          onInteract: () => this.handleRefillInteraction(),
        };
      }

      return null;
    }

    // 1. Mars Rover interaction
    const distToRover = Math.hypot(
      this.playerPos.x - this.rover.position[0],
      this.playerPos.z - this.rover.position[2]
    );
    if (!this.isDrivingRover && distToRover < 5.5) {
      const durability = this.rover.getDurabilityState();
      return {
        id: 'rover',
        title: 'Curiosity Rover Outpost',
        actionText:
          durability.integrity < 99.5
            ? `Communicate, Repair Hull (${Math.round(durability.integrity)}%) & Drive`
            : 'Communicate & Drive Rover (O2 Refill)',
        distance: distToRover,
        onInteract: () => this.handleRoverInteraction(),
      };
    }

    // 2. Surface Airlock Elevator Hatch -> Underground Mars Research Base
    const distToHatch = Math.hypot(
      this.playerPos.x - this.undergroundBase.surfaceHatchPos[0],
      this.playerPos.z - this.undergroundBase.surfaceHatchPos[2]
    );
    if (!this.isDrivingRover && distToHatch < 4.8) {
      return {
        id: 'ug_surface_hatch',
        title: 'Underground Research Base Elevator',
        actionText: 'Descend to Subterranean Lab (-28m)',
        distance: distToHatch,
        onInteract: () => this.enterUndergroundBase(),
      };
    }

    // 2b. Surface Science Laboratory Console
    const distToLab = Math.hypot(
      this.playerPos.x - this.base.scienceLabPos[0],
      this.playerPos.z - this.base.scienceLabPos[2]
    );
    if (distToLab < 4.5) {
      return {
        id: 'surface_science_lab',
        title: 'Mars Science Laboratory Bench',
        actionText: 'Perform Safe Educational Experiments',
        distance: distToLab,
        onInteract: () => {
          sounds.playComputerInterface();
          this.callbacks.onOpenScienceLab?.();
        },
      };
    }

    // 3. Satellite Relay Dishes
    for (let i = 0; i < this.satelliteRelayManager.relays.length; i++) {
      const relay = this.satelliteRelayManager.relays[i];
      const distToRelay = Math.hypot(
        this.playerPos.x - relay.data.position[0],
        this.playerPos.z - relay.data.position[2]
      );
      if (distToRelay < 6.0) {
        return {
          id: `sat_relay_${relay.data.id}`,
          title: `Satellite Dish: ${relay.data.name}`,
          actionText: relay.data.aligned
            ? 'Inspect Calibrated Orbital Uplink'
            : 'Calibrate Dish & Tune Orbital Frequency',
          distance: distToRelay,
          onInteract: () => {
            sounds.playComputerInterface();
            this.callbacks.onOpenSatelliteRelay?.({ ...relay.data });
          },
        };
      }
    }

    // 4. Base Oxygen Refill Pad
    const distToRefill = Math.hypot(
      this.playerPos.x - this.base.oxygenRefillPos[0],
      this.playerPos.z - this.base.oxygenRefillPos[2]
    );
    if (distToRefill < 4.8) {
      return {
        id: 'o2_refill',
        title: 'Life Support Oxygen Dock',
        actionText: 'Recharge Spacesuit Oxygen (100%)',
        distance: distToRefill,
        onInteract: () => this.handleRefillInteraction(),
      };
    }

    // 5. Space Station Info Kiosk
    const distToInfo = Math.hypot(
      this.playerPos.x - this.base.infoTerminalPos[0],
      this.playerPos.z - this.base.infoTerminalPos[2]
    );
    if (distToInfo < 4.5) {
      return {
        id: 'station_info',
        title: 'Space Station Research Kiosk',
        actionText: 'Access Mars Scientific Database',
        distance: distToInfo,
        onInteract: () => {
          sounds.playComputerInterface();
          this.callbacks.onOpenBaseInfo();
        },
      };
    }

    // 6. Astronaut Rest & Medical Bay (accessible smoothly outside pressurized wing walls)
    const distToRest = Math.hypot(
      this.playerPos.x - this.base.restBayPos[0],
      this.playerPos.z - this.base.restBayPos[2]
    );
    if (distToRest < 7.2) {
      return {
        id: 'rest_bay',
        title: 'Astronaut Rest & Sleep Pods',
        actionText: 'Rest in Pressurized Pod (O2 + Stamina)',
        distance: distToRest,
        onInteract: () => this.handleRestBayInteraction(),
      };
    }

    // 7. Base Communication Tower
    const distToTower = Math.hypot(
      this.playerPos.x - this.base.commTowerPos[0],
      this.playerPos.z - this.base.commTowerPos[2]
    );
    if (distToTower < 6.0) {
      return {
        id: 'comm_tower',
        title: 'Deep Space Communication Tower',
        actionText: this.base.isTowerActivated ? 'Tower Signal Active (Earth Online)' : 'Activate Earth Uplink',
        distance: distToTower,
        onInteract: () => this.handleTowerInteraction(),
      };
    }

    // 8. Science Quiz Terminal
    const distToQuiz = Math.hypot(
      this.playerPos.x - this.base.quizTerminalPos[0],
      this.playerPos.z - this.base.quizTerminalPos[2]
    );
    if (distToQuiz < 4.5) {
      return {
        id: 'quiz_terminal',
        title: 'Mars Science Academy Terminal',
        actionText: 'Take 10-Question Mars Quiz',
        distance: distToQuiz,
        onInteract: () => {
          sounds.playComputerInterface();
          this.callbacks.onOpenQuiz();
        },
      };
    }

    return null;
  }

  private handleRoverInteraction() {
    sounds.playRoverInteract();
    this.refillOxygen();
    this.addScore(50);
    this.callbacks.onOpenRoverComm();

    // Mission 3 check
    const m3 = this.missionsState.get(3);
    if (m3 && !m3.completed) {
      m3.current = 1;
      m3.completed = true;
      this.callbacks.onMissionProgress(3, 1, true);
      this.awardMissionReward(3);
    }
  }

  private handleRefillInteraction() {
    this.refillOxygen();
    // Mission 4 check
    const m4 = this.missionsState.get(4);
    if (m4 && !m4.completed) {
      m4.current = 1;
      m4.completed = true;
      this.callbacks.onMissionProgress(4, 1, true);
      this.awardMissionReward(4);
    }
  }

  private handleRestBayInteraction() {
    this.refillOxygen();
    this.addScore(25);
    this.callbacks.onNotification(
      'ASTRONAUT RESTED',
      'Pressurized sleep pod restored life support systems and vital signs!',
      'success'
    );
  }

  private handleTowerInteraction() {
    if (!this.base.isTowerActivated) {
      this.base.activateTower();
      this.addScore(150);
      sounds.setMusicContext('final_mission');
      sounds.playTowerActivation();
      voiceAssistant.speakCue('final_mission', true);
      window.setTimeout(() => sounds.playRadioTransmission(), 350);
      window.setTimeout(() => sounds.playEarthContactSuccess(), 800);
      this.callbacks.onLocalTowerActivate?.();
      this.callbacks.onNotification(
        'EARTH UPLINK ESTABLISHED!',
        'High-gain dish locked with Deep Space Network in Goldstone & Madrid! Telemetry streaming to Houston.',
        'success'
      );

      // Mission 5 check
      const m5 = this.missionsState.get(5);
      if (m5 && !m5.completed) {
        m5.current = 1;
        m5.completed = true;
        this.callbacks.onMissionProgress(5, 1, true);
        this.awardMissionReward(5);
      }
    } else {
      sounds.playRadioTransmission();
      this.callbacks.onNotification('COMMUNICATION TOWER', 'Continuous radio link active with Earth.', 'normal');
    }
  }

  public handleQuizCompleted(score: number, passed: boolean) {
    if (passed) {
      this.addScore(score * 2);
      this.callbacks.onNotification(
        'MARS ACADEMY CERTIFIED!',
        `Passed with ${score}/100 points! Gold Explorer Medal unlocked!`,
        'success'
      );

      let allDone = true;
      this.missionsState.forEach((m) => {
        if (!m.completed) allDone = false;
      });

      if (allDone || score >= 70) {
        setTimeout(() => {
          this.callbacks.onVictory();
        }, 4000);
      }
    }
  }

  public refillOxygen() {
    const wasDepleted = this.oxygen < 96;
    this.oxygen = 100;
    this.hasWarned30 = false;
    this.hasWarned15 = false;
    this.stamina = 100;
    this.isStaminaExhausted = false;
    this.hasWarnedExhausted = false;
    this.emitStaminaTelemetry();
    this.callbacks.onOxygenChange(100);
    sounds.playOxygenRefill();
    if (wasDepleted && this.isEngineRunning) {
      voiceAssistant.speakCue('oxygen_refilled');
    }
    if (this.isEngineRunning) {
      this.syncMusicForCurrentMode();
    }
    this.callbacks.onNotification('OXYGEN REFILLED', 'Spacesuit oxygen & stamina replenished to 100%!', 'success');
  }

  public addScore(points: number) {
    this.score += points;
    this.callbacks.onScoreChange(this.score);
  }

  public respawnAtLastCheckpoint() {
    const cp = this.checkpointManager.activeCheckpoint;
    const y = this.getSupportGroundY(cp.position[0], cp.position[1] + 1, cp.position[2]);
    this.playerPos.set(cp.position[0], y, cp.position[2]);
    this.playerVelocityY = 0;
    this.airVelX = 0;
    this.airVelZ = 0;
    this.bankAngle = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isGliding = false;
    this.flightEnergy = 100;
    this.stamina = 100;
    this.isStaminaExhausted = false;
    this.hasWarnedExhausted = false;
    this.staminaActivityState = 'RECOVERING';
    this.staminaSpeedMultiplier = 1.0;
    this.player.group.position.copy(this.playerPos);

    if (this.isInsideUndergroundBase) {
      this.isInsideUndergroundBase = false;
      this.syncSurfaceVisibility(true);
      this.callbacks.onUndergroundStateChange?.(false);
    }

    if (this.isDrivingRover) {
      this.isDrivingRover = false;
      this.player.group.visible = true;
      this.contactShadow.visible = true;
      sounds.setRoverEngineState(false, 0);
    }

    this.contactShadow.position.set(this.playerPos.x, y + 0.04, this.playerPos.z);
    this.refillOxygen();
    this.emitFlightTelemetry();
    this.emitStaminaTelemetry();
    this.orbitControls.resetCamera(0);
    this.resume();
    this.callbacks.onNotification('CHECKPOINT RESPAWN', `Safely respawned at ${cp.name}.`, 'normal');
  }

  private awardMissionReward(missionId: number, suppressNetwork = false) {
    sounds.playMissionComplete();
    if (missionId !== 5) {
      voiceAssistant.speakCue('mission_complete');
    }
    if (!suppressNetwork) {
      this.callbacks.onLocalMissionComplete?.(missionId);
    }
    if (missionId === 1) {
      this.addScore(100);
      this.callbacks.onNotification('MISSION 1 COMPLETED!', 'Landing Site explored & Red Basin reached! +100 XP', 'success');
    } else if (missionId === 2) {
      this.addScore(200);
      this.callbacks.onNotification('MISSION 2 COMPLETED!', '10 Energy Crystals gathered! +200 XP & Thruster Boost', 'success');
    } else if (missionId === 3) {
      this.addScore(250);
      this.callbacks.onNotification('MISSION 3 COMPLETED!', 'Curiosity Rover inspected & linked! +250 XP', 'success');
    } else if (missionId === 4) {
      this.addScore(300);
      this.callbacks.onNotification('MISSION 4 COMPLETED!', 'Research Base reached & O2 replenished! +300 XP', 'success');
    } else if (missionId === 5) {
      this.addScore(500);
      this.callbacks.onNotification('MISSION 5 COMPLETED!', 'Earth Uplink activated! You are Mars Master Explorer!', 'success');
    } else if (missionId === 6) {
      this.addScore(350);
      this.callbacks.onNotification('MISSION 6 COMPLETED!', 'Rover chassis repaired & suspension calibrated! +350 XP', 'success');
    } else if (missionId === 7) {
      this.addScore(300);
      this.callbacks.onNotification('MISSION 7 COMPLETED!', 'Hidden caves & secret research locations mapped! +300 XP', 'success');
    } else if (missionId === 8) {
      this.addScore(350);
      this.callbacks.onNotification('MISSION 8 COMPLETED!', 'Subterranean Lab & safe science experiments mastered! +350 XP', 'success');
    } else if (missionId === 9) {
      this.addScore(450);
      this.callbacks.onNotification('MISSION 9 COMPLETED!', 'All 3 Orbital Satellite Relays calibrated! +450 XP', 'success');
    }

    if (missionId === 4 && this.isEngineRunning) {
      this.syncMusicForCurrentMode();
    }

    let hasRemaining = false;
    this.missionsState.forEach((m) => {
      if (!m.completed) hasRemaining = true;
    });
    if (hasRemaining && (this.gameMode === 'mission' || this.gameMode === 'survival')) {
      window.setTimeout(() => {
        if (this.isEngineRunning) {
          sounds.playMissionObjective();
        }
      }, 1100);
    }
  }

  private emitRoverDurability(force = false) {
    const next = this.rover.getDurabilityState();
    const prev = this.lastRoverDurabilityTelemetry;
    if (
      !force &&
      prev &&
      Math.round(prev.integrity * 10) === Math.round(next.integrity * 10) &&
      prev.status === next.status &&
      prev.terrainStress === next.terrainStress &&
      prev.collisionCount === next.collisionCount &&
      prev.speedMultiplier === next.speedMultiplier
    ) {
      return;
    }
    this.lastRoverDurabilityTelemetry = next;
    this.callbacks.onRoverDurabilityChange?.(next);
  }

  public repairRover(): boolean {
    const res = this.rover.repair(100);
    this.roverWarned60 = false;
    this.roverWarned30 = false;
    this.roverWarned0 = false;
    this.emitRoverDurability();

    if (res.wasDamaged) {
      sounds.playRoverRepair();
      this.callbacks.onNotification(
        'ROVER HULL REPAIRED!',
        `Restored chassis & rocker-bogie suspension from ${Math.round(res.previous)}% to 100%.`,
        'success'
      );

      const m6 = this.missionsState.get(6);
      let completedM6Now = false;
      if (m6 && !m6.completed) {
        m6.current = 1;
        m6.completed = true;
        completedM6Now = true;
        this.callbacks.onMissionProgress(6, 1, true);
        this.awardMissionReward(6);
      }
      if (!completedM6Now) {
        voiceAssistant.speakCue('rover_repaired');
      }
      return true;
    }

    sounds.playClick();
    this.callbacks.onNotification(
      'ROVER AT 100% INTEGRITY',
      'Hull already nominal! Drive over boulders or steep crater slopes first to log field wear.',
      'normal'
    );
    return false;
  }

  public start() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.clock.start();
    sounds.unlockAudio();
    sounds.setGameplayPaused(false);
    sounds.startAtmosphere();
    this.syncMusicForCurrentMode();
    if (!this.hasSpokenGameStart) {
      this.hasSpokenGameStart = true;
      sounds.playMissionStart();
      voiceAssistant.speakCue('game_start', true);
      if (this.gameMode === 'mission' || this.gameMode === 'survival') {
        window.setTimeout(() => {
          if (this.isEngineRunning) {
            sounds.playMissionObjective();
            voiceAssistant.speakCue('mission_start');
          }
        }, 3800);
      }
    }
    this.loop();
  }

  public pause() {
    this.isEngineRunning = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.keysHeld.clear();
    this.joystickVector = { x: 0, y: 0 };
    this.roverPedalState = { forward: 0, turn: 0, boost: false };
    this.isRunningInput = false;
    sounds.setGameplayPaused(true);
    sounds.setRoverEngineState(false, 0);
  }

  public resume() {
    sounds.unlockAudio();
    sounds.setGameplayPaused(false);
    sounds.startAtmosphere();
    this.syncMusicForCurrentMode();
    if (!this.isEngineRunning) {
      this.isEngineRunning = true;
      this.clock.start();
      this.loop();
    }
  }

  public returnToMainMenu() {
    this.pause();
    sounds.stopAtmosphere();
    voiceAssistant.stopAll();
    sounds.setMusicContext('menu');
    this.restartGame(false);
  }

  public restartGame(autoResume: boolean = true) {
    this.oxygen = 100;
    this.flightEnergy = 100;
    this.stamina = 100;
    this.isStaminaExhausted = false;
    this.hasWarnedExhausted = false;
    this.staminaActivityState = 'RECOVERING';
    this.staminaSpeedMultiplier = 1.0;
    this.score = 0;
    this.crystalsCollected = 0;
    this.hasWarned30 = false;
    this.hasWarned15 = false;
    this.hasSpokenGameStart = false;
    this.hasDiscoveredRover = false;
    this.hasDiscoveredBase = false;
    this.wasInsideBaseAirlock = false;
    this.missionAreaZone = 'none';
    this.isInsideUndergroundBase = false;
    this.hasEnteredUndergroundOnce = false;
    this.completedLabExperiments.clear();
    this.syncSurfaceVisibility(true);
    this.callbacks.onUndergroundStateChange?.(false);
    this.discoveredCrystalIds.clear();
    this.creditedCrystalIds.clear();
    voiceAssistant.resetSessionHistory();
    sounds.setRoverEngineState(false, 0);
    sounds.setCrystalGlowProximity(0);
    sounds.setBaseLabProximity(0, 0);
    this.currentSpeed = 0;
    this.metersWalked = 0;
    this.roverPedalState = { forward: 0, turn: 0, boost: false };
    this.roverDriftDustTimer = 0;
    this.roverLowBoostWarnTimer = 0;
    this.bountyGlideAccum = 0;
    this.bountyRoverAccum = 0;
    this.bountyFootAccum = 0;
    this.bountyFlushTimer = 0;
    this.triviaTravelAccum = 0;
    this.triviaNextThreshold = Math.round(24 + Math.random() * 16);
    this.triviaCooldownTimer = 3;
    this.lastPromptId = null;
    this.callbacks.onInteractivePromptChange(null);

    if (this.gameMode === 'trivia') {
      this.callbacks.onTriviaScanProgress?.(0, this.triviaNextThreshold);
    }

    if (this.isDrivingRover) {
      this.isDrivingRover = false;
      this.player.group.visible = true;
      this.contactShadow.visible = true;
      this.callbacks.onLocalRoverDriveToggle?.(false);
    }
    this.cancelRoverAutoPilot('reset');

    const spawnY = this.getSupportGroundY(0, getMarsHeight(0, 0) + 1, 0);
    this.playerPos.set(0, spawnY, 0);
    this.playerVelocityY = 0;
    this.airVelX = 0;
    this.airVelZ = 0;
    this.playerHeading = 0;
    this.bankAngle = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isGliding = false;
    this.player.group.position.copy(this.playerPos);
    this.player.group.rotation.y = 0;

    this.crystalManager.resetAll();
    this.hiddenAreasManager.resetAll();
    this.satelliteRelayManager.resetAll();
    this.rover.setExternalPose(28, -24, -Math.PI * 0.4, this.collisionWorld);
    this.rover.setHeadlights(true);
    this.callbacks.onRoverHeadlightsChange?.(true);
    this.rover.resetDurability();
    this.roverWarned60 = false;
    this.roverWarned30 = false;
    this.roverWarned0 = false;
    this.checkpointManager.setActiveCheckpoint('landing');
    this.initMissionsState();

    this.callbacks.onOxygenChange(100);
    this.emitFlightTelemetry(true);
    this.emitStaminaTelemetry(true);
    this.emitRoverDurability(true);
    this.emitRoverDriveTelemetry(true);
    this.callbacks.onScoreChange(0);
    this.callbacks.onCrystalsChange(0);
    this.callbacks.onCheckpointChange(this.checkpointManager.activeCheckpoint);
    this.callbacks.onPlayerPositionChange?.(
      { x: 0, z: 0 },
      0,
      { x: 28, z: -24 }
    );
    for (let id = 1; id <= 9; id++) {
      this.callbacks.onMissionProgress(id, 0, false);
    }

    this.orbitControls.resetCamera(0);
    if (this.renderer.shadowMap.enabled && !this.renderer.shadowMap.autoUpdate) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (autoResume) {
      this.resume();
    } else {
      this.renderer.render(this.scene, this.orbitControls.camera);
    }
  }

  private updateAdaptiveQuality(rawDelta: number) {
    if (this.isSoftwareGl) return;
    // Ignore giant frame pauses from tab switches or modals
    if (rawDelta <= 0 || rawDelta > 0.25) return;

    this.fpsAccumTime += rawDelta;
    this.fpsFrameCount += 1;

    if (this.fpsAccumTime < 1.0) return;

    const avgMs = (this.fpsAccumTime / this.fpsFrameCount) * 1000;
    this.fpsAccumTime = 0;
    this.fpsFrameCount = 0;

    if (avgMs > 20.5) {
      this.slowFpsWindows += 1;
      this.fastFpsWindows = 0;
      if (this.slowFpsWindows >= 2) {
        this.slowFpsWindows = 0;
        const nextPpr = Math.max(
          this.deviceProfile.minPixelRatio,
          Number((this.currentPixelRatio - 0.12).toFixed(2))
        );
        if (nextPpr < this.currentPixelRatio) {
          this.currentPixelRatio = nextPpr;
          this.renderer.setPixelRatio(nextPpr);
        }
        if (this.shadowUpdateInterval < 3) {
          this.shadowUpdateInterval += 1;
          this.renderer.shadowMap.autoUpdate = false;
          this.renderer.shadowMap.needsUpdate = true;
        }
      }
    } else if (avgMs < 15.2) {
      this.fastFpsWindows += 1;
      this.slowFpsWindows = 0;
      if (this.fastFpsWindows >= 3) {
        this.fastFpsWindows = 0;
        const nextPpr = Math.min(
          this.deviceProfile.maxPixelRatio,
          Number((this.currentPixelRatio + 0.08).toFixed(2))
        );
        if (nextPpr > this.currentPixelRatio) {
          this.currentPixelRatio = nextPpr;
          this.renderer.setPixelRatio(nextPpr);
        }
        if (this.shadowUpdateInterval > this.deviceProfile.shadowUpdateInterval) {
          this.shadowUpdateInterval -= 1;
          if (this.shadowUpdateInterval <= 1) {
            this.renderer.shadowMap.autoUpdate = true;
          }
        }
      }
    } else {
      this.slowFpsWindows = 0;
      this.fastFpsWindows = 0;
    }
  }

  private loop = () => {
    if (!this.isEngineRunning) return;

    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);

    this.updateAdaptiveQuality(rawDelta);
    this.updateControlsAndPhysics(delta);
    this.updateOxygen(delta);
    this.updateWorld(delta);

    if (!this.isSoftwareGl && this.renderer.shadowMap.enabled && this.shadowUpdateInterval > 1) {
      this.shadowFrameCounter = (this.shadowFrameCounter + 1) % this.shadowUpdateInterval;
      if (this.shadowFrameCounter === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    this.renderer.render(this.scene, this.orbitControls.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(callback: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(callback, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateControlsAndPhysics(delta: number) {
    // Full 360-degree smooth camera rotation via Q/X, [/], ,/. or HUD orbit buttons
    const camTurnDir = THREE.MathUtils.clamp(
      (this.keysHeld.has('KeyQ') || this.keysHeld.has('BracketLeft') || this.keysHeld.has('Comma') ? -1 : 0) +
        (this.keysHeld.has('KeyX') || this.keysHeld.has('BracketRight') || this.keysHeld.has('Period') ? 1 : 0) +
        this.cameraTurnHold,
      -1,
      1
    );
    if (camTurnDir !== 0) {
      this.orbitControls.rotateBy(camTurnDir * 2.65 * delta, 0);
    }

    let inputX = this.joystickVector.x;
    let inputZ = -this.joystickVector.y;

    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) inputZ += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) inputZ -= 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) inputX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) inputX += 1;

    // --- ROVER DRIVE CONTROLS (Manual + Obstacle-Avoiding Auto-Pilot) ---
    if (this.isDrivingRover) {
      const manualForward = THREE.MathUtils.clamp(inputZ + this.roverPedalState.forward, -1, 1);
      const manualTurn = THREE.MathUtils.clamp(inputX + this.roverPedalState.turn, -1, 1);
      let forwardDrive = manualForward;
      let turnDrive = manualTurn;

      if (this.autopilotTarget) {
        if (Math.abs(manualForward) > 0.14 || Math.abs(manualTurn) > 0.14) {
          // Manual input immediately overrides Auto-Pilot seamlessly
          this.cancelRoverAutoPilot('manual');
        } else {
          const rx = this.rover.position[0];
          const ry = this.rover.position[1];
          const rz = this.rover.position[2];
          const distToGoal = Math.hypot(
            this.autopilotTarget.x - rx,
            this.autopilotTarget.z - rz
          );
          const arrivalRadius =
            this.autopilotTarget.category === 'landmark' ||
            this.autopilotTarget.category === 'hidden_area'
              ? 7.2
              : 4.8;

          if (distToGoal <= arrivalRadius) {
            this.cancelRoverAutoPilot('arrived');
            forwardDrive = 0;
            turnDrive = 0;
          } else {
            if (this.autopilotReverseTimer > 0) {
              this.autopilotReverseTimer = Math.max(0, this.autopilotReverseTimer - delta);
              forwardDrive = -0.68;
              turnDrive = this.autopilotReverseTurnSign * 0.92;
              this.autopilotAvoiding = true;
            } else {
              this.collisionWorld.computeSteeringAvoidance(
                rx,
                ry,
                rz,
                this.rover.rotationY,
                this.autopilotTarget.x,
                this.autopilotTarget.z,
                1.75,
                getMarsHeight,
                this._autopilotSteerScratch
              );
              forwardDrive = 0.88 * this._autopilotSteerScratch.forwardScale;
              turnDrive = this._autopilotSteerScratch.turnInput;
              this.autopilotAvoiding = this._autopilotSteerScratch.avoiding;

              // Stuck detection check every ~1.1s
              this.autopilotProgressTimer += delta;
              if (this.autopilotProgressTimer >= 1.1) {
                const moved = Math.hypot(
                  rx - this.autopilotLastCheckX,
                  rz - this.autopilotLastCheckZ
                );
                this.autopilotLastCheckX = rx;
                this.autopilotLastCheckZ = rz;
                this.autopilotProgressTimer = 0;
                if (moved < 0.45) {
                  this.autopilotReverseTimer = 0.85;
                  this.autopilotReverseTurnSign = -this.autopilotReverseTurnSign;
                }
              }
            }

            // Throttled Auto-Pilot telemetry broadcast (~8 Hz)
            this.autopilotUiTimer += delta;
            if (this.autopilotUiTimer >= 0.12) {
              this.autopilotUiTimer = 0;
              this.emitAutoPilotState(distToGoal);
            }
          }
        }
      }

      this.roverLowBoostWarnTimer = Math.max(0, this.roverLowBoostWarnTimer - delta);
      const boostReq =
        this.roverPedalState.boost ||
        this.keysHeld.has('ShiftLeft') ||
        this.keysHeld.has('ShiftRight');
      const prevX = this.playerPos.x;
      const prevZ = this.playerPos.z;
      const stormIntensity = this.weatherSystem ? this.weatherSystem.getIntensity() : 0;
      const roverPos = this.rover.drive(
        forwardDrive,
        turnDrive,
        delta,
        this.collisionWorld,
        stormIntensity,
        (severity, ix, iy, iz) => {
          sounds.playRoverImpact(severity);
          this.flightEffects.spawnLandingDust(ix, iy + 0.3, iz, 0.55 + severity * 0.45);
          this.emitRoverDurability();
        },
        boostReq,
        (intensity, lx, ly, lz) => {
          sounds.playRoverLand(intensity);
          this.flightEffects.spawnLandingDust(lx, ly, lz, Math.min(1.2, 0.45 + intensity * 0.75));
          this.emitRoverDriveTelemetry(true);
        },
        !this.autopilotTarget
      );

      const durability = this.rover.getDurabilityState();
      const driveTele = this.rover.getDriveTelemetry();
      const roverSpeedNorm = this.rover.isDriving
        ? Math.min(1, Math.max(0.25, Math.max(Math.abs(forwardDrive), Math.abs(turnDrive) * 0.65) * durability.speedMultiplier * (driveTele.boostActive ? 1.2 : 1.0)))
        : 0.12;
      sounds.setRoverEngineState(true, roverSpeedNorm);

      // Drift gravel SFX and rear-wheel Martian dust kickup
      if (driveTele.isDrifting && !driveTele.isAirborne) {
        sounds.playRoverDriftScrub(driveTele.driftIntensity);
        this.roverDriftDustTimer += delta;
        if (this.roverDriftDustTimer >= 0.12) {
          this.roverDriftDustTimer = 0;
          const sinH = Math.sin(this.rover.rotationY);
          const cosH = Math.cos(this.rover.rotationY);
          this.flightEffects.spawnLandingDust(
            roverPos.x - sinH * 1.45,
            roverPos.y + 0.05,
            roverPos.z - cosH * 1.45,
            0.32 + driveTele.driftIntensity * 0.35
          );
        }
      } else {
        this.roverDriftDustTimer = 0.08;
      }

      if (durability.integrity <= 60 && !this.roverWarned60) {
        this.roverWarned60 = true;
        this.callbacks.onNotification(
          'ROVER HULL WEAR (60%)',
          'Harsh terrain & impacts are wearing down chassis integrity. Watch steep crater slopes!',
          'warning'
        );
      } else if (durability.integrity <= 30 && !this.roverWarned30) {
        this.roverWarned30 = true;
        sounds.playRoverImpact(0.9);
        this.callbacks.onNotification(
          'CRITICAL ROVER DAMAGE!',
          'Hull durability below 35%! Speed reduced—tap Repair in the Rover HUD soon.',
          'warning'
        );
      } else if (durability.integrity <= 0.1 && !this.roverWarned0) {
        this.roverWarned0 = true;
        sounds.playRoverImpact(1.0);
        this.callbacks.onNotification(
          'ROVER LIMP-HOME MODE!',
          'Durability at 0%! Emergency drive active at 30% speed. Tap Repair to restore full power!',
          'warning'
        );
      }

      // Keep player position aligned with driven rover for pickups & network sync
      this.playerPos.set(roverPos.x, roverPos.y, roverPos.z);
      this.flightEnergy = Math.min(100, this.flightEnergy + 34 * delta);
      this.stamina = Math.min(100, this.stamina + 18 * delta);
      if (this.isStaminaExhausted && this.stamina >= 25) {
        this.isStaminaExhausted = false;
        this.hasWarnedExhausted = false;
      }
      this.staminaActivityState = this.isStaminaExhausted ? 'EXHAUSTED' : 'RECOVERING';
      this.staminaSpeedMultiplier = 1.0;

      const roverStepDist = Math.hypot(roverPos.x - prevX, roverPos.z - prevZ);
      if (roverStepDist > 0.001 && roverStepDist < 10) {
        this.bountyRoverAccum += roverStepDist;
        this.updateTriviaScanner(roverStepDist, delta);
      } else {
        this.updateTriviaScanner(0, delta);
      }
      this.flushBountyDistanceDeltas(delta);

      // Camera smoothly follows rover with full obstacle collision - Zero GC
      _roverVec.set(roverPos.x, roverPos.y, roverPos.z);
      const roverFollowStrength = this.rover.isDriving && Math.abs(turnDrive) > 0.05 ? 2.4 : 0;
      this.orbitControls.update(
        _roverVec,
        this.rover.rotationY,
        delta,
        false,
        0,
        this.collisionWorld,
        getMarsHeight,
        undefined,
        roverFollowStrength
      );

      // Physics-linked rover tire tracks (skip drawing tracks mid-jump)
      this.trailSystem.updateRoverTracks(roverPos, this.rover.rotationY, this.rover.isDriving && !driveTele.isAirborne);

      if (this.callbacks.onLocalStateSync) {
        const p = this._localSyncPayload;
        p.x = roverPos.x;
        p.y = roverPos.y;
        p.z = roverPos.z;
        p.rotationY = this.rover.rotationY;
        p.speed = this.rover.isDriving ? 7.5 * durability.speedMultiplier : 0;
        p.isRunning = false;
        p.isGrounded = !driveTele.isAirborne;
        p.isJumping = driveTele.isAirborne;
        p.isDrivingRover = true;
        p.isGliding = false;
        this.callbacks.onLocalStateSync(p);
      }

      if (this.rover.isDriving) {
        this.callbacks.onLocalRoverSync?.(
          roverPos.x,
          roverPos.y,
          roverPos.z,
          this.rover.rotationY,
          this.rover.getHeadlightsOn()
        );
      }

      this.roverDurabilityTimer += delta;
      if (this.roverDurabilityTimer >= 0.12) {
        this.roverDurabilityTimer = 0;
        this.emitRoverDurability();
      }

      this.roverTelemetryTimer += delta;
      if (this.roverTelemetryTimer >= 0.1) {
        this.roverTelemetryTimer = 0;
        this.emitRoverDriveTelemetry();
      }

      this.staminaUiTimer += delta;
      if (this.staminaUiTimer >= 0.12) {
        this.staminaUiTimer = 0;
        this.emitStaminaTelemetry();
      }

      this.flightUiTimer += delta;
      if (this.flightUiTimer >= 0.15) {
        this.flightUiTimer = 0;
        this.emitFlightTelemetry();
      }

      this.miniMapTimer += delta;
      if (this.miniMapTimer >= 0.10) {
        this.miniMapTimer = 0;
        const movedDist = Math.hypot(
          roverPos.x - this.lastEmittedPlayerX,
          roverPos.z - this.lastEmittedPlayerZ
        );
        const turnedRad = Math.abs(this.rover.rotationY - this.lastEmittedPlayerHeading);
        if (movedDist > 0.25 || turnedRad > 0.05) {
          this.lastEmittedPlayerX = roverPos.x;
          this.lastEmittedPlayerZ = roverPos.z;
          this.lastEmittedPlayerHeading = this.rover.rotationY;
          this.callbacks.onPlayerPositionChange?.(
            { x: roverPos.x, z: roverPos.z },
            this.rover.rotationY,
            { x: roverPos.x, z: roverPos.z }
          );
        }
      }
      return;
    }

    // --- ASTRONAUT FOOT, MARS GRAVITY & SKY-INSPIRED GLIDING PHYSICS ---
    const inputLen = Math.hypot(inputX, inputZ);
    const hasInput = inputLen > 0.05;
    const prevPlayerX = this.playerPos.x;
    const prevPlayerZ = this.playerPos.z;

    if (hasInput) {
      const normX = inputX / Math.max(inputLen, 1);
      const normZ = inputZ / Math.max(inputLen, 1);

      const cam = this.orbitControls.camera;
      cam.getWorldDirection(_camForward);
      _camForward.y = 0;
      _camForward.normalize();

      _camRight.crossVectors(_worldUp, _camForward).normalize();

      _moveDir
        .set(0, 0, 0)
        .addScaledVector(_camForward, normZ)
        .addScaledVector(_camRight, -normX)
        .normalize();
    }

    // Sample Martian Wind Push for airborne & gliding trajectories
    const { windLift } = this.windSystem
      ? this.windSystem.getAirborneWindPush(_windPush, this.isGliding)
      : { windLift: 0 };
    if (!this.windSystem) _windPush.set(0, 0, 0);

    const canSprint = this.isRunningInput && !this.isStaminaExhausted && this.stamina > 0;
    const baseWalkSpeed = 6.4;
    const sprintMultiplier = 1.6;
    const activeSpeedMultiplier = this.isStaminaExhausted
      ? 0.72
      : canSprint
      ? sprintMultiplier
      : 1.0;
    this.staminaSpeedMultiplier = activeSpeedMultiplier;

    if (this.isGrounded) {
      // Grounded walking / sprinting tied to stamina & movement speed
      if (hasInput) {
        const moveSpeed = baseWalkSpeed * activeSpeedMultiplier;
        const clampedLen = Math.min(inputLen, 1);

        const targetVx = _moveDir.x * moveSpeed * clampedLen;
        const targetVz = _moveDir.z * moveSpeed * clampedLen;
        this.airVelX = THREE.MathUtils.damp(this.airVelX, targetVx, 16, delta);
        this.airVelZ = THREE.MathUtils.damp(this.airVelZ, targetVz, 16, delta);

        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        this.playerHeading = this.lerpAngle(this.playerHeading, targetAngle, 1 - Math.exp(-16 * delta));
        this.player.group.rotation.y = this.playerHeading;
      } else {
        this.airVelX = THREE.MathUtils.damp(this.airVelX, 0, 14, delta);
        this.airVelZ = THREE.MathUtils.damp(this.airVelZ, 0, 14, delta);
      }

      // Resolve horizontal collisions against rocks, base buildings, rover, and tablets (with smooth wall sliding)
      const candX = this.playerPos.x + this.airVelX * delta;
      const candZ = this.playerPos.z + this.airVelZ * delta;
      _resolvedVel.x = this.airVelX;
      _resolvedVel.z = this.airVelZ;
      this.collisionWorld.resolveHorizontalCollision(
        candX,
        this.playerPos.y,
        candZ,
        PLAYER_COLLISION_RADIUS,
        PLAYER_HEIGHT,
        _resolvedXZ,
        _resolvedVel
      );
      this.airVelX = _resolvedVel.x;
      this.airVelZ = _resolvedVel.z;

      if (Math.hypot(_resolvedXZ.x, _resolvedXZ.z) < 140) {
        this.playerPos.x = _resolvedXZ.x;
        this.playerPos.z = _resolvedXZ.z;
      }

      const actualGroundSpeed = Math.hypot(this.playerPos.x - prevPlayerX, this.playerPos.z - prevPlayerZ) / Math.max(delta, 0.001);
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, actualGroundSpeed, 14, delta);
      this.metersWalked += actualGroundSpeed * delta;

      // Stamina depletion while running vs speed-tied replenishment while walking/standing still
      const distToBase = Math.hypot(this.playerPos.x - -40, this.playerPos.z - -32);
      if (canSprint && actualGroundSpeed > 4.2) {
        const sprintRatio = Math.max(0.55, actualGroundSpeed / (baseWalkSpeed * sprintMultiplier));
        this.stamina = Math.max(0, this.stamina - 17.5 * sprintRatio * delta);
        if (this.stamina <= 0.05) {
          this.stamina = 0;
          this.isStaminaExhausted = true;
          this.staminaActivityState = 'EXHAUSTED';
          if (!this.hasWarnedExhausted) {
            this.hasWarnedExhausted = true;
            this.callbacks.onNotification(
              'STAMINA EXHAUSTED',
              'Movement speed reduced. Walk slowly or stand still to recover sprint energy.',
              'warning'
            );
          }
        } else {
          this.staminaActivityState = 'RUNNING';
        }
      } else if (hasInput && actualGroundSpeed >= 0.4) {
        // Slowly replenishes while walking, inversely scaled by walking speed
        const walkRatio = Math.min(1, actualGroundSpeed / baseWalkSpeed);
        const walkRegenRate = Math.max(3.5, 9.5 - walkRatio * 4.5);
        this.stamina = Math.min(100, this.stamina + walkRegenRate * delta);
        this.staminaActivityState = this.isStaminaExhausted ? 'EXHAUSTED' : 'WALKING';
      } else {
        // Standing still: steady recovery (faster inside Research Base shelter)
        const standRegenRate = distToBase < 16 ? 22.0 : 15.0;
        this.stamina = Math.min(100, this.stamina + standRegenRate * delta);
        this.staminaActivityState = this.isStaminaExhausted ? 'EXHAUSTED' : 'RECOVERING';
      }

      if (this.isStaminaExhausted && this.stamina >= 25) {
        this.isStaminaExhausted = false;
        this.hasWarnedExhausted = false;
      }

      // Regenerate Flight Energy while grounded (faster near pressurized Base Station)
      const regenRate = distToBase < 16 ? 48 : 26;
      this.flightEnergy = Math.min(100, this.flightEnergy + regenRate * delta);
      this.bankAngle = THREE.MathUtils.damp(this.bankAngle, 0, 10, delta);
    } else if (this.isGliding) {
      // --- GLIDING PHYSICS (Sky: Children of the Light inspired soaring) ---
      const drainRate = this.gameMode === 'exploration' ? 4.8 : 9.0;
      this.flightEnergy = Math.max(0, this.flightEnergy - drainRate * delta);
      if (this.flightEnergy <= 0) {
        this.setGliding(false);
      }
      this.staminaActivityState = this.isStaminaExhausted ? 'EXHAUSTED' : 'RECOVERING';

      const glideCruiseSpeed = canSprint ? 14.5 : 11.8;
      let targetVx: number;
      let targetVz: number;

      if (hasInput) {
        targetVx = _moveDir.x * glideCruiseSpeed + _windPush.x;
        targetVz = _moveDir.z * glideCruiseSpeed + _windPush.z;
      } else {
        // Gentle automatic forward glide along facing direction + wind drift
        targetVx = Math.sin(this.playerHeading) * 7.2 + _windPush.x;
        targetVz = Math.cos(this.playerHeading) * 7.2 + _windPush.z;
      }

      // Silky aerodynamic turning inertia
      this.airVelX = THREE.MathUtils.damp(this.airVelX, targetVx, 3.6, delta);
      this.airVelZ = THREE.MathUtils.damp(this.airVelZ, targetVz, 3.6, delta);

      const candX = this.playerPos.x + this.airVelX * delta;
      const candZ = this.playerPos.z + this.airVelZ * delta;
      _resolvedVel.x = this.airVelX;
      _resolvedVel.z = this.airVelZ;
      this.collisionWorld.resolveHorizontalCollision(
        candX,
        this.playerPos.y,
        candZ,
        PLAYER_COLLISION_RADIUS,
        PLAYER_HEIGHT,
        _resolvedXZ,
        _resolvedVel
      );
      this.airVelX = _resolvedVel.x;
      this.airVelZ = _resolvedVel.z;

      if (Math.hypot(_resolvedXZ.x, _resolvedXZ.z) < 140) {
        this.playerPos.x = _resolvedXZ.x;
        this.playerPos.z = _resolvedXZ.z;
      }

      const horizSpeed = Math.hypot(this.airVelX, this.airVelZ);
      this.currentSpeed = horizSpeed;
      if (horizSpeed > 0.4) {
        const desiredHeading = Math.atan2(this.airVelX, this.airVelZ);
        const turnDelta = this.shortestAngle(this.playerHeading, desiredHeading);
        this.playerHeading += turnDelta * (1 - Math.exp(-7.5 * delta));
        this.player.group.rotation.y = this.playerHeading;
        // Aerodynamic banking roll into turns
        this.bankAngle = THREE.MathUtils.damp(this.bankAngle, THREE.MathUtils.clamp(-turnDelta * 2.2, -0.55, 0.55), 8, delta);
      }

      // Glider Lift vs Reduced Descent: forward speed + thermal wind lift slows sink rate dramatically
      const airLiftRatio = Math.min(1.0, horizSpeed / 12.0);
      const glideSinkTarget = -2.2 + airLiftRatio * 1.15 + windLift; // ~ -1.05 m/s gentle glide
      if (this.playerVelocityY > glideSinkTarget) {
        this.playerVelocityY += (MARS_GRAVITY * 0.34) * delta;
      } else {
        this.playerVelocityY = THREE.MathUtils.damp(this.playerVelocityY, glideSinkTarget, 4.5, delta);
      }

      // Emit luminous Sky-like wingtip trails
      this.player.leftWingTip.getWorldPosition(_leftWingTip);
      this.player.rightWingTip.getWorldPosition(_rightWingTip);
      this.flightEffects.emitWingtipTrails(delta, _leftWingTip, _rightWingTip, false);
    } else {
      // --- AIRBORNE MARS JUMP / FREE-FALL PHYSICS (38% Earth Gravity) ---
      if (hasInput) {
        const airSpeed = this.isStaminaExhausted ? 5.2 : canSprint ? 9.2 : 6.6;
        const targetVx = _moveDir.x * airSpeed + _windPush.x;
        const targetVz = _moveDir.z * airSpeed + _windPush.z;
        this.airVelX = THREE.MathUtils.damp(this.airVelX, targetVx, 5.0, delta);
        this.airVelZ = THREE.MathUtils.damp(this.airVelZ, targetVz, 5.0, delta);

        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        this.playerHeading = this.lerpAngle(this.playerHeading, targetAngle, 1 - Math.exp(-9 * delta));
        this.player.group.rotation.y = this.playerHeading;
      } else {
        // Gentle wind push + air resistance
        this.airVelX = THREE.MathUtils.damp(this.airVelX, _windPush.x, 1.5, delta);
        this.airVelZ = THREE.MathUtils.damp(this.airVelZ, _windPush.z, 1.5, delta);
      }

      const candX = this.playerPos.x + this.airVelX * delta;
      const candZ = this.playerPos.z + this.airVelZ * delta;
      _resolvedVel.x = this.airVelX;
      _resolvedVel.z = this.airVelZ;
      this.collisionWorld.resolveHorizontalCollision(
        candX,
        this.playerPos.y,
        candZ,
        PLAYER_COLLISION_RADIUS,
        PLAYER_HEIGHT,
        _resolvedXZ,
        _resolvedVel
      );
      this.airVelX = _resolvedVel.x;
      this.airVelZ = _resolvedVel.z;

      if (Math.hypot(_resolvedXZ.x, _resolvedXZ.z) < 140) {
        this.playerPos.x = _resolvedXZ.x;
        this.playerPos.z = _resolvedXZ.z;
      }
      this.currentSpeed = Math.hypot(this.airVelX, this.airVelZ);
      this.bankAngle = THREE.MathUtils.damp(this.bankAngle, 0, 8, delta);

      // Jump ascent / airborne leap drains stamina lightly proportional to movement speed
      if (this.playerVelocityY > 0 || (this.isJumping && this.currentSpeed > 4.5)) {
        const jumpAirDrain = (4.0 + Math.min(4.0, this.currentSpeed * 0.35)) * delta;
        this.stamina = Math.max(0, this.stamina - jumpAirDrain);
        if (this.stamina <= 0.05) {
          this.stamina = 0;
          this.isStaminaExhausted = true;
        }
      }
      this.staminaActivityState = this.isStaminaExhausted ? 'EXHAUSTED' : 'JUMPING';

      // Apply authentic 38% Mars gravity (~ -3.72 m/s²)
      this.playerVelocityY = Math.max(-16.0, this.playerVelocityY + MARS_GRAVITY * delta);
    }

    // Apply vertical displacement & terrain/platform support contact check
    if (!this.isGrounded) {
      this.playerPos.y += this.playerVelocityY * delta;
    }

    const groundY = this.getSupportGroundY(this.playerPos.x, this.playerPos.y, this.playerPos.z);

    if (this.playerPos.y <= groundY + 0.02 || (this.isGrounded && this.playerPos.y <= groundY + 0.35)) {
      const impactSpeed = Math.abs(this.playerVelocityY);
      const justLanded = !this.isGrounded;

      this.playerPos.y = groundY;
      this.playerVelocityY = 0;
      this.isGrounded = true;
      this.isJumping = false;
      if (this.isGliding) {
        this.isGliding = false;
        this.bankAngle = 0;
        sounds.playGlideOpen(false);
      }

      // Spawn Martian landing dust puff burst on touchdown!
      if (justLanded && impactSpeed > 1.5) {
        const strength = Math.min(1.3, impactSpeed / 9.0);
        this.flightEffects.spawnLandingDust(this.playerPos.x, groundY, this.playerPos.z, strength);
        sounds.playLandingDust(strength);
      }
    } else if (this.playerPos.y > groundY + 0.35) {
      // Stepped off a steep crater cliff or deck edge: smoothly become airborne
      this.isGrounded = false;
    }

    // Hard ground safety clamp: never allow explorer below terrain or platform floor
    if (this.playerPos.y < groundY) {
      this.playerPos.y = groundY;
      if (this.playerVelocityY < 0) this.playerVelocityY = 0;
    }

    // Accumulate actual displaced on-foot & gliding distances for Daily Bounties & Trivia Expedition
    const movedStep = Math.hypot(this.playerPos.x - prevPlayerX, this.playerPos.z - prevPlayerZ);
    let triviaStep = 0;
    if (movedStep > 0.001 && movedStep < 10) {
      if (this.isGliding) {
        this.bountyGlideAccum += movedStep;
        triviaStep = movedStep;
      } else if (this.isGrounded) {
        this.bountyFootAccum += movedStep;
        triviaStep = movedStep;
      }
    }
    this.updateTriviaScanner(triviaStep, delta);
    this.flushBountyDistanceDeltas(delta);

    this.player.group.position.copy(this.playerPos);

    // Altitude-aware ground contact shadow
    const altitude = Math.max(0, this.playerPos.y - groundY);
    const shadowScale = Math.max(0.35, 1.0 - altitude * 0.045);
    this.contactShadow.position.set(this.playerPos.x, groundY + 0.04, this.playerPos.z);
    this.contactShadow.scale.setScalar(shadowScale);
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.45 - altitude * 0.025);

    // Update animations (walking, sprinting, Mars falling, Sky gliding & banking)
    const isActuallySprinting = canSprint && this.currentSpeed > 5;
    this.player.updateAnimation(
      this.currentSpeed,
      isActuallySprinting,
      this.isGrounded,
      this.isJumping,
      delta,
      this.isGliding,
      this.playerVelocityY,
      this.bankAngle
    );

    // Physics-linked astronaut footprints (only when boots are on terrain/deck)
    this.trailSystem.updatePlayerStride(
      this.playerPos,
      this.playerHeading,
      this.currentSpeed,
      this.isGrounded,
      isActuallySprinting
    );

    // Synchronized astronaut footsteps, spacesuit movement & helmet breathing
    sounds.setRoverEngineState(false, 0);
    sounds.updateAstronautAudio(
      delta,
      this.currentSpeed,
      isActuallySprinting,
      this.isGrounded,
      false,
      this.oxygen
    );

    const airSpeedRatio = Math.min(1.0, Math.hypot(this.airVelX, this.airVelZ) / 14.0);
    const camFloorFn = this.isInsideUndergroundBase
      ? () => UNDERGROUND_CHAMBER_Y
      : getMarsHeight;
    const camMaxY = this.isInsideUndergroundBase ? UNDERGROUND_CHAMBER_Y + 7.2 : undefined;
    this.orbitControls.update(
      this.playerPos,
      this.playerHeading,
      delta,
      this.isGliding,
      airSpeedRatio,
      this.collisionWorld,
      camFloorFn,
      camMaxY
    );

    // Throttled Stamina HUD update (~10 Hz)
    this.staminaUiTimer += delta;
    if (this.staminaUiTimer >= 0.1) {
      this.staminaUiTimer = 0;
      this.emitStaminaTelemetry();
    }

    // Throttled Flight Energy & Altitude HUD update (~10 Hz)
    this.flightUiTimer += delta;
    if (this.flightUiTimer >= 0.1) {
      this.flightUiTimer = 0;
      this.emitFlightTelemetry();
    }

    // Sync local player transform to multiplayer room (throttled internally by MultiplayerClient)
    if (this.callbacks.onLocalStateSync) {
      const p = this._localSyncPayload;
      p.x = this.playerPos.x;
      p.y = this.playerPos.y;
      p.z = this.playerPos.z;
      p.rotationY = this.playerHeading;
      p.speed = this.currentSpeed;
      p.isRunning = isActuallySprinting;
      p.isGrounded = this.isGrounded;
      p.isJumping = this.isJumping;
      p.isDrivingRover = false;
      p.isGliding = this.isGliding;
      this.callbacks.onLocalStateSync(p);
    }

    // Throttled and delta-checked MiniMap broadcaster
    this.miniMapTimer += delta;
    if (this.miniMapTimer >= 0.10) {
      this.miniMapTimer = 0;
      const movedDist = Math.hypot(
        this.playerPos.x - this.lastEmittedPlayerX,
        this.playerPos.z - this.lastEmittedPlayerZ
      );
      const turnedRad = Math.abs(this.playerHeading - this.lastEmittedPlayerHeading);
      if (movedDist > 0.25 || turnedRad > 0.05) {
        this.lastEmittedPlayerX = this.playerPos.x;
        this.lastEmittedPlayerZ = this.playerPos.z;
        this.lastEmittedPlayerHeading = this.playerHeading;
        this.callbacks.onPlayerPositionChange?.(
          { x: this.playerPos.x, z: this.playerPos.z },
          this.playerHeading,
          { x: this.rover.position[0], z: this.rover.position[2] }
        );
      }
    }
  }

  private flushBountyDistanceDeltas(delta: number) {
    this.bountyFlushTimer += delta;
    if (this.bountyFlushTimer < 0.5) return;
    this.bountyFlushTimer = 0;

    const wholeGlide = Math.floor(this.bountyGlideAccum);
    const wholeRover = Math.floor(this.bountyRoverAccum);
    const wholeFoot = Math.floor(this.bountyFootAccum);

    if (wholeGlide > 0 || wholeRover > 0 || wholeFoot > 0) {
      this.bountyGlideAccum -= wholeGlide;
      this.bountyRoverAccum -= wholeRover;
      this.bountyFootAccum -= wholeFoot;
      this.callbacks.onBountyProgressDelta?.({
        glideMeters: wholeGlide > 0 ? wholeGlide : undefined,
        roverMeters: wholeRover > 0 ? wholeRover : undefined,
        footMeters: wholeFoot > 0 ? wholeFoot : undefined,
      });
    }
  }

  private updateTriviaScanner(stepDist: number, delta: number) {
    if (this.gameMode !== 'trivia') return;

    if (this.triviaCooldownTimer > 0) {
      this.triviaCooldownTimer = Math.max(0, this.triviaCooldownTimer - delta);
    }

    if (stepDist > 0) {
      this.triviaTravelAccum += stepDist;
    }

    this.triviaUiTimer += delta;
    if (this.triviaUiTimer >= 0.35) {
      this.triviaUiTimer = 0;
      const meters = Math.min(Math.round(this.triviaTravelAccum), Math.round(this.triviaNextThreshold));
      const threshold = Math.round(this.triviaNextThreshold);
      if (meters !== this.lastTriviaScanMeters || threshold !== this.lastTriviaScanThreshold) {
        this.lastTriviaScanMeters = meters;
        this.lastTriviaScanThreshold = threshold;
        this.callbacks.onTriviaScanProgress?.(meters, threshold);
      }
    }

    if (this.triviaCooldownTimer <= 0 && this.triviaTravelAccum >= this.triviaNextThreshold) {
      this.triggerTriviaScanNow();
    }
  }

  public triggerTriviaScanNow() {
    this.triviaTravelAccum = 0;
    this.triviaNextThreshold = Math.round(28 + Math.random() * 24);
    this.triviaCooldownTimer = 10;
    this.callbacks.onTriviaScanProgress?.(0, this.triviaNextThreshold);
    this.pause();
    sounds.playClick();
    this.callbacks.onTriviaTrigger?.(this.triviaNextThreshold);
  }

  private shortestAngle(from: number, to: number): number {
    let diff = (to - from + Math.PI) % (Math.PI * 2);
    if (diff < 0) diff += Math.PI * 2;
    return diff - Math.PI;
  }

  private lerpAngle(from: number, to: number, alpha: number): number {
    return from + this.shortestAngle(from, to) * alpha;
  }

  private updateOxygen(delta: number) {
    if (this.gameMode === 'exploration' || this.gameMode === 'trivia' || this.isInsideUndergroundBase) {
      // Infinite / pressurized oxygen in exploration, trivia expedition, and underground pressurized base
      return;
    }

    // Survival rate: slightly faster if running, increased during dust storms
    const baseDepletion = this.gameMode === 'survival' ? 0.35 : 0.26;
    const runMultiplier = (this.isRunningInput && this.currentSpeed > 5) ? 1.4 : 1.0;
    const weatherMultiplier = this.weatherSystem ? this.weatherSystem.getOxygenMultiplier() : 1.0;
    this.oxygen = Math.max(0, this.oxygen - baseDepletion * runMultiplier * weatherMultiplier * delta);

    this.oxygenThrottleTimer += delta;
    const roundedO2 = Math.round(this.oxygen);
    if (this.oxygenThrottleTimer >= 0.25 || roundedO2 !== this.lastEmittedOxygen || this.oxygen <= 0) {
      this.oxygenThrottleTimer = 0;
      this.lastEmittedOxygen = roundedO2;
      this.callbacks.onOxygenChange(this.oxygen);
    }

    if (this.oxygen <= 30 && !this.hasWarned30) {
      this.hasWarned30 = true;
      sounds.playOxygenWarning(false);
      voiceAssistant.speakCue('low_oxygen');
      if (this.gameMode === 'survival') {
        sounds.setMusicContext('survival_low_o2');
      }
      this.callbacks.onOxygenAlert('LOW OXYGEN WARNING (30%)! Return to Research Base or Rover.');
    } else if (this.oxygen <= 15 && !this.hasWarned15) {
      this.hasWarned15 = true;
      sounds.playOxygenWarning(true);
      voiceAssistant.speakCue('critical_oxygen', true);
      if (this.gameMode === 'survival') {
        sounds.setMusicContext('survival_low_o2');
      }
      this.callbacks.onOxygenAlert('CRITICAL OXYGEN ALERT (15%)! Suit life-support failing!');
    }

    if (this.oxygen <= 0) {
      this.pause();
      this.callbacks.onGameOver();
    }
  }

  private syncSurfaceVisibility(onSurface: boolean) {
    this.terrainMesh.visible = onSurface;
    if (this.environmentAssets) {
      this.environmentAssets.skyDome.visible = onSurface;
      this.environmentAssets.horizonRidge.visible = onSurface;
      this.environmentAssets.instancedRocks.visible = onSurface;
      this.environmentAssets.dustParticles.visible = onSurface;
      this.environmentAssets.phobos.visible = onSurface;
      this.environmentAssets.deimos.visible = onSurface;
    }
    this.base.group.visible = onSurface;
    this.rover.group.visible = onSurface;
    this.crystalManager.group.visible = onSurface;
    this.tabletManager.group.visible = onSurface;
    this.hiddenAreasManager.group.visible = onSurface;
    this.checkpointManager.group.visible = onSurface;
    this.satelliteRelayManager.group.visible = onSurface;
    this.multiplayer.group.visible =
      onSurface && !this.isLiveRoomActive && (this.gameMode === 'multiplayer' || this.gameMode === 'mission');
    if (this.bountyBeaconGroup) {
      this.bountyBeaconGroup.visible = onSurface && Boolean(this.activeBountyTarget);
    }
    if (this.autopilotBeaconGroup) {
      this.autopilotBeaconGroup.visible = onSurface && Boolean(this.autopilotTarget);
    }
    this.weatherSystem?.setUnderground(!onSurface);
    if (!onSurface) {
      for (let i = 0; i < this.poiPoolLights.length; i++) {
        this.poiPoolLights[i].intensity = 0;
      }
    }
  }

  private updatePoiPoolLights() {
    if (this.poiPoolLights.length === 0) return;
    if (this.isInsideUndergroundBase) {
      for (let i = 0; i < this.poiPoolLights.length; i++) {
        this.poiPoolLights[i].intensity = 0;
      }
      return;
    }

    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    const maxDistSq = 26 * 26;

    let bestDist1 = maxDistSq;
    let bestX1 = 0, bestY1 = 0, bestZ1 = 0, bestColor1 = '#ffffff', bestInt1 = 0;
    let bestDist2 = maxDistSq;
    let bestX2 = 0, bestY2 = 0, bestZ2 = 0, bestColor2 = '#ffffff', bestInt2 = 0;

    const consider = (x: number, y: number, z: number, color: string, intensity: number) => {
      const dx = px - x;
      const dz = pz - z;
      const dSq = dx * dx + dz * dz;
      if (dSq >= maxDistSq) return;
      if (dSq < bestDist1) {
        bestDist2 = bestDist1;
        bestX2 = bestX1; bestY2 = bestY1; bestZ2 = bestZ1; bestColor2 = bestColor1; bestInt2 = bestInt1;
        bestDist1 = dSq;
        bestX1 = x; bestY1 = y; bestZ1 = z; bestColor1 = color; bestInt1 = intensity;
      } else if (dSq < bestDist2) {
        bestDist2 = dSq;
        bestX2 = x; bestY2 = y; bestZ2 = z; bestColor2 = color; bestInt2 = intensity;
      }
    };

    const crystalsArr = this.crystalManager.crystals;
    for (let i = 0; i < crystalsArr.length; i++) {
      const c = crystalsArr[i];
      if (!c.isCollected) {
        consider(c.data.position[0], c.baseY + 0.25, c.data.position[2], c.data.color, 2.2);
      }
    }

    const tabletsArr = this.tabletManager.tablets;
    for (let i = 0; i < tabletsArr.length; i++) {
      const t = tabletsArr[i];
      consider(
        t.data.position[0],
        t.baseY + 1.6,
        t.data.position[2],
        t.isDiscovered ? '#10b981' : t.data.color,
        t.isDiscovered ? 0.8 : 2.0
      );
    }

    const areasArr = this.hiddenAreasManager.areas;
    for (let i = 0; i < areasArr.length; i++) {
      const a = areasArr[i];
      consider(
        a.data.position[0],
        a.data.position[1] + (a.data.category === 'cave' ? 3.0 : 4.2),
        a.data.position[2],
        a.data.color,
        2.6
      );
    }

    const relaysArr = this.satelliteRelayManager.relays;
    for (let i = 0; i < relaysArr.length; i++) {
      const r = relaysArr[i];
      consider(
        r.data.position[0],
        r.data.position[1] + 5.6,
        r.data.position[2],
        r.data.aligned ? '#10b981' : '#f59e0b',
        2.4
      );
    }

    const cpArr = this.checkpointManager.checkpoints;
    for (let i = 0; i < cpArr.length; i++) {
      const cp = cpArr[i];
      consider(
        cp.data.position[0],
        cp.data.position[1] + 2.2,
        cp.data.position[2],
        cp.isActivated ? '#22c55e' : '#f59e0b',
        cp.isActivated ? 2.2 : 1.3
      );
    }

    const l0 = this.poiPoolLights[0];
    if (bestInt1 > 0) {
      l0.position.set(bestX1, bestY1, bestZ1);
      l0.color.set(bestColor1);
      l0.intensity = bestInt1;
    } else {
      l0.intensity = 0;
    }

    if (this.poiPoolLights.length > 1) {
      const l1 = this.poiPoolLights[1];
      if (bestInt2 > 0) {
        l1.position.set(bestX2, bestY2, bestZ2);
        l1.color.set(bestColor2);
        l1.intensity = bestInt2;
      } else {
        l1.intensity = 0;
      }
    }
  }

  private updateWorld(delta: number) {
    // Dynamic Day-Night Cycle & Weather State Machine stay synchronized indoors & outdoors
    this.dayNightSystem.update(delta);

    const isInsideUnderground = this.isInsideUndergroundBase;
    const distToBase = isInsideUnderground ? 999 : Math.hypot(this.playerPos.x - (-40), this.playerPos.z - (-32));
    const isInsideBase = !isInsideUnderground && distToBase < 16;

    const isSheltered = this.isDrivingRover || isInsideBase || isInsideUnderground;
    this.weatherSystem.setSheltered(isSheltered);

    const baseLighting = {
      sunIntensity: this.dayNightSystem.currentSunIntensity,
      sunColor: this.dayNightSystem.currentSunColor,
      hemiIntensity: this.dayNightSystem.currentHemiIntensity,
      hemiSkyColor: this.dayNightSystem.currentHemiSkyColor,
      hemiGroundColor: this.dayNightSystem.currentHemiGroundColor,
      fogDensity: this.dayNightSystem.currentFogDensity,
      fogColor: this.dayNightSystem.currentFogColor,
    };
    this.weatherSystem.update(delta, this.playerPos, baseLighting);

    // Helmet Headlight Auto-activation at Night, during Dark Storms, or inside Underground Base
    const isDark =
      isInsideUnderground ||
      this.dayNightSystem.isNight ||
      this.weatherSystem.getIntensity() > 0.55;
    this.player.setHeadlightIntensity(isDark ? 2.8 : 0.0);

    if (isInsideUnderground) {
      // Underground fast-path: skip surface environment, crystals, rover, bots & surface animations
      sounds.setBaseLabProximity(1.0, delta);
      sounds.setCrystalGlowProximity(0);
      this.undergroundBase.update(delta, this.playerPos, true);
      this.rover.headlights.leftSpot.intensity = 0;
      this.rover.beaconLight.intensity = 0;
      this.flightEffects.update(delta);

      this.promptCheckTimer += delta;
      if (this.promptCheckTimer >= 0.08) {
        this.promptCheckTimer = 0;
        const prompt = this.getCurrentInteractivePrompt();
        const currentPromptId = prompt ? prompt.id : null;
        if (currentPromptId !== this.lastPromptId) {
          this.lastPromptId = currentPromptId;
          this.callbacks.onInteractivePromptChange(prompt);
        }
      }
      return;
    }

    // Anchor directional sunlight shadow frustum around player, snapped to shadow texels (zero shimmer)
    if (!this.isSoftwareGl && this.environmentAssets?.sunLight) {
      const frustum = this.deviceProfile.shadowFrustum;
      const mapSize = this.deviceProfile.shadowMapSize;
      const texelWorld = (frustum * 2) / mapSize;
      const snappedX = Math.round(this.playerPos.x / texelWorld) * texelWorld;
      const snappedZ = Math.round(this.playerPos.z / texelWorld) * texelWorld;
      const sunTarget = this.environmentAssets.sunLight.target;
      if (
        Math.abs(sunTarget.position.x - snappedX) > 0.001 ||
        Math.abs(sunTarget.position.z - snappedZ) > 0.001
      ) {
        sunTarget.position.set(snappedX, 0, snappedZ);
        sunTarget.updateMatrixWorld();
      }
    }

    this.environmentAssets.update(delta);

    // Airlock Threshold, Mission Area Zones & Laboratory Ambience
    if (isInsideBase !== this.wasInsideBaseAirlock) {
      this.wasInsideBaseAirlock = isInsideBase;
      sounds.playAirlockDoor(isInsideBase);
      if (this.isEngineRunning) {
        this.syncMusicForCurrentMode();
      }
    }

    // Smooth 2-second crossfade when moving between open exploration terrain and mission landmark zones
    if (this.gameMode === 'exploration' || this.gameMode === 'trivia') {
      const distToTower = Math.hypot(
        this.playerPos.x - this.base.commTowerPos[0],
        this.playerPos.z - this.base.commTowerPos[2]
      );
      const distToRoverArea = Math.hypot(
        this.playerPos.x - this.rover.position[0],
        this.playerPos.z - this.rover.position[2]
      );

      let nextZone: 'none' | 'rover_mission' | 'tower_mission' = this.missionAreaZone;
      if (distToTower < 17) {
        nextZone = 'tower_mission';
      } else if (distToRoverArea < 16 && !this.isDrivingRover) {
        nextZone = 'rover_mission';
      } else if (
        (this.missionAreaZone === 'tower_mission' && distToTower > 22) ||
        (this.missionAreaZone === 'rover_mission' && (distToRoverArea > 21 || this.isDrivingRover))
      ) {
        nextZone = 'none';
      }

      if (nextZone !== this.missionAreaZone) {
        this.missionAreaZone = nextZone;
        if (this.isEngineRunning && !isInsideBase) {
          this.syncMusicForCurrentMode();
        }
      }
    }
    sounds.setBaseLabProximity(
      distToBase < 24 ? Math.max(0, 1 - distToBase / 24) : 0,
      delta
    );

    this.rover.update(delta, this.playerPos);

    // Rover Headlight dynamic terrain illumination for low-light (night) or storm conditions (distance-gated)
    if (this.rover.getHeadlightsOn()) {
      const rDx = this.playerPos.x - this.rover.position[0];
      const rDz = this.playerPos.z - this.rover.position[2];
      const roverNear = rDx * rDx + rDz * rDz < 65 * 65;
      const stormIntensity = this.weatherSystem.getIntensity();
      const isLowLight = this.dayNightSystem.isNight || stormIntensity > 0.35;
      const headlightIntensity = roverNear ? (isLowLight ? 9.5 : 6.0) : 0;
      this.rover.headlights.leftSpot.intensity = headlightIntensity;

      // Volumetric beam scattering reacts dynamically to darkness and swirling dust storms
      const beamOpacity = 0.12 + stormIntensity * 0.22 + (this.dayNightSystem.isNight ? 0.08 : 0.0);
      const beams = this.rover.headlights.beams;
      for (let i = 0; i < beams.length; i++) {
        (beams[i].material as THREE.MeshBasicMaterial).opacity = beamOpacity;
      }
    }

    this.base.update(delta, this.playerPos);

    // Crystals, Lore Tablets, Hidden Areas, Underground Base & Satellite Relays update
    this.crystalManager.update(delta);
    this.tabletManager.update(delta);
    this.hiddenAreasManager.update(delta, this.playerPos);
    this.undergroundBase.update(delta, this.playerPos, false);
    this.satelliteRelayManager.update(delta, this.playerPos);

    // Throttled collision & POI light pool checks (16 Hz)
    this.collisionCheckTimer += delta;
    if (this.collisionCheckTimer >= 0.06) {
      this.collisionCheckTimer = 0;
      const lightCullDist = this.deviceProfile.lightCullDist;

      this.updatePoiPoolLights();

      // Crystal proximity glowing ambience & discovery trigger
      let nearestCrystalDist = Infinity;
      let newlyDiscoveredCrystal: CrystalData | null = null;
      const crystalsArr = this.crystalManager.crystals;
      for (let i = 0; i < crystalsArr.length; i++) {
        const c = crystalsArr[i];
        if (c.isCollected) continue;
        const d = Math.hypot(
          this.playerPos.x - c.data.position[0],
          this.playerPos.z - c.data.position[2]
        );
        if (d < nearestCrystalDist) nearestCrystalDist = d;
        if (d < 14 && !this.discoveredCrystalIds.has(c.data.id)) {
          this.discoveredCrystalIds.add(c.data.id);
          newlyDiscoveredCrystal = c.data;
        }
      }
      sounds.setCrystalGlowProximity(
        nearestCrystalDist < 16 ? Math.max(0, 1 - nearestCrystalDist / 16) : 0
      );
      if (newlyDiscoveredCrystal) {
        sounds.playCrystalDiscovery();
        voiceAssistant.speakCue('crystal_discovery');
      }

      // Rover proximity discovery cue
      if (!this.hasDiscoveredRover && !this.isDrivingRover) {
        const distToRover = Math.hypot(
          this.playerPos.x - this.rover.position[0],
          this.playerPos.z - this.rover.position[2]
        );
        if (distToRover < 15) {
          this.hasDiscoveredRover = true;
          sounds.playRoverDiscovery();
          voiceAssistant.speakCue('rover_discovery');
          this.callbacks.onNotification(
            'MARS ROVER DETECTED',
            'Curiosity Rover nearby! Press E to communicate, refill O2, or drive.',
            'normal'
          );
        }
      }

      // Research Base discovery cue
      if (!this.hasDiscoveredBase && distToBase < 25) {
        this.hasDiscoveredBase = true;
        sounds.playBaseDiscovery();
        voiceAssistant.speakCue('research_base');
        this.callbacks.onNotification(
          'RESEARCH BASE DISCOVERED',
          'Pressurized Science Station ahead! Refill your Oxygen tank inside the dock.',
          'success'
        );
      }

      // Crystals pickup check (also restores +25% Wing Flight Energy like Sky Winged Light)
      this.crystalManager.checkCollection(
        this.playerPos,
        (crystal: CrystalData) => {
          this.crystalsCollected += 1;
          this.flightEnergy = Math.min(100, this.flightEnergy + 25);
          this.emitFlightTelemetry();
          this.addScore(crystal.points);
          if (this.crystalsCollected >= 10) {
            sounds.playAllCrystalsCollected();
            voiceAssistant.speakCue('all_crystals', true);
          } else {
            sounds.playCrystalCollect();
            if (this.crystalsCollected === 5 || this.crystalsCollected === 9) {
              voiceAssistant.announceMissionProgress('Energy Crystals', this.crystalsCollected, 10);
            } else {
              voiceAssistant.speakCue('crystal_collect');
            }
          }
          this.callbacks.onCrystalsChange(this.crystalsCollected);
          if (!this.creditedCrystalIds.has(crystal.id)) {
            this.creditedCrystalIds.add(crystal.id);
            this.callbacks.onCrystalBankCredit?.(1);
          }
          this.callbacks.onBountyProgressDelta?.({ crystals: 1 });
          this.callbacks.onLocalCrystalCollect?.(crystal.id);
          this.callbacks.onNotification(
            this.crystalsCollected >= 10
              ? 'ALL 10 ENERGY CRYSTALS COLLECTED!'
              : `CRYSTAL COLLECTED (${this.crystalsCollected}/10) · +25% Flight`,
            `Found ${crystal.name} (${crystal.mineralType}). ${crystal.scientificFact}`,
            'success'
          );

          // Mission 2 check (Collect 10 energy crystals)
          const m2 = this.missionsState.get(2);
          if (m2 && !m2.completed) {
            m2.current = this.crystalsCollected;
            this.callbacks.onMissionProgress(2, m2.current, m2.current >= 10);
            if (m2.current >= 10) {
              m2.completed = true;
              this.awardMissionReward(2);
            }
          }
        },
        lightCullDist
      );

      // Checkpoints activation check
      this.checkpointManager.checkActivation(
        this.playerPos,
        (cp: CheckpointData) => {
          sounds.playNewDiscovery();
          this.addScore(50);
          this.callbacks.onCheckpointChange(cp);
          this.callbacks.onLocalCheckpointActivate?.(cp.id);
          this.callbacks.onNotification(
            'CHECKPOINT ACTIVATED!',
            `${cp.name} recorded. Expeditions will respawn here!`,
            'success'
          );

          // Mission 1 check (Reach Red Basin Overlook checkpoint)
          let completedM1Now = false;
          if (cp.id === 'basin') {
            const m1 = this.missionsState.get(1);
            if (m1 && !m1.completed) {
              m1.current = 1;
              m1.completed = true;
              completedM1Now = true;
              this.callbacks.onMissionProgress(1, 1, true);
              this.awardMissionReward(1);
            }
          }
          if (!completedM1Now) {
            if (cp.id === 'canyon' || cp.id === 'crater_north') {
              voiceAssistant.speakCue('educational_fact');
            } else {
              voiceAssistant.speakCue('checkpoint_activated');
            }
          }
        },
        lightCullDist
      );

      // Mars History Tablets proximity discovery check
      this.tabletManager.checkCollection(
        this.playerPos,
        (tablet: HistoryTabletData) => {
          sounds.playNewDiscovery();
          voiceAssistant.speakCue('tablet_discovery');
          this.callbacks.onTabletDiscover?.(tablet);
        },
        Math.min(lightCullDist, 45)
      );

      // Hidden Caves & Secret Research Sites discovery check
      this.hiddenAreasManager.checkDiscovery(this.playerPos, (area) => {
        sounds.playCaveDiscovery();
        voiceAssistant.speakCue('cave_discovery');
        this.addScore(area.xpReward);
        const allAreas = this.hiddenAreasManager.getAreasList();
        const discoveredCount = allAreas.filter((a) => a.discovered).length;
        this.callbacks.onHiddenAreaDiscover?.(area, allAreas);
        this.callbacks.onNotification(
          `${area.category === 'cave' ? '🕳️ CAVE DISCOVERED' : '🔬 SECRET SITE FOUND'}: ${area.name.toUpperCase()}`,
          `${area.badgeName} badge unlocked! +${area.xpReward} XP · ${area.scienceFact}`,
          'success'
        );

        const m7 = this.missionsState.get(7);
        if (m7 && !m7.completed) {
          m7.current = Math.min(3, discoveredCount);
          const done = m7.current >= 3;
          this.callbacks.onMissionProgress(7, m7.current, done);
          if (done) {
            m7.completed = true;
            this.awardMissionReward(7);
          }
        }
      });

      // Active Daily Bounty reach-location beacon check
      if (this.activeBountyTarget) {
        const distToBounty = Math.hypot(
          this.playerPos.x - this.activeBountyTarget.x,
          this.playerPos.z - this.activeBountyTarget.z
        );
        if (distToBounty <= this.activeBountyTarget.radius) {
          const reachedId = this.activeBountyTarget.id;
          this.setDailyBountyTarget(null);
          this.callbacks.onBountyTargetReached?.(reachedId);
        }
      }
    }

    // Animate golden Daily Bounty beacon & cyan Auto-Pilot beacon if active
    if (this.bountyBeaconGroup && this.bountyBeaconGroup.visible && this.bountyDiamondMesh) {
      this.bountyDiamondMesh.rotation.y += delta * 2.2;
      this.bountyDiamondMesh.position.y = 3.2 + Math.sin(this.clock.elapsedTime * 2.6) * 0.45;
    }
    if (this.autopilotBeaconGroup && this.autopilotBeaconGroup.visible && this.autopilotRingMesh) {
      const pulseScale = 1 + Math.sin(this.clock.elapsedTime * 4.0) * 0.14;
      this.autopilotRingMesh.scale.set(pulseScale, pulseScale, 1);
    }

    // Checkpoints rotation animation
    this.checkpointManager.update(delta);

    // Multiplayer (Bots when offline solo, Live Friend Astronauts when in a room)
    if (!this.isLiveRoomActive && this.multiplayer.group.visible) {
      this.multiplayer.update(delta);
    }
    this.remotePlayers.update(delta);

    // 10. Physics-linked trail system, wind streamlines, and landing/flight particle effects
    const stormIntensity = this.weatherSystem ? this.weatherSystem.getIntensity() : 0;
    this.trailSystem.setStormIntensity(stormIntensity);
    this.trailSystem.update(delta);
    this.windSystem.update(delta, this.playerPos, this.playerHeading, stormIntensity, this.isGliding);
    this.flightEffects.update(delta);

    // Interactive prompt check throttled to 12 Hz with event-driven state change
    this.promptCheckTimer += delta;
    if (this.promptCheckTimer >= 0.08) {
      this.promptCheckTimer = 0;
      const prompt = this.getCurrentInteractivePrompt();
      const currentPromptId = prompt ? prompt.id : null;
      if (currentPromptId !== this.lastPromptId) {
        this.lastPromptId = currentPromptId;
        this.callbacks.onInteractivePromptChange(prompt);
      }
    }
  }

  public getIsDrivingRover(): boolean {
    return this.isDrivingRover;
  }

  public getCrystalsList(): { id: number; x: number; z: number; collected: boolean }[] {
    return this.crystalManager.crystals.map((c) => ({
      id: c.data.id,
      x: c.data.position[0],
      z: c.data.position[2],
      collected: c.isCollected,
    }));
  }

  public triggerDustStorm() {
    this.weatherSystem.triggerStormNow();
  }

  public cycleTimeOfSol(): void {
    this.dayNightSystem.cycleNextPhase();
  }

  public setTimeOfSol(hour: number): void {
    this.dayNightSystem.setTimeOfSol(hour);
  }

  public toggleRoverHeadlights(): boolean {
    const newState = this.rover.toggleHeadlights();
    this.callbacks.onRoverHeadlightsChange?.(newState);
    this.callbacks.onLocalRoverHeadlightsToggle?.(newState);
    sounds.playClick();
    this.callbacks.onNotification(
      'ROVER HEADLIGHTS',
      newState ? 'High-beam terrain spotlights ACTIVATED.' : 'Headlights DEACTIVATED.',
      'normal'
    );
    return newState;
  }

  public setRoverHeadlights(enabled: boolean): void {
    this.rover.setHeadlights(enabled);
    this.callbacks.onRoverHeadlightsChange?.(enabled);
  }

  public getRoverHeadlightsState(): boolean {
    return this.rover.getHeadlightsOn();
  }

  public applyRoverCustomization(config: RoverCustomization): void {
    this.rover.applyCustomization(config);
  }

  public getRoverCustomization(): RoverCustomization {
    return this.rover.getCustomization();
  }

  public setRoverPedals(forward: number, turn: number) {
    this.roverPedalState.forward = THREE.MathUtils.clamp(forward, -1, 1);
    this.roverPedalState.turn = THREE.MathUtils.clamp(turn, -1, 1);
  }

  public setRoverBoost(active: boolean) {
    if (active && !this.roverPedalState.boost) {
      sounds.playRoverBoost();
    }
    this.roverPedalState.boost = active;
  }

  public triggerRoverHorn() {
    sounds.playRoverHorn();
  }

  public applyEngineUpgrades(upgrades: Pick<RoverEngineUpgrades, 'topSpeedLevel' | 'boostRecoveryLevel'>): void {
    this.rover.applyEngineUpgrades(upgrades);
  }

  public triggerRoverJump(): boolean {
    if (!this.isDrivingRover) return false;
    const res = this.rover.triggerJump();
    if (res.jumped) {
      sounds.playRoverJump();
      this.flightEffects.spawnLandingDust(
        this.rover.position[0],
        this.rover.position[1],
        this.rover.position[2],
        0.72
      );
      this.emitRoverDriveTelemetry(true);
      return true;
    }

    if (res.reason === 'low_boost' && this.roverLowBoostWarnTimer <= 0) {
      this.roverLowBoostWarnTimer = 1.6;
      this.callbacks.onNotification(
        'LOW BOOST ENERGY',
        'Need 20% Boost Energy to fire Rover Jump Thrusters!',
        'warning'
      );
    }
    return false;
  }

  public startRoverAutoPilot(waypoint: AutoPilotWaypoint): boolean {
    if (this.isInsideUndergroundBase) {
      this.callbacks.onNotification(
        'SURFACE ACCESS REQUIRED',
        'Exit the Underground Research Base first to pilot the Curiosity Rover on the surface!',
        'warning'
      );
      return false;
    }

    if (!this.isDrivingRover) {
      const boarded = this.toggleRoverDrive();
      if (!boarded) return false;
    }

    this.autopilotTarget = { ...waypoint };
    this.autopilotAvoiding = false;
    this.autopilotReverseTimer = 0;
    this.autopilotProgressTimer = 0;
    this.autopilotLastCheckX = this.rover.position[0];
    this.autopilotLastCheckZ = this.rover.position[2];
    this.autopilotUiTimer = 0;

    if (this.autopilotBeaconGroup) {
      const groundY = getMarsHeight(waypoint.x, waypoint.z);
      this.autopilotBeaconGroup.position.set(waypoint.x, groundY, waypoint.z);
      this.autopilotBeaconGroup.visible = true;
    }

    const dist = Math.hypot(
      waypoint.x - this.rover.position[0],
      waypoint.z - this.rover.position[2]
    );
    this.emitAutoPilotState(dist, true);
    sounds.playComputerInterface();
    this.callbacks.onNotification(
      'AUTO-PILOT ENGAGED',
      `Navigating Rover autonomously to ${waypoint.title} (${Math.round(dist)}m).`,
      'success'
    );
    return true;
  }

  public cancelRoverAutoPilot(reason: 'manual' | 'arrived' | 'user' | 'reset' = 'user'): void {
    const prevTarget = this.autopilotTarget;
    this.autopilotTarget = null;
    this.autopilotAvoiding = false;
    this.autopilotReverseTimer = 0;
    this.autopilotProgressTimer = 0;
    if (this.autopilotBeaconGroup) {
      this.autopilotBeaconGroup.visible = false;
    }
    this.emitAutoPilotState(0, true);

    if (!prevTarget || reason === 'reset') return;
    if (reason === 'arrived') {
      sounds.playMissionObjective();
      this.callbacks.onNotification(
        'AUTO-PILOT ARRIVED!',
        `Reached ${prevTarget.title}. Telemetry braking engaged.`,
        'success'
      );
    } else if (reason === 'manual') {
      sounds.playClick();
      this.callbacks.onNotification(
        'MANUAL OVERRIDE',
        `Auto-Pilot disengaged — you have full steering control.`,
        'normal'
      );
    } else {
      sounds.playClick();
      this.callbacks.onNotification(
        'AUTO-PILOT CANCELLED',
        `Navigation to ${prevTarget.title} aborted.`,
        'normal'
      );
    }
  }

  public getAutoPilotState(): AutoPilotState {
    if (!this.autopilotTarget) {
      return {
        active: false,
        target: null,
        distanceMeters: 0,
        etaSeconds: 0,
        avoidingObstacle: false,
        reversingRecovery: false,
      };
    }
    const dist = Math.hypot(
      this.autopilotTarget.x - this.rover.position[0],
      this.autopilotTarget.z - this.rover.position[2]
    );
    const estSpeed = Math.max(2.5, 6.4 * this.rover.getDurabilityState().speedMultiplier);
    return {
      active: true,
      target: this.autopilotTarget,
      distanceMeters: Math.round(dist),
      etaSeconds: Math.max(1, Math.round(dist / estSpeed)),
      avoidingObstacle: this.autopilotAvoiding,
      reversingRecovery: this.autopilotReverseTimer > 0,
    };
  }

  private emitAutoPilotState(dist: number, force = false): void {
    const durabilityMult = this.rover.getDurabilityState().speedMultiplier;
    const estSpeed = Math.max(2.5, 6.4 * durabilityMult);
    const nextDist = Math.round(dist);
    const nextEta = this.autopilotTarget ? Math.max(1, Math.round(dist / estSpeed)) : 0;
    const active = Boolean(this.autopilotTarget);
    const reversing = this.autopilotReverseTimer > 0;
    const prev = this.lastAutopilotUiState;

    if (
      !force &&
      prev &&
      prev.active === active &&
      prev.target?.id === this.autopilotTarget?.id &&
      prev.distanceMeters === nextDist &&
      prev.avoidingObstacle === this.autopilotAvoiding &&
      prev.reversingRecovery === reversing
    ) {
      return;
    }

    const nextState: AutoPilotState = {
      active,
      target: this.autopilotTarget,
      distanceMeters: nextDist,
      etaSeconds: nextEta,
      avoidingObstacle: this.autopilotAvoiding,
      reversingRecovery: reversing,
    };
    this.lastAutopilotUiState = nextState;
    this.callbacks.onAutoPilotChange?.(nextState);
  }

  private emitRoverDriveTelemetry(force = false) {
    const next = this.rover.getDriveTelemetry();
    const prev = this.lastRoverTelemetry;
    if (
      !force &&
      prev &&
      Math.round(prev.speedKmh) === Math.round(next.speedKmh) &&
      prev.gear === next.gear &&
      Math.round(prev.boostEnergy) === Math.round(next.boostEnergy) &&
      prev.boostActive === next.boostActive &&
      prev.isAirborne === next.isAirborne &&
      prev.isDrifting === next.isDrifting &&
      Math.abs(prev.driftIntensity - next.driftIntensity) < 0.15
    ) {
      return;
    }
    this.lastRoverTelemetry = next;
    this.callbacks.onRoverDriveTelemetryChange?.(next);
  }

  public getHiddenAreasList(): HiddenAreaData[] {
    return this.hiddenAreasManager.getAreasList();
  }

  public getSatelliteRelaysList(): SatelliteRelayData[] {
    return this.satelliteRelayManager.getRelaysList();
  }

  public enterUndergroundBase() {
    if (this.isInsideUndergroundBase) return;
    if (this.isDrivingRover) {
      this.toggleRoverDrive();
    }
    this.isInsideUndergroundBase = true;
    this.isGliding = false;
    this.playerVelocityY = 0;
    this.airVelX = 0;
    this.airVelZ = 0;
    this.syncSurfaceVisibility(false);

    const target = this.undergroundBase.undergroundReturnPos;
    this.playerPos.set(target[0] - 2.6, UNDERGROUND_CHAMBER_Y + 0.05, target[2]);
    this.player.group.position.copy(this.playerPos);
    this.contactShadow.position.set(this.playerPos.x, UNDERGROUND_CHAMBER_Y + 0.04, this.playerPos.z);

    sounds.playUndergroundLift(true);
    this.refillOxygen();
    this.callbacks.onUndergroundStateChange?.(true);
    this.syncMusicForCurrentMode();

    if (!this.hasEnteredUndergroundOnce) {
      this.hasEnteredUndergroundOnce = true;
      voiceAssistant.speakCue('underground_base');
      this.updateMission8Progress();
    }

    this.callbacks.onNotification(
      'UNDERGROUND RESEARCH BASE (-28m)',
      'Welcome inside Subterranean Habitat! Visit the Hydroponics Bay, Ice-Core Drill, or Science Lab Bench.',
      'success'
    );
    this.orbitControls.resetCamera(this.playerHeading);
  }

  public exitUndergroundBase() {
    if (!this.isInsideUndergroundBase) return;
    this.isInsideUndergroundBase = false;
    this.playerVelocityY = 0;
    this.airVelX = 0;
    this.airVelZ = 0;
    this.syncSurfaceVisibility(true);

    const hatch = this.undergroundBase.surfaceHatchPos;
    const surfY = this.getSupportGroundY(hatch[0] + 3.2, hatch[1] + 1, hatch[2]);
    this.playerPos.set(hatch[0] + 3.2, surfY, hatch[2]);
    this.player.group.position.copy(this.playerPos);
    this.contactShadow.position.set(this.playerPos.x, surfY + 0.04, this.playerPos.z);

    sounds.playUndergroundLift(false);
    this.callbacks.onUndergroundStateChange?.(false);
    this.syncMusicForCurrentMode();
    this.callbacks.onNotification(
      'RETURNED TO SURFACE',
      'Back on the Main Research Base deck.',
      'normal'
    );
    this.orbitControls.resetCamera(this.playerHeading);
  }

  public recordLabExperimentComplete(experimentId: string, xpReward: number) {
    const isNew = !this.completedLabExperiments.has(experimentId);
    this.completedLabExperiments.add(experimentId);
    if (isNew) {
      this.addScore(xpReward);
      this.updateMission8Progress();
      this.callbacks.onNotification(
        'EXPERIMENT SUCCESSFUL!',
        `Safe Mars Lab experiment completed! +${xpReward} XP`,
        'success'
      );
    }
  }

  private updateMission8Progress() {
    const m8 = this.missionsState.get(8);
    if (!m8 || m8.completed) return;
    const stepsDone =
      (this.hasEnteredUndergroundOnce ? 1 : 0) +
      (this.completedLabExperiments.size >= 1 ? 1 : 0);
    m8.current = Math.min(2, stepsDone);
    const completed = m8.current >= 2;
    this.callbacks.onMissionProgress(8, m8.current, completed);
    if (completed) {
      m8.completed = true;
      this.awardMissionReward(8);
    }
  }

  public completeSatelliteRelayAlignment(relayId: string) {
    const newlyAligned = this.satelliteRelayManager.alignRelay(relayId);
    if (!newlyAligned) return;
    this.addScore(150);

    const relays = this.satelliteRelayManager.getRelaysList();
    const alignedCount = relays.filter((r) => r.aligned).length;
    this.callbacks.onNotification(
      `SATELLITE RELAY ONLINE (${alignedCount}/3)`,
      'Orbital telemetry beam locked! +150 XP',
      'success'
    );

    const m9 = this.missionsState.get(9);
    if (m9 && !m9.completed) {
      m9.current = Math.min(3, alignedCount);
      const completed = m9.current >= 3;
      this.callbacks.onMissionProgress(9, m9.current, completed);
      if (completed) {
        m9.completed = true;
        this.awardMissionReward(9);
      }
    }
  }

  // --- REAL-TIME MULTIPLAYER REMOTE SYNC METHODS (Zero Loopback) ---

  public syncRemoteSnapshot(snapshot: RoomSnapshot) {
    this.setLiveRoomActive(true);
    this.remotePlayers.syncSnapshot(snapshot.players);

    // Sync collected crystals idempotently
    let crystalSynced = false;
    snapshot.collectedCrystals.forEach((cid) => {
      const data = this.crystalManager.markCollectedById(cid, false);
      if (data) {
        this.crystalsCollected += 1;
        crystalSynced = true;
      }
    });
    if (crystalSynced) {
      this.callbacks.onCrystalsChange(this.crystalsCollected);
      const m2 = this.missionsState.get(2);
      if (m2) {
        m2.current = this.crystalsCollected;
        if (m2.current >= 10 && !m2.completed) {
          m2.completed = true;
        }
        this.callbacks.onMissionProgress(2, m2.current, m2.completed);
      }
    }

    // Sync rover pose & driver
    this.applyRemoteRoverState(snapshot.roverState);

    // Sync tower activation
    if (snapshot.towerActivated && !this.base.isTowerActivated) {
      this.base.activateTower();
    }

    // Sync missions
    snapshot.completedMissions.forEach((mid) => {
      this.applyRemoteMissionCompleted(mid);
    });
  }

  public upsertRemotePlayer(player: RemotePlayerState) {
    this.remotePlayers.upsertPlayer(player);
  }

  public moveRemotePlayer(deltaState: Partial<RemotePlayerState> & { id: string }) {
    this.remotePlayers.applyMovementDelta(deltaState);
  }

  public updateRemotePlayerMeta(playerId: string, name: string, suitColor: SuitColor) {
    this.remotePlayers.updateMeta(playerId, name, suitColor);
  }

  public removeRemotePlayer(playerId: string) {
    this.remotePlayers.removePlayer(playerId);
  }

  public applyRemoteRoverState(roverState: SharedRoverState) {
    this.remoteRoverDriverName =
      roverState.driverId && roverState.driverId !== this.localPlayerId
        ? roverState.driverName || 'Friend'
        : null;

    if (!this.isDrivingRover) {
      this.rover.setExternalPose(roverState.x, roverState.z, roverState.rotationY, this.collisionWorld);
      this.rover.setHeadlights(roverState.headlightsOn);
      this.callbacks.onRoverHeadlightsChange?.(roverState.headlightsOn);
    }
  }

  public applyRemoteCrystalCollected(crystalId: number, collectorName: string) {
    const data = this.crystalManager.markCollectedById(crystalId, true);
    if (!data) return;

    this.crystalsCollected += 1;
    this.addScore(data.points);
    sounds.playCrystalCollect();
    this.callbacks.onCrystalsChange(this.crystalsCollected);
    this.callbacks.onNotification(
      'FRIEND FOUND CRYSTAL!',
      `${collectorName} collected ${data.name} (${this.crystalsCollected}/10)!`,
      'success'
    );

    const m2 = this.missionsState.get(2);
    if (m2 && !m2.completed) {
      m2.current = this.crystalsCollected;
      this.callbacks.onMissionProgress(2, m2.current, m2.current >= 10);
      if (m2.current >= 10) {
        m2.completed = true;
        this.awardMissionReward(2, true);
      }
    }
  }

  public applyRemoteCheckpointActivated(checkpointId: string, activatorName: string) {
    const cp = this.checkpointManager.checkpoints.find((c) => c.data.id === checkpointId);
    if (cp && !cp.isActivated) {
      this.checkpointManager.setActiveCheckpoint(checkpointId);
      this.callbacks.onCheckpointChange(cp.data);
      this.callbacks.onNotification(
        'CREW CHECKPOINT',
        `${activatorName} reached ${cp.data.name}!`,
        'normal'
      );
      if (checkpointId === 'basin') {
        const m1 = this.missionsState.get(1);
        if (m1 && !m1.completed) {
          m1.current = 1;
          m1.completed = true;
          this.callbacks.onMissionProgress(1, 1, true);
          this.awardMissionReward(1, true);
        }
      }
    }
  }

  public applyRemoteMissionCompleted(missionId: number) {
    const m = this.missionsState.get(missionId);
    if (m && !m.completed) {
      m.completed = true;
      m.current = missionId === 2 ? 10 : 1;
      this.callbacks.onMissionProgress(missionId, m.current, true);
    }
  }

  public applyRemoteTowerActivated(activatedBy: string) {
    if (!this.base.isTowerActivated) {
      this.base.activateTower();
      sounds.playMissionComplete();
      this.callbacks.onNotification(
        'EARTH UPLINK ONLINE!',
        `${activatedBy} activated the Deep Space Comm Tower!`,
        'success'
      );
      const m5 = this.missionsState.get(5);
      if (m5 && !m5.completed) {
        m5.current = 1;
        m5.completed = true;
        this.callbacks.onMissionProgress(5, 1, true);
        this.awardMissionReward(5, true);
      }
    }
  }

  public spawnRemotePing(ping: PingBeaconData) {
    this.remotePlayers.spawnPingBeacon(ping);
  }

  public getRemotePlayersForMap(): {
    id: string;
    name: string;
    x: number;
    z: number;
    color: string;
    isDrivingRover: boolean;
  }[] {
    return this.remotePlayers.getRemotePlayersList().map((p) => {
      const suit = SUIT_COLORS.find((s) => s.id === p.suitColor) || SUIT_COLORS[0];
      return {
        id: p.id,
        name: p.name,
        x: p.x,
        z: p.z,
        color: suit.accent,
        isDrivingRover: p.isDrivingRover,
      };
    });
  }

  public syncDiscoveredTablets(ids: string[]) {
    this.tabletManager?.syncDiscoveredIds(ids);
  }

  public getTabletsList(): { id: string; x: number; z: number; discovered: boolean }[] {
    return this.tabletManager ? this.tabletManager.getTabletsList() : [];
  }

  public getPlayerPosition(): { x: number; y: number; z: number } {
    return { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z };
  }

  public exportOfflineSaveState(): OfflineExpeditionSave | null {
    if (this.gameMode === 'multiplayer') return null;

    const collectedCrystalIds = this.getCrystalsList()
      .filter((c) => c.collected)
      .map((c) => c.id);
    const completedMissionIds: number[] = [];
    this.missionsState.forEach((m, id) => {
      if (m.completed) completedMissionIds.push(id);
    });
    const discoveredHiddenAreaIds = this.hiddenAreasManager
      .getAreasList()
      .filter((a) => a.discovered)
      .map((a) => a.id);
    const alignedRelayIds = this.satelliteRelayManager
      .getRelaysList()
      .filter((r) => r.aligned)
      .map((r) => r.id);

    const activeCp = this.checkpointManager.activeCheckpoint;

    return {
      version: 1,
      savedAt: Date.now(),
      gameMode: this.gameMode,
      suitColor: this.currentSuitColor,
      oxygen: Math.round(this.oxygen),
      score: Math.round(this.score),
      activeCheckpointId: activeCp?.id || 'landing',
      playerPos: {
        x: Number(this.playerPos.x.toFixed(2)),
        z: Number(this.playerPos.z.toFixed(2)),
      },
      roverPos: {
        x: Number(this.rover.group.position.x.toFixed(2)),
        z: Number(this.rover.group.position.z.toFixed(2)),
        rotationY: Number(this.rover.group.rotation.y.toFixed(3)),
      },
      roverHeadlightsOn: this.rover.getHeadlightsOn(),
      collectedCrystalIds,
      completedMissionIds,
      discoveredHiddenAreaIds,
      alignedRelayIds,
      completedLabIds: Array.from(this.completedLabExperiments),
      towerActivated: this.base.isTowerActivated,
    };
  }

  public restoreOfflineSaveState(save: OfflineExpeditionSave) {
    this.setGameMode(save.gameMode);
    this.setSuitColor(save.suitColor);
    this.restartGame(false);

    this.oxygen = Math.max(20, Math.min(100, save.oxygen));
    this.score = Math.max(0, save.score);
    this.callbacks.onOxygenChange(this.oxygen);
    this.callbacks.onScoreChange(this.score);

    // Restore crystals
    let crystalTotal = 0;
    this.creditedCrystalIds.clear();
    save.collectedCrystalIds.forEach((cid) => {
      const data = this.crystalManager.markCollectedById(cid, false);
      if (data) {
        crystalTotal += 1;
        this.creditedCrystalIds.add(cid);
      }
    });
    this.crystalsCollected = crystalTotal;
    this.callbacks.onCrystalsChange(this.crystalsCollected);

    // Restore hidden caves & secret areas
    save.discoveredHiddenAreaIds.forEach((aid) => {
      this.hiddenAreasManager.markDiscoveredById(aid);
    });
    this.callbacks.onHiddenAreaDiscover?.(
      this.hiddenAreasManager.getAreasList()[0],
      this.hiddenAreasManager.getAreasList()
    );

    // Restore satellite relays
    save.alignedRelayIds.forEach((rid) => {
      this.satelliteRelayManager.alignRelay(rid);
    });

    // Restore science lab experiments
    this.completedLabExperiments.clear();
    save.completedLabIds.forEach((lid) => this.completedLabExperiments.add(lid));

    // Restore comm tower
    if (save.towerActivated && !this.base.isTowerActivated) {
      this.base.activateTower();
    }

    // Restore checkpoint
    this.checkpointManager.setActiveCheckpoint(save.activeCheckpointId);
    const activeCp = this.checkpointManager.activeCheckpoint;
    if (activeCp) {
      this.callbacks.onCheckpointChange(activeCp);
    }

    // Restore missions
    save.completedMissionIds.forEach((mid) => {
      const m = this.missionsState.get(mid);
      if (m) {
        m.completed = true;
        m.current = mid === 2 ? 10 : mid === 7 || mid === 8 || mid === 9 ? 3 : 1;
        this.callbacks.onMissionProgress(mid, m.current, true);
      }
    });
    const m2 = this.missionsState.get(2);
    if (m2 && !m2.completed) {
      m2.current = this.crystalsCollected;
      this.callbacks.onMissionProgress(2, m2.current, m2.current >= 10);
    }
    const m7 = this.missionsState.get(7);
    if (m7 && !m7.completed) {
      const discoveredCount = this.hiddenAreasManager.getAreasList().filter((a) => a.discovered).length;
      m7.current = Math.min(3, discoveredCount);
      this.callbacks.onMissionProgress(7, m7.current, m7.current >= 3);
    }
    const m8 = this.missionsState.get(8);
    if (m8 && !m8.completed) {
      m8.current = Math.min(3, this.completedLabExperiments.size);
      this.callbacks.onMissionProgress(8, m8.current, m8.current >= 3);
    }
    const m9 = this.missionsState.get(9);
    if (m9 && !m9.completed) {
      const alignedCount = this.satelliteRelayManager.getRelaysList().filter((r) => r.aligned).length;
      m9.current = Math.min(3, alignedCount);
      this.callbacks.onMissionProgress(9, m9.current, m9.current >= 3);
    }

    // Restore Rover pose
    this.rover.setExternalPose(save.roverPos.x, save.roverPos.z, save.roverPos.rotationY, this.collisionWorld);
    this.rover.setHeadlights(save.roverHeadlightsOn);
    this.callbacks.onRoverHeadlightsChange?.(save.roverHeadlightsOn);

    // Restore Player pose safely onto surface ground (avoid spawning inside underground void)
    const safeX = save.playerPos.x;
    const safeZ = save.playerPos.z;
    const groundY = this.getSupportGroundY(safeX, getMarsHeight(safeX, safeZ) + 1.5, safeZ);
    this.playerPos.set(safeX, groundY, safeZ);
    this.player.group.position.copy(this.playerPos);

    this.hasSpokenGameStart = true;
    this.resume();
  }

  /**
   * Captures the current 3D WebGL canvas state as a PNG data URL.
   * Renders synchronously immediately prior to toDataURL() so the drawing buffer is preserved.
   */
  public captureScreenshot(): string | null {
    if (!this.renderer || !this.scene || !this.orbitControls) return null;
    if (this.renderer.shadowMap.enabled && !this.renderer.shadowMap.autoUpdate) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.orbitControls.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public dispose() {
    this.pause();
    this.cleanupListeners.forEach((cleanup) => cleanup());
    this.dayNightSystem.dispose();
    this.weatherSystem.dispose();
    this.windSystem.dispose();
    this.flightEffects.dispose();
    this.trailSystem.dispose();
    this.environmentAssets.dispose();
    this.rover.dispose();
    this.base.dispose();
    this.crystalManager.dispose();
    this.tabletManager.dispose();
    this.hiddenAreasManager.dispose();
    this.undergroundBase.dispose();
    this.satelliteRelayManager.dispose();
    this.checkpointManager.dispose();
    for (let i = 0; i < this.poiPoolLights.length; i++) {
      this.scene.remove(this.poiPoolLights[i]);
      this.poiPoolLights[i].dispose();
    }
    this.poiPoolLights = [];
    this.multiplayer.dispose();
    this.remotePlayers.dispose();
    if (this.bountyBeaconGroup) {
      this.bountyBeaconGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    if (this.autopilotBeaconGroup) {
      this.autopilotBeaconGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.terrainMesh.geometry.dispose();
    (this.terrainMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
