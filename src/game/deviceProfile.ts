import * as THREE from 'three';

export type DeviceTier = 'phone' | 'tablet' | 'laptop';

export interface DevicePerformanceProfile {
  tier: DeviceTier;
  isTouch: boolean;
  initialPixelRatio: number;
  minPixelRatio: number;
  maxPixelRatio: number;
  antialias: boolean;
  shadowMapType: THREE.ShadowMapType;
  shadowMapSize: number;
  shadowFrustum: number;
  shadowUpdateInterval: number;
  terrainSegments: number;
  dustCount: number;
  stormCount: number;
  starCount: number;
  lightCullDist: number;
}

export function detectDevicePerformanceProfile(): DevicePerformanceProfile {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const hasCoarsePointer =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  const isTouch =
    hasCoarsePointer ||
    isMobileUa ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const minDim = Math.min(vw, vh);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cores =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 4;
  const memGb =
    typeof navigator !== 'undefined' &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory!
      : 4;

  const isLowEndHardware = cores <= 4 || memGb <= 4;

  let tier: DeviceTier = 'laptop';
  if (isTouch) {
    if (minDim < 620 || /iPhone|Android.*Mobile/i.test(ua)) {
      tier = 'phone';
    } else {
      tier = 'tablet';
    }
  }

  if (tier === 'phone') {
    const initialPpr = Math.min(dpr, isLowEndHardware ? 1.05 : 1.2);
    return {
      tier,
      isTouch: true,
      initialPixelRatio: initialPpr,
      minPixelRatio: 0.78,
      maxPixelRatio: Math.min(dpr, 1.25),
      antialias: false, // High-DPI phone screens stay crisp while saving ~30% GPU fragment cost
      shadowMapType: THREE.PCFShadowMap,
      shadowMapSize: 512,
      shadowFrustum: 36,
      shadowUpdateInterval: 2,
      terrainSegments: 96,
      dustCount: 260,
      stormCount: 240,
      starCount: 650,
      lightCullDist: 34,
    };
  }

  if (tier === 'tablet') {
    const initialPpr = Math.min(dpr, isLowEndHardware ? 1.15 : 1.3);
    return {
      tier,
      isTouch: true,
      initialPixelRatio: initialPpr,
      minPixelRatio: 0.85,
      maxPixelRatio: Math.min(dpr, 1.35),
      antialias: !isLowEndHardware,
      shadowMapType: THREE.PCFShadowMap,
      shadowMapSize: 768,
      shadowFrustum: 42,
      shadowUpdateInterval: isLowEndHardware ? 2 : 1,
      terrainSegments: 116,
      dustCount: 400,
      stormCount: 360,
      starCount: 950,
      lightCullDist: 42,
    };
  }

  // Laptop / Desktop
  const initialPpr = Math.min(dpr, isLowEndHardware ? 1.25 : 1.5);
  return {
    tier: 'laptop',
    isTouch,
    initialPixelRatio: initialPpr,
    minPixelRatio: 0.9,
    maxPixelRatio: Math.min(dpr, 1.5),
    antialias: true,
    shadowMapType: isLowEndHardware ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap,
    shadowMapSize: isLowEndHardware ? 768 : 1024,
    shadowFrustum: 48,
    shadowUpdateInterval: 1,
    terrainSegments: 140,
    dustCount: 650,
    stormCount: 550,
    starCount: 1400,
    lightCullDist: 55,
  };
}
