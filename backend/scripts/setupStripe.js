require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  try {
    console.log('Setting up Stripe products and prices...\n');

    // Create products and prices for each tier
    const tiers = [
      {
        name: 'FixMy.Performance',
        description: 'For websites that need speed, security, and stability — without the bloat.',
        price: 4900, // £49.00 in pence
        currency: 'gbp',
        interval: 'month'
      },
      {
        name: 'FixMy.Stability', 
        description: 'For growing businesses that want insight + performance with peace of mind.',
        price: 9900, // £99.00 in pence
        currency: 'gbp',
        interval: 'month'
      },
      {
        name: 'FixMy.Security',
        description: 'For high-traffic, high-revenue websites that can\'t afford downtime or bugs.',
        price: 19900, // £199.00 in pence
        currency: 'gbp',
        interval: 'month'
      }
    ];

    for (const tier of tiers) {
      console.log(`Creating product: ${tier.name}`);
      
      // Create the product
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
      });

      // Create the price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: tier.currency,
        recurring: {
          interval: tier.interval,
        },
      });

      console.log(`✅ Created ${tier.name}:`);
      console.log(`   Product ID: ${product.id}`);
      console.log(`   Price ID: ${price.id}`);
      console.log(`   Price: £${(tier.price / 100).toFixed(2)}/${tier.interval}\n`);
    }

    console.log('🎉 Stripe products and prices created successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy the Price IDs above and update them in src/Pages/Pricing.jsx');
    console.log('2. Set up a webhook endpoint in your Stripe dashboard');
    console.log('3. Copy the webhook secret and update STRIPE_WEBHOOK_SECRET in .env');
    console.log('\nWebhook endpoint URL: https://your-domain.com/webhook/stripe');
    console.log('Webhook events to listen for: checkout.session.completed');

  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

// Run the setup
setupStripeProducts();
