import * as THREE from 'three';

// Mars Terrain Configuration
export const TERRAIN_SIZE = 360;
export const TERRAIN_SEGMENTS = 140;

// Significant Crater Landmarks
const CRATERS = [
  { x: -35, z: 25, radius: 18, invRadius: 1 / 18, maxDistSq: (18 * 1.6) * (18 * 1.6), depth: 3.5 },
  { x: 45, z: -40, radius: 24, invRadius: 1 / 24, maxDistSq: (24 * 1.6) * (24 * 1.6), depth: 4.5 },
  { x: -60, z: -55, radius: 15, invRadius: 1 / 15, maxDistSq: (15 * 1.6) * (15 * 1.6), depth: 3.0 },
  { x: 70, z: 45, radius: 22, invRadius: 1 / 22, maxDistSq: (22 * 1.6) * (22 * 1.6), depth: 4.0 },
  { x: 0, z: -75, radius: 20, invRadius: 1 / 20, maxDistSq: (20 * 1.6) * (20 * 1.6), depth: 3.8 },
  { x: -80, z: 10, radius: 28, invRadius: 1 / 28, maxDistSq: (28 * 1.6) * (28 * 1.6), depth: 5.0 },
];

const BOUNDARY_START = 110;
const BOUNDARY_START_SQ = BOUNDARY_START * BOUNDARY_START;
const INV_BOUNDARY_SPAN = 1 / (TERRAIN_SIZE * 0.5 - BOUNDARY_START);

/**
 * Procedural height calculator for Mars terrain.
 * Returns the exact elevation at coordinates (x, z).
 */
export function getMarsHeight(x: number, z: number): number {
  // Base rolling red dunes & dunes ripple
  let h =
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 3.2 +
    Math.sin(x * 0.075 + 1.2) * Math.cos(z * 0.065) * 1.5 +
    Math.sin(x * 0.15 + z * 0.1) * 0.5;

  // Craters: depression in center with elevated lip/rim around circumference
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < c.maxDistSq) {
      const dist = Math.sqrt(distSq);
      const normDist = dist * c.invRadius;
      if (normDist < 1.0) {
        // Bowl interior
        const bowl = Math.cos(normDist * Math.PI * 0.5);
        h -= bowl * c.depth;
      } else {
        // Raised crater rim
        const rimDist = (normDist - 1.0) / 0.6;
        const rim = Math.sin(rimDist * Math.PI) * (c.depth * 0.35);
        h += rim;
      }
    }
  }

  // Natural mountain ridge perimeter at edges of the map
  const distFromCenterSq = x * x + z * z;
  if (distFromCenterSq > BOUNDARY_START_SQ) {
    const distFromCenter = Math.sqrt(distFromCenterSq);
    const edgeFactor = (distFromCenter - BOUNDARY_START) * INV_BOUNDARY_SPAN;
    const clampedEdge = Math.min(Math.max(edgeFactor, 0), 1.5);
    const mountainRidge =
      (Math.sin(x * 0.08) * Math.cos(z * 0.08) * 12 +
       Math.sin(x * 0.04 + 2) * 18 +
       Math.cos(z * 0.04 + 1) * 18);
    h += Math.abs(mountainRidge) * (clampedEdge * clampedEdge) + clampedEdge * 25;
  }

  return h;
}

/**
 * Creates high-fidelity procedural red Martian surface texture (optimized 512x512 texture atlas).
 */
function createMarsTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Rich gradient of rust, orange-red, and iron oxide bedrock
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#c3441a');
    grad.addColorStop(0.35, '#d65525');
    grad.addColorStop(0.7, '#a93510');
    grad.addColorStop(1, '#822609');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Dune ripple lines
    ctx.strokeStyle = 'rgba(235, 120, 65, 0.22)';
    ctx.lineWidth = 2.5;
    for (let y = 0; y < size; y += 12) {
      ctx.beginPath();
      for (let x = 0; x < size; x += 16) {
        const offset = Math.sin(x * 0.04 + y * 0.03) * 4;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // Rocky granular speckles using fast direct imageData
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 28;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.4));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds the Mars Terrain Mesh with custom geometry & vertex normals.
 */
export function createMarsTerrain(segments: number = TERRAIN_SEGMENTS): { mesh: THREE.Mesh; texture: THREE.CanvasTexture } {
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    segments,
    segments
  );
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Apply heightfield function & calculate slope-based vertex coloring
  const baseColor = new THREE.Color('#d45728');
  const rimColor = new THREE.Color('#e06a38');
  const basinColor = new THREE.Color('#942b0e');
  const rockColor = new THREE.Color('#78220a');
  const tempColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getMarsHeight(x, z);
    pos.setY(i, y);

    // Color based on height and slope
    if (y < -1) {
      tempColor.lerpColors(basinColor, baseColor, (y + 5) / 4);
    } else if (y > 6) {
      tempColor.lerpColors(baseColor, rockColor, Math.min((y - 6) / 12, 1));
    } else {
      tempColor.lerpColors(baseColor, rimColor, y / 6);
    }

    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const texture = createMarsTexture();

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.08,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'MarsTerrain';
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();

  return { mesh, texture };
}
