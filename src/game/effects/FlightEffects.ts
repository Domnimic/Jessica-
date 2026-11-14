import * as THREE from 'three';

interface DustPuff {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
}

interface WingMote {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
}

/**
 * Pooled zero-GC visual particle effects for Sky-inspired flight & Mars landings:
 * 1. Radial Martian regolith dust burst on touchdown
 * 2. Luminous wingtip energy motes streaming behind the gliding astronaut
 */
export class FlightEffects {
  private scene: THREE.Scene;

  // --- Landing Dust Burst Pool ---
  private readonly dustCapacity = 96;
  private dustPool: DustPuff[] = [];
  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.PointsMaterial;
  private dustPoints: THREE.Points;
  private dustPositions: Float32Array;
  private dustColors: Float32Array;
  private dustCursor = 0;
  private activeDustCount = 0;

  // --- Wingtip Glider Trail Pool ---
  private readonly trailCapacity = 140;
  private trailPool: WingMote[] = [];
  private trailGeo: THREE.BufferGeometry;
  private trailMat: THREE.PointsMaterial;
  private trailPoints: THREE.Points;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailCursor = 0;
  private activeTrailCount = 0;
  private trailEmitAcc = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Soft radial puff sprite texture (shared procedural CanvasTexture)
    const puffTex = this.createSoftPuffTexture('rgba(235, 130, 82, 0.95)', 'rgba(180, 68, 32, 0.45)');
    const glowTex = this.createSoftPuffTexture('rgba(165, 243, 252, 1.0)', 'rgba(56, 189, 248, 0.45)');

    // 1. Setup Dust Burst
    this.dustPositions = new Float32Array(this.dustCapacity * 3);
    this.dustColors = new Float32Array(this.dustCapacity * 3);
    for (let i = 0; i < this.dustCapacity; i++) {
      this.dustPool.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.7,
      });
      this.dustPositions[i * 3 + 1] = -999;
    }

    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustGeo.setAttribute('color', new THREE.BufferAttribute(this.dustColors, 3));

    this.dustMat = new THREE.PointsMaterial({
      size: 1.35,
      map: puffTex,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPoints.frustumCulled = false;
    this.dustPoints.name = 'LandingDustParticles';
    this.scene.add(this.dustPoints);

    // 2. Setup Wingtip Glider Trails
    this.trailPositions = new Float32Array(this.trailCapacity * 3);
    this.trailColors = new Float32Array(this.trailCapacity * 3);
    for (let i = 0; i < this.trailCapacity; i++) {
      this.trailPool.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.65,
      });
      this.trailPositions[i * 3 + 1] = -999;
    }

    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    this.trailMat = new THREE.PointsMaterial({
      size: 0.72,
      map: glowTex,
      transparent: true,
      opacity: 0.92,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailPoints = new THREE.Points(this.trailGeo, this.trailMat);
    this.trailPoints.frustumCulled = false;
    this.trailPoints.name = 'WingtipLightTrails';
    this.scene.add(this.trailPoints);
  }

  private createSoftPuffTexture(innerColor: string, midColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(0.45, midColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 31, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Spawns a radial Martian red-dust ring burst when boots hit the ground.
   */
  public spawnLandingDust(x: number, y: number, z: number, impactStrength: number = 0.6) {
    const count = Math.min(28, Math.max(12, Math.round(12 + impactStrength * 16)));
    const baseSpeed = 1.6 + impactStrength * 2.4;

    for (let i = 0; i < count; i++) {
      const idx = this.dustCursor;
      this.dustCursor = (this.dustCursor + 1) % this.dustCapacity;

      const puff = this.dustPool[idx];
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const spd = baseSpeed * (0.75 + Math.random() * 0.55);

      if (!puff.active) {
        puff.active = true;
        this.activeDustCount++;
      }
      puff.x = x + Math.cos(angle) * 0.35;
      puff.y = y + 0.16;
      puff.z = z + Math.sin(angle) * 0.35;
      puff.vx = Math.cos(angle) * spd;
      puff.vy = 0.65 + Math.random() * 1.15 * impactStrength;
      puff.vz = Math.sin(angle) * spd;
      puff.age = 0;
      puff.maxAge = 0.55 + Math.random() * 0.35;
    }
  }

  /**
   * Emits Sky-like luminous energy motes from twin glider wingtips.
   */
  public emitWingtipTrails(
    delta: number,
    leftTip: THREE.Vector3,
    rightTip: THREE.Vector3,
    isFlapBurst: boolean = false
  ) {
    if (isFlapBurst) {
      // Emit bright golden-cyan burst around both tips
      for (let i = 0; i < 6; i++) {
        this.spawnMote(leftTip, true);
        this.spawnMote(rightTip, true);
      }
      return;
    }

    this.trailEmitAcc += delta;
    if (this.trailEmitAcc < 0.025) return; // ~40 Hz emission
    this.trailEmitAcc = 0;

    this.spawnMote(leftTip, false);
    this.spawnMote(rightTip, false);
  }

  private spawnMote(pos: THREE.Vector3, isBurst: boolean) {
    const idx = this.trailCursor;
    this.trailCursor = (this.trailCursor + 1) % this.trailCapacity;

    const mote = this.trailPool[idx];
    if (!mote.active) {
      mote.active = true;
      this.activeTrailCount++;
    }
    mote.x = pos.x + (Math.random() - 0.5) * 0.12;
    mote.y = pos.y + (Math.random() - 0.5) * 0.12;
    mote.z = pos.z + (Math.random() - 0.5) * 0.12;
    mote.vx = (Math.random() - 0.5) * (isBurst ? 2.4 : 0.45);
    mote.vy = isBurst ? 0.8 + Math.random() * 1.4 : (Math.random() - 0.3) * 0.35;
    mote.vz = (Math.random() - 0.5) * (isBurst ? 2.4 : 0.45);
    mote.age = 0;
    mote.maxAge = isBurst ? 0.72 : 0.52;
  }

  public update(delta: number) {
    if (this.activeDustCount === 0 && this.activeTrailCount === 0) {
      return;
    }

    if (this.activeDustCount > 0) {
      let dustDirty = false;
      for (let i = 0; i < this.dustCapacity; i++) {
        const p = this.dustPool[i];
        if (!p.active) continue;
        dustDirty = true;

        p.age += delta;
        if (p.age >= p.maxAge) {
          p.active = false;
          this.activeDustCount--;
          this.dustPositions[i * 3 + 1] = -999;
          continue;
        }

        // Air drag & Martian dust swirl lift
        const drag = Math.exp(-3.4 * delta);
        p.vx *= drag;
        p.vz *= drag;
        p.vy -= 1.2 * delta;

        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;

        const fade = 1 - p.age / p.maxAge;
        this.dustPositions[i * 3] = p.x;
        this.dustPositions[i * 3 + 1] = p.y;
        this.dustPositions[i * 3 + 2] = p.z;

        this.dustColors[i * 3] = 0.95 * fade;
        this.dustColors[i * 3 + 1] = 0.52 * fade;
        this.dustColors[i * 3 + 2] = 0.32 * fade;
      }

      if (dustDirty) {
        (this.dustGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.dustGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    if (this.activeTrailCount > 0) {
      let trailDirty = false;
      for (let i = 0; i < this.trailCapacity; i++) {
        const m = this.trailPool[i];
        if (!m.active) continue;
        trailDirty = true;

        m.age += delta;
        if (m.age >= m.maxAge) {
          m.active = false;
          this.activeTrailCount--;
          this.trailPositions[i * 3 + 1] = -999;
          continue;
        }

        m.x += m.vx * delta;
        m.y += m.vy * delta;
        m.z += m.vz * delta;

        const fade = 1 - m.age / m.maxAge;
        this.trailPositions[i * 3] = m.x;
        this.trailPositions[i * 3 + 1] = m.y;
        this.trailPositions[i * 3 + 2] = m.z;

        // Cyan-gold shimmering Sky gradient
        this.trailColors[i * 3] = 0.45 * fade + 0.35 * fade * fade;
        this.trailColors[i * 3 + 1] = 0.92 * fade;
        this.trailColors[i * 3 + 2] = 1.0 * fade;
      }

      if (trailDirty) {
        (this.trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.trailGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }
  }

  public dispose() {
    this.dustGeo.dispose();
    this.dustMat.map?.dispose();
    this.dustMat.dispose();
    this.scene.remove(this.dustPoints);

    this.trailGeo.dispose();
    this.trailMat.map?.dispose();
    this.trailMat.dispose();
    this.scene.remove(this.trailPoints);
  }
}
