const {
  normalizeStripeCustomerId,
  paymentMethodBelongsToCustomer,
} = require('../src/security/paymentMethodOwnership');

describe('Stripe payment method ownership boundary', () => {
  test('normalizes Stripe customer IDs without exposing object contents', () => {
    expect(normalizeStripeCustomerId('cus_owner')).toBe('cus_owner');
    expect(normalizeStripeCustomerId({ id: 'cus_expanded' })).toBe('cus_expanded');
    expect(normalizeStripeCustomerId(null)).toBeNull();
    expect(normalizeStripeCustomerId({})).toBeNull();
  });

  test('rejects a payment method owned by another customer', () => {
    expect(
      paymentMethodBelongsToCustomer(
        { id: 'pm_foreign', customer: 'cus_other' },
        'cus_owner',
      ),
    ).toBe(false);
  });

  test('rejects an unattached payment method', () => {
    expect(
      paymentMethodBelongsToCustomer(
        { id: 'pm_unattached', customer: null },
        'cus_owner',
      ),
    ).toBe(false);
  });

  test('accepts only the authenticated customer relationship', () => {
    expect(
      paymentMethodBelongsToCustomer(
        { id: 'pm_owned', customer: 'cus_owner' },
        'cus_owner',
      ),
    ).toBe(true);
    expect(
      paymentMethodBelongsToCustomer(
        { id: 'pm_owned_expanded', customer: { id: 'cus_owner' } },
        'cus_owner',
      ),
    ).toBe(true);
  });
});
