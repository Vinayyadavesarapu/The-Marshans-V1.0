/**
 * Checkout with Velocity serviceability bypassed: a valid 6-digit PIN goes straight to
 * order creation -> /payments/create -> Razorpay Checkout, with no /orders/serviceability request.
 *
 * Runs the REAL CheckoutForm.jsx (bundled with esbuild) on a minimal hook runtime instead of React,
 * so the actual submit handler, payload builder, order API and payment API code paths execute.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

// --- Minimal React stand-in: useState/useEffect + JSX as plain objects -------------------------------
const REACT_STUB = `
  const rt = () => globalThis.__miniReact;
  export function useState(init) { return rt().useState(init); }
  export function useEffect(fn) { return rt().useEffect(fn); }
  export default { useState, useEffect };
`;
const JSX_STUB = `
  export function jsx(type, props) { return { type, props: props || {} }; }
  export const jsxs = jsx;
  export const Fragment = 'Fragment';
`;
const reactStubPlugin = {
  name: 'mini-react',
  setup(b) {
    b.onResolve({ filter: /^react(\/jsx-runtime|\/jsx-dev-runtime)?$/ }, (args) => ({ path: args.path, namespace: 'mini-react' }));
    b.onLoad({ filter: /.*/, namespace: 'mini-react' }, (args) => ({
      contents: args.path === 'react' ? REACT_STUB : JSX_STUB,
      loader: 'js'
    }));
  }
};

function mount(Component) {
  const slots = [];
  const effects = [];
  let index = 0;
  let mounted = false;
  globalThis.__miniReact = {
    useState(init) {
      const i = index++;
      if (!(i in slots)) slots[i] = typeof init === 'function' ? init() : init;
      const set = (v) => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; };
      return [slots[i], set];
    },
    useEffect(fn) { if (!mounted) effects.push(fn); }
  };
  const render = () => { index = 0; return Component(); };
  render();
  mounted = true;
  effects.forEach((fn) => fn());
  return { render };
}

function find(node, pred) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const hit = find(child, pred); if (hit) return hit; }
    return null;
  }
  if (node.type && pred(node)) return node;
  return node.props ? find(node.props.children, pred) : null;
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return node.props ? textOf(node.props.children) : '';
}
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0)); };

// --- Scenario -------------------------------------------------------------------------------------------
async function runCheckout({ pin, paymentMethod = 'upi' }) {
  const { win } = installBrowser();
  win.localStorage.setItem('marshans_cart_cache_v1', JSON.stringify([
    { id: '1', productId: 3, name: 'TEST-1', slug: 'test-1', sku: 'SU-FT-003-S', price: 6000, quantity: 1, imageUrl: '/uploads/p.webp' }
  ]));
  win.location.href = 'https://themarshans.shop/checkout';

  const razorpay = { instances: [] };
  win.Razorpay = class {
    constructor(options) { this.options = options; this.opened = false; razorpay.instances.push(this); }
    on() {}
    open() { this.opened = true; }
  };

  const calls = installFetch((url) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/api/settings')) return { body: { success: true, data: { settings: { store_id: 2, shipping_fee: 5000 } } } };
    if (u.pathname.endsWith('/api/orders')) return { body: { success: true, data: { id: 77, order_number: 'MRS-77' } } };
    if (u.pathname.endsWith('/api/payments/create')) {
      return { body: { success: true, data: { key_id: 'rzp_test_dummy', gateway_order_id: 'order_G1', amount: 605000, currency: 'INR', order_id: 77 } } };
    }
    return { status: 404, body: { success: false, error: { message: `unexpected ${u.pathname}` } } };
  });

  const { default: CheckoutForm } = await loadModule('src/components/react/CheckoutForm.jsx', { plugins: [reactStubPlugin] });
  const app = mount(CheckoutForm);
  await settle();

  const fields = { email: 'a@b.co', phone: '9876543210', fullName: 'Test Buyer', addressLine1: '1 Main Road', city: 'Guntur', state: 'Andhra Pradesh', postalCode: pin };
  for (const [name, value] of Object.entries(fields)) {
    const input = find(app.render(), (n) => n.type === 'input' && n.props.name === name);
    assert.ok(input, `input ${name} rendered`);
    input.props.onChange({ target: { name, value } });
  }
  if (paymentMethod !== 'upi') {
    const radio = find(app.render(), (n) => n.type === 'input' && n.props.value === paymentMethod);
    radio.props.onChange();
  }
  const callsBeforeSubmit = calls.length;

  const form = find(app.render(), (n) => n.type === 'form' && typeof n.props.onSubmit === 'function');
  await form.props.onSubmit({ preventDefault() {} });
  await settle();

  return { calls, callsBeforeSubmit, razorpay, tree: app.render(), win };
}

const paths = (calls) => calls.map((c) => `${c.method} ${new URL(c.url).pathname}`);

test('valid 6-digit PIN proceeds directly to order creation and Razorpay — no serviceability call', async () => {
  const { calls, callsBeforeSubmit, razorpay } = await runCheckout({ pin: '521456' });
  const p = paths(calls);

  assert.ok(!p.some((x) => x.includes('/serviceability')), `no serviceability request; got ${p.join(', ')}`);
  assert.equal(calls.slice(0, callsBeforeSubmit).some((c) => c.method === 'POST'), false, 'entering the PIN triggers no request');

  const orderIdx = p.indexOf('POST /api/orders');
  const payIdx = p.indexOf('POST /api/payments/create');
  assert.ok(orderIdx >= 0 && payIdx > orderIdx, `order created, then payment order requested; got ${p.join(', ')}`);

  const orderCall = calls[orderIdx];
  assert.equal(JSON.parse(orderCall.body).shipping_address.pincode, '521456');
  assert.equal(orderCall.headers['x-store-id'], '2');
  assert.deepEqual(JSON.parse(calls[payIdx].body), { order_id: 77 });

  assert.equal(razorpay.instances.length, 1, 'Razorpay Checkout constructed');
  const rzp = razorpay.instances[0];
  assert.equal(rzp.opened, true, 'Razorpay Checkout opened');
  assert.equal(rzp.options.order_id, 'order_G1', 'uses backend gateway order');
  assert.equal(rzp.options.amount, 605000, 'uses backend authoritative amount');
  assert.equal(rzp.options.key, 'rzp_test_dummy');
  assert.equal(typeof rzp.options.handler, 'function', 'existing verification handler is wired');
});

test('valid PIN with Cash on Delivery places the order directly — no serviceability call', async () => {
  const { calls, razorpay, win } = await runCheckout({ pin: '521456', paymentMethod: 'cod' });
  const p = paths(calls);
  assert.ok(!p.some((x) => x.includes('/serviceability')));
  assert.ok(p.includes('POST /api/orders'));
  assert.ok(!p.includes('POST /api/payments/create'), 'COD does not create a Razorpay order');
  assert.equal(razorpay.instances.length, 0);
  assert.match(win.location.href, /\/order-confirmation\?orderNumber=MRS-77/);
});

test('invalid PIN is still rejected before any order, payment or serviceability request', async () => {
  for (const pin of ['52145', '']) {
    const { calls, razorpay, tree } = await runCheckout({ pin });
    const p = paths(calls);
    assert.ok(!p.some((x) => x.includes('/serviceability')), pin);
    assert.ok(!p.includes('POST /api/orders'), `no order for PIN "${pin}"`);
    assert.ok(!p.includes('POST /api/payments/create'));
    assert.equal(razorpay.instances.length, 0);
    assert.match(textOf(tree), /Please enter a valid 6-digit PIN code\./);
  }
});
