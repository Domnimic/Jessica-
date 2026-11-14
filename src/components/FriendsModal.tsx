import React, { useEffect, useState } from 'react';
import { SUIT_COLORS, SuitColor } from '../types/game';
import { ConnectionStatus, RemotePlayerState } from '../types/multiplayer';
import { sounds } from '../audio/SoundEffects';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface FriendsModalProps {
  isOpen: boolean;
  roomId: string | null;
  connectionStatus: ConnectionStatus;
  playerName: string;
  suitColor: SuitColor;
  localPos: { x: number; z: number };
  remotePlayers: RemotePlayerState[];
  onChangePlayerName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onPingCrew: () => void;
  onClose: () => void;
  onNotify: (title: string, message: string, type?: 'normal' | 'warning' | 'success') => void;
}

function extractRoomCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('room=')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/?${trimmed.split('?').pop()}`);
      const param = url.searchParams.get('room');
      if (param) return param.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    }
  } catch {}
  return trimmed.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  roomId,
  connectionStatus,
  playerName,
  suitColor,
  localPos,
  remotePlayers,
  onChangePlayerName,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onPingCrew,
  onClose,
  onNotify,
}) => {
  const { isOnline } = useOnlineStatus();
  const [joinInput, setJoinInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const inviteUrl = roomId ? `${window.location.origin}${window.location.pathname}?room=${roomId}` : '';

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    sounds.playClick();
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      onNotify('INVITE LINK COPIED!', `Send the link or code ${roomId} to your friend to join!`, 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify('ROOM CODE READY', `Share code ${roomId} with your friend!`, 'normal');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractRoomCode(joinInput);
    if (!code || code.length < 3) {
      onNotify('INVALID CODE', 'Enter a valid room code or invite link (e.g. MARS42).', 'warning');
      return;
    }
    sounds.playClick();
    onJoinRoom(code);
    setJoinInput('');
  };

  const mySuit = SUIT_COLORS.find((s) => s.id === suitColor) || SUIT_COLORS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-6 select-none"
      data-interactive-ui="true"
    >
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/70 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <h2 className="font-game font-bold text-lg text-cyan-300 tracking-wide">
                CREW MULTIPLAYER LOBBY
              </h2>
              <p className="text-xs text-slate-400">
                Invite friends to explore Mars, collect crystals & drive the Rover together
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!isOnline && (
            <div className="bg-amber-950/80 border border-amber-500/70 rounded-2xl p-3.5 text-xs text-amber-100 leading-relaxed">
              <div className="font-game font-bold text-amber-300 mb-0.5">
                Offline Mode Detected
              </div>
              Co-Op Crew Rooms require an internet connection to sync with friends. All Solo modes (Mission, Exploration, Survival, Trivia), Science Lab, and Mars Rover features remain 100% playable offline!
            </div>
          )}

          {/* Astronaut Callsign */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full border border-white/60 shrink-0"
                style={{ backgroundColor: mySuit.hex }}
              />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your Astronaut Callsign
                </div>
                <div className="text-xs text-slate-300">Visible above your spacesuit to friends</div>
              </div>
            </div>
            <input
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => onChangePlayerName(e.target.value)}
              placeholder="Commander"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 outline-none text-sm font-bold text-white w-full sm:w-48"
            />
          </div>

          {/* Active Room Panel OR Create/Join Panel */}
          {roomId ? (
            <div className="bg-cyan-950/40 border-2 border-cyan-500/60 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                      ACTIVE MISSION ROOM
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        connectionStatus === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : connectionStatus === 'reconnecting'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {connectionStatus === 'connected'
                        ? 'LIVE SYNCED'
                        : connectionStatus === 'reconnecting'
                        ? 'RECONNECTING...'
                        : 'CONNECTING...'}
                    </span>
                  </div>
                  <div className="font-mono-numbers font-extrabold text-2xl text-white tracking-widest mt-0.5">
                    {roomId}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-game font-bold text-xs shadow-lg transition active:scale-95"
                  >
                    {copied ? '✅ Link Copied!' : '🔗 Copy Invite Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onPingCrew();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-game font-bold text-xs transition active:scale-95"
                  >
                    📍 Ping Location
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onLeaveRoom();
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-600/70 text-rose-200 font-bold text-xs transition active:scale-95"
                  >
                    Leave Room
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800 font-mono-numbers truncate">
                Invite URL: {inviteUrl}
              </div>

              {/* Crew Roster */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Crew on Mars ({1 + remotePlayers.length} Explorer{remotePlayers.length === 0 ? '' : 's'})
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {/* Local Player Row */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/60"
                        style={{ backgroundColor: mySuit.hex }}
                      />
                      <span className="font-bold text-white">{playerName || 'Commander'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        YOU
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono-numbers">
                      ({Math.round(localPos.x)}m, {Math.round(localPos.z)}m)
                    </span>
                  </div>

                  {/* Remote Friends */}
                  {remotePlayers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-slate-700">
                      Waiting for friends to join room <span className="text-cyan-300 font-bold">{roomId}</span>.
                      Tap <span className="text-cyan-300 font-semibold">Copy Invite Link</span> and send it to a friend!
                    </div>
                  ) : (
                    remotePlayers.map((friend) => {
                      const fSuit = SUIT_COLORS.find((s) => s.id === friend.suitColor) || SUIT_COLORS[0];
                      const dist = Math.round(
                        Math.hypot(friend.x - localPos.x, friend.z - localPos.z)
                      );
                      return (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/60"
                              style={{ backgroundColor: fSuit.hex }}
                            />
                            <span className="font-bold text-cyan-200">{friend.name}</span>
                            {friend.isDrivingRover && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                                🚗 DRIVING ROVER
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono-numbers">{dist}m away</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Host / Create Room */}
              <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-game font-bold text-sm text-amber-300 mb-1">
                    🚀 Host New Friend Room
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generate a private Mars room code and invite link so your friends can drop right into your world.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    sounds.playClick();
                    onCreateRoom();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-game font-bold text-sm shadow-lg transition active:scale-95"
                >
                  + Create Crew Room
                </button>
              </div>

              {/* Join Existing Room */}
              <form
                onSubmit={handleJoinSubmit}
                className="bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="font-game font-bold text-sm text-cyan-300 mb-1">
                    🛰️ Join a Friend's Room
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">
                    Enter your friend's Room Code (e.g. <span className="text-slate-200 font-mono">MARS42</span>) or paste an invite link.
                  </p>
                  <input
                    type="text"
                    disabled={!isOnline}
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Room code or invite link..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 disabled:opacity-50 outline-none text-xs font-bold text-white uppercase tracking-wider"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isOnline}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-game font-bold text-sm shadow-lg transition active:scale-95"
                >
                  Join Crew →
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
