require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeIntegration() {
  try {
    console.log('Testing Stripe integration...\n');

    // Test 1: Check if Stripe is properly configured
    console.log('1. Testing Stripe configuration...');
    console.log('STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length || 0);
    console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 10) || 'undefined');
    console.log('STRIPE_SECRET_KEY full:', process.env.STRIPE_SECRET_KEY);
    console.log('STRIPE_SECRET_KEY ends with:', process.env.STRIPE_SECRET_KEY?.slice(-10));
    console.log('STRIPE_SECRET_KEY has newlines:', process.env.STRIPE_SECRET_KEY?.includes('\n'));
    console.log('STRIPE_SECRET_KEY has spaces:', process.env.STRIPE_SECRET_KEY?.includes(' '));
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new Error('STRIPE_PUBLISHABLE_KEY not found in environment variables');
    }
    console.log('✅ Stripe keys are configured');

    // Test 2: Test Stripe API connection
    console.log('\n2. Testing Stripe API connection...');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.business_profile?.name || account.id}`);

    // Test 3: List existing products and prices
    console.log('\n3. Checking existing products and prices...');
    const products = await stripe.products.list({ limit: 10 });
    const prices = await stripe.prices.list({ limit: 10 });

    console.log(`Found ${products.data.length} products:`);
    products.data.forEach(product => {
      console.log(`   - ${product.name} (${product.id})`);
    });

    console.log(`\nFound ${prices.data.length} prices:`);
    prices.data.forEach(price => {
      if (price.recurring) {
        console.log(`   - ${price.unit_amount / 100} ${price.currency.toUpperCase()}/${price.recurring.interval} (${price.id})`);
      }
    });

    // Test 4: Test webhook secret configuration
    console.log('\n4. Testing webhook configuration...');
    if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === 'whsec_your_webhook_secret_here') {
      console.log('⚠️  STRIPE_WEBHOOK_SECRET not configured or using placeholder value');
      console.log('   You need to set up a webhook in your Stripe dashboard and update the secret');
    } else {
      console.log('✅ Webhook secret is configured');
    }

    // Test 5: Test customer creation (dry run)
    console.log('\n5. Testing customer creation capability...');
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      metadata: { test: 'true' }
    });
    console.log(`✅ Successfully created test customer: ${testCustomer.id}`);

    // Clean up test customer
    await stripe.customers.del(testCustomer.id);
    console.log('✅ Test customer cleaned up');

    console.log('\n🎉 All Stripe tests passed!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run setup:stripe" to create products and prices');
    console.log('2. Update the price IDs in src/Pages/Pricing.jsx');
    console.log('3. Set up webhook endpoint in Stripe dashboard');
    console.log('4. Update STRIPE_WEBHOOK_SECRET in .env');

  } catch (error) {
    console.error('❌ Stripe test failed:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('   This usually means your STRIPE_SECRET_KEY is invalid');
    } else if (error.type === 'StripePermissionError') {
      console.log('   This usually means your Stripe account doesn\'t have the required permissions');
    }
  }
}

// Run the test
testStripeIntegration();
