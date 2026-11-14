import {
  AudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  VoiceCueId,
  VoiceLanguage,
  VoiceMood,
  VoicePriority,
} from '../types/audio';

interface BilingualText {
  en: string;
  ms: string;
}

interface VoiceCueDefinition {
  text: BilingualText;
  priority: VoicePriority;
  mood: VoiceMood;
  cooldownMs: number;
}

const VOICE_CUES: Record<VoiceCueId, VoiceCueDefinition> = {
  game_start: {
    text: {
      en: 'Welcome, Explorer. Your Mars expedition begins now.',
      ms: 'Selamat datang, Penjelajah. Ekspedisi Marikh anda bermula sekarang.',
    },
    priority: 'high',
    mood: 'welcoming',
    cooldownMs: 8000,
  },
  mission_start: {
    text: {
      en: 'New mission objective available. Follow the navigation marker on your radar.',
      ms: 'Objektif misi baharu tersedia. Ikut penanda navigasi pada radar anda.',
    },
    priority: 'normal',
    mood: 'informative',
    cooldownMs: 12000,
  },
  mission_progress: {
    text: {
      en: 'Great progress, Explorer. Keep following your objective beacon.',
      ms: 'Kemajuan yang baik, Penjelajah. Teruskan mengikut penanda objektif anda.',
    },
    priority: 'normal',
    mood: 'encouraging',
    cooldownMs: 14000,
  },
  crystal_discovery: {
    text: {
      en: 'Interesting discovery! An energy crystal has been detected.',
      ms: 'Penemuan menarik! Kristal tenaga telah dikesan.',
    },
    priority: 'normal',
    mood: 'excited',
    cooldownMs: 16000,
  },
  crystal_collect: {
    text: {
      en: 'Energy crystal collected. Flight thruster energy boosted.',
      ms: 'Kristal tenaga berjaya dikumpul. Tenaga penerbangan ditingkatkan.',
    },
    priority: 'normal',
    mood: 'encouraging',
    cooldownMs: 5500,
  },
  all_crystals: {
    text: {
      en: 'All ten energy crystals collected! Outstanding exploration, Explorer.',
      ms: 'Kesemua sepuluh kristal tenaga telah dikumpul! Penerokaan yang hebat, Penjelajah.',
    },
    priority: 'high',
    mood: 'excited',
    cooldownMs: 10000,
  },
  low_oxygen: {
    text: {
      en: 'Warning! Oxygen levels are getting low. Please return to the research base.',
      ms: 'Amaran! Paras oksigen semakin rendah. Sila kembali ke pangkalan penyelidikan.',
    },
    priority: 'high',
    mood: 'calm_emergency',
    cooldownMs: 22000,
  },
  critical_oxygen: {
    text: {
      en: 'Emergency! Oxygen is critically low. Find a safe oxygen supply immediately.',
      ms: 'Kecemasan! Oksigen berada pada tahap kritikal. Cari bekalan oksigen yang selamat dengan segera.',
    },
    priority: 'critical',
    mood: 'calm_emergency',
    cooldownMs: 18000,
  },
  oxygen_refilled: {
    text: {
      en: 'Oxygen restored to one hundred percent. Systems nominal.',
      ms: 'Oksigen dipulihkan ke seratus peratus. Semua sistem stabil.',
    },
    priority: 'high',
    mood: 'welcoming',
    cooldownMs: 8000,
  },
  rover_discovery: {
    text: {
      en: 'Explorer, a Mars Rover has been detected nearby.',
      ms: 'Penjelajah, sebuah Rover Marikh telah dikesan berdekatan.',
    },
    priority: 'normal',
    mood: 'excited',
    cooldownMs: 45000,
  },
  rover_repaired: {
    text: {
      en: 'Rover hull integrity restored. You are clear to drive safely.',
      ms: 'Ketahanan badan Rover telah dipulihkan. Anda selamat untuk memandu semula.',
    },
    priority: 'normal',
    mood: 'encouraging',
    cooldownMs: 10000,
  },
  research_base: {
    text: {
      en: 'Welcome to the research station. You can restore your oxygen here.',
      ms: 'Selamat datang ke stesen penyelidikan. Anda boleh memulihkan oksigen anda di sini.',
    },
    priority: 'normal',
    mood: 'welcoming',
    cooldownMs: 45000,
  },
  mission_complete: {
    text: {
      en: 'Excellent work, Explorer! Mission completed successfully.',
      ms: 'Syabas, Penjelajah! Misi telah berjaya diselesaikan.',
    },
    priority: 'high',
    mood: 'encouraging',
    cooldownMs: 4000,
  },
  quiz_complete: {
    text: {
      en: 'Well done, Explorer! You have completed the Mars knowledge quiz.',
      ms: 'Syabas, Penjelajah! Anda telah berjaya menamatkan kuiz pengetahuan Marikh.',
    },
    priority: 'high',
    mood: 'encouraging',
    cooldownMs: 8000,
  },
  final_mission: {
    text: {
      en: 'Communication tower activated. Preparing to contact Earth.',
      ms: 'Menara komunikasi diaktifkan. Bersedia untuk menghubungi Bumi.',
    },
    priority: 'critical',
    mood: 'encouraging',
    cooldownMs: 10000,
  },
  victory: {
    text: {
      en: 'Congratulations, Explorer! You have successfully completed your Mars expedition.',
      ms: 'Tahniah, Penjelajah! Anda telah berjaya menamatkan ekspedisi Marikh anda.',
    },
    priority: 'critical',
    mood: 'excited',
    cooldownMs: 12000,
  },
  cave_discovery: {
    text: {
      en: 'Fascinating discovery! You uncovered a hidden Martian formation.',
      ms: 'Penemuan yang menakjubkan! Anda telah menemui formasi tersembunyi di Marikh.',
    },
    priority: 'normal',
    mood: 'excited',
    cooldownMs: 15000,
  },
  underground_base: {
    text: {
      en: 'Welcome to the Underground Mars Research Base. Radiation shielding is at one hundred percent.',
      ms: 'Selamat datang ke Pangkalan Penyelidikan Bawah Tanah Marikh. Perisai radiasi berada pada tahap seratus peratus.',
    },
    priority: 'normal',
    mood: 'welcoming',
    cooldownMs: 25000,
  },
  lab_experiment: {
    text: {
      en: 'Science experiment complete! Wonderful discovery, Explorer.',
      ms: 'Eksperimen sains selesai! Penemuan yang hebat, Penjelajah.',
    },
    priority: 'high',
    mood: 'encouraging',
    cooldownMs: 8000,
  },
  satellite_aligned: {
    text: {
      en: 'Satellite relay locked onto orbit. Signal strength is crystal clear.',
      ms: 'Pemancar satelit berjaya dikunci ke orbit. Kekuatan isyarat sangat jelas.',
    },
    priority: 'high',
    mood: 'encouraging',
    cooldownMs: 8000,
  },
  tablet_discovery: {
    text: {
      en: 'Ancient Mars history tablet discovered! Logging new planetary data.',
      ms: 'Tablet sejarah purba Marikh ditemui! Data planet baharu sedang direkodkan.',
    },
    priority: 'normal',
    mood: 'excited',
    cooldownMs: 12000,
  },
  checkpoint_activated: {
    text: {
      en: 'Expedition checkpoint synchronized. Navigation coordinates saved.',
      ms: 'Pusat pemeriksaan ekspedisi disegerakkan. Koordinat navigasi disimpan.',
    },
    priority: 'normal',
    mood: 'informative',
    cooldownMs: 15000,
  },
  educational_fact: {
    text: {
      en: "Did you know? Mars has approximately thirty-eight percent of Earth's gravity.",
      ms: 'Tahukah anda? Marikh mempunyai kira-kira tiga puluh lapan peratus daripada graviti Bumi.',
    },
    priority: 'normal',
    mood: 'informative',
    cooldownMs: 20000,
  },
};

const EDUCATIONAL_FACTS: BilingualText[] = [
  {
    en: "Did you know? Mars has approximately thirty-eight percent of Earth's gravity.",
    ms: 'Tahukah anda? Marikh mempunyai kira-kira tiga puluh lapan peratus daripada graviti Bumi.',
  },
  {
    en: 'Mars looks bright red because its rocks and dust contain iron oxide, the same mineral that creates rust on Earth.',
    ms: 'Marikh kelihatan merah terang kerana batu dan debunya mengandungi oksida besi, iaitu mineral yang sama seperti karat di Bumi.',
  },
  {
    en: 'Olympus Mons on Mars is the tallest volcano in our solar system, rising nearly three times higher than Mount Everest.',
    ms: 'Olympus Mons di Marikh ialah gunung berapi tertinggi dalam sistem suria kita, hampir tiga kali lebih tinggi daripada Gunung Everest.',
  },
  {
    en: 'A single day on Mars, called a Sol, lasts twenty-four hours and thirty-nine minutes—very close to an Earth day.',
    ms: 'Sehari di Marikh, yang dipanggil Sol, berlangsung selama dua puluh empat jam dan tiga puluh sembilan minit—hampir sama dengan hari di Bumi.',
  },
  {
    en: 'Although Mars is dry today, ancient river deltas and clay minerals prove liquid water once flowed across its surface.',
    ms: 'Walaupun Marikh kering hari ini, delta sungai purba dan mineral tanah liat membuktikan air cecair pernah mengalir di permukaannya.',
  },
  {
    en: 'NASA tested the MOXIE instrument aboard the Perseverance rover to convert Martian carbon dioxide directly into breathable oxygen.',
    ms: 'NASA menguji instrumen MOXIE pada rover Perseverance untuk menukar karbon dioksida Marikh terus menjadi oksigen yang boleh disedut.',
  },
];

const MOOD_PROFILES: Record<VoiceMood, { rateScale: number; pitch: number }> = {
  welcoming: { rateScale: 0.96, pitch: 1.04 },
  calm_emergency: { rateScale: 0.93, pitch: 0.97 },
  excited: { rateScale: 1.02, pitch: 1.08 },
  encouraging: { rateScale: 0.98, pitch: 1.05 },
  informative: { rateScale: 0.95, pitch: 1.02 },
};

const PRIORITY_RANK: Record<VoicePriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

export interface VoiceSpeakingState {
  isSpeaking: boolean;
  activeKey: string | null;
  text: string | null;
  mood: VoiceMood | null;
  lastAnnouncementText: string | null;
}

export interface ActiveVoiceProfile {
  voiceName: string;
  isNeural: boolean;
  isLocal: boolean;
  language: VoiceLanguage;
}

function splitIntoNaturalSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?]+[.!?]*/g) || [cleaned];
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

class AstronautVoiceAssistant {
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private isSupported: boolean = false;
  private isUnlocked: boolean = false;
  private isDialogueActive: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private localFallbackVoice: SpeechSynthesisVoice | null = null;
  private lastSpokenTime: Map<string, number> = new Map();
  private currentPriority: VoicePriority | null = null;
  private isSpeaking: boolean = false;
  private activeKey: string | null = null;
  private activeText: string | null = null;
  private activeMood: VoiceMood | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private factCursor: number = 0;

  private lastAnnouncement: {
    text: string;
    priority: VoicePriority;
    key: string;
    mood: VoiceMood;
    lang: VoiceLanguage;
  } | null = null;

  private fallbackSynthFn: ((voiceVolume: number, text: string) => number) | null = null;
  private ensureAudioUnlockedFn: (() => void) | null = null;
  private speakingChangeListeners = new Set<(state: VoiceSpeakingState) => void>();
  private pendingLine: {
    text: string;
    priority: VoicePriority;
    key: string;
    mood: VoiceMood;
    bypassDialogueGuard: boolean;
  } | null = null;

  private resumeTimerId: number | null = null;
  private startupWatchdogId: number | null = null;
  private speakDelayTimerId: number | null = null;
  private sentencePauseTimerId: number | null = null;
  private fallbackFinishTimerId: number | null = null;
  private keepAliveIntervalId: number | null = null;
  private speechToken: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      this.isSupported = true;
      this.loadBestVoice();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', () => this.loadBestVoice());
      } else {
        window.speechSynthesis.onvoiceschanged = () => this.loadBestVoice();
      }
    }
  }

  public setFallbackChime(fn: (voiceVolume: number, text?: string) => number | void) {
    this.fallbackSynthFn = (voiceVolume: number, text: string) => {
      const dur = fn(voiceVolume, text);
      return typeof dur === 'number' && Number.isFinite(dur) ? dur : 1100;
    };
  }

  public setUnlockAudioHandler(fn: () => void) {
    this.ensureAudioUnlockedFn = fn;
  }

  public subscribeSpeaking(listener: (state: VoiceSpeakingState) => void): () => void {
    this.speakingChangeListeners.add(listener);
    listener(this.getSpeakingState());
    return () => {
      this.speakingChangeListeners.delete(listener);
    };
  }

  public getSpeakingState(): VoiceSpeakingState {
    return {
      isSpeaking: this.isSpeaking,
      activeKey: this.activeKey,
      text: this.activeText,
      mood: this.activeMood,
      lastAnnouncementText: this.lastAnnouncement?.text ?? null,
    };
  }

  public getActiveVoiceProfile(): ActiveVoiceProfile {
    const language = this.settings.voiceLanguage || 'en';
    if (!this.isSupported || !this.selectedVoice) {
      return {
        voiceName: 'Built-in AI Telemetry Voice',
        isNeural: false,
        isLocal: true,
        language,
      };
    }
    const name = this.selectedVoice.name || 'System Voice';
    const isNeural = /natural|neural|online|aria|jenny|ava|sonia|yasmin|osman|google/i.test(name);
    return {
      voiceName: name,
      isNeural,
      isLocal: Boolean(this.selectedVoice.localService),
      language,
    };
  }

  private notifySpeakingState() {
    const snapshot = this.getSpeakingState();
    this.speakingChangeListeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch {}
    });
  }

  public unlock() {
    this.isUnlocked = true;
    if (this.isSupported) {
      this.loadBestVoice();
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }
  }

  public syncSettings(settings: AudioSettings) {
    const prevLang = this.settings.voiceLanguage;
    this.settings = { ...settings };
    if (prevLang !== this.settings.voiceLanguage) {
      this.loadBestVoice();
    }
    if (
      this.settings.muted ||
      !this.settings.voiceEnabled ||
      this.settings.masterVolume <= 0 ||
      this.settings.voiceVolume <= 0
    ) {
      this.stopAll();
    }
  }

  public setDialogueActive(active: boolean) {
    this.isDialogueActive = active;
    if (active) {
      if (this.pendingLine && !this.pendingLine.bypassDialogueGuard) {
        this.pendingLine = null;
      }
      // Never interrupt critical/high emergency or explicit player-triggered voice lines
      if (this.isSpeaking && this.currentPriority !== 'critical' && this.currentPriority !== 'high') {
        this.stopAll();
      }
    }
  }

  public resetSessionHistory() {
    this.lastSpokenTime.clear();
    this.pendingLine = null;
    this.factCursor = 0;
  }

  private scoreVoice(voice: SpeechSynthesisVoice, targetLang: VoiceLanguage, isOffline: boolean): number {
    const name = voice.name || '';
    const lang = (voice.lang || '').toLowerCase();
    let score = 0;

    // Language match
    if (targetLang === 'ms') {
      if (/^ms(-|_|$)/i.test(lang)) score += 140;
      else if (/malay|melayu/i.test(name)) score += 130;
      else if (/^id(-|_|$)/i.test(lang)) score += 65; // Close phonetic fallback if device lacks ms-MY
      else if (/^en(-|_|$)/i.test(lang)) score += 10;
      else score -= 50;
    } else {
      if (/^en[-_]us$/i.test(lang)) score += 130;
      else if (/^en[-_]gb$/i.test(lang)) score += 126;
      else if (/^en\b/i.test(lang)) score += 110;
      else score -= 60;
    }

    // Prefer modern neural / natural human-like voices
    if (/online\s*\(natural\)|neural|natural/i.test(name)) score += 75;
    if (/microsoft\s+(aria|jenny|ava|emma|sonia|libby|yasmin|osman)/i.test(name)) score += 60;
    if (/google\s+(uk\s+english\s+female|us\s+english|bahasa\s+melayu)/i.test(name)) score += 52;
    if (/samantha|serena|karen|daniel|amira|siri|enhanced|premium/i.test(name)) score += 45;
    if (/female|assistant|zira/i.test(name)) score += 15;

    // Penalize older robotic speech engines
    if (/espeak|festival|mbrola|compact|klatt/i.test(name)) score -= 70;

    // Offline reliability: prioritize local device voices when offline
    if (isOffline) {
      if (voice.localService) score += 90;
      else score -= 80;
    } else if (voice.localService) {
      score += 8;
    }

    return score;
  }

  private loadBestVoice() {
    if (!this.isSupported) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        this.selectedVoice = null;
        this.localFallbackVoice = null;
        return;
      }

      const targetLang: VoiceLanguage = this.settings.voiceLanguage || 'en';
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

      let bestVoice: SpeechSynthesisVoice | null = null;
      let bestScore = -Infinity;
      let bestLocal: SpeechSynthesisVoice | null = null;
      let bestLocalScore = -Infinity;

      for (const v of voices) {
        const s = this.scoreVoice(v, targetLang, isOffline);
        if (s > bestScore) {
          bestScore = s;
          bestVoice = v;
        }
        if (v.localService) {
          const ls = this.scoreVoice(v, targetLang, true);
          if (ls > bestLocalScore) {
            bestLocalScore = ls;
            bestLocal = v;
          }
        }
      }

      this.selectedVoice = bestVoice;
      this.localFallbackVoice = bestLocal;
    } catch {
      this.selectedVoice = null;
      this.localFallbackVoice = null;
    }
  }

  private getEffectiveVolume(): number {
    if (this.settings.muted || !this.settings.voiceEnabled) return 0;
    return Math.max(0, Math.min(1, this.settings.masterVolume * this.settings.voiceVolume));
  }

  private getClampedSpeed(): number {
    const raw = this.settings.voiceSpeed ?? 1.0;
    if (!Number.isFinite(raw)) return 1.0;
    return Math.max(0.75, Math.min(1.35, raw));
  }

  private clearActiveTimers() {
    if (this.resumeTimerId !== null) {
      window.clearTimeout(this.resumeTimerId);
      this.resumeTimerId = null;
    }
    if (this.startupWatchdogId !== null) {
      window.clearTimeout(this.startupWatchdogId);
      this.startupWatchdogId = null;
    }
    if (this.speakDelayTimerId !== null) {
      window.clearTimeout(this.speakDelayTimerId);
      this.speakDelayTimerId = null;
    }
    if (this.sentencePauseTimerId !== null) {
      window.clearTimeout(this.sentencePauseTimerId);
      this.sentencePauseTimerId = null;
    }
    if (this.fallbackFinishTimerId !== null) {
      window.clearTimeout(this.fallbackFinishTimerId);
      this.fallbackFinishTimerId = null;
    }
    if (this.keepAliveIntervalId !== null) {
      window.clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  }

  private finishSpeaking(token: number, flushPending = true) {
    if (token !== this.speechToken) return;
    this.clearActiveTimers();
    this.activeUtterance = null;
    this.isSpeaking = false;
    this.currentPriority = null;
    this.activeKey = null;
    this.activeText = null;
    this.activeMood = null;
    this.notifySpeakingState();
    if (flushPending) {
      this.flushPendingLine();
    }
  }

  public getCueText(cueId: VoiceCueId): string {
    const def = VOICE_CUES[cueId];
    if (!def) return '';
    const lang = this.settings.voiceLanguage || 'en';
    return def.text[lang] || def.text.en;
  }

  public speakCue(cueId: VoiceCueId, forceOverride = false): boolean {
    const def = VOICE_CUES[cueId];
    if (!def) return false;
    const lang = this.settings.voiceLanguage || 'en';
    const text = def.text[lang] || def.text.en;
    return this.speakCustom(
      text,
      def.priority,
      cueId,
      forceOverride ? 0 : def.cooldownMs,
      forceOverride,
      def.mood
    );
  }

  public speakEducationalFact(interrupt = true): boolean {
    const lang = this.settings.voiceLanguage || 'en';
    const fact = EDUCATIONAL_FACTS[this.factCursor % EDUCATIONAL_FACTS.length];
    this.factCursor = (this.factCursor + 1) % EDUCATIONAL_FACTS.length;
    const text = fact[lang] || fact.en;
    return this.speakCustom(text, 'high', `edu_fact_${this.factCursor}`, 0, interrupt, 'informative');
  }

  public speakMissionBriefing(
    missionTitle: string | null,
    missionInstructions: string | null,
    oxygen: number,
    isInfiniteO2: boolean,
    isDrivingRover: boolean
  ): boolean {
    const lang = this.settings.voiceLanguage || 'en';
    let message = '';

    if (!isInfiniteO2 && oxygen <= 25) {
      message =
        lang === 'ms'
          ? `Perhatian, Penjelajah. Paras oksigen anda pada ${Math.round(oxygen)} peratus. Sila kembali ke stesen penyelidikan atau masuk ke dalam Rover untuk mengisi semula oksigen.`
          : `Attention, Explorer. Your oxygen is at ${Math.round(oxygen)} percent. Please return to the research station or enter the Rover to restore oxygen.`;
    } else if (missionTitle && missionInstructions) {
      message =
        lang === 'ms'
          ? `Taklimat misi semasa: ${missionTitle}. ${missionInstructions}`
          : `Current mission briefing: ${missionTitle}. ${missionInstructions}`;
    } else if (isDrivingRover) {
      message =
        lang === 'ms'
          ? 'Sistem Rover beroperasi dengan baik. Anda boleh menggunakan Auto-Pilot pada peta mini atau meneroka gua dan pemancar satelit.'
          : 'Rover systems are nominal. Use Auto-Pilot on the mini-map or explore hidden caves and orbital relays.';
    } else {
      message =
        lang === 'ms'
          ? 'Semua objektif utama telah selesai! Teruskan meneroka gua tersembunyi, tablet sejarah, dan eksperimen makmal Marikh.'
          : 'All primary objectives are complete! Feel free to explore hidden caves, history tablets, and Mars science experiments.';
    }

    return this.speakCustom(message, 'high', 'mission_briefing', 0, true, 'informative');
  }

  public announceMissionProgress(missionTitle: string, currentCount: number, targetCount: number): boolean {
    if (targetCount <= 1 || currentCount <= 0 || currentCount >= targetCount) return false;
    const remaining = targetCount - currentCount;
    const shouldSpeakMilestone =
      remaining === 1 || currentCount === Math.ceil(targetCount / 2);
    if (!shouldSpeakMilestone) return false;

    const lang = this.settings.voiceLanguage || 'en';
    const text =
      lang === 'ms'
        ? `Kemajuan misi ${missionTitle}: ${currentCount} daripada ${targetCount} selesai. Hanya tinggal ${remaining} lagi, Penjelajah.`
        : `Mission progress for ${missionTitle}: ${currentCount} of ${targetCount} complete. Only ${remaining} remaining, Explorer.`;

    return this.speakCustom(
      text,
      'normal',
      `progress_${missionTitle}_${currentCount}`,
      12000,
      false,
      'encouraging'
    );
  }

  public speakCustom(
    text: string,
    priority: VoicePriority = 'normal',
    dedupeKey: string = text,
    cooldownMs: number = 10000,
    interrupt: boolean = false,
    mood: VoiceMood = 'informative',
    recordAsLast: boolean = true
  ): boolean {
    if (!this.isUnlocked) return false;

    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.01) return false;

    const bypassDialogueGuard = interrupt || PRIORITY_RANK[priority] >= PRIORITY_RANK.high;
    // Never let ambient low/normal speech interrupt quizzes or important modal gameplay
    if (this.isDialogueActive && !bypassDialogueGuard) {
      return false;
    }

    const now = Date.now();
    const prevTime = this.lastSpokenTime.get(dedupeKey);
    if (!interrupt && prevTime !== undefined && cooldownMs > 0 && now - prevTime < cooldownMs) {
      return false;
    }

    // Prevent overlapping speech; prioritize emergency/higher-priority/interactive speech
    let cancelledExistingSpeech = false;
    if (this.isSpeaking && this.currentPriority) {
      const shouldInterrupt =
        interrupt ||
        priority === 'critical' ||
        PRIORITY_RANK[priority] > PRIORITY_RANK[this.currentPriority];

      if (!shouldInterrupt) {
        if (PRIORITY_RANK[priority] >= PRIORITY_RANK.high) {
          this.pendingLine = { text, priority, key: dedupeKey, mood, bypassDialogueGuard };
        }
        return false;
      }

      cancelledExistingSpeech = this.cancelNativeSpeechIfActive();
    }

    this.lastSpokenTime.set(dedupeKey, now);

    if (recordAsLast) {
      this.lastAnnouncement = {
        text,
        priority,
        key: dedupeKey,
        mood,
        lang: this.settings.voiceLanguage || 'en',
      };
    }

    // Unlock Web Audio before TTS in case synthesized fallback is needed
    this.ensureAudioUnlockedFn?.();

    const token = ++this.speechToken;
    this.clearActiveTimers();
    this.isSpeaking = true;
    this.currentPriority = priority;
    this.activeKey = dedupeKey;
    this.activeText = text;
    this.activeMood = mood;
    this.notifySpeakingState();

    if (this.isSupported) {
      this.loadBestVoice();
    }

    if (!this.isSupported || typeof SpeechSynthesisUtterance === 'undefined') {
      this.playSynthesizedAiVoice(token, text);
      return true;
    }

    const sentences = splitIntoNaturalSentences(text);
    const chunks = sentences.length > 0 ? sentences : [text];

    // Delay briefly after cancel() so Chromium/Android TTS does not drop the new utterance
    if (cancelledExistingSpeech) {
      this.speakDelayTimerId = window.setTimeout(() => {
        this.speakDelayTimerId = null;
        this.speakSentenceSequence(token, chunks, 0, effectiveVol, mood, this.selectedVoice, false);
      }, 75);
    } else {
      this.speakSentenceSequence(token, chunks, 0, effectiveVol, mood, this.selectedVoice, false);
    }

    return true;
  }

  private cancelNativeSpeechIfActive(): boolean {
    if (!this.isSupported) return false;
    try {
      const wasActive =
        window.speechSynthesis.speaking ||
        window.speechSynthesis.pending ||
        this.activeUtterance !== null;
      this.activeUtterance = null;
      if (wasActive) {
        window.speechSynthesis.cancel();
        return true;
      }
    } catch {}
    return false;
  }

  private speakSentenceSequence(
    token: number,
    chunks: string[],
    chunkIndex: number,
    effectiveVol: number,
    mood: VoiceMood,
    voiceToUse: SpeechSynthesisVoice | null,
    isLocalRetry: boolean
  ) {
    if (token !== this.speechToken) return;
    if (chunkIndex >= chunks.length) {
      this.finishSpeaking(token, true);
      return;
    }

    const sentenceText = chunks[chunkIndex];
    const fullRemainingText = chunks.slice(chunkIndex).join(' ');

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    try {
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      const targetLangCode = this.settings.voiceLanguage === 'ms' ? 'ms-MY' : 'en-US';
      utterance.lang = voiceToUse?.lang || targetLangCode;
      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }

      const profile = MOOD_PROFILES[mood] || MOOD_PROFILES.informative;
      const userSpeed = this.getClampedSpeed();
      utterance.volume = effectiveVol;
      utterance.rate = Math.max(0.65, Math.min(1.5, userSpeed * profile.rateScale));
      utterance.pitch = profile.pitch;

      // Retain strong reference so Chromium/WebKit doesn't GC mid-speech
      this.activeUtterance = utterance;

      let didStart = false;
      let handledFallback = false;

      const triggerFallbackOrRetry = () => {
        if (handledFallback || token !== this.speechToken) return;
        handledFallback = true;
        this.clearActiveTimers();

        if (
          !isLocalRetry &&
          this.localFallbackVoice &&
          voiceToUse !== this.localFallbackVoice
        ) {
          const canceled = this.cancelNativeSpeechIfActive();
          if (canceled) {
            this.speakDelayTimerId = window.setTimeout(() => {
              this.speakDelayTimerId = null;
              this.speakSentenceSequence(
                token,
                chunks,
                chunkIndex,
                effectiveVol,
                mood,
                this.localFallbackVoice,
                true
              );
            }, 70);
          } else {
            this.speakSentenceSequence(
              token,
              chunks,
              chunkIndex,
              effectiveVol,
              mood,
              this.localFallbackVoice,
              true
            );
          }
          return;
        }

        this.cancelNativeSpeechIfActive();
        this.playSynthesizedAiVoice(token, fullRemainingText);
      };

      utterance.onstart = () => {
        if (token !== this.speechToken) return;
        didStart = true;
        if (this.startupWatchdogId !== null) {
          window.clearTimeout(this.startupWatchdogId);
          this.startupWatchdogId = null;
        }
        if (this.keepAliveIntervalId !== null) {
          window.clearInterval(this.keepAliveIntervalId);
        }
        this.keepAliveIntervalId = window.setInterval(() => {
          if (token !== this.speechToken) return;
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {}
        }, 3000);
      };

      utterance.onend = () => {
        if (token !== this.speechToken || handledFallback) return;
        if (
          !didStart &&
          (!window.speechSynthesis.getVoices || window.speechSynthesis.getVoices().length === 0)
        ) {
          triggerFallbackOrRetry();
          return;
        }
        this.clearActiveTimers();
        if (chunkIndex + 1 < chunks.length) {
          // Natural breathing pause between sentences for human-like pacing
          this.sentencePauseTimerId = window.setTimeout(() => {
            this.sentencePauseTimerId = null;
            this.speakSentenceSequence(
              token,
              chunks,
              chunkIndex + 1,
              effectiveVol,
              mood,
              voiceToUse,
              isLocalRetry
            );
          }, 135);
        } else {
          this.finishSpeaking(token, true);
        }
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (token !== this.speechToken) return;
        const err = event?.error;
        if (err === 'canceled' || err === 'interrupted') {
          if (this.activeUtterance !== utterance) return;
        }
        triggerFallbackOrRetry();
      };

      // Startup watchdog: if native TTS silently fails to begin within 650ms, fall back smoothly
      this.startupWatchdogId = window.setTimeout(() => {
        this.startupWatchdogId = null;
        if (token !== this.speechToken || didStart || handledFallback) return;
        let actuallySpeaking = false;
        try {
          actuallySpeaking = window.speechSynthesis.speaking;
        } catch {}
        if (!actuallySpeaking) {
          triggerFallbackOrRetry();
        }
      }, 650);

      // Dynamic duration watchdog in case mobile WebView drops onend
      const maxDurationMs = Math.max(9000, Math.min(26000, sentenceText.length * 115 + 3200));
      this.resumeTimerId = window.setTimeout(() => {
        this.resumeTimerId = null;
        if (token !== this.speechToken || handledFallback) return;
        this.finishSpeaking(token, true);
      }, maxDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      this.playSynthesizedAiVoice(token, fullRemainingText);
    }
  }

  private playSynthesizedAiVoice(token: number, text: string) {
    if (token !== this.speechToken) return;
    if (
      this.settings.muted ||
      !this.settings.voiceEnabled ||
      this.settings.masterVolume <= 0 ||
      this.settings.voiceVolume <= 0
    ) {
      this.finishSpeaking(token, false);
      return;
    }

    const durationMs = this.fallbackSynthFn
      ? this.fallbackSynthFn(this.settings.voiceVolume, text)
      : 900;
    this.fallbackFinishTimerId = window.setTimeout(() => {
      this.fallbackFinishTimerId = null;
      this.finishSpeaking(token, true);
    }, Math.max(450, durationMs));
  }

  private flushPendingLine() {
    if (!this.pendingLine) return;
    const next = this.pendingLine;
    this.pendingLine = null;
    window.setTimeout(() => {
      this.speakCustom(
        next.text,
        next.priority,
        next.key,
        0,
        next.bypassDialogueGuard,
        next.mood
      );
    }, 150);
  }

  public previewVoice(): { ok: boolean; reason?: 'muted' | 'disabled' } {
    this.ensureAudioUnlockedFn?.();
    this.unlock();
    if (this.settings.muted || this.settings.masterVolume <= 0.01) {
      return { ok: false, reason: 'muted' };
    }
    if (!this.settings.voiceEnabled || this.settings.voiceVolume <= 0.01) {
      return { ok: false, reason: 'disabled' };
    }
    const lang = this.settings.voiceLanguage || 'en';
    const previewLine =
      lang === 'ms'
        ? 'Selamat datang, Penjelajah. Pembantu suara misi Marikh aktif dan bersedia membantu anda.'
        : 'Welcome, Explorer. Mars Mission AI assistant online. All telemetry and voice channels are clear.';
    this.speakCustom(previewLine, 'critical', '__voice_preview__', 0, true, 'welcoming', true);
    return { ok: true };
  }

  public testVoice(): { ok: boolean; reason?: 'muted' | 'disabled' } {
    return this.previewVoice();
  }

  public repeatLastAnnouncement(): { ok: boolean; reason?: 'muted' | 'disabled' | 'empty' } {
    this.ensureAudioUnlockedFn?.();
    this.unlock();
    if (this.settings.muted || this.settings.masterVolume <= 0.01) {
      return { ok: false, reason: 'muted' };
    }
    if (!this.settings.voiceEnabled || this.settings.voiceVolume <= 0.01) {
      return { ok: false, reason: 'disabled' };
    }
    if (!this.lastAnnouncement) {
      return { ok: false, reason: 'empty' };
    }

    const currentLang = this.settings.voiceLanguage || 'en';
    const cueDef = VOICE_CUES[this.lastAnnouncement.key as VoiceCueId];
    const textToSpeak = cueDef
      ? cueDef.text[currentLang] || cueDef.text.en
      : this.lastAnnouncement.text;

    this.speakCustom(
      textToSpeak,
      'high',
      `__repeat_${this.lastAnnouncement.key}__`,
      0,
      true,
      this.lastAnnouncement.mood,
      false
    );
    return { ok: true };
  }

  public stopAll() {
    this.speechToken++;
    this.pendingLine = null;
    this.clearActiveTimers();
    this.activeUtterance = null;
    this.isSpeaking = false;
    this.currentPriority = null;
    this.activeKey = null;
    this.activeText = null;
    this.activeMood = null;
    this.cancelNativeSpeechIfActive();
    this.notifySpeakingState();
  }
}

export const voiceAssistant = new AstronautVoiceAssistant();
