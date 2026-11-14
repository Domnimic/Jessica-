import * as THREE from 'three';
import { getMarsHeight } from './terrain';
import { INITIAL_HISTORY_TABLETS } from '../data/marsHistory';

export interface RockColliderInfo {
  x: number;
  y: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
  walkableTop: boolean;
}

export interface MarsEnvironmentAssets {
  skyDome: THREE.Mesh;
  horizonRidge: THREE.Mesh;
  instancedRocks: THREE.InstancedMesh;
  rockColliders: RockColliderInfo[];
  dustParticles: THREE.Points;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  phobos: THREE.Mesh;
  deimos: THREE.Mesh;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Creates the Mars atmospheric sky dome with deep cosmic nebula band, twilight horizon, and solar halo.
 */
function createMarsSky(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich Mars sky: deep cosmic umber-indigo at zenith transitioning through rust crimson to warm amber horizon
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#140912');
    grad.addColorStop(0.22, '#351214');
    grad.addColorStop(0.45, '#742516');
    grad.addColorStop(0.68, '#be4b25');
    grad.addColorStop(0.86, '#df6932');
    grad.addColorStop(1.0, '#c85528');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle cosmic Milky Way dust ribbon curving across the upper sky
    ctx.save();
    ctx.translate(512, 145);
    ctx.rotate(-0.18);
    const nebulaGrad = ctx.createLinearGradient(-520, -45, 520, 45);
    nebulaGrad.addColorStop(0, 'rgba(130, 95, 165, 0)');
    nebulaGrad.addColorStop(0.3, 'rgba(165, 115, 155, 0.14)');
    nebulaGrad.addColorStop(0.55, 'rgba(235, 155, 125, 0.18)');
    nebulaGrad.addColorStop(0.8, 'rgba(145, 110, 175, 0.12)');
    nebulaGrad.addColorStop(1, 'rgba(130, 95, 165, 0)');
    ctx.fillStyle = nebulaGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 520, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Warm Martian atmospheric solar glow near horizon azimuth
    const sunGlow = ctx.createRadialGradient(260, 290, 8, 260, 290, 175);
    sunGlow.addColorStop(0, 'rgba(255, 240, 200, 0.55)');
    sunGlow.addColorStop(0.25, 'rgba(255, 185, 110, 0.28)');
    sunGlow.addColorStop(0.65, 'rgba(225, 105, 55, 0.12)');
    sunGlow.addColorStop(1, 'rgba(225, 105, 55, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(80, 110, 360, 320);

    // Multi-size faint stars scattered across the upper Martian sky
    for (let i = 0; i < 420; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 255;
      const sRadius = Math.random() < 0.12 ? 1.7 : Math.random() * 1.1 + 0.35;
      const alpha = Math.random() * 0.72 + 0.18;
      const tint =
        Math.random() > 0.78
          ? `rgba(195, 225, 255, ${alpha})`
          : Math.random() > 0.5
          ? `rgba(255, 228, 190, ${alpha})`
          : `rgba(255, 248, 238, ${alpha})`;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const skyGeo = new THREE.SphereGeometry(320, 36, 24);
  const skyMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    fog: false,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.position.y = 20;
  skyMesh.matrixAutoUpdate = false;
  skyMesh.updateMatrix();
  return skyMesh;
}

/**
 * Creates a lightweight 360-degree distant Martian mountain & Olympus Mons mesa silhouette ring.
 * Single draw call with static matrices for zero FPS impact.
 */
function createHorizonMountains(): THREE.Mesh {
  const radialSegments = 96;
  const innerRadius = 198;
  const outerRadius = 236;
  const baseY = -16;

  // Two-ring skirt: inner ridge peaks & outer base skirt anchored deep below terrain edges
  const vertexCount = (radialSegments + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  const peakColor = new THREE.Color('#8e3216');
  const volcanoColor = new THREE.Color('#742410');
  const baseColor = new THREE.Color('#5a1d0d');
  const tmpColor = new THREE.Color();

  for (let i = 0; i <= radialSegments; i++) {
    const theta = (i / radialSegments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Layered Olympus Mons peak (~theta 0.7 rad), canyon mesas, and crater rims
    const olympusLobe = Math.exp(-Math.pow(((theta - 0.72 + Math.PI * 3) % (Math.PI * 2)) - Math.PI, 2) / 0.14);
    const ridgeWave =
      Math.sin(theta * 3 + 0.4) * 5.2 +
      Math.cos(theta * 7 - 1.1) * 3.8 +
      Math.sin(theta * 13 + 2.0) * 2.1 +
      Math.cos(theta * 21) * 1.1;

    // Stepped mesa plateau feel
    const rawHeight = 14 + ridgeWave + olympusLobe * 24;
    const peakY = Math.min(42, Math.max(7, rawHeight));
    const peakRadius = innerRadius + Math.sin(theta * 5) * 8;

    const topIdx = i * 2;
    const botIdx = topIdx + 1;

    positions[topIdx * 3] = cosT * peakRadius;
    positions[topIdx * 3 + 1] = peakY;
    positions[topIdx * 3 + 2] = sinT * peakRadius;

    positions[botIdx * 3] = cosT * outerRadius;
    positions[botIdx * 3 + 1] = baseY;
    positions[botIdx * 3 + 2] = sinT * outerRadius;

    tmpColor.lerpColors(peakColor, volcanoColor, Math.min(1, olympusLobe * 0.9 + (peakY - 12) / 36));
    colors[topIdx * 3] = tmpColor.r;
    colors[topIdx * 3 + 1] = tmpColor.g;
    colors[topIdx * 3 + 2] = tmpColor.b;

    colors[botIdx * 3] = baseColor.r;
    colors[botIdx * 3 + 1] = baseColor.g;
    colors[botIdx * 3 + 2] = baseColor.b;
  }

  for (let i = 0; i < radialSegments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = (i + 1) * 2;
    const d = c + 1;
    indices.push(a, b, c, c, b, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.04,
    flatShading: true,
    side: THREE.DoubleSide,
    fog: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

/**
 * Creates Phobos and Deimos, the two moons of Mars.
 */
function createMoons(): { phobos: THREE.Mesh; deimos: THREE.Mesh } {
  // Phobos: irregular potato-like shape
  const phobosGeo = new THREE.DodecahedronGeometry(5, 1);
  const phobosMat = new THREE.MeshStandardMaterial({
    color: '#8b8480',
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const phobos = new THREE.Mesh(phobosGeo, phobosMat);
  phobos.position.set(130, 110, -140);
  phobos.scale.set(1.2, 0.9, 0.8);

  // Deimos: smaller distant moon
  const deimosGeo = new THREE.DodecahedronGeometry(2.5, 1);
  const deimosMat = new THREE.MeshStandardMaterial({
    color: '#a09890',
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
  });
  const deimos = new THREE.Mesh(deimosGeo, deimosMat);
  deimos.position.set(-160, 130, 90);
  deimos.scale.set(1.1, 0.8, 1.0);

  return { phobos, deimos };
}

function isProtectedZone(x: number, z: number): boolean {
  // Spawn zone
  if (Math.hypot(x, z) < 10) return true;
  // Research Base & courtyard (-40, -32)
  if (Math.hypot(x + 40, z + 32) < 44) return true;
  // Rover Outpost spawn (28, -24)
  if (Math.hypot(x - 28, z + 24) < 6.5) return true;
  // Red Basin Overlook checkpoint (18, 22)
  if (Math.hypot(x - 18, z - 22) < 5.5) return true;
  // Mars History Lore Tablets
  for (let i = 0; i < INITIAL_HISTORY_TABLETS.length; i++) {
    const t = INITIAL_HISTORY_TABLETS[i].position;
    if (Math.hypot(x - t[0], z - t[2]) < 4.5) return true;
  }
  return false;
}

/**
 * Creates instanced rocks and boulders scattered across the Martian terrain,
 * along with exact collider metadata for every rock instance.
 */
function createInstancedRocks(count: number = 180): {
  instancedRocks: THREE.InstancedMesh;
  rockColliders: RockColliderInfo[];
} {
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  // Deform geometry slightly for jagged planetary rock look
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const noise = 1 + (Math.sin(vx * 3 + vy * 2) * 0.18 + Math.cos(vz * 3) * 0.15);
    pos.setXYZ(i, vx * noise, vy * noise * 0.85, vz * noise);
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: '#933516',
    roughness: 0.88,
    metalness: 0.12,
    flatShading: true,
  });

  const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, count);
  instancedRocks.castShadow = true;
  instancedRocks.receiveShadow = true;

  const rockColliders: RockColliderInfo[] = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const rockTints = ['#9e3919', '#7e2b12', '#b3421d', '#611f0b', '#c24b22'];

  for (let i = 0; i < count; i++) {
    // Distribute around map, avoiding spawn, base courtyard, checkpoints, and lore tablets
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 120;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      if (!isProtectedZone(cx, cz)) {
        x = cx;
        z = cz;
        break;
      }
      if (attempt === 19) {
        x = cx;
        z = cz;
      }
    }

    const groundY = getMarsHeight(x, z);

    // Random scaling from small pebbles to large boulders
    const scale = Math.random() * Math.random() * 3.5 + 0.6;
    const scaleY = scale * (0.6 + Math.random() * 0.6);
    const scaleZ = scale * (0.8 + Math.random() * 0.5);
    const centerY = groundY + scale * 0.35;

    dummy.position.set(x, centerY, z);
    dummy.scale.set(scale, scaleY, scaleZ);
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    dummy.updateMatrix();
    instancedRocks.setMatrixAt(i, dummy.matrix);

    // Record accurate bounding sphere/cylinder proxy for collision detection
    const horizRadius = Math.max(scale, scaleZ) * 0.88;
    const rockTopY = centerY + scaleY * 0.82;
    const rockBottomY = centerY - scaleY * 0.88;
    rockColliders.push({
      x,
      y: centerY,
      z,
      radius: horizRadius,
      minY: rockBottomY,
      maxY: rockTopY,
      walkableTop: rockTopY - groundY <= 0.72,
    });

    // Subtle tint variation
    const tintHex = rockTints[Math.floor(Math.random() * rockTints.length)];
    color.set(tintHex);
    instancedRocks.setColorAt(i, color);
  }

  instancedRocks.instanceMatrix.needsUpdate = true;
  if (instancedRocks.instanceColor) {
    instancedRocks.instanceColor.needsUpdate = true;
  }
  instancedRocks.computeBoundingSphere();

  return { instancedRocks, rockColliders };
}

/**
 * Creates atmospheric floating dust particles blowing across the landscape.
 * Highly optimized with precomputed bounds to eliminate per-frame trig calls.
 */
function createDustParticles(count: number = 320): { points: THREE.Points; update: (dt: number) => void } {
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 160;
    const z = (Math.random() - 0.5) * 160;
    const y = 1.5 + Math.random() * 12;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Wind blowing gently east-northeast
    velocities[i * 3] = 0.8 + Math.random() * 1.2;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    velocities[i * 3 + 2] = 0.4 + Math.random() * 0.8;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Custom particle sprite
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 180, 140, 0.85)');
    g.addColorStop(0.5, 'rgba(215, 90, 50, 0.45)');
    g.addColorStop(1, 'rgba(215, 90, 50, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  const particleMat = new THREE.PointsMaterial({
    size: 0.9,
    map: texture,
    transparent: true,
    opacity: 0.65,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(particleGeo, particleMat);
  points.frustumCulled = false;

  const update = (dt: number) => {
    const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
    const p = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      p[i * 3] += velocities[i * 3] * dt;
      p[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      p[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      // Wrap around bounds centered in exploration area
      if (p[i * 3] > 80) p[i * 3] = -80;
      else if (p[i * 3] < -80) p[i * 3] = 80;

      if (p[i * 3 + 2] > 80) p[i * 3 + 2] = -80;
      else if (p[i * 3 + 2] < -80) p[i * 3 + 2] = 80;

      if (p[i * 3 + 1] < 0.8) p[i * 3 + 1] = 12.0;
      else if (p[i * 3 + 1] > 14.0) p[i * 3 + 1] = 1.2;
    }
    posAttr.needsUpdate = true;
  };

  return { points, update };
}

/**
 * Initializes the full Mars lighting rig and atmospheric elements.
 */
export interface MarsEnvironmentOptions {
  dustCount?: number;
  shadowMapSize?: number;
  shadowFrustum?: number;
}

export function setupMarsEnvironment(
  scene: THREE.Scene,
  isSoftwareGl: boolean,
  options: MarsEnvironmentOptions = {}
): MarsEnvironmentAssets {
  const dustCount = options.dustCount ?? 650;
  const shadowMapSize = options.shadowMapSize ?? 1024;
  const shadowFrustum = options.shadowFrustum ?? 48;

  // Fog matched to Mars horizon
  scene.fog = new THREE.FogExp2(0xc85528, 0.0095);

  // 1. Mars Sky Dome & 360-degree Horizon Mountain Ridge
  const skyDome = createMarsSky();
  scene.add(skyDome);

  const horizonRidge = createHorizonMountains();
  scene.add(horizonRidge);

  // 2. Moons: Phobos and Deimos
  const { phobos, deimos } = createMoons();
  scene.add(phobos);
  scene.add(deimos);

  // 3. Lighting Rig:
  // Warm Martian Sunlight (Key Light) with player-centered shadow frustum
  const sunLight = new THREE.DirectionalLight(0xffe2b8, 2.2);
  sunLight.position.set(60, 90, 50);
  sunLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    sunLight.shadow.mapSize.width = shadowMapSize;
    sunLight.shadow.mapSize.height = shadowMapSize;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 220;
    sunLight.shadow.camera.left = -shadowFrustum;
    sunLight.shadow.camera.right = shadowFrustum;
    sunLight.shadow.camera.top = shadowFrustum;
    sunLight.shadow.camera.bottom = -shadowFrustum;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Cool sky / ground bounce Hemisphere Light
  const hemiLight = new THREE.HemisphereLight(0xffb085, 0x5a1d0f, 1.1);
  scene.add(hemiLight);

  // 4. Instanced Martian Rocks
  const { instancedRocks, rockColliders } = createInstancedRocks(160);
  instancedRocks.matrixAutoUpdate = false;
  instancedRocks.updateMatrix();
  scene.add(instancedRocks);

  // 5. Dust Particle System
  const { points: dustParticles, update: updateDust } = createDustParticles(dustCount);
  scene.add(dustParticles);

  const update = (delta: number) => {
    updateDust(delta);
    // Slow planetary moon orbit
    phobos.rotation.y += 0.05 * delta;
    deimos.rotation.y += 0.03 * delta;
  };

  const dispose = () => {
    skyDome.geometry.dispose();
    const skyMat = skyDome.material as THREE.MeshBasicMaterial;
    skyMat.map?.dispose();
    skyMat.dispose();
    horizonRidge.geometry.dispose();
    (horizonRidge.material as THREE.Material).dispose();
    instancedRocks.geometry.dispose();
    (instancedRocks.material as THREE.Material).dispose();
    dustParticles.geometry.dispose();
    (dustParticles.material as THREE.Material).dispose();
    phobos.geometry.dispose();
    (phobos.material as THREE.Material).dispose();
    deimos.geometry.dispose();
    (deimos.material as THREE.Material).dispose();
  };

  return {
    skyDome,
    horizonRidge,
    instancedRocks,
    rockColliders,
    dustParticles,
    sunLight,
    hemiLight,
    phobos,
    deimos,
    update,
    dispose,
  };
}
