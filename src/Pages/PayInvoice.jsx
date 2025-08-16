import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/Components/CheckoutForm';
import { apiJson } from '@/utils/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function PayInvoice() {
  const { id } = useParams();
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    const fetchClientSecret = async () => {
      const { ok, data } = await apiJson(`/invoices/${id}/pay`);
      if (ok) {
        setClientSecret(data.client_secret);
      }
    };
    fetchClientSecret();
  }, [id]);

  const appearance = { theme: 'stripe' };
  const options = { clientSecret, appearance };

  return (
    <div>
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      )}
    </div>
  );
}

export default PayInvoice;
