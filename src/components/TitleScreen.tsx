import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GameMode, GAME_MODES, SUIT_COLORS, SuitColor } from '../types/game';
import { sounds } from '../audio/SoundEffects';
import { PWAInstallButton } from './PWAControls';
import { OfflineExpeditionSave } from '../data/offlineSave';
import { BountyCountdownText } from './BountyCountdownText';
import marsHorizonBackdrop from '../assets/images/mars_horizon_backdrop_1794663779937.jpg';

interface TitleScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  selectedSuit: SuitColor;
  onSelectSuit: (suit: SuitColor) => void;
  playerName: string;
  onChangePlayerName: (name: string) => void;
  roomId: string | null;
  remoteCrewCount: number;
  onOpenFriendsLobby: () => void;
  onOpenDailyBounties?: () => void;
  dailyBountiesCompleted?: number;
  dailyBountiesTotal?: number;
  bountyResetCountdown?: string;
  onOpenMarsHistory?: () => void;
  discoveredTabletsCount?: number;
  totalTabletsCount?: number;
  onOpenLeaderboard?: () => void;
  careerCorrectCount?: number;
  careerRank?: number | null;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenAudioSettings?: () => void;
  savedExpedition?: OfflineExpeditionSave | null;
  onContinueSaved?: () => void;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  onSelectMode,
  selectedSuit,
  onSelectSuit,
  playerName,
  onChangePlayerName,
  roomId,
  remoteCrewCount,
  onOpenFriendsLobby,
  onOpenDailyBounties,
  dailyBountiesCompleted = 0,
  dailyBountiesTotal = 3,
  bountyResetCountdown = '',
  onOpenMarsHistory,
  discoveredTabletsCount = 0,
  totalTabletsCount = 8,
  onOpenLeaderboard,
  careerCorrectCount = 0,
  careerRank = null,
  isMuted = false,
  onToggleMute,
  onOpenAudioSettings,
  savedExpedition = null,
  onContinueSaved,
  onStart,
}) => {
  const [bgImageFailed, setBgImageFailed] = useState(false);
  const [songTitle, setSongTitle] = useState<string>(() => sounds.getCurrentMusicTitle());

  useEffect(() => {
    const syncTitle = () => setSongTitle(sounds.getCurrentMusicTitle());
    syncTitle();
    return sounds.subscribe(syncTitle);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.closest('[data-interactive-ui="true"]')
      ) {
        return;
      }
      if (e.code === 'Enter') {
        sounds.playClick();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="absolute inset-0 z-40 flex flex-col justify-between items-center p-3 sm:p-5 lg:p-7 bg-gradient-to-b from-[#170a0d] via-[#361510] to-[#0b0e17] pointer-events-auto select-none overflow-y-auto"
    >
      {/* Panoramic Mars Surface Backdrop with Measured Contrast Scrim */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {!bgImageFailed && (
          <img
            src={marsHorizonBackdrop}
            alt="Martian canyon horizon with Olympus Mons, Phobos, Deimos, and glowing energy crystals"
            referrerPolicy="no-referrer"
            onError={() => setBgImageFailed(true)}
            className="w-full h-full object-cover object-center opacity-70 scale-[1.02]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/90" />
      </div>

      {/* Top PWA install, offline readiness & audio bar */}
      <div className="relative z-10 w-full max-w-4xl flex flex-wrap items-center justify-between gap-2">
        <PWAInstallButton />

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {onOpenAudioSettings && (
            <button
              type="button"
              onClick={() => {
                sounds.unlockAudio();
                sounds.playClick();
                onOpenAudioSettings();
              }}
              data-interactive-ui="true"
              className="px-3 py-1.5 rounded-xl bg-sky-950/85 hover:bg-sky-900 border border-sky-500/60 text-sky-200 text-xs font-game font-bold flex items-center gap-1.5 transition shadow-md active:scale-95 whitespace-nowrap shrink-0"
              title="Choose background music song"
            >
              <span>♪</span>
              <span>Song: {isMuted ? 'Muted' : songTitle}</span>
            </button>
          )}
          {onToggleMute && (
            <button
              type="button"
              onClick={() => {
                sounds.unlockAudio();
                sounds.playClick();
                onToggleMute();
              }}
              data-interactive-ui="true"
              className={`px-3 py-1.5 rounded-xl border text-xs font-game font-bold flex items-center gap-1.5 transition shadow-md active:scale-95 whitespace-nowrap shrink-0 ${
                isMuted
                  ? 'bg-rose-950/90 border-rose-500/70 text-rose-200'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <span>{isMuted ? '🔇' : '🔊'}</span>
              <span>{isMuted ? 'Muted' : 'Sound ON'}</span>
            </button>
          )}
          {onOpenAudioSettings && (
            <button
              type="button"
              onClick={() => {
                sounds.unlockAudio();
                sounds.playClick();
                onOpenAudioSettings();
              }}
              data-interactive-ui="true"
              className="px-3 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 text-xs font-game font-bold flex items-center gap-1.5 transition shadow-md active:scale-95 whitespace-nowrap shrink-0"
            >
              <span>🎛️</span>
              <span>Audio, Voice &amp; FOV</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Center Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl my-auto py-1.5"
      >
        {/* SVG Title Lockup */}
        <div className="mb-1 sm:mb-2">
          <svg
            viewBox="0 0 760 140"
            className="w-full max-w-[260px] [@media(min-height:520px)]:max-w-[380px] sm:max-w-[500px] drop-shadow-2xl"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="marsGrad" x1="0" y1="0" x2="760" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            <ellipse cx="380" cy="70" rx="360" ry="32" stroke="rgba(239, 68, 68, 0.25)" strokeWidth="3" />
            <circle cx="380" cy="70" r="44" fill="#c2410c" opacity="0.35" />

            <text
              x="380"
              y="56"
              textAnchor="middle"
              fontFamily="'Fredoka', 'Plus Jakarta Sans', sans-serif"
              fontSize="60"
              fontWeight="900"
              letterSpacing="5"
              fill="url(#marsGrad)"
            >
              MARS SURVIVAL
            </text>

            <rect x="230" y="78" width="300" height="30" rx="15" fill="#0f172a" stroke="#ea580c" strokeWidth="2" />
            <text
              x="380"
              y="99"
              textAnchor="middle"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontSize="16"
              fontWeight="800"
              letterSpacing="4"
              fill="#fed7aa"
            >
              LAST EXPLORER · 3D ADVENTURE
            </text>
          </svg>
        </div>

        <p className="text-[11px] sm:text-sm text-slate-300 max-w-xl mb-2.5 sm:mb-4 leading-snug sm:leading-relaxed font-medium">
          Step into your Roblox-styled spacesuit on Mars. Roam red canyons, drive the Curiosity Rover, survey the expanded Research Space Station, and test your planetary science skills!
        </p>

        {/* --- 5 GAME MODES SELECTOR --- */}
        <div className="w-full max-w-4xl mb-2.5 sm:mb-4">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 sm:mb-2">
            Select Game Mode:
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {GAME_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  sounds.playClick();
                  onSelectMode(mode.id);
                }}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition flex flex-col justify-between ${
                  selectedMode === mode.id
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-lg shadow-amber-950 ring-2 ring-amber-400/50'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                  <span className="text-sm sm:text-lg">{mode.icon}</span>
                  <span className="font-game font-bold text-[10px] sm:text-xs truncate">{mode.name}</span>
                </div>
                <div className="text-[9px] sm:text-[10px] leading-tight opacity-90 line-clamp-2">{mode.tagline}</div>
              </button>
            ))}
          </div>
        </div>

        {/* --- SPACESUIT COLOR CUSTOMIZATION --- */}
        <div className="w-full max-w-xl mb-3 sm:mb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Spacesuit Color:
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SUIT_COLORS.map((suit) => (
              <button
                key={suit.id}
                onClick={() => {
                  sounds.playClick();
                  onSelectSuit(suit.id);
                }}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition ${
                  selectedSuit === suit.id
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ backgroundColor: suit.hex, borderColor: suit.accent }}
                />
                <span className="text-xs font-bold">{suit.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* --- ASTRONAUT CALLSIGN & PLAY WITH FRIENDS --- */}
        <div className="w-full max-w-3xl mb-3 sm:mb-4 flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-2xl px-3 py-2 min-w-[190px] flex-1 max-w-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              🧑‍🚀 Name:
            </span>
            <input
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => onChangePlayerName(e.target.value)}
              placeholder="Commander"
              className="bg-transparent outline-none text-xs sm:text-sm font-bold text-white w-full min-w-0"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onOpenFriendsLobby();
            }}
            className={`px-3.5 py-2 rounded-2xl border font-game font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 ${
              roomId
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50'
                : 'bg-slate-900/90 hover:bg-slate-800 border-cyan-600/70 text-cyan-300'
            }`}
          >
            <span>👥</span>
            <span>
              {roomId
                ? `Room ${roomId} (${1 + remoteCrewCount} Crew)`
                : 'Play With Friends'}
            </span>
          </button>

          {onOpenDailyBounties && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenDailyBounties();
              }}
              className="px-3.5 py-2 rounded-2xl border border-amber-500/80 bg-amber-950/85 hover:bg-amber-900 text-amber-200 font-game font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <span>🏆</span>
              <span>
                Bounties ({dailyBountiesCompleted}/{dailyBountiesTotal})
              </span>
              <span className="font-mono-numbers text-[11px] text-amber-300 hidden sm:inline">
                · {bountyResetCountdown || <BountyCountdownText />}
              </span>
            </button>
          )}

          {onOpenMarsHistory && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenMarsHistory();
              }}
              className="px-3.5 py-2 rounded-2xl border border-teal-500/80 bg-teal-950/85 hover:bg-teal-900 text-teal-200 font-game font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <span>📜</span>
              <span>
                History ({discoveredTabletsCount}/{totalTabletsCount})
              </span>
            </button>
          )}

          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              className="px-3.5 py-2 rounded-2xl border border-emerald-500/80 bg-emerald-950/85 hover:bg-emerald-900 text-emerald-200 font-game font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <span>🏅</span>
              <span>
                Leaderboard
                {careerRank ? ` (#${careerRank})` : careerCorrectCount > 0 ? ` (✓ ${careerCorrectCount})` : ''}
              </span>
            </button>
          )}
        </div>

        {/* Primary Start / Continue CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {savedExpedition && onContinueSaved && !roomId && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onContinueSaved();
              }}
              className="px-5 py-3 sm:px-7 sm:py-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-game font-bold text-sm sm:text-lg shadow-2xl shadow-emerald-500/35 border-3 sm:border-4 border-emerald-200 transition-all transform hover:scale-105 active:scale-95"
            >
              <span className="flex flex-col items-center leading-tight">
                <span>▶ CONTINUE OFFLINE SAVE</span>
                <span className="text-[10px] sm:text-[11px] font-extrabold opacity-85 mt-0.5">
                  {savedExpedition.gameMode.toUpperCase()} · 💎 {savedExpedition.collectedCrystalIds.length}/10 · ⭐ {savedExpedition.score} XP
                </span>
              </span>
            </button>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onStart();
            }}
            className="group relative px-7 py-3 sm:px-10 sm:py-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-slate-950 font-game font-bold text-base sm:text-2xl shadow-2xl shadow-orange-500/50 border-3 sm:border-4 border-amber-200 transition-all transform hover:scale-105 active:scale-95"
          >
            <span className="flex items-center gap-2.5 sm:gap-3">
              <span>🚀</span>
              <span>
                {roomId
                  ? `JOIN CREW ROOM ${roomId}`
                  : savedExpedition
                  ? 'NEW EXPEDITION'
                  : 'LAUNCH EXPEDITION'}
              </span>
              <span>→</span>
            </span>
          </button>
        </div>
      </motion.div>

      {/* Control hints line */}
      <div className="relative z-10 text-[10px] sm:text-xs text-slate-300 font-medium tracking-wide mt-2 text-center">
        <span className="text-amber-400 font-semibold">WASD / Joystick</span> Move ·{' '}
        <span className="text-amber-400 font-semibold">Space / 🚀</span> Mars Jump & Flap ·{' '}
        <span className="text-sky-300 font-semibold">G / 🪽</span> Glide ·{' '}
        <span className="text-amber-400 font-semibold">E / ⚡</span> Interact ·{' '}
        <span className="text-amber-400 font-semibold">Drag / Q,X</span> 360° Cam
      </div>
    </motion.div>
  );
};
