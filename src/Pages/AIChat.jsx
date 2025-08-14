import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { MessageCircle, Zap, Clock, CheckCircle, Bot } from "lucide-react";
import ChatInterface from "../Components/chat/ChatInterface.jsx";

const benefits = [
  {
    icon: Zap,
    title: "Instant Solutions",
    description: "Get immediate help for common website issues"
  },
  {
    icon: Clock,
    title: "24/7 Available",
    description: "AI support whenever you need it"
  },
  {
    icon: CheckCircle,
    title: "Step-by-Step Guidance",
    description: "Clear instructions to fix issues yourself"
  }
];

export default function AIChat() {
  return (
    <div className="min-h-screen py-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Bot className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            The FixMy.Site AI Assistant
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our powerful AI can diagnose and guide you through fixes for common problems, completely free.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card key={index} className="glass-card border-0 text-center hover-lift transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Chat Interface */}
        <div className="mb-12">
          <ChatInterface />
        </div>

        {/* Common Issues */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 text-center">
              Common Issues I Can Help With
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Website loading slowly",
                "Broken contact forms",
                "Mobile responsiveness issues",
                "SSL certificate problems",
                "404 error pages",
                "WordPress plugin conflicts",
                "Image optimization",
                "SEO improvements",
                "Broken links",
                "Database errors",
                "Email not working",
                "Security vulnerabilities"
              ].map((issue, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{issue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
