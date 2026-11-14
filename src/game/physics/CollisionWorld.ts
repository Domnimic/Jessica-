import * as THREE from 'three';

export type ColliderShapeType = 'box' | 'cylinder' | 'orientedBox';

export interface ColliderOptions {
  id?: string;
  tag?: string;
  walkableTop?: boolean;
  stepHeight?: number;
  blocksCamera?: boolean;
}

export interface CylinderColliderParams extends ColliderOptions {
  x: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
  /** Optional outer skirt radius for smooth sloped deck/platform entry (e.g. Base foundation) */
  bevelOuterRadius?: number;
}

export interface OrientedBoxParams extends ColliderOptions {
  id: string;
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  rotationY: number;
  minY: number;
  maxY: number;
}

interface InternalCollider {
  id: string;
  tag: string;
  type: ColliderShapeType;
  box: THREE.Box3;
  // Cylinder fields
  cx: number;
  cz: number;
  radius: number;
  bevelOuterRadius: number;
  // Oriented box fields
  halfX: number;
  halfZ: number;
  cosR: number;
  sinR: number;
  // Vertical bounds & behavior flags
  minY: number;
  maxY: number;
  walkableTop: boolean;
  stepHeight: number;
  blocksCamera: boolean;
  // Deduplication stamp for zero-GC spatial hash queries
  lastQueryId: number;
}

const CELL_SIZE = 16;

// Pre-allocated module scratch objects (zero per-frame allocations)
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _ray = new THREE.Ray(_rayOrigin, _rayDir);
const _hitVec = new THREE.Vector3();
const _objBox = new THREE.Box3();
const _tempColliders: InternalCollider[] = [];

export class CollisionWorld {
  private staticColliders: InternalCollider[] = [];
  private dynamicColliders = new Map<string, InternalCollider>();
  private grid = new Map<number, InternalCollider[]>();
  private queryStamp = 1;
  private autoIdCounter = 0;

  private getCellKey(cx: number, cz: number): number {
    return (cx + 512) * 1024 + (cz + 512);
  }

  private insertIntoGrid(collider: InternalCollider): void {
    const minCx = Math.floor(collider.box.min.x / CELL_SIZE);
    const maxCx = Math.floor(collider.box.max.x / CELL_SIZE);
    const minCz = Math.floor(collider.box.min.z / CELL_SIZE);
    const maxCz = Math.floor(collider.box.max.z / CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.getCellKey(cx, cz);
        let bucket = this.grid.get(key);
        if (!bucket) {
          bucket = [];
          this.grid.set(key, bucket);
        }
        bucket.push(collider);
      }
    }
  }

  /**
   * Registers an axis-aligned THREE.Box3 solid collider in world space.
   */
  public addBox(box: THREE.Box3, options: ColliderOptions = {}): string {
    const id = options.id ?? `box_${++this.autoIdCounter}`;
    const collider: InternalCollider = {
      id,
      tag: options.tag ?? 'obstacle',
      type: 'box',
      box: box.clone(),
      cx: (box.min.x + box.max.x) * 0.5,
      cz: (box.min.z + box.max.z) * 0.5,
      radius: 0,
      bevelOuterRadius: 0,
      halfX: (box.max.x - box.min.x) * 0.5,
      halfZ: (box.max.z - box.min.z) * 0.5,
      cosR: 1,
      sinR: 0,
      minY: box.min.y,
      maxY: box.max.y,
      walkableTop: options.walkableTop ?? false,
      stepHeight: options.stepHeight ?? 0.55,
      blocksCamera: options.blocksCamera ?? true,
      lastQueryId: 0,
    };
    this.staticColliders.push(collider);
    this.insertIntoGrid(collider);
    return id;
  }

  /**
   * Registers an axis-aligned box collider centered horizontally at (x, z).
   */
  public addBoxAt(
    x: number,
    z: number,
    halfX: number,
    halfZ: number,
    minY: number,
    maxY: number,
    options: ColliderOptions = {}
  ): string {
    _objBox.min.set(x - halfX, minY, z - halfZ);
    _objBox.max.set(x + halfX, maxY, z + halfZ);
    return this.addBox(_objBox, options);
  }

  /**
   * Registers a vertical cylinder collider (great for pillars, trees, towers, monoliths, rocks).
   */
  public addCylinder(params: CylinderColliderParams): string {
    const id = params.id ?? `cyl_${++this.autoIdCounter}`;
    const broadR = Math.max(params.radius, params.bevelOuterRadius ?? params.radius);
    const box = new THREE.Box3(
      new THREE.Vector3(params.x - broadR, params.minY, params.z - broadR),
      new THREE.Vector3(params.x + broadR, params.maxY, params.z + broadR)
    );
    const collider: InternalCollider = {
      id,
      tag: params.tag ?? 'cylinder',
      type: 'cylinder',
      box,
      cx: params.x,
      cz: params.z,
      radius: params.radius,
      bevelOuterRadius: params.bevelOuterRadius ?? 0,
      halfX: broadR,
      halfZ: broadR,
      cosR: 1,
      sinR: 0,
      minY: params.minY,
      maxY: params.maxY,
      walkableTop: params.walkableTop ?? false,
      stepHeight: params.stepHeight ?? 0.55,
      blocksCamera: params.blocksCamera ?? true,
      lastQueryId: 0,
    };
    this.staticColliders.push(collider);
    this.insertIntoGrid(collider);
    return id;
  }

  /**
   * Automatically computes world THREE.Box3 for any newly created Three.js Object3D / Mesh / Group
   * and registers it as a solid collider.
   */
  public addFromObject3D(object: THREE.Object3D, options: ColliderOptions & { shrinkXZ?: number } = {}): string | null {
    object.updateWorldMatrix(true, true);
    _objBox.setFromObject(object);
    if (_objBox.isEmpty()) return null;

    const shrink = options.shrinkXZ ?? 0;
    if (shrink > 0) {
      _objBox.min.x += shrink;
      _objBox.min.z += shrink;
      _objBox.max.x -= shrink;
      _objBox.max.z -= shrink;
    }
    return this.addBox(_objBox, options);
  }

  /**
   * Creates or updates a dynamic oriented bounding box collider (e.g., driveable Mars Rover).
   */
  public upsertDynamicOrientedBox(params: OrientedBoxParams): void {
    const cosR = Math.cos(params.rotationY);
    const sinR = Math.sin(params.rotationY);
    const extX = Math.abs(params.halfX * cosR) + Math.abs(params.halfZ * sinR);
    const extZ = Math.abs(params.halfX * sinR) + Math.abs(params.halfZ * cosR);

    let col = this.dynamicColliders.get(params.id);
    if (!col) {
      col = {
        id: params.id,
        tag: params.tag ?? 'dynamic',
        type: 'orientedBox',
        box: new THREE.Box3(),
        cx: params.x,
        cz: params.z,
        radius: Math.hypot(params.halfX, params.halfZ),
        bevelOuterRadius: 0,
        halfX: params.halfX,
        halfZ: params.halfZ,
        cosR,
        sinR,
        minY: params.minY,
        maxY: params.maxY,
        walkableTop: params.walkableTop ?? true,
        stepHeight: params.stepHeight ?? 0.55,
        blocksCamera: params.blocksCamera ?? true,
        lastQueryId: 0,
      };
      this.dynamicColliders.set(params.id, col);
    } else {
      col.cx = params.x;
      col.cz = params.z;
      col.halfX = params.halfX;
      col.halfZ = params.halfZ;
      col.cosR = cosR;
      col.sinR = sinR;
      col.minY = params.minY;
      col.maxY = params.maxY;
    }

    col.box.min.set(params.x - extX, params.minY, params.z - extZ);
    col.box.max.set(params.x + extX, params.maxY, params.z + extZ);
  }

  public removeDynamic(id: string): void {
    this.dynamicColliders.delete(id);
  }

  /**
   * Populates _tempColliders with unique colliders covering the AABB [minX..maxX, minZ..maxZ].
   * Zero allocations via numeric grid lookup + queryStamp deduplication.
   */
  private queryRegion(minX: number, minZ: number, maxX: number, maxZ: number): InternalCollider[] {
    _tempColliders.length = 0;
    const stamp = ++this.queryStamp;

    const minCx = Math.floor(minX / CELL_SIZE);
    const maxCx = Math.floor(maxX / CELL_SIZE);
    const minCz = Math.floor(minZ / CELL_SIZE);
    const maxCz = Math.floor(maxZ / CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.grid.get(this.getCellKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const c = bucket[i];
          if (c.lastQueryId !== stamp) {
            c.lastQueryId = stamp;
            _tempColliders.push(c);
          }
        }
      }
    }

    this.dynamicColliders.forEach((c) => {
      if (
        c.box.max.x >= minX &&
        c.box.min.x <= maxX &&
        c.box.max.z >= minZ &&
        c.box.min.z <= maxZ
      ) {
        _tempColliders.push(c);
      }
    });

    return _tempColliders;
  }

  /**
   * Resolves horizontal (XZ) collisions against nearby rocks, buildings, vehicles, and props,
   * performing smooth tangential sliding and minimum-translation-vector separation.
   */
  public resolveHorizontalCollision(
    x: number,
    y: number,
    z: number,
    radius: number,
    bodyHeight: number,
    outPos: { x: number; z: number },
    outVel?: { x: number; z: number },
    ignoreId?: string,
    stepAllowance: number = 0.55
  ): boolean {
    let rx = x;
    let rz = z;
    let collided = false;

    const queryPad = radius + 4.0;
    const candidates = this.queryRegion(rx - queryPad, rz - queryPad, rx + queryPad, rz + queryPad);
    if (candidates.length === 0) {
      outPos.x = rx;
      outPos.z = rz;
      return false;
    }

    // Two solver iterations cleanly handle corners between adjacent walls/rocks
    for (let iter = 0; iter < 2; iter++) {
      let iterHit = false;

      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (ignoreId && c.id === ignoreId) continue;

        // Walkable beveled/low platforms do not block horizontally when steppable or already above
        if (c.walkableTop) {
          const effectiveAllowance = Math.max(stepAllowance, c.stepHeight);
          if (y + effectiveAllowance >= c.maxY) {
            continue;
          }
        }

        // Ignore obstacles completely below feet or strictly above head
        if (y >= c.maxY - 0.12 || y + bodyHeight <= c.minY + 0.05) {
          continue;
        }

        if (c.type === 'cylinder') {
          const dx = rx - c.cx;
          const dz = rz - c.cz;
          const minDist = c.radius + radius;
          const distSq = dx * dx + dz * dz;

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            let nx = 1;
            let nz = 0;
            if (dist > 1e-5) {
              nx = dx / dist;
              nz = dz / dist;
            }
            const push = minDist - dist;
            rx += nx * push;
            rz += nz * push;
            collided = true;
            iterHit = true;

            if (outVel) {
              const vn = outVel.x * nx + outVel.z * nz;
              if (vn < 0) {
                outVel.x -= vn * nx;
                outVel.z -= vn * nz;
              }
            }
          }
        } else if (c.type === 'box') {
          const minX = c.box.min.x;
          const maxX = c.box.max.x;
          const minZ = c.box.min.z;
          const maxZ = c.box.max.z;

          const closestX = Math.max(minX, Math.min(rx, maxX));
          const closestZ = Math.max(minZ, Math.min(rz, maxZ));
          const dx = rx - closestX;
          const dz = rz - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < radius * radius) {
            let nx = 0;
            let nz = 0;
            let push = 0;

            if (distSq > 1e-8) {
              const dist = Math.sqrt(distSq);
              nx = dx / dist;
              nz = dz / dist;
              push = radius - dist;
            } else {
              // Center is inside AABB: push out along nearest face
              const dLeft = rx - minX;
              const dRight = maxX - rx;
              const dTop = rz - minZ;
              const dBottom = maxZ - rz;
              const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
              if (minEdge === dLeft) {
                nx = -1;
                push = dLeft + radius;
              } else if (minEdge === dRight) {
                nx = 1;
                push = dRight + radius;
              } else if (minEdge === dTop) {
                nz = -1;
                push = dTop + radius;
              } else {
                nz = 1;
                push = dBottom + radius;
              }
            }

            rx += nx * push;
            rz += nz * push;
            collided = true;
            iterHit = true;

            if (outVel) {
              const vn = outVel.x * nx + outVel.z * nz;
              if (vn < 0) {
                outVel.x -= vn * nx;
                outVel.z -= vn * nz;
              }
            }
          }
        } else {
          // Oriented 2D box (e.g. Rover)
          const relX = rx - c.cx;
          const relZ = rz - c.cz;
          // Transform into collider local coordinates (inverse Y rotation)
          const lx = relX * c.cosR - relZ * c.sinR;
          const lz = relX * c.sinR + relZ * c.cosR;

          const closestX = Math.max(-c.halfX, Math.min(lx, c.halfX));
          const closestZ = Math.max(-c.halfZ, Math.min(lz, c.halfZ));
          const dx = lx - closestX;
          const dz = lz - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < radius * radius) {
            let lnx = 0;
            let lnz = 0;
            let push = 0;

            if (distSq > 1e-8) {
              const dist = Math.sqrt(distSq);
              lnx = dx / dist;
              lnz = dz / dist;
              push = radius - dist;
            } else {
              const dLeft = lx + c.halfX;
              const dRight = c.halfX - lx;
              const dTop = lz + c.halfZ;
              const dBottom = c.halfZ - lz;
              const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
              if (minEdge === dLeft) {
                lnx = -1;
                push = dLeft + radius;
              } else if (minEdge === dRight) {
                lnx = 1;
                push = dRight + radius;
              } else if (minEdge === dTop) {
                lnz = -1;
                push = dTop + radius;
              } else {
                lnz = 1;
                push = dBottom + radius;
              }
            }

            // Transform local push normal back to world coordinates
            const nx = lnx * c.cosR + lnz * c.sinR;
            const nz = -lnx * c.sinR + lnz * c.cosR;

            rx += nx * push;
            rz += nz * push;
            collided = true;
            iterHit = true;

            if (outVel) {
              const vn = outVel.x * nx + outVel.z * nz;
              if (vn < 0) {
                outVel.x -= vn * nx;
                outVel.z -= vn * nz;
              }
            }
          }
        }
      }

      if (!iterHit) break;
    }

    outPos.x = rx;
    outPos.z = rz;
    return collided;
  }

  /**
   * Computes the true support floor Y at (x, z) including Mars terrain + walkable pads,
   * base foundation decks, checkpoint platforms, rover top, and flat obstacle tops.
   */
  public getFloorSupportY(
    x: number,
    y: number,
    z: number,
    footRadius: number,
    baseTerrainY: number,
    ignoreId?: string
  ): number {
    let supportY = baseTerrainY;
    const candidates = this.queryRegion(x - footRadius - 2, z - footRadius - 2, x + footRadius + 2, z + footRadius + 2);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c.walkableTop) continue;
      if (ignoreId && c.id === ignoreId) continue;

      const stepWindow = Math.max(c.stepHeight, 0.45);
      // Only land on / step onto surfaces whose top isn't way above the player's step/waist height
      if (c.maxY > y + stepWindow) continue;

      let candidateTop = c.maxY;
      let insideFootprint = false;

      if (c.type === 'cylinder') {
        const dist = Math.hypot(x - c.cx, z - c.cz);
        const outerR = c.bevelOuterRadius > c.radius ? c.bevelOuterRadius : c.radius + footRadius * 0.45;
        if (dist <= outerR) {
          insideFootprint = true;
          if (c.bevelOuterRadius > c.radius && dist > c.radius) {
            // Smooth bevel ramp between outerR (terrain) and inner radius (deck top)
            const t = 1 - (dist - c.radius) / (c.bevelOuterRadius - c.radius);
            candidateTop = THREE.MathUtils.lerp(baseTerrainY, c.maxY, THREE.MathUtils.clamp(t, 0, 1));
          }
        }
      } else if (c.type === 'box') {
        const pad = footRadius * 0.45;
        if (
          x >= c.box.min.x - pad &&
          x <= c.box.max.x + pad &&
          z >= c.box.min.z - pad &&
          z <= c.box.max.z + pad
        ) {
          insideFootprint = true;
        }
      } else {
        const relX = x - c.cx;
        const relZ = z - c.cz;
        const lx = relX * c.cosR - relZ * c.sinR;
        const lz = relX * c.sinR + relZ * c.cosR;
        const pad = footRadius * 0.4;
        if (Math.abs(lx) <= c.halfX + pad && Math.abs(lz) <= c.halfZ + pad) {
          insideFootprint = true;
        }
      }

      if (insideFootprint && candidateTop > supportY) {
        supportY = candidateTop;
      }
    }

    return supportY;
  }

  /**
   * Prevents the third-person camera from clipping inside terrain ridges, craters, rocks, or base buildings.
   * Performs a Three.js Ray-vs-Box3 sweep from target toward desiredCamPos plus terrain clearance sampling.
   */
  public resolveCameraCollision(
    target: THREE.Vector3,
    desiredCamPos: THREE.Vector3,
    getTerrainY: (x: number, z: number) => number,
    outCamPos: THREE.Vector3,
    ignoreId?: string
  ): void {
    const dx = desiredCamPos.x - target.x;
    const dy = desiredCamPos.y - target.y;
    const dz = desiredCamPos.z - target.z;
    const fullDist = Math.hypot(dx, dy, dz);

    if (fullDist < 0.05) {
      outCamPos.copy(desiredCamPos);
      return;
    }

    _rayOrigin.copy(target);
    _rayDir.set(dx / fullDist, dy / fullDist, dz / fullDist);

    const minX = Math.min(target.x, desiredCamPos.x) - 0.5;
    const maxX = Math.max(target.x, desiredCamPos.x) + 0.5;
    const minZ = Math.min(target.z, desiredCamPos.z) - 0.5;
    const maxZ = Math.max(target.z, desiredCamPos.z) + 0.5;

    let closestHitDist = fullDist;
    const candidates = this.queryRegion(minX, minZ, maxX, maxZ);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c.blocksCamera) continue;
      if (ignoreId && c.id === ignoreId) continue;
      // Do not collide camera against flat low ground decks below target eye line unless camera is diving into them
      if (c.walkableTop && c.maxY < target.y - 0.6 && desiredCamPos.y > c.maxY + 0.5) continue;

      if (_ray.intersectBox(c.box, _hitVec)) {
        const hitDist = _rayOrigin.distanceTo(_hitVec);
        // Pull slightly in front of surface to prevent near-plane clipping
        if (hitDist > 0.35 && hitDist - 0.45 < closestHitDist) {
          closestHitDist = Math.max(1.4, hitDist - 0.45);
        }
      }
    }

    const clampedRatio = closestHitDist / fullDist;
    outCamPos.set(
      target.x + dx * clampedRatio,
      target.y + dy * clampedRatio,
      target.z + dz * clampedRatio
    );

    // Terrain ray-marching & endpoint clearance check (keeps camera above hills/craters & walkable decks)
    const steps = 6;
    let highestRequiredY = -Infinity;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const sx = target.x + (outCamPos.x - target.x) * t;
      const sz = target.z + (outCamPos.z - target.z) * t;
      const terrainFloor = this.getFloorSupportY(sx, target.y + 4, sz, 0.3, getTerrainY(sx, sz), ignoreId);
      const minRayY = terrainFloor + (s === steps ? 1.05 : 0.65);
      const rayYAtS = target.y + (outCamPos.y - target.y) * t;
      if (rayYAtS < minRayY) {
        const liftedEndY = target.y + (minRayY - target.y) / t;
        if (liftedEndY > highestRequiredY) {
          highestRequiredY = liftedEndY;
        }
      }
    }

    const endpointTerrainY = this.getFloorSupportY(
      outCamPos.x,
      outCamPos.y + 2,
      outCamPos.z,
      0.35,
      getTerrainY(outCamPos.x, outCamPos.z),
      ignoreId
    );
    const minEndY = endpointTerrainY + 1.05;
    if (outCamPos.y < minEndY) {
      outCamPos.y = minEndY;
    } else if (highestRequiredY > outCamPos.y) {
      outCamPos.y = Math.min(highestRequiredY, outCamPos.y + 3.5);
    }
  }

  /**
   * Computes zero-allocation obstacle avoidance steering for Rover Auto-Pilot navigation.
   * Uses the spatial hash grid around the vehicle + terrain slope probes to steer smoothly
   * around rocks, boulders, base modules, towers, and steep crater rims.
   */
  public computeSteeringAvoidance(
    x: number,
    y: number,
    z: number,
    headingRad: number,
    targetX: number,
    targetZ: number,
    vehicleRadius: number,
    getTerrainY: (tx: number, tz: number) => number,
    outSteer: { turnInput: number; forwardScale: number; avoiding: boolean }
  ): void {
    const toTargetX = targetX - x;
    const toTargetZ = targetZ - z;
    const targetDist = Math.hypot(toTargetX, toTargetZ);

    if (targetDist < 0.1) {
      outSteer.turnInput = 0;
      outSteer.forwardScale = 0;
      outSteer.avoiding = false;
      return;
    }

    let steerX = toTargetX / targetDist;
    let steerZ = toTargetZ / targetDist;
    let repulseX = 0;
    let repulseZ = 0;
    let avoiding = false;

    const fwdX = Math.sin(headingRad);
    const fwdZ = Math.cos(headingRad);

    // Query nearby obstacles inside 13m spatial grid box (zero allocations)
    const senseRange = 13.0;
    const candidates = this.queryRegion(x - senseRange, z - senseRange, x + senseRange, z + senseRange);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (c.id === 'mars_rover') continue;
      // Ignore steppable platforms/ramps below or near wheel height
      if (c.walkableTop && y + 0.85 >= c.maxY) continue;
      if (y + 2.4 <= c.minY + 0.05 || y >= c.maxY - 0.15) continue;

      let closestX = c.cx;
      let closestZ = c.cz;
      let obsRadius = 0;

      if (c.type === 'cylinder') {
        obsRadius = c.radius;
      } else if (c.type === 'box') {
        closestX = Math.max(c.box.min.x, Math.min(x, c.box.max.x));
        closestZ = Math.max(c.box.min.z, Math.min(z, c.box.max.z));
      } else {
        const relX = x - c.cx;
        const relZ = z - c.cz;
        const lx = relX * c.cosR - relZ * c.sinR;
        const lz = relX * c.sinR + relZ * c.cosR;
        const clampedX = Math.max(-c.halfX, Math.min(lx, c.halfX));
        const clampedZ = Math.max(-c.halfZ, Math.min(lz, c.halfZ));
        closestX = c.cx + clampedX * c.cosR + clampedZ * c.sinR;
        closestZ = c.cz - clampedX * c.sinR + clampedZ * c.cosR;
      }

      const dx = x - closestX;
      const dz = z - closestZ;
      const rawDist = Math.hypot(dx, dz);
      const clearanceDist = rawDist - obsRadius - vehicleRadius;

      // Skip target waypoint itself if we're within its final approach envelope
      const distToTargetFromObs = Math.hypot(closestX - targetX, closestZ - targetZ);
      if (targetDist < 10 && distToTargetFromObs < 3.5) continue;

      const triggerRange = 7.5;
      if (clearanceDist < triggerRange) {
        const nx = rawDist > 1e-4 ? dx / rawDist : -fwdZ;
        const nz = rawDist > 1e-4 ? dz / rawDist : fwdX;

        // Weight obstacles stronger when in front of rover or along desired path
        const toObsDotFwd = -(nx * fwdX + nz * fwdZ);
        const toObsDotTarget = -(nx * steerX + nz * steerZ);
        if (toObsDotFwd > -0.25 || toObsDotTarget > -0.15 || clearanceDist < 1.8) {
          const strength = Math.pow(
            Math.max(0, 1 - Math.max(0, clearanceDist) / triggerRange),
            1.45
          );
          // Blend radial push + tangential slide (pick side consistent with target direction)
          const tangentX = -nz;
          const tangentZ = nx;
          const sideSign = tangentX * steerX + tangentZ * steerZ >= 0 ? 1 : -1;

          repulseX += (nx * 1.15 + tangentX * sideSign * 1.65) * strength * 2.6;
          repulseZ += (nz * 1.15 + tangentZ * sideSign * 1.65) * strength * 2.6;
          if (strength > 0.22) {
            avoiding = true;
          }
        }
      }
    }

    // Lightweight 3-point terrain slope probe ahead so Auto-Pilot eases around sheer cliffs/crater edges
    const probeDist = 4.6;
    const hNow = getTerrainY(x, z);
    const hLeft = getTerrainY(
      x + Math.sin(headingRad - 0.55) * probeDist,
      z + Math.cos(headingRad - 0.55) * probeDist
    );
    const hRight = getTerrainY(
      x + Math.sin(headingRad + 0.55) * probeDist,
      z + Math.cos(headingRad + 0.55) * probeDist
    );
    const slopeL = Math.abs(hLeft - hNow) / probeDist;
    const slopeR = Math.abs(hRight - hNow) / probeDist;
    if (slopeL > 0.42 || slopeR > 0.42) {
      const sideBias = slopeL > slopeR ? 1 : -1; // positive turn = steer right
      const latX = fwdZ * sideBias;
      const latZ = -fwdX * sideBias;
      const slopeWeight = Math.min(1.5, Math.max(slopeL, slopeR) * 1.6);
      repulseX += latX * slopeWeight;
      repulseZ += latZ * slopeWeight;
      avoiding = true;
    }

    steerX += repulseX;
    steerZ += repulseZ;
    const steerLen = Math.hypot(steerX, steerZ);
    if (steerLen > 1e-4) {
      steerX /= steerLen;
      steerZ /= steerLen;
    }

    const desiredHeading = Math.atan2(steerX, steerZ);
    let angleDiff = (desiredHeading - headingRad + Math.PI) % (Math.PI * 2);
    if (angleDiff < 0) angleDiff += Math.PI * 2;
    angleDiff -= Math.PI;

    // RoverModel drives with rotY -= turnInput * turnRate * delta (so turnInput < 0 turns toward +angle)
    const normalizedTurn = THREE.MathUtils.clamp(-angleDiff / 0.65, -1, 1);
    const absAngle = Math.abs(angleDiff);

    // Slow down smoothly on sharp turns or close final approach
    let speedScale = 1.0;
    if (absAngle > 1.25) speedScale = 0.25;
    else if (absAngle > 0.65) speedScale = 0.58;
    else if (avoiding) speedScale = 0.78;

    if (targetDist < 9.5) {
      speedScale = Math.min(speedScale, Math.max(0.35, targetDist / 9.5));
    }

    outSteer.turnInput = Math.abs(normalizedTurn) < 0.04 ? 0 : normalizedTurn;
    outSteer.forwardScale = speedScale;
    outSteer.avoiding = avoiding;
  }

  public getColliderCount(): number {
    return this.staticColliders.length + this.dynamicColliders.size;
  }

  public clear(): void {
    this.staticColliders.length = 0;
    this.dynamicColliders.clear();
    this.grid.clear();
  }
}
