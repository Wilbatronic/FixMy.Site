import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../Components/ui/card";
import { Input } from "../Components/ui/input";
import { Button } from "../Components/ui/button";

export default function VerifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');

  const requestCode = async () => {
    setStatus('');
    const res = await fetch('/api/request-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    if (res.ok) setStatus('Code sent. Please check your email.'); else setStatus('Failed to send code.');
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setStatus('');
    const res = await fetch('/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.verified) {
      setStatus('Verified! Redirecting to sign in...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } else {
      setStatus(data?.message || 'Invalid or expired code.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Enter your email to request a code, then verify below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            <Button type="button" onClick={requestCode}>Send Code</Button>
          </div>
          <form onSubmit={submitCode} className="space-y-3">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
            <Button type="submit">Verify</Button>
          </form>
          {status && <div className="mt-3 text-sm text-gray-700">{status}</div>}
        </CardContent>
      </Card>
    </div>
  );
}


