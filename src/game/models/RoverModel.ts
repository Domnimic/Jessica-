import * as THREE from 'three';
import { getMarsHeight } from '../terrain';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type {
  RoverDurabilityData,
  RoverDurabilityStatus,
  RoverTerrainStress,
  RoverDriveTelemetry,
  RoverCustomization,
  RoverEngineUpgrades,
} from '../../types/game';
import {
  DEFAULT_ROVER_CUSTOMIZATION,
  ROVER_WHEEL_STYLES,
} from '../../data/roverCustomization';
import {
  DEFAULT_ROVER_UPGRADES,
  getRoverUpgradeStats,
} from '../../data/roverUpgrades';

export interface RoverObject {
  group: THREE.Group;
  mastCam: THREE.Group;
  dish: THREE.Group;
  wheels: THREE.Mesh[];
  beaconLight: THREE.PointLight;
  headlights: {
    leftSpot: THREE.SpotLight;
    rightSpot: THREE.SpotLight;
    leftLens: THREE.Mesh;
    rightLens: THREE.Mesh;
    beams: THREE.Mesh[];
  };
  position: [number, number, number];
  rotationY: number;
  isDriving: boolean;
  drive: (
    forwardInput: number,
    turnInput: number,
    delta: number,
    collisionWorld?: CollisionWorld,
    stormIntensity?: number,
    onCollisionImpact?: (severity: number, x: number, y: number, z: number) => void,
    boostRequested?: boolean,
    onJumpLanding?: (intensity: number, x: number, y: number, z: number) => void,
    allowDrift?: boolean
  ) => { x: number; y: number; z: number };
  triggerJump: () => {
    jumped: boolean;
    reason?: 'airborne' | 'low_boost' | 'cooldown';
    boostRemaining: number;
  };
  applyEngineUpgrades: (upgrades: Pick<RoverEngineUpgrades, 'topSpeedLevel' | 'boostRecoveryLevel'>) => void;
  getDriveTelemetry: () => RoverDriveTelemetry;
  getDurabilityState: () => RoverDurabilityData;
  repair: (amount?: number) => { previous: number; repairedTo: number; wasDamaged: boolean };
  resetDurability: () => void;
  updateCollider: (world: CollisionWorld) => void;
  setExternalPose: (x: number, z: number, rotationY: number, collisionWorld?: CollisionWorld) => void;
  setHeadlights: (enabled: boolean) => void;
  toggleHeadlights: () => boolean;
  getHeadlightsOn: () => boolean;
  applyCustomization: (config: RoverCustomization) => void;
  getCustomization: () => RoverCustomization;
  update: (delta: number, playerPos?: THREE.Vector3) => void;
  dispose: () => void;
}

const _roverPosReturn = { x: 0, y: 0, z: 0 };
const _roverResolvedXZ = { x: 0, z: 0 };
const ROVER_COLLISION_RADIUS = 1.65;
const ROVER_HEIGHT = 2.6;
export const ROVER_JUMP_BOOST_COST = 20;
const ROVER_JUMP_VELOCITY = 6.4;
const ROVER_GRAVITY = 9.8;

export function createMarsRover(initialX: number = 28, initialZ: number = -24): RoverObject {
  const group = new THREE.Group();
  group.name = 'MarsRover';
  group.rotation.order = 'YXZ';

  let posX = initialX;
  let posZ = initialZ;
  let posY = getMarsHeight(posX, posZ);
  let rotY = -Math.PI * 0.4;
  let isDriving = false;

  // Durability & Harsh Terrain Wear State
  let integrity = 100;
  let collisionCount = 0;
  let impactCooldown = 0;
  let impactFlashTimer = 0;
  let terrainStress: RoverTerrainStress = 'SMOOTH';
  let targetPitch = 0;
  let targetRoll = 0;

  // Driving Speed, Boost, Jump, Drift & Upgrade State
  let boostEnergy = 100;
  let boostActive = false;
  let currentSpeedMps = 0;
  let velX = 0;
  let velZ = 0;
  let velocityY = 0;
  let isGrounded = true;
  let coyoteTimer = 0;
  let jumpCooldown = 0;
  let jumpBurstTimer = 0;
  let isDrifting = false;
  let driftIntensity = 0;
  let driftPhase = 0;
  let currentGear: 'P' | 'D' | 'R' | 'BOOST' = 'P';
  let upgradeStats = getRoverUpgradeStats(DEFAULT_ROVER_UPGRADES);

  group.position.set(posX, posY, posZ);
  group.rotation.y = rotY;

  // Materials
  const chassisMat = new THREE.MeshStandardMaterial({
    color: '#f1f5f9',
    roughness: 0.35,
    metalness: 0.65,
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.25,
    metalness: 0.85,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.6,
    metalness: 0.7,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    color: '#1e1b4b',
    roughness: 0.2,
    metalness: 0.9,
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.75,
    metalness: 0.4,
    flatShading: true,
  });

  const wheelTrimMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.35,
    metalness: 0.85,
  });

  const turboGlowMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
  });

  let activeCustomization: RoverCustomization = { ...DEFAULT_ROVER_CUSTOMIZATION };

  // 1. Central Body
  const bodyGeo = new THREE.BoxGeometry(2.6, 0.85, 1.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
  bodyMesh.position.y = 1.25;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Gold foil insulation
  const foilGeo = new THREE.BoxGeometry(2.55, 0.22, 1.85);
  const foilMesh = new THREE.Mesh(foilGeo, goldFoilMat);
  foilMesh.position.y = 0.78;
  group.add(foilMesh);

  // Solar array deck
  const solarGeo = new THREE.BoxGeometry(2.4, 0.08, 1.7);
  const solarMesh = new THREE.Mesh(solarGeo, solarMat);
  solarMesh.position.y = 1.72;
  group.add(solarMesh);

  // 1B. Customizable Roof Module Attachments (pre-built for zero-lag switching)
  // Wing Solar Array Addon
  const addonSolarGroup = new THREE.Group();
  const wingGeo = new THREE.BoxGeometry(1.4, 0.05, 0.72);
  const wingStrutGeo = new THREE.BoxGeometry(0.18, 0.06, 0.9);
  const leftWing = new THREE.Mesh(wingGeo, solarMat);
  leftWing.position.set(-1.75, 1.78, 0);
  leftWing.rotation.z = -0.08;
  const rightWing = new THREE.Mesh(wingGeo, solarMat);
  rightWing.position.set(1.75, 1.78, 0);
  rightWing.rotation.z = 0.08;
  const centerStrut = new THREE.Mesh(wingStrutGeo, goldFoilMat);
  centerStrut.position.set(0, 1.78, 0);
  addonSolarGroup.add(leftWing, rightWing, centerStrut);
  group.add(addonSolarGroup);

  // Expedition Cargo Rack Addon
  const addonCargoGroup = new THREE.Group();
  const rackRailGeo = new THREE.BoxGeometry(1.9, 0.14, 0.12);
  const podGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.95, 14);
  podGeo.rotateZ(Math.PI / 2);
  const railFront = new THREE.Mesh(rackRailGeo, darkMetalMat);
  railFront.position.set(0, 1.86, 0.62);
  const railBack = new THREE.Mesh(rackRailGeo, darkMetalMat);
  railBack.position.set(0, 1.86, -0.62);
  const cargoPod1 = new THREE.Mesh(podGeo, chassisMat);
  cargoPod1.position.set(-0.1, 1.98, 0.24);
  const cargoPod2 = new THREE.Mesh(podGeo, goldFoilMat);
  cargoPod2.position.set(-0.1, 1.98, -0.24);
  addonCargoGroup.add(railFront, railBack, cargoPod1, cargoPod2);
  addonCargoGroup.visible = false;
  group.add(addonCargoGroup);

  // Deep-Space Radar Dome/Dish Addon
  const addonRadarGroup = new THREE.Group();
  addonRadarGroup.position.set(0.05, 1.76, -0.15);
  const radarPedestalGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.55, 12);
  const radarPedestal = new THREE.Mesh(radarPedestalGeo, darkMetalMat);
  radarPedestal.position.y = 0.28;
  const radarDishGroup = new THREE.Group();
  radarDishGroup.position.y = 0.62;
  const bigDishGeo = new THREE.CylinderGeometry(0.68, 0.12, 0.22, 20);
  const bigDishMesh = new THREE.Mesh(bigDishGeo, chassisMat);
  bigDishMesh.rotation.x = Math.PI * 0.28;
  const bigHornGeo = new THREE.ConeGeometry(0.09, 0.34, 12);
  bigHornGeo.rotateX(-Math.PI * 0.72);
  const bigHornMesh = new THREE.Mesh(bigHornGeo, goldFoilMat);
  bigHornMesh.position.set(0, 0.18, 0.16);
  radarDishGroup.add(bigDishMesh, bigHornMesh);
  addonRadarGroup.add(radarPedestal, radarDishGroup);
  addonRadarGroup.visible = false;
  group.add(addonRadarGroup);

  // Turbo Radiator Fins Addon
  const addonTurboGroup = new THREE.Group();
  const finGeo = new THREE.BoxGeometry(0.12, 0.48, 1.45);
  const nozzleGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.42, 14);
  nozzleGeo.rotateX(Math.PI / 2);
  const glowCapGeo = new THREE.CircleGeometry(0.14, 14);
  const leftFin = new THREE.Mesh(finGeo, chassisMat);
  leftFin.position.set(-0.85, 1.96, -0.2);
  leftFin.rotation.z = 0.22;
  const rightFin = new THREE.Mesh(finGeo, chassisMat);
  rightFin.position.set(0.85, 1.96, -0.2);
  rightFin.rotation.z = -0.22;
  const nozzleL = new THREE.Mesh(nozzleGeo, goldFoilMat);
  nozzleL.position.set(-0.5, 1.88, -0.88);
  const nozzleR = new THREE.Mesh(nozzleGeo, goldFoilMat);
  nozzleR.position.set(0.5, 1.88, -0.88);
  const glowL = new THREE.Mesh(glowCapGeo, turboGlowMat);
  glowL.position.set(-0.5, 1.88, -1.10);
  glowL.rotation.y = Math.PI;
  const glowR = new THREE.Mesh(glowCapGeo, turboGlowMat);
  glowR.position.set(0.5, 1.88, -1.10);
  glowR.rotation.y = Math.PI;
  addonTurboGroup.add(leftFin, rightFin, nozzleL, nozzleR, glowL, glowR);
  addonTurboGroup.visible = false;
  group.add(addonTurboGroup);

  // 2. Camera Mast
  const mastCam = new THREE.Group();
  mastCam.position.set(0.9, 1.72, 0.65);

  const mastPillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 12);
  const mastPillar = new THREE.Mesh(mastPillarGeo, darkMetalMat);
  mastPillar.position.y = 0.75;
  mastCam.add(mastPillar);

  const headGeo = new THREE.BoxGeometry(0.5, 0.3, 0.26);
  const headMesh = new THREE.Mesh(headGeo, chassisMat);
  headMesh.position.y = 1.45;
  mastCam.add(headMesh);

  const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
  lensGeo.rotateX(Math.PI / 2);
  const lensMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  const lens1 = new THREE.Mesh(lensGeo, lensMat);
  lens1.position.set(-0.14, 1.45, 0.15);
  const lens2 = new THREE.Mesh(lensGeo, lensMat);
  lens2.position.set(0.14, 1.45, 0.15);
  mastCam.add(lens1, lens2);

  group.add(mastCam);

  // 3. Antenna Dish
  const dish = new THREE.Group();
  dish.position.set(-0.8, 1.76, -0.45);

  const dishGeo = new THREE.CylinderGeometry(0.45, 0.05, 0.16, 24);
  const dishMesh = new THREE.Mesh(dishGeo, chassisMat);
  dishMesh.rotation.x = Math.PI * 0.25;
  dish.add(dishMesh);

  const subReflectorGeo = new THREE.ConeGeometry(0.07, 0.28, 12);
  subReflectorGeo.rotateX(-Math.PI * 0.75);
  const subReflector = new THREE.Mesh(subReflectorGeo, goldFoilMat);
  subReflector.position.set(0, 0.12, 0.12);
  dish.add(subReflector);

  group.add(dish);

  // 4. Robotic Arm
  const arm = new THREE.Group();
  arm.position.set(1.2, 1.15, -0.65);

  const b1Geo = new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8);
  b1Geo.rotateZ(Math.PI / 3);
  const b1 = new THREE.Mesh(b1Geo, darkMetalMat);
  b1.position.set(0.35, 0, 0);
  arm.add(b1);

  const drillGeo = new THREE.CylinderGeometry(0.11, 0.04, 0.38, 12);
  drillGeo.rotateX(Math.PI / 2);
  const drill = new THREE.Mesh(drillGeo, goldFoilMat);
  drill.position.set(0.8, -0.22, 0);
  arm.add(drill);

  group.add(arm);

  // 5. 6 Rocker-Bogie Wheels
  const wheels: THREE.Mesh[] = [];
  const wheelPositions = [
    [-1.0, 0.45, 1.3],
    [0.0, 0.45, 1.35],
    [1.0, 0.45, 1.3],
    [-1.0, 0.45, -1.3],
    [0.0, 0.45, -1.35],
    [1.0, 0.45, -1.3],
  ];

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  wheelGeo.rotateX(Math.PI / 2);

  const hubRimGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.38, 14);
  hubRimGeo.rotateX(Math.PI / 2);

  wheelPositions.forEach((pos) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(pos[0], pos[1], pos[2]);
    w.castShadow = true;
    w.receiveShadow = true;
    const hub = new THREE.Mesh(hubRimGeo, wheelTrimMat);
    w.add(hub);
    group.add(w);
    wheels.push(w);

    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8);
    const strut = new THREE.Mesh(strutGeo, darkMetalMat);
    strut.position.set(pos[0] * 0.75, 0.85, pos[2] * 0.75);
    strut.rotation.z = pos[0] > 0 ? -0.4 : 0.4;
    group.add(strut);
  });

  // 6. Dual Forward High-Beam Headlights
  let headlightsOn = true;

  const housingGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.28, 16);
  housingGeo.rotateX(Math.PI / 2);

  const headlightLensGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16);
  headlightLensGeo.rotateX(Math.PI / 2);

  const lensOnMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
  const lensOffMat = new THREE.MeshBasicMaterial({ color: '#334155' });

  const leftHousing = new THREE.Mesh(housingGeo, darkMetalMat);
  leftHousing.position.set(-0.75, 1.15, 0.96);
  group.add(leftHousing);

  const leftLens = new THREE.Mesh(headlightLensGeo, lensOnMat);
  leftLens.position.set(-0.75, 1.15, 1.10);
  group.add(leftLens);

  // Right Headlight
  const rightHousing = new THREE.Mesh(housingGeo, darkMetalMat);
  rightHousing.position.set(0.75, 1.15, 0.96);
  group.add(rightHousing);

  const rightLens = new THREE.Mesh(headlightLensGeo, lensOnMat);
  rightLens.position.set(0.75, 1.15, 1.10);
  group.add(rightLens);

  // Single merged forward high-beam SpotLight (halves dynamic SpotLight shader cost; keep .visible = true always)
  const centerSpot = new THREE.SpotLight(0xfffae6, 7.5, 54, Math.PI / 3.8, 0.55, 1.3);
  centerSpot.position.set(0, 1.18, 1.12);
  const centerTarget = new THREE.Object3D();
  centerTarget.position.set(0, -0.4, 26);
  group.add(centerTarget);
  centerSpot.target = centerTarget;
  group.add(centerSpot);
  const leftSpot = centerSpot;
  const rightSpot = centerSpot;

  // Volumetric Headlight Beams (soft dust light cones cutting forward)
  const beamGeo = new THREE.ConeGeometry(2.4, 16, 16, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 8);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(-0.75, 1.15, 1.12);
  group.add(leftBeam);

  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(0.75, 1.15, 1.12);
  group.add(rightBeam);

  const beams = [leftBeam, rightBeam];

  // Rear Brake / Reverse / Boost Tail Lights
  const tailGeo = new THREE.BoxGeometry(0.32, 0.16, 0.08);
  const tailIdleMat = new THREE.MeshBasicMaterial({ color: '#7f1d1d' });
  const tailBrakeMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  const tailBoostMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  const leftTail = new THREE.Mesh(tailGeo, tailIdleMat);
  leftTail.position.set(-0.8, 1.18, -0.98);
  const rightTail = new THREE.Mesh(tailGeo, tailIdleMat);
  rightTail.position.set(0.8, 1.18, -0.98);
  group.add(leftTail, rightTail);

  // Underside Jump Thruster Flares (pre-allocated, shown during jump burst)
  const thrusterFlareGroup = new THREE.Group();
  const thrusterConeGeo = new THREE.ConeGeometry(0.24, 0.72, 12);
  thrusterConeGeo.rotateX(Math.PI);
  const thrusterFlareMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.85,
  });
  const thrusterCoords: [number, number, number][] = [
    [-0.9, 0.52, 0.9],
    [0.9, 0.52, 0.9],
    [-0.9, 0.52, -0.9],
    [0.9, 0.52, -0.9],
  ];
  thrusterCoords.forEach(([tx, ty, tz]) => {
    const flare = new THREE.Mesh(thrusterConeGeo, thrusterFlareMat);
    flare.position.set(tx, ty, tz);
    thrusterFlareGroup.add(flare);
  });
  thrusterFlareGroup.visible = false;
  group.add(thrusterFlareGroup);

  const setHeadlights = (enabled: boolean) => {
    headlightsOn = enabled;
    centerSpot.intensity = enabled ? 7.5 : 0.0;
    leftLens.material = enabled ? lensOnMat : lensOffMat;
    rightLens.material = enabled ? lensOnMat : lensOffMat;
    for (let i = 0; i < beams.length; i++) {
      beams[i].visible = enabled;
    }
  };

  const toggleHeadlights = (): boolean => {
    setHeadlights(!headlightsOn);
    return headlightsOn;
  };

  const getHeadlightsOn = (): boolean => headlightsOn;

  // 7. Beacon & Holographic Tag
  const beaconLight = new THREE.PointLight(0x06b6d4, 2.5, 14);
  beaconLight.position.set(0.9, 3.4, 0.65);
  group.add(beaconLight);

  const bulbGeo = new THREE.SphereGeometry(0.14, 16, 16);
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
  bulbMesh.position.copy(beaconLight.position);
  group.add(bulbMesh);

  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 340;
  tagCanvas.height = 100;
  const tagCtx = tagCanvas.getContext('2d');
  const tagTex = new THREE.CanvasTexture(tagCanvas);
  tagTex.colorSpace = THREE.SRGBColorSpace;
  const tagMat = new THREE.SpriteMaterial({ map: tagTex, depthTest: false });
  const tagSprite = new THREE.Sprite(tagMat);
  tagSprite.scale.set(4.0, 1.18, 1);
  tagSprite.position.set(0, 4.2, 0);
  group.add(tagSprite);

  let lastRenderedNameTag = '';
  const redrawNameTag = (name: string) => {
    const clean = (name || 'CURIOSITY ROVER').trim().slice(0, 18).toUpperCase();
    if (!tagCtx || clean === lastRenderedNameTag) return;
    lastRenderedNameTag = clean;
    tagCtx.clearRect(0, 0, 340, 100);
    tagCtx.fillStyle = 'rgba(6, 182, 212, 0.9)';
    tagCtx.beginPath();
    tagCtx.roundRect(8, 12, 324, 76, 18);
    tagCtx.fill();
    tagCtx.font = 'bold 28px "Fredoka", sans-serif';
    tagCtx.fillStyle = '#ffffff';
    tagCtx.textAlign = 'center';
    tagCtx.fillText(clean, 170, 48);
    tagCtx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    tagCtx.fillText('Driveable · Telemetry & O2', 170, 72);
    tagTex.needsUpdate = true;
  };
  redrawNameTag(activeCustomization.roverNameTag);

  const applyCustomization = (config: RoverCustomization) => {
    activeCustomization = { ...config };
    chassisMat.color.set(config.chassisColor);
    goldFoilMat.color.set(config.trimColor);
    solarMat.color.set(config.solarTint);

    const wheelOpt =
      ROVER_WHEEL_STYLES.find((w) => w.id === config.wheelStyle) || ROVER_WHEEL_STYLES[0];
    wheelMat.color.set(wheelOpt.tireHex);
    wheelTrimMat.color.set(wheelOpt.rimHex);

    lensOnMat.color.set(config.headlightTint);
    beamMat.color.set(config.headlightTint);
    centerSpot.color.set(config.headlightTint);
    turboGlowMat.color.set(config.headlightTint);

    addonSolarGroup.visible = config.roofAddon === 'solar';
    addonCargoGroup.visible = config.roofAddon === 'cargo';
    addonRadarGroup.visible = config.roofAddon === 'radar';
    addonTurboGroup.visible = config.roofAddon === 'turbo';

    redrawNameTag(config.roverNameTag);
  };

  const getCustomization = (): RoverCustomization => ({ ...activeCustomization });

  const updateCollider = (world: CollisionWorld) => {
    world.upsertDynamicOrientedBox({
      id: 'mars_rover',
      tag: 'vehicle',
      x: posX,
      z: posZ,
      halfX: 1.32,
      halfZ: 1.72,
      rotationY: rotY,
      minY: posY - 0.4,
      maxY: posY + 1.82,
      walkableTop: true,
      stepHeight: 0.45,
      blocksCamera: false,
    });
  };

  const getStatusAndMultiplier = (): {
    status: RoverDurabilityStatus;
    speedMultiplier: number;
  } => {
    if (integrity <= 0.1) return { status: 'LIMP_MODE', speedMultiplier: 0.30 };
    if (integrity < 35) return { status: 'CRITICAL', speedMultiplier: 0.58 };
    if (integrity < 60) return { status: 'DAMAGED', speedMultiplier: 0.74 };
    if (integrity < 85) return { status: 'WORN', speedMultiplier: 0.88 };
    return { status: 'OPTIMAL', speedMultiplier: 1.0 };
  };

  const getDurabilityState = (): RoverDurabilityData => {
    const { status, speedMultiplier } = getStatusAndMultiplier();
    return {
      integrity: Math.round(integrity * 10) / 10,
      status,
      terrainStress: impactFlashTimer > 0 ? 'IMPACT' : terrainStress,
      collisionCount,
      speedMultiplier,
    };
  };

  const repair = (amount: number = 100) => {
    const previous = integrity;
    const wasDamaged = previous < 99.5;
    integrity = Math.min(100, integrity + amount);
    terrainStress = 'SMOOTH';
    impactFlashTimer = 0;
    return {
      previous,
      repairedTo: integrity,
      wasDamaged,
    };
  };

  const applyEngineUpgrades = (
    upgrades: Pick<RoverEngineUpgrades, 'topSpeedLevel' | 'boostRecoveryLevel'>
  ) => {
    upgradeStats = getRoverUpgradeStats(upgrades);
  };

  const resetDurability = () => {
    integrity = 100;
    collisionCount = 0;
    impactCooldown = 0;
    impactFlashTimer = 0;
    terrainStress = 'SMOOTH';
    boostEnergy = 100;
    boostActive = false;
    currentSpeedMps = 0;
    velX = 0;
    velZ = 0;
    velocityY = 0;
    isGrounded = true;
    coyoteTimer = 0;
    jumpCooldown = 0;
    jumpBurstTimer = 0;
    isDrifting = false;
    driftIntensity = 0;
    thrusterFlareGroup.visible = false;
    currentGear = 'P';
    targetPitch = 0;
    targetRoll = 0;
    group.rotation.x = 0;
    group.rotation.z = 0;
  };

  const triggerJump = (): {
    jumped: boolean;
    reason?: 'airborne' | 'low_boost' | 'cooldown';
    boostRemaining: number;
  } => {
    if (jumpCooldown > 0) {
      return { jumped: false, reason: 'cooldown', boostRemaining: Math.round(boostEnergy) };
    }
    if (!isGrounded && coyoteTimer <= 0) {
      return { jumped: false, reason: 'airborne', boostRemaining: Math.round(boostEnergy) };
    }
    if (boostEnergy < ROVER_JUMP_BOOST_COST) {
      return { jumped: false, reason: 'low_boost', boostRemaining: Math.round(boostEnergy) };
    }

    boostEnergy = Math.max(0, boostEnergy - ROVER_JUMP_BOOST_COST);
    velocityY = ROVER_JUMP_VELOCITY;
    isGrounded = false;
    coyoteTimer = 0;
    jumpCooldown = 0.35;
    jumpBurstTimer = 0.34;
    isDrifting = false;
    driftIntensity = 0;
    thrusterFlareGroup.visible = true;

    // Give a helpful forward clearance impulse if rolling slowly up to a rock/ravine
    const fwdSpeed = Math.hypot(velX, velZ);
    if (fwdSpeed < 4.2) {
      velX += Math.sin(rotY) * 2.4;
      velZ += Math.cos(rotY) * 2.4;
    }

    return { jumped: true, boostRemaining: Math.round(boostEnergy) };
  };

  const getDriveTelemetry = (): RoverDriveTelemetry => ({
    speedKmh: Math.round(Math.abs(currentSpeedMps) * 3.6),
    gear: currentGear,
    boostActive,
    boostEnergy: Math.round(boostEnergy),
    lightsOn: headlightsOn,
    isAirborne: !isGrounded,
    jumpCost: ROVER_JUMP_BOOST_COST,
    isDrifting,
    driftIntensity,
  });

  // Driving mechanics with Engine Upgrades, Jump Thrusters, Drift Slip Physics & World Collision
  const drive = (
    forwardInput: number,
    turnInput: number,
    delta: number,
    collisionWorld?: CollisionWorld,
    stormIntensity: number = 0,
    onCollisionImpact?: (severity: number, x: number, y: number, z: number) => void,
    boostRequested: boolean = false,
    onJumpLanding?: (intensity: number, x: number, y: number, z: number) => void,
    allowDrift: boolean = true
  ) => {
    if (impactCooldown > 0) impactCooldown = Math.max(0, impactCooldown - delta);
    if (impactFlashTimer > 0) impactFlashTimer = Math.max(0, impactFlashTimer - delta);
    if (jumpCooldown > 0) jumpCooldown = Math.max(0, jumpCooldown - delta);
    if (jumpBurstTimer > 0) {
      jumpBurstTimer = Math.max(0, jumpBurstTimer - delta);
      thrusterFlareGroup.visible = jumpBurstTimer > 0;
    }

    isDriving = Math.abs(forwardInput) > 0.05 || Math.abs(turnInput) > 0.05 || !isGrounded || Math.hypot(velX, velZ) > 0.35;

    // Turbo boost power & upgraded regeneration
    if (boostRequested && forwardInput > 0.1 && boostEnergy > 2) {
      boostActive = true;
      boostEnergy = Math.max(0, boostEnergy - 24 * delta);
    } else {
      boostActive = false;
      const regenBase = isDriving ? 10 : 18;
      // Pause boost regen briefly right after firing jump thruster
      if (jumpBurstTimer <= 0.12) {
        boostEnergy = Math.min(
          100,
          boostEnergy + regenBase * upgradeStats.boostRecoveryMultiplier * delta
        );
      }
    }

    const { speedMultiplier } = getStatusAndMultiplier();
    const baseMaxSpeed = upgradeStats.baseMaxSpeedMps;
    const activeMaxSpeed = boostActive ? upgradeStats.boostMaxSpeedMps : baseMaxSpeed;
    const currentPlanarSpeed = Math.hypot(velX, velZ);

    // High-speed sharp-turn Rover Drift trigger & hysteresis
    const sharpTurn = Math.abs(turnInput) >= 0.72;
    const highSpeedForStart = currentPlanarSpeed >= baseMaxSpeed * speedMultiplier * 0.72;
    const sustainSpeed = currentPlanarSpeed >= baseMaxSpeed * speedMultiplier * 0.50;

    if (
      allowDrift &&
      isGrounded &&
      forwardInput > 0.35 &&
      ((sharpTurn && highSpeedForStart) || (isDrifting && Math.abs(turnInput) >= 0.48 && sustainSpeed))
    ) {
      isDrifting = true;
      driftIntensity = Math.min(1, driftIntensity + delta * 4.5);
      driftPhase += delta;
    } else {
      driftIntensity = Math.max(0, driftIntensity - delta * 3.8);
      if (driftIntensity <= 0.04) {
        isDrifting = false;
        driftIntensity = 0;
      }
    }

    if (isDriving || Math.abs(forwardInput) > 0.05 || Math.abs(turnInput) > 0.05) {
      // Rotation rate boosted during Drift (+42%), with mild steering instability wobble
      const baseTurnRate = boostActive ? 2.55 : 2.2;
      const airTurnScale = isGrounded ? 1.0 : 0.62;
      const driftTurnBoost = isDrifting ? 1 + 0.42 * driftIntensity : 1.0;
      const driftWobble = isDrifting ? Math.sin(driftPhase * 11.5) * 0.16 * driftIntensity : 0;
      rotY -= (turnInput * baseTurnRate * driftTurnBoost + driftWobble) * airTurnScale * delta;
      group.rotation.y = rotY;

      const sinH = Math.sin(rotY);
      const cosH = Math.cos(rotY);

      if (isGrounded) {
        const cornerSpeedScrub = isDrifting ? 1 - 0.07 * driftIntensity : 1.0;
        const targetForwardSpeed =
          forwardInput * activeMaxSpeed * speedMultiplier * cornerSpeedScrub;
        const desiredVx = sinH * targetForwardSpeed;
        const desiredVz = cosH * targetForwardSpeed;

        // Lateral traction drops during drift so momentum slides slightly wide
        const gripRate = isDrifting
          ? THREE.MathUtils.lerp(9.5, 2.35, driftIntensity)
          : Math.abs(forwardInput) > 0.05
          ? 8.5
          : 7.0;
        const blend = Math.min(1, delta * gripRate);
        velX += (desiredVx - velX) * blend;
        velZ += (desiredVz - velZ) * blend;

        // Slight outer drift kick adds tactile loss-of-control feel when initiating drift
        if (isDrifting) {
          const lateralKick = Math.sign(turnInput) * 1.15 * driftIntensity * delta;
          velX += cosH * lateralKick;
          velZ -= sinH * lateralKick;
        }
      } else {
        // Mid-air: preserve ravine-clearing horizontal momentum with subtle air drag/control
        const airTargetVx = sinH * forwardInput * activeMaxSpeed * speedMultiplier;
        const airTargetVz = cosH * forwardInput * activeMaxSpeed * speedMultiplier;
        const airBlend = Math.min(1, delta * 1.4);
        velX += (airTargetVx - velX) * airBlend;
        velZ += (airTargetVz - velZ) * airBlend;
      }

      currentSpeedMps = Math.hypot(velX, velZ) * (forwardInput < -0.05 ? -1 : 1);

      let nextX = posX + velX * delta;
      let nextZ = posZ + velZ * delta;

      // Vertical Jump & Mars Gravity Integration
      if (!isGrounded) {
        posY += velocityY * delta;
        velocityY -= ROVER_GRAVITY * delta;
      }

      // Resolve collisions (when jumping above obstacle maxY - 0.12, rover clears small rocks!)
      let didCollide = false;
      if (collisionWorld) {
        didCollide = collisionWorld.resolveHorizontalCollision(
          nextX,
          posY,
          nextZ,
          ROVER_COLLISION_RADIUS,
          ROVER_HEIGHT,
          _roverResolvedXZ,
          undefined,
          'mars_rover',
          0.95
        );
        nextX = _roverResolvedXZ.x;
        nextZ = _roverResolvedXZ.z;
      }

      if (Math.hypot(nextX, nextZ) < 135) {
        posX = nextX;
        posZ = nextZ;
      } else {
        didCollide = true;
      }

      // Collision wear and tear when hitting solid rocks/structures while moving
      if (didCollide && Math.abs(currentSpeedMps) > 0.8 && impactCooldown <= 0) {
        velX *= 0.45;
        velZ *= 0.45;
        const severity = Math.min(1.0, Math.max(0.45, Math.abs(forwardInput) * speedMultiplier));
        const wearLoss = 5.5 + severity * 5.0;
        integrity = Math.max(0, integrity - wearLoss);
        collisionCount += 1;
        impactCooldown = 0.45;
        impactFlashTimer = 0.48;
        terrainStress = 'IMPACT';
        onCollisionImpact?.(severity, posX, posY, posZ);
      }

      const terrainY = getMarsHeight(posX, posZ);
      const supportY = collisionWorld
        ? collisionWorld.getFloorSupportY(posX, posY, posZ, ROVER_COLLISION_RADIUS, terrainY, 'mars_rover')
        : terrainY;

      if (isGrounded) {
        // Drop smoothly into ravines / off ledges with gravity instead of instant teleport
        if (posY - supportY > 0.55) {
          isGrounded = false;
          coyoteTimer = 0.14;
          velocityY = Math.min(0, velocityY);
        } else {
          posY = supportY;
          coyoteTimer = 0.14;
        }
      } else {
        if (coyoteTimer > 0) coyoteTimer = Math.max(0, coyoteTimer - delta);
        if (posY <= supportY) {
          const impactVel = Math.abs(velocityY);
          posY = supportY;
          velocityY = 0;
          isGrounded = true;
          coyoteTimer = 0.14;
          if (impactVel > 2.2) {
            onJumpLanding?.(Math.min(1, impactVel / 9.5), posX, supportY, posZ);
          }
        }
      }
      group.position.set(posX, posY, posZ);

      // Compute Martian terrain slope or airborne pitch/roll + drift lean
      const sinY = Math.sin(rotY);
      const cosY = Math.cos(rotY);
      const hFwd = getMarsHeight(posX + sinY * 1.3, posZ + cosY * 1.3);
      const hBack = getMarsHeight(posX - sinY * 1.3, posZ - cosY * 1.3);
      const hRight = getMarsHeight(posX + cosY * 1.1, posZ - sinY * 1.1);
      const hLeft = getMarsHeight(posX - cosY * 1.1, posZ + sinY * 1.1);

      if (!isGrounded) {
        targetPitch = THREE.MathUtils.clamp(-velocityY * 0.032, -0.22, 0.22);
        targetRoll = THREE.MathUtils.clamp(-turnInput * 0.08, -0.14, 0.14);
      } else {
        const driftBodyRoll = isDrifting ? -Math.sign(turnInput) * 0.11 * driftIntensity : 0;
        targetPitch = THREE.MathUtils.clamp((hBack - hFwd) / 2.6, -0.32, 0.32);
        targetRoll = THREE.MathUtils.clamp((hLeft - hRight) / 2.2 + driftBodyRoll, -0.36, 0.36);
      }

      const slopeSeverity = Math.hypot(hFwd - hBack, hRight - hLeft) / 2.2;

      if (Math.abs(forwardInput) > 0.08 && isGrounded) {
        if (slopeSeverity > 0.21) {
          terrainStress = impactFlashTimer > 0 ? 'IMPACT' : 'ROUGH_SLOPE';
          const slopeWear = 2.4 * Math.min(1.8, slopeSeverity * 3.1) * delta;
          integrity = Math.max(0, integrity - slopeWear);
        } else if (stormIntensity > 0.35) {
          terrainStress = impactFlashTimer > 0 ? 'IMPACT' : 'STORM_GRIT';
          integrity = Math.max(0, integrity - 1.5 * stormIntensity * delta);
        } else {
          terrainStress = impactFlashTimer > 0 ? 'IMPACT' : 'SMOOTH';
          integrity = Math.max(0, integrity - 0.22 * Math.abs(forwardInput) * delta);
        }
      } else {
        terrainStress = 'SMOOTH';
      }

      if (collisionWorld) {
        updateCollider(collisionWorld);
      }

      // Spin wheels proportional to actual speed (spin slower in air)
      const wheelSpin = currentSpeedMps * (isGrounded ? 1.2 : 0.45) * delta;
      for (let i = 0; i < wheels.length; i++) {
        wheels[i].rotation.x += wheelSpin;
      }

      if (boostActive) currentGear = 'BOOST';
      else if (forwardInput < -0.05) currentGear = 'R';
      else if (Math.hypot(velX, velZ) > 0.2 || Math.abs(forwardInput) > 0.05) currentGear = 'D';
      else currentGear = 'P';
    } else {
      terrainStress = 'SMOOTH';
      velX *= Math.max(0, 1 - delta * 8);
      velZ *= Math.max(0, 1 - delta * 8);
      currentSpeedMps += (0 - currentSpeedMps) * Math.min(1, delta * 9);
      if (Math.abs(currentSpeedMps) < 0.15) {
        currentSpeedMps = 0;
        velX = 0;
        velZ = 0;
      }
      currentGear = 'P';
    }

    // Update rear tail light emissive state
    const tailMat =
      boostActive || isDrifting
        ? tailBoostMat
        : forwardInput < -0.05
        ? tailBrakeMat
        : tailIdleMat;
    leftTail.material = tailMat;
    rightTail.material = tailMat;

    _roverPosReturn.x = posX;
    _roverPosReturn.y = posY;
    _roverPosReturn.z = posZ;
    return _roverPosReturn;
  };

  let time = 0;
  const update = (delta: number, playerPos?: THREE.Vector3) => {
    time += delta;
    if (impactCooldown > 0 && !isDriving) impactCooldown = Math.max(0, impactCooldown - delta);
    if (impactFlashTimer > 0 && !isDriving) impactFlashTimer = Math.max(0, impactFlashTimer - delta);

    if (!isDriving) {
      mastCam.rotation.y = Math.sin(time * 0.8) * 0.6;
      dish.rotation.y = Math.cos(time * 0.4) * 0.4;
    }
    if (addonRadarGroup.visible) {
      radarDishGroup.rotation.y += delta * 1.1;
    }

    // Smooth suspension pitch/roll + chassis vibration on obstacle impact
    const shakeX = impactFlashTimer > 0 ? Math.sin(time * 52) * 0.06 * (impactFlashTimer / 0.48) : 0;
    const shakeZ = impactFlashTimer > 0 ? Math.cos(time * 47) * 0.08 * (impactFlashTimer / 0.48) : 0;
    const tiltAlpha = Math.min(1, delta * 8);
    group.rotation.x += (targetPitch + shakeX - group.rotation.x) * tiltAlpha;
    group.rotation.z += (targetRoll + shakeZ - group.rotation.z) * tiltAlpha;

    let lightNear = true;
    if (playerPos) {
      const dx = playerPos.x - posX;
      const dz = playerPos.z - posZ;
      lightNear = dx * dx + dz * dz < 65 * 65;
    }

    if (!headlightsOn || !lightNear) {
      centerSpot.intensity = 0;
    } else if (centerSpot.intensity === 0) {
      centerSpot.intensity = 7.5;
    }

    // Beacon status indicator: cyan when healthy, pulsing orange/red when damaged (intensity modulated; always visible)
    if (integrity < 35) {
      if (lightNear) {
        const warnPulse = 1.4 + Math.sin(time * 10) * 1.3;
        beaconLight.color.setHex(0xf43f5e);
        beaconLight.intensity = Math.max(0.4, warnPulse);
      } else {
        beaconLight.intensity = 0;
      }
      bulbMat.color.set(Math.sin(time * 10) > 0 ? '#fb7185' : '#f59e0b');
    } else if (integrity < 70) {
      if (lightNear) {
        const pulse = 1.5 + Math.sin(time * 5) * 0.9;
        beaconLight.color.setHex(0xf59e0b);
        beaconLight.intensity = pulse;
      } else {
        beaconLight.intensity = 0;
      }
      bulbMat.color.set('#fbbf24');
    } else {
      if (lightNear) {
        const pulse = 1.5 + Math.sin(time * 4) * 1.0;
        beaconLight.color.setHex(0x06b6d4);
        beaconLight.intensity = pulse;
      } else {
        beaconLight.intensity = 0;
      }
      bulbMat.color.set('#22d3ee');
    }
  };

  const dispose = () => {
    bodyGeo.dispose();
    foilGeo.dispose();
    solarGeo.dispose();
    wingGeo.dispose();
    wingStrutGeo.dispose();
    rackRailGeo.dispose();
    podGeo.dispose();
    radarPedestalGeo.dispose();
    bigDishGeo.dispose();
    bigHornGeo.dispose();
    finGeo.dispose();
    nozzleGeo.dispose();
    glowCapGeo.dispose();
    wheelGeo.dispose();
    hubRimGeo.dispose();
    chassisMat.dispose();
    goldFoilMat.dispose();
    darkMetalMat.dispose();
    solarMat.dispose();
    wheelMat.dispose();
    wheelTrimMat.dispose();
    turboGlowMat.dispose();
    beaconLight.dispose();
    bulbGeo.dispose();
    bulbMat.dispose();
    tagTex.dispose();
    tagMat.dispose();
    housingGeo.dispose();
    headlightLensGeo.dispose();
    beamGeo.dispose();
    lensOnMat.dispose();
    lensOffMat.dispose();
    beamMat.dispose();
    tailGeo.dispose();
    tailIdleMat.dispose();
    tailBrakeMat.dispose();
    tailBoostMat.dispose();
    centerSpot.dispose();
    thrusterConeGeo.dispose();
    thrusterFlareMat.dispose();
  };

  const setExternalPose = (x: number, z: number, rotationY: number, collisionWorld?: CollisionWorld) => {
    const movedDist = Math.hypot(x - posX, z - posZ);
    posX = x;
    posZ = z;
    const terrainY = getMarsHeight(posX, posZ);
    posY = collisionWorld
      ? collisionWorld.getFloorSupportY(posX, posY, posZ, ROVER_COLLISION_RADIUS, terrainY, 'mars_rover')
      : terrainY;
    rotY = rotationY;
    group.position.set(posX, posY, posZ);
    group.rotation.y = rotY;
    if (collisionWorld) {
      updateCollider(collisionWorld);
    }
    if (movedDist > 0.01) {
      const wheelSpin = movedDist * 1.4;
      for (let i = 0; i < wheels.length; i++) {
        wheels[i].rotation.x += wheelSpin;
      }
    }
  };

  return {
    group,
    mastCam,
    dish,
    wheels,
    beaconLight,
    headlights: {
      leftSpot,
      rightSpot,
      leftLens,
      rightLens,
      beams,
    },
    get position(): [number, number, number] {
      return [posX, posY, posZ];
    },
    get rotationY(): number {
      return rotY;
    },
    get isDriving(): boolean {
      return isDriving;
    },
    drive,
    triggerJump,
    applyEngineUpgrades,
    getDriveTelemetry,
    getDurabilityState,
    repair,
    resetDurability,
    updateCollider,
    setExternalPose,
    setHeadlights,
    toggleHeadlights,
    getHeadlightsOn,
    applyCustomization,
    getCustomization,
    update,
    dispose,
  };
}
