import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set Stripe API key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def create_stripe_products():
    """
    Create Stripe products for all QuranChain-OS revenue streams with correct pricing.
    """
    products = [
        {
            'name': 'QuranChain OS Core Subscription',
            'description': 'Access to QuranChain-OS platform with basic features',
            'price': 10000,  # $100/month in cents
            'currency': 'usd',
            'interval': 'month',
            'type': 'recurring'
        },
        {
            'name': 'AI Agent Service',
            'description': 'Per-agent subscription for autonomous AI workforce',
            'price': 5000,  # $50/month per agent
            'currency': 'usd',
            'interval': 'month',
            'type': 'recurring'
        },
        {
            'name': 'CRM System Access',
            'description': 'Customer relationship management with SQLite backend',
            'price': 2000,  # $20/month
            'currency': 'usd',
            'interval': 'month',
            'type': 'recurring'
        },
        {
            'name': 'Offline Gas Toll Service',
            'description': 'Automated gas toll payment processing',
            'price': 500,  # $5 per toll
            'currency': 'usd',
            'interval': None,  # One-time
            'type': 'one_time'
        },
        {
            'name': 'Network Provider Service',
            'description': 'Mobile network provider integration and billing',
            'price': 1000,  # $10/month per user
            'currency': 'usd',
            'interval': 'month',
            'type': 'recurring'
        },
        {
            'name': 'Fiat Payment Processing Fee',
            'description': 'ACH payment processing fee (2.9% + $0.30)',
            'price': None,  # Variable fee, handled separately
            'currency': 'usd',
            'interval': None,
            'type': 'fee'
        },
        {
            'name': 'Crypto Payment Processing',
            'description': 'Blockchain transaction processing with 1% fee',
            'price': None,  # Percentage-based, handled in code
            'currency': 'usd',
            'interval': None,
            'type': 'fee'
        }
    ]

    created_products = []

    for product_data in products:
        try:
            if product_data['type'] == 'fee':
                # For fees, just create product without price
                product = stripe.Product.create(
                    name=product_data['name'],
                    description=product_data['description']
                )
                created_products.append({
                    'product_id': product.id,
                    'name': product.name,
                    'type': 'fee'
                })
            else:
                # Create product
                product = stripe.Product.create(
                    name=product_data['name'],
                    description=product_data['description']
                )

                # Create price
                price_data = {
                    'product': product.id,
                    'unit_amount': product_data['price'],
                    'currency': product_data['currency']
                }

                if product_data['type'] == 'recurring':
                    price_data['recurring'] = {'interval': product_data['interval']}

                price = stripe.Price.create(**price_data)

                created_products.append({
                    'product_id': product.id,
                    'price_id': price.id,
                    'name': product.name,
                    'price': product_data['price'] / 100 if product_data['price'] else None,
                    'currency': product_data['currency'],
                    'interval': product_data['interval']
                })

        except stripe.error.StripeError as e:
            print(f"Error creating product {product_data['name']}: {e}")
            continue

    return created_products

if __name__ == '__main__':
    products = create_stripe_products()
    print("Created Stripe Products:")
    for p in products:
        print(f"- {p['name']}: {p}")