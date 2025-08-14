import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../Components/ui/card';
import authService from '../services/auth';

export default function SiteHealth() {
  const [healthChecks, setHealthChecks] = useState([]);

  useEffect(() => {
    fetch('/api/site-health', {
      headers: authService.getAuthHeader(),
    })
      .then((res) => res.json())
      .then((data) => setHealthChecks(data));
  }, []);

  return (
    <div className="min-h-screen py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Site Health
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Here is the health check history for your website.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Health Check History</CardTitle>
          </CardHeader>
          <CardContent>
            {healthChecks.map((check) => (
              <div key={check.id} className="border-b py-4">
                <p>Status Code: {check.status_code}</p>
                <p>Response Time: {check.response_time}ms</p>
                <p>Checked At: {new Date(check.created_at).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
