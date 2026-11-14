import { SuitColor } from './game';

export interface RemotePlayerState {
  id: string;
  name: string;
  suitColor: SuitColor;
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

export interface SharedRoverState {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  driverId: string | null;
  driverName: string | null;
  headlightsOn: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface PingBeaconData {
  id: string;
  senderId: string;
  senderName: string;
  color: string;
  x: number;
  y: number;
  z: number;
  label: string;
  createdAt: number;
}

export interface RoomSnapshot {
  roomId: string;
  players: RemotePlayerState[];
  collectedCrystals: number[];
  activatedCheckpoints: string[];
  completedMissions: number[];
  towerActivated: boolean;
  roverState: SharedRoverState;
  chatHistory: ChatMessage[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
