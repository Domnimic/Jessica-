import {
  AudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  MusicContext,
  MusicTrackChoice,
} from '../types/audio';
import { voiceAssistant } from './VoiceAssistant';

const AUDIO_STORAGE_KEY = 'mars_audio_settings_v1';

interface MusicThemeConfig {
  title: string;
  padFreqs: number[];
  chordProgression: number[][];
  chordStepSpan: number;
  filterFreq: number;
  filterPeakFreq: number;
  padGain: number;
  notes: number[];
  harmonyNotes?: number[];
  noteType: OscillatorType;
  harmonyType?: OscillatorType;
  noteIntervalMs: number;
  noteGain: number;
  noteDur: number;
  bassFreq?: number;
  bassNotes?: number[];
  pulseBass?: boolean;
  bassIntervalMod?: number;
  pluckCutoff?: number;
  softPulse?: boolean;
  echoSend?: number;
}

const VALID_MUSIC_TRACK_CHOICES = new Set<MusicTrackChoice>([
  'auto',
  'menu',
  'exploration',
  'astroneer_chill',
  'survival',
  'survival_low_o2',
  'mission',
  'research_base',
  'final_mission',
  'victory',
]);

const MUSIC_THEMES: Record<Exclude<MusicContext, 'silent'>, MusicThemeConfig> = {
  menu: {
    // MAIN MENU – SPACE DREAMS: Cinematic Space Ambient (Dm -> Bbmaj7 -> Fmaj7 -> Asus4)
    title: 'Space Dreams',
    padFreqs: [146.83, 220.0, 293.66], // D3, A3, D4
    chordProgression: [
      [146.83, 220.0, 349.23], // Dm (D3, A3, F4)
      [116.54, 174.61, 293.66], // Bbmaj7 (Bb2, F3, D4)
      [174.61, 220.0, 329.63], // Fmaj7 (F3, A3, E4)
      [164.81, 220.0, 329.63], // Asus4 (E3, A3, E4)
    ],
    chordStepSpan: 4,
    filterFreq: 320,
    filterPeakFreq: 540,
    padGain: 0.11,
    notes: [
      440.0, 523.25, 587.33, 659.25,
      587.33, 440.0, 349.23, 440.0,
      523.25, 659.25, 698.46, 587.33,
      523.25, 440.0, 392.0, 440.0,
    ],
    harmonyNotes: [293.66, 349.23, 261.63, 329.63],
    noteType: 'sine',
    harmonyType: 'triangle',
    noteIntervalMs: 1120,
    noteGain: 0.042,
    noteDur: 1.55,
    bassFreq: 73.42,
    bassNotes: [73.42, 58.27, 87.31, 82.41],
    pulseBass: true,
    bassIntervalMod: 4,
    pluckCutoff: 1450,
    echoSend: 0.36,
  },
  exploration: {
    // EXPLORATION MODE – THE UNKNOWN PLANET: Wondrous Martian Discovery (Cmaj9 -> D/C -> Am9 -> Gmaj7)
    title: 'The Unknown Planet',
    padFreqs: [130.81, 196.0, 261.63],
    chordProgression: [
      [130.81, 196.0, 293.66], // Cmaj9
      [130.81, 220.0, 293.66], // D/C Lydian
      [110.0, 164.81, 246.94], // Am9
      [123.47, 196.0, 293.66], // Gmaj7
    ],
    chordStepSpan: 4,
    filterFreq: 360,
    filterPeakFreq: 620,
    padGain: 0.105,
    notes: [
      392.0, 493.88, 523.25, 659.25,
      587.33, 523.25, 440.0, 392.0,
      329.63, 440.0, 523.25, 587.33,
      493.88, 392.0, 329.63, 293.66,
    ],
    harmonyNotes: [261.63, 293.66, 220.0, 246.94],
    noteType: 'sine',
    harmonyType: 'triangle',
    noteIntervalMs: 960,
    noteGain: 0.044,
    noteDur: 1.38,
    bassFreq: 65.41,
    bassNotes: [65.41, 73.42, 55.0, 98.0],
    pulseBass: true,
    bassIntervalMod: 4,
    pluckCutoff: 1650,
    echoSend: 0.34,
  },
  astroneer_chill: {
    // ASTRONEER DREAMS: Warm cozy sci-fi analog kalimba plucks & dreamy chords (F#m9 -> Dmaj9 -> A -> E)
    title: 'Astroneer Dreams',
    padFreqs: [185.0, 277.18, 369.99],
    chordProgression: [
      [185.0, 220.0, 329.63], // F#m7
      [146.83, 220.0, 329.63], // Dmaj9
      [110.0, 220.0, 277.18], // A
      [164.81, 246.94, 329.63], // E
    ],
    chordStepSpan: 4,
    filterFreq: 380,
    filterPeakFreq: 680,
    padGain: 0.115,
    notes: [
      440.0, 554.37, 659.25, 830.61,
      659.25, 554.37, 493.88, 659.25,
      554.37, 440.0, 493.88, 659.25,
      554.37, 493.88, 415.30, 493.88,
    ],
    harmonyNotes: [277.18, 329.63, 220.0, 246.94],
    noteType: 'triangle',
    harmonyType: 'sine',
    noteIntervalMs: 980,
    noteGain: 0.045,
    noteDur: 1.55,
    bassFreq: 92.5,
    bassNotes: [92.5, 73.42, 110.0, 82.41],
    pulseBass: true,
    bassIntervalMod: 4,
    pluckCutoff: 1350,
    echoSend: 0.42,
  },
  survival: {
    // SURVIVAL MODE – BEYOND THE DANGER: Moody deep-space suspense (Am -> Fmaj7 -> Dm9 -> Em7)
    title: 'Beyond the Danger',
    padFreqs: [110.0, 164.81, 220.0],
    chordProgression: [
      [110.0, 164.81, 261.63], // Am
      [174.61, 220.0, 261.63], // F
      [146.83, 220.0, 261.63], // Dm7
      [164.81, 196.0, 246.94], // Em
    ],
    chordStepSpan: 4,
    filterFreq: 260,
    filterPeakFreq: 440,
    padGain: 0.105,
    notes: [
      261.63, 329.63, 293.66, 220.0,
      261.63, 349.23, 329.63, 261.63,
      293.66, 392.0, 349.23, 293.66,
      329.63, 293.66, 246.94, 220.0,
    ],
    harmonyNotes: [164.81, 174.61, 146.83, 164.81],
    noteType: 'sine',
    harmonyType: 'triangle',
    noteIntervalMs: 880,
    noteGain: 0.042,
    noteDur: 1.05,
    bassFreq: 110.0,
    bassNotes: [55.0, 87.31, 73.42, 82.41],
    pulseBass: true,
    bassIntervalMod: 2,
    pluckCutoff: 1150,
    softPulse: true,
    echoSend: 0.3,
  },
  survival_low_o2: {
    // SURVIVAL MODE – BEYOND THE DANGER (LOW OXYGEN): Heightened rhythmic urgency (still warm & safe)
    title: 'Beyond the Danger (Low O2)',
    padFreqs: [130.81, 174.61, 220.0],
    chordProgression: [
      [110.0, 164.81, 261.63],
      [116.54, 174.61, 293.66],
      [146.83, 196.0, 261.63],
      [164.81, 220.0, 293.66],
    ],
    chordStepSpan: 4,
    filterFreq: 310,
    filterPeakFreq: 560,
    padGain: 0.11,
    notes: [349.23, 392.0, 440.0, 392.0, 349.23, 523.25, 440.0, 392.0],
    harmonyNotes: [220.0, 233.08, 261.63, 246.94],
    noteType: 'triangle',
    harmonyType: 'sine',
    noteIntervalMs: 640,
    noteGain: 0.044,
    noteDur: 0.72,
    bassFreq: 110.0,
    bassNotes: [55.0, 58.27, 73.42, 82.41],
    pulseBass: true,
    bassIntervalMod: 2,
    pluckCutoff: 1450,
    softPulse: true,
    echoSend: 0.24,
  },
  mission: {
    // MISSION MODE – THE FINAL EXPEDITION: Inspiring adventure theme (Fmaj7 -> C/E -> Dm7 -> Bbmaj9)
    title: 'The Final Expedition',
    padFreqs: [174.61, 261.63, 349.23],
    chordProgression: [
      [174.61, 261.63, 329.63], // Fmaj7
      [164.81, 261.63, 392.0], // C/E
      [146.83, 220.0, 349.23], // Dm
      [116.54, 174.61, 293.66], // Bbmaj7
    ],
    chordStepSpan: 4,
    filterFreq: 400,
    filterPeakFreq: 720,
    padGain: 0.11,
    notes: [
      349.23, 440.0, 523.25, 659.25,
      587.33, 523.25, 440.0, 392.0,
      440.0, 523.25, 587.33, 698.46,
      659.25, 587.33, 523.25, 440.0,
    ],
    harmonyNotes: [261.63, 329.63, 293.66, 349.23],
    noteType: 'triangle',
    harmonyType: 'sine',
    noteIntervalMs: 740,
    noteGain: 0.046,
    noteDur: 0.98,
    bassFreq: 87.31,
    bassNotes: [87.31, 82.41, 73.42, 58.27],
    pulseBass: true,
    bassIntervalMod: 2,
    pluckCutoff: 1750,
    softPulse: true,
    echoSend: 0.34,
  },
  research_base: {
    // RESEARCH BASE – FUTURE SCIENCE: Glassy orbital laboratory (Em9 -> Cmaj7 -> G6 -> Dadd9)
    title: 'Future Science',
    padFreqs: [164.81, 246.94, 329.63],
    chordProgression: [
      [164.81, 246.94, 369.99], // Em9
      [130.81, 196.0, 329.63], // Cmaj7
      [196.0, 246.94, 329.63], // G6
      [146.83, 220.0, 369.99], // D
    ],
    chordStepSpan: 4,
    filterFreq: 350,
    filterPeakFreq: 590,
    padGain: 0.095,
    notes: [
      493.88, 659.25, 739.99, 587.33,
      659.25, 523.25, 392.0, 523.25,
      493.88, 587.33, 659.25, 783.99,
      659.25, 587.33, 493.88, 440.0,
    ],
    harmonyNotes: [329.63, 392.0, 329.63, 293.66],
    noteType: 'sine',
    harmonyType: 'sine',
    noteIntervalMs: 920,
    noteGain: 0.036,
    noteDur: 1.05,
    bassFreq: 82.41,
    bassNotes: [82.41, 65.41, 98.0, 73.42],
    pulseBass: true,
    bassIntervalMod: 4,
    pluckCutoff: 1900,
    echoSend: 0.38,
  },
  final_mission: {
    // FINAL MISSION – CONTACT EARTH: Emotional soaring build (C -> G/B -> Am7 -> Fmaj9)
    title: 'Contact Earth',
    padFreqs: [196.0, 261.63, 329.63],
    chordProgression: [
      [130.81, 261.63, 392.0], // C
      [123.47, 246.94, 392.0], // G/B
      [110.0, 220.0, 329.63], // Am7
      [174.61, 261.63, 392.0], // Fmaj9
    ],
    chordStepSpan: 4,
    filterFreq: 440,
    filterPeakFreq: 800,
    padGain: 0.115,
    notes: [
      392.0, 523.25, 659.25, 783.99,
      659.25, 587.33, 493.88, 587.33,
      523.25, 659.25, 783.99, 880.0,
      783.99, 659.25, 587.33, 523.25,
    ],
    harmonyNotes: [261.63, 246.94, 220.0, 261.63],
    noteType: 'triangle',
    harmonyType: 'sine',
    noteIntervalMs: 680,
    noteGain: 0.048,
    noteDur: 1.05,
    bassFreq: 65.41,
    bassNotes: [65.41, 61.74, 55.0, 87.31],
    pulseBass: true,
    bassIntervalMod: 2,
    pluckCutoff: 2000,
    softPulse: true,
    echoSend: 0.38,
  },
  victory: {
    // VICTORY – A NEW BEGINNING: Radiant uplifting finale (Cmaj9 -> Fmaj7 -> G6 -> Cmaj9)
    title: 'A New Beginning',
    padFreqs: [130.81, 196.0, 261.63],
    chordProgression: [
      [130.81, 196.0, 329.63],
      [174.61, 261.63, 329.63],
      [196.0, 293.66, 392.0],
      [130.81, 261.63, 392.0],
    ],
    chordStepSpan: 4,
    filterFreq: 480,
    filterPeakFreq: 880,
    padGain: 0.12,
    notes: [
      523.25, 659.25, 783.99, 1046.5,
      880.0, 783.99, 659.25, 783.99,
      783.99, 880.0, 987.77, 1174.66,
      1046.5, 987.77, 783.99, 659.25,
    ],
    harmonyNotes: [392.0, 440.0, 493.88, 523.25],
    noteType: 'sine',
    harmonyType: 'triangle',
    noteIntervalMs: 600,
    noteGain: 0.052,
    noteDur: 1.15,
    bassFreq: 65.41,
    bassNotes: [65.41, 87.31, 98.0, 65.41],
    pulseBass: true,
    bassIntervalMod: 2,
    pluckCutoff: 2400,
    softPulse: true,
    echoSend: 0.42,
  },
};

function loadSavedAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    const trackChoice = parsed.musicTrack && VALID_MUSIC_TRACK_CHOICES.has(parsed.musicTrack)
      ? parsed.musicTrack
      : DEFAULT_AUDIO_SETTINGS.musicTrack;
    return {
      masterVolume: clamp01(parsed.masterVolume ?? DEFAULT_AUDIO_SETTINGS.masterVolume),
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULT_AUDIO_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume),
      voiceVolume: clamp01(parsed.voiceVolume ?? DEFAULT_AUDIO_SETTINGS.voiceVolume),
      voiceSpeed: clampVoiceSpeed(parsed.voiceSpeed ?? DEFAULT_AUDIO_SETTINGS.voiceSpeed),
      voiceLanguage: parsed.voiceLanguage === 'ms' ? 'ms' : 'en',
      muted: Boolean(parsed.muted),
      musicEnabled: parsed.musicEnabled ?? DEFAULT_AUDIO_SETTINGS.musicEnabled,
      sfxEnabled: parsed.sfxEnabled ?? DEFAULT_AUDIO_SETTINGS.sfxEnabled,
      voiceEnabled: parsed.voiceEnabled ?? DEFAULT_AUDIO_SETTINGS.voiceEnabled,
      astroneerSoundtrack: parsed.astroneerSoundtrack ?? DEFAULT_AUDIO_SETTINGS.astroneerSoundtrack,
      musicTrack: trackChoice,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function clamp01(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(1, val));
}

function clampVoiceSpeed(val: number): number {
  if (!Number.isFinite(val)) return 1.0;
  return Math.max(0.75, Math.min(1.35, Math.round(val * 100) / 100));
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = loadSavedAudioSettings();
  private listeners = new Set<(settings: AudioSettings) => void>();
  private hasUserInteracted: boolean = false;
  private isGameplayPaused: boolean = true;

  // Audio buses
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicEchoInput: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private gameplayLoopsGain: GainNode | null = null;

  // Background Music dual-deck crossfade state
  private requestedMusicContext: MusicContext = 'menu';
  private activeMusicContext: MusicContext = 'silent';
  private activeDeck: {
    context: Exclude<MusicContext, 'silent'>;
    deckGain: GainNode;
    echoSendGain: GainNode | null;
    padFilter: BiquadFilterNode | null;
    padGainNode: GainNode | null;
    padOscs: OscillatorNode[];
    bufferSource: AudioBufferSourceNode | null;
    timerId: number | null;
    fadeCleanupTimerId: number | null;
    step: number;
    disposed: boolean;
  } | null = null;
  private fadingDecks: Set<{
    context: Exclude<MusicContext, 'silent'>;
    deckGain: GainNode;
    echoSendGain: GainNode | null;
    padFilter: BiquadFilterNode | null;
    padGainNode: GainNode | null;
    padOscs: OscillatorNode[];
    bufferSource: AudioBufferSourceNode | null;
    timerId: number | null;
    fadeCleanupTimerId: number | null;
    step: number;
    disposed: boolean;
  }> = new Set();
  private isCrossfading: boolean = false;
  private lastCrossfadeDurationSec: number = 2.0;
  private crossfadeStateTimerId: number | null = null;

  // Shared noise buffer for wind, footsteps, suit rustle, O2 air, radio squelch
  private noiseBuffer: AudioBuffer | null = null;

  // Continuous gameplay loops (single instance each - no duplicates)
  private stormGain: GainNode | null = null;
  private stormFilter: BiquadFilterNode | null = null;
  private isStormAudioInit: boolean = false;

  private roverEngineGain: GainNode | null = null;
  private roverEngineOsc1: OscillatorNode | null = null;
  private roverEngineOsc2: OscillatorNode | null = null;
  private roverMoveGain: GainNode | null = null;
  private roverMoveFilter: BiquadFilterNode | null = null;
  private isRoverAudioInit: boolean = false;

  // Optional lazy-loaded external audio buffer cache (with automatic synthesis fallback)
  private externalAudioBuffers: Map<string, AudioBuffer | null> = new Map();
  private externalAudioPending: Map<string, Promise<AudioBuffer | null>> = new Map();

  private crystalAmbienceGain: GainNode | null = null;
  private crystalOsc1: OscillatorNode | null = null;
  private crystalOsc2: OscillatorNode | null = null;
  private isCrystalAudioInit: boolean = false;

  private baseAmbienceGain: GainNode | null = null;
  private baseHumOsc: OscillatorNode | null = null;
  private baseBleepTimer: number = 0;
  private currentBaseProximity: number = 0;
  private isBaseAudioInit: boolean = false;

  // Astronaut stride & breathing timers
  private strideTimer: number = 0;
  private strideFootLeft: boolean = true;
  private breathTimer: number = 1.4;
  private breathPhaseInhale: boolean = true;

  // Cooldown map to prevent rapid overlapping copies of identical SFX
  private sfxCooldowns: Map<string, number> = new Map();
  private isVoiceSpeaking: boolean = false;

  constructor() {
    voiceAssistant.syncSettings(this.settings);
    voiceAssistant.setUnlockAudioHandler(() => this.unlockAudio());
    voiceAssistant.setFallbackChime((vol, text) => this.playFallbackVoiceChime(vol, text));
    voiceAssistant.subscribeSpeaking((state) => {
      if (this.isVoiceSpeaking !== state.isSpeaking) {
        this.isVoiceSpeaking = state.isSpeaking;
        this.syncBusGains(false);
      }
    });

    if (typeof window !== 'undefined') {
      const unlockOnGesture = () => {
        this.unlockAudio();
      };
      window.addEventListener('pointerdown', unlockOnGesture, { passive: true });
      window.addEventListener('touchstart', unlockOnGesture, { passive: true });
      window.addEventListener('keydown', unlockOnGesture, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
          voiceAssistant.stopAll();
        } else if (this.hasUserInteracted) {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  private resolveEffectiveMusicContext(requested: MusicContext): MusicContext {
    if (requested === 'silent') return 'silent';
    if (this.settings.musicTrack && this.settings.musicTrack !== 'auto') {
      return this.settings.musicTrack;
    }
    return requested;
  }

  public unlockAudio() {
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
    }
    this.initContext();
    voiceAssistant.unlock();
    const target = this.resolveEffectiveMusicContext(this.requestedMusicContext);
    if (target !== 'silent') {
      this.applyMusicContext(target, 1.4);
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return;
      }
    }

    if (this.ctx.state === 'suspended' && this.hasUserInteracted) {
      this.ctx.resume().catch(() => {});
    }

    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.gameplayLoopsGain = this.ctx.createGain();

      this.musicBus.connect(this.masterGain);
      this.sfxBus.connect(this.masterGain);
      this.gameplayLoopsGain.connect(this.sfxBus);

      // Shared warm dual-tap Cosmic Space Echo bus routed into musicBus
      if (typeof this.ctx.createDelay === 'function') {
        try {
          const echoIn = this.ctx.createGain();
          const delay1 = this.ctx.createDelay(2.0);
          delay1.delayTime.value = 0.42;
          const delay2 = this.ctx.createDelay(2.0);
          delay2.delayTime.value = 0.24;

          const damp = this.ctx.createBiquadFilter();
          damp.type = 'lowpass';
          damp.frequency.value = 1750;
          damp.Q.value = 0.5;

          const feedback = this.ctx.createGain();
          feedback.gain.value = 0.38;

          const wet1 = this.ctx.createGain();
          wet1.gain.value = 0.28;
          const wet2 = this.ctx.createGain();
          wet2.gain.value = 0.16;

          echoIn.connect(delay1);
          delay1.connect(damp);
          damp.connect(feedback);
          feedback.connect(delay1);

          damp.connect(wet1);
          wet1.connect(this.musicBus);

          damp.connect(delay2);
          delay2.connect(wet2);
          wet2.connect(this.musicBus);

          this.musicEchoInput = echoIn;
        } catch {
          this.musicEchoInput = null;
        }
      }

      // Child-safe hearing protection chain: warm low-pass rolloff + gentle peak limiter
      const warmthFilter = this.ctx.createBiquadFilter();
      warmthFilter.type = 'lowpass';
      warmthFilter.frequency.value = 5200;
      warmthFilter.Q.value = 0.5;
      this.masterGain.connect(warmthFilter);

      if (typeof this.ctx.createDynamicsCompressor === 'function') {
        const safetyLimiter = this.ctx.createDynamicsCompressor();
        safetyLimiter.threshold.value = -16;
        safetyLimiter.knee.value = 18;
        safetyLimiter.ratio.value = 6;
        safetyLimiter.attack.value = 0.005;
        safetyLimiter.release.value = 0.18;
        warmthFilter.connect(safetyLimiter);
        safetyLimiter.connect(this.ctx.destination);
      } else {
        warmthFilter.connect(this.ctx.destination);
      }

      this.syncBusGains(true);
    }

    if (!this.noiseBuffer && this.ctx) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
        b6 = white * 0.115926;
      }
      this.noiseBuffer = buf;
    }
  }

  private syncBusGains(immediate = false) {
    if (!this.ctx || !this.masterGain || !this.musicBus || !this.sfxBus || !this.gameplayLoopsGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const masterVal = this.settings.muted ? 0 : this.settings.masterVolume;
    const pauseDuck =
      this.isGameplayPaused &&
      this.activeMusicContext !== 'menu' &&
      this.activeMusicContext !== 'victory'
        ? 0.55
        : 1.0;
    const voiceDuck = this.isVoiceSpeaking ? 0.58 : 1.0;
    const musicVal = this.settings.musicEnabled
      ? this.settings.musicVolume * pauseDuck * voiceDuck
      : 0;
    const sfxVal = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
    const loopVal = this.isGameplayPaused ? 0 : 1;

    if (immediate) {
      this.masterGain.gain.setValueAtTime(masterVal, now);
      this.musicBus.gain.setValueAtTime(musicVal, now);
      this.sfxBus.gain.setValueAtTime(sfxVal, now);
      this.gameplayLoopsGain.gain.setValueAtTime(loopVal, now);
    } else {
      this.masterGain.gain.setTargetAtTime(masterVal, now, 0.04);
      this.musicBus.gain.setTargetAtTime(musicVal, now, 0.08);
      this.sfxBus.gain.setTargetAtTime(sfxVal, now, 0.04);
      this.gameplayLoopsGain.gain.setTargetAtTime(loopVal, now, 0.15);
    }
  }

  private canPlaySfx(tag: string, minIntervalMs = 60): boolean {
    if (this.settings.muted || !this.settings.sfxEnabled || this.settings.masterVolume <= 0 || this.settings.sfxVolume <= 0) {
      return false;
    }
    if (!this.hasUserInteracted) return false;

    const nowMs = performance.now();
    const prev = this.sfxCooldowns.get(tag);
    if (prev !== undefined && nowMs - prev < minIntervalMs) {
      return false;
    }
    this.sfxCooldowns.set(tag, nowMs);

    this.initContext();
    return Boolean(this.ctx && this.sfxBus);
  }

  // --- AUDIO SETTINGS MANAGEMENT & SUBSCRIPTIONS ---

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    const prevTrack = this.settings.musicTrack;
    const nextTrack =
      partial.musicTrack && VALID_MUSIC_TRACK_CHOICES.has(partial.musicTrack)
        ? partial.musicTrack
        : this.settings.musicTrack;

    this.settings = {
      masterVolume: clamp01(partial.masterVolume ?? this.settings.masterVolume),
      musicVolume: clamp01(partial.musicVolume ?? this.settings.musicVolume),
      sfxVolume: clamp01(partial.sfxVolume ?? this.settings.sfxVolume),
      voiceVolume: clamp01(partial.voiceVolume ?? this.settings.voiceVolume),
      voiceSpeed: clampVoiceSpeed(partial.voiceSpeed ?? this.settings.voiceSpeed),
      voiceLanguage: partial.voiceLanguage
        ? partial.voiceLanguage === 'ms'
          ? 'ms'
          : 'en'
        : this.settings.voiceLanguage,
      muted: partial.muted ?? this.settings.muted,
      musicEnabled: partial.musicEnabled ?? this.settings.musicEnabled,
      sfxEnabled: partial.sfxEnabled ?? this.settings.sfxEnabled,
      voiceEnabled: partial.voiceEnabled ?? this.settings.voiceEnabled,
      astroneerSoundtrack: partial.astroneerSoundtrack ?? this.settings.astroneerSoundtrack,
      musicTrack: nextTrack,
    };

    try {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}

    this.syncBusGains(false);
    voiceAssistant.syncSettings(this.settings);
    if (partial.musicTrack !== undefined && prevTrack !== nextTrack) {
      this.hasUserInteracted = true;
      this.applyMusicContext(this.resolveEffectiveMusicContext(this.requestedMusicContext), 1.1);
    }
    this.listeners.forEach((cb) => cb(this.getSettings()));
  }

  public subscribe(listener: (settings: AudioSettings) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setMuted(muted: boolean) {
    this.updateSettings({ muted });
  }

  public getIsMuted(): boolean {
    return this.settings.muted;
  }

  public toggleMute(): boolean {
    const next = !this.settings.muted;
    this.updateSettings({ muted: next });
    return next;
  }

  public setGameplayPaused(paused: boolean) {
    this.isGameplayPaused = paused;
    this.syncBusGains(false);
    if (paused) {
      this.setRoverEngineState(false, 0);
      this.setCrystalGlowProximity(0);
      this.setBaseLabProximity(0);
    }
  }

  // --- BACKGROUND MUSIC ENGINE (DUAL-DECK 2-SECOND EQUAL-POWER CROSSFADING) ---

  public setMusicContext(context: MusicContext, fadeDurationSec: number = 2.0) {
    this.crossfadeMusic(context, fadeDurationSec);
  }

  public crossfadeMusic(context: MusicContext, fadeDurationSec?: number) {
    this.crossfadeTracks(context, fadeDurationSec);
  }

  public crossfadeTracks(
    toContext: MusicContext,
    durationSec?: number,
    onComplete?: () => void
  ) {
    this.requestedMusicContext = toContext;
    if (!this.hasUserInteracted) return;
    const effectiveContext = this.resolveEffectiveMusicContext(toContext);
    const duration =
      durationSec ??
      (effectiveContext === 'survival_low_o2'
        ? 1.2
        : effectiveContext === 'silent'
        ? 1.0
        : 2.0);
    const clampedDuration = Math.max(0.15, Math.min(6.0, duration));
    this.applyMusicContext(effectiveContext, clampedDuration, onComplete);
  }

  private scheduleGainCurve(
    gainParam: AudioParam,
    startTime: number,
    durationSec: number,
    direction: 'in' | 'out'
  ) {
    const anyParam = gainParam as AudioParam & {
      cancelScheduledValues?: (t: number) => void;
      setValueCurveAtTime?: (values: Float32Array, startTime: number, duration: number) => void;
    };

    try {
      if (typeof anyParam.cancelScheduledValues === 'function') {
        anyParam.cancelScheduledValues(startTime);
      }

      if (typeof anyParam.setValueCurveAtTime === 'function') {
        const steps = 16;
        const curve = new Float32Array(steps);
        for (let i = 0; i < steps; i++) {
          const progress = i / (steps - 1);
          // Equal-power sine/cosine taper eliminates center volume dips between modes
          const amp =
            direction === 'in'
              ? Math.sin(progress * Math.PI * 0.5)
              : Math.cos(progress * Math.PI * 0.5);
          curve[i] = Math.max(0.0001, amp);
        }
        gainParam.setValueAtTime(direction === 'in' ? 0.0001 : 1.0, startTime);
        anyParam.setValueCurveAtTime(curve, startTime, durationSec);
        return;
      }
    } catch {}

    // Linear ramp fallback for engines without setValueCurveAtTime
    gainParam.setValueAtTime(direction === 'in' ? 0.0001 : Math.max(0.0001, gainParam.value || 1.0), startTime);
    gainParam.linearRampToValueAtTime(direction === 'in' ? 1.0 : 0.0001, startTime + durationSec);
  }

  private disposeDeck(deck: {
    padOscs: OscillatorNode[];
    padFilter: BiquadFilterNode | null;
    padGainNode: GainNode | null;
    echoSendGain: GainNode | null;
    deckGain: GainNode;
    bufferSource: AudioBufferSourceNode | null;
    timerId: number | null;
    fadeCleanupTimerId: number | null;
    disposed: boolean;
  }) {
    if (deck.disposed) return;
    deck.disposed = true;
    this.fadingDecks.delete(deck as never);

    if (deck.timerId !== null) {
      window.clearInterval(deck.timerId);
      deck.timerId = null;
    }
    if (deck.fadeCleanupTimerId !== null) {
      window.clearTimeout(deck.fadeCleanupTimerId);
      deck.fadeCleanupTimerId = null;
    }

    deck.padOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    deck.padOscs = [];

    if (deck.bufferSource) {
      try {
        deck.bufferSource.stop();
        deck.bufferSource.disconnect();
      } catch {}
      deck.bufferSource = null;
    }

    try {
      deck.padFilter?.disconnect();
      deck.padGainNode?.disconnect();
      deck.echoSendGain?.disconnect();
      deck.deckGain.disconnect();
    } catch {}
  }

  private applyMusicContext(
    context: MusicContext,
    fadeDurationSec = 2.0,
    onComplete?: () => void
  ) {
    if (context === this.activeMusicContext) {
      onComplete?.();
      return;
    }
    this.initContext();
    if (!this.ctx || !this.musicBus) return;

    const now = this.ctx.currentTime;
    const prevDeck = this.activeDeck;
    this.activeMusicContext = context;
    this.activeDeck = null;
    this.lastCrossfadeDurationSec = fadeDurationSec;

    // 1. Fade out previous active deck smoothly via GainNode curve over fadeDurationSec
    if (prevDeck) {
      if (prevDeck.timerId !== null) {
        window.clearInterval(prevDeck.timerId);
        prevDeck.timerId = null;
      }
      this.fadingDecks.add(prevDeck);
      this.scheduleGainCurve(prevDeck.deckGain.gain, now, fadeDurationSec, 'out');
      prevDeck.fadeCleanupTimerId = window.setTimeout(() => {
        this.disposeDeck(prevDeck);
      }, Math.round((fadeDurationSec + 0.12) * 1000));
    }

    if (this.crossfadeStateTimerId !== null) {
      window.clearTimeout(this.crossfadeStateTimerId);
      this.crossfadeStateTimerId = null;
    }

    if (context === 'silent') {
      this.isCrossfading = Boolean(prevDeck);
      if (prevDeck) {
        this.crossfadeStateTimerId = window.setTimeout(() => {
          this.isCrossfading = false;
          this.crossfadeStateTimerId = null;
          onComplete?.();
        }, Math.round(fadeDurationSec * 1000));
      } else {
        onComplete?.();
      }
      return;
    }

    // 2. Spawn incoming deck channel on musicBus + Cosmic Echo send with equal-power fade-in
    const theme = MUSIC_THEMES[context];
    const deckGain = this.ctx.createGain();
    deckGain.connect(this.musicBus);
    let echoSendGain: GainNode | null = null;
    if (this.musicEchoInput) {
      echoSendGain = this.ctx.createGain();
      echoSendGain.gain.setValueAtTime(theme.echoSend ?? 0.32, now);
      deckGain.connect(echoSendGain);
      echoSendGain.connect(this.musicEchoInput);
    }
    this.scheduleGainCurve(deckGain.gain, now, fadeDurationSec, 'in');

    const incomingDeck = {
      context,
      deckGain,
      echoSendGain,
      padFilter: null as BiquadFilterNode | null,
      padGainNode: null as GainNode | null,
      padOscs: [] as OscillatorNode[],
      bufferSource: null as AudioBufferSourceNode | null,
      timerId: null as number | null,
      fadeCleanupTimerId: null as number | null,
      step: 0,
      disposed: false,
    };

    const cachedMusicBuffer = this.externalAudioBuffers.get(`music_${context}`);
    if (cachedMusicBuffer) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = cachedMusicBuffer;
        src.loop = true;
        src.connect(deckGain);
        src.start(now);
        incomingDeck.bufferSource = src;
      } catch {
        // Fall back directly to procedural deck below
      }
    }

    if (!incomingDeck.bufferSource) {
      const initialChord = theme.chordProgression[0] ?? theme.padFreqs;
      const padFilter = this.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(theme.filterFreq, now);
      padFilter.Q.value = 0.7;

      const padGainNode = this.ctx.createGain();
      padGainNode.gain.setValueAtTime(theme.padGain, now);

      const types: OscillatorType[] = ['sine', 'triangle', 'sine'];
      const padOscs = initialChord.map((f, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = types[idx % types.length];
        osc.frequency.setValueAtTime(f, now);
        osc.detune.setValueAtTime(idx === 1 ? 5 : idx === 2 ? -5 : 0, now);
        osc.connect(padFilter);
        osc.start(now);
        return osc;
      });

      padFilter.connect(padGainNode);
      padGainNode.connect(deckGain);

      incomingDeck.padFilter = padFilter;
      incomingDeck.padGainNode = padGainNode;
      incomingDeck.padOscs = padOscs;

      const triggerMusicalStep = () => {
        if (
          incomingDeck.disposed ||
          !this.ctx ||
          this.settings.muted ||
          !this.settings.musicEnabled ||
          this.activeDeck !== incomingDeck
        ) {
          return;
        }

        const step = incomingDeck.step;
        const t = this.ctx.currentTime;
        const chordCount = theme.chordProgression.length;
        const chordIdx = Math.floor(step / theme.chordStepSpan) % chordCount;
        const activeChord = theme.chordProgression[chordIdx] ?? theme.padFreqs;

        // Smooth analog chord voicing glide & gentle pad filter breathing on chord changes
        if (step % theme.chordStepSpan === 0) {
          padOscs.forEach((osc, idx) => {
            const targetFreq = activeChord[idx % activeChord.length];
            osc.frequency.setTargetAtTime(targetFreq, t, 0.36);
          });
          const breatheUp = step % (theme.chordStepSpan * 2) === 0;
          padFilter.frequency.setTargetAtTime(
            breatheUp ? theme.filterPeakFreq : theme.filterFreq,
            t,
            0.8
          );
        }

        // Primary expressive melody / arpeggio voice with warm lowpass pluck shaping
        const freq = theme.notes[step % theme.notes.length];
        this.playMusicNote(
          freq,
          theme.noteType,
          theme.noteGain,
          theme.noteDur,
          deckGain,
          theme.pluckCutoff
        );

        // Delicate celestial bell shimmer on every bar downbeat
        if (step % theme.chordStepSpan === 0 && activeChord.length >= 2) {
          const shimmerFreq = activeChord[activeChord.length - 1] * 2;
          this.playMusicNote(
            shimmerFreq,
            'sine',
            theme.noteGain * 0.48,
            theme.noteDur * 1.35,
            deckGain,
            2600
          );
        }

        // Counter-harmony weave on off-beats
        if (theme.harmonyNotes && theme.harmonyNotes.length > 0 && step % 2 === 1) {
          const harmFreq =
            theme.harmonyNotes[Math.floor(step / 2) % theme.harmonyNotes.length];
          this.playMusicNote(
            harmFreq,
            theme.harmonyType || 'sine',
            theme.noteGain * 0.68,
            theme.noteDur * 1.15,
            deckGain,
            1500
          );
        }

        // Warm chord-root sub bass progression
        const bassMod = theme.bassIntervalMod ?? 2;
        if (theme.pulseBass && step % bassMod === 0) {
          const rootBass =
            theme.bassNotes && theme.bassNotes.length > 0
              ? theme.bassNotes[chordIdx % theme.bassNotes.length]
              : theme.bassFreq;
          if (rootBass) {
            this.playMusicNote(
              rootBass,
              'sine',
              theme.noteGain * 1.35,
              Math.min(1.1, (theme.noteIntervalMs / 1000) * bassMod * 0.8),
              deckGain,
              420
            );
          }
        }

        // Soft ambient cosmic pulse (muffled sub thump on beat 0, air brush on beat 2)
        if (theme.softPulse) {
          const barBeat = step % 4;
          if (barBeat === 0) {
            this.playSoftSpaceKick(deckGain);
          } else if (barBeat === 2) {
            this.playSoftAirBrush(deckGain);
          }
        }

        incomingDeck.step += 1;
      };

      // Trigger first musical phrase almost immediately after fade-in begins
      triggerMusicalStep();
      incomingDeck.timerId = window.setInterval(triggerMusicalStep, theme.noteIntervalMs);
    }

    this.activeDeck = incomingDeck;
    this.isCrossfading = Boolean(prevDeck);
    if (prevDeck) {
      this.crossfadeStateTimerId = window.setTimeout(() => {
        this.isCrossfading = false;
        this.crossfadeStateTimerId = null;
        onComplete?.();
      }, Math.round(fadeDurationSec * 1000));
    } else {
      onComplete?.();
    }
  }

  public getCrossfadeStatus(): {
    activeContext: MusicContext;
    activeTitle: string;
    isCrossfading: boolean;
    fadeDurationSec: number;
    activeDeckCount: number;
  } {
    return {
      activeContext: this.activeMusicContext,
      activeTitle: this.getCurrentMusicTitle(),
      isCrossfading: this.isCrossfading,
      fadeDurationSec: this.lastCrossfadeDurationSec,
      activeDeckCount: (this.activeDeck ? 1 : 0) + this.fadingDecks.size,
    };
  }

  public getCurrentMusicTitle(): string {
    if (this.activeMusicContext !== 'silent') {
      return MUSIC_THEMES[this.activeMusicContext].title;
    }
    const target = this.resolveEffectiveMusicContext(this.requestedMusicContext);
    if (target === 'silent') return 'Silent';
    return MUSIC_THEMES[target].title;
  }

  public getActiveMusicContext(): MusicContext {
    return this.activeMusicContext;
  }

  public async loadOptionalAudioAsset(key: string, url: string): Promise<AudioBuffer | null> {
    if (this.externalAudioBuffers.has(key)) {
      return this.externalAudioBuffers.get(key) ?? null;
    }
    const existingPending = this.externalAudioPending.get(key);
    if (existingPending) return existingPending;

    this.initContext();
    if (!this.ctx || !url || typeof fetch !== 'function') {
      this.externalAudioBuffers.set(key, null);
      return null;
    }

    const loadPromise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          this.externalAudioBuffers.set(key, null);
          return null;
        }
        const arrayBuf = await res.arrayBuffer();
        const decoded = await this.ctx!.decodeAudioData(arrayBuf);
        this.externalAudioBuffers.set(key, decoded);
        return decoded;
      } catch {
        this.externalAudioBuffers.set(key, null);
        return null;
      } finally {
        this.externalAudioPending.delete(key);
      }
    })();

    this.externalAudioPending.set(key, loadPromise);
    return loadPromise;
  }

  public playCachedAssetOrFallback(key: string, volume: number, fallbackFn: () => void) {
    const buf = this.externalAudioBuffers.get(key);
    if (buf && this.ctx && this.sfxBus) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
        src.connect(g);
        g.connect(this.sfxBus);
        src.start();
        return;
      } catch {
        // Fallback smoothly to procedural Web Audio synthesis
      }
    }
    fallbackFn();
  }

  private playMusicNote(
    freq: number,
    type: OscillatorType,
    volume: number,
    duration: number,
    targetNode: AudioNode | null = this.musicBus,
    pluckCutoff?: number
  ) {
    if (!this.ctx || !targetNode) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.032);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      if (pluckCutoff && typeof this.ctx.createBiquadFilter === 'function') {
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(Math.min(4200, pluckCutoff * 1.45), now);
        filt.frequency.exponentialRampToValueAtTime(Math.max(240, pluckCutoff * 0.42), now + duration);
        osc.connect(filt);
        filt.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(targetNode);
      osc.start(now);
      osc.stop(now + duration + 0.06);
    } catch {}
  }

  private playSoftSpaceKick(targetNode: AudioNode | null) {
    if (!this.ctx || !targetNode) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      osc.connect(gain);
      gain.connect(targetNode);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  private playSoftAirBrush(targetNode: AudioNode | null) {
    if (!this.ctx || !targetNode || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const band = this.ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1800;
      band.Q.value = 1.6;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.018, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      src.connect(band);
      band.connect(gain);
      gain.connect(targetNode);
      src.start(now);
      src.stop(now + 0.14);
    } catch {}
  }

  public startAtmosphere() {
    this.setGameplayPaused(false);
    if (this.requestedMusicContext === 'menu' || this.requestedMusicContext === 'silent') {
      this.setMusicContext('mission');
    } else {
      this.setMusicContext(this.requestedMusicContext);
    }
  }

  public stopAtmosphere() {
    this.setGameplayPaused(true);
    this.setStormWindIntensity(0);
    this.setMusicContext('menu');
  }

  // --- CONTINUOUS GAMEPLAY AMBIENCE LOOPS ---

  private initStormWind() {
    if (this.isStormAudioInit || !this.ctx || !this.gameplayLoopsGain || !this.noiseBuffer) return;
    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      this.stormFilter = this.ctx.createBiquadFilter();
      this.stormFilter.type = 'lowpass';
      this.stormFilter.frequency.value = 260;
      this.stormFilter.Q.value = 2.5;

      this.stormGain = this.ctx.createGain();
      this.stormGain.gain.value = 0;

      noise.connect(this.stormFilter);
      this.stormFilter.connect(this.stormGain);
      this.stormGain.connect(this.gameplayLoopsGain);

      noise.start();
      this.isStormAudioInit = true;
    } catch {}
  }

  public setStormWindIntensity(intensity: number) {
    if (!this.hasUserInteracted) return;
    this.initContext();
    if (!this.isStormAudioInit) this.initStormWind();
    if (!this.stormGain || !this.stormFilter || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const targetGain = Math.max(0, Math.min(intensity, 1)) * 0.15;
      const targetFreq = 190 + intensity * 330;
      this.stormGain.gain.setTargetAtTime(targetGain, now, 0.45);
      this.stormFilter.frequency.setTargetAtTime(targetFreq, now, 0.55);
    } catch {}
  }

  private initRoverEngine() {
    if (this.isRoverAudioInit || !this.ctx || !this.gameplayLoopsGain) return;
    try {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 175;

      this.roverEngineGain = this.ctx.createGain();
      this.roverEngineGain.gain.value = 0;

      this.roverEngineOsc1 = this.ctx.createOscillator();
      this.roverEngineOsc1.type = 'triangle';
      this.roverEngineOsc1.frequency.value = 58;

      this.roverEngineOsc2 = this.ctx.createOscillator();
      this.roverEngineOsc2.type = 'sine';
      this.roverEngineOsc2.frequency.value = 116;

      this.roverEngineOsc1.connect(filter);
      this.roverEngineOsc2.connect(filter);
      filter.connect(this.roverEngineGain);
      this.roverEngineGain.connect(this.gameplayLoopsGain);

      this.roverEngineOsc1.start();
      this.roverEngineOsc2.start();

      // Synchronized Martian regolith wheel-roll movement texture
      if (this.noiseBuffer) {
        const moveNoise = this.ctx.createBufferSource();
        moveNoise.buffer = this.noiseBuffer;
        moveNoise.loop = true;

        this.roverMoveFilter = this.ctx.createBiquadFilter();
        this.roverMoveFilter.type = 'bandpass';
        this.roverMoveFilter.frequency.value = 260;
        this.roverMoveFilter.Q.value = 0.9;

        this.roverMoveGain = this.ctx.createGain();
        this.roverMoveGain.gain.value = 0;

        moveNoise.connect(this.roverMoveFilter);
        this.roverMoveFilter.connect(this.roverMoveGain);
        this.roverMoveGain.connect(this.gameplayLoopsGain);
        moveNoise.start();
      }

      this.isRoverAudioInit = true;
    } catch {}
  }

  public setRoverEngineState(isDriving: boolean, speedNormalized: number) {
    if (!this.hasUserInteracted) return;
    this.initContext();
    if (!this.isRoverAudioInit) this.initRoverEngine();
    if (!this.roverEngineGain || !this.roverEngineOsc1 || !this.roverEngineOsc2 || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const clampedSpeed = Math.max(0, Math.min(1, speedNormalized));
      const targetGain = isDriving && !this.isGameplayPaused ? 0.032 + clampedSpeed * 0.045 : 0;
      const baseFreq = 56 + clampedSpeed * 38;

      this.roverEngineGain.gain.setTargetAtTime(targetGain, now, 0.14);
      this.roverEngineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.14);
      this.roverEngineOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.14);

      if (this.roverMoveGain && this.roverMoveFilter) {
        const moveGain =
          isDriving && !this.isGameplayPaused && clampedSpeed > 0.08 ? clampedSpeed * 0.035 : 0;
        this.roverMoveGain.gain.setTargetAtTime(moveGain, now, 0.14);
        this.roverMoveFilter.frequency.setTargetAtTime(220 + clampedSpeed * 420, now, 0.14);
      }
    } catch {}
  }

  private initCrystalAmbience() {
    if (this.isCrystalAudioInit || !this.ctx || !this.gameplayLoopsGain) return;
    try {
      this.crystalAmbienceGain = this.ctx.createGain();
      this.crystalAmbienceGain.gain.value = 0;

      this.crystalOsc1 = this.ctx.createOscillator();
      this.crystalOsc1.type = 'sine';
      this.crystalOsc1.frequency.value = 523.25; // C5

      this.crystalOsc2 = this.ctx.createOscillator();
      this.crystalOsc2.type = 'sine';
      this.crystalOsc2.frequency.value = 785.5; // Shimmer G5 with subtle beating

      this.crystalOsc1.connect(this.crystalAmbienceGain);
      this.crystalOsc2.connect(this.crystalAmbienceGain);
      this.crystalAmbienceGain.connect(this.gameplayLoopsGain);

      this.crystalOsc1.start();
      this.crystalOsc2.start();
      this.isCrystalAudioInit = true;
    } catch {}
  }

  public setCrystalGlowProximity(proximity01: number) {
    if (!this.hasUserInteracted) return;
    this.initContext();
    if (!this.isCrystalAudioInit) this.initCrystalAmbience();
    if (!this.crystalAmbienceGain || !this.ctx) return;

    try {
      const p = Math.max(0, Math.min(1, proximity01));
      const targetGain = this.isGameplayPaused ? 0 : p * p * 0.04;
      this.crystalAmbienceGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.18);
    } catch {}
  }

  private initBaseLabAmbience() {
    if (this.isBaseAudioInit || !this.ctx || !this.gameplayLoopsGain) return;
    try {
      this.baseAmbienceGain = this.ctx.createGain();
      this.baseAmbienceGain.gain.value = 0;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;

      this.baseHumOsc = this.ctx.createOscillator();
      this.baseHumOsc.type = 'sine';
      this.baseHumOsc.frequency.value = 110;

      this.baseHumOsc.connect(filter);
      filter.connect(this.baseAmbienceGain);
      this.baseAmbienceGain.connect(this.gameplayLoopsGain);
      this.baseHumOsc.start();
      this.isBaseAudioInit = true;
    } catch {}
  }

  public setBaseLabProximity(proximity01: number, delta = 0) {
    this.currentBaseProximity = Math.max(0, Math.min(1, proximity01));
    if (!this.hasUserInteracted) return;
    this.initContext();
    if (!this.isBaseAudioInit) this.initBaseLabAmbience();
    if (!this.baseAmbienceGain || !this.ctx) return;

    try {
      const targetGain = this.isGameplayPaused ? 0 : this.currentBaseProximity * 0.042;
      this.baseAmbienceGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.25);
    } catch {}

    // Gentle musical studio pip inside research base
    if (!this.isGameplayPaused && this.currentBaseProximity > 0.35 && delta > 0) {
      this.baseBleepTimer += delta;
      if (this.baseBleepTimer >= 4.6) {
        this.baseBleepTimer = 0;
        this.playLabTelemetryBleep(this.currentBaseProximity);
      }
    }
  }

  private playLabTelemetryBleep(proximity: number) {
    if (!this.canPlaySfx('lab_bleep', 2500) || !this.ctx || !this.gameplayLoopsGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pitch = Math.random() > 0.5 ? 587.33 : 783.99;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.setValueAtTime(pitch * 1.25, now + 0.06);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.015 * proximity, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.gameplayLoopsGain);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  // --- ASTRONAUT MOVEMENT & SUIT HELMET AUDIO ---

  public updateAstronautAudio(
    delta: number,
    speed: number,
    isRunning: boolean,
    isGrounded: boolean,
    isDrivingRover: boolean,
    oxygen: number
  ) {
    if (this.isGameplayPaused || !this.hasUserInteracted) return;

    // 1. Footsteps & spacesuit movement synchronized strictly with movement speed
    if (isGrounded && !isDrivingRover && speed > 0.55) {
      const stepInterval = isRunning ? 0.27 : Math.max(0.32, Math.min(0.55, 2.35 / Math.max(speed, 1.2)));
      this.strideTimer += delta;
      if (this.strideTimer >= stepInterval) {
        this.strideTimer = 0;
        this.strideFootLeft = !this.strideFootLeft;
        this.playFootstep(isRunning, this.strideFootLeft);
        this.playSuitMovement(isRunning);
      }
    } else {
      this.strideTimer = 0.22; // Ready first footstep shortly after moving again
    }

    // 2. Subtle inside-helmet breathing loop (on foot only)
    if (!isDrivingRover) {
      const breathPeriod = oxygen <= 30 ? 1.8 : isRunning && speed > 4.5 ? 2.1 : 3.5;
      this.breathTimer += delta;
      if (this.breathTimer >= breathPeriod * 0.5) {
        this.breathTimer = 0;
        this.breathPhaseInhale = !this.breathPhaseInhale;
        this.playHelmetBreath(this.breathPhaseInhale, oxygen <= 30 || (isRunning && speed > 4.5));
      }
    }
  }

  public playFootstep(isRunning: boolean, leftFoot = true) {
    if (!this.canPlaySfx('footstep', isRunning ? 190 : 260) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const vol = isRunning ? 0.1 : 0.065;

      // 1) Soft boot thud on Martian regolith
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(leftFoot ? 96 : 104, now);
      thudOsc.frequency.exponentialRampToValueAtTime(48, now + 0.075);
      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.linearRampToValueAtTime(vol, now + 0.008);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      thudOsc.connect(thudGain);
      thudGain.connect(this.sfxBus);
      thudOsc.start(now);
      thudOsc.stop(now + 0.095);

      // 2) Gentle sand crunch transient
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isRunning ? 1150 : 920, now);
        filter.Q.value = 1.3;

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.001, now);
        nGain.gain.linearRampToValueAtTime(vol * 0.65, now + 0.01);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxBus);
        noise.start(now, Math.random() * 0.8, 0.095);
      }
    } catch {}
  }

  public playSuitMovement(isRunning: boolean) {
    if (!this.canPlaySfx('suit_move', 250) || !this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.Q.value = 1.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(isRunning ? 0.022 : 0.012, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.085);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      noise.start(now, Math.random() * 1.1, 0.095);
    } catch {}
  }

  private playHelmetBreath(inhale: boolean, heavy: boolean) {
    if (!this.canPlaySfx('helmet_breath', 650) || !this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const dur = heavy ? 0.44 : 0.6;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(inhale ? 580 : 420, now);
      filter.Q.value = 1.2;

      const gain = this.ctx.createGain();
      const peak = heavy ? 0.02 : 0.011;
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(peak, now + dur * 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      noise.start(now, 0.15, dur + 0.04);
    } catch {}
  }

  // --- EXISTING + ENHANCED GAMEPLAY SFX ROUTED TO sfxBus ---

  public playCrystalDiscovery() {
    if (!this.canPlaySfx('crystal_disc', 1800) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [659.25, 880.0, 1174.66];
      notes.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.085;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.065, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {}
  }

  public playCrystalCollect() {
    if (!this.canPlaySfx('crystal_collect', 150) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const pitches = [523.25, 659.25, 783.99, 1046.5];
      pitches.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.13, t + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch {}
  }

  public playAllCrystalsCollected() {
    if (!this.canPlaySfx('all_crystals', 1500) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.51];
      fanfare.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = idx >= 3 ? 'sine' : 'triangle';
        const t = now + idx * 0.085;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.7);
      });
    } catch {}
  }

  public playJump() {
    if (!this.canPlaySfx('jump', 120) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Playful bouncy space-hop sweep with smooth triangle wave (no harsh sawtooth)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  public playLandingDust(impactIntensity: number = 0.6) {
    if (!this.canPlaySfx('landing', 150) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const vol = Math.min(0.15, Math.max(0.04, impactIntensity * 0.13));

      // Warm cushion thump
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(105, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.linearRampToValueAtTime(vol * 0.85, now + 0.01);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      thud.connect(thudGain);
      thudGain.connect(this.sfxBus);
      thud.start(now);
      thud.stop(now + 0.16);

      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol * 0.8, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        noise.start(now, 0, 0.18);
      }
    } catch {}
  }

  public playOxygenRefill() {
    if (!this.canPlaySfx('o2_refill', 600) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      // Gentle fresh air breeze hiss
      if (this.noiseBuffer) {
        const air = this.ctx.createBufferSource();
        air.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(950, now);
        hp.frequency.exponentialRampToValueAtTime(1500, now + 0.42);
        const airGain = this.ctx.createGain();
        airGain.gain.setValueAtTime(0.001, now);
        airGain.gain.linearRampToValueAtTime(0.045, now + 0.04);
        airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        air.connect(hp);
        hp.connect(airGain);
        airGain.connect(this.sfxBus);
        air.start(now, 0.2, 0.5);
      }

      const chords = [392.0, 523.25, 659.25, 783.99];
      chords.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + i * 0.09;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    } catch {}
  }

  public playOxygenWarning(isCritical = false) {
    if (!this.canPlaySfx(isCritical ? 'o2_crit' : 'o2_warn', 3500) || !this.ctx || !this.sfxBus) {
      return;
    }
    try {
      const now = this.ctx.currentTime;
      const pulses = isCritical ? 3 : 2;
      // Gentle, clear friendly chime alert (warm sine/triangle instead of harsh square sirens)
      for (let i = 0; i < pulses; i++) {
        const t = now + i * (isCritical ? 0.2 : 0.26);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isCritical ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isCritical ? 783.99 : 659.25, t);
        osc.frequency.setValueAtTime(isCritical ? 587.33 : 523.25, t + 0.09);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(isCritical ? 0.08 : 0.065, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.21);
      }
    } catch {}
  }

  // --- ROVER & RESEARCH BASE SOUNDS ---

  public playRoverDiscovery() {
    if (!this.canPlaySfx('rover_disc', 3000) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25];
      notes.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);
        gain.gain.setValueAtTime(0.11, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.38);
      });
    } catch {}
  }

  public playRoverInteract() {
    if (!this.canPlaySfx('rover_interact', 250) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.05);
        gain.gain.setValueAtTime(0.09, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.16);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.18);
      });
    } catch {}
  }

  public playBaseDiscovery() {
    if (!this.canPlaySfx('base_disc', 3000) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [329.63, 440, 554.37, 659.25].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);
        gain.gain.setValueAtTime(0.11, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.48);
      });
    } catch {}
  }

  public playAirlockDoor(opening: boolean) {
    if (!this.canPlaySfx('airlock', 1200) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      if (this.noiseBuffer) {
        const hiss = this.ctx.createBufferSource();
        hiss.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(opening ? 900 : 1800, now);
        filter.frequency.exponentialRampToValueAtTime(opening ? 2100 : 650, now + 0.45);
        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.09, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        hiss.connect(filter);
        filter.connect(hGain);
        hGain.connect(this.sfxBus);
        hiss.start(now, 0.3, 0.5);
      }

      const servo = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      servo.type = 'triangle';
      servo.frequency.setValueAtTime(opening ? 140 : 210, now);
      servo.frequency.exponentialRampToValueAtTime(opening ? 210 : 120, now + 0.35);
      sGain.gain.setValueAtTime(0.075, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      servo.connect(sGain);
      sGain.connect(this.sfxBus);
      servo.start(now);
      servo.stop(now + 0.4);
    } catch {}
  }

  public playComputerInterface() {
    if (!this.canPlaySfx('computer_ui', 90) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [987.77, 1318.51].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.045);
        gain.gain.setValueAtTime(0.07, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.09);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.1);
      });
    } catch {}
  }

  // --- MISSION, QUIZ & VICTORY / EARTH CONTACT SOUNDS ---

  public playMissionStart() {
    if (!this.canPlaySfx('mission_start', 800) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [392.0, 493.88, 587.33, 783.99];
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        const t = now + i * 0.1;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch {}
  }

  public playMissionObjective() {
    if (!this.canPlaySfx('mission_obj', 500) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 987.77].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.09, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.27);
      });
    } catch {}
  }

  public playNewDiscovery() {
    if (!this.canPlaySfx('new_disc', 500) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 987.77].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.11, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.37);
      });
    } catch {}
  }

  public playMissionComplete() {
    if (!this.canPlaySfx('mission_complete', 350) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const melody = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
      const durations = [0.12, 0.12, 0.12, 0.2, 0.2, 0.55];
      let offset = 0;

      melody.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + durations[i]);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + offset);
        osc.stop(now + offset + durations[i] + 0.05);
        offset += durations[i] * 0.85;
      });
    } catch {}
  }

  public playTowerActivation() {
    if (!this.canPlaySfx('tower_activate', 1000) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      // Warm ascending Space Uplink chime sweep
      const sweep = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      sweep.type = 'triangle';
      sweep.frequency.setValueAtTime(220, now);
      sweep.frequency.exponentialRampToValueAtTime(659.25, now + 0.65);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      sGain.gain.setValueAtTime(0.001, now);
      sGain.gain.linearRampToValueAtTime(0.095, now + 0.04);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      sweep.connect(filter);
      filter.connect(sGain);
      sGain.connect(this.sfxBus);
      sweep.start(now);
      sweep.stop(now + 0.85);
    } catch {}
  }

  public playRadioTransmission() {
    if (!this.canPlaySfx('radio_tx', 600) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      // Soft space walkie-talkie breeze + friendly carrier chime
      if (this.noiseBuffer) {
        const sq = this.ctx.createBufferSource();
        sq.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1100;
        const sg = this.ctx.createGain();
        sg.gain.setValueAtTime(0.001, now);
        sg.gain.linearRampToValueAtTime(0.04, now + 0.015);
        sg.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        sq.connect(bp);
        bp.connect(sg);
        sg.connect(this.sfxBus);
        sq.start(now, 0.5, 0.13);
      }
      const carrier = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(1046.5, now + 0.1);
      cg.gain.setValueAtTime(0.001, now + 0.1);
      cg.gain.linearRampToValueAtTime(0.065, now + 0.115);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      carrier.connect(cg);
      cg.connect(this.sfxBus);
      carrier.start(now + 0.1);
      carrier.stop(now + 0.3);
    } catch {}
  }

  public playEarthContactSuccess() {
    if (!this.canPlaySfx('earth_contact', 1000) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      chord.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        const t = now + idx * 0.11;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    } catch {}
  }

  public playQuizResult(correct: boolean) {
    if (!this.canPlaySfx('quiz_result', 120) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      if (correct) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880.0, now + 0.11);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.46);
      } else {
        // Gentle encouraging woodwind-like "oops, try again" tone instead of harsh buzzer
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(392.0, now);
        osc.frequency.setValueAtTime(329.63, now + 0.14);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.075, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    } catch {}
  }

  public playQuizComplete(passed: boolean) {
    if (!this.canPlaySfx('quiz_complete', 500) || !this.ctx || !this.sfxBus) return;
    if (passed) {
      this.playEarthContactSuccess();
    } else {
      try {
        const now = this.ctx.currentTime;
        [392.0, 440.0, 523.25].forEach((f, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const t = now + i * 0.12;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.1, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.connect(gain);
          gain.connect(this.sfxBus!);
          osc.start(t);
          osc.stop(t + 0.42);
        });
      } catch {}
    }
  }

  public playFinalScoreSting(passed: boolean) {
    if (!this.canPlaySfx('final_score', 400) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const notes = passed ? [659.25, 783.99, 1046.5] : [440.0, 523.25];
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + i * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.095, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    } catch {}
  }

  public playStormWarning() {
    if (!this.canPlaySfx('storm_warn', 1500) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const tones = [523.25, 659.25, 523.25];
      tones.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.16;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.075, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.16);
      });
    } catch {}
  }

  public playStormClearing() {
    if (!this.canPlaySfx('storm_clear', 1500) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99];
      chords.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + i * 0.1;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.085, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.78);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.85);
      });
    } catch {}
  }

  public playClick() {
    this.unlockAudio();
    if (!this.canPlaySfx('click', 45) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  public playCameraShutter() {
    if (!this.canPlaySfx('shutter', 350) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxBus);
        noise.start(now, 0.1, 0.07);
      }

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1174.66, now + 0.04);
      osc.frequency.setValueAtTime(1567.98, now + 0.09);
      oscGain.gain.setValueAtTime(0.09, now + 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(oscGain);
      oscGain.connect(this.sfxBus);
      osc.start(now + 0.04);
      osc.stop(now + 0.24);
    } catch {}
  }

  public playGlideOpen(opening: boolean) {
    if (!this.canPlaySfx('glide', 180) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.Q.value = 1.8;
      filter.frequency.setValueAtTime(opening ? 380 : 950, now);
      filter.frequency.exponentialRampToValueAtTime(opening ? 1350 : 280, now + 0.24);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(opening ? 260 : 520, now);
      osc.frequency.exponentialRampToValueAtTime(opening ? 587.33 : 220, now + 0.24);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  public playWingFlap() {
    if (!this.canPlaySfx('flap', 160) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.34);
    } catch {}
  }

  public playRoverImpact(intensity: number = 0.7) {
    if (!this.canPlaySfx('rover_impact', 160) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const clamped = Math.min(1, Math.max(0.2, intensity));

      // Playful rubbery bump instead of harsh crash
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(125 + clamped * 35, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11 * clamped, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.2);

      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(550, now);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.065 * clamped, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.sfxBus);
        noise.start(now, 0.3, 0.1);
      }
    } catch {}
  }

  public playRoverRepair() {
    if (!this.canPlaySfx('rover_repair', 350) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [392.0, 493.88, 587.33, 783.99];
      notes.forEach((freq, i) => {
        if (!this.ctx || !this.sfxBus) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        const t = now + i * 0.065;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.11, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } catch {}
  }

  public playRoverHorn() {
    if (!this.canPlaySfx('rover_horn', 320) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [0, 0.14].forEach((offset, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 523.25 : 659.25, now + offset);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.09, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } catch {}
  }

  public playRoverBoost() {
    if (!this.canPlaySfx('rover_boost', 450) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.34);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.095, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  public playRoverJump() {
    if (!this.canPlaySfx('rover_jump', 260) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.22);

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(92, now);
      subOsc.frequency.exponentialRampToValueAtTime(210, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      subOsc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + 0.3);
      subOsc.stop(now + 0.3);
    } catch {}
  }

  public playRoverLand(intensity: number = 0.6) {
    if (!this.canPlaySfx('rover_land', 220) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const amp = Math.max(0.03, Math.min(0.11, 0.04 + intensity * 0.06));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playRoverDriftScrub(intensity: number = 0.7) {
    if (!this.canPlaySfx('rover_drift', 180) || !this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const lvl = Math.max(0.2, Math.min(1, intensity));
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680 + lvl * 420, now);
      filter.Q.setValueAtTime(1.8, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.032 * lvl, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      noise.start(now);
      noise.stop(now + 0.19);
    } catch {}
  }

  public playCaveDiscovery() {
    if (!this.canPlaySfx('cave_disc', 1200) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [329.63, 493.88, 659.25, 987.77];
      notes.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.11;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.095, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.76);
      });
    } catch {}
  }

  public playLabExperiment(success: boolean) {
    if (!this.canPlaySfx('lab_exp', 350) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const seq = success ? [440, 554.37, 659.25, 880, 1108.73] : [392, 349.23, 392];
      seq.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + i * 0.075;
        osc.type = success ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(success ? 0.1 : 0.065, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {}
  }

  public playSatelliteLock() {
    if (!this.canPlaySfx('sat_lock', 500) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      [587.33, 783.99, 1046.5, 1318.51].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + i * 0.085;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.11, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    } catch {}
  }

  public playUndergroundLift(descending: boolean) {
    if (!this.canPlaySfx('ug_lift', 800) || !this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(descending ? 320 : 140, now);
      osc.frequency.exponentialRampToValueAtTime(descending ? 140 : 340, now + 0.65);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.095, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.74);
    } catch {}
  }

  private playFallbackVoiceChime(voiceVolume: number, text: string = ''): number {
    if (this.settings.muted || !this.settings.voiceEnabled) return 0;
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
    }
    this.initContext();
    if (!this.ctx || !this.masterGain) return 0;

    const clampedVoiceVol = Math.max(0.05, Math.min(1, voiceVolume));
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const syllableCount = Math.max(4, Math.min(9, words.length || 5));
    const isQuestion = text.includes('?');
    const isUrgent = /warning|critical|danger|alert/i.test(text);

    const scheduleVoiceSynth = () => {
      if (!this.ctx || !this.masterGain || this.settings.muted || !this.settings.voiceEnabled) return;
      try {
        const ctx = this.ctx;
        const now = ctx.currentTime + 0.02;

        // Opening gentle AI comms ping
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(isUrgent ? 740 : 587.33, now);
        pingOsc.frequency.exponentialRampToValueAtTime(isUrgent ? 987.77 : 880, now + 0.075);
        pingGain.gain.setValueAtTime(0.001, now);
        pingGain.gain.linearRampToValueAtTime(0.095 * clampedVoiceVol, now + 0.014);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        pingOsc.connect(pingGain);
        pingGain.connect(this.masterGain);
        pingOsc.start(now);
        pingOsc.stop(now + 0.14);

        // Formant-filtered melodic AI syllables
        let cursor = now + 0.1;
        const baseScale = isUrgent ? [329.63, 392.0, 440.0, 392.0] : [261.63, 293.66, 329.63, 392.0, 349.23];
        for (let i = 0; i < syllableCount; i++) {
          const word = words[i] || 'ai';
          const charHash = word.charCodeAt(0) + (word.charCodeAt(word.length - 1) || 0);
          const dur = Math.min(0.16, Math.max(0.085, 0.075 + word.length * 0.01));
          let freq = baseScale[(charHash + i) % baseScale.length];
          if (i === syllableCount - 1 && isQuestion) freq *= 1.18;
          if (i === syllableCount - 1 && !isQuestion) freq *= 0.94;

          const carrier = ctx.createOscillator();
          const harmonic = ctx.createOscillator();
          const formant = ctx.createBiquadFilter();
          const env = ctx.createGain();

          carrier.type = 'triangle';
          harmonic.type = 'sine';
          carrier.frequency.setValueAtTime(freq, cursor);
          carrier.frequency.exponentialRampToValueAtTime(
            freq * (i % 2 === 0 ? 1.07 : 0.96),
            cursor + dur
          );
          harmonic.frequency.setValueAtTime(freq * 2, cursor);

          formant.type = 'bandpass';
          formant.Q.value = 2.1;
          const fStart = 520 + ((charHash * 37) % 420);
          const fEnd = 780 + ((charHash * 53) % 520);
          formant.frequency.setValueAtTime(fStart, cursor);
          formant.frequency.exponentialRampToValueAtTime(fEnd, cursor + dur);

          const peak = 0.16 * clampedVoiceVol;
          env.gain.setValueAtTime(0.001, cursor);
          env.gain.linearRampToValueAtTime(peak, cursor + 0.018);
          env.gain.exponentialRampToValueAtTime(0.001, cursor + dur);

          carrier.connect(formant);
          harmonic.connect(formant);
          formant.connect(env);
          env.connect(this.masterGain);

          carrier.start(cursor);
          harmonic.start(cursor);
          carrier.stop(cursor + dur + 0.02);
          harmonic.stop(cursor + dur + 0.02);

          cursor += dur + (i % 3 === 2 ? 0.065 : 0.028);
        }
      } catch {}
    };

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(scheduleVoiceSynth).catch(() => {});
    } else {
      scheduleVoiceSynth();
    }

    const estimatedMs = 120 + syllableCount * 155 + 160;
    return estimatedMs;
  }

  public testSfx() {
    this.unlockAudio();
    this.playCrystalCollect();
  }
}

export const sounds = new SoundManager();
