import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { apiJson } from '@/utils/api';

function AdminInvoices() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [newInvoice, setNewInvoice] = useState({
    amount: '',
    currency: 'gbp',
    description: 'Custom service invoice',
    email: '',
    send_invoice_email: true
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const { ok, data } = await apiJson('/api/admin/invoices');
      if (ok) {
        setInvoices(data || []);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (err) {
      setError('Failed to fetch invoices');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      const { ok, data } = await apiJson('/api/admin/invoices/create', {
        method: 'POST',
        body: JSON.stringify(newInvoice),
      });
      
      if (ok) {
        setInvoices([...invoices, data]);
        setNewInvoice({
          amount: '',
          currency: 'gbp',
          description: 'Custom service invoice',
          email: '',
          send_invoice_email: true
        });
        alert(`Invoice created successfully! Invoice ID: ${data.invoice_id}`);
      } else {
        setError('Failed to create invoice');
      }
    } catch (err) {
      setError('Failed to create invoice');
      console.error('Error creating invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading invoices...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Customer Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={newInvoice.email}
                onChange={(e) => setNewInvoice({ ...newInvoice, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (£)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="100.00"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Custom service invoice"
              value={newInvoice.description}
              onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
            />
          </div>
          <Button 
            onClick={handleCreateInvoice}
            disabled={loading || !newInvoice.email || !newInvoice.amount}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </Button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No invoices found.</p>
              <p className="text-sm">Use the form above to create custom invoices.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map(invoice => (
                <div key={invoice.id} className="p-4 border rounded-md">
                  <h3 className="font-bold">Invoice #{invoice.number}</h3>
                  <p>Status: <span className="font-semibold">{invoice.status}</span></p>
                  <p>Total: £{(invoice.total / 100).toFixed(2)}</p>
                  <p>Customer: {invoice.customer_email}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminInvoices;
