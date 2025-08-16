import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { apiJson } from '@/utils/api';

function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { ok, data } = await apiJson('/admin/invoices');
    if (ok) {
      setInvoices(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.map(invoice => (
          <div key={invoice.id} className="p-4 border rounded-md mb-4">
            <h3 className="font-bold">Invoice #{invoice.number}</h3>
            <p>Status: <span className="font-semibold">{invoice.status}</span></p>
            <p>Total: £{(invoice.total / 100).toFixed(2)}</p>
            <p>Customer: {invoice.customer_email}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AdminInvoices;
