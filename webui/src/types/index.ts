export interface ChatMessage {
  type: 'message';
  callsign: string;
  text: string;
  timestamp: string; // ISO 8601
}

export interface SystemEvent {
  type: 'system';
  event: 'user_joined' | 'user_left';
  callsign: string;
  timestamp: string; // ISO 8601
}

export type ServerMessage = ChatMessage | SystemEvent;

export interface SendMessagePayload {
  action: 'sendMessage';
  text: string;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';
