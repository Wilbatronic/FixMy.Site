import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { apiJson } from '@/utils/api';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import authService from '../services/auth';
import { Shield, Zap, Clock } from 'lucide-react';

export default function DashboardSiteHealth() {
  const [healthData, setHealthData] = useState({ summary: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresSubscription, setRequiresSubscription] = useState(false);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const { ok, status, data } = await apiJson('site-health-summary');
        if (!ok) {
          if (status === 402) {
            setRequiresSubscription(true);
            setError(null);
            return;
          }
          throw new Error('Failed to fetch site health data.');
        }
        setHealthData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthData();
  }, []);

  const formatXAxis = (tickItem) => new Date(tickItem).toLocaleDateString();

  const isUp = healthData.summary?.latest_status >= 200 && healthData.summary?.latest_status < 300;

  if (loading) return <div className="p-8 text-center">Loading site health...</div>;
  if (requiresSubscription) {
    return (
      <div className="p-8 text-center">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Site Health requires a subscription</CardTitle>
            <CardDescription>Upgrade to unlock uptime and performance monitoring.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/pricing">
              <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded">View Plans</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Health Overview</CardTitle>
          <CardDescription>A real-time look at your website's performance and uptime.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className={`p-4 rounded-lg ${isUp ? 'bg-green-100' : 'bg-red-100'}`}>
            <h3 className="text-lg font-semibold">Current Status</h3>
            <p className={`text-3xl font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>{isUp ? 'Online' : 'Down'}</p>
            <p className="text-sm text-gray-500">Status Code: {healthData.summary?.latest_status || 'N/A'}</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-100">
            <h3 className="text-lg font-semibold">Response Time</h3>
            <p className="text-3xl font-bold text-blue-600">{healthData.summary?.latest_response_time || 'N/A'} ms</p>
             <p className="text-sm text-gray-500">Latest check</p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-100">
            <h3 className="text-lg font-semibold">Incidents (7 days)</h3>
            <p className="text-3xl font-bold text-yellow-600">{healthData.history.filter(h => h.status_code >= 400).length}</p>
            <p className="text-sm text-gray-500">Detected issues</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Time (Last 7 Days)</CardTitle>
          <CardDescription>Visualizing your website's server response speed over time.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={healthData.history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="created_at" tickFormatter={formatXAxis} />
              <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="response_time" stroke="#3b82f6" strokeWidth={2} name="Response Time (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}


