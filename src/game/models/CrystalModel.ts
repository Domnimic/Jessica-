import * as THREE from 'three';
import { CrystalData } from '../../types/game';
import { getMarsHeight } from '../terrain';

export interface CrystalManager {
  group: THREE.Group;
  crystals: CrystalInstance[];
  update: (delta: number) => void;
  checkCollection: (
    playerPos: THREE.Vector3,
    onCollect: (crystal: CrystalData) => void,
    lightCullDist?: number
  ) => void;
  markCollectedById: (crystalId: number, animate?: boolean) => CrystalData | null;
  resetAll: () => void;
  dispose: () => void;
}

export interface CrystalInstance {
  data: CrystalData;
  group: THREE.Group;
  mesh: THREE.Mesh;
  baseY: number;
  isCollected: boolean;
  collectAnimProgress: number;
}

const MARTIAN_CRYSTAL_CONFIGS = [
  {
    x: 14,
    z: 16,
    name: 'Olivine Crystal Prism',
    mineral: 'Olivine (Silicate)',
    fact: 'Olivine is a primary volcanic mineral found in basaltic Martian lava plains.',
    color: '#10b981', // Emerald green
  },
  {
    x: -18,
    z: 22,
    name: 'Martian Hematite Spherule',
    mineral: 'Hematite (Iron Oxide)',
    fact: 'Nicknamed "Martian blueberries," these formed inside ancient groundwater pools.',
    color: '#f43f5e', // Ruby red
  },
  {
    x: 36,
    z: -14,
    name: 'Jarosite Mineral Shard',
    mineral: 'Jarosite (Hydrated Sulfate)',
    fact: 'Discovered by the Opportunity rover, proving ancient acidic water once existed.',
    color: '#f59e0b', // Amber
  },
  {
    x: -28,
    z: -10,
    name: 'Silica Opal Gem',
    mineral: 'Hydrated Silica (Opal)',
    fact: 'Formed in ancient hydrothermal vents, excellent for preserving fossil micro-life.',
    color: '#06b6d4', // Cyan
  },
  {
    x: 52,
    z: 32,
    name: 'Olympus Basalt Crystal',
    mineral: 'Titaniferous Basalt',
    fact: 'Cooled rapidly from lava flows erupting from Olympus Mons volcano.',
    color: '#8b5cf6', // Violet
  },
  {
    x: -54,
    z: 18,
    name: 'Valley Gypsum Vein',
    mineral: 'Calcium Sulfate (Gypsum)',
    fact: 'Formed as minerals precipitated from water drying out in Martian valleys.',
    color: '#e879f9', // Pink
  },
  {
    x: 16,
    z: -52,
    name: 'Magnetite Crystal Cluster',
    mineral: 'Magnetite (Magnetic Iron)',
    fact: 'Causes Martian sand to cling to rovers’ magnetic calibration targets.',
    color: '#fbbf24', // Gold
  },
  {
    x: -64,
    z: -42,
    name: 'Deep Canyon Smectite',
    mineral: 'Smectite Clay',
    fact: 'Clay formed in neutral pH water during Mars’ early Noachian era.',
    color: '#a3e635', // Lime
  },
  {
    x: 64,
    z: -58,
    name: 'Highlands Feldspar Geode',
    mineral: 'Plagioclase Feldspar',
    fact: 'Abundant in the ancient southern highlands crust dating back 4 billion years.',
    color: '#38bdf8', // Sky blue
  },
  {
    x: -10,
    z: -68,
    name: 'Polar Perchlorate Diamond',
    mineral: 'Magnesium Perchlorate',
    fact: 'Lowers water freezing point, enabling brine to remain liquid at -70°C.',
    color: '#c084fc', // Purple
  },
];

export function createCrystalManager(): CrystalManager {
  const root = new THREE.Group();
  root.name = 'MartianCrystals';

  const crystalInstances: CrystalInstance[] = [];
  const gemGeo = new THREE.OctahedronGeometry(0.75, 0);
  const ringGeo = new THREE.RingGeometry(0.7, 1.05, 16);
  ringGeo.rotateX(-Math.PI / 2);

  MARTIAN_CRYSTAL_CONFIGS.forEach((cfg, index) => {
    const y = getMarsHeight(cfg.x, cfg.z) + 0.85;
    const itemGroup = new THREE.Group();
    itemGroup.position.set(cfg.x, y, cfg.z);

    const color = new THREE.Color(cfg.color);

    // Optimized PBR material without transmission to prevent secondary render pass bottlenecks
    const gemMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(gemGeo, gemMat);
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    itemGroup.add(mesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = -0.75;
    ringMesh.frustumCulled = true;
    itemGroup.add(ringMesh);

    root.add(itemGroup);

    crystalInstances.push({
      data: {
        id: index + 1,
        name: cfg.name,
        mineralType: cfg.mineral,
        scientificFact: cfg.fact,
        position: [cfg.x, y, cfg.z],
        collected: false,
        color: cfg.color,
        points: 50,
      },
      group: itemGroup,
      mesh,
      baseY: y,
      isCollected: false,
      collectAnimProgress: 0,
    });
  });

  let time = 0;
  let distCheckTimer = 0;

  const update = (delta: number) => {
    time += delta;
    distCheckTimer += delta;

    for (let i = 0; i < crystalInstances.length; i++) {
      const c = crystalInstances[i];
      if (c.isCollected) {
        if (c.collectAnimProgress < 1) {
          c.collectAnimProgress += delta * 3.2;
          const p = Math.min(c.collectAnimProgress, 1);
          c.group.position.y += delta * 6;
          const s = Math.max(1 - p, 0.001);
          c.group.scale.set(s, s, s);
          if (p >= 1) {
            c.group.visible = false;
          }
        }
        continue;
      }

      if (!c.group.visible) continue;

      c.mesh.rotation.y += 1.8 * delta;
      c.mesh.rotation.x = Math.sin(time * 2 + c.data.id) * 0.25;
      c.group.position.y = c.baseY + Math.sin(time * 2.5 + c.data.id) * 0.25;
    }
  };

  const checkCollection = (
    playerPos: THREE.Vector3,
    onCollect: (crystal: CrystalData) => void,
    _lightCullDist: number = 55
  ) => {
    const pickupRadiusSq = 2.5 * 2.5;
    for (let i = 0; i < crystalInstances.length; i++) {
      const c = crystalInstances[i];
      if (c.isCollected) continue;

      const dx = playerPos.x - c.group.position.x;
      const dz = playerPos.z - c.group.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < pickupRadiusSq) {
        c.isCollected = true;
        c.data.collected = true;
        c.collectAnimProgress = 0.01;
        onCollect(c.data);
      }
    }
  };

  const markCollectedById = (crystalId: number, animate = true): CrystalData | null => {
    const target = crystalInstances.find((c) => c.data.id === crystalId);
    if (!target || target.isCollected) return null;

    target.isCollected = true;
    target.data.collected = true;
    if (animate) {
      target.collectAnimProgress = 0.01;
    } else {
      target.collectAnimProgress = 1;
      target.group.visible = false;
    }
    return target.data;
  };

  const resetAll = () => {
    crystalInstances.forEach((c) => {
      c.isCollected = false;
      c.data.collected = false;
      c.collectAnimProgress = 0;
      c.group.visible = true;
      c.group.scale.set(1, 1, 1);
      c.group.position.set(c.data.position[0], c.baseY, c.data.position[2]);
    });
  };

  const dispose = () => {
    gemGeo.dispose();
    ringGeo.dispose();
  };

  return {
    group: root,
    crystals: crystalInstances,
    update,
    checkCollection,
    markCollectedById,
    resetAll,
    dispose,
  };
}
