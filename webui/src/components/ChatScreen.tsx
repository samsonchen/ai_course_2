import type { ServerMessage, ConnectionStatus } from '../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatusIndicator from './StatusIndicator';
import './ChatScreen.css';

interface Props {
  callsign: string;
  messages: ServerMessage[];
  status: ConnectionStatus;
  onSend: (text: string) => void;
  onReconnect: () => void;
}

// Lucide "message-circle" icon
function MessageCircleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const isDisconnected = (s: ConnectionStatus) =>
  s === 'disconnected' || s === 'reconnecting' || s === 'failed';

export default function ChatScreen({
  callsign,
  messages,
  status,
  onSend,
  onReconnect,
}: Props) {
  return (
    <div className="chat-screen">
      {/* ── Header ── */}
      <header className="chat-header" role="banner">
        <div className="chat-header__logo">
          <MessageCircleIcon />
          <span className="chat-header__logo-text">AnonChat</span>
        </div>

        <div className="chat-header__spacer" aria-hidden="true" />

        <StatusIndicator status={status} />

        <span className="chat-header__callsign" aria-label={`Signed in as ${callsign}`}>
          {callsign}
        </span>
      </header>

      {/* ── Disconnection banner ── */}
      {status === 'failed' && (
        <div className="chat-banner chat-banner--error" role="alert">
          <span>Connection lost after multiple attempts.</span>
          <button className="chat-banner__btn" onClick={onReconnect}>
            Reconnect
          </button>
        </div>
      )}
      {status === 'reconnecting' && (
        <div className="chat-banner chat-banner--warn" role="status" aria-live="polite">
          Reconnecting to chat…
        </div>
      )}
      {status === 'disconnected' && (
        <div className="chat-banner chat-banner--warn" role="status" aria-live="polite">
          Connection lost. Retrying in a moment…
        </div>
      )}

      {/* ── Messages ── */}
      <MessageList messages={messages} ownCallsign={callsign} />

      {/* ── Input ── */}
      <MessageInput
        onSend={onSend}
        disabled={isDisconnected(status)}
      />
    </div>
  );
}
