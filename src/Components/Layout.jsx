import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Twitter, Github, Menu, X, Home as HomeIcon, Settings, Calculator, Phone } from "lucide-react";
import logo from "../../FixMySite_Logo_Transparent.png";
import authService from "../services/auth";
import OfflineIndicator from "./OfflineIndicator.jsx";

const NavLinkItem = ({ to, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `px-4 py-2 rounded-lg transition-colors ${
        isActive ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"
      }`
    }
  >
    {children}
  </NavLink>
);

const FooterLink = ({ href, children }) => {
  // Check if it's an internal link (starts with /)
  if (href.startsWith('/')) {
    return (
      <Link
        to={href}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        {children}
      </Link>
    );
  }
  
  // External links use anchor tags
  return (
    <a
      href={href}
      className="text-sm text-gray-500 hover:text-gray-900"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

export default function Layout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isLoggedIn = !!authService.getCurrentUser();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <OfflineIndicator />
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
        <div className="container relative flex h-16 items-center justify-between px-5">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <img src={logo} alt="FixMy.Site" className="h-8 w-auto" />
          </Link>
          <div className="md:hidden">
            <button onClick={toggleMenu} aria-expanded={isMenuOpen} aria-label="Toggle Menu">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          <nav className="hidden md:flex items-center space-x-2 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) => `px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                isActive ? 'bg-[#E0F2FE] text-[#2563EB]' : 'text-[#1E293B] hover:text-[#2563EB] hover:bg-[#E0F2FE]'
              }`}
            >
              <HomeIcon className="h-4 w-4" /> Home
            </NavLink>
            <NavLink
              to="/pricing#services"
              className={({ isActive }) => `px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                location.pathname.startsWith('/pricing') ? 'bg-[#E0F2FE] text-[#2563EB]' : 'text-[#1E293B] hover:text-[#2563EB] hover:bg-[#E0F2FE]'
              }`}
            >
              <Settings className="h-4 w-4" /> Services
            </NavLink>
            <NavLink
              to="/quote"
              className={({ isActive }) => `px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                isActive ? 'bg-[#E0F2FE] text-[#2563EB]' : 'text-[#1E293B] hover:text-[#2563EB] hover:bg-[#E0F2FE]'
              }`}
            >
              <Calculator className="h-4 w-4" /> Request Service
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) => `px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                isActive ? 'bg-[#E0F2FE] text-[#2563EB]' : 'text-[#1E293B] hover:text-[#2563EB] hover:bg-[#E0F2FE]'
              }`}
            >
              <Phone className="h-4 w-4" /> Contact
            </NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="px-4 py-2 rounded-lg text-[#1E293B] hover:text-[#2563EB] hover:bg-[#E0F2FE] transition-colors">Sign in</Link>
                <Link to="/register" className="px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors">Sign up</Link>
              </>
            ) : (
              <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors">Dashboard</Link>
            )}
          </div>
        </div>
        <div
          className={`md:hidden absolute left-0 right-0 top-full bg-white border-b shadow-lg transform transition-all duration-200 ${
            isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <nav className="flex flex-col items-stretch space-y-1 p-4 text-sm font-medium">
            <NavLinkItem to="/" onClick={closeMenu}>Home</NavLinkItem>
            <NavLinkItem to="/pricing#services" onClick={closeMenu}>Services</NavLinkItem>
            <NavLinkItem to="/quote" onClick={closeMenu}>Request Service</NavLinkItem>
            <NavLinkItem to="/contact" onClick={closeMenu}>Contact</NavLinkItem>
            {!isLoggedIn ? (
              <>
                <NavLinkItem to="/login" onClick={closeMenu}>Sign in</NavLinkItem>
                <NavLinkItem to="/register" onClick={closeMenu}>Sign up</NavLinkItem>
              </>
            ) : (
              <NavLinkItem to="/dashboard" onClick={closeMenu}>Dashboard</NavLinkItem>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-100">
          <div className="container py-10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                  <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <img src={logo} alt="FixMy.Site" className="h-6 w-auto" />
                      </div>
                      <p className="text-sm text-gray-500">AI-powered website solutions that are fast, secure, and conversion-focused.</p>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Pages</h3>
                      <ul className="space-y-2">
                          <li><FooterLink href="/">Home</FooterLink></li>
                          <li><FooterLink href="/pricing">Pricing & Services</FooterLink></li>
                          <li><FooterLink href="/contact">Contact & Quote</FooterLink></li>
                      </ul>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
                      <ul className="space-y-2">
                          <li><FooterLink href="/contact">Contact Us</FooterLink></li>
                      </ul>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
                      <ul className="space-y-2">
                          <li><FooterLink href="/privacy-policy">Privacy Policy</FooterLink></li>
                          <li><FooterLink href="/terms-and-conditions">Terms & Conditions</FooterLink></li>
                          <li><FooterLink href="/refund-policy">Refund Policy</FooterLink></li>
                      </ul>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Connect</h3>
                      <div className="flex space-x-4">
                          <a href="#" className="text-gray-400 hover:text-gray-500">
                              <Twitter className="h-5 w-5" />
                          </a>
                          <a href="#" className="text-gray-400 hover:text-gray-500">
                              <Github className="h-5 w-5" />
                          </a>
                      </div>
                  </div>
              </div>
              <div className="mt-8 border-t pt-8 flex flex-col sm:flex-row justify-between items-center">
                  <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} FixMy.Site. All rights reserved.</p>
              </div>
          </div>
      </footer>
    </div>
  );
}
