import React, { useEffect, useState } from 'react';
import { apiJson } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';

export default function DashboardAnalytics() {
  const [summary, setSummary] = useState(null);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

  const fetchSummary = async () => {
    setError('');
    try {
      const { ok, data } = await apiJson(`admin/analytics/summary?days=${days}`, { headers: { 'Content-Type': 'application/json' } });
      if (!ok) throw new Error('Failed');
      setSummary(data);
    } catch (e) {
      setError('Failed to load analytics. Are you an admin?');
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Analytics Summary</CardTitle>
          <CardDescription>Page views and events over the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
            <Button onClick={fetchSummary}>Refresh</Button>
          </div>
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          {summary ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-700">Total events: <strong>{summary.total_events}</strong></div>
              <div className="text-sm text-gray-700">Pageviews: <strong>{summary.pageviews}</strong></div>
              <div>
                <div className="font-semibold mb-1">Top pages</div>
                <ul className="text-sm list-disc ml-6">
                  {(summary.top_paths || []).map((r) => (
                    <li key={r.path + r.count}>
                      <span className="text-gray-700">{r.path || '(blank)'}:</span> <strong>{r.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


