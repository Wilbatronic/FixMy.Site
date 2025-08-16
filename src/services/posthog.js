import posthog from 'posthog-js';

const posthogClient = {
  init: () => {
    const apiKey = import.meta.env.VITE_POSTHOG_KEY;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST;

    if (apiKey && apiHost && apiKey !== '<your_posthog_project_api_key>') {
      try {
        posthog.init(apiKey, {
          api_host: apiHost,
          // Enhanced configuration for better error handling
          loaded: (posthog) => {
            if (import.meta.env.DEV) {
              posthog.debug();
            }
            console.log('PostHog initialized successfully');
          },
          // Disable features that might cause CORS issues in development
          disable_session_recording: import.meta.env.DEV,
          disable_persistence: false,
          // Better error handling
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: false,
          // Disable features that might cause issues
          disable_feature_flags: import.meta.env.DEV,
          disable_remote_config: import.meta.env.DEV
        });
      } catch (error) {
        console.warn('PostHog initialization failed:', error);
      }
    } else {
      console.warn("PostHog API key or host not found. Analytics will be disabled.");
    }
  },

  // Identify the user after login
  identify: (userId, properties) => {
    posthog.identify(userId, properties);
  },

  // Clear user identity on logout
  reset: () => {
    posthog.reset();
  },

  // Capture custom events
  capture: (eventName, properties) => {
    try {
      posthog.capture(eventName, properties);
    } catch (error) {
      console.warn('PostHog capture failed:', error);
    }
  },

  // Check if PostHog is properly initialized
  isInitialized: () => {
    try {
      return posthog.isFeatureEnabled !== undefined;
    } catch {
      return false;
    }
  }
};

export default posthogClient;
