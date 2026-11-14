import * as THREE from 'three';
import { MultiplayerAstronaut } from '../../types/game';
import { createRobloxAstronaut, AstronautCharacter } from './AstronautModel';
import { getMarsHeight } from '../terrain';

export interface MultiplayerSystem {
  group: THREE.Group;
  astronauts: { data: MultiplayerAstronaut; model: AstronautCharacter }[];
  update: (delta: number) => void;
  dispose: () => void;
}

const PEER_BOTS: { name: string; color: string; initialPos: [number, number]; waypoints: [number, number][] }[] = [
  {
    name: 'Astro_Zoe',
    color: '#06b6d4', // Cyan suit
    initialPos: [-28, -25],
    waypoints: [
      [-32, -22],
      [-42, -18],
      [-36, -38],
      [-22, -16],
    ],
  },
  {
    name: 'Cosmo_Leo',
    color: '#8b5cf6', // Purple suit
    initialPos: [24, -18],
    waypoints: [
      [30, -22],
      [28, -35],
      [15, -12],
      [24, -18],
    ],
  },
  {
    name: 'MarsCadet_99',
    color: '#10b981', // Emerald suit
    initialPos: [8, 14],
    waypoints: [
      [18, 25],
      [-12, 18],
      [0, 32],
      [8, 14],
    ],
  },
  {
    name: 'StarPilot_Nova',
    color: '#f59e0b', // Amber suit
    initialPos: [-18, 30],
    waypoints: [
      [-25, 38],
      [-45, 15],
      [-20, 20],
      [-18, 30],
    ],
  },
];

import { TrailSystem } from '../effects/TrailSystem';

const _peerFootprintPos = new THREE.Vector3();

export function createMultiplayerSystem(trailSystem?: TrailSystem): MultiplayerSystem {
  const root = new THREE.Group();
  root.name = 'MultiplayerAstronauts';

  const peers: {
    data: MultiplayerAstronaut;
    model: AstronautCharacter;
    currentWaypointIdx: number;
    pauseTimer: number;
    strideDist: number;
    isLeftFoot: boolean;
  }[] = [];

  PEER_BOTS.forEach((bot, index) => {
    const y = getMarsHeight(bot.initialPos[0], bot.initialPos[1]);
    const model = createRobloxAstronaut(bot.color, bot.name, 'Mars Cadet', { simplifyForNpc: true });
    model.group.position.set(bot.initialPos[0], y, bot.initialPos[1]);
    root.add(model.group);

    peers.push({
      data: {
        id: `peer-${index}`,
        name: bot.name,
        color: bot.color,
        position: [bot.initialPos[0], y, bot.initialPos[1]],
        targetPosition: [bot.waypoints[0][0], 0, bot.waypoints[0][1]],
        rotationY: 0,
        walkCycle: 0,
        isMoving: true,
        currentAction: 'Exploring',
      },
      model,
      currentWaypointIdx: 0,
      pauseTimer: Math.random() * 2,
      strideDist: 0,
      isLeftFoot: index % 2 === 0,
    });
  });

  const update = (delta: number) => {
    for (let i = 0; i < peers.length; i++) {
      const peer = peers[i];
      const botConfig = PEER_BOTS[i];
      if (peer.pauseTimer > 0) {
        peer.pauseTimer -= delta;
        peer.model.updateAnimation(0, false, true, false, delta);
        continue;
      }

      const targetX = botConfig.waypoints[peer.currentWaypointIdx][0];
      const targetZ = botConfig.waypoints[peer.currentWaypointIdx][1];

      const curX = peer.model.group.position.x;
      const curZ = peer.model.group.position.z;

      const dx = targetX - curX;
      const dz = targetZ - curZ;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.2) {
        // Switch to next waypoint & pause briefly to "examine samples"
        peer.currentWaypointIdx = (peer.currentWaypointIdx + 1) % botConfig.waypoints.length;
        peer.pauseTimer = 2.5 + Math.random() * 4.0;
        peer.model.updateAnimation(0, false, true, false, delta);
        continue;
      }

      // Move towards target
      const speed = 2.6;
      const moveX = (dx / dist) * speed * delta;
      const moveZ = (dz / dist) * speed * delta;

      const newX = curX + moveX;
      const newZ = curZ + moveZ;
      const newY = getMarsHeight(newX, newZ);

      peer.model.group.position.set(newX, newY, newZ);

      // Face target direction
      const angle = Math.atan2(dx, dz);
      peer.model.group.rotation.y = THREE.MathUtils.damp(
        peer.model.group.rotation.y,
        angle,
        8,
        delta
      );

      peer.model.updateAnimation(speed, false, true, false, delta);

      // Cadet Footprints on Martian surface (Zero-GC preallocated vector)
      if (trailSystem) {
        peer.strideDist += speed * delta;
        if (peer.strideDist >= 0.85) {
          peer.strideDist = 0;
          const lateral = peer.isLeftFoot ? -0.24 : 0.24;
          const footX = newX + Math.cos(angle) * lateral;
          const footZ = newZ - Math.sin(angle) * lateral;
          const footY = getMarsHeight(footX, footZ);
          _peerFootprintPos.set(footX, footY, footZ);
          trailSystem.addFootprint(_peerFootprintPos, angle, peer.isLeftFoot);
          peer.isLeftFoot = !peer.isLeftFoot;
        }
      }
    }
  };

  const dispose = () => {
    peers.forEach((p) => {
      root.remove(p.model.group);
    });
  };

  return {
    group: root,
    astronauts: peers.map((p) => ({ data: p.data, model: p.model })),
    update,
    dispose,
  };
}
