import { useState, type FormEvent, type KeyboardEvent } from 'react';
import './MessageInput.css';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_LENGTH = 1000;

// Simple send icon (Lucide "send")
function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0 && !disabled;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  // Send on Enter (but allow Shift+Enter for newlines)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend(text.trim());
        setText('');
      }
    }
  };

  return (
    <form className="msg-input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="msg-input-bar__field"
        placeholder="Type a message…"
        value={text}
        maxLength={MAX_LENGTH}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Message input"
        autoComplete="off"
      />
      <button
        type="submit"
        className="msg-input-bar__send"
        disabled={!canSend}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </form>
  );
}
