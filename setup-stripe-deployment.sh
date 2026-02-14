#!/bin/bash

# QuranChain-OS Stripe Integration Setup and Deployment Script
# This script handles Stripe configuration and deployment

set -e

echo "💳 Setting up QuranChain-OS Stripe Integration"

# Check if required Stripe environment variables are set
required_vars=("STRIPE_SECRET_KEY" "STRIPE_PUBLISHABLE_KEY" "STRIPE_WEBHOOK_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var environment variable is not set"
        echo "Please set your Stripe environment variables:"
        echo "export STRIPE_SECRET_KEY='sk_test_...'"
        echo "export STRIPE_PUBLISHABLE_KEY='pk_test_...'"
        echo "export STRIPE_WEBHOOK_SECRET='whsec_...'"
        exit 1
    fi
done

echo "✅ Stripe environment variables validated"

# Install dependencies
echo "📦 Installing server dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Set up Stripe products and prices
echo "🛍️  Setting up Stripe products and prices..."
npm run setup-stripe

# Run tests
echo "🧪 Running Stripe integration tests..."
npm test -- --testPathPattern=stripe

# Build client
echo "🎨 Building client application..."
cd client
npm run build
cd ..

# Build server (if needed)
echo "🔨 Building server application..."
npm run build

# Create webhook endpoint configuration
echo "🔗 Configuring Stripe webhooks..."
echo "Please ensure the following webhook endpoints are configured in your Stripe Dashboard:"
echo "https://yourdomain.com/api/subscriptions/webhook"
echo ""
echo "Required events:"
echo "- customer.subscription.created"
echo "- customer.subscription.updated"
echo "- customer.subscription.deleted"
echo "- customer.subscription.trial_will_end"
echo "- invoice.created"
echo "- invoice.finalized"
echo "- invoice.payment_succeeded"
echo "- invoice.payment_failed"
echo "- invoice.payment_action_required"
echo "- payment_intent.succeeded"
echo "- payment_intent.payment_failed"
echo "- payment_intent.canceled"
echo "- charge.dispute.created"
echo "- customer.created"
echo "- customer.updated"
echo "- customer.deleted"

# Start the application
if [ "$NODE_ENV" = "production" ]; then
    echo "🌐 Starting production server..."
    npm start
else
    echo "🧪 Starting development server..."
    npm run dev
fi

echo ""
echo "✅ Stripe integration setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure webhook endpoints in Stripe Dashboard"
echo "2. Test subscription creation and payment flows"
echo "3. Set up monitoring for failed payments and disputes"
echo "4. Configure customer portal settings in Stripe"
echo ""
echo "🔗 Useful links:"
echo "- Stripe Dashboard: https://dashboard.stripe.com/"
echo "- Stripe Webhooks: https://dashboard.stripe.com/webhooks"
echo "- Customer Portal: https://dashboard.stripe.com/customer_portal"
echo "- Application: http://localhost:3000"
echo ""
echo "💡 Pro tips:"
echo "- Enable SCA (Strong Customer Authentication) for EU compliance"
echo "- Set up webhook signature verification for security"
echo "- Monitor payment failures and implement retry logic"
echo "- Use Stripe's test mode for development and testing"