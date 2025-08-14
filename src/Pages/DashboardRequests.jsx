import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../Components/ui/card";
import authService from "../services/auth";
import { apiJson } from "@/utils/api";
import { io } from 'socket.io-client';

export default function DashboardRequests() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
      const fetchRequests = async () => {
    try {
      console.log('Fetching service requests...');
      setLoading(true);
      const { ok, data } = await apiJson('service-requests', { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
      if (!ok) throw new Error('Failed to fetch service requests');
      console.log('Received service requests data:', data);
      setServiceRequests(data);
    } catch (err) {
      setError(err.message);
      console.error("Fetch requests failed:", err);
    } finally {
      setLoading(false);
    }
  };

    fetchRequests();

    // Set up socket connection to listen for ticket deletion events
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', { 
      path: '/socket.io', 
      auth: { token: authService.getCurrentUser()?.token } 
    });

    socket.on('connect', () => {
      console.log('DashboardRequests socket connected');
    });

    socket.on('ticket_deleted_from_dashboard', (data) => {
      console.log('Received ticket_deleted_from_dashboard event:', data);
      // Refresh the service requests list when a ticket is deleted
      fetchRequests();
    });

    // Also refresh on the generic deletion event and the admin wipe event
    socket.on('ticket_deleted', () => {
      console.log('Received ticket_deleted event');
      fetchRequests();
    });
    socket.on('tickets_wiped', () => {
      console.log('Received tickets_wiped event');
      fetchRequests();
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">My Service Requests</h1>
      {loading && <p>Loading requests...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && serviceRequests.length === 0 && (
        <p>You have not made any service requests yet.</p>
      )}
      {!loading && !error && serviceRequests.length > 0 && (
        <div className="space-y-4">
          {serviceRequests.map((request) => {
            console.log('Rendering service request:', request);
            return (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{request.service_type}</CardTitle>
                    <CardDescription>
                      Requested on: {new Date(request.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                                     <div className="flex items-center space-x-2">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                       request.status === 'new' ? 'bg-blue-100 text-blue-800' :
                       request.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                       request.status === 'completed' ? 'bg-green-100 text-green-800' :
                       'bg-gray-100 text-gray-800'
                     }`}>
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
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{request.problem_description}</p>
                {request.urgency_level && (
                  <p className="text-sm text-gray-500 mb-2">Urgency: {request.urgency_level}</p>
                )}
                {request.estimated_quote && (
                  <p className="text-sm text-gray-500 mb-3">Estimated: £{request.estimated_quote}</p>
                )}
                {request.ticket_id ? (
                  <Link to={`/dashboard/ticket/${request.ticket_id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Ticket →
                  </Link>
                ) : (
                  <p className="text-sm text-gray-500">Processing your request...</p>
                )}
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}
    </div>
  );
}


