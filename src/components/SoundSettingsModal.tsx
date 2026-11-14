import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  Bot,
  RotateCcw,
  Gauge,
  Globe,
  Repeat,
  Camera,
} from 'lucide-react';
import {
  AudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  MUSIC_TRACK_OPTIONS,
  MusicTrackChoice,
  VoiceLanguage,
} from '../types/audio';
import {
  DEFAULT_CAMERA_FOV,
  MAX_CAMERA_FOV,
  MIN_CAMERA_FOV,
} from '../utils/cameraSettings';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant, VoiceSpeakingState } from '../audio/VoiceAssistant';

interface SoundSettingsModalProps {
  isOpen: boolean;
  settings: AudioSettings;
  cameraFov: number;
  onChangeCameraFov: (fov: number) => void;
  onUpdateSettings: (partial: Partial<AudioSettings>) => void;
  onClose: () => void;
}

interface VolumeSliderRowProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  disabled?: boolean;
  accentClass: string;
  onChange: (val: number) => void;
}

const VolumeSliderRow: React.FC<VolumeSliderRowProps> = ({
  label,
  icon,
  value,
  disabled = false,
  accentClass,
  onChange,
}) => {
  const pct = Math.round(value * 100);
  return (
    <div
      className={`p-3 rounded-2xl border transition ${
        disabled
          ? 'bg-slate-900/50 border-slate-800/80 opacity-55'
          : 'bg-slate-800/75 border-slate-700/90'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-game font-bold text-slate-100">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-mono-numbers text-xs sm:text-sm font-bold text-amber-300">
          {pct}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={label}
        className={`w-full h-3 rounded-full cursor-pointer touch-pan-x ${accentClass}`}
      />
    </div>
  );
};

interface ToggleSwitchRowProps {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  checked: boolean;
  activeColorClass: string;
  onToggle: () => void;
}

const ToggleSwitchRow: React.FC<ToggleSwitchRowProps> = ({
  label,
  sublabel,
  icon,
  checked,
  activeColorClass,
  onToggle,
}) => (
  <button
    type="button"
    onClick={() => {
      sounds.playClick();
      onToggle();
    }}
    className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition active:scale-99 touch-manipulation ${
      checked
        ? 'bg-slate-800/85 border-slate-600'
        : 'bg-slate-900/70 border-slate-800 text-slate-400'
    }`}
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="font-game font-bold text-xs sm:text-sm text-slate-100 truncate">
          {label}
        </div>
        <div className="text-[11px] text-slate-400 truncate">{sublabel}</div>
      </div>
    </div>

    <div
      className={`px-3 py-1 rounded-xl font-game font-bold text-xs uppercase tracking-wider shrink-0 border transition ${
        checked ? activeColorClass : 'bg-slate-800 border-slate-700 text-slate-400'
      }`}
    >
      {checked ? 'ON' : 'OFF'}
    </div>
  </button>
);

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  settings,
  cameraFov,
  onChangeCameraFov,
  onUpdateSettings,
  onClose,
}) => {
  const [voiceTestNotice, setVoiceTestNotice] = useState<string | null>(null);
  const [speakingState, setSpeakingState] = useState<VoiceSpeakingState>(() =>
    voiceAssistant.getSpeakingState()
  );

  useEffect(() => {
    return voiceAssistant.subscribeSpeaking(setSpeakingState);
  }, []);

  if (!isOpen) return null;

  const voiceControlsDisabled = settings.muted || !settings.voiceEnabled;
  const speedPct = Math.round((settings.voiceSpeed ?? 1.0) * 100);
  const activeLanguage: VoiceLanguage = settings.voiceLanguage || 'en';
  const activeSongChoice: MusicTrackChoice = settings.musicTrack || 'auto';
  const currentPlayingTitle = sounds.getCurrentMusicTitle();

  const handleSelectSong = (trackId: MusicTrackChoice) => {
    sounds.unlockAudio();
    sounds.playClick();
    onUpdateSettings({
      musicTrack: trackId,
      musicEnabled: true,
      muted: false,
    });
  };

  const handleLanguageSelect = (lang: VoiceLanguage) => {
    sounds.unlockAudio();
    sounds.playClick();
    setVoiceTestNotice(null);
    onUpdateSettings({ voiceLanguage: lang });
  };

  const handlePreviewVoice = () => {
    sounds.unlockAudio();
    const res = voiceAssistant.previewVoice();
    if (!res.ok) {
      setVoiceTestNotice(
        res.reason === 'muted'
          ? 'Sound is muted — unmute above to hear the AI Voice preview.'
          : 'AI Assistant Voice is OFF — switch it ON below to preview.'
      );
    } else {
      setVoiceTestNotice(null);
    }
  };

  const handleRepeatLast = () => {
    sounds.unlockAudio();
    const res = voiceAssistant.repeatLastAnnouncement();
    if (!res.ok) {
      if (res.reason === 'muted') {
        setVoiceTestNotice('Sound is muted — unmute above to repeat the announcement.');
      } else if (res.reason === 'disabled') {
        setVoiceTestNotice('AI Assistant Voice is OFF — switch it ON below to listen.');
      } else {
        setVoiceTestNotice('No announcement recorded yet — tap Preview Voice or start your mission!');
      }
    } else {
      setVoiceTestNotice(null);
    }
  };

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-cyan-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
              {settings.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-cyan-200">
                Audio, Voice &amp; Camera Settings
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Mission AI Voice (EN / MS), Soundtrack &amp; Camera FOV
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm touch-manipulation"
            aria-label="Close Sound Settings"
          >
            ✕
          </button>
        </div>

        {/* Mute All Sounds Master Banner */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              const nextMuted = !settings.muted;
              onUpdateSettings({ muted: nextMuted });
              setVoiceTestNotice(null);
              if (!nextMuted) {
                sounds.unlockAudio();
                sounds.playClick();
              }
            }}
            className={`w-full py-3 px-4 rounded-2xl border-2 font-game font-bold text-sm flex items-center justify-between transition active:scale-98 touch-manipulation ${
              settings.muted
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50'
                : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {settings.muted ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
              <span>Mute All Sounds</span>
            </span>
            <span
              className={`px-3 py-0.5 rounded-xl text-xs uppercase tracking-wider border ${
                settings.muted
                  ? 'bg-rose-600 text-white border-rose-300'
                  : 'bg-slate-900/90 text-emerald-300 border-emerald-500/60'
              }`}
            >
              {settings.muted ? 'MUTED' : 'ACTIVE'}
            </span>
          </button>
        </div>

        {/* Camera Field of View (FOV) Section */}
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/55 space-y-2.5 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-game font-bold text-amber-200">
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Camera Field of View (FOV)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers text-xs sm:text-sm font-bold text-amber-300 bg-slate-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-lg">
                {Math.round(cameraFov)}°
              </span>
              {Math.round(cameraFov) !== DEFAULT_CAMERA_FOV && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onChangeCameraFov(DEFAULT_CAMERA_FOV);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-600 text-[10px] font-bold text-slate-200 transition touch-manipulation"
                >
                  Reset {DEFAULT_CAMERA_FOV}°
                </button>
              )}
            </div>
          </div>

          <input
            type="range"
            min={MIN_CAMERA_FOV}
            max={MAX_CAMERA_FOV}
            step={1}
            value={Math.round(cameraFov)}
            onChange={(e) => onChangeCameraFov(Number(e.target.value))}
            aria-label="Camera Field of View"
            className="w-full h-3 rounded-full cursor-pointer touch-pan-x accent-amber-400"
          />

          <div className="flex items-center justify-between text-[10px] font-mono-numbers text-slate-400 px-0.5">
            <span>{MIN_CAMERA_FOV}° Focused</span>
            <span className="text-amber-300 font-bold">{DEFAULT_CAMERA_FOV}° Default</span>
            <span>{MAX_CAMERA_FOV}° Wide Mars</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { label: '75° Close', val: 75 },
              { label: '95° Default', val: DEFAULT_CAMERA_FOV },
              { label: '110° Ultra-Wide', val: 110 },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onChangeCameraFov(preset.val);
                }}
                className={`py-1 px-2 rounded-lg text-[11px] font-game font-bold border transition touch-manipulation ${
                  Math.round(cameraFov) === preset.val
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : 'bg-slate-900/75 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Assistant Voice Language & Speed Section */}
        <div className="p-3.5 rounded-2xl bg-cyan-950/35 border border-cyan-500/50 space-y-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-game font-bold text-cyan-200">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>AI Assistant Language</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLanguageSelect('en')}
                className={`px-3 py-1 rounded-xl text-xs font-game font-bold border transition touch-manipulation ${
                  activeLanguage === 'en'
                    ? 'bg-cyan-500 border-cyan-200 text-slate-950 shadow'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSelect('ms')}
                className={`px-3 py-1 rounded-xl text-xs font-game font-bold border transition touch-manipulation ${
                  activeLanguage === 'ms'
                    ? 'bg-cyan-500 border-cyan-200 text-slate-950 shadow'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Bahasa Melayu
              </button>
            </div>
          </div>

          {/* Voice Speed Control */}
          <div
            className={`pt-2 border-t border-cyan-500/25 ${
              voiceControlsDisabled ? 'opacity-55' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-game font-bold text-slate-100">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>AI Voice Speed</span>
              </div>
              <span className="font-mono-numbers text-xs sm:text-sm font-bold text-cyan-300">
                {(settings.voiceSpeed ?? 1.0).toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min={75}
              max={135}
              step={5}
              value={speedPct}
              disabled={voiceControlsDisabled}
              onChange={(e) => onUpdateSettings({ voiceSpeed: Number(e.target.value) / 100 })}
              aria-label="AI Voice Speed"
              className="w-full h-3 rounded-full cursor-pointer touch-pan-x accent-cyan-400 mb-2"
            />
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Calm 0.85×', val: 0.85 },
                { label: 'Normal 1.0×', val: 1.0 },
                { label: 'Brisk 1.15×', val: 1.15 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  disabled={voiceControlsDisabled}
                  onClick={() => {
                    sounds.playClick();
                    onUpdateSettings({ voiceSpeed: preset.val });
                  }}
                  className={`py-1 px-2 rounded-lg text-[11px] font-game font-bold border transition touch-manipulation ${
                    Math.abs((settings.voiceSpeed ?? 1.0) - preset.val) < 0.03
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900/75 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Volume Sliders */}
        <div className="space-y-2.5 mb-4">
          <VolumeSliderRow
            label="AI Assistant Voice Volume"
            icon={<Bot className="w-4 h-4 text-cyan-400" />}
            value={settings.voiceVolume}
            disabled={voiceControlsDisabled}
            accentClass="accent-cyan-400"
            onChange={(val) => onUpdateSettings({ voiceVolume: val })}
          />

          <VolumeSliderRow
            label="Master Volume"
            icon={<Volume2 className="w-4 h-4 text-amber-400" />}
            value={settings.masterVolume}
            disabled={settings.muted}
            accentClass="accent-amber-400"
            onChange={(val) => onUpdateSettings({ masterVolume: val })}
          />

          <VolumeSliderRow
            label="Background Music Volume"
            icon={<Music className="w-4 h-4 text-sky-400" />}
            value={settings.musicVolume}
            disabled={settings.muted || !settings.musicEnabled}
            accentClass="accent-sky-400"
            onChange={(val) => onUpdateSettings({ musicVolume: val })}
          />

          <VolumeSliderRow
            label="Sound Effects Volume"
            icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            value={settings.sfxVolume}
            disabled={settings.muted || !settings.sfxEnabled}
            accentClass="accent-emerald-400"
            onChange={(val) => onUpdateSettings({ sfxVolume: val })}
          />
        </div>

        {/* Background Song Selector */}
        <div className="p-3.5 rounded-2xl bg-sky-950/35 border border-sky-500/45 space-y-2.5 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-game font-bold text-sky-200">
              <Music className="w-4 h-4 text-sky-400" />
              <span>Background Soundtrack</span>
            </div>
            <span className="text-[11px] font-semibold text-sky-300 truncate max-w-[190px]">
              {settings.muted || !settings.musicEnabled ? 'Paused' : `♪ ${currentPlayingTitle}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {MUSIC_TRACK_OPTIONS.map((track) => {
              const selected = activeSongChoice === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectSong(track.id)}
                  className={`p-2 rounded-xl border text-left transition touch-manipulation active:scale-98 ${
                    selected
                      ? 'bg-sky-500/25 border-sky-400 text-sky-100 shadow-sm'
                      : 'bg-slate-900/75 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-[11px] sm:text-xs font-game font-bold truncate">
                    {track.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{track.mood}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Individual Channel Switches */}
        <div className="space-y-2 mb-4">
          <ToggleSwitchRow
            label="AI Assistant Voice"
            sublabel="Mission briefings, discoveries, Mars facts & calm oxygen alerts"
            icon={<Bot className="w-4 h-4 text-cyan-400" />}
            checked={settings.voiceEnabled}
            activeColorClass="bg-cyan-600 border-cyan-300 text-white"
            onToggle={() => {
              setVoiceTestNotice(null);
              onUpdateSettings({ voiceEnabled: !settings.voiceEnabled });
            }}
          />

          <ToggleSwitchRow
            label="Background Music"
            sublabel="Space Dreams, Unknown Planet, Beyond the Danger, Expedition & Victory"
            icon={<Music className="w-4 h-4 text-sky-400" />}
            checked={settings.musicEnabled}
            activeColorClass="bg-sky-600 border-sky-300 text-white"
            onToggle={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
          />

          <ToggleSwitchRow
            label="Astroneer Relaxed Soundtrack"
            sublabel="Warm dreamy plucked arpeggios & soft cosmic pads during exploration"
            icon={<Music className="w-4 h-4 text-teal-400" />}
            checked={settings.astroneerSoundtrack}
            activeColorClass="bg-teal-600 border-teal-300 text-white"
            onToggle={() => onUpdateSettings({ astroneerSoundtrack: !settings.astroneerSoundtrack })}
          />

          <ToggleSwitchRow
            label="Sound Effects"
            sublabel="Footsteps, jumping, crystals, oxygen alarms, rover engine & research base"
            icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            checked={settings.sfxEnabled}
            activeColorClass="bg-emerald-600 border-emerald-300 text-white"
            onToggle={() => onUpdateSettings({ sfxEnabled: !settings.sfxEnabled })}
          />
        </div>

        {/* Voice Preview, Repeat Last Announcement, Test SFX & Reset */}
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <button
            type="button"
            onClick={handlePreviewVoice}
            className={`py-2.5 px-3 rounded-xl border font-game font-bold text-xs transition touch-manipulation active:scale-95 ${
              speakingState.isSpeaking && speakingState.activeKey === '__voice_preview__'
                ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 border-cyan-500/60 text-cyan-200'
            }`}
          >
            {speakingState.isSpeaking && speakingState.activeKey === '__voice_preview__'
              ? '🔊 Speaking Preview...'
              : '🎙️ Preview Voice'}
          </button>

          <button
            type="button"
            onClick={handleRepeatLast}
            className={`py-2.5 px-3 rounded-xl border font-game font-bold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation active:scale-95 ${
              speakingState.isSpeaking && speakingState.activeKey?.startsWith('__repeat_')
                ? 'bg-sky-400 text-slate-950 border-sky-200'
                : 'bg-slate-800 hover:bg-slate-700 border-sky-500/50 text-sky-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Repeat Last</span>
          </button>
        </div>

        {speakingState.lastAnnouncementText && (
          <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 truncate">
            <span className="text-cyan-400 font-bold mr-1">Last AI Line:</span>
            &ldquo;{speakingState.lastAnnouncementText}&rdquo;
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setVoiceTestNotice(null);
              sounds.testSfx();
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/50 text-emerald-200 font-game font-bold text-xs transition touch-manipulation active:scale-95"
          >
            🔔 Test SFX
          </button>

          <button
            type="button"
            onClick={() => {
              setVoiceTestNotice(null);
              sounds.playClick();
              onUpdateSettings({ ...DEFAULT_AUDIO_SETTINGS });
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-game font-bold text-xs flex items-center justify-center gap-1 transition touch-manipulation active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Audio</span>
          </button>
        </div>

        {voiceTestNotice && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs text-center">
            {voiceTestNotice}
          </div>
        )}

        {/* Done Button */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-slate-950 font-game font-bold text-sm sm:text-base shadow-lg transition touch-manipulation active:scale-98"
        >
          ✓ Save &amp; Return
        </button>
      </div>
    </div>
  );
};
