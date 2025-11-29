export enum MessageType {
  TEXT = 'TEXT',
  VIDEO = 'VIDEO',
  SYSTEM = 'SYSTEM',
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: number; // Timestamp for heartbeat detection
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  content: string;
  type: MessageType;
  timestamp: number;
  videoUrl?: string; // For parsed video frames
  isAi?: boolean; // To distinguish AI bot messages
}

export interface ServerConfig {
  id: string;
  name: string;
  address: string;
}

export interface ChatRoomState {
  users: User[];
  messages: Message[];
  currentUser: User | null;
}