import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../Components/ui/card";
import countries from "../utils/countries.json";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import authService from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("GB");
  const [phoneNumber, setPhoneNumber] = useState("");
  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const isWebsiteValid = useMemo(() => !websiteUrl || /^https?:\/\//i.test(websiteUrl), [websiteUrl]);
  const isPhoneValid = useMemo(() => {
    const raw = String(phoneNumber || '').trim();
    if (!raw) return true; // Phone number is optional, so it's valid if empty
    try {
      const parsed = raw.startsWith('+')
        ? parsePhoneNumberFromString(raw)
        : parsePhoneNumberFromString(raw, phoneCountry);
      return parsed ? parsed.isValid() : false;
    } catch { return false; }
  }, [phoneCountry, phoneNumber]);
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    const normalizedWebsite = websiteUrl && !/^https?:\/\//i.test(websiteUrl)
      ? `https://${websiteUrl}`
      : websiteUrl;
    authService
      .register(name, email, password, normalizedWebsite, phoneCountry, phoneNumber, confirmPassword)
      .then((resp) => {
        navigate("/verify?email=" + encodeURIComponent(email));
      })
      .catch(async (err) => {
        try {
          const res = await err.response?.json?.();
          alert(res?.message || err.message || 'Registration failed');
        } catch {
          alert(err.message || 'Registration failed');
        }
      });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {!isEmailValid && email && <span className="text-xs text-red-600">Please enter a valid email.</span>}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                {confirmPassword && confirmPassword !== password && <span className="text-xs text-red-600">Passwords do not match.</span>}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="website_url">Website URL (optional)</Label>
                <Input id="website_url" type="url" placeholder="https://yoursite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                {!isWebsiteValid && websiteUrl && <span className="text-xs text-red-600">Please include http:// or https://</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label>Country</Label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}
                  >
                    {countries.map(c => {
                      const display = c.code === 'GB' ? 'UK' : c.code;
                      return (
                        <option key={c.code} value={c.code}>{display} ({c.dialCode})</option>
                      );
                    })}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Phone Number (Optional)</Label>
                  <Input type="tel" placeholder="7123456789" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  {phoneNumber && !isPhoneValid && <span className="text-xs text-red-600">Invalid phone for selected country.</span>}
                </div>
              </div>
            </div>
            <Button className="w-full mt-4" type="submit" disabled={!name || !isEmailValid || password.length < 8 || confirmPassword !== password || !isPhoneValid}>Register</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
