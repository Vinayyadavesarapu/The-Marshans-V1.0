import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser } from './helpers/load.mjs';

test('1. Shipping policy and calculation consume backend values without hardcoding', async () => {
  installBrowser();
  const { calculateShipping } = await loadModule('src/lib/api/shipping.ts');

  // Case A: Store 2 live backend policy (standardFee: 50, freeShippingEnabled: false)
  const store2Policy = {
    storeId: 2,
    standardFee: 50,
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
    source: 'api'
  };

  const calc1 = calculateShipping(500, store2Policy);
  assert.equal(calc1.subtotal, 500);
  assert.equal(calc1.shipping, 50, 'Shipping must match backend standard fee');
  assert.equal(calc1.total, 550, 'Total must equal subtotal + backend shipping');
  assert.equal(calc1.isFreeShipping, false, 'Must not claim free shipping when backend disabled it');

  const calcLarge = calculateShipping(50000, store2Policy);
  assert.equal(calcLarge.shipping, 50, 'Store 2 does not grant free shipping even for large orders unless backend enables it');
  assert.equal(calcLarge.total, 50050);

  // Case B: Backend policy with free shipping = 0 (Free delivery)
  const freePolicy = {
    storeId: 2,
    standardFee: 0,
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
    source: 'api'
  };
  const calcFree = calculateShipping(1000, freePolicy);
  assert.equal(calcFree.shipping, 0);
  assert.equal(calcFree.total, 1000);
  assert.equal(calcFree.isFreeShipping, true);

  // Case C: Backend policy with conditional threshold
  const thresholdPolicy = {
    storeId: 2,
    standardFee: 80,
    freeShippingEnabled: true,
    freeShippingThreshold: 2000,
    source: 'api'
  };

  const underThreshold = calculateShipping(1500, thresholdPolicy);
  assert.equal(underThreshold.shipping, 80);
  assert.equal(underThreshold.total, 1580);
  assert.equal(underThreshold.isFreeShipping, false);
  assert.equal(underThreshold.amountNeededForFreeShipping, 500);
  assert.equal(underThreshold.progressPercent, 75);

  const meetsThreshold = calculateShipping(2500, thresholdPolicy);
  assert.equal(meetsThreshold.shipping, 0);
  assert.equal(meetsThreshold.total, 2500);
  assert.equal(meetsThreshold.isFreeShipping, true);
  assert.equal(meetsThreshold.amountNeededForFreeShipping, 0);
  assert.equal(meetsThreshold.progressPercent, 100);
});

test('2. getCartSummary in cart.ts matches calculateShipping single source of truth', async () => {
  installBrowser();
  const { getCartSummary } = await loadModule('src/lib/api/cart.ts');

  const policy = {
    storeId: 2,
    standardFee: 50,
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
    source: 'api'
  };

  const items = [
    { id: '1', productId: 101, name: 'Statue A', slug: 'statue-a', sku: 'A', price: 600, quantity: 2, imageUrl: '/img.webp' }
  ];

  const summary = getCartSummary(items, policy);
  assert.equal(summary.subtotal, 1200);
  assert.equal(summary.shipping, 50);
  assert.equal(summary.total, 1250);
  assert.equal(summary.isFreeShipping, false);
});

test('3. CheckoutForm has "Zero Gateway Fee" completely removed', () => {
  const checkoutPath = resolve('src/components/react/CheckoutForm.jsx');
  const content = readFileSync(checkoutPath, 'utf8');

  // Verify "Zero Gateway Fee" is completely absent
  assert.equal(content.includes('Zero Gateway Fee'), false, '"Zero Gateway Fee" must be removed completely');
  assert.equal(content.includes('zero gateway fee'), false, 'Case-insensitive "zero gateway fee" must be absent');
  assert.equal(content.includes('Zero Gateway'), false, 'Any variant of Zero Gateway must be absent');

  // Verify Instant UPI label is preserved cleanly
  assert.match(content, /<strong>\s*Instant UPI\s*<\/strong>/, 'Instant UPI label must be present without fee claim');
  assert.equal(content.includes('Google Pay, PhonePe, Paytm, BHIM'), true, 'UPI provider description must be preserved');
});

test('4. Standard Air Delivery is consistently labeled and computed across Shopping Bag and Checkout', () => {
  const cartViewPath = resolve('src/components/react/CartView.jsx');
  const cartContent = readFileSync(cartViewPath, 'utf8');

  const checkoutPath = resolve('src/components/react/CheckoutForm.jsx');
  const checkoutContent = readFileSync(checkoutPath, 'utf8');

  // Both use "Standard Air Delivery"
  assert.equal(cartContent.includes('Standard Air Delivery'), true, 'CartView must use "Standard Air Delivery"');
  assert.equal(checkoutContent.includes('Standard Air Delivery'), true, 'CheckoutForm must use "Standard Air Delivery"');

  // Checkout no longer uses legacy "Air Express Delivery"
  assert.equal(checkoutContent.includes('Air Express Delivery'), false, 'Legacy "Air Express Delivery" should be replaced by "Standard Air Delivery"');

  // Both consume dynamic shippingPolicy from API
  assert.match(cartContent, /getShippingPolicy/, 'CartView must fetch getShippingPolicy');
  assert.match(checkoutContent, /getShippingPolicy/, 'CheckoutForm must fetch getShippingPolicy');

  // CartView does NOT unconditionally hardcode free shipping unlocked
  assert.match(cartContent, /shippingPolicy\.freeShippingEnabled && shippingPolicy\.freeShippingThreshold > 0/, 'CartView progress bar must be guarded by backend policy');
});
