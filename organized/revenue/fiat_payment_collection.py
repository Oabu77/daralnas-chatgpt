import os
import stripe
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set Stripe API key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def collect_ach_payment(account_number, routing_number, account_holder_name, amount, currency='usd'):
    """
    Collect ACH payment using Stripe.
    Note: In production, handle customer acceptance and verification properly.
    """
    try:
        # Create payment method
        payment_method = stripe.PaymentMethod.create(
            type='us_bank_account',
            us_bank_account={
                'account_holder_type': 'individual',  # or 'company'
                'account_number': account_number,
                'routing_number': routing_number,
            },
            billing_details={
                'name': account_holder_name,
            },
        )

        # Create customer
        customer = stripe.Customer.create(
            name=account_holder_name,
            payment_method=payment_method.id,
        )

        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(float(amount) * 100),  # Amount in cents
            currency=currency,
            payment_method_types=['us_bank_account'],
            payment_method=payment_method.id,
            customer=customer.id,
            confirm=True,
            mandate_data={
                'customer_acceptance': {
                    'type': 'online',
                    'online': {
                        'ip_address': '127.0.0.1',  # Replace with actual IP
                        'user_agent': 'QuranChain-OS/1.0',  # Replace with actual user agent
                    },
                },
            },
        )

        return {
            'status': 'success',
            'payment_intent_id': payment_intent.id,
            'client_secret': payment_intent.client_secret,
            'status_detail': payment_intent.status
        }

    except stripe.error.StripeError as e:
        return {
            'status': 'error',
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) != 6:
        print('Usage: python fiat_payment_collection.py <account_number> <routing_number> <account_holder_name> <amount> <currency>')
        sys.exit(1)

    account_number = sys.argv[1]
    routing_number = sys.argv[2]
    account_holder_name = sys.argv[3]
    amount = sys.argv[4]
    currency = sys.argv[5]

    result = collect_ach_payment(account_number, routing_number, account_holder_name, amount, currency)
    print(result)