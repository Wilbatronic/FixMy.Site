import React from "react";
import QuoteCalculator from "../Components/quote/QuoteCalculator.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";

export default function Quote() {
  const handleQuoteCalculation = (data) => {
    console.log("Quote data:", data);
  };

  return (
    <div className="min-h-screen py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Get an Instant Quote</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Our transparent pricing model allows you to get an instant estimate for your project.</p>
        </div>
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-gray-900">Estimate Your Project</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteCalculator onQuoteCalculated={handleQuoteCalculation} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
