const { PostHog } = require('posthog-node');

let posthogClient = null;

const initPostHog = () => {
  const apiKey = process.env.POSTHOG_KEY;
  if (apiKey) {
    posthogClient = new PostHog(apiKey, {
      host: 'https://app.posthog.com', // or your self-hosted instance
    });
    console.log('PostHog (backend) initialized successfully.');
  } else {
    console.warn('PostHog API key for backend not found. Server-side analytics will be disabled.');
  }
};

const getPostHogClient = () => {
  return posthogClient;
};

module.exports = { initPostHog, getPostHogClient };
