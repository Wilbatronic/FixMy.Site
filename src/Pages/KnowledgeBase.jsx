import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../Components/ui/card';

const articles = [
  {
    title: 'How do I start a new service request?',
    content: 'You can start a new service request by navigating to the "Quote" page and filling out the form. Once submitted, a new ticket will be created for you in the portal.',
  },
  {
    title: 'How can I check the status of my website?',
    content: 'If you have an active subscription, you can view your real-time site health status, including uptime and response time, on your dashboard under the "Site Health" tab.',
  },
  {
    title: 'Where can I manage my subscription?',
    content: 'You can manage your subscription, including updating your payment method and viewing invoices, by going to the "Subscription" tab in your dashboard.',
  },
];

export default function KnowledgeBase() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">Knowledge Base</h1>
          <p className="text-xl text-gray-600 mt-2">Find answers to common questions.</p>
        </div>
        <div className="space-y-8">
          {articles.map((article, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{article.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{article.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
