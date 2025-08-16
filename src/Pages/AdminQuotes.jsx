import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/Components/ui/dialog';
import { useLocation } from 'react-router-dom';
import { apiJson } from '@/utils/api';

function AdminQuotes() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [newQuote, setNewQuote] = useState({
    user_id: '',
    line_items: [{ product_id: '', description: '', quantity: 1, unit_price: '' }],
  });

  useEffect(() => {
    fetchData();
    if (location.state && location.state.request) {
      const { request } = location.state;
      setNewQuote({
        user_id: request.user_id,
        service_request_id: request.id,
        line_items: [{ description: request.problem_description, quantity: 1, unit_price: '' }],
      });
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch users and quotes from API
      const [usersRes, quotesRes] = await Promise.all([
        apiJson('/api/admin/users'),
        apiJson('/api/admin/quotes')
      ]);
      
      if (usersRes.ok) {
        setUsers(usersRes.data || []);
      }
      
      if (quotesRes.ok) {
        setQuotes(quotesRes.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async () => {
    try {
      setLoading(true);
      const { ok, data } = await apiJson('/api/admin/quotes', {
        method: 'POST',
        body: JSON.stringify(newQuote),
      });
      
      if (ok) {
        setQuotes([...quotes, data]);
        setNewQuote({ user_id: '', line_items: [{ product_id: '', description: '', quantity: 1, unit_price: '' }] });
        alert('Quote created successfully!');
      } else {
        setError('Failed to create quote');
      }
    } catch (err) {
      setError('Failed to create quote');
      console.error('Error creating quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...newQuote.line_items];
    updatedLineItems[index][field] = value;
    setNewQuote({ ...newQuote, line_items: updatedLineItems });
  };
  
  const addLineItem = () => {
    setNewQuote({ 
      ...newQuote, 
      line_items: [...newQuote.line_items, { product_id: '', description: '', quantity: 1, unit_price: '' }]
    });
  };

  const removeLineItem = (index) => {
    if (newQuote.line_items.length > 1) {
      const updatedLineItems = newQuote.line_items.filter((_, i) => i !== index);
      setNewQuote({ ...newQuote, line_items: updatedLineItems });
    }
  };

  const handleFinalize = async (id) => {
    try {
      setLoading(true);
      const { ok } = await apiJson(`/api/admin/quotes/${id}/finalize`, { method: 'POST' });
      
      if (ok) {
        setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'open' } : q));
        alert('Quote finalized successfully!');
      } else {
        setError('Failed to finalize quote');
      }
    } catch (err) {
      setError('Failed to finalize quote');
      console.error('Error finalizing quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      setLoading(true);
      const { ok } = await apiJson(`/api/admin/quotes/${id}/accept`, { method: 'POST' });
      
      if (ok) {
        setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'accepted' } : q));
        alert('Quote accepted successfully!');
      } else {
        setError('Failed to accept quote');
      }
    } catch (err) {
      setError('Failed to accept quote');
      console.error('Error accepting quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      setLoading(true);
      const { ok } = await apiJson(`/api/admin/quotes/${id}/cancel`, { method: 'POST' });
      
      if (ok) {
        setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'canceled' } : q));
        alert('Quote canceled successfully!');
      } else {
        setError('Failed to cancel quote');
      }
    } catch (err) {
      setError('Failed to cancel quote');
      console.error('Error canceling quote:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && quotes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading quotes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Quote</CardTitle>
          <CardDescription>Generate quotes for your customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="user">Select Customer</Label>
            <Select onValueChange={(value) => setNewQuote({ ...newQuote, user_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Line Items</Label>
            {newQuote.line_items.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 my-2 items-end">
                <div>
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Input 
                    id={`description-${index}`}
                    placeholder="Service description" 
                    value={item.description} 
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor={`quantity-${index}`}>Qty</Label>
                  <Input 
                    id={`quantity-${index}`}
                    type="number" 
                    min="1"
                    placeholder="1" 
                    value={item.quantity} 
                    onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)} 
                  />
                </div>
                <div>
                  <Label htmlFor={`price-${index}`}>Unit Price (£)</Label>
                  <Input 
                    id={`price-${index}`}
                    type="number" 
                    step="0.01"
                    placeholder="150.00" 
                    value={item.unit_price} 
                    onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)} 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => removeLineItem(index)}
                  disabled={newQuote.line_items.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addLineItem} className="mt-2">
              Add Line Item
            </Button>
          </div>
          
          <Button 
            onClick={handleCreateQuote}
            disabled={loading || !newQuote.user_id || newQuote.line_items.some(item => !item.description || !item.unit_price)}
          >
            {loading ? 'Creating...' : 'Create Quote'}
          </Button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Quotes</CardTitle>
          <CardDescription>View and manage existing quotes</CardDescription>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No quotes found.</p>
              <p className="text-sm">Create your first quote using the form above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map(quote => (
                <div key={quote.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">
                      Quote #{quote.id} - {users.find(u => u.id === quote.user_id)?.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      quote.status === 'open' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {quote.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    Customer: {users.find(u => u.id === quote.user_id)?.email}
                  </p>
                  <p className="font-semibold text-green-600 mb-2">Total: £{quote.total}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    Expires: {quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'N/A'}
                  </p>
                  
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">View Details</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Quote #{quote.id} Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <p><strong>Customer:</strong> {users.find(u => u.id === quote.user_id)?.name}</p>
                          <p><strong>Status:</strong> {quote.status}</p>
                          <p><strong>Total:</strong> £{quote.total}</p>
                          <div>
                            <strong>Line Items:</strong>
                            <ul className="mt-2 space-y-1">
                              {quote.line_items.map(item => (
                                <li key={item.id} className="text-sm">
                                  {item.description} - {item.quantity} x £{item.unit_price}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {quote.status === 'draft' && (
                      <Button size="sm" onClick={() => handleFinalize(quote.id)} disabled={loading}>
                        Finalize
                      </Button>
                    )}
                    {quote.status === 'open' && (
                      <Button size="sm" onClick={() => handleAccept(quote.id)} disabled={loading}>
                        Accept
                      </Button>
                    )}
                    {quote.status !== 'accepted' && quote.status !== 'canceled' && (
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(quote.id)} disabled={loading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminQuotes;
