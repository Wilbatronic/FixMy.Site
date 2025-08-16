import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { apiJson } from '@/utils/api';

function ViewQuote() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const fetchQuote = async () => {
    const { ok, data } = await apiJson(`/quotes/${id}`);
    if (ok) {
      setQuote(data);
    }
  };

  const handleAccept = async () => {
    await apiJson(`/quotes/${id}/accept`, { method: 'POST' });
    fetchQuote();
  };

  if (!quote) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote #{quote.id}</CardTitle>
        <CardDescription>Status: {quote.status}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul>
          {quote.line_items.map(item => (
            <li key={item.id}>{item.description} - {item.quantity} x £{item.unit_price}</li>
          ))}
        </ul>
        <p className="font-bold">Total: £{quote.total}</p>
        {quote.status === 'open' && (
          <Button onClick={handleAccept}>Accept Quote</Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ViewQuote;
