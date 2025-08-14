import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Textarea } from "../Components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Components/ui/select";
import { Loader2, Send, Calculator, ClipboardCheck, DollarSign } from "lucide-react";
import QuoteCalculator from "../Components/quote/QuoteCalculator.jsx";

export default function ContactQuote() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    serviceType: "",
    urgency: "medium",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: formData.name,
          client_email: formData.email,
          website_url: formData.website,
          service_type: formData.serviceType,
          problem_description: formData.description,
          urgency_level: formData.urgency,
        }),
      });
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      setAiResponse(data.aiResponse);
      setSubmitted(true);
    } catch (e) {
      alert('There was a problem submitting your request. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-white rounded-xl shadow-lg border border-gray-200 text-center">
            <CardContent className="p-12">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thanks! We received your request.</h1>
              <p className="text-xl text-gray-600 mb-8" dangerouslySetInnerHTML={{ __html: aiResponse }} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3">Get a Quote & Contact Our Team</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Estimate your project instantly, then send us the details so we can follow up with a tailored plan.</p>
        </div>

        {/* Quote comes first */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quote Calculator */}
          <div className="lg:col-span-1 order-1" id="quote-section">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calculator className="w-5 h-5 text-blue-600" /> Instant Quote
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteCalculator onQuoteCalculated={() => {}} />
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 order-2" id="contact-section">
            <Card className="bg-white rounded-xl shadow-lg border border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" /> Tell Us About Your Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700 mb-2 block">Your Name *</Label>
                      <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="John Doe" required />
                    </div>
                    <div>
                      <Label className="text-gray-700 mb-2 block">Email Address *</Label>
                      <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="john@example.com" required />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 mb-2 block">Website URL (Optional)</Label>
                    <Input value={formData.website} onChange={(e) => handleInputChange("website", e.target.value)} placeholder="https://yoursite.com" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700 mb-2 block">Service Needed *</Label>
                      <Select value={formData.serviceType} onValueChange={(v) => handleInputChange("serviceType", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quick_fix">Quick Fix / Bug Fix</SelectItem>
                          <SelectItem value="redesign">Design Refresh</SelectItem>
                          <SelectItem value="new_website">New Website Build</SelectItem>
                          <SelectItem value="maintenance_plan">Maintenance & Support</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-700 mb-2 block">Urgency</Label>
                      <Select value={formData.urgency} onValueChange={(v) => handleInputChange("urgency", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Standard (5-7 days)</SelectItem>
                          <SelectItem value="medium">Priority (2-3 days)</SelectItem>
                          <SelectItem value="high">Rush (24-48 hours)</SelectItem>
                          <SelectItem value="critical">Emergency (Same day)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 mb-2 block">Project Description *</Label>
                    <Textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Tell us about your goals, issues, or what's needed..." required />
                  </div>

                  <Button type="submit" disabled={isSubmitting || !formData.name || !formData.email || !formData.serviceType || !formData.description} className="btn-primary w-full py-4 text-lg">
                    {isSubmitting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>) : (<><Send className="w-5 h-5 mr-2" /> Send Request</>)}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


