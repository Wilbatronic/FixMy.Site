import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/Components/ui/dialog';
import { Calendar, Clock, MapPin, User, AlertCircle, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { apiJson } from '@/utils/api';

function AdminCalendar() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    client_email: '',
    client_name: '',
    reminder_type: 'code_audit',
    due_date: '',
    due_time: '09:00',
    priority: 'medium',
    status: 'pending'
  });
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const reminderTypes = [
    { value: 'code_audit', label: 'Code Audit', icon: '🔍' },
    { value: 'security_review', label: 'Security Review', icon: '🔒' },
    { value: 'performance_check', label: 'Performance Check', icon: '⚡' },
    { value: 'backup_verification', label: 'Backup Verification', icon: '💾' },
    { value: 'ssl_renewal', label: 'SSL Certificate Renewal', icon: '🔐' },
    { value: 'domain_renewal', label: 'Domain Renewal', icon: '🌐' },
    { value: 'maintenance', label: 'Regular Maintenance', icon: '🔧' },
    { value: 'follow_up', label: 'Client Follow-up', icon: '📞' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-500' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      const { ok, data } = await apiJson('/api/admin/reminders');
      if (ok) {
        setReminders(data || []);
      } else {
        setError('Failed to fetch reminders');
      }
    } catch (err) {
      setError('Failed to fetch reminders');
      console.error('Error fetching reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    try {
      setLoading(true);
      const { ok, data } = await apiJson('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify(newReminder),
      });
      
      if (ok) {
        setReminders([...reminders, data]);
        setNewReminder({
          title: '',
          description: '',
          client_email: '',
          client_name: '',
          reminder_type: 'code_audit',
          due_date: '',
          due_time: '09:00',
          priority: 'medium',
          status: 'pending'
        });
        setShowCreateDialog(false);
        alert('Reminder created successfully!');
      } else {
        setError('Failed to create reminder');
      }
    } catch (err) {
      setError('Failed to create reminder');
      console.error('Error creating reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setLoading(true);
      const { ok } = await apiJson(`/api/admin/reminders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      if (ok) {
        setReminders(reminders.map(r => r.id === id ? { ...r, status } : r));
        alert('Reminder status updated!');
      } else {
        setError('Failed to update reminder');
      }
    } catch (err) {
      setError('Failed to update reminder');
      console.error('Error updating reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      setLoading(true);
      const { ok } = await apiJson(`/api/admin/reminders/${id}`, {
        method: 'DELETE',
      });
      
      if (ok) {
        setReminders(reminders.filter(r => r.id !== id));
        alert('Reminder deleted successfully!');
      } else {
        setError('Failed to delete reminder');
      }
    } catch (err) {
      setError('Failed to delete reminder');
      console.error('Error deleting reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  const createGoogleCalendarEvent = (reminder) => {
    const event = {
      summary: reminder.title,
      description: `${reminder.description}\n\nClient: ${reminder.client_name} (${reminder.client_email})\nType: ${reminderTypes.find(t => t.value === reminder.reminder_type)?.label}`,
      start: {
        dateTime: `${reminder.due_date}T${reminder.due_time}:00`,
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: `${reminder.due_date}T${reminder.due_time}:00`,
        timeZone: 'Europe/London',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.summary)}&details=${encodeURIComponent(event.description)}&dates=${encodeURIComponent(event.start.dateTime.replace(/[-:]/g, '').replace('T', 'T').replace('Z', 'Z'))}/${encodeURIComponent(event.end.dateTime.replace(/[-:]/g, '').replace('T', 'T').replace('Z', 'Z'))}&sf=true&output=xml`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    // Overdue items first
    if (isOverdue(a.due_date) && !isOverdue(b.due_date)) return -1;
    if (!isOverdue(a.due_date) && isOverdue(b.due_date)) return 1;
    
    // Then by due date
    return new Date(a.due_date) - new Date(b.due_date);
  });

  if (loading && reminders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading reminders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders & Calendar</h1>
          <p className="text-gray-600">Manage client reminders and schedule tasks</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <CalendarIcon className="w-4 h-4 mr-2" />
          Create Reminder
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{reminders.filter(r => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{reminders.filter(r => isOverdue(r.due_date) && r.status !== 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{reminders.filter(r => r.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{reminders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders List */}
      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
          <CardDescription>Manage your client reminders and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No reminders found.</p>
              <p className="text-sm">Create your first reminder to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedReminders.map(reminder => (
                <div 
                  key={reminder.id} 
                  className={`p-4 border rounded-lg ${
                    isOverdue(reminder.due_date) && reminder.status !== 'completed' 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {reminderTypes.find(t => t.value === reminder.reminder_type)?.icon}
                      </span>
                      <div>
                        <h3 className="font-semibold text-lg">{reminder.title}</h3>
                        <p className="text-sm text-gray-600">
                          {reminder.client_name} • {reminder.client_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(reminder.status)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(reminder.status)}`}>
                        {reminder.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{reminder.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(reminder.due_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {reminder.due_time}
                      </div>
                      <span className={`font-medium ${priorities.find(p => p.value === reminder.priority)?.color}`}>
                        {priorities.find(p => p.value === reminder.priority)?.label}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => createGoogleCalendarEvent(reminder)}
                      >
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        Add to Calendar
                      </Button>
                      
                      {reminder.status !== 'completed' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateStatus(reminder.id, 'completed')}
                          disabled={loading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Reminder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Code Audit for Client Website"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the task..."
                value={newReminder.description}
                onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  placeholder="Client name"
                  value={newReminder.client_name}
                  onChange={(e) => setNewReminder({ ...newReminder, client_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="client_email">Client Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  placeholder="client@example.com"
                  value={newReminder.client_email}
                  onChange={(e) => setNewReminder({ ...newReminder, client_email: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="reminder_type">Reminder Type</Label>
              <Select 
                value={newReminder.reminder_type} 
                onValueChange={(value) => setNewReminder({ ...newReminder, reminder_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="mr-2">{type.icon}</span>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newReminder.due_date}
                  onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="due_time">Due Time</Label>
                <Input
                  id="due_time"
                  type="time"
                  value={newReminder.due_time}
                  onChange={(e) => setNewReminder({ ...newReminder, due_time: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={newReminder.priority} 
                onValueChange={(value) => setNewReminder({ ...newReminder, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <span className={priority.color}>{priority.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleCreateReminder}
                disabled={loading || !newReminder.title || !newReminder.due_date}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Reminder'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCalendar;
