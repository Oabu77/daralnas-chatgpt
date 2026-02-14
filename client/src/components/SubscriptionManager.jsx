import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function SubscriptionForm({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsProcessing(false);
    } else {
      setMessage('Payment succeeded!');
      onSuccess && onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Subscribe'}
      </button>
      {message && <div className="text-red-500">{message}</div>}
    </form>
  );
}

function SubscriptionManager() {
  const [products, setProducts] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchSubscription();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/subscriptions/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await axios.get('/api/subscriptions/subscription');
      setSubscription(response.data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId) => {
    try {
      const response = await axios.post('/api/subscriptions/subscription', {
        priceId,
      });
      setClientSecret(response.data.clientSecret);
      setSelectedProduct(products.find(p => p.prices.some(price => price.id === priceId)));
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await axios.post('/api/subscriptions/subscription/resume');
      await fetchSubscription();
      alert('Subscription resumed successfully!');
    } catch (error) {
      console.error('Error resuming subscription:', error);
      alert('Failed to resume subscription. Please try again.');
    }
  };

  const handleChangePlan = async (newPriceId) => {
    if (!window.confirm('Are you sure you want to change your subscription plan?')) {
      return;
    }

    try {
      await axios.post('/api/subscriptions/subscription/change-plan', { newPriceId });
      await fetchSubscription();
      alert('Subscription plan changed successfully!');
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Failed to change subscription plan. Please try again.');
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await axios.post('/api/subscriptions/customer-portal');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error accessing customer portal:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (clientSecret) {
    const options = {
      clientSecret,
      appearance: {
        theme: 'stripe',
      },
    };

    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl mb-4">Complete Your Subscription</h2>
        <p className="mb-4">
          Subscribing to: <strong>{selectedProduct?.name}</strong>
        </p>
        <Elements stripe={stripePromise} options={options}>
          <SubscriptionForm onSuccess={() => {
            setClientSecret('');
            fetchSubscription();
          }} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

      {subscription ? (
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
          <p><strong>Status:</strong> {subscription.status}</p>
          <p><strong>Current Period End:</strong> {new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
          <div className="mt-4 space-x-4">
            <button
              onClick={handleManageBilling}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
            >
              Manage Billing
            </button>
            {subscription.cancel_at_period_end ? (
              <button
                onClick={handleResumeSubscription}
                className="bg-green-500 text-white px-4 py-2 rounded mr-2"
              >
                Resume Subscription
              </button>
            ) : (
              <button
                onClick={handleCancelSubscription}
                className="bg-red-500 text-white px-4 py-2 rounded mr-2"
              >
                Cancel Subscription
              </button>
            )}
            <a
              href="/payment-history"
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              View Payment History
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">No Active Subscription</h2>
          <p>Choose a plan to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
            <p className="text-gray-600 mb-4">{product.description}</p>
            {product.prices.map(price => (
              <div key={price.id} className="mb-4">
                <p className="text-2xl font-bold">
                  ${price.amount}
                  {price.interval && `/${price.interval}`}
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => handleSubscribe(price.id)}
                    className="bg-green-500 text-white py-2 px-4 rounded mt-2"
                  >
                    Subscribe
                  </button>
                  {subscription && subscription.items?.data[0]?.price?.id !== price.id && (
                    <button
                      onClick={() => handleChangePlan(price.id)}
                      className="bg-blue-500 text-white py-2 px-4 rounded mt-2"
                    >
                      Change to this Plan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscriptionManager;