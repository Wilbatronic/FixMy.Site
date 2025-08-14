import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";

import authService from "../services/auth";
import { apiJson } from "@/utils/api";

import Chat from '../Components/Chat.jsx';

export default function Portal() {
  const [serviceRequests, setServiceRequests] = useState([]);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiJson('service-requests');
      if (ok) setServiceRequests(data);
    })();
  }, []);

  return (
    <div className="min-h-screen py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Client Portal
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Welcome to your client portal. All users can view requests and communicate with us here. Site Health is available for active subscribers.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>My Service Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No service requests found.</p>
                </div>
              ) : (
                serviceRequests.map((request) => (
                  <div key={request.id} className="border-b py-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{request.service_type}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                          {request.status}
                        </span>
                                                 {request.ticket_id && (
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             request.ticket_status === 'open' ? 'bg-green-100 text-green-800' :
                             request.ticket_status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                             request.ticket_status === 'closed' ? 'bg-gray-100 text-gray-800' :
                             request.ticket_status === 'resolved' ? 'bg-purple-100 text-purple-800' :
                             'bg-yellow-100 text-yellow-800'
                           }`}>
                             Ticket #{request.ticket_id} ({request.ticket_status || 'open'})
                           </span>
                         )}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2">{request.problem_description}</p>
                    {request.urgency_level && (
                      <p className="text-sm text-gray-500 mb-2">Urgency: {request.urgency_level}</p>
                    )}
                    {request.estimated_quote && (
                      <p className="text-sm text-gray-500 mb-2">Estimated: £{request.estimated_quote}</p>
                    )}
                    {request.additional_features && request.additional_features.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Additional Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {request.additional_features.map((feature, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                              {feature.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-xs text-gray-400">Created: {new Date(request.created_at).toLocaleDateString()}</p>
                      {request.ticket_id && (
                        <a 
                          href={`/dashboard/ticket/${request.ticket_id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          View Ticket
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Chat />
        </div>
      </div>
    </div>
  );
}
