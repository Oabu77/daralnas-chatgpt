/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

function PaymentHistory() {
  const [paymentHistory, setPaymentHistory] = useState({ paymentIntents: [], subscriptions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get('/api/subscriptions/customer/payment-history');
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading payment history...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Payment History</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Subscriptions</h2>
        {paymentHistory.subscriptions.length === 0 ? (
          <p className="text-gray-600">No subscription history found.</p>
        ) : (
          <div className="space-y-4">
            {paymentHistory.subscriptions.map(subscription => (
              <div key={subscription.id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Subscription #{subscription.id}</p>
                    <p className="text-sm text-gray-600">
                      Status: <span className={`font-medium ${
                        subscription.status === 'active' ? 'text-green-600' :
                        subscription.status === 'canceled' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>{subscription.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(subscription.created * 1000).toLocaleDateString()}
                    </p>
                    {subscription.current_period_end && (
                      <p className="text-sm text-gray-600">
                        Current Period End: {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(subscription.items.data[0]?.price?.unit_amount || 0) / 100}
                      {subscription.items.data[0]?.price?.recurring?.interval && `/${subscription.items.data[0].price.recurring.interval}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">One-time Payments</h2>
        {paymentHistory.paymentIntents.length === 0 ? (
          <p className="text-gray-600">No payment history found.</p>
        ) : (
          <div className="space-y-4">
            {paymentHistory.paymentIntents.map(payment => (
              <div key={payment.id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Payment #{payment.id}</p>
                    <p className="text-sm text-gray-600">
                      Status: <span className={`font-medium ${
                        payment.status === 'succeeded' ? 'text-green-600' :
                        payment.status === 'failed' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>{payment.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(payment.created * 1000).toLocaleDateString()}
                    </p>
                    {payment.description && (
                      <p className="text-sm text-gray-600">Description: {payment.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(payment.amount || 0) / 100}</p>
                    <p className="text-sm text-gray-600">{payment.currency.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentHistory;