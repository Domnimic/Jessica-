import * as THREE from 'three';
import { getMarsHeight } from '../terrain';
import type { CollisionWorld } from '../physics/CollisionWorld';
import { clampCameraFov, DEFAULT_CAMERA_FOV } from '../../utils/cameraSettings';

export interface OrbitCameraControls {
  camera: THREE.PerspectiveCamera;
  update: (
    targetPos: THREE.Vector3,
    playerHeading: number,
    delta: number,
    isGliding?: boolean,
    airSpeedRatio?: number,
    collisionWorld?: CollisionWorld,
    floorHeightFn?: (x: number, z: number) => number,
    maxCamY?: number,
    followHeadingStrength?: number
  ) => void;
  rotateBy: (deltaYaw: number, deltaPitch: number) => void;
  zoomBy: (deltaDistance: number) => void;
  resetCamera: (playerHeading?: number) => void;
  setupTouchAndMouseListeners: (domElement: HTMLElement) => () => void;
  getDistance: () => number;
  setFov: (fovDeg: number) => void;
  getFov: () => number;
}

export function createOrbitCamera(
  aspectRatio: number,
  initialTarget: THREE.Vector3 = new THREE.Vector3(0, 1.2, 0),
  initialFov: number = DEFAULT_CAMERA_FOV
): OrbitCameraControls {
  let baseFov = clampCameraFov(initialFov);

  // Far plane set to 520m so 360-degree Martian sky dome, moons, and distant mountain horizon never clip
  const camera = new THREE.PerspectiveCamera(baseFov, aspectRatio, 0.2, 520);

  // Orbit parameters balanced for 95° default FOV across tablets and desktops
  const DEFAULT_DISTANCE = 6.2;
  const MIN_DISTANCE = 2.6;
  const MAX_DISTANCE = 18.0;

  const DEFAULT_ELEVATION = 0.30; // ~17.2 degrees
  const MIN_ELEVATION = -0.35; // ~ -20 degrees upward view
  const MAX_ELEVATION = 1.48; // ~ 85 degrees overhead view

  let targetDistance = DEFAULT_DISTANCE;
  let currentDistance = DEFAULT_DISTANCE;
  let currentFlightOffset = 0;

  let targetAzimuth = Math.PI; // behind player facing forward
  let currentAzimuth = Math.PI;

  let targetElevation = DEFAULT_ELEVATION;
  let currentElevation = DEFAULT_ELEVATION;

  let manualOrbitCooldown = 0;

  // Smoothed follow target position
  const currentTargetPos = initialTarget.clone();

  // Temporary math helpers to eliminate GC
  const _camTarget = new THREE.Vector3();
  const _camDesiredPos = new THREE.Vector3();
  const _camResolvedPos = new THREE.Vector3();
  const _camOffset = new THREE.Vector3(0, 1.2, 0);

  const rotateBy = (deltaYaw: number, deltaPitch: number, isManual = true) => {
    targetAzimuth -= deltaYaw;
    targetElevation = Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, targetElevation + deltaPitch));
    if (isManual) {
      manualOrbitCooldown = 1.6;
    }
  };

  const zoomBy = (deltaDistance: number) => {
    targetDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, targetDistance + deltaDistance));
  };

  const setFov = (fovDeg: number) => {
    baseFov = clampCameraFov(fovDeg);
    if (Math.abs(camera.fov - baseFov) > 0.01) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
  };

  const getFov = () => baseFov;

  const resetCamera = (playerHeading: number = 0) => {
    targetDistance = DEFAULT_DISTANCE;
    targetElevation = DEFAULT_ELEVATION;
    // Take the shortest angular path directly behind player's facing direction
    const desired = playerHeading + Math.PI;
    const diff = Math.atan2(Math.sin(desired - currentAzimuth), Math.cos(desired - currentAzimuth));
    targetAzimuth = currentAzimuth + diff;
    manualOrbitCooldown = 0;
  };

  const update = (
    playerPos: THREE.Vector3,
    playerHeading: number,
    delta: number,
    isGliding: boolean = false,
    airSpeedRatio: number = 0,
    collisionWorld?: CollisionWorld,
    floorHeightFn: (x: number, z: number) => number = getMarsHeight,
    maxCamY?: number,
    followHeadingStrength: number = 0
  ) => {
    if (manualOrbitCooldown > 0) {
      manualOrbitCooldown = Math.max(0, manualOrbitCooldown - delta);
    } else if (followHeadingStrength > 0) {
      const desired = playerHeading + Math.PI;
      const diff = Math.atan2(Math.sin(desired - targetAzimuth), Math.cos(desired - targetAzimuth));
      targetAzimuth += diff * Math.min(1, followHeadingStrength * delta);
    }

    // 1. Smoothly follow player position (slightly softer vertical lag when soaring)
    _camTarget.copy(playerPos).add(_camOffset);
    const followLambda = isGliding ? 9.5 : 12.0;
    const alphaXZ = 1 - Math.exp(-followLambda * delta);
    const alphaY = 1 - Math.exp(-(isGliding ? 7.5 : 11.5) * delta);
    currentTargetPos.x = THREE.MathUtils.lerp(currentTargetPos.x, _camTarget.x, alphaXZ);
    currentTargetPos.y = THREE.MathUtils.lerp(currentTargetPos.y, _camTarget.y, alphaY);
    currentTargetPos.z = THREE.MathUtils.lerp(currentTargetPos.z, _camTarget.z, alphaXZ);

    // 2. Smoothly damp camera angles, flight distance cushion, and dynamic FOV
    currentAzimuth = THREE.MathUtils.damp(currentAzimuth, targetAzimuth, 16, delta);
    currentElevation = THREE.MathUtils.damp(currentElevation, targetElevation, 16, delta);
    currentDistance = THREE.MathUtils.damp(currentDistance, targetDistance, 14, delta);

    const desiredFlightOffset = isGliding ? 1.6 + Math.min(1.0, airSpeedRatio) * 1.0 : 0;
    currentFlightOffset = THREE.MathUtils.damp(currentFlightOffset, desiredFlightOffset, 5.5, delta);
    const effectiveDistance = currentDistance + currentFlightOffset;

    const targetFov = isGliding
      ? Math.min(116, baseFov + 2.0 + Math.min(1.0, airSpeedRatio) * 5.0)
      : baseFov;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5.0, delta);
      camera.updateProjectionMatrix();
    }

    // 3. Compute spherical coordinates
    const horizontalDist = effectiveDistance * Math.cos(currentElevation);
    const verticalDist = effectiveDistance * Math.sin(currentElevation);

    _camDesiredPos.x = currentTargetPos.x + horizontalDist * Math.sin(currentAzimuth);
    _camDesiredPos.y = currentTargetPos.y + verticalDist;
    _camDesiredPos.z = currentTargetPos.z + horizontalDist * Math.cos(currentAzimuth);

    // 4. Third-person camera obstacle & terrain collision check:
    if (collisionWorld) {
      collisionWorld.resolveCameraCollision(
        currentTargetPos,
        _camDesiredPos,
        floorHeightFn,
        _camResolvedPos,
        'mars_rover'
      );
      camera.position.copy(_camResolvedPos);
    } else {
      const groundHeightAtCam = floorHeightFn(_camDesiredPos.x, _camDesiredPos.z);
      const minSafeCamY = groundHeightAtCam + 1.2;
      if (_camDesiredPos.y < minSafeCamY) {
        _camDesiredPos.y = minSafeCamY;
      }
      camera.position.copy(_camDesiredPos);
    }

    if (maxCamY !== undefined && camera.position.y > maxCamY) {
      camera.position.y = maxCamY;
    }

    camera.lookAt(currentTargetPos);
  };

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null;
    if (!el || !el.closest) return false;
    return Boolean(el.closest('[data-interactive-ui="true"], button, input, select, textarea, a'));
  };

  /**
   * Sets up responsive touch drag, pinch-zoom, and desktop mouse/wheel listeners
   * normalized across phones, Android tablets, and desktop monitors.
   */
  const setupTouchAndMouseListeners = (domElement: HTMLElement) => {
    domElement.style.touchAction = 'none';

    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    // Active touch tracking for 1-finger orbit vs 2-finger pinch
    let activeCameraTouchId: number | null = null;
    let prevTouchX = 0;
    let prevTouchY = 0;
    let initialPinchDist = 0;

    const getViewportDims = () => {
      const w = Math.max(360, domElement.clientWidth || window.innerWidth || 960);
      const h = Math.max(240, domElement.clientHeight || window.innerHeight || 540);
      return { w, h };
    };

    const getCanvasTouches = (touches: TouchList): Touch[] => {
      const result: Touch[] = [];
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        if (!isInteractiveTarget(t.target)) {
          result.push(t);
        }
      }
      return result;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (e.target !== domElement && (e.target as HTMLElement)?.closest?.('canvas') !== domElement) {
        const rect = domElement.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        ) {
          return;
        }
      }
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const { w, h } = getViewportDims();
      const rawDx = Math.max(-120, Math.min(120, e.clientX - prevMouseX));
      const rawDy = Math.max(-120, Math.min(120, e.clientY - prevMouseY));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      // Normalized for desktop windows from compact 720p up to 4K ultrawide
      const yawScale = Math.max(0.005, Math.min(0.0115, (Math.PI * 1.9) / w));
      const pitchScale = Math.max(0.0045, Math.min(0.01, (Math.PI * 0.9) / h));
      rotateBy(rawDx * yawScale, rawDy * pitchScale, true);
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!isInteractiveTarget(e.target)) {
        e.preventDefault();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isInteractiveTarget(e.target)) return;
      e.preventDefault();
      // Normalize line-based desktop wheels & high-resolution trackpad deltas
      const normalizedDelta =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
      const clampedDelta = Math.max(-120, Math.min(120, normalizedDelta));
      rotateBy(0, 0, false);
      zoomBy(clampedDelta * 0.011);
    };

    const onTouchStart = (e: TouchEvent) => {
      const canvasTouches = getCanvasTouches(e.touches);

      // 2 canvas touches -> pinch-to-zoom (works even if 3rd finger holds joystick)
      if (canvasTouches.length >= 2) {
        const t1 = canvasTouches[0];
        const t2 = canvasTouches[1];
        initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        return;
      }

      // 1st non-UI finger lands on canvas -> camera orbit
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (isInteractiveTarget(touch.target)) continue;
        if (activeCameraTouchId === null) {
          activeCameraTouchId = touch.identifier;
          prevTouchX = touch.clientX;
          prevTouchY = touch.clientY;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const { w, h } = getViewportDims();
      const canvasTouches = getCanvasTouches(e.touches);

      // 2-finger pinch-to-zoom normalized for both Android tablets & phones
      if (canvasTouches.length >= 2 && initialPinchDist > 0) {
        const t1 = canvasTouches[0];
        const t2 = canvasTouches[1];
        const currentPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const minDim = Math.min(w, h);
        const pinchDelta = (initialPinchDist - currentPinchDist) * (16 / minDim);
        zoomBy(pinchDelta);
        initialPinchDist = currentPinchDist;
        return;
      }

      // 1-finger responsive 360° camera orbit (works simultaneously with virtual joystick)
      if (activeCameraTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === activeCameraTouchId) {
            const rawDx = Math.max(-90, Math.min(90, touch.clientX - prevTouchX));
            const rawDy = Math.max(-90, Math.min(90, touch.clientY - prevTouchY));
            prevTouchX = touch.clientX;
            prevTouchY = touch.clientY;

            // Dragging ~48% of viewport width orbits full 360° smoothly on Android tablets & phones
            const yawScale = (Math.PI * 2) / (w * 0.48);
            const pitchScale = (Math.PI * 0.9) / (h * 0.65);
            rotateBy(rawDx * yawScale, rawDy * pitchScale, true);
            break;
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (activeCameraTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeCameraTouchId) {
            activeCameraTouchId = null;
            break;
          }
        }
      }

      const remainingCanvasTouches = getCanvasTouches(e.touches);
      if (remainingCanvasTouches.length < 2) {
        initialPinchDist = 0;
      }
      // Smoothly re-anchor remaining finger when finishing a pinch gesture so camera never jumps
      if (remainingCanvasTouches.length === 1) {
        const remaining = remainingCanvasTouches[0];
        activeCameraTouchId = remaining.identifier;
        prevTouchX = remaining.clientX;
        prevTouchY = remaining.clientY;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onMouseUp);
    domElement.addEventListener('contextmenu', onContextMenu);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
      domElement.removeEventListener('contextmenu', onContextMenu);
      domElement.removeEventListener('wheel', onWheel);

      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  };

  return {
    camera,
    update,
    rotateBy: (deltaYaw: number, deltaPitch: number) => rotateBy(deltaYaw, deltaPitch, true),
    zoomBy,
    resetCamera,
    setupTouchAndMouseListeners,
    getDistance: () => targetDistance,
    setFov,
    getFov,
  };
}

