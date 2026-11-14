import * as THREE from 'three';
import { getMarsHeight } from '../terrain';

interface Footprint {
  active: boolean;
  pos: THREE.Vector3;
  heading: number;
  isLeft: boolean;
  age: number;
  maxAge: number;
  size: number;
}

interface TireTrack {
  active: boolean;
  pos: THREE.Vector3;
  heading: number;
  age: number;
  maxAge: number;
  width: number;
  length: number;
}

export class TrailSystem {
  private scene: THREE.Scene;

  // Maximum trail capacities (ring buffers for zero-GC)
  private readonly maxFootprints = 160;
  private readonly maxTracks = 220;

  // Footprint dynamic mesh
  private footprintMesh: THREE.Mesh;
  private footprintGeo: THREE.BufferGeometry;
  private footprintPositions: Float32Array;
  private footprintNormals: Float32Array;
  private footprintUvs: Float32Array;
  private footprintColors: Float32Array;
  private footprintIndices: Uint16Array;
  private footprintList: Footprint[] = [];
  private footprintCount = 0;

  // Tire track dynamic mesh
  private trackMesh: THREE.Mesh;
  private trackGeo: THREE.BufferGeometry;
  private trackPositions: Float32Array;
  private trackNormals: Float32Array;
  private trackUvs: Float32Array;
  private trackColors: Float32Array;
  private trackIndices: Uint16Array;
  private trackList: TireTrack[] = [];
  private trackCount = 0;

  // Textures and Materials
  private footprintTex: THREE.CanvasTexture;
  private trackTex: THREE.CanvasTexture;
  private footprintMat: THREE.MeshBasicMaterial;
  private trackMat: THREE.MeshBasicMaterial;

  // Stride tracking state
  private lastPlayerPos = new THREE.Vector3();
  private playerFootDist = 0;
  private nextFootLeft = true;

  // Rover distance tracking state
  private lastRoverPos = new THREE.Vector3();
  private roverTrackDist = 0;

  // Environmental fade multiplier
  private stormIntensity = 0;

  // Reusable math vectors to prevent GC
  private _normal = new THREE.Vector3();
  private _forward = new THREE.Vector3();
  private _tangent = new THREE.Vector3();
  private _bitangent = new THREE.Vector3();
  private _corner = new THREE.Vector3();
  private _center = new THREE.Vector3();
  private _footPos = new THREE.Vector3();
  private _trackPos = new THREE.Vector3();
  private footprintHighWater = 0;
  private trackHighWater = 0;
  private activeFootprintCount = 0;
  private activeTrackCount = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Procedural Textures
    this.footprintTex = this.createFootprintTexture();
    this.trackTex = this.createRoverTrackTexture();

    // 2. Materials with polygonOffset to guarantee zero Z-fighting with terrain
    this.footprintMat = new THREE.MeshBasicMaterial({
      map: this.footprintTex,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      blending: THREE.NormalBlending,
    });

    this.trackMat = new THREE.MeshBasicMaterial({
      map: this.trackTex,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      blending: THREE.NormalBlending,
    });

    // 3. Initialize Geometry Buffers for Footprints (Quads: 4 vertices, 6 indices per footprint)
    const fpVerts = this.maxFootprints * 4;
    this.footprintPositions = new Float32Array(fpVerts * 3);
    this.footprintNormals = new Float32Array(fpVerts * 3);
    this.footprintUvs = new Float32Array(fpVerts * 2);
    this.footprintColors = new Float32Array(fpVerts * 4); // RGBA per vertex
    this.footprintIndices = new Uint16Array(this.maxFootprints * 6);

    for (let i = 0; i < this.maxFootprints; i++) {
      const vIdx = i * 4;
      const iIdx = i * 6;
      this.footprintIndices[iIdx] = vIdx;
      this.footprintIndices[iIdx + 1] = vIdx + 1;
      this.footprintIndices[iIdx + 2] = vIdx + 2;
      this.footprintIndices[iIdx + 3] = vIdx;
      this.footprintIndices[iIdx + 4] = vIdx + 2;
      this.footprintIndices[iIdx + 5] = vIdx + 3;

      // Base UVs
      this.footprintUvs[vIdx * 2] = 0;
      this.footprintUvs[vIdx * 2 + 1] = 0;
      this.footprintUvs[(vIdx + 1) * 2] = 1;
      this.footprintUvs[(vIdx + 1) * 2 + 1] = 0;
      this.footprintUvs[(vIdx + 2) * 2] = 1;
      this.footprintUvs[(vIdx + 2) * 2 + 1] = 1;
      this.footprintUvs[(vIdx + 3) * 2] = 0;
      this.footprintUvs[(vIdx + 3) * 2 + 1] = 1;

      this.footprintList.push({
        active: false,
        pos: new THREE.Vector3(),
        heading: 0,
        isLeft: true,
        age: 0,
        maxAge: 25,
        size: 0.45,
      });
    }

    this.footprintGeo = new THREE.BufferGeometry();
    this.footprintGeo.setAttribute('position', new THREE.BufferAttribute(this.footprintPositions, 3));
    this.footprintGeo.setAttribute('normal', new THREE.BufferAttribute(this.footprintNormals, 3));
    this.footprintGeo.setAttribute('uv', new THREE.BufferAttribute(this.footprintUvs, 2));
    this.footprintGeo.setAttribute('color', new THREE.BufferAttribute(this.footprintColors, 4));
    this.footprintGeo.setIndex(new THREE.BufferAttribute(this.footprintIndices, 1));
    this.footprintGeo.setDrawRange(0, 0);

    this.footprintMesh = new THREE.Mesh(this.footprintGeo, this.footprintMat);
    this.footprintMesh.frustumCulled = false;
    this.footprintMesh.name = 'AstronautFootprints';
    this.scene.add(this.footprintMesh);

    // 4. Initialize Geometry Buffers for Rover Tracks
    const trVerts = this.maxTracks * 4;
    this.trackPositions = new Float32Array(trVerts * 3);
    this.trackNormals = new Float32Array(trVerts * 3);
    this.trackUvs = new Float32Array(trVerts * 2);
    this.trackColors = new Float32Array(trVerts * 4);
    this.trackIndices = new Uint16Array(this.maxTracks * 6);

    for (let i = 0; i < this.maxTracks; i++) {
      const vIdx = i * 4;
      const iIdx = i * 6;
      this.trackIndices[iIdx] = vIdx;
      this.trackIndices[iIdx + 1] = vIdx + 1;
      this.trackIndices[iIdx + 2] = vIdx + 2;
      this.trackIndices[iIdx + 3] = vIdx;
      this.trackIndices[iIdx + 4] = vIdx + 2;
      this.trackIndices[iIdx + 5] = vIdx + 3;

      this.trackUvs[vIdx * 2] = 0;
      this.trackUvs[vIdx * 2 + 1] = 0;
      this.trackUvs[(vIdx + 1) * 2] = 1;
      this.trackUvs[(vIdx + 1) * 2 + 1] = 0;
      this.trackUvs[(vIdx + 2) * 2] = 1;
      this.trackUvs[(vIdx + 2) * 2 + 1] = 1;
      this.trackUvs[(vIdx + 3) * 2] = 0;
      this.trackUvs[(vIdx + 3) * 2 + 1] = 1;

      this.trackList.push({
        active: false,
        pos: new THREE.Vector3(),
        heading: 0,
        age: 0,
        maxAge: 30,
        width: 0.42,
        length: 0.65,
      });
    }

    this.trackGeo = new THREE.BufferGeometry();
    this.trackGeo.setAttribute('position', new THREE.BufferAttribute(this.trackPositions, 3));
    this.trackGeo.setAttribute('normal', new THREE.BufferAttribute(this.trackNormals, 3));
    this.trackGeo.setAttribute('uv', new THREE.BufferAttribute(this.trackUvs, 2));
    this.trackGeo.setAttribute('color', new THREE.BufferAttribute(this.trackColors, 4));
    this.trackGeo.setIndex(new THREE.BufferAttribute(this.trackIndices, 1));
    this.trackGeo.setDrawRange(0, 0);

    this.trackMesh = new THREE.Mesh(this.trackGeo, this.trackMat);
    this.trackMesh.frustumCulled = false;
    this.trackMesh.name = 'RoverTireTracks';
    this.scene.add(this.trackMesh);
  }

  // Throttle timer for GPU color buffer uploads (20 Hz)
  private fadeThrottleTimer: number = 0;

  /**
   * Procedurally generates a photorealistic Martian astronaut spacesuit boot print.
   * Features grooved ridges, heel indentation, and compressed dark-red regolith tone.
   */
  private createFootprintTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, 128, 256);

      // Boot sole outline (dark indented compressed Martian soil)
      // Front ball of foot
      ctx.fillStyle = 'rgba(75, 20, 10, 0.9)';
      ctx.beginPath();
      ctx.ellipse(64, 85, 42, 65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heel indentation
      ctx.beginPath();
      ctx.ellipse(64, 195, 34, 42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Arch connector
      ctx.beginPath();
      ctx.ellipse(64, 140, 26, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // NASA-style transverse chevron tread grooves (deeper pressed ridges)
      ctx.strokeStyle = 'rgba(35, 8, 4, 0.95)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      // Forefoot ribs
      for (let y = 40; y <= 130; y += 14) {
        ctx.beginPath();
        ctx.moveTo(34, y - 4);
        ctx.lineTo(64, y + 5);
        ctx.lineTo(94, y - 4);
        ctx.stroke();
      }

      // Heel ribs
      for (let y = 172; y <= 224; y += 14) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(88, y);
        ctx.stroke();
      }

      // Perimeter bevel (loose displaced dust rim)
      ctx.strokeStyle = 'rgba(180, 70, 30, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(64, 85, 44, 67, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(64, 195, 36, 44, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Procedurally generates a Curiosity/Perseverance chevron ribbed tire track texture.
   */
  private createRoverTrackTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);

      // Deep compressed soil track strip
      ctx.fillStyle = 'rgba(70, 18, 8, 0.92)';
      ctx.fillRect(16, 0, 96, 128);

      // Raised central tire channel
      ctx.fillStyle = 'rgba(45, 10, 5, 0.95)';
      ctx.fillRect(58, 0, 12, 128);

      // Distinctive Curiosity chevron / morse-code lugs
      ctx.fillStyle = 'rgba(28, 6, 2, 0.98)';
      for (let y = 0; y < 128; y += 22) {
        // Left chevron
        ctx.beginPath();
        ctx.moveTo(22, y + 2);
        ctx.lineTo(54, y + 14);
        ctx.lineTo(54, y + 8);
        ctx.lineTo(22, y - 4);
        ctx.closePath();
        ctx.fill();

        // Right chevron
        ctx.beginPath();
        ctx.moveTo(106, y + 2);
        ctx.lineTo(74, y + 14);
        ctx.lineTo(74, y + 8);
        ctx.lineTo(106, y - 4);
        ctx.closePath();
        ctx.fill();
      }

      // Outer displaced Martian dust ridges
      ctx.fillStyle = 'rgba(195, 75, 30, 0.45)';
      ctx.fillRect(12, 0, 4, 128);
      ctx.fillRect(112, 0, 4, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Computes the terrain surface normal vector at (x, z).
   */
  private computeTerrainNormal(x: number, z: number, outNormal: THREE.Vector3) {
    const eps = 0.25;
    const hL = getMarsHeight(x - eps, z);
    const hR = getMarsHeight(x + eps, z);
    const hD = getMarsHeight(x, z - eps);
    const hU = getMarsHeight(x, z + eps);

    // dx = (2*eps, hR - hL, 0)
    // dz = (0, hU - hD, 2*eps)
    outNormal.set((hL - hR) / (2 * eps), 1.0, (hD - hU) / (2 * eps)).normalize();
  }

  /**
   * Sets the storm intensity multiplier (dust storm accelerates track fading).
   */
  public setStormIntensity(intensity: number) {
    this.stormIntensity = intensity;
  }

  /**
   * Spawns an astronaut footprint at the specified ground location and heading.
   */
  public addFootprint(pos: THREE.Vector3, heading: number, isLeft: boolean) {
    // Find an inactive slot, or recycle the oldest
    let index = -1;
    let oldestAge = -1;
    let oldestIndex = 0;

    for (let i = 0; i < this.maxFootprints; i++) {
      if (!this.footprintList[i].active) {
        index = i;
        break;
      }
      if (this.footprintList[i].age > oldestAge) {
        oldestAge = this.footprintList[i].age;
        oldestIndex = i;
      }
    }

    if (index === -1) {
      index = oldestIndex;
    }

    const fp = this.footprintList[index];
    if (!fp.active) {
      fp.active = true;
      this.activeFootprintCount++;
    }
    fp.pos.copy(pos);
    fp.heading = heading;
    fp.isLeft = isLeft;
    fp.age = 0;
    fp.maxAge = 24.0; // Footprints last 24 seconds in calm weather
    fp.size = 0.44;

    if (index + 1 > this.footprintHighWater) {
      this.footprintHighWater = index + 1;
      this.footprintGeo.setDrawRange(0, this.footprintHighWater * 6);
    }

    this.rebuildFootprintQuad(index);
  }

  /**
   * Spawns a rover tire track segment at the specified wheel ground contact position.
   */
  public addTireTrack(pos: THREE.Vector3, heading: number, width: number = 0.38, length: number = 0.55) {
    let index = -1;
    let oldestAge = -1;
    let oldestIndex = 0;

    for (let i = 0; i < this.maxTracks; i++) {
      if (!this.trackList[i].active) {
        index = i;
        break;
      }
      if (this.trackList[i].age > oldestAge) {
        oldestAge = this.trackList[i].age;
        oldestIndex = i;
      }
    }

    if (index === -1) {
      index = oldestIndex;
    }

    const tr = this.trackList[index];
    if (!tr.active) {
      tr.active = true;
      this.activeTrackCount++;
    }
    tr.pos.copy(pos);
    tr.heading = heading;
    tr.age = 0;
    tr.maxAge = 32.0; // Rover tracks last 32 seconds in calm weather
    tr.width = width;
    tr.length = length;

    if (index + 1 > this.trackHighWater) {
      this.trackHighWater = index + 1;
      this.trackGeo.setDrawRange(0, this.trackHighWater * 6);
    }

    this.rebuildTrackQuad(index);
  }

  /**
   * Rebuilds the 4 quad vertices for a footprint, adhering cleanly to the terrain slope.
   */
  private rebuildFootprintQuad(i: number) {
    const fp = this.footprintList[i];
    const vOffset = i * 4;

    // 1. Terrain normal at foot contact point
    this.computeTerrainNormal(fp.pos.x, fp.pos.z, this._normal);

    // 2. Forward heading vector
    this._forward.set(Math.sin(fp.heading), 0, Math.cos(fp.heading));

    // 3. Project forward onto the terrain tangent plane
    this._tangent.copy(this._forward).addScaledVector(this._normal, -this._forward.dot(this._normal)).normalize();

    // 4. Lateral bitangent vector (orthogonal on terrain slope)
    this._bitangent.crossVectors(this._normal, this._tangent).normalize();

    // Half dimensions
    const hw = 0.16; // width: 0.32m
    const hl = 0.25; // length: 0.50m
    const groundElevationOffset = 0.025; // float slightly above terrain to prevent coplanar z-fighting

    this._center.copy(fp.pos).addScaledVector(this._normal, groundElevationOffset);

    // Write 4 quad vertices directly without allocating arrays or Vector3s
    for (let c = 0; c < 4; c++) {
      const signB = c === 1 || c === 2 ? hw : -hw;
      const signT = c >= 2 ? hl : -hl;
      this._corner
        .copy(this._center)
        .addScaledVector(this._bitangent, signB)
        .addScaledVector(this._tangent, signT);

      const idx = (vOffset + c) * 3;
      this.footprintPositions[idx] = this._corner.x;
      this.footprintPositions[idx + 1] = this._corner.y;
      this.footprintPositions[idx + 2] = this._corner.z;

      this.footprintNormals[idx] = this._normal.x;
      this.footprintNormals[idx + 1] = this._normal.y;
      this.footprintNormals[idx + 2] = this._normal.z;
    }

    // Mirror UV horizontally if right foot for true anatomic spacesuit sole read
    const uvBase = vOffset * 2;
    if (fp.isLeft) {
      this.footprintUvs[uvBase] = 0;
      this.footprintUvs[uvBase + 1] = 0;
      this.footprintUvs[uvBase + 2] = 1;
      this.footprintUvs[uvBase + 3] = 0;
      this.footprintUvs[uvBase + 4] = 1;
      this.footprintUvs[uvBase + 5] = 1;
      this.footprintUvs[uvBase + 6] = 0;
      this.footprintUvs[uvBase + 7] = 1;
    } else {
      this.footprintUvs[uvBase] = 1;
      this.footprintUvs[uvBase + 1] = 0;
      this.footprintUvs[uvBase + 2] = 0;
      this.footprintUvs[uvBase + 3] = 0;
      this.footprintUvs[uvBase + 4] = 0;
      this.footprintUvs[uvBase + 5] = 1;
      this.footprintUvs[uvBase + 6] = 1;
      this.footprintUvs[uvBase + 7] = 1;
    }

    // Initial full opacity
    this.updateFootprintAlpha(i, 1.0);

    (this.footprintGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.footprintGeo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (this.footprintGeo.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
    (this.footprintGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Rebuilds the 4 quad vertices for a rover tire track segment.
   */
  private rebuildTrackQuad(i: number) {
    const tr = this.trackList[i];
    const vOffset = i * 4;

    this.computeTerrainNormal(tr.pos.x, tr.pos.z, this._normal);
    this._forward.set(Math.sin(tr.heading), 0, Math.cos(tr.heading));
    this._tangent.copy(this._forward).addScaledVector(this._normal, -this._forward.dot(this._normal)).normalize();
    this._bitangent.crossVectors(this._normal, this._tangent).normalize();

    const hw = tr.width * 0.5;
    const hl = tr.length * 0.5;
    const groundElevationOffset = 0.022;

    this._center.copy(tr.pos).addScaledVector(this._normal, groundElevationOffset);

    for (let c = 0; c < 4; c++) {
      const signB = c === 1 || c === 2 ? hw : -hw;
      const signT = c >= 2 ? hl : -hl;
      this._corner
        .copy(this._center)
        .addScaledVector(this._bitangent, signB)
        .addScaledVector(this._tangent, signT);

      const idx = (vOffset + c) * 3;
      this.trackPositions[idx] = this._corner.x;
      this.trackPositions[idx + 1] = this._corner.y;
      this.trackPositions[idx + 2] = this._corner.z;

      this.trackNormals[idx] = this._normal.x;
      this.trackNormals[idx + 1] = this._normal.y;
      this.trackNormals[idx + 2] = this._normal.z;
    }

    this.updateTrackAlpha(i, 1.0);

    (this.trackGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trackGeo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (this.trackGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Updates vertex colors and alpha for a footprint.
   */
  private updateFootprintAlpha(i: number, alpha: number) {
    const vOffset = i * 4;
    // Dark pressed basalt regolith tint: RGB (0.35, 0.12, 0.08) modulated by alpha
    for (let c = 0; c < 4; c++) {
      const cIdx = (vOffset + c) * 4;
      this.footprintColors[cIdx] = 1.0;
      this.footprintColors[cIdx + 1] = 1.0;
      this.footprintColors[cIdx + 2] = 1.0;
      this.footprintColors[cIdx + 3] = alpha;
    }
  }

  /**
   * Updates vertex colors and alpha for a tire track.
   */
  private updateTrackAlpha(i: number, alpha: number) {
    const vOffset = i * 4;
    for (let c = 0; c < 4; c++) {
      const cIdx = (vOffset + c) * 4;
      this.trackColors[cIdx] = 1.0;
      this.trackColors[cIdx + 1] = 1.0;
      this.trackColors[cIdx + 2] = 1.0;
      this.trackColors[cIdx + 3] = alpha;
    }
  }

  /**
   * Frame-by-frame update: fades active trails over time and updates GPU buffers at throttled 20 Hz.
   */
  public update(delta: number) {
    if (this.activeFootprintCount === 0 && this.activeTrackCount === 0) {
      return;
    }

    // Storm wind speeds up fading (red dust deposition)
    const fadeMultiplier = 1.0 + this.stormIntensity * 2.8;

    this.fadeThrottleTimer += delta;
    const shouldUpdateGpuBuffers = this.fadeThrottleTimer >= 0.05;
    if (shouldUpdateGpuBuffers) {
      this.fadeThrottleTimer = 0;
    }

    let fpNeedsColorUpdate = false;

    // 1. Update Footprints (bounded to active high-water mark)
    if (this.activeFootprintCount > 0) {
      for (let i = 0; i < this.footprintHighWater; i++) {
        const fp = this.footprintList[i];
        if (!fp.active) continue;

        fp.age += delta * fadeMultiplier;

        if (fp.age >= fp.maxAge) {
          fp.active = false;
          this.activeFootprintCount--;
          this.updateFootprintAlpha(i, 0);
          fpNeedsColorUpdate = true;
        } else if (shouldUpdateGpuBuffers) {
          const progress = fp.age / fp.maxAge;
          const alpha = Math.max(0, 1.0 - Math.pow(progress, 1.35));
          this.updateFootprintAlpha(i, alpha);
          fpNeedsColorUpdate = true;
        }
      }

      if (fpNeedsColorUpdate && (shouldUpdateGpuBuffers || this.activeFootprintCount === 0)) {
        // ONLY update colors array; positions and UVs are static and already uploaded
        (this.footprintGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 2. Update Tire Tracks (bounded to active high-water mark)
    if (this.activeTrackCount > 0) {
      let trackNeedsColorUpdate = false;

      for (let i = 0; i < this.trackHighWater; i++) {
        const tr = this.trackList[i];
        if (!tr.active) continue;

        tr.age += delta * fadeMultiplier;

        if (tr.age >= tr.maxAge) {
          tr.active = false;
          this.activeTrackCount--;
          this.updateTrackAlpha(i, 0);
          trackNeedsColorUpdate = true;
        } else if (shouldUpdateGpuBuffers) {
          const progress = tr.age / tr.maxAge;
          const alpha = Math.max(0, 1.0 - Math.pow(progress, 1.35));
          this.updateTrackAlpha(i, alpha);
          trackNeedsColorUpdate = true;
        }
      }

      if (trackNeedsColorUpdate && (shouldUpdateGpuBuffers || this.activeTrackCount === 0)) {
        (this.trackGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }
  }

  /**
   * Tracks astronaut ground movement and places footprints at the correct stride cadence.
   */
  public updatePlayerStride(
    playerPos: THREE.Vector3,
    heading: number,
    currentSpeed: number,
    isGrounded: boolean,
    isRunning: boolean
  ) {
    if (!isGrounded || currentSpeed < 0.3) {
      this.lastPlayerPos.copy(playerPos);
      return;
    }

    const distMoved = Math.hypot(playerPos.x - this.lastPlayerPos.x, playerPos.z - this.lastPlayerPos.z);
    this.lastPlayerPos.copy(playerPos);

    if (distMoved <= 0.001 || distMoved > 10) return; // Ignore teleport/respawn

    this.playerFootDist += distMoved;

    // Stride length: ~0.8m walking, ~1.15m sprinting
    const strideLength = isRunning ? 1.15 : 0.82;

    if (this.playerFootDist >= strideLength) {
      this.playerFootDist = 0;

      // Lateral boot offset (-0.24m for left boot, +0.24m for right boot)
      const lateralOffset = this.nextFootLeft ? -0.24 : 0.24;

      const footX = playerPos.x + Math.cos(heading) * lateralOffset;
      const footZ = playerPos.z - Math.sin(heading) * lateralOffset;
      const footY = getMarsHeight(footX, footZ);

      this._footPos.set(footX, footY, footZ);
      this.addFootprint(this._footPos, heading, this.nextFootLeft);

      // Alternate foot for next step
      this.nextFootLeft = !this.nextFootLeft;
    }
  }

  /**
   * Tracks rover wheels and places parallel tire tracks while driving.
   */
  public updateRoverTracks(
    roverPos: { x: number; y: number; z: number },
    roverRotationY: number,
    isDriving: boolean
  ) {
    if (!isDriving) {
      this.lastRoverPos.set(roverPos.x, roverPos.y, roverPos.z);
      return;
    }

    const distDriven = Math.hypot(roverPos.x - this.lastRoverPos.x, roverPos.z - this.lastRoverPos.z);
    this.lastRoverPos.set(roverPos.x, roverPos.y, roverPos.z);

    if (distDriven <= 0.001 || distDriven > 10) return;

    this.roverTrackDist += distDriven;

    // Place a tire track segment every ~0.48m
    if (this.roverTrackDist >= 0.48) {
      this.roverTrackDist = 0;

      // The Curiosity rover chassis has left wheels at local X = -1.35 and right wheels at local X = +1.35
      const cosR = Math.cos(roverRotationY);
      const sinR = Math.sin(roverRotationY);

      // Left wheel ground track
      const leftTrackX = roverPos.x + cosR * (-1.35);
      const leftTrackZ = roverPos.z - sinR * (-1.35);
      const leftTrackY = getMarsHeight(leftTrackX, leftTrackZ);
      this._trackPos.set(leftTrackX, leftTrackY, leftTrackZ);
      this.addTireTrack(this._trackPos, roverRotationY, 0.40, 0.65);

      // Right wheel ground track
      const rightTrackX = roverPos.x + cosR * (1.35);
      const rightTrackZ = roverPos.z - sinR * (1.35);
      const rightTrackY = getMarsHeight(rightTrackX, rightTrackZ);
      this._trackPos.set(rightTrackX, rightTrackY, rightTrackZ);
      this.addTireTrack(this._trackPos, roverRotationY, 0.40, 0.65);
    }
  }

  /**
   * Clean disposal of Three.js geometries and materials.
   */
  public dispose() {
    this.footprintGeo.dispose();
    this.footprintMat.dispose();
    this.footprintTex.dispose();
    this.scene.remove(this.footprintMesh);

    this.trackGeo.dispose();
    this.trackMat.dispose();
    this.trackTex.dispose();
    this.scene.remove(this.trackMesh);
  }
}
