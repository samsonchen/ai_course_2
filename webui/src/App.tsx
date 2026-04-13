import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';

export default function App() {
  const [screen, setScreen] = useState<'join' | 'chat'>('join');
  const [callsign, setCallsign] = useState('');

  const { status, messages, connect, reconnect, sendMessage } = useWebSocket();

  const handleJoin = async (cs: string): Promise<void> => {
    await connect(cs); // throws on failure — JoinScreen catches it
    setCallsign(cs);
    setScreen('chat');
  };

  return screen === 'join' ? (
    <JoinScreen onJoin={handleJoin} />
  ) : (
    <ChatScreen
      callsign={callsign}
      messages={messages}
      status={status}
      onSend={sendMessage}
      onReconnect={reconnect}
    />
  );
}
