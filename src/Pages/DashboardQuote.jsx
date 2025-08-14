import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuoteCalculator from '../Components/quote/QuoteCalculator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { Button } from '../Components/ui/button';
import authService from '../services/auth';

export default function DashboardQuote() {
  const [quoteDetails, setQuoteDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleQuoteUpdate = (details) => {
    setQuoteDetails(details);
  };

  const handleSubmitRequest = async () => {
    if (!quoteDetails) {
      alert('Please configure your service request using the calculator first.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({
          service_type: quoteDetails.serviceType,
          platform_type: quoteDetails.platformType || undefined,
          website_url: quoteDetails.website || undefined,
          problem_description: quoteDetails.description,
          // Correct field names from QuoteCalculator onQuoteUpdate payload
          urgency_level: quoteDetails.urgencyLevel,
          estimated_quote: Math.round(Number(quoteDetails.estimatedPrice || 0)),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit service request.');
      }

      const data = await response.json();
      navigate(`/dashboard/ticket/${data.ticketId}`);
    } catch (error) {
      console.error('Error submitting service request:', error);
      alert('There was a problem submitting your request. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Request a New Service</CardTitle>
          <CardDescription>
            Use the calculator below to get an estimate for your new request. As an existing client, your details are already on file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteCalculator onQuoteUpdate={handleQuoteUpdate} isDashboard={true} />
          <div className="mt-6 text-center">
            <Button onClick={handleSubmitRequest} disabled={!quoteDetails || loading} size="lg" className="px-8 py-6 text-lg">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              A new ticket will be created in your portal where you can discuss the details with our team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


