import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth';

export default function DashboardCredentials() {
  const [credentials, setCredentials] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [newSrId, setNewSrId] = useState('');
  const [activeRequests, setActiveRequests] = useState([]);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/credentials', { headers: authService.getAuthHeader() });
      if (!response.ok) {
        throw new Error('Failed to load credentials. Please try again later.');
      }
      const data = await response.json();
      setCredentials(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const response = await fetch('/api/service-requests/active', { headers: authService.getAuthHeader() });
        if (response.ok) {
          const data = await response.json();
          setActiveRequests(data);
        }
      } catch {}
    };
    fetchActive();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeader() },
        body: JSON.stringify({
          service_request_id: Number(newSrId),
          label: newLabel,
          text: newText
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to save credential');
      }
      setShowAdd(false);
      setNewLabel('');
      setNewText('');
      setNewSrId('');
      await fetchCredentials();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (id) => {
    const password = prompt('Please enter your account password to reveal this credential:');
    if (!password) return;

    const response = await fetch(`/api/credentials/${id}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authService.getAuthHeader() },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      const data = await response.json();
      setRevealed({ ...revealed, [id]: data.password });
    } else {
      alert('Failed to reveal credential. Please check your password.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      await fetch(`/api/credentials/${id}`, {
        method: 'DELETE',
        headers: authService.getAuthHeader(),
      });
      fetchCredentials();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Credential Vault</CardTitle>
          <CardDescription>Securely store and manage your project credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShowAdd((v) => !v)} variant={showAdd ? 'secondary' : 'default'}>
              {showAdd ? 'Cancel' : 'Add Credential'}
            </Button>
          </div>
          {showAdd && (
            <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="border rounded px-3 py-2"
                value={newSrId}
                onChange={(e) => setNewSrId(e.target.value)}
                required
              >
                <option value="">Select Service Request</option>
                {activeRequests.map((sr) => (
                  <option key={sr.id} value={sr.id}>
                    #{sr.id} • {sr.service_type || 'request'} • {sr.platform_type || '-'} • {sr.urgency_level || '-'}
                  </option>
                ))}
              </select>
              <Input placeholder="Label (e.g., WordPress Admin)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required />
              <Input placeholder="Secret text (username:password or API key)" value={newText} onChange={(e) => setNewText(e.target.value)} required />
              <div className="md:col-span-3 text-right">
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
          <div className="space-y-4">
            {loading && <p>Loading credentials...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && credentials.map((cred) => (
              <div key={cred.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{cred.label || cred.username || 'Credential'}</p>
                  <p className="text-sm text-gray-500">Associated with Request #{cred.service_request_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {revealed[cred.id] ? (
                    <div className="flex items-center gap-2">
                      <Input type="text" value={revealed[cred.id]} readOnly />
                      <Button variant="ghost" onClick={() => setRevealed({ ...revealed, [cred.id]: null })}>
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => handleReveal(cred.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Reveal
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => handleDelete(cred.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!loading && !error && credentials.length === 0 && (
              <p className="text-center text-gray-500">You have not stored any credentials yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


