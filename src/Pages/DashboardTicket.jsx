import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { Input } from '../Components/ui/input';
import { Button } from '../Components/ui/button';
import { Send, Paperclip, Upload, AlertCircle, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';
import authService from '../services/auth';
import { apiJson } from '@/utils/api';

export default function DashboardTicket() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        setLoading(true);
        const { ok, data } = await apiJson(`tickets/${ticketId}`);
        if (!ok) throw new Error(data?.error || 'Failed to fetch ticket data');
        setTicket(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching ticket data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTicketData();
  }, [ticketId]);

  useEffect(() => {
    if (!ticket) return; // Don't connect until ticket data is loaded

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', { path: '/socket.io', auth: { token: authService.getCurrentUser()?.token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('join_ticket', ticketId);
      newSocket.emit('request_history', ticketId, (history) => {
        if (Array.isArray(history)) {
          setMessages(history);
        } else {
          console.error('Error fetching history:', history);
          setError('Could not load chat history.');
        }
      });
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(`Chat connection failed: ${err.message}. Please refresh the page.`);
      newSocket.disconnect();
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('new_message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    newSocket.on('status_update', ({ status }) => {
      setTicket(prevTicket => ({ ...prevTicket, status }));
      setError(null); // Clear connection errors if we get a status update
    });

    newSocket.on('ticket_deleted', () => {
      setError('This ticket has been deleted. Redirecting to dashboard...');
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard/requests';
      }, 2000);
    });

    newSocket.on('error', ({ message }) => {
      setError(message);
    });

    return () => newSocket.disconnect();
  }, [ticket, ticketId]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    try {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } catch (e) {
      // Fallback for browsers without scrollTo options
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('ticket_message', { ticketId, message: newMessage });
      setNewMessage('');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3001') + `/api/tickets/${ticketId}/upload`, {
        method: 'POST',
        headers: { ...authService.getAuthHeader() },
        body: formData,
      });
      if (!response.ok) throw new Error('File upload failed');
    } catch (err) {
      console.error("File upload error:", err);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone and will remove the ticket from both the website and Discord.')) {
      return;
    }

    try {
      setLoading(true);
      const { ok } = await apiJson(`tickets/${ticketId}`, { method: 'DELETE' });
      if (!ok) throw new Error('Failed to delete ticket');
      
      // Wait for the socket event to confirm deletion before redirecting
      setError('Ticket deleted successfully. Redirecting...');
      
      // Set a fallback timeout in case the socket event doesn't fire
      setTimeout(() => {
        if (document.location.pathname.includes(`/dashboard/ticket/${ticketId}`)) {
          window.location.href = '/dashboard/requests';
        }
      }, 3000);
      
      // The socket event handler will handle the redirect
      // This ensures the frontend is properly updated before redirecting
    } catch (err) {
      console.error("Delete ticket error:", err);
      setError('Failed to delete ticket. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading ticket...</div>;
  }

  if (error && !ticket) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center gap-4">
        <AlertCircle className="w-12 h-12" />
        <h2 className="text-xl font-semibold">Could not load ticket</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!ticket) {
    // Should not happen if loading/error states are correct, but as a fallback
    return <div className="p-8 text-center">Ticket data could not be loaded.</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Ticket #{ticket.id}: {ticket.service_type || 'N/A'}</CardTitle>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                ticket.status === 'open' ? 'bg-green-100 text-green-800' : 
                ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {ticket.status}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteTicket}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Urgency: {ticket.urgency_level || 'Not specified'} | Opened on {new Date(ticket.created_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col h-[60vh]">
          {error && (
            <div className="text-red-500 text-center mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <div ref={messagesContainerRef} className="flex-grow overflow-y-auto border rounded-lg p-4 bg-gray-50 mb-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.author_name.startsWith('User #') ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-lg ${msg.author_name.startsWith('User #') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  <p className="font-bold text-sm">{msg.author_name}</p>
                  <p>{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500 -mt-2 mb-1">This is your ticket chat. Type a message below to talk to our team.</div>
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={ticket.status === 'closed' ? 'This ticket is closed. No new messages can be sent.' : 'Type your message...'}
              className="flex-grow"
              disabled={!!error || ticket.status === 'closed'}
            />
            <Button type="button" variant="outline" onClick={handleFileSelect} disabled={uploading || !!error || ticket.status === 'closed'}>
              {uploading ? <Upload className="w-4 h-4 animate-pulse" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <Button type="submit" disabled={!newMessage.trim() || !!error || ticket.status === 'closed'}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
