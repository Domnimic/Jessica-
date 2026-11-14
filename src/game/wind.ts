import * as THREE from 'three';
import { WindData } from '../types/game';

const CARDINALS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

function angleToCardinal(angleRad: number): string {
  // World convention: 0 = +Z (South), PI/2 = +X (East), PI = -Z (North), -PI/2 = -X (West)
  const norm = ((angleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.round(norm / (Math.PI / 4)) % 8;
  return CARDINALS[idx];
}

export class WindSystem {
  private scene: THREE.Scene;
  private angleRad: number = 1.15; // Initial gentle breeze blowing roughly ENE
  private targetAngleRad: number = 1.15;
  private baseSpeed: number = 4.6; // m/s ambient Martian wind
  private currentSpeed: number = 4.6;
  private elapsed: number = 0;
  private nextShiftTime: number = 22;

  // 3D Wind Streamlines (lightweight pooled line segments centered around player)
  private readonly streakCount: number;
  private streakGeo: THREE.BufferGeometry;
  private streakMat: THREE.LineBasicMaterial;
  private streakLines: THREE.LineSegments;
  private streakPositions: Float32Array;
  private streakAnchors: Float32Array; // local offsets (x, y, z, speedFactor)

  private uiThrottle: number = 0;
  private lastWindSpeed: number = -1;
  private lastWindAngle: number = -999;
  private lastWindRel: string = '';
  private lastWindGusting: boolean | null = null;
  private onWindUpdate?: (wind: WindData) => void;

  constructor(scene: THREE.Scene, onWindUpdate?: (wind: WindData) => void, streakCount: number = 110) {
    this.scene = scene;
    this.onWindUpdate = onWindUpdate;
    this.streakCount = streakCount;

    // Initialize pooled wind streak LineSegments (2 vertices per streak)
    this.streakPositions = new Float32Array(this.streakCount * 6);
    this.streakAnchors = new Float32Array(this.streakCount * 4);

    for (let i = 0; i < this.streakCount; i++) {
      this.streakAnchors[i * 4] = (Math.random() - 0.5) * 90;
      this.streakAnchors[i * 4 + 1] = 1.5 + Math.random() * 24;
      this.streakAnchors[i * 4 + 2] = (Math.random() - 0.5) * 90;
      this.streakAnchors[i * 4 + 3] = 0.75 + Math.random() * 0.65;
    }

    this.streakGeo = new THREE.BufferGeometry();
    this.streakGeo.setAttribute('position', new THREE.BufferAttribute(this.streakPositions, 3));

    this.streakMat = new THREE.LineBasicMaterial({
      color: 0xffd2a6,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    this.streakLines = new THREE.LineSegments(this.streakGeo, this.streakMat);
    this.streakLines.frustumCulled = false;
    this.streakLines.name = 'MartianWindStreaks';
    this.scene.add(this.streakLines);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerHeading: number,
    stormIntensity: number,
    isGliding: boolean
  ) {
    this.elapsed += delta;

    // Periodically shift ambient wind direction subtly
    if (this.elapsed >= this.nextShiftTime) {
      this.nextShiftTime = this.elapsed + 18 + Math.random() * 16;
      const shift = (Math.random() - 0.5) * 1.4;
      this.targetAngleRad += shift;
      this.baseSpeed = 3.5 + Math.random() * 3.8;
    }

    // During a dust storm, wind aligns strongly toward East-Southeast (~1.18 rad) & accelerates
    const stormTargetAngle = 1.18;
    const effectiveTargetAngle =
      stormIntensity > 0.2
        ? THREE.MathUtils.lerp(this.targetAngleRad, stormTargetAngle, stormIntensity)
        : this.targetAngleRad;

    this.angleRad = THREE.MathUtils.damp(this.angleRad, effectiveTargetAngle, 0.8, delta);

    const gustWave = Math.sin(this.elapsed * 0.9) * 0.9 + Math.sin(this.elapsed * 2.3) * 0.45;
    const stormBonus = stormIntensity * 9.5;
    const targetSpeed = Math.max(1.8, this.baseSpeed + gustWave + stormBonus);
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed, 2.5, delta);

    const dirX = Math.sin(this.angleRad);
    const dirZ = Math.cos(this.angleRad);

    // Update 3D wind streak lines flowing smoothly in wind direction around player
    const speedVis = this.currentSpeed * (1.2 + stormIntensity * 0.8);
    const streakLen = Math.min(4.8, 1.4 + this.currentSpeed * 0.22);
    const bound = 45;

    this.streakLines.position.set(playerPos.x, 0, playerPos.z);
    this.streakMat.opacity = isGliding
      ? Math.min(0.62, 0.34 + stormIntensity * 0.28)
      : Math.min(0.45, 0.16 + stormIntensity * 0.32);

    for (let i = 0; i < this.streakCount; i++) {
      const aIdx = i * 4;
      const pIdx = i * 6;
      const factor = this.streakAnchors[aIdx + 3];

      let lx = this.streakAnchors[aIdx] + dirX * speedVis * factor * delta;
      let ly = this.streakAnchors[aIdx + 1] + Math.sin(this.elapsed * 1.5 + i) * 0.2 * delta;
      let lz = this.streakAnchors[aIdx + 2] + dirZ * speedVis * factor * delta;

      if (lx > bound) lx -= bound * 2;
      else if (lx < -bound) lx += bound * 2;
      if (lz > bound) lz -= bound * 2;
      else if (lz < -bound) lz += bound * 2;
      if (ly < 1.2) ly = 24;
      else if (ly > 26) ly = 1.5;

      this.streakAnchors[aIdx] = lx;
      this.streakAnchors[aIdx + 1] = ly;
      this.streakAnchors[aIdx + 2] = lz;

      this.streakPositions[pIdx] = lx;
      this.streakPositions[pIdx + 1] = ly;
      this.streakPositions[pIdx + 2] = lz;

      this.streakPositions[pIdx + 3] = lx - dirX * streakLen * factor;
      this.streakPositions[pIdx + 4] = ly;
      this.streakPositions[pIdx + 5] = lz - dirZ * streakLen * factor;
    }
    (this.streakGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Emit HUD WindData at 5 Hz only when displayed values change
    this.uiThrottle += delta;
    if (this.uiThrottle >= 0.2 && this.onWindUpdate) {
      this.uiThrottle = 0;
      const faceX = Math.sin(playerHeading);
      const faceZ = Math.cos(playerHeading);
      const dot = dirX * faceX + dirZ * faceZ;

      let relativeLabel: WindData['relativeLabel'] = 'CROSSWIND';
      if (this.currentSpeed < 2.2) relativeLabel = 'CALM';
      else if (dot > 0.45) relativeLabel = 'TAILWIND';
      else if (dot < -0.45) relativeLabel = 'HEADWIND';

      const roundedSpeed = Number(this.currentSpeed.toFixed(1));
      const gusting = this.currentSpeed > 8.5 || gustWave > 0.9;
      if (
        roundedSpeed !== this.lastWindSpeed ||
        relativeLabel !== this.lastWindRel ||
        gusting !== this.lastWindGusting ||
        Math.abs(this.angleRad - this.lastWindAngle) > 0.04
      ) {
        this.lastWindSpeed = roundedSpeed;
        this.lastWindRel = relativeLabel;
        this.lastWindGusting = gusting;
        this.lastWindAngle = this.angleRad;
        this.onWindUpdate({
          angleRad: this.angleRad,
          cardinal: angleToCardinal(this.angleRad),
          speedMps: roundedSpeed,
          gusting,
          relativeLabel,
        });
      }
    }
  }

  /**
   * Computes the horizontal wind velocity vector (m/s) acting on a gliding astronaut.
   * Tailwinds boost speed & give slight thermal lift; crosswinds curve trajectory smoothly.
   */
  public getAirborneWindPush(outVec: THREE.Vector3, isGliding: boolean): { windLift: number } {
    const dirX = Math.sin(this.angleRad);
    const dirZ = Math.cos(this.angleRad);
    // Gliding wings catch far more Martian wind than compact free-fall
    const coupling = isGliding ? 0.58 : 0.14;
    outVec.set(dirX * this.currentSpeed * coupling, 0, dirZ * this.currentSpeed * coupling);
    // Gentle thermal updraft during gusts when gliding
    const windLift = isGliding ? Math.max(0, (this.currentSpeed - 4.0) * 0.08) : 0;
    return { windLift };
  }

  public getWindAngleRad(): number {
    return this.angleRad;
  }

  public getWindSpeed(): number {
    return this.currentSpeed;
  }

  public dispose() {
    this.streakGeo.dispose();
    this.streakMat.dispose();
    this.scene.remove(this.streakLines);
  }
}
