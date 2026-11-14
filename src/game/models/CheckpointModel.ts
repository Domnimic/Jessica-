import * as THREE from 'three';
import { CheckpointData } from '../../types/game';
import { getMarsHeight } from '../terrain';
import type { CollisionWorld } from '../physics/CollisionWorld';

export interface CheckpointManager {
  group: THREE.Group;
  checkpoints: CheckpointInstance[];
  activeCheckpoint: CheckpointData;
  registerColliders: (world: CollisionWorld) => void;
  update: (delta: number) => void;
  checkActivation: (
    playerPos: THREE.Vector3,
    onActivate: (cp: CheckpointData) => void,
    lightCullDist?: number
  ) => void;
  setActiveCheckpoint: (id: string) => void;
  dispose: () => void;
}

export interface CheckpointInstance {
  data: CheckpointData;
  group: THREE.Group;
  padMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  isActivated: boolean;
}

export function createCheckpointManager(initialCheckpoints: CheckpointData[]): CheckpointManager {
  const root = new THREE.Group();
  root.name = 'Checkpoints';

  const instances: CheckpointInstance[] = [];
  let currentActive = initialCheckpoints[0];

  const padGeo = new THREE.CylinderGeometry(2.2, 2.6, 0.35, 8);
  const ringGeo = new THREE.TorusGeometry(1.9, 0.1, 8, 24);
  ringGeo.rotateX(Math.PI / 2);

  // Vertical light column beacon
  const beamGeo = new THREE.CylinderGeometry(0.25, 0.6, 25, 12, 1, true);
  beamGeo.translate(0, 12.5, 0);

  initialCheckpoints.forEach((cp) => {
    const y = getMarsHeight(cp.position[0], cp.position[2]);
    const cpGroup = new THREE.Group();
    cpGroup.position.set(cp.position[0], y, cp.position[2]);

    const isInitialActive = cp.id === currentActive.id;

    const padMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.7,
      metalness: 0.4,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.y = 0.17;
    padMesh.receiveShadow = true;
    cpGroup.add(padMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: isInitialActive ? '#22c55e' : '#f59e0b',
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.36;
    cpGroup.add(ringMesh);

    const beamMat = new THREE.MeshBasicMaterial({
      color: isInitialActive ? '#22c55e' : '#f59e0b',
      transparent: true,
      opacity: isInitialActive ? 0.35 : 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    cpGroup.add(beamMesh);

    // Floating Checkpoint Label Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = isInitialActive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(245, 158, 11, 0.85)';
      ctx.beginPath();
      ctx.roundRect(8, 10, 304, 70, 16);
      ctx.fill();
      ctx.font = 'bold 26px "Fredoka", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(cp.name, 160, 44);
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(isInitialActive ? 'ACTIVE CHECKPOINT' : 'TOUCH TO ACTIVATE', 160, 68);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(3.6, 1.0, 1);
    sprite.position.set(0, 3.8, 0);
    cpGroup.add(sprite);

    root.add(cpGroup);

    instances.push({
      data: { ...cp, position: [cp.position[0], y, cp.position[2]] },
      group: cpGroup,
      padMesh,
      beamMesh,
      isActivated: isInitialActive,
    });
  });

  const update = (delta: number) => {
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      inst.beamMesh.rotation.y += (inst.isActivated ? 0.8 : 0.3) * delta;
    }
  };

  const checkActivation = (
    playerPos: THREE.Vector3,
    onActivate: (cp: CheckpointData) => void,
    _lightCullDist: number = 65
  ) => {
    const activateSq = 3.2 * 3.2;
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      if (inst.isActivated) continue;
      const dx = playerPos.x - inst.group.position.x;
      const dz = playerPos.z - inst.group.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < activateSq) {
        setActiveCheckpoint(inst.data.id);
        onActivate(inst.data);
      }
    }
  };

  const setActiveCheckpoint = (id: string) => {
    instances.forEach((inst) => {
      const isTarget = inst.data.id === id;
      inst.isActivated = isTarget;
      inst.data.activated = isTarget;
      if (isTarget) {
        currentActive = inst.data;
      }

      const activeColor = isTarget ? 0x22c55e : 0xf59e0b;
      (inst.beamMesh.material as THREE.MeshBasicMaterial).color.setHex(activeColor);
      (inst.beamMesh.material as THREE.MeshBasicMaterial).opacity = isTarget ? 0.38 : 0.15;
    });
  };

  const dispose = () => {
    padGeo.dispose();
    ringGeo.dispose();
    beamGeo.dispose();
  };

  const registerColliders = (world: CollisionWorld) => {
    instances.forEach((inst) => {
      const [cx, cy, cz] = inst.data.position;
      world.addCylinder({
        id: `checkpoint_pad_${inst.data.id}`,
        tag: 'checkpoint_pad',
        x: cx,
        z: cz,
        radius: 2.25,
        bevelOuterRadius: 2.65,
        minY: cy - 1.0,
        maxY: cy + 0.35,
        walkableTop: true,
        stepHeight: 0.45,
        blocksCamera: false,
      });
    });
  };

  return {
    group: root,
    checkpoints: instances,
    get activeCheckpoint() {
      return currentActive;
    },
    registerColliders,
    update,
    checkActivation,
    setActiveCheckpoint,
    dispose,
  };
}
