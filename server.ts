import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard-store.json');

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const cliPort = Number(process.argv[portArgIndex + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) return cliPort;
  }
  if (process.env.NODE_ENV !== 'production') {
    const envPort = Number(process.env.PORT);
    // Avoid colliding with container reverse-proxy PORT (8080) when running `npm run dev` directly
    if (Number.isFinite(envPort) && envPort > 0 && String(envPort) !== process.env.NGINX_PORT) {
      return envPort;
    }
    return Number(process.env.DEFAULT_APP_PORT) || 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();
const IS_PROD = process.env.NODE_ENV === 'production';

type SuitColorId =
  | 'white'
  | 'silver'
  | 'black'
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'gold'
  | 'orange'
  | 'red'
  | 'pink'
  | 'purple';

interface PlayerRecord {
  id: string;
  name: string;
  suitColor: SuitColorId;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  isRunning: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  isDrivingRover: boolean;
  isGliding?: boolean;
  joinedAt: number;
}

interface RoverRecord {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  driverId: string | null;
  driverName: string | null;
  headlightsOn: boolean;
}

interface ChatRecord {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface RoomRecord {
  roomId: string;
  players: Map<string, PlayerRecord>;
  sockets: Map<string, WebSocket>;
  collectedCrystals: Set<number>;
  activatedCheckpoints: Set<string>;
  completedMissions: Set<number>;
  towerActivated: boolean;
  roverState: RoverRecord;
  chatHistory: ChatRecord[];
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

interface ClientSocketMeta {
  playerId: string | null;
  roomId: string | null;
  isAlive: boolean;
}

const SUIT_HEX: Record<SuitColorId, string> = {
  white: '#38bdf8',
  silver: '#818cf8',
  black: '#38bdf8',
  blue: '#60a5fa',
  cyan: '#67e8f9',
  teal: '#5eead4',
  green: '#34d399',
  gold: '#fde047',
  orange: '#fdba74',
  red: '#f87171',
  pink: '#f472b6',
  purple: '#c084fc',
};

const rooms = new Map<string, RoomRecord>();
const socketMeta = new WeakMap<WebSocket, ClientSocketMeta>();

interface LeaderboardRecord {
  playerId: string;
  name: string;
  suitColor: SuitColorId;
  correctCount: number;
  answeredCount: number;
  bestStreak: number;
  triviaCorrect: number;
  triviaAnswered: number;
  quizCorrect: number;
  quizAnswered: number;
  bestQuizScore: number;
  xpEarned: number;
  updatedAt: number;
}

const leaderboardStore = new Map<string, LeaderboardRecord>();

function toNonNegInt(val: unknown, max = 1_000_000): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.floor(n));
}

function loadLeaderboardFromDisk() {
  try {
    if (!fs.existsSync(LEADERBOARD_FILE)) return;
    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (!item || typeof item.playerId !== 'string') continue;
      const pid = item.playerId.trim().slice(0, 64);
      if (!pid) continue;
      const triviaCorrect = toNonNegInt(item.triviaCorrect);
      const triviaAnswered = Math.max(triviaCorrect, toNonNegInt(item.triviaAnswered));
      const quizCorrect = toNonNegInt(item.quizCorrect);
      const quizAnswered = Math.max(quizCorrect, toNonNegInt(item.quizAnswered));
      const correctCount = Math.max(triviaCorrect + quizCorrect, toNonNegInt(item.correctCount));
      const answeredCount = Math.max(correctCount, triviaAnswered + quizAnswered, toNonNegInt(item.answeredCount));
      leaderboardStore.set(pid, {
        playerId: pid,
        name: sanitizeName(item.name),
        suitColor: sanitizeSuit(item.suitColor),
        correctCount,
        answeredCount,
        bestStreak: toNonNegInt(item.bestStreak),
        triviaCorrect,
        triviaAnswered,
        quizCorrect,
        quizAnswered,
        bestQuizScore: Math.min(100, toNonNegInt(item.bestQuizScore, 100)),
        xpEarned: toNonNegInt(item.xpEarned, 10_000_000),
        updatedAt: Number.isFinite(Number(item.updatedAt)) ? Number(item.updatedAt) : Date.now(),
      });
    }
  } catch (err) {
    console.warn('Could not read leaderboard store:', err);
  }
}

let leaderboardSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveLeaderboard() {
  if (leaderboardSaveTimer) clearTimeout(leaderboardSaveTimer);
  leaderboardSaveTimer = setTimeout(() => {
    leaderboardSaveTimer = null;
    try {
      const entries = Array.from(leaderboardStore.values());
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist leaderboard store:', err);
    }
  }, 120);
}

function getSortedLeaderboard(): LeaderboardRecord[] {
  return Array.from(leaderboardStore.values())
    .filter((entry) => entry.correctCount > 0 || entry.answeredCount > 0)
    .sort((a, b) => {
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      const accA = a.answeredCount > 0 ? a.correctCount / a.answeredCount : 0;
      const accB = b.answeredCount > 0 ? b.correctCount / b.answeredCount : 0;
      if (Math.abs(accB - accA) > 0.0001) return accB - accA;
      if (b.xpEarned !== a.xpEarned) return b.xpEarned - a.xpEarned;
      return a.updatedAt - b.updatedAt;
    })
    .slice(0, 100);
}

loadLeaderboardFromDisk();

function sanitizeRoomCode(raw: unknown): string {
  const cleaned = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 12);
  return cleaned || generateRoomCode();
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MARS';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function sanitizeName(raw: unknown): string {
  const s = String(raw || 'Explorer').trim().slice(0, 20);
  return s || 'Explorer';
}

function sanitizeSuit(raw: unknown): SuitColorId {
  const valid: SuitColorId[] = [
    'white',
    'silver',
    'black',
    'blue',
    'cyan',
    'teal',
    'green',
    'gold',
    'orange',
    'red',
    'pink',
    'purple',
  ];
  return valid.includes(raw as SuitColorId) ? (raw as SuitColorId) : 'white';
}

function getOrCreateRoom(roomId: string): RoomRecord {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      players: new Map(),
      sockets: new Map(),
      collectedCrystals: new Set(),
      activatedCheckpoints: new Set(['landing']),
      completedMissions: new Set(),
      towerActivated: false,
      roverState: {
        x: 28,
        y: 0,
        z: -24,
        rotationY: -Math.PI * 0.4,
        driverId: null,
        driverName: null,
        headlightsOn: true,
      },
      chatHistory: [
        {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'ARES LINK',
          senderColor: '#f59e0b',
          text: `Room ${roomId} online. Share the invite link so friends can join your Mars expedition!`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      cleanupTimer: null,
    };
    rooms.set(roomId, room);
  } else if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
  return room;
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: RoomRecord, payload: unknown, excludePlayerId?: string) {
  const serialized = JSON.stringify(payload);
  room.sockets.forEach((clientWs, pid) => {
    if (excludePlayerId && pid === excludePlayerId) return;
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(serialized);
    }
  });
}

function appendChat(room: RoomRecord, msg: ChatRecord) {
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 30) {
    room.chatHistory.shift();
  }
}

function removePlayerFromRoom(ws: WebSocket) {
  const meta = socketMeta.get(ws);
  if (!meta || !meta.roomId || !meta.playerId) return;

  const room = rooms.get(meta.roomId);
  const playerId = meta.playerId;
  meta.roomId = null;
  meta.playerId = null;

  if (!room) return;

  // Only remove if this socket is still the active socket for playerId
  const currentWs = room.sockets.get(playerId);
  if (currentWs && currentWs !== ws) return;

  const leavingPlayer = room.players.get(playerId);
  room.players.delete(playerId);
  room.sockets.delete(playerId);

  // Release rover if leaving player was driving
  if (room.roverState.driverId === playerId) {
    room.roverState.driverId = null;
    room.roverState.driverName = null;
    broadcastRoom(room, { type: 'rover:state', roverState: room.roverState });
  }

  if (leavingPlayer) {
    const leaveMsg: ChatRecord = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: 'system',
      senderName: 'ARES LINK',
      senderColor: '#94a3b8',
      text: `${leavingPlayer.name} disconnected from the expedition.`,
      timestamp: Date.now(),
      isSystem: true,
    };
    appendChat(room, leaveMsg);
    broadcastRoom(room, { type: 'player:left', playerId, name: leavingPlayer.name });
    broadcastRoom(room, { type: 'chat:message', message: leaveMsg });
  }

  if (room.players.size === 0) {
    room.cleanupTimer = setTimeout(() => {
      const check = rooms.get(room.roomId);
      if (check && check.players.size === 0) {
        rooms.delete(room.roomId);
      }
    }, 120_000);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // REST Endpoints for Room Discovery & Invite Creation
  app.post('/api/rooms', (_req, res) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }
    getOrCreateRoom(code);
    res.json({ roomId: code });
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    const code = sanitizeRoomCode(req.params.roomId);
    const room = rooms.get(code);
    if (!room) {
      res.json({ roomId: code, exists: false, playerCount: 0, players: [] });
      return;
    }
    res.json({
      roomId: room.roomId,
      exists: true,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        suitColor: p.suitColor,
      })),
    });
  });

  // Global Explorer Quiz & Trivia Correct-Answers Leaderboard
  app.get('/api/leaderboard', (_req, res) => {
    res.json({
      entries: getSortedLeaderboard(),
      totalPlayers: leaderboardStore.size,
      serverTime: Date.now(),
    });
  });

  app.post('/api/leaderboard/submit', (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body.playerId !== 'string') {
      res.status(400).json({ error: 'playerId is required' });
      return;
    }

    const playerId = body.playerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!playerId) {
      res.status(400).json({ error: 'Invalid playerId' });
      return;
    }

    const prev = leaderboardStore.get(playerId);
    const inTriviaCorrect = toNonNegInt(body.triviaCorrect);
    const inTriviaAnswered = Math.max(inTriviaCorrect, toNonNegInt(body.triviaAnswered));
    const inQuizCorrect = toNonNegInt(body.quizCorrect);
    const inQuizAnswered = Math.max(inQuizCorrect, toNonNegInt(body.quizAnswered));
    const inCorrect = Math.max(inTriviaCorrect + inQuizCorrect, toNonNegInt(body.correctCount));
    const inAnswered = Math.max(inCorrect, inTriviaAnswered + inQuizAnswered, toNonNegInt(body.answeredCount));

    const triviaCorrect = Math.max(prev?.triviaCorrect ?? 0, inTriviaCorrect);
    const triviaAnswered = Math.max(prev?.triviaAnswered ?? 0, inTriviaAnswered, triviaCorrect);
    const quizCorrect = Math.max(prev?.quizCorrect ?? 0, inQuizCorrect);
    const quizAnswered = Math.max(prev?.quizAnswered ?? 0, inQuizAnswered, quizCorrect);
    const correctCount = Math.max(prev?.correctCount ?? 0, inCorrect, triviaCorrect + quizCorrect);
    const answeredCount = Math.max(
      prev?.answeredCount ?? 0,
      inAnswered,
      correctCount,
      triviaAnswered + quizAnswered
    );

    const record: LeaderboardRecord = {
      playerId,
      name: sanitizeName(body.name ?? prev?.name),
      suitColor: sanitizeSuit(body.suitColor ?? prev?.suitColor),
      correctCount,
      answeredCount,
      bestStreak: Math.max(prev?.bestStreak ?? 0, toNonNegInt(body.bestStreak)),
      triviaCorrect,
      triviaAnswered,
      quizCorrect,
      quizAnswered,
      bestQuizScore: Math.max(prev?.bestQuizScore ?? 0, Math.min(100, toNonNegInt(body.bestQuizScore, 100))),
      xpEarned: Math.max(prev?.xpEarned ?? 0, toNonNegInt(body.xpEarned, 10_000_000)),
      updatedAt: Date.now(),
    };

    leaderboardStore.set(playerId, record);
    scheduleSaveLeaderboard();

    res.json({
      entry: record,
      entries: getSortedLeaderboard(),
      totalPlayers: leaderboardStore.size,
    });
  });

  const httpServer = http.createServer(app);

  // WebSocket Server on /ws (non-colliding with Vite HMR)
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const urlPath = (request.url || '').split('?')[0];
    if (urlPath === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (urlPath !== '/vite-hmr') {
      socket.destroy();
    }
  });

  // Periodic heartbeat to purge stale sockets
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const meta = socketMeta.get(ws);
      if (!meta) return;
      if (!meta.isAlive) {
        removePlayerFromRoom(ws);
        ws.terminate();
        return;
      }
      meta.isAlive = false;
      ws.ping();
    });
  }, 20_000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws) => {
    socketMeta.set(ws, { playerId: null, roomId: null, isAlive: true });

    ws.on('pong', () => {
      const meta = socketMeta.get(ws);
      if (meta) meta.isAlive = true;
    });

    ws.on('message', (raw) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(raw));
      } catch {
        return;
      }

      const type = String(data.type || '');
      const meta = socketMeta.get(ws);
      if (!meta) return;

      if (type === 'room:join') {
        // Leave any previous room first
        if (meta.roomId) {
          removePlayerFromRoom(ws);
        }

        const roomId = sanitizeRoomCode(data.roomId);
        const playerId = String(data.playerId || `p-${Math.random().toString(36).slice(2, 10)}`).slice(0, 36);
        const name = sanitizeName(data.name);
        const suitColor = sanitizeSuit(data.suitColor);

        const room = getOrCreateRoom(roomId);

        // Close stale socket if reconnecting with same playerId
        const existingSocket = room.sockets.get(playerId);
        if (existingSocket && existingSocket !== ws) {
          try {
            existingSocket.close(4000, 'Reconnected from another tab');
          } catch {}
        }

        const existingPlayer = room.players.get(playerId);
        const playerRecord: PlayerRecord = {
          id: playerId,
          name,
          suitColor,
          x: typeof data.x === 'number' ? data.x : existingPlayer?.x ?? 0,
          y: typeof data.y === 'number' ? data.y : existingPlayer?.y ?? 0,
          z: typeof data.z === 'number' ? data.z : existingPlayer?.z ?? 0,
          rotationY: typeof data.rotationY === 'number' ? data.rotationY : existingPlayer?.rotationY ?? 0,
          speed: 0,
          isRunning: false,
          isGrounded: true,
          isJumping: false,
          isDrivingRover: existingPlayer?.isDrivingRover ?? false,
          joinedAt: existingPlayer?.joinedAt ?? Date.now(),
        };

        room.players.set(playerId, playerRecord);
        room.sockets.set(playerId, ws);
        meta.playerId = playerId;
        meta.roomId = roomId;

        // Send authoritative full room snapshot to joining client
        sendJson(ws, {
          type: 'room:init',
          snapshot: {
            roomId: room.roomId,
            players: Array.from(room.players.values()),
            collectedCrystals: Array.from(room.collectedCrystals),
            activatedCheckpoints: Array.from(room.activatedCheckpoints),
            completedMissions: Array.from(room.completedMissions),
            towerActivated: room.towerActivated,
            roverState: room.roverState,
            chatHistory: room.chatHistory,
          },
        });

        // Broadcast arrival to peers
        broadcastRoom(room, { type: 'player:joined', player: playerRecord }, playerId);

        if (!existingPlayer) {
          const joinMsg: ChatRecord = {
            id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'ARES LINK',
            senderColor: '#34d399',
            text: `${name} landed on Mars and joined Crew ${roomId}! 🚀`,
            timestamp: Date.now(),
            isSystem: true,
          };
          appendChat(room, joinMsg);
          broadcastRoom(room, { type: 'chat:message', message: joinMsg });
        }
        return;
      }

      if (!meta.roomId || !meta.playerId) return;
      const room = rooms.get(meta.roomId);
      if (!room) return;
      const player = room.players.get(meta.playerId);
      if (!player) return;

      if (type === 'player:update') {
        if (typeof data.x === 'number') player.x = data.x;
        if (typeof data.y === 'number') player.y = data.y;
        if (typeof data.z === 'number') player.z = data.z;
        if (typeof data.rotationY === 'number') player.rotationY = data.rotationY;
        if (typeof data.speed === 'number') player.speed = data.speed;
        if (typeof data.isRunning === 'boolean') player.isRunning = data.isRunning;
        if (typeof data.isGrounded === 'boolean') player.isGrounded = data.isGrounded;
        if (typeof data.isJumping === 'boolean') player.isJumping = data.isJumping;
        if (typeof data.isDrivingRover === 'boolean') player.isDrivingRover = data.isDrivingRover;
        if (typeof data.isGliding === 'boolean') player.isGliding = data.isGliding;

        broadcastRoom(
          room,
          {
            type: 'player:moved',
            player: {
              id: player.id,
              x: player.x,
              y: player.y,
              z: player.z,
              rotationY: player.rotationY,
              speed: player.speed,
              isRunning: player.isRunning,
              isGrounded: player.isGrounded,
              isJumping: player.isJumping,
              isDrivingRover: player.isDrivingRover,
              isGliding: Boolean(player.isGliding),
            },
          },
          player.id
        );
        return;
      }

      if (type === 'player:meta') {
        if (data.name !== undefined) player.name = sanitizeName(data.name);
        if (data.suitColor !== undefined) player.suitColor = sanitizeSuit(data.suitColor);
        broadcastRoom(room, {
          type: 'player:meta_updated',
          playerId: player.id,
          name: player.name,
          suitColor: player.suitColor,
        });
        return;
      }

      if (type === 'rover:claim') {
        if (!room.roverState.driverId || room.roverState.driverId === player.id) {
          room.roverState.driverId = player.id;
          room.roverState.driverName = player.name;
          player.isDrivingRover = true;
          broadcastRoom(room, { type: 'rover:state', roverState: room.roverState });
        } else {
          sendJson(ws, {
            type: 'rover:busy',
            driverName: room.roverState.driverName || 'Another astronaut',
          });
        }
        return;
      }

      if (type === 'rover:release') {
        if (room.roverState.driverId === player.id) {
          room.roverState.driverId = null;
          room.roverState.driverName = null;
          player.isDrivingRover = false;
          broadcastRoom(room, { type: 'rover:state', roverState: room.roverState });
        }
        return;
      }

      if (type === 'rover:update') {
        if (room.roverState.driverId === player.id || room.roverState.driverId === null) {
          if (typeof data.x === 'number') room.roverState.x = data.x;
          if (typeof data.y === 'number') room.roverState.y = data.y;
          if (typeof data.z === 'number') room.roverState.z = data.z;
          if (typeof data.rotationY === 'number') room.roverState.rotationY = data.rotationY;
          if (typeof data.headlightsOn === 'boolean') room.roverState.headlightsOn = data.headlightsOn;
          broadcastRoom(room, { type: 'rover:state', roverState: room.roverState }, player.id);
        }
        return;
      }

      if (type === 'rover:headlights') {
        if (typeof data.headlightsOn === 'boolean') {
          room.roverState.headlightsOn = data.headlightsOn;
          broadcastRoom(room, { type: 'rover:state', roverState: room.roverState }, player.id);
        }
        return;
      }

      if (type === 'crystal:collect') {
        const crystalId = Number(data.crystalId);
        if (!Number.isInteger(crystalId) || crystalId < 1 || crystalId > 10) return;
        // Idempotent guard
        if (room.collectedCrystals.has(crystalId)) return;
        room.collectedCrystals.add(crystalId);

        broadcastRoom(room, {
          type: 'crystal:collected',
          crystalId,
          collectorId: player.id,
          collectorName: player.name,
          totalCollected: room.collectedCrystals.size,
        });

        const msg: ChatRecord = {
          id: `cry-${Date.now()}-${crystalId}`,
          senderId: 'system',
          senderName: 'CO-OP DISCOVERY',
          senderColor: '#e879f9',
          text: `${player.name} collected Energy Crystal #${crystalId} (${room.collectedCrystals.size}/10)! 💎`,
          timestamp: Date.now(),
          isSystem: true,
        };
        appendChat(room, msg);
        broadcastRoom(room, { type: 'chat:message', message: msg });
        return;
      }

      if (type === 'checkpoint:activate') {
        const checkpointId = String(data.checkpointId || '').slice(0, 32);
        if (!checkpointId || room.activatedCheckpoints.has(checkpointId)) return;
        room.activatedCheckpoints.add(checkpointId);
        broadcastRoom(room, {
          type: 'checkpoint:activated',
          checkpointId,
          activatorName: player.name,
        });
        return;
      }

      if (type === 'mission:complete') {
        const missionId = Number(data.missionId);
        if (!Number.isInteger(missionId) || missionId < 1 || missionId > 10) return;
        if (room.completedMissions.has(missionId)) return;
        room.completedMissions.add(missionId);
        broadcastRoom(room, {
          type: 'mission:completed',
          missionId,
          completedBy: player.name,
        });
        return;
      }

      if (type === 'tower:activate') {
        if (room.towerActivated) return;
        room.towerActivated = true;
        broadcastRoom(room, {
          type: 'tower:activated',
          activatedBy: player.name,
        });
        const msg: ChatRecord = {
          id: `twr-${Date.now()}`,
          senderId: 'system',
          senderName: 'EARTH UPLINK',
          senderColor: '#22c55e',
          text: `${player.name} activated the Deep Space Comm Tower! Earth uplink online! 📡`,
          timestamp: Date.now(),
          isSystem: true,
        };
        appendChat(room, msg);
        broadcastRoom(room, { type: 'chat:message', message: msg });
        return;
      }

      if (type === 'chat:send') {
        const text = String(data.text || '').trim().slice(0, 180);
        if (!text) return;
        const chatMsg: ChatRecord = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: player.id,
          senderName: player.name,
          senderColor: SUIT_HEX[player.suitColor] || '#38bdf8',
          text,
          timestamp: Date.now(),
        };
        appendChat(room, chatMsg);
        broadcastRoom(room, { type: 'chat:message', message: chatMsg });
        return;
      }

      if (type === 'ping:send') {
        const ping = {
          id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: player.id,
          senderName: player.name,
          color: SUIT_HEX[player.suitColor] || '#38bdf8',
          x: typeof data.x === 'number' ? data.x : player.x,
          y: typeof data.y === 'number' ? data.y : player.y,
          z: typeof data.z === 'number' ? data.z : player.z,
          label: String(data.label || 'Follow me!').slice(0, 32),
          createdAt: Date.now(),
        };
        broadcastRoom(room, { type: 'ping:emoted', ping });
        return;
      }

      if (type === 'room:leave') {
        removePlayerFromRoom(ws);
      }
    });

    ws.on('close', () => {
      removePlayerFromRoom(ws);
    });

    ws.on('error', () => {
      removePlayerFromRoom(ws);
    });
  });

  if (!IS_PROD) {
    if (!process.env.DISABLE_HMR) {
      process.env.DISABLE_HMR = 'true';
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer, path: '/vite-hmr' },
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Mars Survival server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
