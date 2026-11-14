import { SuitColor } from '../types/game';
import {
  ChatMessage,
  ConnectionStatus,
  PingBeaconData,
  RemotePlayerState,
  RoomSnapshot,
  SharedRoverState,
} from '../types/multiplayer';

export interface MultiplayerClientCallbacks {
  onStatusChange?: (status: ConnectionStatus) => void;
  onRoomInit?: (snapshot: RoomSnapshot) => void;
  onPlayerJoined?: (player: RemotePlayerState) => void;
  onPlayerMoved?: (player: Partial<RemotePlayerState> & { id: string }) => void;
  onPlayerMetaUpdated?: (playerId: string, name: string, suitColor: SuitColor) => void;
  onPlayerLeft?: (playerId: string, name: string) => void;
  onRoverState?: (roverState: SharedRoverState) => void;
  onRoverBusy?: (driverName: string) => void;
  onCrystalCollected?: (crystalId: number, collectorName: string, totalCollected: number) => void;
  onCheckpointActivated?: (checkpointId: string, activatorName: string) => void;
  onMissionCompleted?: (missionId: number, completedBy: string) => void;
  onTowerActivated?: (activatedBy: string) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onPingEmoted?: (ping: PingBeaconData) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private callbacks: MultiplayerClientCallbacks;

  private playerId: string;
  private roomId: string | null = null;
  private playerName: string = 'Explorer';
  private suitColor: SuitColor = 'white';

  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect: boolean = false;
  private pendingQueue: string[] = [];

  private lastPosSentAt: number = 0;
  private lastRoverSentAt: number = 0;

  constructor(playerId: string, callbacks: MultiplayerClientCallbacks = {}) {
    this.playerId = playerId;
    this.callbacks = callbacks;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleWindowOnline);
      window.addEventListener('offline', this.handleWindowOffline);
    }
  }

  private handleWindowOnline = () => {
    if (!this.intentionalDisconnect && this.roomId) {
      this.reconnectAttempts = 0;
      this.connectSocket();
    }
  };

  private handleWindowOffline = () => {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  };

  public dispose() {
    this.leaveRoom();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleWindowOnline);
      window.removeEventListener('offline', this.handleWindowOffline);
    }
  }

  public setCallbacks(callbacks: MultiplayerClientCallbacks) {
    this.callbacks = callbacks;
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(next: ConnectionStatus) {
    if (this.status !== next) {
      this.status = next;
      this.callbacks.onStatusChange?.(next);
    }
  }

  public joinRoom(roomId: string, name: string, suitColor: SuitColor) {
    this.roomId = roomId.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    this.playerName = name.trim().slice(0, 20) || 'Explorer';
    this.suitColor = suitColor;
    this.intentionalDisconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // If socket is already open, directly send room:join
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        type: 'room:join',
        roomId: this.roomId,
        playerId: this.playerId,
        name: this.playerName,
        suitColor: this.suitColor,
      });
      return;
    }

    this.connectSocket();
  }

  private connectSocket() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('disconnected');
      return;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');

      if (this.roomId) {
        socket.send(
          JSON.stringify({
            type: 'room:join',
            roomId: this.roomId,
            playerId: this.playerId,
            name: this.playerName,
            suitColor: this.suitColor,
          })
        );
      }

      // Flush buffered events
      while (this.pendingQueue.length > 0) {
        const msg = this.pendingQueue.shift();
        if (msg && socket.readyState === WebSocket.OPEN) {
          socket.send(msg);
        }
      }
    };

    socket.onmessage = (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }

      const type = String(data.type || '');
      switch (type) {
        case 'room:init':
          this.callbacks.onRoomInit?.(data.snapshot as RoomSnapshot);
          break;
        case 'player:joined':
          this.callbacks.onPlayerJoined?.(data.player as RemotePlayerState);
          break;
        case 'player:moved':
          this.callbacks.onPlayerMoved?.(data.player as Partial<RemotePlayerState> & { id: string });
          break;
        case 'player:meta_updated':
          this.callbacks.onPlayerMetaUpdated?.(
            String(data.playerId),
            String(data.name),
            data.suitColor as SuitColor
          );
          break;
        case 'player:left':
          this.callbacks.onPlayerLeft?.(String(data.playerId), String(data.name || 'Explorer'));
          break;
        case 'rover:state':
          this.callbacks.onRoverState?.(data.roverState as SharedRoverState);
          break;
        case 'rover:busy':
          this.callbacks.onRoverBusy?.(String(data.driverName || 'Another astronaut'));
          break;
        case 'crystal:collected':
          this.callbacks.onCrystalCollected?.(
            Number(data.crystalId),
            String(data.collectorName || 'Friend'),
            Number(data.totalCollected || 0)
          );
          break;
        case 'checkpoint:activated':
          this.callbacks.onCheckpointActivated?.(
            String(data.checkpointId),
            String(data.activatorName || 'Friend')
          );
          break;
        case 'mission:completed':
          this.callbacks.onMissionCompleted?.(
            Number(data.missionId),
            String(data.completedBy || 'Friend')
          );
          break;
        case 'tower:activated':
          this.callbacks.onTowerActivated?.(String(data.activatedBy || 'Friend'));
          break;
        case 'chat:message':
          this.callbacks.onChatMessage?.(data.message as ChatMessage);
          break;
        case 'ping:emoted':
          this.callbacks.onPingEmoted?.(data.ping as PingBeaconData);
          break;
      }
    };

    socket.onclose = () => {
      if (this.intentionalDisconnect || !this.roomId) {
        this.setStatus('disconnected');
        return;
      }
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose handles reconnect scheduling
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalDisconnect || !this.roomId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('disconnected');
      return;
    }
    this.setStatus('reconnecting');
    const delayMs = Math.min(8000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalDisconnect && this.roomId) {
        this.connectSocket();
      }
    }, delayMs);
  }

  private sendRaw(payload: unknown, bufferIfDisconnected = false) {
    const serialized = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialized);
    } else if (bufferIfDisconnected && this.pendingQueue.length < 25) {
      this.pendingQueue.push(serialized);
    }
  }

  public sendPlayerUpdate(state: {
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
  }) {
    if (!this.roomId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    // Throttle high-frequency movement sync to ~18 Hz (55ms)
    if (now - this.lastPosSentAt < 55) return;
    this.lastPosSentAt = now;

    this.sendRaw({
      type: 'player:update',
      x: Number(state.x.toFixed(3)),
      y: Number(state.y.toFixed(3)),
      z: Number(state.z.toFixed(3)),
      rotationY: Number(state.rotationY.toFixed(3)),
      speed: Number(state.speed.toFixed(2)),
      isRunning: state.isRunning,
      isGrounded: state.isGrounded,
      isJumping: state.isJumping,
      isDrivingRover: state.isDrivingRover,
      isGliding: Boolean(state.isGliding),
    });
  }

  public updatePlayerMeta(name: string, suitColor: SuitColor) {
    this.playerName = name.trim().slice(0, 20) || 'Explorer';
    this.suitColor = suitColor;
    if (!this.roomId) return;
    this.sendRaw({ type: 'player:meta', name: this.playerName, suitColor: this.suitColor }, true);
  }

  public claimRover() {
    if (!this.roomId) return;
    this.sendRaw({ type: 'rover:claim' });
  }

  public releaseRover() {
    if (!this.roomId) return;
    this.sendRaw({ type: 'rover:release' });
  }

  public sendRoverUpdate(x: number, y: number, z: number, rotationY: number, headlightsOn: boolean) {
    if (!this.roomId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (now - this.lastRoverSentAt < 55) return;
    this.lastRoverSentAt = now;
    this.sendRaw({
      type: 'rover:update',
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
      rotationY: Number(rotationY.toFixed(3)),
      headlightsOn,
    });
  }

  public sendRoverHeadlights(headlightsOn: boolean) {
    if (!this.roomId) return;
    this.sendRaw({ type: 'rover:headlights', headlightsOn }, true);
  }

  public sendCrystalCollected(crystalId: number) {
    if (!this.roomId) return;
    this.sendRaw({ type: 'crystal:collect', crystalId }, true);
  }

  public sendCheckpointActivated(checkpointId: string) {
    if (!this.roomId) return;
    this.sendRaw({ type: 'checkpoint:activate', checkpointId }, true);
  }

  public sendMissionCompleted(missionId: number) {
    if (!this.roomId) return;
    this.sendRaw({ type: 'mission:complete', missionId }, true);
  }

  public sendTowerActivated() {
    if (!this.roomId) return;
    this.sendRaw({ type: 'tower:activate' }, true);
  }

  public sendChat(text: string) {
    if (!this.roomId) return;
    const clean = text.trim().slice(0, 180);
    if (!clean) return;
    this.sendRaw({ type: 'chat:send', text: clean }, true);
  }

  public sendPing(x: number, y: number, z: number, label: string = 'Over here!') {
    if (!this.roomId) return;
    this.sendRaw({ type: 'ping:send', x, y, z, label }, true);
  }

  public leaveRoom() {
    this.intentionalDisconnect = true;
    this.roomId = null;
    this.pendingQueue = [];
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendRaw({ type: 'room:leave' });
      }
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}
