import * as THREE from 'three';

export interface AstronautCharacter {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  torso: THREE.Group;
  backpack: THREE.Group;
  thrusterLight: THREE.PointLight;
  headlight: THREE.SpotLight;
  leftWingTip: THREE.Object3D;
  rightWingTip: THREE.Object3D;
  nameTag?: THREE.Sprite;
  updateAnimation: (
    speed: number,
    isRunning: boolean,
    isGrounded: boolean,
    isJumping: boolean,
    delta: number,
    isGliding?: boolean,
    velocityY?: number,
    bankAngle?: number
  ) => void;
  triggerWingFlapPose: () => void;
  setNameTagText: (name: string, role?: string) => void;
  setSuitColor: (primaryHex: string, accentHex?: string) => void;
  setHeadlightIntensity: (intensity: number) => void;
}

/**
 * Creates a Roblox-style Nametag Sprite above character head.
 */
function createNametagSprite(name: string, role?: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, 20, 352, 88, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 36px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, 192, 60);

    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = role ? '#38bdf8' : '#fb923c';
    ctx.fillText(role || 'Mars Explorer', 192, 92);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 1.06, 1);
  sprite.position.y = 2.65;
  return sprite;
}

/**
 * Creates a swept Sky-inspired glider wing panel using ExtrudeGeometry with beveled edges.
 */
function createWingPanelGeometry(side: -1 | 1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  // Pivot at shoulder/backpack hinge (0, 0)
  shape.moveTo(0, 0.12);
  shape.lineTo(side * 1.15, 0.28);
  shape.lineTo(side * 1.48, -0.14);
  shape.lineTo(side * 0.92, -0.58);
  shape.lineTo(side * 0.22, -0.78);
  shape.lineTo(0, -0.62);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.center();
  // Re-anchor near hinge so rotation sweeps naturally from backpack spine
  geo.translate(side * 0.68, -0.18, 0);
  return geo;
}

let sharedWingGeoLeft: THREE.ExtrudeGeometry | null = null;
let sharedWingGeoRight: THREE.ExtrudeGeometry | null = null;

function getSharedWingPanelGeometry(side: -1 | 1): THREE.ExtrudeGeometry {
  if (side === -1) {
    if (!sharedWingGeoLeft) sharedWingGeoLeft = createWingPanelGeometry(-1);
    return sharedWingGeoLeft;
  }
  if (!sharedWingGeoRight) sharedWingGeoRight = createWingPanelGeometry(1);
  return sharedWingGeoRight;
}

export interface CreateAstronautOptions {
  simplifyForNpc?: boolean;
}

/**
 * Creates a Roblox-styled modular 3D Astronaut Character with deployable Sky-inspired glider wings.
 */
export function createRobloxAstronaut(
  initialSuitColor: string = '#f8fafc',
  playerName?: string,
  playerRole?: string,
  options?: CreateAstronautOptions
): AstronautCharacter {
  const simplifyForNpc = Boolean(options?.simplifyForNpc);
  const root = new THREE.Group();
  root.name = 'Astronaut';

  // Materials
  const suitMat = new THREE.MeshStandardMaterial({
    color: initialSuitColor,
    roughness: 0.55,
    metalness: 0.2,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    roughness: 0.45,
    metalness: 0.35,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.7,
    metalness: 0.3,
  });

  const visorMat: THREE.MeshStandardMaterial = simplifyForNpc
    ? new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#b45309',
        emissiveIntensity: 0.25,
        roughness: 0.15,
        metalness: 0.9,
      })
    : new THREE.MeshPhysicalMaterial({
        color: '#fbbf24',
        emissive: '#b45309',
        emissiveIntensity: 0.2,
        roughness: 0.1,
        metalness: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

  const packMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.4,
    metalness: 0.5,
  });

  const wingSailMat: THREE.MeshStandardMaterial = simplifyForNpc
    ? new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#0284c7',
        emissiveIntensity: 0.38,
        roughness: 0.35,
        metalness: 0.55,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshPhysicalMaterial({
        color: '#0f172a',
        emissive: '#0284c7',
        emissiveIntensity: 0.38,
        roughness: 0.28,
        metalness: 0.65,
        clearcoat: 0.7,
        side: THREE.DoubleSide,
      });

  const wingGlowTrimMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.9,
  });

  // --- HIERARCHY ---

  // 1. Torso
  const torso = new THREE.Group();
  torso.position.y = 1.05;

  const torsoGeo = new THREE.BoxGeometry(0.88, 0.92, 0.46);
  const torsoMesh = new THREE.Mesh(torsoGeo, suitMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Chest Mission Patch & Computer Console
  const chestPanelGeo = new THREE.BoxGeometry(0.52, 0.42, 0.06);
  const chestPanel = new THREE.Mesh(chestPanelGeo, darkTrimMat);
  chestPanel.position.set(0, 0.08, 0.24);
  torso.add(chestPanel);

  // Status lights on chest
  const lightGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const blueLightMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  const greenLightMat = new THREE.MeshBasicMaterial({ color: '#4ade80' });
  const l1 = new THREE.Mesh(lightGeo, blueLightMat);
  l1.position.set(-0.14, 0.12, 0.27);
  const l2 = new THREE.Mesh(lightGeo, greenLightMat);
  l2.position.set(0.14, 0.12, 0.27);
  torso.add(l1, l2);

  // Waist belt
  const beltGeo = new THREE.BoxGeometry(0.9, 0.12, 0.48);
  const beltMesh = new THREE.Mesh(beltGeo, trimMat);
  beltMesh.position.y = -0.38;
  torso.add(beltMesh);

  // 2. Head & Helmet
  const head = new THREE.Group();
  head.position.y = 0.7;

  const helmetGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
  const helmetMesh = new THREE.Mesh(helmetGeo, suitMat);
  helmetMesh.castShadow = true;
  head.add(helmetMesh);

  // Gold reflective visor
  const visorGeo = new THREE.BoxGeometry(0.54, 0.4, 0.22);
  const visorMesh = new THREE.Mesh(visorGeo, visorMat);
  visorMesh.position.set(0, 0.02, 0.28);
  head.add(visorMesh);

  // Helmet side ear communications
  const earGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
  earGeo.rotateZ(Math.PI / 2);
  const earLeft = new THREE.Mesh(earGeo, darkTrimMat);
  earLeft.position.set(-0.38, 0, 0);
  const earRight = new THREE.Mesh(earGeo, darkTrimMat);
  earRight.position.set(0.38, 0, 0);
  head.add(earLeft, earRight);

  // Helmet top antenna
  const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
  const antMesh = new THREE.Mesh(antGeo, darkTrimMat);
  antMesh.position.set(0.24, 0.5, -0.1);
  head.add(antMesh);

  // Visor Headlight / Torch for nocturnal exploration (always keep .visible = true when attached to avoid WebGL shader recompiles)
  const headlight = new THREE.SpotLight(0xfff6e8, 0, 35, Math.PI / 4.2, 0.45, 1.2);
  headlight.visible = true;
  if (!simplifyForNpc) {
    headlight.position.set(0, 0.08, 0.42);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, -0.4, 12);
    head.add(targetObj);
    headlight.target = targetObj;
    head.add(headlight);
  }

  torso.add(head);

  // 3. Life Support Backpack (PLSS) + Sky-Inspired Solar-Sail Glider Cape/Wings
  const backpack = new THREE.Group();
  backpack.position.set(0, 0.05, -0.34);

  const packMainGeo = new THREE.BoxGeometry(0.68, 0.78, 0.28);
  const packMainMesh = new THREE.Mesh(packMainGeo, packMat);
  packMainMesh.castShadow = true;
  backpack.add(packMainMesh);

  // Dual Oxygen Tanks
  const tankGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.65, 12);
  const tankLeft = new THREE.Mesh(tankGeo, trimMat);
  tankLeft.position.set(-0.18, 0, -0.12);
  const tankRight = new THREE.Mesh(tankGeo, trimMat);
  tankRight.position.set(0.18, 0, -0.12);
  backpack.add(tankLeft, tankRight);

  // Thruster mini-nozzles
  const nozzleGeo = new THREE.ConeGeometry(0.08, 0.14, 12);
  nozzleGeo.rotateX(Math.PI);
  const nozLeft = new THREE.Mesh(nozzleGeo, darkTrimMat);
  nozLeft.position.set(-0.2, -0.44, 0);
  const nozRight = new THREE.Mesh(nozzleGeo, darkTrimMat);
  nozRight.position.set(0.2, -0.44, 0);
  backpack.add(nozLeft, nozRight);

  // Jetpack Thruster Light (intensity-modulated on jump/glide/flap; kept permanently visible when attached)
  const thrusterLight = new THREE.PointLight(0x06b6d4, 0, 5);
  thrusterLight.visible = true;
  if (!simplifyForNpc) {
    thrusterLight.position.set(0, -0.5, -0.1);
    backpack.add(thrusterLight);
  }

  // Deployable Left & Right Glider Wing-Cape Panels
  const wingMount = new THREE.Group();
  wingMount.position.set(0, 0.26, -0.18);

  const leftWing = new THREE.Group();
  leftWing.position.set(-0.18, 0, 0);
  const leftWingMesh = new THREE.Mesh(getSharedWingPanelGeometry(-1), wingSailMat);
  leftWingMesh.castShadow = true;
  const leftTrimBar = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.05, 0.055), wingGlowTrimMat);
  leftTrimBar.position.set(-0.72, 0.02, 0.01);
  leftTrimBar.rotation.z = -0.12;
  const leftWingTip = new THREE.Object3D();
  leftWingTip.position.set(-1.38, -0.12, 0);
  leftWing.add(leftWingMesh, leftTrimBar, leftWingTip);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.18, 0, 0);
  const rightWingMesh = new THREE.Mesh(getSharedWingPanelGeometry(1), wingSailMat);
  rightWingMesh.castShadow = true;
  const rightTrimBar = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.05, 0.055), wingGlowTrimMat);
  rightTrimBar.position.set(0.72, 0.02, 0.01);
  rightTrimBar.rotation.z = 0.12;
  const rightWingTip = new THREE.Object3D();
  rightWingTip.position.set(1.38, -0.12, 0);
  rightWing.add(rightWingMesh, rightTrimBar, rightWingTip);

  // Start folded neatly behind backpack as a sleek cape
  leftWing.scale.set(0.32, 0.85, 1);
  rightWing.scale.set(0.32, 0.85, 1);
  leftWing.rotation.set(0.12, -1.18, 0.45);
  rightWing.rotation.set(0.12, 1.18, -0.45);

  wingMount.add(leftWing, rightWing);
  backpack.add(wingMount);
  torso.add(backpack);

  // 4. Arms
  const armGeo = new THREE.BoxGeometry(0.32, 0.75, 0.32);
  const gloveGeo = new THREE.BoxGeometry(0.34, 0.2, 0.34);

  // Left Arm
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.6, 0.35, 0);

  const leftArmMesh = new THREE.Mesh(armGeo, suitMat);
  leftArmMesh.position.y = -0.32;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);

  const leftGlove = new THREE.Mesh(gloveGeo, darkTrimMat);
  leftGlove.position.y = -0.62;
  leftArm.add(leftGlove);
  torso.add(leftArm);

  // Right Arm
  const rightArm = new THREE.Group();
  rightArm.position.set(0.6, 0.35, 0);

  const rightArmMesh = new THREE.Mesh(armGeo, suitMat);
  rightArmMesh.position.y = -0.32;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  const rightGlove = new THREE.Mesh(gloveGeo, darkTrimMat);
  rightGlove.position.y = -0.62;
  rightArm.add(rightGlove);
  torso.add(rightArm);

  // 5. Legs
  const legGeo = new THREE.BoxGeometry(0.34, 0.7, 0.34);
  const bootGeo = new THREE.BoxGeometry(0.36, 0.22, 0.44);

  // Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.24, 0.65, 0);

  const leftLegMesh = new THREE.Mesh(legGeo, suitMat);
  leftLegMesh.position.y = -0.32;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);

  const leftBoot = new THREE.Mesh(bootGeo, darkTrimMat);
  leftBoot.position.set(0, -0.56, 0.05);
  leftLeg.add(leftBoot);
  root.add(leftLeg);

  // Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.24, 0.65, 0);

  const rightLegMesh = new THREE.Mesh(legGeo, suitMat);
  rightLegMesh.position.y = -0.32;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);

  const rightBoot = new THREE.Mesh(bootGeo, darkTrimMat);
  rightBoot.position.set(0, -0.56, 0.05);
  rightLeg.add(rightBoot);
  root.add(rightLeg);

  root.add(torso);

  // Nametag
  let nameTag: THREE.Sprite | undefined;
  if (playerName) {
    nameTag = createNametagSprite(playerName, playerRole);
    root.add(nameTag);
  }

  let walkTime = 0;
  let animClock = 0;
  let wingDeploy = 0;
  let flapPulseTimer = 0;

  const triggerWingFlapPose = () => {
    flapPulseTimer = 0.45;
  };

  const updateAnimation = (
    speed: number,
    isRunning: boolean,
    isGrounded: boolean,
    isJumping: boolean,
    delta: number,
    isGliding: boolean = false,
    velocityY: number = 0,
    bankAngle: number = 0
  ) => {
    animClock += delta;
    if (flapPulseTimer > 0) {
      flapPulseTimer = Math.max(0, flapPulseTimer - delta);
    }

    // Smoothly unfurl / fold glider wings
    const targetDeploy = isGliding ? 1.0 : 0.0;
    wingDeploy = THREE.MathUtils.damp(wingDeploy, targetDeploy, isGliding ? 10 : 8, delta);

    const flapStroke = flapPulseTimer > 0 ? Math.sin((flapPulseTimer / 0.45) * Math.PI) * 0.65 : 0;
    const glideFlutter = isGliding ? Math.sin(animClock * 8.0) * 0.06 : 0;

    // Wing fold/deploy interpolation
    const wingScaleX = THREE.MathUtils.lerp(0.30, 1.08, wingDeploy);
    const wingScaleY = THREE.MathUtils.lerp(0.84, 1.02, wingDeploy);
    leftWing.scale.set(wingScaleX, wingScaleY, 1);
    rightWing.scale.set(wingScaleX, wingScaleY, 1);

    leftWing.rotation.y = THREE.MathUtils.lerp(-1.18, -0.14, wingDeploy) + flapStroke * 0.2;
    rightWing.rotation.y = THREE.MathUtils.lerp(1.18, 0.14, wingDeploy) - flapStroke * 0.2;
    leftWing.rotation.z = THREE.MathUtils.lerp(0.45, 0.05, wingDeploy) - flapStroke + glideFlutter;
    rightWing.rotation.z = THREE.MathUtils.lerp(-0.45, -0.05, wingDeploy) + flapStroke - glideFlutter;
    leftWing.rotation.x = THREE.MathUtils.lerp(0.12, -0.25, wingDeploy);
    rightWing.rotation.x = THREE.MathUtils.lerp(0.12, -0.25, wingDeploy);

    wingSailMat.emissiveIntensity = THREE.MathUtils.lerp(0.28, 0.95, wingDeploy) + flapStroke * 0.6;
    wingGlowTrimMat.opacity = THREE.MathUtils.lerp(0.35, 0.98, wingDeploy);

    // 1. Gliding Pose (Sky: Children of the Light soaring silhouette)
    if (!isGrounded && isGliding) {
      const clampedBank = THREE.MathUtils.clamp(bankAngle, -0.55, 0.55);
      // Horizontal flying pitch & smooth roll into turns
      torso.position.y = THREE.MathUtils.damp(torso.position.y, 1.15, 8, delta);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0.78, 7, delta);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, clampedBank, 8, delta);
      torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, 0, 8, delta);

      // Head looks forward along flight path (compensating torso pitch)
      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, -0.58, 8, delta);
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, -clampedBank * 0.4, 8, delta);

      // Arms swept gracefully outward & back like glider struts
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0.55, 10, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0.55, 10, delta);
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.65 - flapStroke * 0.35, 10, delta);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.65 + flapStroke * 0.35, 10, delta);

      // Legs trail streamlined behind
      const legKick = Math.sin(animClock * 6.0) * 0.06;
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0.48 + legKick, 10, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.62 - legKick, 10, delta);

      if (!simplifyForNpc) {
        thrusterLight.intensity = THREE.MathUtils.damp(
          thrusterLight.intensity,
          flapPulseTimer > 0 ? 5.5 : 2.6,
          14,
          delta
        );
      }
      return;
    }

    // 2. Airborne Jump vs Smooth Mars Free-Fall Pose
    if (!isGrounded || isJumping) {
      const isRising = velocityY > 0.35;
      const sway = Math.sin(animClock * 7.0) * 0.08;

      if (isRising) {
        // Ascending Mars leap pose
        leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -0.55, 12, delta);
        rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.28, 12, delta);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -1.05, 12, delta);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -1.05, 12, delta);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.22, 10, delta);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.22, 10, delta);
        torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0.14, 9, delta);
        if (!simplifyForNpc) {
          thrusterLight.intensity = THREE.MathUtils.damp(thrusterLight.intensity, 3.6, 18, delta);
        }
      } else {
        // Smooth, floaty Mars falling pose: arms spread out to balance, knees slightly bent
        leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -0.28 + sway, 8, delta);
        rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.18 - sway, 8, delta);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.35, 8, delta);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.35, 8, delta);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.78 + sway * 0.6, 8, delta);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.78 - sway * 0.6, 8, delta);
        torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, -0.06, 8, delta);
        if (!simplifyForNpc) {
          thrusterLight.intensity = THREE.MathUtils.damp(thrusterLight.intensity, 1.1, 10, delta);
        }
      }

      torso.position.y = THREE.MathUtils.damp(torso.position.y, 1.12, 10, delta);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, 0, 8, delta);
      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, isRising ? -0.1 : 0.12, 8, delta);
      return;
    }

    // Grounded: reset arm splay & head tilt smoothly
    leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0, 12, delta);
    rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0, 12, delta);
    head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0, 10, delta);
    if (!simplifyForNpc && thrusterLight.intensity > 0) {
      thrusterLight.intensity = THREE.MathUtils.damp(thrusterLight.intensity, 0, 15, delta);
      if (thrusterLight.intensity < 0.02) thrusterLight.intensity = 0;
    }

    if (speed > 0.1) {
      // Running vs Walking cadence
      const speedMultiplier = isRunning ? 11.5 : 7.2;
      walkTime += delta * speed * speedMultiplier;
      const swing = Math.sin(walkTime);

      const armSwingScale = isRunning ? 1.05 : 0.72;
      const legSwingScale = isRunning ? 1.0 : 0.72;

      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, swing * legSwingScale, 18, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -swing * legSwingScale, 18, delta);

      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -swing * armSwingScale, 18, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, swing * armSwingScale, 18, delta);

      // Running forward lean
      const targetTorsoLean = isRunning ? 0.22 : 0.05;
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, targetTorsoLean, 10, delta);

      // Torso bob & roll
      const bobAmount = isRunning ? 0.09 : 0.05;
      torso.position.y = THREE.MathUtils.damp(
        torso.position.y,
        1.05 + Math.abs(Math.sin(walkTime * 2)) * bobAmount,
        18,
        delta
      );
      torso.rotation.y = Math.sin(walkTime) * (isRunning ? 0.12 : 0.07);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, Math.sin(walkTime) * 0.03, 12, delta);

      head.rotation.y = -Math.sin(walkTime) * 0.04;
    } else {
      // Idle breathing cycle
      walkTime += delta * 2;
      const breath = Math.sin(walkTime);

      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, delta);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, breath * 0.05, 8, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -breath * 0.05, 8, delta);

      torso.position.y = THREE.MathUtils.damp(torso.position.y, 1.05 + breath * 0.015, 6, delta);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0, 8, delta);
      torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, 0, 8, delta);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, 0, 8, delta);
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 8, delta);
    }
  };

  const setNameTagText = (newName: string, newRole?: string) => {
    if (nameTag) {
      root.remove(nameTag);
      nameTag.material.dispose();
    }
    nameTag = createNametagSprite(newName, newRole);
    root.add(nameTag);
  };

  const setSuitColor = (primaryHex: string, accentHex?: string) => {
    suitMat.color.set(primaryHex);
    if (accentHex) {
      trimMat.color.set(accentHex);
      wingSailMat.emissive.set(accentHex);
      wingGlowTrimMat.color.set(accentHex);
    }
  };

  const setHeadlightIntensity = (intensity: number) => {
    headlight.intensity = intensity;
  };

  return {
    group: root,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    head,
    torso,
    backpack,
    thrusterLight,
    headlight,
    leftWingTip,
    rightWingTip,
    nameTag,
    updateAnimation,
    triggerWingFlapPose,
    setNameTagText,
    setSuitColor,
    setHeadlightIntensity,
  };
}
