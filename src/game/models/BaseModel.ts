import * as THREE from 'three';
import { getMarsHeight } from '../terrain';
import type { CollisionWorld } from '../physics/CollisionWorld';

export interface BaseObject {
  group: THREE.Group;
  towerDish: THREE.Group;
  towerBeaconLight: THREE.PointLight;
  refillPadLight: THREE.PointLight;
  isTowerActivated: boolean;
  position: [number, number, number];
  oxygenRefillPos: [number, number, number];
  commTowerPos: [number, number, number];
  quizTerminalPos: [number, number, number];
  infoTerminalPos: [number, number, number];
  restBayPos: [number, number, number];
  scienceLabPos: [number, number, number];
  registerColliders: (world: CollisionWorld) => void;
  activateTower: () => void;
  update: (delta: number, playerPos?: THREE.Vector3) => void;
  dispose: () => void;
}

/**
 * Creates the expanded Mars Space Station & Research Base with
 * enlarged Biodome, Astronaut Rest Quarters, Information Terminals,
 * Oxygen Life Support Dock, and Communication Mast.
 */
export function createResearchBase(centerX: number = -40, centerZ: number = -30): BaseObject {
  const group = new THREE.Group();
  group.name = 'ResearchBase';

  const groundY = getMarsHeight(centerX, centerZ);
  group.position.set(centerX, groundY, centerZ);

  // Materials
  const habitatMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.32,
    metalness: 0.35,
  });

  const domeMat = new THREE.MeshPhysicalMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.42,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    depthWrite: false,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.45,
    metalness: 0.75,
  });

  const padMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.8,
    metalness: 0.25,
  });

  const neonO2Mat = new THREE.MeshBasicMaterial({ color: '#06b6d4' });
  const neonInfoMat = new THREE.MeshBasicMaterial({ color: '#3b82f6' });
  const goldFoilMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.2 });

  // 1. Concrete Base Foundation Platform (Enlarged)
  const foundationGeo = new THREE.CylinderGeometry(38, 42, 0.8, 36);
  const foundationMesh = new THREE.Mesh(foundationGeo, padMat);
  foundationMesh.position.y = 0.4;
  foundationMesh.receiveShadow = true;
  group.add(foundationMesh);

  // Perimeter security and navigation lights on foundation (GPU Instanced - 1 draw call)
  const beaconLightGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
  const beaconInstanced = new THREE.InstancedMesh(beaconLightGeo, neonO2Mat, 16);
  const dummyBeacon = new THREE.Object3D();
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    dummyBeacon.position.set(Math.cos(angle) * 36, 0.8, Math.sin(angle) * 36);
    dummyBeacon.updateMatrix();
    beaconInstanced.setMatrixAt(i, dummyBeacon.matrix);
  }
  beaconInstanced.instanceMatrix.needsUpdate = true;
  group.add(beaconInstanced);

  // 2. Main Central Geodesic Biodome (Enlarged 14m radius)
  const domeGeo = new THREE.SphereGeometry(14, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.position.y = 0.8;
  group.add(domeMesh);

  // Interior Biodome Hydroponic Greenery Floor & Plants
  const gardenGeo = new THREE.CylinderGeometry(11, 11, 0.4, 28);
  const gardenMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.85 });
  const garden = new THREE.Mesh(gardenGeo, gardenMat);
  garden.position.y = 0.95;
  group.add(garden);

  // Central Biodome Hologram Pillar
  const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 6.5, 12);
  const pillar = new THREE.Mesh(pillarGeo, metalMat);
  pillar.position.set(0, 4.0, 0);
  group.add(pillar);

  const domeLight = new THREE.PointLight(0x38bdf8, 2.4, 32);
  domeLight.position.set(0, 7.5, 0);
  group.add(domeLight);

  // 3. Wing A: Astronaut Rest Quarters & Sleep Pods (East wing)
  const restWing = new THREE.Group();
  restWing.position.set(18, 2.8, 0);

  const restModuleGeo = new THREE.CylinderGeometry(5.5, 5.5, 9, 24);
  restModuleGeo.rotateZ(Math.PI / 2);
  const restModule = new THREE.Mesh(restModuleGeo, habitatMat);
  restModule.castShadow = true;
  restWing.add(restModule);

  // Sleep pods inside / visible on end cap
  for (let p = 0; p < 3; p++) {
    const podGeo = new THREE.BoxGeometry(1.6, 1.2, 2.6);
    const podMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3, metalness: 0.4 });
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.set(1.5, -1.0, -2.5 + p * 2.5);
    restWing.add(pod);
  }

  // Rest wing airlock corridor connecting to main dome
  const tunnelGeo = new THREE.CylinderGeometry(2.0, 2.0, 8.5, 16);
  tunnelGeo.rotateZ(Math.PI / 2);
  const tunnelA = new THREE.Mesh(tunnelGeo, habitatMat);
  tunnelA.position.set(10.5, 2.2, 0);
  group.add(tunnelA);
  group.add(restWing);

  // Floating Rest Bay Label
  const restLabelCanvas = document.createElement('canvas');
  restLabelCanvas.width = 320;
  restLabelCanvas.height = 80;
  const rctx = restLabelCanvas.getContext('2d');
  if (rctx) {
    rctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
    rctx.beginPath();
    rctx.roundRect(8, 10, 304, 60, 16);
    rctx.fill();
    rctx.font = 'bold 26px "Fredoka", sans-serif';
    rctx.fillStyle = '#ffffff';
    rctx.textAlign = 'center';
    rctx.fillText('ASTRONAUT REST BAY', 160, 48);
  }
  const restTex = new THREE.CanvasTexture(restLabelCanvas);
  restTex.colorSpace = THREE.SRGBColorSpace;
  const restSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: restTex, depthTest: false }));
  restSprite.scale.set(3.8, 0.95, 1);
  restSprite.position.set(18, 7.8, 0);
  group.add(restSprite);

  // 4. Wing B: Science Research & Laboratory Module (South wing)
  const labWing = new THREE.Group();
  labWing.position.set(0, 2.8, 18);
  labWing.rotation.y = Math.PI / 2;

  const labModule = new THREE.Mesh(restModuleGeo, habitatMat);
  labModule.castShadow = true;
  labWing.add(labModule);

  const tunnelB = new THREE.Mesh(tunnelGeo, habitatMat);
  tunnelB.position.set(0, 2.2, 10.5);
  tunnelB.rotation.y = Math.PI / 2;
  group.add(tunnelB);
  group.add(labWing);

  // Surface Science Laboratory Terminal right beside Wing B
  const labConsole = new THREE.Group();
  labConsole.position.set(6.8, 0.8, 18);
  const labDesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.0), metalMat);
  labDesk.position.y = 0.65;
  labConsole.add(labDesk);
  const labHolo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.1),
    new THREE.MeshBasicMaterial({ color: '#a855f7' })
  );
  labHolo.rotation.x = -0.3;
  labHolo.position.set(0, 1.65, 0.15);
  labConsole.add(labHolo);

  const labCanvas = document.createElement('canvas');
  labCanvas.width = 320;
  labCanvas.height = 84;
  const lbctx = labCanvas.getContext('2d');
  if (lbctx) {
    lbctx.fillStyle = 'rgba(147, 51, 234, 0.92)';
    lbctx.beginPath();
    lbctx.roundRect(8, 10, 304, 64, 16);
    lbctx.fill();
    lbctx.font = 'bold 25px "Fredoka", sans-serif';
    lbctx.fillStyle = '#ffffff';
    lbctx.textAlign = 'center';
    lbctx.fillText('SCIENCE LABORATORY', 160, 44);
    lbctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    lbctx.fillText('Safe Mars Experiments', 160, 64);
  }
  const labTex = new THREE.CanvasTexture(labCanvas);
  labTex.colorSpace = THREE.SRGBColorSpace;
  const labSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labTex, depthTest: false }));
  labSprite.scale.set(3.6, 0.95, 1);
  labSprite.position.set(0, 3.0, 0);
  labConsole.add(labSprite);
  group.add(labConsole);

  // 5. Interactive Mars Information Terminals Kiosk (Inside base courtyard)
  const infoGroup = new THREE.Group();
  const infoRelX = -6;
  const infoRelZ = 8;
  infoGroup.position.set(infoRelX, 0.8, infoRelZ);

  // Terminal Desk
  const kioskGeo = new THREE.BoxGeometry(3.2, 1.4, 1.2);
  const kioskMesh = new THREE.Mesh(kioskGeo, metalMat);
  kioskMesh.position.y = 0.7;
  infoGroup.add(kioskMesh);

  // Curved Holographic Information Screen
  const infoScreenGeo = new THREE.PlaneGeometry(2.8, 1.6);
  infoScreenGeo.rotateX(-0.25);
  const infoScreenMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  const infoScreen = new THREE.Mesh(infoScreenGeo, infoScreenMat);
  infoScreen.position.set(0, 1.9, 0.1);
  infoGroup.add(infoScreen);

  // Floating Kiosk Label
  const infoLabelCanvas = document.createElement('canvas');
  infoLabelCanvas.width = 340;
  infoLabelCanvas.height = 90;
  const ictx = infoLabelCanvas.getContext('2d');
  if (ictx) {
    ictx.fillStyle = 'rgba(14, 165, 233, 0.9)';
    ictx.beginPath();
    ictx.roundRect(8, 10, 324, 70, 16);
    ictx.fill();
    ictx.font = 'bold 26px "Fredoka", sans-serif';
    ictx.fillStyle = '#ffffff';
    ictx.textAlign = 'center';
    ictx.fillText('SPACE STATION INFO', 170, 44);
    ictx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ictx.fillText('Mars Scientific Database', 170, 68);
  }
  const infoTex = new THREE.CanvasTexture(infoLabelCanvas);
  infoTex.colorSpace = THREE.SRGBColorSpace;
  const infoSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: infoTex, depthTest: false }));
  infoSprite.scale.set(3.8, 1.0, 1);
  infoSprite.position.set(0, 3.4, 0);
  infoGroup.add(infoSprite);

  group.add(infoGroup);

  // 6. Solar Panel Power Array (4 large tracking panels)
  for (let s = 0; s < 4; s++) {
    const solarStand = new THREE.Group();
    solarStand.position.set(-22 + s * 4.6, 0.8, 20);

    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.y = 1.6;
    solarStand.add(pole);

    const pGeo = new THREE.BoxGeometry(3.6, 2.2, 0.1);
    const pMat = new THREE.MeshStandardMaterial({ color: '#1e1b4b', roughness: 0.18, metalness: 0.9 });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.y = 3.2;
    pMesh.rotation.x = -Math.PI * 0.28;
    solarStand.add(pMesh);

    group.add(solarStand);
  }

  // 7. High-Gain Deep Space Communication Tower (West outpost)
  const towerGroup = new THREE.Group();
  const towerRelX = -20;
  const towerRelZ = -18;
  towerGroup.position.set(towerRelX, 0.8, towerRelZ);

  // Tower Lattice Mast
  const mastGeo = new THREE.CylinderGeometry(0.6, 2.2, 20, 8);
  const mastMesh = new THREE.Mesh(mastGeo, metalMat);
  mastMesh.position.y = 10;
  mastMesh.castShadow = true;
  towerGroup.add(mastMesh);

  // Rotating Satellite Dish
  const towerDish = new THREE.Group();
  towerDish.position.y = 20.5;

  const dishGeo = new THREE.CylinderGeometry(2.8, 0.3, 0.8, 24);
  const dishMesh = new THREE.Mesh(dishGeo, habitatMat);
  dishMesh.rotation.x = Math.PI * 0.35;
  towerDish.add(dishMesh);

  const subGeo = new THREE.ConeGeometry(0.35, 1.4, 12);
  subGeo.rotateX(-Math.PI * 0.65);
  const sub = new THREE.Mesh(subGeo, goldFoilMat);
  sub.position.set(0, 0.5, 0.6);
  towerDish.add(sub);

  towerGroup.add(towerDish);

  // Beacon Obstruction Light
  const towerBeaconLight = new THREE.PointLight(0xef4444, 3.0, 24);
  towerBeaconLight.position.set(0, 22.8, 0);
  towerGroup.add(towerBeaconLight);

  const beaconGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const beaconMesh = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: '#ef4444' }));
  beaconMesh.position.copy(towerBeaconLight.position);
  towerGroup.add(beaconMesh);

  // Tower Label
  const towerLabelCanvas = document.createElement('canvas');
  towerLabelCanvas.width = 300;
  towerLabelCanvas.height = 90;
  const tctx = towerLabelCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = 'rgba(239, 68, 68, 0.88)';
    tctx.beginPath();
    tctx.roundRect(10, 10, 280, 70, 16);
    tctx.fill();
    tctx.font = 'bold 28px "Fredoka", sans-serif';
    tctx.fillStyle = '#ffffff';
    tctx.textAlign = 'center';
    tctx.fillText('COMM TOWER', 150, 46);
    tctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    tctx.fillText('Earth Uplink (Mission 5)', 150, 68);
  }
  const towerLabelTex = new THREE.CanvasTexture(towerLabelCanvas);
  towerLabelTex.colorSpace = THREE.SRGBColorSpace;
  const towerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerLabelTex, depthTest: false }));
  towerSprite.scale.set(4, 1.2, 1);
  towerSprite.position.set(0, 24.8, 0);
  towerGroup.add(towerSprite);

  group.add(towerGroup);

  // 8. Oxygen Refill Station (Refill Pad)
  const refillGroup = new THREE.Group();
  const refillRelX = 10;
  const refillRelZ = -14;
  refillGroup.position.set(refillRelX, 0.8, refillRelZ);

  // Octagonal pad with glowing energy rings
  const refillPadGeo = new THREE.CylinderGeometry(2.8, 3.2, 0.4, 8);
  const refillPadMesh = new THREE.Mesh(refillPadGeo, padMat);
  refillPadMesh.position.y = 0.2;
  refillGroup.add(refillPadMesh);

  const ringGeo = new THREE.TorusGeometry(2.2, 0.14, 8, 32);
  ringGeo.rotateX(Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, neonO2Mat);
  ringMesh.position.y = 0.42;
  refillGroup.add(ringMesh);

  // Floating Holographic O2 Canisters
  const o2CylinderGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.6, 16);
  const o2Mat = new THREE.MeshStandardMaterial({
    color: '#06b6d4',
    emissive: '#0891b2',
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.8,
  });
  const o2Mesh = new THREE.Mesh(o2CylinderGeo, o2Mat);
  o2Mesh.position.y = 1.6;
  refillGroup.add(o2Mesh);

  const refillPadLight = new THREE.PointLight(0x06b6d4, 3.5, 14);
  refillPadLight.position.set(0, 2.0, 0);
  refillGroup.add(refillPadLight);

  // O2 Label
  const o2LabelCanvas = document.createElement('canvas');
  o2LabelCanvas.width = 280;
  o2LabelCanvas.height = 80;
  const o2ctx = o2LabelCanvas.getContext('2d');
  if (o2ctx) {
    o2ctx.fillStyle = 'rgba(6, 182, 212, 0.92)';
    o2ctx.beginPath();
    o2ctx.roundRect(8, 10, 264, 60, 16);
    o2ctx.fill();
    o2ctx.font = 'bold 28px "Fredoka", sans-serif';
    o2ctx.fillStyle = '#ffffff';
    o2ctx.textAlign = 'center';
    o2ctx.fillText('OXYGEN REFILL', 140, 48);
  }
  const o2LabelTex = new THREE.CanvasTexture(o2LabelCanvas);
  o2LabelTex.colorSpace = THREE.SRGBColorSpace;
  const o2Sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: o2LabelTex, depthTest: false }));
  o2Sprite.scale.set(3.4, 0.98, 1);
  o2Sprite.position.set(0, 3.2, 0);
  refillGroup.add(o2Sprite);

  group.add(refillGroup);

  // 9. Science / Educational Quiz Terminal
  const quizTerminalGroup = new THREE.Group();
  const quizRelX = 0;
  const quizRelZ = 4;
  quizTerminalGroup.position.set(quizRelX, 0.8, quizRelZ);

  const consoleGeo = new THREE.BoxGeometry(2.0, 1.3, 0.9);
  const consoleMesh = new THREE.Mesh(consoleGeo, metalMat);
  consoleMesh.position.y = 0.65;
  quizTerminalGroup.add(consoleMesh);

  const screenGeo = new THREE.PlaneGeometry(1.8, 1.1);
  screenGeo.rotateX(-0.35);
  const screenMat = new THREE.MeshBasicMaterial({ color: '#10b981' });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 1.35, 0.15);
  quizTerminalGroup.add(screenMesh);

  const quizLabelCanvas = document.createElement('canvas');
  quizLabelCanvas.width = 300;
  quizLabelCanvas.height = 90;
  const qctx = quizLabelCanvas.getContext('2d');
  if (qctx) {
    qctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
    qctx.beginPath();
    qctx.roundRect(8, 10, 284, 70, 16);
    qctx.fill();
    qctx.font = 'bold 26px "Fredoka", sans-serif';
    qctx.fillStyle = '#ffffff';
    qctx.textAlign = 'center';
    qctx.fillText('SCIENCE QUIZ', 150, 44);
    qctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    qctx.fillText('Mars Academy Exam', 150, 68);
  }
  const qTex = new THREE.CanvasTexture(quizLabelCanvas);
  qTex.colorSpace = THREE.SRGBColorSpace;
  const qSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, depthTest: false }));
  qSprite.scale.set(3.6, 1.05, 1);
  qSprite.position.set(0, 2.8, 0);
  quizTerminalGroup.add(qSprite);

  group.add(quizTerminalGroup);

  // 10. Spacecraft Mars Lander on Launch Pad
  const landerGroup = new THREE.Group();
  landerGroup.position.set(22, 0.8, -20);

  for (let l = 0; l < 4; l++) {
    const leg = new THREE.Group();
    const lAngle = (l * Math.PI) / 2;
    leg.rotation.y = lAngle;

    const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8);
    const strut = new THREE.Mesh(strutGeo, metalMat);
    strut.position.set(1.6, 1.8, 0);
    strut.rotation.z = -0.55;
    leg.add(strut);

    const footGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12);
    const foot = new THREE.Mesh(footGeo, padMat);
    foot.position.set(2.8, 0.1, 0);
    leg.add(foot);

    landerGroup.add(leg);
  }

  const rocketGeo = new THREE.CylinderGeometry(1.8, 2.5, 8.5, 24);
  const rocketMesh = new THREE.Mesh(rocketGeo, habitatMat);
  rocketMesh.position.y = 5.8;
  rocketMesh.castShadow = true;
  landerGroup.add(rocketMesh);

  const noseGeo = new THREE.ConeGeometry(1.8, 3.6, 24);
  const noseMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.35, metalness: 0.4 });
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.position.y = 11.8;
  landerGroup.add(noseMesh);

  group.add(landerGroup);

  // POI coordinates
  const commTowerPos: [number, number, number] = [centerX + towerRelX, groundY + 0.8, centerZ + towerRelZ];
  const oxygenRefillPos: [number, number, number] = [centerX + refillRelX, groundY + 0.8, centerZ + refillRelZ];
  const quizTerminalPos: [number, number, number] = [centerX + quizRelX, groundY + 0.8, centerZ + quizRelZ];
  const infoTerminalPos: [number, number, number] = [centerX + infoRelX, groundY + 0.8, centerZ + infoRelZ];
  const restBayPos: [number, number, number] = [centerX + 18, groundY + 0.8, centerZ];
  const scienceLabPos: [number, number, number] = [centerX + 6.8, groundY + 0.8, centerZ + 18];

  let time = 0;
  let isTowerActivated = false;

  const activateTower = () => {
    isTowerActivated = true;
    towerBeaconLight.color.set('#22c55e');
    beaconMesh.material = new THREE.MeshBasicMaterial({ color: '#22c55e' });
    if (tctx) {
      tctx.clearRect(0, 0, 300, 90);
      tctx.fillStyle = 'rgba(34, 197, 94, 0.92)';
      tctx.beginPath();
      tctx.roundRect(10, 10, 280, 70, 16);
      tctx.fill();
      tctx.font = 'bold 28px "Fredoka", sans-serif';
      tctx.fillStyle = '#ffffff';
      tctx.textAlign = 'center';
      tctx.fillText('UPLINK ONLINE!', 150, 46);
      tctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      tctx.fillText('Earth Connected', 150, 68);
      towerLabelTex.needsUpdate = true;
    }
  };

  const update = (delta: number, playerPos?: THREE.Vector3) => {
    time += delta;
    towerDish.rotation.y += (isTowerActivated ? 0.9 : 0.25) * delta;

    // Distance-cull base point lights via intensity (keeps .visible = true to prevent WebGL shader recompiles)
    let lightsNear = true;
    if (playerPos) {
      const dx = playerPos.x - centerX;
      const dz = playerPos.z - centerZ;
      lightsNear = dx * dx + dz * dz < 72 * 72;
    }
    domeLight.intensity = lightsNear ? 2.4 : 0;
    refillPadLight.intensity = lightsNear ? 3.5 : 0;
    towerBeaconLight.intensity = lightsNear ? (Math.sin(time * 6) + 1) * 1.6 : 0;

    o2Mesh.rotation.y += 1.6 * delta;
    o2Mesh.position.y = 1.6 + Math.sin(time * 3) * 0.16;
  };

  const dispose = () => {
    foundationGeo.dispose();
    domeGeo.dispose();
    habitatMat.dispose();
    domeMat.dispose();
    metalMat.dispose();
    padMat.dispose();
    domeLight.dispose();
    towerBeaconLight.dispose();
    refillPadLight.dispose();
  };

  const registerColliders = (world: CollisionWorld) => {
    // 1. Walkable concrete foundation platform with beveled outer ramp (r = 38..42.2)
    world.addCylinder({
      id: 'base_foundation',
      tag: 'base_deck',
      x: centerX,
      z: centerZ,
      radius: 38,
      bevelOuterRadius: 42.2,
      minY: groundY - 2.5,
      maxY: groundY + 0.8,
      walkableTop: true,
      stepHeight: 0.95,
      blocksCamera: false,
    });

    // 2. Interior hydroponic garden floor (slightly raised walkable deck)
    world.addCylinder({
      id: 'base_garden',
      tag: 'base_deck',
      x: centerX,
      z: centerZ,
      radius: 11,
      minY: groundY + 0.5,
      maxY: groundY + 1.15,
      walkableTop: true,
      stepHeight: 0.5,
      blocksCamera: false,
    });

    // 3. Central biodome hologram pillar (biodome glass dome itself remains enterable for inner terminals)
    world.addCylinder({
      id: 'base_dome_pillar',
      tag: 'structure',
      x: centerX,
      z: centerZ,
      radius: 0.85,
      minY: groundY + 0.8,
      maxY: groundY + 7.5,
      blocksCamera: true,
    });

    // 4. Astronaut Rest Quarters wing & airlock tunnel
    world.addBoxAt(centerX + 18, centerZ, 4.5, 5.2, groundY + 0.8, groundY + 8.3, {
      id: 'base_rest_wing',
      tag: 'building',
      blocksCamera: true,
    });
    world.addBoxAt(centerX + 10.5, centerZ, 4.2, 1.9, groundY + 0.8, groundY + 4.3, {
      id: 'base_tunnel_a',
      tag: 'building',
      blocksCamera: true,
    });

    // 5. Science Lab wing & airlock tunnel
    world.addBoxAt(centerX, centerZ + 18, 5.2, 4.5, groundY + 0.8, groundY + 8.3, {
      id: 'base_lab_wing',
      tag: 'building',
      blocksCamera: true,
    });
    world.addBoxAt(centerX, centerZ + 10.5, 1.9, 4.2, groundY + 0.8, groundY + 4.3, {
      id: 'base_tunnel_b',
      tag: 'building',
      blocksCamera: true,
    });

    // 6. Info Kiosk & Science Quiz Terminal consoles
    world.addBoxAt(centerX + infoRelX, centerZ + infoRelZ, 1.6, 0.65, groundY + 0.8, groundY + 3.0, {
      id: 'base_info_kiosk',
      tag: 'terminal',
      blocksCamera: false,
    });
    world.addBoxAt(centerX + quizRelX, centerZ + quizRelZ, 1.0, 0.5, groundY + 0.8, groundY + 2.5, {
      id: 'base_quiz_terminal',
      tag: 'terminal',
      blocksCamera: false,
    });

    // 7. 4 Solar Panel tracking arrays
    for (let s = 0; s < 4; s++) {
      world.addBoxAt(centerX - 22 + s * 4.6, centerZ + 20, 1.85, 1.1, groundY + 0.8, groundY + 4.8, {
        id: `base_solar_${s}`,
        tag: 'solar_panel',
        blocksCamera: true,
      });
    }

    // 8. High-Gain Deep Space Communication Tower mast
    world.addCylinder({
      id: 'base_comm_tower',
      tag: 'tower',
      x: centerX + towerRelX,
      z: centerZ + towerRelZ,
      radius: 2.15,
      minY: groundY + 0.8,
      maxY: groundY + 22.5,
      blocksCamera: true,
    });

    // 9. Oxygen Refill Station walkable pad & central O2 tank column
    world.addCylinder({
      id: 'base_o2_pad',
      tag: 'pad',
      x: centerX + refillRelX,
      z: centerZ + refillRelZ,
      radius: 2.9,
      bevelOuterRadius: 3.3,
      minY: groundY + 0.7,
      maxY: groundY + 1.2,
      walkableTop: true,
      stepHeight: 0.55,
      blocksCamera: false,
    });
    world.addCylinder({
      id: 'base_o2_canister',
      tag: 'prop',
      x: centerX + refillRelX,
      z: centerZ + refillRelZ,
      radius: 0.45,
      minY: groundY + 1.2,
      maxY: groundY + 3.0,
      blocksCamera: false,
    });

    // 10. Mars Lander Spacecraft & landing legs
    world.addCylinder({
      id: 'base_mars_lander',
      tag: 'rocket',
      x: centerX + 22,
      z: centerZ - 20,
      radius: 2.8,
      minY: groundY + 0.8,
      maxY: groundY + 14.5,
      blocksCamera: true,
    });

    // 11. 16 Perimeter Navigation Bollards
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      world.addCylinder({
        id: `base_beacon_${i}`,
        tag: 'beacon',
        x: centerX + Math.cos(angle) * 36,
        z: centerZ + Math.sin(angle) * 36,
        radius: 0.28,
        minY: groundY + 0.8,
        maxY: groundY + 1.35,
        blocksCamera: false,
      });
    }
  };

  return {
    group,
    towerDish,
    towerBeaconLight,
    refillPadLight,
    isTowerActivated,
    position: [centerX, groundY, centerZ],
    oxygenRefillPos,
    commTowerPos,
    quizTerminalPos,
    infoTerminalPos,
    restBayPos,
    scienceLabPos,
    registerColliders,
    activateTower,
    update,
    dispose,
  };
}
