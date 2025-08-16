import React, { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import authService from "@/services/auth";
import { Button } from "../ui/button";

const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      }`
    }
    end
  >
    {children}
  </NavLink>
);

export default function DashboardLayout() {
  const me = authService.getCurrentUser();
  const navigate = useNavigate();

  // Refresh user data to get updated admin status
  useEffect(() => {
    const refreshUser = async () => {
      try {
        await authService.refreshCurrentUser();
        // Force a re-render by updating the component
        window.location.reload();
      } catch (error) {
        console.warn('Failed to refresh user data:', error);
      }
    };
    
    // Only refresh if user exists but doesn't have is_admin flag
    if (me && me.token && me.is_admin === undefined) {
      refreshUser();
    }
  }, [me]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm sticky top-24">
                             <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-gray-900">Client Dashboard</h2>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handleLogout}
                   className="text-red-600 hover:text-red-700 hover:bg-red-50"
                 >
                   Logout
                 </Button>
               </div>
              
              {me && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{me.name}</div>
                  <div className="text-xs text-gray-500">{me.email}</div>
                </div>
              )}

              <nav className="space-y-1">
                <NavItem to="/dashboard">Overview</NavItem>
                <NavItem to="/dashboard/requests">Service Requests</NavItem>
                <NavItem to="/dashboard/credentials">Credentials</NavItem>
                <NavItem to="/dashboard/site-health">Site Health</NavItem>
                <NavItem to="/dashboard/quote">Request Service</NavItem>
                <NavItem to="/dashboard/account">Account Settings</NavItem>
                                 {me && me.is_admin ? (
                   <>
                     <div className="mt-3 text-xs uppercase text-gray-500">Admin</div>
                     <NavItem to="/dashboard/analytics">Analytics</NavItem>
                     <NavItem to="/dashboard/admin/calendar">Calendar</NavItem>
                     <NavItem to="/dashboard/admin/quotes">Quotes</NavItem>
                     <NavItem to="/dashboard/admin/invoices">Invoices</NavItem>
                   </>
                 ) : null}
              </nav>
            </div>
          </aside>
          <section className="lg:col-span-3">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}


