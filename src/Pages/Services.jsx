
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Zap, 
  Code, 
  Smartphone, 
  Palette, 
  Shield, 
  Rocket,
  CheckCircle,
  ArrowRight,
  Clock,
  Users,
  Settings
} from "lucide-react";

const services = [
  {
    icon: Zap,
    title: "Quick Fixes",
    description: "Rapid solutions for urgent website issues",
    features: [
      "Broken contact forms",
      "404 error fixes",
      "SSL certificate installation",
      "Plugin conflicts resolution",
      "Database optimization",
      "Security patches"
    ],
    pricing: "Starting at $49",
    turnaround: "Same day",
    popular: false
  },
  {
    icon: Code,
    title: "Custom Development",
    description: "Bespoke web solutions tailored to your needs",
    features: [
      "Custom functionality",
      "API integrations",
      "Database design",
      "Advanced features",
      "Performance optimization",
      "Code review & cleanup"
    ],
    pricing: "Starting at $299",
    turnaround: "3-7 days",
    popular: true
  },
  {
    icon: Smartphone,
    title: "Mobile Optimization",
    description: "Ensure perfect mobile experience",
    features: [
      "Responsive design fixes",
      "Mobile speed optimization",
      "Touch-friendly interfaces",
      "Cross-device testing",
      "Progressive Web App setup",
      "Mobile SEO improvements"
    ],
    pricing: "Starting at $199",
    turnaround: "2-3 days",
    popular: false
  },
  {
    icon: Palette,
    title: "Design Refresh",
    description: "Modern, conversion-focused design updates",
    features: [
      "UI/UX improvements",
      "Brand consistency",
      "Conversion optimization",
      "Color scheme updates",
      "Typography improvements",
      "Image optimization"
    ],
    pricing: "Starting at $399",
    turnaround: "5-10 days",
    popular: false
  },
  {
    icon: Shield,
    title: "Security & Maintenance",
    description: "Keep your website secure and updated",
    features: [
      "Security audits",
      "Malware removal",
      "Regular backups",
      "Plugin updates",
      "Performance monitoring",
      "Uptime monitoring"
    ],
    pricing: "Starting at $99/month",
    turnaround: "Ongoing",
    popular: false
  },
  {
    icon: Rocket,
    title: "New Website Build",
    description: "Complete website creation from scratch",
    features: [
      "Custom design",
      "CMS setup",
      "SEO optimization",
      "Analytics integration",
      "Contact forms",
      "Training & handover"
    ],
    pricing: "Starting at $999",
    turnaround: "2-4 weeks",
    popular: false
  }
];

const platforms = [
  "WordPress",
  "Shopify",
  "Wix",
  "Squarespace",
  "Webflow",
  "Custom HTML/CSS",
  "React/Vue/Angular",
  "PHP/Laravel",
  "Node.js",
  "Python/Django"
];

export default function Services() {
  return (
    <div className="min-h-screen py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Services by FixMy.Site
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From quick fixes to complete rebuilds, our expert team provides professional solutions for all your website needs.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className={`glass-card border-0 hover-lift transition-all duration-300 relative ${service.popular ? 'ring-2 ring-blue-500' : ''}`}>
                {service.popular && (
                  <Badge className="absolute -top-3 left-6 bg-blue-600 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <Icon className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                        <p className="text-gray-600">{service.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-4">
                    <div className="text-2xl font-bold text-blue-600">{service.pricing}</div>
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{service.turnaround}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={createPageUrl("Quote")}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Get Quote
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Platforms We Support */}
        <Card className="glass-card border-0 mb-16">
          <CardHeader>
            <CardTitle className="text-3xl text-gray-900 text-center flex items-center justify-center space-x-3">
              <Settings className="w-8 h-8 text-blue-600" />
              <span>Platforms We Support</span>
            </CardTitle>
            <p className="text-gray-600 text-center">
              We work with all major website platforms and technologies
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {platforms.map((platform, index) => (
                <div key={index} className="bg-gray-100 rounded-lg p-4 text-center border border-gray-200 hover:border-blue-500 transition-colors">
                  <span className="text-gray-700 font-medium">{platform}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Process Section */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-3xl text-gray-900 text-center">Our Process</CardTitle>
            <p className="text-gray-600 text-center">
              Simple, transparent, and efficient workflow
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Diagnosis",
                  description: "We analyze your website and identify issues"
                },
                {
                  step: "2",
                  title: "Quote",
                  description: "Transparent pricing with no hidden fees"
                },
                {
                  step: "3",
                  title: "Fix & Build",
                  description: "Expert implementation with regular updates"
                },
                {
                  step: "4",
                  title: "Test & Deploy",
                  description: "Thorough testing before going live"
                }
              ].map((process, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">{process.step}</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{process.title}</h4>
                  <p className="text-gray-600 text-sm">{process.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
