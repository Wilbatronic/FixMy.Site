# Stripe Integration Setup Guide

This guide will help you set up and test the Stripe integration for subscriptions and payments.

## Prerequisites

1. A Stripe account (test or live)
2. Your Stripe API keys configured in `.env`

## Current Configuration

Your Stripe keys are already configured in `backend/.env`:
- `STRIPE_SECRET_KEY`: Your test secret key
- `STRIPE_PUBLISHABLE_KEY`: Your test publishable key
- `STRIPE_WEBHOOK_SECRET`: Placeholder (needs to be configured)

## Setup Steps

### 1. Test Stripe Connection

First, verify that your Stripe integration is working:

```bash
cd backend
npm run test:stripe
```

This will:
- Verify your API keys are valid
- Test the connection to Stripe
- List existing products and prices
- Test customer creation
- Check webhook configuration

### 2. Create Products and Prices

Run the setup script to create the subscription products:

```bash
npm run setup:stripe
```

This will create three subscription tiers:
- **FixMy.Performance**: £49/month
- **FixMy.Stability**: £99/month  
- **FixMy.Security**: £199/month

The script will output the Price IDs that you need to update in the frontend.

### 3. Update Frontend Price IDs

After running the setup script, copy the Price IDs and update them in `src/Pages/Pricing.jsx`:

```javascript
const tiers = [
  {
    name: 'FixMy.Performance',
    price: '£49',
    price_id: 'price_1ABC123...', // Replace with actual Price ID
    // ... rest of the tier config
  },
  // ... other tiers
];
```

### 4. Set Up Webhook Endpoint

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/webhook/stripe`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in `backend/.env`

### 5. Test the Complete Flow

1. Start your backend server: `npm run dev`
2. Start your frontend: `npm run dev` (from root directory)
3. Navigate to the pricing page
4. Try to subscribe to a plan
5. Check the logs for any errors

## Features Implemented

### Backend Features
- ✅ Stripe checkout session creation
- ✅ Customer portal session creation
- ✅ Webhook handling for subscription events
- ✅ Custom invoice creation
- ✅ Database integration for subscription tracking

### Frontend Features
- ✅ Pricing page with subscription tiers
- ✅ Checkout flow integration
- ✅ Customer portal access
- ✅ Subscription management

## API Endpoints

- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/create-portal-session` - Create customer portal session
- `POST /webhook/stripe` - Handle Stripe webhooks
- `POST /api/create-invoice` - Create custom invoices

## Database Schema

The system uses these database fields for Stripe integration:
- `User.stripe_customer_id` - Links user to Stripe customer
- `User.subscription_tier` - Current subscription level

## Troubleshooting

### Common Issues

1. **"Stripe not configured" error**
   - Check that `STRIPE_SECRET_KEY` is set in `.env`
   - Verify the key is valid in your Stripe dashboard

2. **Webhook signature verification failed**
   - Ensure `STRIPE_WEBHOOK_SECRET` is correctly set
   - Check that the webhook endpoint URL matches your server

3. **Price ID not found**
   - Run `npm run setup:stripe` to create products
   - Update the price IDs in `src/Pages/Pricing.jsx`

4. **Checkout session creation fails**
   - Verify the price ID exists in your Stripe account
   - Check that the price is active and configured for subscriptions

### Testing in Development

For local development, you can use Stripe's test mode:
- Use test API keys (start with `sk_test_` and `pk_test_`)
- Use test card numbers (e.g., `4242 4242 4242 4242`)
- Webhooks can be tested using Stripe CLI or ngrok

### Stripe CLI (Optional)

Install Stripe CLI for easier webhook testing:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/webhook/stripe
```

This will provide a webhook secret for local testing.

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Always verify webhook signatures in production
- Use HTTPS in production for webhook endpoints

## Production Checklist

Before going live:
- [ ] Switch to live Stripe keys
- [ ] Set up production webhook endpoint
- [ ] Test complete subscription flow
- [ ] Verify webhook handling
- [ ] Test invoice creation
- [ ] Review security settings
- [ ] Set up monitoring and logging
