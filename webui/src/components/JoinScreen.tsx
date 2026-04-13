import { useState, type FormEvent } from 'react';
import desktopIllustration from '../../images/generated-1776078614400.png';
import mobileIllustration from '../../images/generated-1776078655474.png';
import './JoinScreen.css';

interface Props {
  onJoin: (callsign: string) => Promise<void>;
}

const CALLSIGN_RE = /^[a-zA-Z0-9_]{1,20}$/;

export default function JoinScreen({ onJoin }: Props) {
  const [callsign, setCallsign] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const validate = (value: string): string => {
    if (!value.trim()) return 'Please enter a callsign.';
    if (!CALLSIGN_RE.test(value))
      return 'Callsign must be 1–20 characters: letters, numbers, or underscore.';
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate(callsign);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsConnecting(true);
    try {
      await onJoin(callsign);
    } catch {
      setError('Could not connect to chat. Please check your network and try again.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="join-screen">
      {/* ── Left / Top green panel ── */}
      <div className="join-screen__panel join-screen__panel--green">
        <div className="join-panel__text">
          <h2 className="join-panel__heading">Say hello.</h2>
          <p className="join-panel__sub">Chat freely. Stay anonymous.</p>
        </div>
        <img
          className="join-panel__illustration join-panel__illustration--desktop"
          src={desktopIllustration}
          alt=""
          aria-hidden="true"
        />
        <img
          className="join-panel__illustration join-panel__illustration--mobile"
          src={mobileIllustration}
          alt=""
          aria-hidden="true"
        />
      </div>

      {/* ── Right / Bottom form panel ── */}
      <div className="join-screen__panel join-screen__panel--form">
        <form className="join-form" onSubmit={handleSubmit} noValidate>
          <div className="join-form__header">
            <h1 className="join-form__title">AnonChat</h1>
            <p className="join-form__subtitle">
              Anonymous real-time chat.
              <br />
              No signup needed.
            </p>
          </div>

          <div className="join-form__field">
            <label htmlFor="callsign-input" className="join-form__label">
              Choose your callsign
            </label>
            <input
              id="callsign-input"
              type="text"
              className={`join-form__input${error ? ' join-form__input--error' : ''}`}
              placeholder="e.g. CoolDog_42"
              value={callsign}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={isConnecting}
              onChange={(e) => {
                setCallsign(e.target.value);
                if (error) setError('');
              }}
              aria-describedby={error ? 'callsign-error' : undefined}
            />
            {error && (
              <p id="callsign-error" className="join-form__error" role="alert">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="join-form__btn"
            disabled={isConnecting}
            aria-busy={isConnecting}
          >
            {isConnecting ? (
              <>
                <span className="join-form__btn-spinner" aria-hidden="true" />
                Connecting…
              </>
            ) : (
              'Join Chat'
            )}
          </button>

          <p className="join-form__footer">
            No accounts. No tracking. Just vibes.
          </p>
        </form>
      </div>
    </div>
  );
}
