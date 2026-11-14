import * as THREE from 'three';
import { WeatherData, WeatherType } from '../types/game';
import { sounds } from '../audio/SoundEffects';

export interface BaseLightingConditions {
  sunIntensity: number;
  sunColor: THREE.Color;
  hemiIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  fogDensity: number;
  fogColor: THREE.Color;
}

export interface WeatherSystemCallbacks {
  onWeatherUpdate: (weather: WeatherData) => void;
  onStormWarning?: (secondsLeft: number) => void;
  onStormStart?: () => void;
  onStormEnd?: () => void;
}

export class WeatherSystem {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private callbacks: WeatherSystemCallbacks;

  // Weather States
  private state: WeatherType = 'clear';
  private timer: number = 45; // Start in calm weather for 45 seconds
  private stateDuration: number = 45;
  private intensity: number = 0; // 0.0 to 1.0
  private targetIntensity: number = 0;

  // Baseline Environment Visuals
  private readonly defaultFogDensity = 0.0095;
  private readonly stormFogDensity = 0.052;
  private readonly defaultFogColor = new THREE.Color(0xc85528);
  private readonly stormFogColor = new THREE.Color(0x8c280b);
  private readonly defaultSunIntensity = 2.2;
  private readonly stormSunIntensity = 0.65;
  private readonly defaultHemiIntensity = 1.1;
  private readonly stormHemiIntensity = 0.55;

  // Storm Sand Streak Particles (optimized count for locked 60 FPS)
  private stormParticles: THREE.Points;
  private stormGeo: THREE.BufferGeometry;
  private stormMat: THREE.PointsMaterial;
  private stormVelocities: Float32Array;
  private particleCount = 550;

  // Shelter state
  private isSheltered: boolean = false;
  private isUnderground: boolean = false;

  // UI emission throttling to eliminate React re-render lag
  private uiThrottleTimer: number = 0;
  private lastEmittedSecs: number = -1;
  private lastEmittedState: WeatherType = 'clear';

  constructor(
    scene: THREE.Scene,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    callbacks: WeatherSystemCallbacks,
    particleCount: number = 550
  ) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.callbacks = callbacks;
    this.particleCount = particleCount;

    // Initialize Storm Sand & Grit Particle System
    const { points, geo, mat, velocities } = this.createStormParticleSystem();
    this.stormParticles = points;
    this.stormGeo = geo;
    this.stormMat = mat;
    this.stormVelocities = velocities;
    this.scene.add(this.stormParticles);
  }

  private createStormParticleSystem() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      // Strong gale blowing East-Southeast
      velocities[i * 3] = 18 + Math.random() * 16;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 4;
      velocities[i * 3 + 2] = 8 + Math.random() * 10;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Elongated streak for blowing sand
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 170, 100, 0.95)');
      grad.addColorStop(0.4, 'rgba(220, 80, 30, 0.6)');
      grad.addColorStop(1, 'rgba(180, 50, 15, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.PointsMaterial({
      size: 1.6,
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    return { points, geo, mat, velocities };
  }

  public setSheltered(sheltered: boolean) {
    this.isSheltered = sheltered;
  }

  public setUnderground(underground: boolean) {
    this.isUnderground = underground;
    if (underground) {
      this.stormParticles.visible = false;
    }
  }

  public triggerStormNow() {
    this.state = 'warning';
    this.timer = 6;
    this.stateDuration = 6;
    this.targetIntensity = 0.3;
    sounds.playStormWarning();
    this.callbacks.onStormWarning?.(6);
  }

  public update(delta: number, playerPosition: THREE.Vector3, baseLighting?: BaseLightingConditions) {
    this.timer -= delta;

    // --- Weather State Machine ---
    if (this.timer <= 0) {
      switch (this.state) {
        case 'clear':
          // Transition to Storm Warning
          this.state = 'warning';
          this.stateDuration = 8;
          this.timer = this.stateDuration;
          this.targetIntensity = 0.35;
          sounds.playStormWarning();
          this.callbacks.onStormWarning?.(8);
          break;

        case 'warning':
          // Transition to Full Dust Storm
          this.state = 'storm';
          this.stateDuration = 24 + Math.random() * 8; // 24-32s storm
          this.timer = this.stateDuration;
          this.targetIntensity = 1.0;
          this.callbacks.onStormStart?.();
          break;

        case 'storm':
          // Transition to Clearing
          this.state = 'clearing';
          this.stateDuration = 6;
          this.timer = this.stateDuration;
          this.targetIntensity = 0.15;
          sounds.playStormClearing();
          break;

        case 'clearing':
          // Transition back to Calm Clear Weather
          this.state = 'clear';
          this.stateDuration = 50 + Math.random() * 25; // 50-75s calm
          this.timer = this.stateDuration;
          this.targetIntensity = 0;
          this.callbacks.onStormEnd?.();
          break;
      }
    }

    // Smoothly interpolate intensity
    this.intensity = THREE.MathUtils.damp(this.intensity, this.targetIntensity, 3.5, delta);

    // Audio wind modulation
    sounds.setStormWindIntensity(this.intensity);

    // --- Visual Environment Modulation (Coordinated with Day/Night) ---
    // 1. Fog Modulation (Visibility drops in storm)
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      const baseFogDensity = baseLighting ? baseLighting.fogDensity : this.defaultFogDensity;
      const targetDensity = THREE.MathUtils.lerp(
        baseFogDensity,
        this.stormFogDensity,
        this.intensity
      );
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, targetDensity, 4, delta);

      const baseFogColor = baseLighting ? baseLighting.fogColor : this.defaultFogColor;
      this.scene.fog.color.lerpColors(baseFogColor, this.stormFogColor, this.intensity);
    }

    // 2. Sunlight & Sky Lighting
    const baseSun = baseLighting ? baseLighting.sunIntensity : this.defaultSunIntensity;
    const targetSun = baseSun * (1 - this.intensity * 0.72);
    this.sunLight.intensity = THREE.MathUtils.damp(this.sunLight.intensity, targetSun, 4, delta);
    if (baseLighting) {
      this.sunLight.color.copy(baseLighting.sunColor);
    }

    const baseHemi = baseLighting ? baseLighting.hemiIntensity : this.defaultHemiIntensity;
    const targetHemi = baseHemi * (1 - this.intensity * 0.55);
    this.hemiLight.intensity = THREE.MathUtils.damp(this.hemiLight.intensity, targetHemi, 4, delta);
    if (baseLighting) {
      this.hemiLight.color.copy(baseLighting.hemiSkyColor);
      this.hemiLight.groundColor.copy(baseLighting.hemiGroundColor);
    }

    // 3. Storm Particles Update
    this.updateStormParticles(delta, playerPosition);

    // --- Metrics for Gameplay and HUD (only compute full object at 4 Hz throttle or state change) ---
    const remainingSecs = Math.max(0, Math.ceil(this.timer));
    this.uiThrottleTimer += delta;
    if (
      this.uiThrottleTimer >= 0.25 ||
      remainingSecs !== this.lastEmittedSecs ||
      this.state !== this.lastEmittedState
    ) {
      this.uiThrottleTimer = 0;
      this.lastEmittedSecs = remainingSecs;
      this.lastEmittedState = this.state;

      const visibilityMeters = Math.round(THREE.MathUtils.lerp(180, 28, this.intensity));
      let oxygenMultiplier = 1.0;
      if (this.intensity > 0.1) {
        oxygenMultiplier = this.isSheltered ? 1.0 : 1.0 + this.intensity * 1.5;
      }

      let upcomingEvent = 'Approaching Dust Storm';
      let threatLevel: 'nominal' | 'low' | 'moderate' | 'high' | 'critical' = 'nominal';
      let barometricPressure = 6.12;
      let pressureTrend: 'falling' | 'steady' | 'rising' = 'steady';
      let expectedVisibility = 28;
      let expectedO2Drain = 2.5;
      let safetyAdvisory = 'Atmosphere clear and stable. Safe for crystal harvesting and surveying.';

      if (this.state === 'clear') {
        expectedVisibility = 28;
        expectedO2Drain = 2.5;
        if (remainingSecs <= 15) {
          upcomingEvent = 'Imminent Dust Storm';
          threatLevel = 'high';
          pressureTrend = 'falling';
          barometricPressure = Number((5.65 - (1 - remainingSecs / 15) * 0.35).toFixed(2));
          safetyAdvisory = 'CRITICAL: Dust front arriving fast. Seek shelter inside Base Station or Rover!';
        } else if (remainingSecs <= 30) {
          upcomingEvent = 'Approaching Dust Storm';
          threatLevel = 'moderate';
          pressureTrend = 'falling';
          barometricPressure = Number((5.95 - (1 - remainingSecs / 30) * 0.30).toFixed(2));
          safetyAdvisory = 'CAUTION: Barometric pressure dropping. Prepare to halt EVA tasks.';
        } else {
          upcomingEvent = 'Approaching Dust Storm';
          threatLevel = 'nominal';
          pressureTrend = 'steady';
          barometricPressure = Number((6.12 - (1 - remainingSecs / Math.max(1, this.stateDuration)) * 0.17).toFixed(2));
          safetyAdvisory = 'Atmosphere clear and stable. Safe for crystal harvesting and surveying.';
        }
      } else if (this.state === 'warning') {
        upcomingEvent = 'Severe Dust Storm Impact';
        threatLevel = 'critical';
        pressureTrend = 'falling';
        barometricPressure = Number((5.35 - (1 - remainingSecs / Math.max(1, this.stateDuration)) * 0.15).toFixed(2));
        expectedVisibility = 28;
        expectedO2Drain = 2.5;
        safetyAdvisory = 'IMMEDIATE ACTION: Gale touchdown in progress! Board Rover [28, -24] or enter Base Station [-40, -32].';
      } else if (this.state === 'storm') {
        upcomingEvent = 'Atmospheric Clearing';
        threatLevel = this.isSheltered ? 'low' : 'critical';
        pressureTrend = 'rising';
        barometricPressure = Number((5.20 + (1 - remainingSecs / Math.max(1, this.stateDuration)) * 0.60).toFixed(2));
        expectedVisibility = 180;
        expectedO2Drain = 1.0;
        safetyAdvisory = this.isSheltered
          ? 'Shelter secure: O2 drain normalized at 1.0×. Awaiting atmospheric clearing.'
          : 'WARNING: Unsheltered in severe storm! 2.5× O2 drain active! Enter shelter now!';
      } else if (this.state === 'clearing') {
        upcomingEvent = 'Nominal Mars Conditions';
        threatLevel = 'nominal';
        pressureTrend = 'rising';
        barometricPressure = Number((5.80 + (1 - remainingSecs / Math.max(1, this.stateDuration)) * 0.32).toFixed(2));
        expectedVisibility = 180;
        expectedO2Drain = 1.0;
        safetyAdvisory = 'Atmosphere stabilizing. Gale winds departing. EVA exploration cleared.';
      }

      const weatherData: WeatherData = {
        type: this.state,
        name:
          this.state === 'storm'
            ? 'Dust Storm (Severe)'
            : this.state === 'warning'
            ? 'Approaching Dust Storm'
            : this.state === 'clearing'
            ? 'Storm Passing'
            : 'Clear Atmospheric Skies',
        intensity: this.intensity,
        visibilityMeters,
        oxygenMultiplier: Number(oxygenMultiplier.toFixed(2)),
        timeRemaining: remainingSecs,
        isSheltered: this.isSheltered,
        forecast: {
          upcomingEvent,
          secondsUntil: remainingSecs,
          threatLevel,
          barometricPressure,
          pressureTrend,
          expectedVisibility,
          expectedO2Drain,
          safetyAdvisory,
        },
      };

      this.callbacks.onWeatherUpdate(weatherData);
    }
  }

  private updateStormParticles(delta: number, playerPos: THREE.Vector3) {
    // Center particle box around player position
    this.stormParticles.position.x = playerPos.x;
    this.stormParticles.position.z = playerPos.z;

    // Opacity tied directly to storm intensity; skip rendering when clear or underground
    this.stormMat.opacity = this.intensity * 0.85;
    const isVisible = !this.isUnderground && this.stormMat.opacity >= 0.02;
    this.stormParticles.visible = isVisible;

    if (!isVisible) return;

    const posAttr = this.stormGeo.attributes.position as THREE.BufferAttribute;
    const p = posAttr.array as Float32Array;
    const v = this.stormVelocities;

    const bound = 45;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      p[idx] += v[idx] * delta;
      p[idx + 1] += v[idx + 1] * delta;
      p[idx + 2] += v[idx + 2] * delta;

      // Wrap around bounding box centered on player
      if (p[idx] > bound) p[idx] = -bound;
      if (p[idx] < -bound) p[idx] = bound;

      if (p[idx + 2] > bound) p[idx + 2] = -bound;
      if (p[idx + 2] < -bound) p[idx + 2] = bound;

      if (p[idx + 1] > 22) p[idx + 1] = 0.5;
      if (p[idx + 1] < 0.2) p[idx + 1] = 20;
    }

    posAttr.needsUpdate = true;
  }

  public getOxygenMultiplier(): number {
    if (this.isSheltered) return 1.0;
    return 1.0 + this.intensity * 1.5;
  }

  public getCurrentState(): WeatherType {
    return this.state;
  }

  public getIntensity(): number {
    return this.intensity;
  }

  public dispose() {
    this.stormGeo.dispose();
    this.stormMat.dispose();
    this.scene.remove(this.stormParticles);
  }
}
