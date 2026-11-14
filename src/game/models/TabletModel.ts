import * as THREE from 'three';
import { HistoryTabletData } from '../../types/game';
import { INITIAL_HISTORY_TABLETS } from '../../data/marsHistory';
import { getMarsHeight } from '../terrain';
import type { CollisionWorld } from '../physics/CollisionWorld';

export interface TabletInstance {
  data: HistoryTabletData;
  group: THREE.Group;
  holoMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  baseY: number;
  isDiscovered: boolean;
}

export interface TabletManager {
  group: THREE.Group;
  tablets: TabletInstance[];
  registerColliders: (world: CollisionWorld) => void;
  update: (delta: number) => void;
  checkCollection: (
    playerPos: THREE.Vector3,
    onDiscover: (tablet: HistoryTabletData) => void,
    lightCullDist?: number
  ) => void;
  syncDiscoveredIds: (ids: string[]) => void;
  getTabletsList: () => { id: string; x: number; z: number; discovered: boolean }[];
  dispose: () => void;
}

export function createTabletManager(initialDiscoveredIds: string[] = []): TabletManager {
  const root = new THREE.Group();
  root.name = 'MarsHistoryTablets';

  const discoveredSet = new Set(initialDiscoveredIds);

  // Shared optimized geometries across all 8 lore monoliths
  const plinthGeo = new THREE.CylinderGeometry(0.9, 1.15, 0.35, 8);
  const slabGeo = new THREE.BoxGeometry(0.95, 1.45, 0.16);
  const holoGeo = new THREE.PlaneGeometry(0.76, 1.15);
  const capGeo = new THREE.OctahedronGeometry(0.22, 0);
  const ringGeo = new THREE.RingGeometry(1.15, 1.45, 24);
  ringGeo.rotateX(-Math.PI / 2);

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7,
    metalness: 0.4,
  });

  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.65,
  });

  const tabletInstances: TabletInstance[] = [];
  const disposableMaterials: THREE.Material[] = [plinthMat, slabMat];

  INITIAL_HISTORY_TABLETS.forEach((cfg, index) => {
    const x = cfg.position[0];
    const z = cfg.position[2];
    const groundY = getMarsHeight(x, z);
    const isDiscovered = discoveredSet.has(cfg.id);

    const group = new THREE.Group();
    group.position.set(x, groundY, z);

    // Bedrock stone plinth
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.18;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Tilted obsidian archive monolith slab
    const slabPivot = new THREE.Group();
    slabPivot.position.y = 1.0;
    slabPivot.rotation.y = index * 0.7;
    slabPivot.rotation.x = -0.14;

    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.castShadow = true;
    slabPivot.add(slabMesh);

    const accentColor = new THREE.Color(isDiscovered ? '#10b981' : cfg.color);

    // Glowing holographic lore glyph panel (front + back faces via DoubleSide)
    const holoMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: isDiscovered ? 0.35 : 1.1,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: isDiscovered ? 0.65 : 0.92,
      side: THREE.DoubleSide,
    });
    disposableMaterials.push(holoMat);

    const holoMesh = new THREE.Mesh(holoGeo, holoMat);
    holoMesh.position.z = 0.095;
    slabPivot.add(holoMesh);

    const backHolo = new THREE.Mesh(holoGeo, holoMat);
    backHolo.position.z = -0.095;
    slabPivot.add(backHolo);

    // Floating archival beacon crystal cap above slab
    const capMesh = new THREE.Mesh(capGeo, holoMat);
    capMesh.position.y = 0.98;
    slabPivot.add(capMesh);

    group.add(slabPivot);

    // Ground scan halo ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isDiscovered ? 0.25 : 0.65,
      depthWrite: false,
    });
    disposableMaterials.push(ringMat);

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.06;
    group.add(ringMesh);

    root.add(group);

    tabletInstances.push({
      data: {
        ...cfg,
        position: [x, groundY, z],
        discovered: isDiscovered,
      },
      group,
      holoMesh,
      ringMesh,
      baseY: groundY,
      isDiscovered,
    });
  });

  let elapsed = 0;

  const updateVisualState = (t: TabletInstance) => {
    const col = new THREE.Color(t.isDiscovered ? '#10b981' : t.data.color);
    const holoMat = t.holoMesh.material as THREE.MeshStandardMaterial;
    holoMat.color.copy(col);
    holoMat.emissive.copy(col);
    holoMat.emissiveIntensity = t.isDiscovered ? 0.35 : 1.1;
    holoMat.opacity = t.isDiscovered ? 0.65 : 0.92;

    const ringMat = t.ringMesh.material as THREE.MeshBasicMaterial;
    ringMat.color.copy(col);
    ringMat.opacity = t.isDiscovered ? 0.25 : 0.65;
  };

  const update = (delta: number) => {
    elapsed += delta;
    for (let idx = 0; idx < tabletInstances.length; idx++) {
      const t = tabletInstances[idx];
      if (!t.group.visible) continue;
      if (!t.isDiscovered) {
        const holoMat = t.holoMesh.material as THREE.MeshStandardMaterial;
        holoMat.emissiveIntensity = 0.9 + Math.sin(elapsed * 2.8 + idx) * 0.35;
        t.ringMesh.rotation.z += delta * 0.65;
      }
    }
  };

  const checkCollection = (
    playerPos: THREE.Vector3,
    onDiscover: (tablet: HistoryTabletData) => void,
    _lightCullDist: number = 45
  ) => {
    const pickupRadiusSq = 3.0 * 3.0;
    for (let i = 0; i < tabletInstances.length; i++) {
      const t = tabletInstances[i];
      if (t.isDiscovered) continue;
      const dx = playerPos.x - t.group.position.x;
      const dz = playerPos.z - t.group.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < pickupRadiusSq) {
        t.isDiscovered = true;
        t.data.discovered = true;
        updateVisualState(t);
        onDiscover({ ...t.data });
      }
    }
  };

  const syncDiscoveredIds = (ids: string[]) => {
    const set = new Set(ids);
    tabletInstances.forEach((t) => {
      const next = set.has(t.data.id);
      if (next !== t.isDiscovered) {
        t.isDiscovered = next;
        t.data.discovered = next;
        updateVisualState(t);
      }
    });
  };

  const getTabletsList = () =>
    tabletInstances.map((t) => ({
      id: t.data.id,
      x: t.data.position[0],
      z: t.data.position[2],
      discovered: t.isDiscovered,
    }));

  const dispose = () => {
    plinthGeo.dispose();
    slabGeo.dispose();
    holoGeo.dispose();
    capGeo.dispose();
    ringGeo.dispose();
    disposableMaterials.forEach((m) => m.dispose());
  };

  const registerColliders = (world: CollisionWorld) => {
    tabletInstances.forEach((t) => {
      world.addCylinder({
        id: `lore_tablet_${t.data.id}`,
        tag: 'tablet',
        x: t.data.position[0],
        z: t.data.position[2],
        radius: 0.92,
        minY: t.baseY - 0.8,
        maxY: t.baseY + 2.05,
        walkableTop: false,
        blocksCamera: false,
      });
    });
  };

  return {
    group: root,
    tablets: tabletInstances,
    registerColliders,
    update,
    checkCollection,
    syncDiscoveredIds,
    getTabletsList,
    dispose,
  };
}
