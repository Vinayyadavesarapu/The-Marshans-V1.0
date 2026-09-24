/**
 * Checkout: CheckoutForm must send the payload the EXISTING backend contract (POST /orders ->
 * createCustomerOrder) accepts. Before the fix it sent shippingAddress/line1/postal_code/top-level phone/
 * items[].productId, so the backend answered 400 "Valid delivery address is required." and no order could be placed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, installBrowser, installFetch, ROOT } from './helpers/load.mjs';

const FORM = { email: 'a@x.com', phone: '+91 98765 43210', fullName: '  A B ', addressLine1: ' 12 Street Road ', addressLine2: 'Flat 4', city: 'Pune', state: 'Maharashtra', postalCode: ' 411001 ' };
// CartItem shape produced by src/lib/api/cart.ts (includes display-only price/name that must NOT be sent).
const CART = [
  { id: '9', productId: 5, marshansProductId: 5, name: 'Lumo Orb', slug: 'lumo', sku: 'L1', price: 1299, quantity: 2, imageUrl: '/x.png', material: 'PLA', finishing: 'Matte', options: { material: 'PLA' } },
  { id: '10', productId: 7, name: 'Fandom Statue', slug: 'f', sku: 'F1', price: 4999, quantity: 1, imageUrl: '/y.png' }
];

/** Mirrors the validation createCustomerOrder applies (server/services/orderService.js) -- returns an error or null. */
function backendContractError(p) {
  if (!Array.isArray(p.items) || p.items.length === 0) return 'Order must contain at least one item.';
  const sa = p.shipping_address;
  if (!sa || typeof sa !== 'object') return 'Valid delivery address is required.';
  if (typeof sa.name !== 'string' || sa.name.trim().length < 2) return 'Recipient name is required.';
  const digits = String(sa.phone || '').replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^\d{10}$/.test(digits)) return 'Valid 10-digit mobile phone number is required.';
  if (typeof sa.address !== 'string' || sa.address.trim().length < 5) return 'Complete street address is required.';
  if (typeof sa.city !== 'string' || sa.city.trim().length < 2) return 'City is required.';
  if (typeof sa.state !== 'string' || sa.state.trim().length < 2) return 'State is required.';
  if (!/^\d{6}$/.test(String(sa.pincode || '').trim())) return 'Valid 6-digit postal PIN code is required.';
  for (const it of p.items) {
    // backend: isCustomItem = it.is_custom || (!it.product_id && (it.name || it.product_name)) -> rejected for store 2
    if (it.is_custom || (!it.product_id && (it.name || it.product_name))) return 'Custom stickers are only available for CHIPAKK (Store 1).';
    if (Number.isNaN(parseInt(it.product_id || it.id, 10))) return 'Invalid product ID in order items.';
    if (!Number.isInteger(it.quantity) || it.quantity < 1) return 'Item quantity must be an integer.';
  }
  return null;
}

test('the OLD payload shape is rejected by the contract check (proves the check reproduces the production failure)', () => {
  const old = { store_id: 2, email: 'a@x.com', phone: '9876543210', total: 3, totalAmount: 3,
    shippingAddress: { name: 'A B', line1: '12 Street Road', city: 'Pune', state: 'MH', postal_code: '411001', country: 'India' },
    payment_method: 'upi', items: [{ productId: 5, name: 'Lumo', price: 1, quantity: 1 }] };
  assert.equal(backendContractError(old), 'Valid delivery address is required.');
});

test('buildOrderPayload output satisfies the backend contract', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  const payload = buildOrderPayload(FORM, CART, 'upi');
  assert.equal(backendContractError(payload), null);
  assert.deepEqual(payload.shipping_address, {
    name: 'A B', phone: '+91 98765 43210', address: '12 Street Road, Flat 4', city: 'Pune', state: 'Maharashtra',
    pincode: '411001', country: 'India', email: 'a@x.com'
  });
});

test('items use product_id (cart marshansProductId first, productId otherwise) and integer quantity', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  const payload = buildOrderPayload(FORM, CART, 'cod');
  assert.deepEqual(payload.items, [{ product_id: 5, quantity: 2 }, { product_id: 7, quantity: 1 }]);
});

test('Store ID stays 2', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  assert.equal(buildOrderPayload(FORM, CART, 'upi').store_id, 2);
});

test('no client-controlled pricing: no prices, totals, names or images are sent -- the backend recomputes everything', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  const json = JSON.stringify(buildOrderPayload(FORM, CART, 'upi'));
  for (const k of ['"price"', '"total"', '"totalAmount"', '"subtotal"', '"unit_price"', '"name":"Lumo', '"imageUrl"', '"tax"', '"shipping_charge"']) {
    assert.ok(!json.includes(k), `payload must not contain ${k}`);
  }
  for (const it of buildOrderPayload(FORM, CART, 'upi').items) assert.deepEqual(Object.keys(it).sort(), ['product_id', 'quantity']);
});

test('none of the incompatible legacy key names are produced', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  const p = buildOrderPayload(FORM, CART, 'upi');
  assert.ok(!('shippingAddress' in p) && !('phone' in p) && !('email' in p));
  assert.ok(!('line1' in p.shipping_address) && !('postal_code' in p.shipping_address));
  assert.ok(p.items.every((i) => !('productId' in i)));
});

test('payment_method is passed through (backend upper-cases and validates it)', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  for (const m of ['upi', 'card', 'cod']) assert.equal(buildOrderPayload(FORM, CART, m).payment_method, m);
});

test('address line 2 is optional', async () => {
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  assert.equal(buildOrderPayload({ ...FORM, addressLine2: '' }, CART, 'upi').shipping_address.address, '12 Street Road');
});

test('an invalid cart item or an empty bag is refused before any request (clear message, no crash)', async () => {
  const { buildOrderPayload, CheckoutPayloadError } = await loadModule('src/lib/api/checkoutPayload.ts');
  assert.throws(() => buildOrderPayload(FORM, [{ ...CART[0], productId: NaN, marshansProductId: undefined }], 'upi'), CheckoutPayloadError);
  assert.throws(() => buildOrderPayload(FORM, [{ ...CART[0], quantity: 0 }], 'upi'), CheckoutPayloadError);
  assert.throws(() => buildOrderPayload(FORM, [], 'upi'), /empty/);
});

test('createOrder POSTs the payload to /orders with token + Store 2 headers and returns the backend order number', async () => {
  installBrowser();
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');
  const orders = await loadModule('src/lib/api/orders.ts');
  const calls = installFetch(() => ({ status: 201, body: { success: true, message: 'Order placed successfully', data: { id: 88, order_number: 'MAR-88' } } }));
  const res = await orders.createOrder(buildOrderPayload(FORM, CART, 'upi'));
  assert.deepEqual([res.success, res.orderNumber, res.orderId], [true, 'MAR-88', 88]);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/orders$/);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers['authorization'], 'Bearer tokA');
  assert.equal(calls[0].headers['x-store-id'], '2');
  const sent = JSON.parse(calls[0].body);
  assert.equal(backendContractError(sent), null);
  assert.equal(sent.store_id, 2);
});

test('checkout errors surface as readable STRINGS (the backend sends error:{message}; rendering the object crashes React)', async () => {
  installBrowser();
  const orders = await loadModule('src/lib/api/orders.ts');
  installFetch(() => ({ status: 400, body: { success: false, error: { message: 'Valid 6-digit postal PIN code is required.', statusCode: 400 } } }));
  const res = await orders.createOrder({});
  assert.equal(res.success, false);
  assert.equal(typeof res.error, 'string');
  assert.equal(res.error, 'Valid 6-digit postal PIN code is required.');
  installFetch(() => ({ status: 500, body: null }));
  const res2 = await orders.createOrder({});
  assert.equal(typeof res2.error, 'string');
  assert.match(res2.error, /500/);
});

test('CheckoutForm.jsx uses the contract builder and no longer hand-builds the legacy payload', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/react/CheckoutForm.jsx'), 'utf8');
  assert.ok(src.includes('buildOrderPayload('));
  for (const legacy of ['shippingAddress', 'postal_code', 'productId:', 'totalAmount', 'line1:']) {
    assert.ok(!src.includes(legacy), `CheckoutForm.jsx must not contain legacy payload key ${legacy}`);
  }
});
