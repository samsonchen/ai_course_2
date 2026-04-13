import type { ServerMessage } from '../types';
import './MessageItem.css';

interface Props {
  message: ServerMessage;
  isOwn: boolean;
}

// Consistent color per callsign using a simple hash
const CALLSIGN_COLORS = [
  '#72D350', // green
  '#6366F1', // indigo
  '#F59E0B', // amber
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#8B5CF6', // violet
];

function hashCallsignColor(callsign: string): string {
  let h = 0;
  for (let i = 0; i < callsign.length; i++) {
    h = callsign.charCodeAt(i) + ((h << 5) - h);
  }
  return CALLSIGN_COLORS[Math.abs(h) % CALLSIGN_COLORS.length];
}

function getInitials(callsign: string): string {
  return callsign.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function MessageItem({ message, isOwn }: Props) {
  if (message.type === 'system') {
    const text =
      message.event === 'user_joined'
        ? `${message.callsign} joined the chat`
        : `${message.callsign} left the chat`;
    return (
      <div className="msg-system">
        <span className="msg-system__text">{text}</span>
      </div>
    );
  }

  const color = hashCallsignColor(message.callsign);
  const initials = getInitials(message.callsign);
  const time = formatTime(message.timestamp);

  if (isOwn) {
    return (
      <div className="msg-row msg-row--own">
        <div className="msg-bubble msg-bubble--own">
          <p className="msg-text msg-text--own">{message.text}</p>
          <span className="msg-time msg-time--own">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-row msg-row--other">
      <div
        className="msg-avatar"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="msg-bubble msg-bubble--other">
        <span className="msg-name" style={{ color }}>
          {message.callsign}
        </span>
        <p className="msg-text">{message.text}</p>
        <span className="msg-time">{time}</span>
      </div>
    </div>
  );
}
