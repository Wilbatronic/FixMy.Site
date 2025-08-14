import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { Button } from '../Components/ui/button';
import { ExternalLink } from 'lucide-react';
import authService from '../services/auth';
import { apiJson } from '@/utils/api';

export default function DashboardSubscription() {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson('create-portal-session', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!ok) throw new Error('Failed to create portal session.');
      window.location.href = data.url;
    } catch (error) {
      console.error('Error managing subscription:', error);
      alert('Could not open the subscription portal. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>View your current plan, update payment methods, and see your invoice history.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Current Plan</h3>
              <p className="capitalize">{currentUser?.subscription_tier || 'Free Plan'}</p>
            </div>
            <Button onClick={handleManageSubscription} disabled={loading}>
              {loading ? 'Redirecting...' : 'Manage Your Subscription'}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-sm text-gray-500">You will be securely redirected to our payment provider, Stripe.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
