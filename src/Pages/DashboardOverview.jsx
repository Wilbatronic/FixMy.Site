import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";

export default function DashboardOverview() {
  useEffect(() => { }, []);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-gray-700">
            <p>
              Use the sidebar to access your service requests, credentials, website health checks, and request a new service.
            </p>
            <p>
              For support, email <a href="mailto:help@fixmy.site" className="text-blue-600 hover:underline">help@fixmy.site</a>. We typically respond within a few hours.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Service Requests</strong>: Track your tickets, reply to our team, and upload files.
              </li>
              <li>
                <strong>Credentials</strong>: Securely store site logins. Passwords are encrypted and only revealed after re-authentication.
              </li>
              <li>
                <strong>Site Health</strong>: View recent uptime and response time checks for your site.
              </li>
              <li>
                <strong>Request Service</strong>: Start a new request and get an instant estimate.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


