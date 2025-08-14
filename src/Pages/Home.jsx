import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { 
  Zap, 
  MessageCircle, 
  Shield, 
  Rocket, 
  CheckCircle, 
  Star,
  ArrowRight,
  Code,
  Smartphone,
  Palette,
  Bot
} from "lucide-react";
import ChatInterface from "../Components/chat/ChatInterface.jsx";

const services = [
  {
    icon: Zap,
    title: "Quick Fixes",
    description: "Instant solutions for common website issues with AI-powered diagnosis",
  },
  {
    icon: Code,
    title: "Custom Development",
    description: "Bespoke web solutions tailored to your business needs",
  },
  {
    icon: Smartphone,
    title: "Mobile Optimization",
    description: "Ensure your site works flawlessly on all devices",
  },
  {
    icon: Palette,
    title: "Design Refresh",
    description: "Modern, conversion-focused design updates",
  }
];

const features = [
  "AI-powered instant support",
  "Expert human backup",
  "All platforms supported",
  "24/7 availability",
  "Transparent pricing",
  "Money-back guarantee"
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 bg-gradient-to-b from-[#F8FAFC] to-[#F0F9FF]">
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            {/* Pill Tagline */}
            <div className="inline-flex items-center gap-2 bg-[#E0F2FE] rounded-full px-4 py-1.5 mb-5">
              <MessageCircle className="w-4 h-4 text-[#2563EB]" />
              <span className="text-[#2563EB] font-medium text-sm">AI-Powered Website Support</span>
            </div>
            {/* Heading with brand highlight */}
            <h1 className="text-[42px] md:text-[48px] font-extrabold tracking-tight text-[#0F172A] leading-tight">
              Fix your website in Minutes, Not Days
              <br />
              <span className="text-[#2563EB]">with FixMy.Site</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#64748B] max-w-3xl mx-auto mt-6">
              Get instant AI-powered solutions for common website issues, or connect with our expert team for complex projects. We work with WordPress, Shopify, custom code, and everything in between.
            </p>
          </div>

          {/* AI Chat Interface */}
          <div className="mb-16">
            <ChatInterface />
          </div>

          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to={createPageUrl("Services")}>
                <Button className="btn-primary px-8 py-3 text-base rounded-xl hover-lift">
                  View All Services
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              From quick fixes to complete rebuilds, we've got you covered.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="glass-card hover-lift transition-all duration-300 border-0">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Why Choose FixMy.Site?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                We combine cutting-edge AI technology with human expertise to deliver fast, reliable website solutions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <Card className="glass-card border-0 shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold">AI Assistant</h3>
                      <p className="text-gray-500 text-sm">Online now</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-gray-700 text-sm">Hi! I can help diagnose and fix common website issues instantly. What's troubling your site today?</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-3 ml-8">
                      <p className="text-blue-800 text-sm">My contact form isn't working...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
