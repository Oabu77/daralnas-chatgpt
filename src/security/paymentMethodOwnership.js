function normalizeStripeCustomerId(customer) {
  if (typeof customer === 'string' && customer) return customer;
  if (customer && typeof customer === 'object' && typeof customer.id === 'string' && customer.id) {
    return customer.id;
  }
  return null;
}

function paymentMethodBelongsToCustomer(paymentMethod, expectedCustomerId) {
  if (!paymentMethod || typeof expectedCustomerId !== 'string' || !expectedCustomerId) {
    return false;
  }
  return normalizeStripeCustomerId(paymentMethod.customer) === expectedCustomerId;
}

module.exports = {
  normalizeStripeCustomerId,
  paymentMethodBelongsToCustomer,
};
