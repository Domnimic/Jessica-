import * as THREE from 'three';
import { getMarsHeight } from '../terrain';
import type { CollisionWorld } from '../physics/CollisionWorld';

export const UNDERGROUND_CHAMBER_Y = -28;
export const UNDERGROUND_CENTER_X = -40;
export const UNDERGROUND_CENTER_Z = -32;

export interface UndergroundBaseObject {
  group: THREE.Group;
  surfaceHatchPos: [number, number, number];
  undergroundReturnPos: [number, number, number];
  undergroundLabBenchPos: [number, number, number];
  undergroundO2Pos: [number, number, number];
  chamberFloorY: number;
  registerColliders: (world: CollisionWorld) => void;
  update: (delta: number, playerPos?: THREE.Vector3, isUnderground?: boolean) => void;
  dispose: () => void;
}

/**
 * Builds both:
 * 1) The glowing Surface Airlock Elevator Hatch on the Research Base pad (-26, -32).
 * 2) A full pressurized Subterranean Mars Research Base chamber at y = -28m featuring
 *    hydroponics, subterranean ice-core drill, O2 station, Science Lab Experiment bench,
 *    and glowing Return Lift Pad.
 */
export function createUndergroundBase(): UndergroundBaseObject {
  const group = new THREE.Group();
  group.name = 'UndergroundMarsBase';

  // --- 1. SURFACE ELEVATOR HATCH ENTRANCE ---
  const hatchX = -26;
  const hatchZ = -32;
  const surfaceBaseY = getMarsHeight(-40, -32) + 0.8;

  const metalMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.4,
    metalness: 0.78,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.55,
    metalness: 0.45,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.7,
    metalness: 0.3,
  });
  const trimCyanMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  const trimEmeraldMat = new THREE.MeshBasicMaterial({ color: '#10b981' });

  const hatchGroup = new THREE.Group();
  hatchGroup.position.set(hatchX, surfaceBaseY, hatchZ);

  const hatchRimGeo = new THREE.CylinderGeometry(2.6, 3.0, 0.45, 16);
  const hatchRim = new THREE.Mesh(hatchRimGeo, metalMat);
  hatchRim.position.y = 0.22;
  hatchGroup.add(hatchRim);

  const hatchRingGeo = new THREE.TorusGeometry(2.1, 0.14, 8, 28);
  hatchRingGeo.rotateX(Math.PI / 2);
  const hatchRing = new THREE.Mesh(hatchRingGeo, trimEmeraldMat);
  hatchRing.position.y = 0.46;
  hatchGroup.add(hatchRing);

  // Floating Holo Label for Surface Hatch
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 360;
  labelCanvas.height = 92;
  const lctx = labelCanvas.getContext('2d');
  if (lctx) {
    lctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
    lctx.beginPath();
    lctx.roundRect(8, 10, 344, 72, 16);
    lctx.fill();
    lctx.font = 'bold 24px "Fredoka", sans-serif';
    lctx.fillStyle = '#ffffff';
    lctx.textAlign = 'center';
    lctx.fillText('UNDERGROUND BASE LIFT', 180, 44);
    lctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    lctx.fillText('Subterranean Lab (-28m)', 180, 68);
  }
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const hatchSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, depthTest: false }));
  hatchSprite.scale.set(4.2, 1.06, 1);
  hatchSprite.position.set(0, 3.4, 0);
  hatchGroup.add(hatchSprite);

  group.add(hatchGroup);

  // --- 2. SUBTERRANEAN CHAMBER AT Y = -28 ---
  const chamber = new THREE.Group();
  chamber.position.set(UNDERGROUND_CENTER_X, UNDERGROUND_CHAMBER_Y, UNDERGROUND_CENTER_Z);

  // Main deck (28m x 28m)
  const deckGeo = new THREE.BoxGeometry(28, 0.8, 28);
  const deckMesh = new THREE.Mesh(deckGeo, floorMat);
  deckMesh.position.y = -0.4;
  chamber.add(deckMesh);

  // Ceiling slab
  const ceilGeo = new THREE.BoxGeometry(28, 0.8, 28);
  const ceilMesh = new THREE.Mesh(ceilGeo, wallMat);
  ceilMesh.position.y = 8.4;
  chamber.add(ceilMesh);

  // 4 Perimeter Reinforced Cave/Habitat Walls
  const wallNSGeo = new THREE.BoxGeometry(28, 8.8, 0.9);
  const wallEWGeo = new THREE.BoxGeometry(0.9, 8.8, 28);
  const northWall = new THREE.Mesh(wallNSGeo, wallMat);
  northWall.position.set(0, 4.2, -14);
  const southWall = new THREE.Mesh(wallNSGeo, wallMat);
  southWall.position.set(0, 4.2, 14);
  const westWall = new THREE.Mesh(wallEWGeo, wallMat);
  westWall.position.set(-14, 4.2, 0);
  const eastWall = new THREE.Mesh(wallEWGeo, wallMat);
  eastWall.position.set(14, 4.2, 0);
  chamber.add(northWall, southWall, westWall, eastWall);

  // Glowing Ceiling Light Strips
  const stripGeo = new THREE.BoxGeometry(20, 0.16, 0.45);
  for (let i = -1; i <= 1; i++) {
    const strip = new THREE.Mesh(stripGeo, trimCyanMat);
    strip.position.set(0, 7.9, i * 6.5);
    chamber.add(strip);
  }

  // Single subterranean chamber light (kept permanently visible, intensity modulated to avoid shader recompiles)
  const chamberLight = new THREE.PointLight(0x38bdf8, 0, 44);
  chamberLight.position.set(0, 6.8, 0);
  chamber.add(chamberLight);

  // Return Elevator Pad (East side, relative +10, 0)
  const returnPad = new THREE.Mesh(hatchRimGeo, metalMat);
  returnPad.position.set(10, 0.22, 0);
  const returnRing = new THREE.Mesh(hatchRingGeo, trimEmeraldMat);
  returnRing.position.set(10, 0.46, 0);
  chamber.add(returnPad, returnRing);

  // Underground Science Lab Bench (North side, relative 0, -9)
  const labBenchGeo = new THREE.BoxGeometry(5.6, 1.3, 1.8);
  const labBench = new THREE.Mesh(labBenchGeo, metalMat);
  labBench.position.set(0, 0.65, -9);
  chamber.add(labBench);

  const labScreenGeo = new THREE.BoxGeometry(3.2, 1.3, 0.15);
  const labScreen = new THREE.Mesh(labScreenGeo, trimCyanMat);
  labScreen.position.set(0, 2.0, -9.4);
  chamber.add(labScreen);

  // Subterranean Ice Core Drill Column (West side, relative -9, 0)
  const drillColGeo = new THREE.CylinderGeometry(0.95, 1.25, 7.4, 16);
  const drillMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.8, roughness: 0.25 });
  const drillCol = new THREE.Mesh(drillColGeo, drillMat);
  drillCol.position.set(-9, 3.7, 0);
  chamber.add(drillCol);

  // Hydroponic Plant Pods (South side, relative -4/+4, +9)
  const planterGeo = new THREE.BoxGeometry(4.2, 1.1, 2.0);
  const plantMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.75 });
  [-4.5, 4.5].forEach((px) => {
    const planter = new THREE.Mesh(planterGeo, metalMat);
    planter.position.set(px, 0.55, 9);
    const foliage = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 1.6), plantMat);
    foliage.position.set(px, 1.3, 9);
    chamber.add(planter, foliage);
  });

  // Underground O2 Station (South-West corner, relative -9, 7)
  const o2Pad = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.3, 12), floorMat);
  o2Pad.position.set(-9, 0.15, 7);
  const o2Tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 12), trimCyanMat);
  o2Tank.position.set(-9, 1.3, 7);
  chamber.add(o2Pad, o2Tank);

  group.add(chamber);

  const surfaceHatchPos: [number, number, number] = [hatchX, surfaceBaseY, hatchZ];
  const undergroundReturnPos: [number, number, number] = [
    UNDERGROUND_CENTER_X + 10,
    UNDERGROUND_CHAMBER_Y,
    UNDERGROUND_CENTER_Z,
  ];
  const undergroundLabBenchPos: [number, number, number] = [
    UNDERGROUND_CENTER_X,
    UNDERGROUND_CHAMBER_Y,
    UNDERGROUND_CENTER_Z - 9,
  ];
  const undergroundO2Pos: [number, number, number] = [
    UNDERGROUND_CENTER_X - 9,
    UNDERGROUND_CHAMBER_Y,
    UNDERGROUND_CENTER_Z + 7,
  ];

  const registerColliders = (world: CollisionWorld) => {
    // 1. Surface hatch lip (walkable step)
    world.addCylinder({
      id: 'ug_surface_hatch',
      tag: 'base_deck',
      x: hatchX,
      z: hatchZ,
      radius: 2.6,
      bevelOuterRadius: 3.1,
      minY: surfaceBaseY - 0.5,
      maxY: surfaceBaseY + 0.45,
      walkableTop: true,
      stepHeight: 0.6,
      blocksCamera: false,
    });

    // 2. Underground chamber solid floor & walls
    world.addBoxAt(
      UNDERGROUND_CENTER_X,
      UNDERGROUND_CENTER_Z,
      14,
      14,
      UNDERGROUND_CHAMBER_Y - 1.5,
      UNDERGROUND_CHAMBER_Y,
      {
        id: 'ug_chamber_floor',
        tag: 'underground_floor',
        walkableTop: true,
        stepHeight: 1.5,
        blocksCamera: false,
      }
    );

    const wallMinY = UNDERGROUND_CHAMBER_Y;
    const wallMaxY = UNDERGROUND_CHAMBER_Y + 8.5;
    world.addBoxAt(UNDERGROUND_CENTER_X, UNDERGROUND_CENTER_Z - 13.8, 14.2, 0.6, wallMinY, wallMaxY, {
      id: 'ug_wall_n',
      tag: 'underground_wall',
      blocksCamera: true,
    });
    world.addBoxAt(UNDERGROUND_CENTER_X, UNDERGROUND_CENTER_Z + 13.8, 14.2, 0.6, wallMinY, wallMaxY, {
      id: 'ug_wall_s',
      tag: 'underground_wall',
      blocksCamera: true,
    });
    world.addBoxAt(UNDERGROUND_CENTER_X - 13.8, UNDERGROUND_CENTER_Z, 0.6, 14.2, wallMinY, wallMaxY, {
      id: 'ug_wall_w',
      tag: 'underground_wall',
      blocksCamera: true,
    });
    world.addBoxAt(UNDERGROUND_CENTER_X + 13.8, UNDERGROUND_CENTER_Z, 0.6, 14.2, wallMinY, wallMaxY, {
      id: 'ug_wall_e',
      tag: 'underground_wall',
      blocksCamera: true,
    });

    // Interior furniture colliders
    world.addBoxAt(UNDERGROUND_CENTER_X, UNDERGROUND_CENTER_Z - 9, 2.8, 0.9, wallMinY, UNDERGROUND_CHAMBER_Y + 2.8, {
      id: 'ug_lab_bench',
      tag: 'terminal',
      blocksCamera: false,
    });
    world.addCylinder({
      id: 'ug_ice_drill',
      tag: 'machinery',
      x: UNDERGROUND_CENTER_X - 9,
      z: UNDERGROUND_CENTER_Z,
      radius: 1.35,
      minY: wallMinY,
      maxY: UNDERGROUND_CHAMBER_Y + 7.5,
      blocksCamera: true,
    });
    world.addBoxAt(UNDERGROUND_CENTER_X - 4.5, UNDERGROUND_CENTER_Z + 9, 2.1, 1.0, wallMinY, UNDERGROUND_CHAMBER_Y + 1.6, {
      id: 'ug_planter_w',
      tag: 'prop',
      blocksCamera: false,
    });
    world.addBoxAt(UNDERGROUND_CENTER_X + 4.5, UNDERGROUND_CENTER_Z + 9, 2.1, 1.0, wallMinY, UNDERGROUND_CHAMBER_Y + 1.6, {
      id: 'ug_planter_e',
      tag: 'prop',
      blocksCamera: false,
    });
  };

  const update = (delta: number, _playerPos?: THREE.Vector3, isUnderground = false) => {
    if (isUnderground) {
      o2Tank.rotation.y += 1.4 * delta;
    }
    chamber.visible = isUnderground;
    chamberLight.intensity = isUnderground ? 5.2 : 0;
  };

  const dispose = () => {
    hatchRimGeo.dispose();
    hatchRingGeo.dispose();
    deckGeo.dispose();
    ceilGeo.dispose();
    wallNSGeo.dispose();
    wallEWGeo.dispose();
    stripGeo.dispose();
    labBenchGeo.dispose();
    labScreenGeo.dispose();
    drillColGeo.dispose();
    planterGeo.dispose();
    metalMat.dispose();
    wallMat.dispose();
    floorMat.dispose();
    trimCyanMat.dispose();
    trimEmeraldMat.dispose();
    drillMat.dispose();
    plantMat.dispose();
    labelTex.dispose();
    chamberLight.dispose();
  };

  return {
    group,
    surfaceHatchPos,
    undergroundReturnPos,
    undergroundLabBenchPos,
    undergroundO2Pos,
    chamberFloorY: UNDERGROUND_CHAMBER_Y,
    registerColliders,
    update,
    dispose,
  };
}
