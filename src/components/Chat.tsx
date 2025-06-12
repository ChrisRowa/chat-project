import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  username: string;
  message: string;
  time: string;
}

interface Notification {
  type: 'join' | 'leave';
  username: string;
  time: string;
}

const socket: Socket = io('http://localhost:4000', {
  transports: ['websocket'],
  reconnectionAttempts: 5,
});

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [usernameSet, setUsernameSet] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setError('');
    }
    function onDisconnect() {
      setConnected(false);
      setError('Disconnected from server. Trying to reconnect...');
    }
    function onError(err: any) {
      setError('Connection error. Please check your network.');
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, []);

  useEffect(() => {
    socket.on('chat message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('user joined', (data: { username: string; id: string; time: string }) => {
      setNotifications((prev) => [...prev, { type: 'join', username: data.username, time: data.time }]);
    });
    socket.on('user left', (data: { username: string; id: string; time: string }) => {
      setNotifications((prev) => [...prev, { type: 'leave', username: data.username, time: data.time }]);
    });
    return () => {
      socket.off('chat message');
      socket.off('user joined');
      socket.off('user left');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, notifications]);

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('set username', username.trim());
      setUsernameSet(true);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit('chat message', input);
      setInput('');
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!connected) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', color: '#fff', fontSize: 24 }}>
        {error || 'Connecting to chat server...'}
      </div>
    );
  }

  if (!usernameSet) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
        <div style={{ width: 400, padding: 32, border: '1px solid #ccc', borderRadius: 12, background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
          <h2 style={{ textAlign: 'center' }}>Enter your name to join the chat</h2>
          <form onSubmit={handleUsernameSubmit} style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              style={{ flex: 1, padding: 12, borderRadius: 6, border: '1px solid #ccc', fontSize: 18 }}
              autoFocus
            />
            <button type="submit" style={{ padding: '12px 24px', borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', fontSize: 18 }}>
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 800, height: '90vh', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '24px 32px 0 32px', borderBottom: '1px solid #eee', textAlign: 'center', fontWeight: 700, fontSize: 28, color: '#1976d2', letterSpacing: 1 }}>Chat Room</div>
        <div style={{ flex: 1, overflowY: 'auto', margin: 0, background: '#fafafa', padding: '24px 32px', borderRadius: '0 0 16px 16px', display: 'flex', flexDirection: 'column' }}>
          {notifications.map((note, idx) => (
            <div key={idx} style={{ textAlign: 'center', color: note.type === 'join' ? 'green' : 'red', fontSize: 14, margin: '6px 0' }}>
              {note.type === 'join' ? '🟢' : '🔴'} <b>{note.username}</b> {note.type === 'join' ? 'joined' : 'left'} at {formatTime(note.time)}
            </div>
          ))}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                margin: '12px 0',
                textAlign: msg.username === username ? 'right' : 'left',
                display: 'flex',
                flexDirection: msg.username === username ? 'row-reverse' : 'row',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  background: msg.username === username ? '#1976d2' : '#eee',
                  color: msg.username === username ? '#fff' : '#333',
                  borderRadius: 16,
                  padding: '10px 18px',
                  maxWidth: '60%',
                  wordBreak: 'break-word',
                  fontSize: 18,
                  boxShadow: msg.username === username ? '0 2px 8px rgba(25,118,210,0.08)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <b>{msg.username}</b> <span style={{ fontSize: 12, opacity: 0.7 }}>({formatTime(msg.time)})</span>
                <div>{msg.message}</div>
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 12, padding: '24px 32px', borderTop: '1px solid #eee', background: '#fff', borderRadius: '0 0 16px 16px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: 16, borderRadius: 8, border: '1px solid #ccc', fontSize: 18 }}
            autoFocus
          />
          <button type="submit" style={{ padding: '16px 32px', borderRadius: 8, background: '#1976d2', color: '#fff', border: 'none', fontSize: 18 }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat; 