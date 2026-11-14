import * as THREE from 'three';
import { SUIT_COLORS, SuitColor } from '../../types/game';
import { PingBeaconData, RemotePlayerState } from '../../types/multiplayer';
import { AstronautCharacter, createRobloxAstronaut } from './AstronautModel';
import { TrailSystem } from '../effects/TrailSystem';
import { getMarsHeight } from '../terrain';

interface RemoteActorEntry {
  state: RemotePlayerState;
  model: AstronautCharacter;
  targetPos: THREE.Vector3;
  targetRotY: number;
  strideDist: number;
  isLeftFoot: boolean;
}

interface PingMeshEntry {
  group: THREE.Group;
  ring: THREE.Mesh;
  expiresAt: number;
}

const _remoteFootPos = new THREE.Vector3();

function shortestAngleDiff(from: number, to: number): number {
  let diff = (to - from + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  return diff - Math.PI;
}

export class RemotePlayersManager {
  public group: THREE.Group;
  private actors = new Map<string, RemoteActorEntry>();
  private pings: PingMeshEntry[] = [];
  private trailSystem?: TrailSystem;
  private localPlayerId: string;

  constructor(localPlayerId: string, trailSystem?: TrailSystem) {
    this.group = new THREE.Group();
    this.group.name = 'RemoteFriendAstronauts';
    this.localPlayerId = localPlayerId;
    this.trailSystem = trailSystem;
  }

  public syncSnapshot(players: RemotePlayerState[]) {
    const activeIds = new Set<string>();
    for (const p of players) {
      if (p.id === this.localPlayerId) continue;
      activeIds.add(p.id);
      this.upsertPlayer(p);
    }

    // Remove players no longer in snapshot
    Array.from(this.actors.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        this.removePlayer(id);
      }
    });
  }

  public upsertPlayer(p: RemotePlayerState) {
    if (p.id === this.localPlayerId) return;

    const existing = this.actors.get(p.id);
    if (existing) {
      // Idempotent update: guard against duplicate creation on reconnect
      existing.state = { ...existing.state, ...p };
      existing.targetPos.set(p.x, p.y, p.z);
      existing.targetRotY = p.rotationY;
      existing.model.group.visible = !p.isDrivingRover;
      const suitCfg = SUIT_COLORS.find((s) => s.id === p.suitColor) || SUIT_COLORS[0];
      existing.model.setSuitColor(suitCfg.hex, suitCfg.accent);
      existing.model.setNameTagText(p.name, 'Friend Crew');
      return;
    }

    const suitCfg = SUIT_COLORS.find((s) => s.id === p.suitColor) || SUIT_COLORS[0];
    const model = createRobloxAstronaut(suitCfg.hex, p.name, 'Friend Crew', { simplifyForNpc: true });
    model.setSuitColor(suitCfg.hex, suitCfg.accent);
    const y = Number.isFinite(p.y) && p.y !== 0 ? p.y : getMarsHeight(p.x, p.z);
    model.group.position.set(p.x, y, p.z);
    model.group.rotation.y = p.rotationY;
    model.group.visible = !p.isDrivingRover;

    this.group.add(model.group);
    this.actors.set(p.id, {
      state: { ...p },
      model,
      targetPos: new THREE.Vector3(p.x, y, p.z),
      targetRotY: p.rotationY,
      strideDist: 0,
      isLeftFoot: false,
    });
  }

  public applyMovementDelta(deltaState: Partial<RemotePlayerState> & { id: string }) {
    if (deltaState.id === this.localPlayerId) return;
    const entry = this.actors.get(deltaState.id);
    if (!entry) return;

    entry.state = { ...entry.state, ...deltaState };
    if (
      typeof deltaState.x === 'number' &&
      typeof deltaState.y === 'number' &&
      typeof deltaState.z === 'number'
    ) {
      entry.targetPos.set(deltaState.x, deltaState.y, deltaState.z);
    }
    if (typeof deltaState.rotationY === 'number') {
      entry.targetRotY = deltaState.rotationY;
    }
    if (typeof deltaState.isDrivingRover === 'boolean') {
      entry.model.group.visible = !deltaState.isDrivingRover;
    }
  }

  public updateMeta(playerId: string, name: string, suitColor: SuitColor) {
    if (playerId === this.localPlayerId) return;
    const entry = this.actors.get(playerId);
    if (!entry) return;

    entry.state.name = name;
    entry.state.suitColor = suitColor;
    const suitCfg = SUIT_COLORS.find((s) => s.id === suitColor) || SUIT_COLORS[0];
    entry.model.setSuitColor(suitCfg.hex, suitCfg.accent);
    entry.model.setNameTagText(name, 'Friend Crew');
  }

  public removePlayer(playerId: string) {
    const entry = this.actors.get(playerId);
    if (!entry) return;
    this.group.remove(entry.model.group);
    this.actors.delete(playerId);
  }

  public spawnPingBeacon(ping: PingBeaconData) {
    const beaconGroup = new THREE.Group();
    const y = getMarsHeight(ping.x, ping.z);
    beaconGroup.position.set(ping.x, y, ping.z);

    const colorHex = ping.color || '#38bdf8';

    const ringGeo = new THREE.RingGeometry(1.1, 1.5, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.08;
    beaconGroup.add(ring);

    const beamGeo = new THREE.CylinderGeometry(0.18, 0.45, 28, 12, 1, true);
    beamGeo.translate(0, 14, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beaconGroup.add(beam);

    // Floating Ping Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 88;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(8, 10, 304, 68, 16);
      ctx.fill();
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 22px "Fredoka", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`📍 ${ping.senderName}`, 160, 40);

      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = colorHex;
      ctx.fillText(ping.label, 160, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
    );
    sprite.scale.set(4.0, 1.1, 1);
    sprite.position.set(0, 4.8, 0);
    beaconGroup.add(sprite);

    this.group.add(beaconGroup);
    this.pings.push({
      group: beaconGroup,
      ring,
      expiresAt: performance.now() + 9000,
    });
  }

  public getRemotePlayersList(): RemotePlayerState[] {
    return Array.from(this.actors.values()).map((a) => ({
      ...a.state,
      x: a.model.group.position.x,
      y: a.model.group.position.y,
      z: a.model.group.position.z,
    }));
  }

  public getCount(): number {
    return this.actors.size;
  }

  public update(delta: number) {
    const smoothFactor = 1 - Math.exp(-14 * delta);

    for (const entry of this.actors.values()) {
      if (!entry.model.group.visible) continue;

      const prevX = entry.model.group.position.x;
      const prevZ = entry.model.group.position.z;

      entry.model.group.position.lerp(entry.targetPos, smoothFactor);

      const angleDiff = shortestAngleDiff(entry.model.group.rotation.y, entry.targetRotY);
      entry.model.group.rotation.y += angleDiff * smoothFactor;

      entry.model.updateAnimation(
        entry.state.speed,
        entry.state.isRunning,
        entry.state.isGrounded,
        entry.state.isJumping,
        delta,
        Boolean(entry.state.isGliding),
        entry.state.isGrounded ? 0 : -1.5,
        0
      );

      // Physics-linked Martian footprints for friends
      if (this.trailSystem && entry.state.isGrounded) {
        const moved = Math.hypot(
          entry.model.group.position.x - prevX,
          entry.model.group.position.z - prevZ
        );
        if (moved > 0.005) {
          entry.strideDist += moved;
          const stepLen = entry.state.isRunning ? 0.65 : 0.85;
          if (entry.strideDist >= stepLen) {
            entry.strideDist = 0;
            const yaw = entry.model.group.rotation.y;
            const lateral = entry.isLeftFoot ? -0.24 : 0.24;
            const footX = entry.model.group.position.x + Math.cos(yaw) * lateral;
            const footZ = entry.model.group.position.z - Math.sin(yaw) * lateral;
            const footY = getMarsHeight(footX, footZ);
            _remoteFootPos.set(footX, footY, footZ);
            this.trailSystem.addFootprint(_remoteFootPos, yaw, entry.isLeftFoot);
            entry.isLeftFoot = !entry.isLeftFoot;
          }
        }
      }
    }

    // Animate & expire Ping Beacons
    const now = performance.now();
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i];
      if (now >= p.expiresAt) {
        this.group.remove(p.group);
        p.group.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        });
        this.pings.splice(i, 1);
        continue;
      }
      const scalePulse = 1 + Math.sin(now * 0.008) * 0.25;
      p.ring.scale.set(scalePulse, scalePulse, 1);
    }
  }

  public clearAll() {
    Array.from(this.actors.keys()).forEach((id) => this.removePlayer(id));
    for (const p of this.pings) {
      this.group.remove(p.group);
    }
    this.pings = [];
  }

  public dispose() {
    this.clearAll();
  }
}
