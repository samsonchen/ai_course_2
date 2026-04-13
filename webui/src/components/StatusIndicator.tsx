import type { ConnectionStatus } from '../types';
import './StatusIndicator.css';

interface Props {
  status: ConnectionStatus;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle:         'Offline',
  connecting:   'Connecting…',
  connected:    'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting…',
  failed:       'Connection lost',
};

export default function StatusIndicator({ status }: Props) {
  return (
    <div
      className={`status-badge status-badge--${status}`}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${STATUS_LABELS[status]}`}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      <span className="status-badge__text">{STATUS_LABELS[status]}</span>
    </div>
  );
}
