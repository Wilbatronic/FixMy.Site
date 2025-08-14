import React, { useEffect, useState } from 'react';
import { apiJson } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';

export default function DashboardBilling() {
  const [me, setMe] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', user_id: '', amount: '', currency: 'gbp', description: '' });

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

  useEffect(() => {
    const loadMe = async () => {
      try {
        const { ok, data } = await apiJson('me');
        if (ok) {
          setMe(data);
          setForm((f) => ({ ...f, email: data?.email || '' }));
        }
      } catch (_) {
        // ignore
      }
    };
    loadMe();
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createInvoice = async () => {
    setError('');
    setMessage('');
    try {
      const payload = {
        email: form.email || undefined,
        user_id: form.user_id ? Number(form.user_id) : undefined,
        amount: Number(form.amount),
        currency: form.currency || 'gbp',
        description: form.description || undefined,
        send_invoice_email: true,
      };
      const { ok, data } = await apiJson('admin/invoices/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!ok) throw new Error(data?.error || 'Failed');
      setMessage(`Invoice created. URL: ${data.hosted_invoice_url}`);
    } catch (e) {
      setError(e.message || 'Failed to create invoice');
    }
  };

  const notAdmin = me && !me.is_admin;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Custom Billing</CardTitle>
          <CardDescription>Create a one-off Stripe invoice with a custom amount</CardDescription>
        </CardHeader>
        <CardContent>
          {notAdmin ? (
            <div className="text-sm text-gray-600">You must be an admin to access this page.</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID (optional)</label>
                  <input name="user_id" value={form.user_id} onChange={onChange} className="border rounded px-2 py-1 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" value={form.email} onChange={onChange} className="border rounded px-2 py-1 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input name="amount" value={form.amount} onChange={onChange} className="border rounded px-2 py-1 w-full" placeholder="e.g., 149.99" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input name="currency" value={form.currency} onChange={onChange} className="border rounded px-2 py-1 w-full" placeholder="gbp" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input name="description" value={form.description} onChange={onChange} className="border rounded px-2 py-1 w-full" placeholder="Custom work for ..." />
                </div>
              </div>
              <Button onClick={createInvoice}>Create Invoice</Button>
              {message && <div className="text-green-600 text-sm">{message}</div>}
              {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


