export type MusicContext =
  | 'menu'
  | 'exploration'
  | 'astroneer_chill'
  | 'survival'
  | 'survival_low_o2'
  | 'mission'
  | 'research_base'
  | 'final_mission'
  | 'victory'
  | 'silent';

export type VoiceLanguage = 'en' | 'ms';

export type VoiceMood =
  | 'welcoming'
  | 'calm_emergency'
  | 'excited'
  | 'encouraging'
  | 'informative';

export type VoiceCueId =
  | 'game_start'
  | 'mission_start'
  | 'mission_progress'
  | 'crystal_discovery'
  | 'crystal_collect'
  | 'all_crystals'
  | 'low_oxygen'
  | 'critical_oxygen'
  | 'oxygen_refilled'
  | 'rover_discovery'
  | 'rover_repaired'
  | 'research_base'
  | 'mission_complete'
  | 'quiz_complete'
  | 'final_mission'
  | 'victory'
  | 'cave_discovery'
  | 'underground_base'
  | 'lab_experiment'
  | 'satellite_aligned'
  | 'tablet_discovery'
  | 'checkpoint_activated'
  | 'educational_fact';

export type VoicePriority = 'low' | 'normal' | 'high' | 'critical';

export type MusicTrackChoice = 'auto' | Exclude<MusicContext, 'silent'>;

export interface MusicTrackOption {
  id: MusicTrackChoice;
  title: string;
  mood: string;
}

export const MUSIC_TRACK_OPTIONS: MusicTrackOption[] = [
  { id: 'auto', title: 'Auto (Dynamic by Scene)', mood: 'Matches menu, planet, base & storms' },
  { id: 'menu', title: 'Space Dreams', mood: 'Serene cosmic ambient' },
  { id: 'astroneer_chill', title: 'Astroneer Dreams', mood: 'Warm dreamy space plucks' },
  { id: 'exploration', title: 'The Unknown Planet', mood: 'Wondrous Martian discovery' },
  { id: 'mission', title: 'The Final Expedition', mood: 'Inspiring adventure synth' },
  { id: 'research_base', title: 'Future Science', mood: 'Peaceful orbital habitat' },
  { id: 'survival', title: 'Beyond the Danger', mood: 'Suspenseful deep-space pulse' },
  { id: 'victory', title: 'A New Beginning', mood: 'Uplifting celestial finale' },
];

export interface AudioSettings {
  masterVolume: number; // 0..1
  musicVolume: number;  // 0..1
  sfxVolume: number;    // 0..1
  voiceVolume: number;  // 0..1
  voiceSpeed: number;   // 0.75..1.35
  voiceLanguage: VoiceLanguage; // 'en' | 'ms'
  muted: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  astroneerSoundtrack: boolean;
  musicTrack: MusicTrackChoice;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.72,
  musicVolume: 0.52,
  sfxVolume: 0.7,
  voiceVolume: 0.9,
  voiceSpeed: 1.0,
  voiceLanguage: 'en',
  muted: false,
  musicEnabled: true,
  sfxEnabled: true,
  voiceEnabled: true,
  astroneerSoundtrack: true,
  musicTrack: 'auto',
};
