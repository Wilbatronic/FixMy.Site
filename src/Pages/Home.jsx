import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { 
  Zap, 
  MessageCircle, 
  ArrowRight,
  Code,
  Smartphone,
  Palette,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import ChatInterface from "../Components/chat/ChatInterface.jsx";

const services = [
  {
    icon: Zap,
    title: "Error & Bug Fixes",
    description: "Fast solutions for 404s, slow loading times, and other common website errors.",
    link: "/website-errors"
  },
  {
    icon: Code,
    title: "Custom Development",
    description: "Need a new feature? We build bespoke web solutions for small businesses.",
    link: "/quote"
  },
  {
    icon: Smartphone,
    title: "Mobile Optimization",
    description: "Is your site mobile-friendly? We'll ensure it works flawlessly on all devices.",
    link: "/quote"
  },
  {
    icon: Palette,
    title: "Design & UX Audit",
    description: "Improve user experience with a professional design and usability audit.",
    link: "/quote"
  }
];

const features = [
  "Expert human support",
  "WordPress, Shopify, & more",
  "Fast turnaround times",
  "Transparent, upfront pricing",
  "Ideal for small businesses",
  "100% satisfaction guarantee"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F0F9FF]">
      {/* Hero Section */}
      <header className="relative overflow-hidden py-16 bg-gradient-to-b from-[#F8FAFC] to-[#F0F9FF]">
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h1 className="text-[42px] md:text-[48px] font-extrabold tracking-tight text-[#0F172A] leading-tight">
              Website Problems, Solved.
              <br />
              <span className="text-[#2563EB]">Fast & Professional Bug Fixes</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#64748B] max-w-3xl mx-auto mt-6">
              Struggling with a <strong>404 error</strong>, a broken contact form, or a slow website? At FixMy.Site, we provide expert technical support for small businesses. We fix the frustrating issues so you can focus on running your business. No jargon, just results.
            </p>
          </div>

          {/* AI Chat Interface */}
          <div className="mb-16">
            <ChatInterface />
          </div>

          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/quote">
                <Button className="btn-primary px-8 py-3 text-base rounded-xl hover-lift">
                  Get a Free Quote
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/pricing#services" className="text-blue-600 font-medium hover:underline">
                View Our Services
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Services Grid */}
      <section className="py-20 bg-[#F0F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Your On-Demand Website Support Team
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              From critical errors to performance tuning, we handle the technical details.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link to={service.link} key={index} className="block">
                  <Card className="glass-card hover-lift transition-all duration-300 border-0 h-full">
                    <CardContent className="pt-7 pb-6 px-6 text-center">
                      <div className={`w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                      <p className="text-gray-600">{service.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guarantees and Promotions Section */}
      <section className="py-20 bg-[#F0F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Our Guarantees & Special Offers
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              We stand behind our work with industry-leading guarantees and exclusive promotions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="glass-card border-0 shadow-lg">
              <CardContent className="pt-7 pb-6 px-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">100% Satisfaction Guarantee</h3>
                <p className="text-gray-600 mb-4">Not happy with our work? We'll fix it or give you a full refund. No questions asked.</p>
                <Link to="/refund-policy" className="text-blue-600 hover:underline text-sm font-medium">
                  Learn More →
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardContent className="pt-7 pb-6 px-6 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Fixes for Life</h3>
                <p className="text-gray-600 mb-4">When you purchase a website from us, you get free fixes for life. Any issues with the site we built for you will be fixed at no additional cost.</p>
                <Link to="/refund-policy" className="text-blue-600 hover:underline text-sm font-medium">
                  View Details →
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardContent className="pt-7 pb-6 px-6 text-center">
                <div className="w-16 h-16 bg-orange-100 text-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">10</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">First Fix Free</h3>
                <p className="text-gray-600 mb-4">The next 10 accounts to sign up get their first fix free! Limited to priority/standard urgency levels.</p>
                <Link to="/register" className="text-blue-600 hover:underline text-sm font-medium">
                  Sign Up Now →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#F0F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <article>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Why Small Businesses Choose Us
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                We're more than just developers; we're your technical partner. We understand that you need a reliable website that just works. Read more about fixing common issues on the <a href="https://www.wpbeginner.com/common-wordpress-errors-and-how-to-fix-them" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">WPBeginner blog <ExternalLink className="inline-block w-4 h-4" /></a>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </article>
            
            <aside className="relative">
              <Card className="glass-card border-0 shadow-2xl">
                <CardContent className="pt-9 pb-8 px-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold">AI Diagnostic Tool</h3>
                      <p className="text-gray-500 text-sm">Online now</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-gray-700 text-sm">Describe your website issue, and I can suggest some initial troubleshooting steps.</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-3 ml-8">
                      <p className="text-blue-800 text-sm">My contact form is not sending emails.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
