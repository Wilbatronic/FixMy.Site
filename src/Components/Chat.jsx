import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import authService from '../services/auth';

const user = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
})();
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
  auth: {
    token: user?.token || undefined,
  },
});

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      socket.emit('join', { userId: user.id });
    }

    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off('message');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input) {
      socket.emit('sendMessage', input, () => setInput(''));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat with us</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="messages-container" style={{ height: '300px', overflowY: 'auto' }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <strong>{msg.user}: </strong>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit">Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}
