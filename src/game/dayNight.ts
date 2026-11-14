import * as THREE from 'three';
import { DayNightData, TimeOfDayPhase } from '../types/game';

export interface DayNightCallbacks {
  onTimeUpdate: (data: DayNightData) => void;
}

export class DayNightSystem {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDome: THREE.Mesh;
  private phobos: THREE.Mesh;
  private deimos: THREE.Mesh;
  private callbacks: DayNightCallbacks;

  // Time tracking: Sol time in hours (0.00 to 24.00), starts at 11:30 AM
  private timeOfSol: number = 11.5;
  // 1 Martian Sol = 200 seconds of real-time
  private solDurationSeconds: number = 200;
  private isPaused: boolean = false;
  private uiThrottleTimer: number = 0;
  private lastEmittedTimeFormatted: string = '';

  private starPoints: THREE.Points;
  private starGeo: THREE.BufferGeometry;
  private starMat: THREE.PointsMaterial;
  private starCount: number;
  private lastMoonNightState: boolean | null = null;

  // Reusable colors and vectors to avoid GC in animation loop
  private readonly colorTempA = new THREE.Color();
  private readonly colorTempB = new THREE.Color();
  private readonly sunPos = new THREE.Vector3();

  // Baseline target values computed for the current time
  public currentSunIntensity: number = 2.2;
  public currentSunColor: THREE.Color = new THREE.Color(0xffe2b8);
  public currentHemiIntensity: number = 1.1;
  public currentHemiSkyColor: THREE.Color = new THREE.Color(0xffb085);
  public currentHemiGroundColor: THREE.Color = new THREE.Color(0x5a1d0f);
  public currentFogDensity: number = 0.0095;
  public currentFogColor: THREE.Color = new THREE.Color(0xc85528);
  public currentSkyTint: THREE.Color = new THREE.Color(0xffffff);
  public isNight: boolean = false;
  public currentPhase: TimeOfDayPhase = 'day';

  constructor(
    scene: THREE.Scene,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    skyDome: THREE.Mesh,
    phobos: THREE.Mesh,
    deimos: THREE.Mesh,
    callbacks: DayNightCallbacks,
    starCount: number = 1400
  ) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.skyDome = skyDome;
    this.phobos = phobos;
    this.deimos = deimos;
    this.callbacks = callbacks;
    this.starCount = starCount;

    // Create Cosmic Night Starfield
    const { points, geo, mat } = this.createStarfield();
    this.starPoints = points;
    this.starGeo = geo;
    this.starMat = mat;
    this.scene.add(this.starPoints);

    // Initial update to calibrate lighting
    this.computeLighting(0);
  }

  private createStarfield() {
    const starCount = this.starCount;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars on a wide celestial sphere (radius ~260)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 260;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 15; // upper hemisphere
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Realistic celestial star temperatures (blue-white, gold, warm white)
      const starType = Math.random();
      if (starType > 0.8) {
        colors[i * 3] = 0.75;
        colors[i * 3 + 1] = 0.88;
        colors[i * 3 + 2] = 1.0; // Blue giant
      } else if (starType > 0.5) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.65; // Yellow-gold
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.98;
        colors[i * 3 + 2] = 0.95; // White
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Star point sprite
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255, 255, 255, 1)');
      g.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    return { points, geo, mat };
  }

  public setTimeOfSol(hours: number) {
    this.timeOfSol = ((hours % 24) + 24) % 24;
  }

  public cycleNextPhase() {
    // Jump between key evocative atmospheric times:
    // Day (12:00) -> Sunset (18:30) -> Night (23:00) -> Dawn (06:00)
    if (this.timeOfSol >= 4 && this.timeOfSol < 10) {
      this.timeOfSol = 12.0; // Day
    } else if (this.timeOfSol >= 10 && this.timeOfSol < 17) {
      this.timeOfSol = 18.5; // Sunset
    } else if (this.timeOfSol >= 17 && this.timeOfSol < 22) {
      this.timeOfSol = 23.0; // Night
    } else {
      this.timeOfSol = 6.0; // Dawn
    }
  }

  public update(delta: number) {
    if (!this.isPaused) {
      // Advance Sol time: 24 Sol hours over solDurationSeconds
      const hoursPerSec = 24 / this.solDurationSeconds;
      this.timeOfSol = (this.timeOfSol + delta * hoursPerSec) % 24;
    }

    this.computeLighting(delta);

    // Rotate starfield gently with Mars axial rotation
    this.starPoints.rotation.y += 0.008 * delta;

    // Send formatted readout to UI (throttled to 4 Hz or on minute change)
    this.uiThrottleTimer += delta;
    const hours = Math.floor(this.timeOfSol);
    const mins = Math.floor((this.timeOfSol % 1) * 60);
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    if (this.uiThrottleTimer >= 0.25 || timeFormatted !== this.lastEmittedTimeFormatted) {
      this.uiThrottleTimer = 0;
      this.lastEmittedTimeFormatted = timeFormatted;

      const solarProgress = this.timeOfSol / 24;
      const sunElevationDeg = Math.round((this.sunPos.y / 115) * 90);

      const phaseNames: Record<TimeOfDayPhase, string> = {
        dawn: 'Martian Dawn',
        day: 'Martian Sol Day',
        dusk: 'Twilight & Sunset',
        night: 'Cosmic Night',
      };

      const data: DayNightData = {
        timeOfSol: Number(this.timeOfSol.toFixed(2)),
        timeFormatted,
        phase: this.currentPhase,
        phaseName: phaseNames[this.currentPhase],
        solarProgress: Number(solarProgress.toFixed(3)),
        isNight: this.isNight,
        sunElevationDeg,
      };

      this.callbacks.onTimeUpdate(data);
    }
  }

  private computeLighting(delta: number) {
    // Solar angle: 0h = midnight (-PI/2), 6h = dawn (0), 12h = noon (PI/2), 18h = dusk (PI)
    const solarAngle = (this.timeOfSol / 24) * Math.PI * 2 - Math.PI / 2;

    this.sunPos.set(
      Math.cos(solarAngle) * 130,
      Math.sin(solarAngle) * 115,
      Math.cos(solarAngle * 0.5) * 45
    );

    // Position sun light relative to sunLight.target so player-tracking shadow frustum preserves direction
    const tx = this.sunLight.target.position.x;
    const ty = this.sunLight.target.position.y;
    const tz = this.sunLight.target.position.z;
    this.sunLight.position.set(
      tx + this.sunPos.x,
      ty + Math.max(this.sunPos.y, -30),
      tz + this.sunPos.z
    );

    const sunHeight = this.sunPos.y; // -115 to +115

    // --- Phase and State Mapping ---
    if (this.timeOfSol >= 5.0 && this.timeOfSol < 7.5) {
      this.currentPhase = 'dawn';
      this.isNight = false;
    } else if (this.timeOfSol >= 7.5 && this.timeOfSol < 17.0) {
      this.currentPhase = 'day';
      this.isNight = false;
    } else if (this.timeOfSol >= 17.0 && this.timeOfSol < 19.5) {
      this.currentPhase = 'dusk';
      this.isNight = false;
    } else {
      this.currentPhase = 'night';
      this.isNight = true;
    }

    // --- Dynamic Color and Intensity Ramps ---
    let targetSunIntensity = 0;
    let targetHemiIntensity = 1.1;
    let targetStarOpacity = 0;

    if (sunHeight > 20) {
      // High Daytime Sun
      const dayFactor = Math.min((sunHeight - 20) / 75, 1);
      targetSunIntensity = THREE.MathUtils.lerp(1.5, 2.3, dayFactor);
      targetHemiIntensity = THREE.MathUtils.lerp(0.85, 1.18, dayFactor);

      this.currentSunColor.set('#fff2dd');
      this.currentHemiSkyColor.set('#ffb085');
      this.currentHemiGroundColor.set('#5a1d0f');
      this.currentFogColor.set('#c85528');
      this.currentFogDensity = 0.0095;
      this.currentSkyTint.set('#ffffff');
      targetStarOpacity = 0.0;
    } else if (sunHeight > -5) {
      // Sunset / Dusk or Sunrise / Dawn (Famous Mars blue sunset / twilight scattering!)
      const twilightFactor = (sunHeight + 5) / 25; // 0 to 1

      targetSunIntensity = THREE.MathUtils.lerp(0.08, 1.5, twilightFactor);
      targetHemiIntensity = THREE.MathUtils.lerp(0.45, 0.85, twilightFactor);

      if (this.currentPhase === 'dusk' || this.currentPhase === 'night') {
        // Mars Sunset: rich bronze & twilight blue
        this.colorTempA.set('#ff9450');
        this.colorTempB.set('#fff2dd');
        this.currentSunColor.lerpColors(this.colorTempA, this.colorTempB, twilightFactor);

        this.colorTempA.set('#783828');
        this.colorTempB.set('#ffb085');
        this.currentHemiSkyColor.lerpColors(this.colorTempA, this.colorTempB, twilightFactor);

        this.colorTempA.set('#200d08');
        this.colorTempB.set('#5a1d0f');
        this.currentHemiGroundColor.lerpColors(this.colorTempA, this.colorTempB, twilightFactor);

        this.colorTempA.set('#5a2218');
        this.colorTempB.set('#c85528');
        this.currentFogColor.lerpColors(this.colorTempA, this.colorTempB, twilightFactor);
        this.currentFogDensity = THREE.MathUtils.lerp(0.0105, 0.0095, twilightFactor);

        this.colorTempA.set('#954e38');
        this.colorTempB.set('#ffffff');
        this.currentSkyTint.lerpColors(this.colorTempA, this.colorTempB, twilightFactor);

        targetStarOpacity = (1 - twilightFactor) * 0.7;
      } else {
        // Mars Dawn: soft peach amber
        this.currentSunColor.set('#ffab70');
        this.currentHemiSkyColor.set('#a05942');
        this.currentHemiGroundColor.set('#361208');
        this.currentFogColor.set('#7a3320');
        this.currentFogDensity = 0.010;
        this.currentSkyTint.set('#cc8060');
        targetStarOpacity = (1 - twilightFactor) * 0.6;
      }
    } else {
      // Cosmic Night
      targetSunIntensity = 0.02; // Faint moonlight bounce
      targetHemiIntensity = 0.34; // Deep cosmic starlight

      this.currentSunColor.set('#7888b0'); // Cool moonlight
      this.currentHemiSkyColor.set('#24304c'); // Starry indigo sky
      this.currentHemiGroundColor.set('#0d0a0c'); // Dark regolith
      this.currentFogColor.set('#160f1c'); // Midnight atmosphere
      this.currentFogDensity = 0.0078; // Crisp starlight horizon
      this.currentSkyTint.set('#1a1226'); // Dark cosmic dome
      targetStarOpacity = 0.95;
    }

    // Smooth interpolation on actual scene nodes
    if (delta > 0) {
      this.currentSunIntensity = THREE.MathUtils.damp(
        this.currentSunIntensity,
        targetSunIntensity,
        3.5,
        delta
      );
      this.currentHemiIntensity = THREE.MathUtils.damp(
        this.currentHemiIntensity,
        targetHemiIntensity,
        3.5,
        delta
      );
      this.starMat.opacity = THREE.MathUtils.damp(
        this.starMat.opacity,
        targetStarOpacity,
        3.0,
        delta
      );
    } else {
      this.currentSunIntensity = targetSunIntensity;
      this.currentHemiIntensity = targetHemiIntensity;
      this.starMat.opacity = targetStarOpacity;
    }

    // Skip vertex/fragment draw of starfield during bright Martian day
    this.starPoints.visible = this.starMat.opacity > 0.015;

    // Tint Sky Dome Material
    const skyMat = this.skyDome.material as THREE.MeshBasicMaterial;
    if (skyMat) {
      skyMat.color.copy(this.currentSkyTint);
    }

    // Moons emissive response at night (update only when night state flips)
    if (this.lastMoonNightState !== this.isNight) {
      this.lastMoonNightState = this.isNight;
      const phobosMat = this.phobos.material as THREE.MeshStandardMaterial;
      const deimosMat = this.deimos.material as THREE.MeshStandardMaterial;
      if (phobosMat && deimosMat) {
        if (this.isNight) {
          phobosMat.emissive.setHex(0x384255);
          deimosMat.emissive.setHex(0x283040);
        } else {
          phobosMat.emissive.setHex(0x000000);
          deimosMat.emissive.setHex(0x000000);
        }
      }
    }
  }

  public dispose() {
    this.starGeo.dispose();
    this.starMat.dispose();
    this.scene.remove(this.starPoints);
  }
}
