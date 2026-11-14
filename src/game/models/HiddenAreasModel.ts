import * as THREE from 'three';
import { getMarsHeight } from '../terrain';
import { INITIAL_HIDDEN_AREAS } from '../../data/expeditionExtensions';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type { HiddenAreaData } from '../../types/game';

interface HiddenAreaEntry {
  data: HiddenAreaData;
  group: THREE.Group;
  beaconOrb: THREE.Mesh;
  sidePillars: { x: number; z: number; r: number; h: number }[];
}

export interface HiddenAreasManager {
  group: THREE.Group;
  areas: HiddenAreaEntry[];
  registerColliders: (world: CollisionWorld) => void;
  checkDiscovery: (playerPos: THREE.Vector3, onDiscover: (area: HiddenAreaData) => void) => void;
  markDiscoveredById: (id: string) => boolean;
  update: (delta: number, playerPos?: THREE.Vector3) => void;
  resetAll: () => void;
  getAreasList: () => HiddenAreaData[];
  dispose: () => void;
}

/**
 * Builds walkable Martian Caves (lava tubes / frost caverns with stone arches & crystals)
 * and Secret Research Outpost Pods scattered across scenic valleys and craters.
 */
export function createHiddenAreasManager(): HiddenAreasManager {
  const group = new THREE.Group();
  group.name = 'HiddenExplorationAreas';

  const caveRockMat = new THREE.MeshStandardMaterial({
    color: '#57281a',
    roughness: 0.94,
    metalness: 0.08,
    flatShading: true,
  });

  const darkBasaltMat = new THREE.MeshStandardMaterial({
    color: '#2d1c1b',
    roughness: 0.9,
    metalness: 0.14,
    flatShading: true,
  });

  const frostMat = new THREE.MeshStandardMaterial({
    color: '#7dd3fc',
    emissive: '#0284c7',
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.35,
  });

  const hullMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.35,
    metalness: 0.45,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    color: '#1e1b4b',
    roughness: 0.2,
    metalness: 0.85,
  });

  const rockBlockGeo = new THREE.DodecahedronGeometry(2.8, 0);
  const stalagmiteGeo = new THREE.ConeGeometry(0.45, 2.0, 6);
  const podDomeGeo = new THREE.SphereGeometry(2.8, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const podBaseGeo = new THREE.CylinderGeometry(3.2, 3.5, 0.7, 16);
  const orbGeo = new THREE.OctahedronGeometry(0.55, 0);

  const areas: HiddenAreaEntry[] = [];

  INITIAL_HIDDEN_AREAS.forEach((rawArea, idx) => {
    const x = rawArea.position[0];
    const z = rawArea.position[2];
    const groundY = getMarsHeight(x, z);
    const data: HiddenAreaData = {
      ...rawArea,
      position: [x, groundY, z],
      discovered: false,
    };

    const siteGroup = new THREE.Group();
    siteGroup.position.set(x, groundY, z);

    const sidePillars: { x: number; z: number; r: number; h: number }[] = [];

    if (data.category === 'cave') {
      // Build a majestic walkable Martian cavern archway + cavern overhang ribs
      const glowMat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.8,
        roughness: 0.25,
      });

      const caveMat = idx % 2 === 0 ? caveRockMat : darkBasaltMat;

      // 3 arched ribs along Z axis (spaced comfortably so players can walk straight through!)
      for (let r = -1; r <= 1; r++) {
        const zOff = r * 4.2;

        // Left wall boulder
        const leftRock = new THREE.Mesh(rockBlockGeo, caveMat);
        leftRock.position.set(-4.6, 1.8, zOff);
        leftRock.scale.set(1.15, 1.45, 1.2);
        leftRock.rotation.set(r * 0.4, idx + 0.5, 0.2);
        leftRock.castShadow = true;
        leftRock.receiveShadow = true;
        siteGroup.add(leftRock);
        sidePillars.push({ x: x - 4.6, z: z + zOff, r: 2.3, h: groundY + 5.2 });

        // Right wall boulder
        const rightRock = new THREE.Mesh(rockBlockGeo, caveMat);
        rightRock.position.set(4.6, 1.8, zOff);
        rightRock.scale.set(1.15, 1.45, 1.2);
        rightRock.rotation.set(-r * 0.3, idx + 1.1, -0.2);
        rightRock.castShadow = true;
        rightRock.receiveShadow = true;
        siteGroup.add(rightRock);
        sidePillars.push({ x: x + 4.6, z: z + zOff, r: 2.3, h: groundY + 5.2 });

        // Overhead stone arch cap (high enough at Y=5.4 for third-person camera clearance)
        const roofRock = new THREE.Mesh(rockBlockGeo, caveMat);
        roofRock.position.set(0, 5.4, zOff);
        roofRock.scale.set(2.3, 0.85, 1.25);
        roofRock.rotation.y = r * 0.7;
        roofRock.castShadow = true;
        siteGroup.add(roofRock);
      }

      // Glowing subterranean mineral formations lining inner cavern sides
      const crystalMat = data.id === 'cryo_frost_grotto' ? frostMat : glowMat;
      for (let k = 0; k < 6; k++) {
        const side = k % 2 === 0 ? -2.7 : 2.7;
        const cz = -4.0 + Math.floor(k / 2) * 3.8;
        const shard = new THREE.Mesh(stalagmiteGeo, crystalMat);
        shard.position.set(side, 0.9, cz);
        shard.rotation.z = side > 0 ? 0.22 : -0.22;
        siteGroup.add(shard);
      }

      const orbMat = glowMat;
      const beaconOrb = new THREE.Mesh(orbGeo, orbMat);
      beaconOrb.position.set(0, 2.2, 0);
      siteGroup.add(beaconOrb);

      group.add(siteGroup);
      areas.push({ data, group: siteGroup, beaconOrb, sidePillars });
    } else {
      // Secret Research Location Pod (domed field capsule + solar wings + holo node)
      const podBase = new THREE.Mesh(podBaseGeo, darkBasaltMat);
      podBase.position.y = 0.35;
      podBase.receiveShadow = true;
      siteGroup.add(podBase);

      const glowMat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      });

      const domeShell = new THREE.Mesh(podDomeGeo, hullMat);
      domeShell.position.y = 0.7;
      domeShell.castShadow = true;
      siteGroup.add(domeShell);

      // Side solar paddles
      const wingGeo = new THREE.BoxGeometry(2.6, 0.1, 1.4);
      const wLeft = new THREE.Mesh(wingGeo, solarMat);
      wLeft.position.set(-4.3, 1.2, 0);
      wLeft.rotation.x = -0.35;
      const wRight = new THREE.Mesh(wingGeo, solarMat);
      wRight.position.set(4.3, 1.2, 0);
      wRight.rotation.x = -0.35;
      siteGroup.add(wLeft, wRight);

      sidePillars.push({ x, z, r: 2.9, h: groundY + 3.6 });

      const beaconOrb = new THREE.Mesh(orbGeo, glowMat);
      beaconOrb.position.set(0, 4.4, 0);
      siteGroup.add(beaconOrb);

      group.add(siteGroup);
      areas.push({ data, group: siteGroup, beaconOrb, sidePillars });
    }
  });

  const registerColliders = (world: CollisionWorld) => {
    areas.forEach((entry) => {
      const gy = entry.data.position[1];
      entry.sidePillars.forEach((p, idx) => {
        world.addCylinder({
          id: `hidden_${entry.data.id}_${idx}`,
          tag: entry.data.category === 'cave' ? 'cave_wall' : 'secret_pod',
          x: p.x,
          z: p.z,
          radius: p.r,
          minY: gy - 1.5,
          maxY: p.h,
          blocksCamera: false,
        });
      });
    });
  };

  const checkDiscovery = (playerPos: THREE.Vector3, onDiscover: (area: HiddenAreaData) => void) => {
    for (let i = 0; i < areas.length; i++) {
      const entry = areas[i];
      if (entry.data.discovered) continue;
      const dx = playerPos.x - entry.data.position[0];
      const dz = playerPos.z - entry.data.position[2];
      if (dx * dx + dz * dz <= entry.data.radius * entry.data.radius) {
        entry.data.discovered = true;
        onDiscover({ ...entry.data });
      }
    }
  };

  let elapsed = 0;
  const update = (delta: number, _playerPos?: THREE.Vector3) => {
    elapsed += delta;
    for (let i = 0; i < areas.length; i++) {
      const entry = areas[i];
      entry.beaconOrb.rotation.y += 1.4 * delta;
      entry.beaconOrb.position.y =
        (entry.data.category === 'cave' ? 2.2 : 4.4) + Math.sin(elapsed * 2.4 + i) * 0.25;
    }
  };

  const markDiscoveredById = (id: string): boolean => {
    const found = areas.find((a) => a.data.id === id);
    if (!found || found.data.discovered) return false;
    found.data.discovered = true;
    return true;
  };

  const resetAll = () => {
    areas.forEach((a) => {
      a.data.discovered = false;
    });
  };

  const getAreasList = () => areas.map((a) => ({ ...a.data }));

  const dispose = () => {
    rockBlockGeo.dispose();
    stalagmiteGeo.dispose();
    podDomeGeo.dispose();
    podBaseGeo.dispose();
    orbGeo.dispose();
    caveRockMat.dispose();
    darkBasaltMat.dispose();
    frostMat.dispose();
    hullMat.dispose();
    solarMat.dispose();
  };

  return {
    group,
    areas,
    registerColliders,
    checkDiscovery,
    markDiscoveredById,
    update,
    resetAll,
    getAreasList,
    dispose,
  };
}
