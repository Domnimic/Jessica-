import * as THREE from 'three';
import { getMarsHeight } from '../terrain';
import { INITIAL_SATELLITE_RELAYS } from '../../data/expeditionExtensions';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type { SatelliteRelayData } from '../../types/game';

interface SatelliteRelayEntry {
  data: SatelliteRelayData;
  group: THREE.Group;
  dishPivot: THREE.Group;
  beamMesh: THREE.Mesh;
  beaconOrb: THREE.Mesh;
  statusCanvas: HTMLCanvasElement;
  statusTex: THREE.CanvasTexture;
}

export interface SatelliteRelayManager {
  group: THREE.Group;
  relays: SatelliteRelayEntry[];
  registerColliders: (world: CollisionWorld) => void;
  alignRelay: (id: string) => boolean;
  resetAll: () => void;
  getRelaysList: () => SatelliteRelayData[];
  update: (delta: number, playerPos?: THREE.Vector3) => void;
  dispose: () => void;
}

/**
 * Builds 3 interactive Mars Satellite Communication Relay Dishes across terrain peaks/plateaus
 * with rotating parabolic reflectors and orbital sky laser beams when calibrated.
 */
export function createSatelliteRelayManager(): SatelliteRelayManager {
  const group = new THREE.Group();
  group.name = 'SatelliteRelays';

  const metalMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.45,
    metalness: 0.78,
  });
  const dishMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.25,
    metalness: 0.5,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.25,
    metalness: 0.85,
  });

  const padGeo = new THREE.CylinderGeometry(3.2, 3.6, 0.5, 16);
  const mastGeo = new THREE.CylinderGeometry(0.42, 0.72, 4.6, 12);
  const dishGeo = new THREE.CylinderGeometry(2.1, 0.25, 0.65, 24);
  const hornGeo = new THREE.ConeGeometry(0.24, 0.9, 10);
  hornGeo.rotateX(-Math.PI * 0.7);
  const orbGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const beamGeo = new THREE.CylinderGeometry(0.18, 0.55, 68, 12, 1, true);

  const relays: SatelliteRelayEntry[] = [];

  const drawLabel = (canvas: HTMLCanvasElement, name: string, aligned: boolean) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = aligned ? 'rgba(16, 185, 129, 0.92)' : 'rgba(245, 158, 11, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 10, 324, 72, 16);
    ctx.fill();
    ctx.font = 'bold 23px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 170, 44);
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(aligned ? 'SIGNAL LOCKED ✓' : 'NEEDS DISH ALIGNMENT', 170, 68);
  };

  INITIAL_SATELLITE_RELAYS.forEach((raw) => {
    const x = raw.position[0];
    const z = raw.position[2];
    const groundY = getMarsHeight(x, z);
    const data: SatelliteRelayData = {
      ...raw,
      position: [x, groundY, z],
      aligned: false,
    };

    const relayGroup = new THREE.Group();
    relayGroup.position.set(x, groundY, z);

    const pad = new THREE.Mesh(padGeo, metalMat);
    pad.position.y = 0.25;
    pad.receiveShadow = true;
    relayGroup.add(pad);

    const mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.y = 2.6;
    mast.castShadow = true;
    relayGroup.add(mast);

    const dishPivot = new THREE.Group();
    dishPivot.position.y = 4.9;
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI * 0.32;
    dishPivot.add(dishMesh);

    const horn = new THREE.Mesh(hornGeo, goldMat);
    horn.position.set(0, 0.45, 0.48);
    dishPivot.add(horn);
    relayGroup.add(dishPivot);

    const beaconOrb = new THREE.Mesh(
      orbGeo,
      new THREE.MeshBasicMaterial({ color: '#f59e0b' })
    );
    beaconOrb.position.set(0, 5.7, 0);
    relayGroup.add(beaconOrb);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 39, 0);
    beamMesh.visible = false;
    relayGroup.add(beamMesh);

    const statusCanvas = document.createElement('canvas');
    statusCanvas.width = 340;
    statusCanvas.height = 92;
    drawLabel(statusCanvas, data.name, false);
    const statusTex = new THREE.CanvasTexture(statusCanvas);
    statusTex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: statusTex, depthTest: false }));
    sprite.scale.set(4.1, 1.1, 1);
    sprite.position.set(0, 7.6, 0);
    relayGroup.add(sprite);

    group.add(relayGroup);
    relays.push({
      data,
      group: relayGroup,
      dishPivot,
      beamMesh,
      beaconOrb,
      statusCanvas,
      statusTex,
    });
  });

  const registerColliders = (world: CollisionWorld) => {
    relays.forEach((r) => {
      const gy = r.data.position[1];
      world.addCylinder({
        id: `sat_pad_${r.data.id}`,
        tag: 'base_deck',
        x: r.data.position[0],
        z: r.data.position[2],
        radius: 3.1,
        bevelOuterRadius: 3.65,
        minY: gy - 0.5,
        maxY: gy + 0.5,
        walkableTop: true,
        stepHeight: 0.55,
        blocksCamera: false,
      });
      world.addCylinder({
        id: `sat_mast_${r.data.id}`,
        tag: 'tower',
        x: r.data.position[0],
        z: r.data.position[2],
        radius: 0.85,
        minY: gy + 0.5,
        maxY: gy + 6.0,
        blocksCamera: true,
      });
    });
  };

  const applyAlignedVisual = (entry: SatelliteRelayEntry, aligned: boolean) => {
    entry.data.aligned = aligned;
    entry.beamMesh.visible = aligned;
    (entry.beaconOrb.material as THREE.MeshBasicMaterial).color.set(aligned ? '#10b981' : '#f59e0b');
    drawLabel(entry.statusCanvas, entry.data.name, aligned);
    entry.statusTex.needsUpdate = true;
  };

  const alignRelay = (id: string): boolean => {
    const found = relays.find((r) => r.data.id === id);
    if (!found || found.data.aligned) return false;
    applyAlignedVisual(found, true);
    return true;
  };

  const resetAll = () => {
    relays.forEach((r) => applyAlignedVisual(r, false));
  };

  const getRelaysList = () => relays.map((r) => ({ ...r.data }));

  let t = 0;
  const update = (delta: number, _playerPos?: THREE.Vector3) => {
    t += delta;
    relays.forEach((r, idx) => {
      if (r.data.aligned) {
        r.dishPivot.rotation.y += delta * 0.45;
      } else {
        r.dishPivot.rotation.y = Math.sin(t * 0.7 + idx) * 0.9;
      }
    });
  };

  const dispose = () => {
    padGeo.dispose();
    mastGeo.dispose();
    dishGeo.dispose();
    hornGeo.dispose();
    orbGeo.dispose();
    beamGeo.dispose();
    metalMat.dispose();
    dishMat.dispose();
    goldMat.dispose();
    relays.forEach((r) => {
      r.statusTex.dispose();
    });
  };

  return {
    group,
    relays,
    registerColliders,
    alignRelay,
    resetAll,
    getRelaysList,
    update,
    dispose,
  };
}
