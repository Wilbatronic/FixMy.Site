/**
 * Comprehensive error handling utility for the application
 */

import posthogClient from '../services/posthog';

class ErrorHandler {
  constructor() {
    this.initialized = false;
    this.errorCount = 0;
    this.maxErrors = 10; // Prevent infinite error loops
  }

  /**
   * Initialize error handling
   */
  init() {
    if (this.initialized) return;
    
    // Global error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Network error monitoring
    this.monitorNetworkErrors();
    
    // Asset loading error monitoring
    this.monitorAssetErrors();
    
    this.initialized = true;
    console.log('Error handler initialized');
  }

  /**
   * Handle global JavaScript errors
   */
  handleGlobalError(event) {
    this.errorCount++;
    if (this.errorCount > this.maxErrors) return;

    const error = {
      type: 'global_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Global error caught:', error);
    this.reportError(error);
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(event) {
    this.errorCount++;
    if (this.errorCount > this.maxErrors) return;

    const error = {
      type: 'unhandled_rejection',
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Unhandled promise rejection:', error);
    this.reportError(error);
  }

  /**
   * Monitor network errors
   */
  monitorNetworkErrors() {
    // Monitor fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.handleNetworkError({
            type: 'fetch_error',
            url: args[0],
            status: response.status,
            statusText: response.statusText
          });
        }
        return response;
      } catch (error) {
        this.handleNetworkError({
          type: 'fetch_exception',
          url: args[0],
          error: error.message
        });
        throw error;
      }
    };

    // Monitor WebSocket errors
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      const ws = new originalWebSocket(url, protocols);
      
      ws.addEventListener('error', (event) => {
        this.handleNetworkError({
          type: 'websocket_error',
          url: url,
          error: event.error?.message || 'WebSocket error'
        });
      });

      ws.addEventListener('close', (event) => {
        if (event.code !== 1000) { // Normal closure
          this.handleNetworkError({
            type: 'websocket_close',
            url: url,
            code: event.code,
            reason: event.reason
          });
        }
      });

      return ws;
    };
  }

  /**
   * Monitor asset loading errors
   */
  monitorAssetErrors() {
    // Monitor image loading errors
    const originalImage = window.Image;
    window.Image = function() {
      const img = new originalImage();
      
      img.addEventListener('error', (event) => {
        this.handleAssetError({
          type: 'image_error',
          src: img.src,
          error: 'Failed to load image'
        });
      });

      return img;
    };
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error) {
    error.timestamp = new Date().toISOString();
    error.userAgent = navigator.userAgent;
    error.url = window.location.href;
    
    console.warn('Network error:', error);
    this.reportError(error);
  }

  /**
   * Handle asset loading errors
   */
  handleAssetError(error) {
    error.timestamp = new Date().toISOString();
    error.userAgent = navigator.userAgent;
    error.url = window.location.href;
    
    console.warn('Asset error:', error);
    this.reportError(error);
  }

  /**
   * Report errors to analytics
   */
  reportError(error) {
    try {
      // Send to PostHog if available
      if (posthogClient && typeof posthogClient.capture === 'function') {
        posthogClient.capture('error_occurred', {
          error_type: error.type,
          error_message: error.message || error.reason || error.error,
          error_url: error.url,
          error_timestamp: error.timestamp
        });
      }
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  }

  /**
   * Handle CSP violations
   */
  handleCSPViolation(violation) {
    const error = {
      type: 'csp_violation',
      directive: violation.violatedDirective,
      blockedURI: violation.blockedURI,
      sourceFile: violation.sourceFile,
      lineNumber: violation.lineNumber,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.warn('CSP violation:', error);
    this.reportError(error);
  }

  /**
   * Create a user-friendly error message
   */
  createUserMessage(error) {
    switch (error.type) {
      case 'network_error':
        return 'Network connection issue. Please check your internet connection.';
      case 'asset_error':
        return 'Some resources failed to load. Please refresh the page.';
      case 'csp_violation':
        return 'Security policy violation. Please contact support if this persists.';
      default:
        return 'An unexpected error occurred. Please try refreshing the page.';
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;
