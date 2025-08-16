import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { Badge } from '../Components/ui/badge';
import { Link } from 'react-router-dom';
import { apiJson } from "@/utils/api";
import { formatFromGbp } from "@/utils/currency";

const tiers = [
  {
    name: 'FixMy.Performance',
    price: '£49',
    price_id: 'price_1RwnLKRezqS1N7dqMU9cSVd1',
    description: 'For websites that need speed, security, and stability — without the bloat.',
    features: [
      'Monthly performance optimization (caching, assets, CDN config)',
      'Uptime & downtime monitoring',
      'Weekly plugin/theme updates',
      'Security monitoring (malware scan, SSL, headers check)',
      'Basic traffic analytics (GA4 setup + reports)',
      'Preventive code audit every 6 months',
      '24–48 hr priority support',
      '20% discount on all other services',
    ],
    popular: false,
  },
  {
    name: 'FixMy.Stability',
    price: '£99',
    price_id: 'price_1RwnLKRezqS1N7dqbb8I5lzE',
    description: 'For growing businesses that want insight + performance with peace of mind.',
    features: [
      'Everything in Performance, plus:',
      'Full analytics setup + tracking (GA4 + conversion events)',
      'Monthly UX & SEO performance report',
      'Cross-device/mobile experience testing',
      'Preventive code audit every 3 months',
      '24 hr priority support',
      '30% discount on all other services',
    ],
    popular: true,
  },
  {
    name: 'FixMy.Security',
    price: '£199',
    price_id: 'price_1RwnLLRezqS1N7dqzeU4x3wU',
    description: 'For high-traffic, high-revenue websites that can’t afford downtime or bugs.',
    features: [
      'Everything in Stability, plus:',
      'Real-time uptime alerts',
      'Monthly full-stack code audit (perf, structure, security)',
      'Continuous analytics monitoring (weekly check-ins)',
      'A/B testing support & conversion funnel feedback',
      'Same-day fix response (excl. new features)',
      '40% discount on all other services',
    ],
    popular: false,
  },
];

const handleSubscribe = async (priceId) => {
  try {
    const { ok, data } = await apiJson('checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price_id: priceId }) });
    if (ok && data?.url) {
      window.location.href = data.url;
    } else {
      alert(data?.error || 'Unable to start checkout.');
    }
  } catch (e) {
    console.error(e);
    alert('Error starting checkout.');
  }
};

export default function Pricing() {
  return (
    <div className="min-h-screen py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Plans & Services
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose a plan that fits your needs. We’ll keep your site fast, secure, and running smoothly — and deliver expert work when you need it.
          </p>
        </div>
        {/* Services first */}
        <div id="services" className="mt-2 mb-16">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-3xl text-gray-900 text-center">What We Can Do</CardTitle>
              <CardDescription className="text-center">
                Our expert team handles everything from one-off fixes to full redesigns and new builds. Explore common requests below. Subscriptions are listed underneath if you want ongoing care.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  'Quick fixes & bug squashing',
                  'Custom development & integrations',
                  'Mobile/responsive optimization',
                  'Design refreshes & UX polish',
                  'Security hardening & backups',
                  'New website builds'
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link to="/contact-quote#quote-section">
                  <Button className="btn-primary px-8 py-3">
                    Get a Quote <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans after services */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <Card 
              key={tier.name} 
              className={`flex flex-col h-full rounded-xl shadow-lg border-2 ${tier.popular ? 'border-blue-600' : 'border-gray-200'}`}
            >
              {tier.popular && (
                <Badge className="w-fit self-center -mt-4 bg-blue-600 text-white">Most Popular</Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">{tier.name}</CardTitle>
                <CardDescription className="text-gray-600">{tier.description}</CardDescription>
                <div className="text-5xl font-bold text-gray-900 my-4">
                  {formatFromGbp(Number(tier.price.replace(/[^0-9.]/g, ''))).text}
                  <span className="text-lg font-medium text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <Button 
                  onClick={() => handleSubscribe(tier.price_id)}
                  className={`w-full text-lg py-6 mb-6 ${tier.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'} text-white`}
                >
                  Choose Plan <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <ul className="space-y-4 flex-grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Removed duplicate "What We Can Do" section */}
      </div>
    </div>
  );
}
