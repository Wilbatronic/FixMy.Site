import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../Components/ui/card";
import authService from "../services/auth";

export default function Credentials() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const serviceRequestId = query.get('service_request_id');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          ...authService.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_request_id: Number(serviceRequestId),
          username,
          password,
        })
      });
      if (res.ok) {
        alert('Credentials submitted securely.');
        setUsername('');
        setPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Failed to submit credentials');
      }
    } catch (e) {
      alert('Network error submitting credentials');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Submit Credentials</CardTitle>
          <CardDescription>Please provide the necessary credentials for us to access your site.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" type="text" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button className="w-full mt-4">Submit</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
