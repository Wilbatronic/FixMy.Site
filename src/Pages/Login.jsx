import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../Components/ui/card";
import authService from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const params = new URLSearchParams(window.location.search);
  const prefillEmail = params.get('email') || '';
  const showVerifyBanner = params.get('verify') === '1';
  const redirectTo = params.get('redirect');
  const prefillQuery = params.get('prefill');
  useEffect(() => { if (prefillEmail) setEmail(prefillEmail); }, [prefillEmail]);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    authService.login(email, password).then(
      () => {
        if (redirectTo) {
          const url = prefillQuery ? `${redirectTo}${prefillQuery}` : redirectTo;
          navigate(url);
        } else {
          navigate("/dashboard");
        }
        window.location.reload();
      },
      (error) => {
        console.log(error);
      }
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {showVerifyBanner && (
            <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
              Check your email for a 6-digit code. After verifying, you can log in.
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button className="w-full mt-4" type="submit">Login</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
