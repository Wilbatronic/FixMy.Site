import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Calculator, Clock, CheckCircle } from "lucide-react";
import pricing from "../../Config/quotePricing.json";
import { formatFromGbp } from "@/utils/currency";

const serviceTypes = pricing.serviceTypes;
const platformTypes = pricing.platformTypes;
const urgencyLevels = pricing.urgencyLevels;
const complexityFactors = pricing.complexityFactors;
const additionalFeatures = pricing.additionalFeatures || {};

export default function QuoteCalculator({ onQuoteUpdate, isDashboard = false }) {
  const [formData, setFormData] = useState({
    serviceType: "",
    platformType: "",
    urgencyLevel: "low",
    complexityFactors: [],
    description: "",
    website: ""
  });
  
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    calculateQuote();
  }, [formData]);

  const calculateQuote = () => {
    if (!formData.serviceType || !formData.platformType) {
      setEstimatedPrice(0);
      return;
    }

    const service = serviceTypes[formData.serviceType];
    const platform = platformTypes[formData.platformType];
    const urgency = urgencyLevels[formData.urgencyLevel];

    const basePrice = service.basePrice;
    const totalMultiplier = pricing.useMultipliers
      ? (service.multiplier * platform.multiplier * urgency.multiplier)
      : 1;

    // Add complexity factors
    const complexityPrice = formData.complexityFactors.reduce((sum, factorId) => {
      const factor = complexityFactors.find(f => f.id === factorId);
      return sum + (factor ? factor.price : 0);
    }, 0);

    const finalPrice = (basePrice * totalMultiplier) + complexityPrice;
    setEstimatedPrice(Math.round(finalPrice));

    // Calculate estimated time
    const baseDays = {
      quick_fix: 1,
      redesign: 7,
      new_website: 14,
      maintenance_plan: 1,
      consultation: 1
    };

    const timeMultiplier = {
      low: 1,
      medium: 0.7,
      high: 0.4,
      critical: 0.2
    };

    const estimatedDays = Math.max(1, Math.round(baseDays[formData.serviceType] * timeMultiplier[formData.urgencyLevel]));
    setEstimatedTime(estimatedDays === 1 ? "1 day" : `${estimatedDays} days`);

    // Pass data to parent component
    if (onQuoteUpdate) {
      onQuoteUpdate({
        serviceType: formData.serviceType,
        platformType: formData.platformType,
        urgencyLevel: formData.urgencyLevel,
        complexityFactors: formData.complexityFactors,
        description: formData.description,
        website: formData.website,
        estimatedPrice: finalPrice,
        estimatedTime
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (field === 'serviceType') {
      // reset selected add-ons on service change
      setFormData(prev => ({ ...prev, complexityFactors: [] }));
    }
  };

  const handleComplexityChange = (factorId, checked) => {
    setFormData(prev => ({
      ...prev,
      complexityFactors: checked 
        ? [...prev.complexityFactors, factorId]
        : prev.complexityFactors.filter(id => id !== factorId)
    }));
  };

  const goToContact = () => {
    // Get full feature objects for the selected complexity factors
    const selectedFeatures = formData.complexityFactors.map(factorId => {
      const factor = complexityFactors.find(f => f.id === factorId);
      return factor ? { id: factor.id, name: factor.name, price: factor.price } : null;
    }).filter(Boolean);

    const params = new URLSearchParams({
      name: '',
      email: '',
      website: formData.website || '',
      serviceType: formData.serviceType,
      urgency_level: formData.urgencyLevel,
      description: formData.description,
      estimate: String(estimatedPrice),
      additionalFeatures: encodeURIComponent(JSON.stringify(selectedFeatures))
    });
    window.location.href = `/contact?${params.toString()}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Quote Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 flex items-center space-x-2">
              <Calculator className="w-6 h-6 text-blue-600" />
              <span>Project Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Type (maintenance plan removed) */}
            <div>
              <Label className="text-gray-700 mb-2 block font-medium">What service do you need?</Label>
              <Select value={formData.serviceType} onValueChange={(value) => handleInputChange("serviceType", value)}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select service type" display={(val) => serviceTypes[val]?.name} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {Object.entries(serviceTypes).filter(([key]) => key !== 'maintenance_plan').map(([key, service]) => (
                    <SelectItem key={key} value={key} className="hover:bg-blue-50">
                      {service.name} - Starting at {formatFromGbp(service.basePrice).text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Platform Type */}
            <div>
              <Label className="text-gray-700 mb-2 block font-medium">What platform is your website on?</Label>
              <Select value={formData.platformType} onValueChange={(value) => handleInputChange("platformType", value)}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select platform" display={(val) => platformTypes[val]?.name} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {Object.entries(platformTypes).map(([key, platform]) => (
                    <SelectItem key={key} value={key} className="hover:bg-blue-50">
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Level */}
            <div>
              <Label className="text-gray-700 mb-2 block font-medium">How urgent is this project?</Label>
              <Select value={formData.urgencyLevel} onValueChange={(value) => handleInputChange("urgencyLevel", value)}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue display={(val) => urgencyLevels[val]?.name} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {Object.entries(urgencyLevels).map(([key, urgency]) => (
                    <SelectItem key={key} value={key} className="hover:bg-blue-50">
                      {urgency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Website URL */}
            <div>
              <Label className="text-gray-700 mb-2 block font-medium">Website URL (Optional)</Label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Modular Additional Features based on service type (localized pricing) */}
            {formData.serviceType && additionalFeatures[formData.serviceType] && additionalFeatures[formData.serviceType].length > 0 && (
              <div>
                <Label className="text-gray-700 mb-4 block font-medium">Additional features needed? (Optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {additionalFeatures[formData.serviceType].map((featureId) => {
                    const factor = complexityFactors.find(f => f.id === featureId);
                    if (!factor) return null;
                    const priceText = formatFromGbp(factor.price).text;
                    return (
                      <div key={factor.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          id={factor.id}
                          checked={formData.complexityFactors.includes(factor.id)}
                          onChange={(e) => handleComplexityChange(factor.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-600"
                        />
                        <label htmlFor={factor.id} className="flex-1 text-gray-700 text-sm">
                          {factor.name}
                          <span className="text-blue-600 ml-2">+{priceText}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <Label className="text-gray-700 mb-2 block font-medium">Describe your project in detail</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Tell us about your website, the issues you're facing, or what you'd like to build..."
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-2">This is an instant estimate for planning purposes and not a concrete quote. Final pricing will be confirmed after a brief review call.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Summary */}
      <div className="lg:col-span-1">
        <Card className="glass-card border-0 sticky top-24">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Estimated Quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {estimatedPrice > 0 ? (
              <>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {formatFromGbp(estimatedPrice).text}
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Estimated: {estimatedTime}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Base Service:</span>
                    <span className="text-gray-900">
                      {formData.serviceType ? serviceTypes[formData.serviceType].name : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Platform:</span>
                    <span className="text-gray-900">
                      {formData.platformType ? platformTypes[formData.platformType].name : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Timeline:</span>
                    <span className="text-gray-900">
                      {formData.urgencyLevel ? urgencyLevels[formData.urgencyLevel].name : "-"}
                    </span>
                  </div>
                </div>

                {formData.complexityFactors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Additional Features:</div>
                    {formData.complexityFactors.map(factorId => {
                      const factor = complexityFactors.find(f => f.id === factorId);
                      return (
                        <div key={factorId} className="flex justify-between text-sm">
                          <span className="text-gray-700">{factor.name}</span>
                          <span className="text-blue-600">+${factor.price}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <Badge variant="outline" className="border-green-500 text-green-600 w-full justify-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Instant Quote Ready
                  </Badge>
                  <div className="mt-4">
                    {!isDashboard && (
                      <Button className="btn-primary w-full" onClick={goToContact}>Continue to Contact</Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Fill out the form to see your estimated quote</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
