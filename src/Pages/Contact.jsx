import React, { useState } from "react";
import Turnstile from "react-turnstile";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Textarea } from "../Components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Components/ui/select";
import pricing from "../Config/quotePricing.json";
import {
  Phone,
  Mail,
  MessageCircle,
  Send,
  CheckCircle,
  Loader2,
  Clock,
  Users,
  Shield
} from "lucide-react";
import authService from "../services/auth";
import { useNavigate } from "react-router-dom";
const ENABLE_CAPTCHA = import.meta.env.VITE_ENABLE_CAPTCHA === '1' || import.meta.env.VITE_ENABLE_CAPTCHA === 1 || false;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export default function Contact() {
  const params = new URLSearchParams(window.location.search);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: params.get('website') || "",
    serviceType: params.get('serviceType') || "",
    urgency: params.get('urgency_level') || "medium",
    description: params.get('description') || "",
    additionalFeatures: params.get('additionalFeatures') ? JSON.parse(decodeURIComponent(params.get('additionalFeatures'))) : []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [cfToken, setCfToken] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Require login to submit so we can open a portal ticket
    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=/contact&prefill=${encodeURIComponent(window.location.search)}`);
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: formData.name,
          client_email: formData.email,
          website_url: formData.website,
          service_type: formData.serviceType,
          problem_description: formData.description,
          urgency_level: formData.urgency,
          estimated_quote: Number(new URLSearchParams(window.location.search).get('estimate') || 0),
          additional_features: formData.additionalFeatures,
          cf_turnstile_token: cfToken || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setAiResponse(data.aiResponse);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      alert('We could not submit your message. Please check your details and try again.');
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
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Message Sent Successfully!</h1>
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
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Contact Our Team
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready to fix your website or start a new project? Our expert team is here to help you every step of the way.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white rounded-xl shadow-lg border border-gray-200" id="contact-section">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 flex items-center space-x-2">
                  <Send className="w-6 h-6 text-blue-600" />
                  <span>Tell Us About Your Project</span>
                </CardTitle>
                <p className="text-gray-600">
                  Fill out the form below and we'll get back to you with a solution tailored to your needs.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700 mb-2 block">Your Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 mb-2 block">Email Address *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 mb-2 block">Website URL (Optional)</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
                      placeholder="https://yoursite.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700 mb-2 block">Service Needed *</Label>
                      <Select value={formData.serviceType} onValueChange={(value) => handleInputChange("serviceType", value)}>
                        <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                          <SelectValue placeholder="Select a service" display={(val) => pricing.serviceTypes[val]?.name} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 shadow-lg">
                          {Object.entries(pricing.serviceTypes).map(([key, svc]) => (
                            <SelectItem key={key} value={key} className="text-gray-900 hover:bg-gray-100">
                              {svc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-700 mb-2 block">How urgent is this?</Label>
                      <Select value={formData.urgency} onValueChange={(value) => handleInputChange("urgency", value)}>
                        <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                          <SelectValue display={(val) => pricing.urgencyLevels[val]?.name} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 shadow-lg">
                          {Object.entries(pricing.urgencyLevels).map(([key, u]) => (
                            <SelectItem key={key} value={key} className="text-gray-900 hover:bg-gray-100">
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 mb-2 block">Project Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 min-h-[120px]"
                      placeholder="Please describe your website issues, goals, or what you'd like to achieve..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name || !formData.email || !formData.serviceType || !formData.description}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                  {ENABLE_CAPTCHA && TURNSTILE_SITE_KEY ? (
                    <div className="mt-4">
                      <Turnstile
                        sitekey={TURNSTILE_SITE_KEY}
                        onVerify={(token) => setCfToken(token)}
                        options={{ action: 'contact_form' }}
                      />
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info & Features */}
          <div className="space-y-6">
            {/* Contact Methods */}
            <Card className="bg-white rounded-xl shadow-lg border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Get In Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-900 font-medium">AI Help</div>
                    <div className="text-gray-600 text-sm">Instant support 24/7</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-900 font-medium">Email Support</div>
                    <div className="text-gray-600 text-sm">Response within 2-4 hours</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-900 font-medium">Priority Support</div>
                    <div className="text-gray-600 text-sm">For urgent issues</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white rounded-xl shadow-lg border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Why Choose Us?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-gray-900 font-medium">Fast Response</div>
                    <div className="text-gray-600 text-sm">We respond to all inquiries within hours, not days</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-gray-900 font-medium">Expert Team</div>
                    <div className="text-gray-600 text-sm">Experienced developers and designers</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-gray-900 font-medium">Guaranteed Results</div>
                    <div className="text-gray-600 text-sm">Money-back guarantee on all services</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
