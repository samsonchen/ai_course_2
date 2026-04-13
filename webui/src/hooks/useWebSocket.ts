import { useRef, useState, useEffect, useCallback } from 'react';
import { WS_ENDPOINT } from '../config';
import type { ServerMessage, ConnectionStatus } from '../types';

// Reconnect delay schedule (ms): 2s, 4s, 8s, 16s, 30s — then give up
const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 30000];

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [messages, setMessages] = useState<ServerMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const callsignRef = useRef('');
  const attemptsRef = useRef(0);
  const intentionalRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // openWsRef holds the latest version of the open function to avoid stale
  // closures inside event handlers and setTimeout callbacks.
  const openWsRef = useRef<(
    callsign: string,
    isInitial?: boolean,
    resolve?: () => void,
    reject?: (e: Error) => void,
  ) => void>(null!);

  openWsRef.current = (callsign, isInitial = false, resolve, reject) => {
    const ws = new WebSocket(
      `${WS_ENDPOINT}?callsign=${encodeURIComponent(callsign)}`,
    );
    wsRef.current = ws;
    setStatus('connecting');

    // For the initial connection we wait for open/error before settling.
    let settled = !isInitial;

    ws.onopen = () => {
      attemptsRef.current = 0;
      setStatus('connected');
      if (!settled) {
        settled = true;
        resolve?.();
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as ServerMessage;
        setMessages((prev) => [...prev, data]);
      } catch {
        // silently ignore unparseable frames
      }
    };

    ws.onerror = () => {
      if (!settled) {
        settled = true;
        reject?.(new Error('WebSocket connection error'));
      }
    };

    ws.onclose = () => {
      if (!settled) {
        // Initial connection failed before opening
        settled = true;
        reject?.(new Error('WebSocket closed before connecting'));
        return;
      }

      if (intentionalRef.current) return;

      // Schedule reconnect
      const attempt = attemptsRef.current;
      if (attempt >= RECONNECT_DELAYS.length) {
        setStatus('failed');
        return;
      }
      attemptsRef.current = attempt + 1;
      setStatus(attempt === 0 ? 'disconnected' : 'reconnecting');
      timerRef.current = setTimeout(() => {
        if (!intentionalRef.current) {
          openWsRef.current(callsignRef.current);
        }
      }, RECONNECT_DELAYS[attempt]);
    };
  };

  /** Initiate a fresh connection. Returns a Promise that resolves when the
   *  WebSocket opens or rejects on initial failure. */
  const connect = useCallback((callsign: string): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    intentionalRef.current = false;
    attemptsRef.current = 0;
    callsignRef.current = callsign;

    // Close any existing socket without triggering our reconnect logic
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    return new Promise<void>((resolve, reject) => {
      openWsRef.current(callsign, true, resolve, reject);
    });
  }, []);

  /** Manually reconnect after a 'failed' status. */
  const reconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    intentionalRef.current = false;
    attemptsRef.current = 0;
    openWsRef.current(callsignRef.current);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'sendMessage', text }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return { status, messages, connect, reconnect, sendMessage };
}
