import { useRef, useEffect } from 'react';
import type { ServerMessage } from '../types';
import MessageItem from './MessageItem';
import './MessageList.css';

interface Props {
  messages: ServerMessage[];
  ownCallsign: string;
}

export default function MessageList({ messages, ownCallsign }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track whether user is near the bottom before new messages arrive
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  // Auto-scroll to bottom when new messages arrive, if user was already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="message-list"
      onScroll={handleScroll}
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length === 0 && (
        <p className="message-list__empty">
          No messages yet. Say hello!
        </p>
      )}
      {messages.map((msg, i) => (
        <MessageItem
          key={i}
          message={msg}
          isOwn={msg.type === 'message' && msg.callsign === ownCallsign}
        />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
