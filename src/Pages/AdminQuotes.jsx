import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/Components/ui/dialog';
import { apiJson } from '@/utils/api';
import { useLocation } from 'react-router-dom';

function AdminQuotes() {
  const location = useLocation();
  const [quotes, setQuotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [newQuote, setNewQuote] = useState({
    user_id: '',
    line_items: [{ product_id: '', description: '', quantity: 1, unit_price: '' }],
  });

  useEffect(() => {
    fetchUsers();
    fetchProducts();
    fetchQuotes();
    if (location.state && location.state.request) {
      const { request } = location.state;
      setNewQuote({
        user_id: request.user_id,
        service_request_id: request.id,
        line_items: [{ description: request.problem_description, quantity: 1, unit_price: '' }],
      });
    }
  }, [location.state]);

  const fetchUsers = async () => {
    const { data } = await apiJson('/users');
    setUsers(data);
  };
  const fetchProducts = async () => {
    const { data } = await apiJson('/products');
    setProducts(data);
  };
  const fetchQuotes = async () => {
    const { data } = await apiJson('/admin/quotes');
    setQuotes(data);
  };

  const handleCreateQuote = async () => {
    const { ok } = await apiJson('/admin/quotes', {
      method: 'POST',
      body: JSON.stringify(newQuote),
    });
    if (ok) {
      fetchQuotes();
      setNewQuote({ user_id: '', line_items: [{ product_id: '', description: '', quantity: 1, unit_price: '' }] });
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...newQuote.line_items];
    updatedLineItems[index][field] = value;
    setNewQuote({ ...newQuote, line_items: updatedLineItems });
  };
  
  const addLineItem = () => {
      setNewQuote({ ...newQuote, line_items: [...newQuote.line_items, { product_id: '', description: '', quantity: 1, unit_price: '' }]});
  }

  const handleFinalize = async (id) => {
    await apiJson(`/quotes/${id}/finalize`, { method: 'POST' });
    fetchQuotes();
  };

  const handleAccept = async (id) => {
    await apiJson(`/quotes/${id}/accept`, { method: 'POST' });
    fetchQuotes();
  };

  const handleCancel = async (id) => {
    await apiJson(`/quotes/${id}/cancel`, { method: 'POST' });
    fetchQuotes();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value) => setNewQuote({ ...newQuote, user_id: value })}>
            <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
            <SelectContent>
              {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {newQuote.line_items.map((item, index) => (
            <div key={index} className="flex space-x-2 my-2">
              <Input placeholder="Description" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} />
              <Input type="number" placeholder="Quantity" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} />
              <Input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)} />
            </div>
          ))}
          <Button onClick={addLineItem}>Add Line Item</Button>
          <Button onClick={handleCreateQuote}>Create Quote</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manage Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.map(quote => (
            <div key={quote.id} className="p-4 border rounded-md mb-4">
              <h3 className="font-bold">Quote #{quote.id} - {users.find(u => u.id === quote.user_id)?.name}</h3>
              <p>Status: <span className="font-semibold">{quote.status}</span></p>
              <p>Total: £{quote.total}</p>
              <p>Expires at: {quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'N/A'}</p>
              <div className="flex space-x-2 mt-2">
                <Dialog>
                  <DialogTrigger asChild><Button size="sm">View Details</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Quote #{quote.id} Details</DialogTitle></DialogHeader>
                    <ul>
                      {quote.line_items.map(item => (
                        <li key={item.id}>{item.description} - {item.quantity} x £{item.unit_price}</li>
                      ))}
                    </ul>
                  </DialogContent>
                </Dialog>
                {quote.status === 'draft' && <Button size="sm" onClick={() => handleFinalize(quote.id)}>Finalize</Button>}
                {quote.status === 'open' && <Button size="sm" onClick={() => handleAccept(quote.id)}>Accept</Button>}
                {quote.status !== 'accepted' && quote.status !== 'canceled' && <Button size="sm" variant="destructive" onClick={() => handleCancel(quote.id)}>Cancel</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminQuotes;
