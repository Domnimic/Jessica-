import React, { useEffect, useState } from 'react';
import { ChatMessage } from '../types/multiplayer';
import { sounds } from '../audio/SoundEffects';

interface MultiplayerFeedProps {
  roomId?: string | null;
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  onSendPing?: (label: string) => void;
}

const PEER_EVENTS = [
  { sender: 'Astro_Zoe', text: 'Gathered a Red Basin Ruby crystal! 💎', color: '#06b6d4' },
  { sender: 'Cosmo_Leo', text: 'Checked Rover Curiosity battery levels. Looking good! 🔋', color: '#8b5cf6' },
  { sender: 'MarsCadet_99', text: 'Jumping high in low gravity near Olympus crater! 🚀', color: '#10b981' },
  { sender: 'StarPilot_Nova', text: 'Refilled suit oxygen at Habitat station. 🧪', color: '#f59e0b' },
  { sender: 'Astro_Zoe', text: 'Heading to the Comm Tower to transmit telemetry! 📡', color: '#06b6d4' },
];

const QUICK_EMOTES = [
  { label: '👋 Hi!', text: 'Hey crew! 👋' },
  { label: '💎 Crystal!', text: 'Found an Energy Crystal over here! 💎' },
  { label: '📍 Follow', text: 'Follow me to this sector! 📍', ping: 'Follow me!' },
  { label: '🌪️ Shelter', text: 'Seek shelter at Base or Rover! 🌪️' },
];

export const MultiplayerFeed: React.FC<MultiplayerFeedProps> = ({
  roomId = null,
  messages: liveMessages,
  onSendMessage,
  onSendPing,
}) => {
  const [botMessages, setBotMessages] = useState<
    { id: string; sender: string; text: string; color: string }[]
  >([
    { id: '1', sender: 'System', text: '4 Cadet Bots online · Join a Friend Room in 👥 Crew!', color: '#94a3b8' },
    { id: '2', sender: 'Astro_Zoe', text: 'Welcome to Mars, Commander! Let’s explore! 👋', color: '#06b6d4' },
  ]);
  const [draft, setDraft] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Offline bot banter only when NOT in a live friend room
  useEffect(() => {
    if (roomId) return;
    let index = 0;
    const interval = setInterval(() => {
      const template = PEER_EVENTS[index % PEER_EVENTS.length];
      index++;
      setBotMessages((prev) => {
        const next = [...prev, { id: `${Date.now()}-${index}`, ...template }];
        return next.slice(-4);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [roomId]);

  const displayedMessages = roomId
    ? (liveMessages || []).slice(-4).map((m) => ({
        id: m.id,
        sender: m.senderName,
        text: m.text,
        color: m.senderColor,
      }))
    : botMessages;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !onSendMessage) return;
    sounds.playClick();
    onSendMessage(draft.trim());
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-1.5 max-w-xs sm:max-w-sm select-none" data-interactive-ui="true">
      {/* Messages Stack */}
      <div className="flex flex-col gap-1 pointer-events-none">
        {displayedMessages.map((msg) => (
          <div
            key={msg.id}
            className="bg-slate-950/75 border border-slate-800/80 px-2.5 py-1 rounded-lg text-xs leading-relaxed shadow-md backdrop-blur-none"
          >
            <span className="font-bold mr-1.5" style={{ color: msg.color }}>
              {msg.sender}:
            </span>
            <span className="text-slate-200">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Real-time Crew Chat Input & Quick Emotes when in a Friend Room */}
      {roomId && (
        <div className="pointer-events-auto flex flex-col gap-1.5">
          {!isChatOpen ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsChatOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-cyan-500/50 text-cyan-300 text-[11px] font-bold shadow-md transition"
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onSendPing?.('Over here!');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-amber-500/50 text-amber-300 text-[11px] font-bold shadow-md transition"
              >
                📍 Ping Crew
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/90 border border-cyan-500/60 rounded-xl p-2 shadow-xl space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {QUICK_EMOTES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onSendMessage?.(q.text);
                      if (q.ping) onSendPing?.(q.ping);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700"
                  >
                    {q.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="ml-auto px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={180}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Message friends..."
                  className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-400 outline-none text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
