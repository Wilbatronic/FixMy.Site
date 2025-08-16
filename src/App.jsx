import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Layout from "./Components/Layout.jsx";
import { useEffect } from 'react';
import DashboardLayout from "./Components/dashboard/DashboardLayout.jsx";
import DashboardOverview from "./Pages/DashboardOverview.jsx";
import DashboardRequests from "./Pages/DashboardRequests.jsx";
import DashboardCredentials from "./Pages/DashboardCredentials.jsx";
import DashboardSiteHealth from "./Pages/DashboardSiteHealth.jsx";
import DashboardQuote from "./Pages/DashboardQuote.jsx";
import DashboardAccount from "./Pages/DashboardAccount.jsx";
import Home from "./Pages/Home.jsx";
import Contact from "./Pages/Contact.jsx";
import Quote from "./Pages/Quote.jsx";
import VerifyEmail from "./Pages/VerifyEmail.jsx";
import Login from "./Pages/Login.jsx";
import Register from "./Pages/Register.jsx";
import Portal from "./Pages/Portal.jsx";
import Pricing from "./Pages/Pricing.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import DashboardTicket from "./Pages/DashboardTicket.jsx";
import DashboardSubscription from "./Pages/DashboardSubscription.jsx";
import KnowledgeBase from "./Pages/KnowledgeBase.jsx";
import DashboardAnalytics from "./Pages/DashboardAnalytics.jsx";

import PrivacyPolicy from "./Pages/PrivacyPolicy.jsx";
import TermsAndConditions from "./Pages/TermsAndConditions.jsx";
import RefundPolicy from "./Pages/RefundPolicy.jsx";
import AdminCalendar from "./Pages/AdminProducts.jsx";
import AdminQuotes from "./Pages/AdminQuotes.jsx";
import AdminInvoices from "./Pages/AdminInvoices.jsx";
import ViewQuote from "./Pages/ViewQuote.jsx";
import PayInvoice from "./Pages/PayInvoice.jsx";

import posthog from 'posthog-js';

const PostHogPageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page views
    if (import.meta.env.VITE_POSTHOG_KEY) {
      posthog.capture('$pageview');
    }
  }, [location]);

  return null;
};

function App() {
  return (
    <Router>
      <PostHogPageViewTracker />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Public */}
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/kb" element={<KnowledgeBase />} />
          {/* Legal Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          {/* Removed site-health from public navigation; available in Portal */}
          <Route path="/portal" element={<Portal />} />
          <Route path="/quote/:id" element={<ViewQuote />} />
          <Route path="/pay/invoice/:id" element={<PayInvoice />} />

          {/* Client Dashboard (Protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="requests" element={<DashboardRequests />} />
            <Route path="credentials" element={<DashboardCredentials />} />
            <Route path="site-health" element={<DashboardSiteHealth />} />
            <Route path="quote" element={<DashboardQuote />} />
            <Route path="account" element={<DashboardAccount />} />
            <Route path="ticket/:ticketId" element={<DashboardTicket />} />
            <Route path="subscription" element={<DashboardSubscription />} />
            <Route path="analytics" element={<DashboardAnalytics />} />

            <Route path="admin/calendar" element={<AdminCalendar />} />
            <Route path="admin/quotes" element={<AdminQuotes />} />
            <Route path="admin/quotes/new" element={<AdminQuotes />} />
            <Route path="admin/invoices" element={<AdminInvoices />} />
          </Route>
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
