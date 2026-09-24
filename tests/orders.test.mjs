/**
 * My Orders: the client must call GET /orders (not the non-existent /orders/my-orders) and normalize the backend
 * shape `{ total, limit, offset, orders:[...] }` into what OrdersList.jsx / AccountDashboard.jsx read.
 * Runs the REAL src/lib/api/orders.ts + client.ts + orderMapper.ts (bundled), with a recording fetch.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, installBrowser, installFetch, ROOT } from './helpers/load.mjs';

// Backend-shaped fixtures (field names exactly as server/services/orderService.js getCustomerOrders returns them).
const backendOrder = (over = {}) => ({
  id: 101, order_number: 'MAR-101', customer_id: 1, store_id: 2,
  customer_name: 'A B', customer_email: 'a@x.com', customer_phone: '9876543210',
  shipping_address: { name: 'A B', phone: '9876543210', email: 'a@x.com', address: '12 Street Road, Flat 4', city: 'Pune', state: 'Maharashtra', pincode: '411001', country: 'India' },
  payment_method: 'UPI', payment_status: 'pending', fulfillment_status: 'READY_TO_SHIP',
  subtotal: 259800, discount_total: 0, shipping_charge: 0, total_price: 259800,
  subtotal_rupees: 2598, discount_total_rupees: 0, shipping_charge_rupees: 0, total_price_rupees: 2598,
  courier: null, tracking_no: null, created_at: '2026-09-01T10:00:00.000Z',
  items: [{ id: 1, order_id: 101, product_id: 5, marshans_product_id: 5, variant_id: null, product_name: 'Lumo Orb', sku: 'LUMO-1',
    variant_options: { material: 'PLA', finishing: 'Matte' }, unit_price: 129900, quantity: 2, total_price: 259800,
    img: '/uploads/lumo.png', unit_price_rupees: 1299, total_price_rupees: 2598 }],
  ...over
});
const envelope = (data) => ({ status: 200, body: { success: true, message: 'ok', data } });

async function withOrders() {
  installBrowser();
  const mod = await loadModule('src/lib/api/orders.ts');
  return mod;
}

test('getOrders calls GET /orders -- never /orders/my-orders', async () => {
  const mod = await withOrders();
  const calls = installFetch(() => envelope({ total: 0, limit: 20, offset: 0, orders: [] }));
  await mod.getOrders();
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/orders$/, `unexpected URL ${calls[0].url}`);
  assert.ok(!calls[0].url.includes('my-orders'));
  assert.equal(calls[0].method, 'GET');
});

test('the orders request is authenticated and scoped to Store 2 (headers the backend uses for store + owner)', async () => {
  const mod = await withOrders();
  const calls = installFetch(() => envelope({ orders: [] }));
  await mod.getOrders();
  assert.equal(calls[0].headers['authorization'], 'Bearer tokA');
  assert.equal(calls[0].headers['x-store-id'], '2');
  assert.equal(calls[0].headers['x-store-code'], 'marshans');
});

test('backend fields normalize to the UI shape: total, status, item price, items, address', async () => {
  const mod = await withOrders();
  installFetch(() => envelope({ total: 1, limit: 20, offset: 0, orders: [backendOrder()] }));
  const { orders } = await mod.getOrders();
  assert.equal(orders.length, 1);
  const o = orders[0];
  assert.equal(o.order_number, 'MAR-101');
  assert.equal(o.total_amount, 2598, 'total comes from total_price_rupees (NOT the paise column)');
  assert.equal(o.status, 'Ready To Ship', 'status comes from fulfillment_status, humanized');
  assert.equal(o.subtotal, 2598);
  assert.equal(o.shipping_amount, 0);
  assert.equal(o.items.length, 1);
  const it = o.items[0];
  assert.equal(it.name, 'Lumo Orb');
  assert.equal(it.quantity, 2);
  assert.equal(it.price, 1299, 'unit price comes from unit_price_rupees');
  assert.equal(it.total_price, 2598);
  assert.equal(it.image_url, '/uploads/lumo.png');
  assert.equal(it.material, 'PLA');
  assert.equal(it.finishing, 'Matte');
  assert.equal(o.shipping_address.city, 'Pune');
  assert.equal(o.shipping_address.postal_code, '411001');
  assert.equal(o.shipping_address.line1, '12 Street Road, Flat 4');
});

test('the exact expressions OrdersList.jsx renders produce real numbers, never NaN', async () => {
  const mod = await withOrders();
  installFetch(() => envelope({ orders: [backendOrder()] }));
  const { orders } = await mod.getOrders();
  const o = orders[0];
  assert.equal(`₹${Number(o.total_amount).toLocaleString('en-IN')}`, '₹2,598');
  assert.equal(`₹${Number(o.items[0].price * o.items[0].quantity).toLocaleString('en-IN')}`, '₹2,598');
  assert.equal(o.status || 'Print Queued', 'Ready To Ship');
});

test('no backend field is renamed: the mapper reads them, the API contract is untouched', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/api/orderMapper.ts'), 'utf8');
  for (const f of ['total_price', 'fulfillment_status', 'unit_price', 'shipping_charge', 'discount_total']) {
    assert.ok(src.includes(f), `mapper must read backend field ${f}`);
  }
});

test('falls back to raw columns with the backend store rule when *_rupees is missing (store 2 = paise)', async () => {
  const mod = await withOrders();
  const o = backendOrder();
  delete o.total_price_rupees; delete o.items[0].unit_price_rupees;
  installFetch(() => envelope({ orders: [o] }));
  const { orders } = await mod.getOrders();
  assert.equal(orders[0].total_amount, 2598);
  assert.equal(orders[0].items[0].price, 1299);
});

test('UI contract: every field OrdersList.jsx and AccountDashboard.jsx read exists on the normalized order/item', async () => {
  const mod = await withOrders();
  installFetch(() => envelope({ orders: [backendOrder()] }));
  const { orders } = await mod.getOrders();
  const o = orders[0];
  const read = (file, varName) => {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/react', file), 'utf8');
    return [...new Set([...src.matchAll(new RegExp(`\\b${varName}\\??\\.([a-z_]+)`, 'g'))].map((m) => m[1]))];
  };
  for (const file of ['OrdersList.jsx', 'AccountDashboard.jsx']) {
    for (const f of read(file, 'ord').concat(read(file, 'selectedOrder'))) {
      if (['map', 'length', 'slice'].includes(f)) continue;
      assert.ok(f in o, `${file} reads order.${f} but the normalized order has no such field`);
    }
  }
  for (const f of read('OrdersList.jsx', 'item')) assert.ok(f in o.items[0], `OrdersList.jsx reads item.${f} but it is missing`);
});

test('empty state: no orders -> [] (and total 0), not an error', async () => {
  const mod = await withOrders();
  installFetch(() => envelope({ total: 0, limit: 20, offset: 0, orders: [] }));
  const res = await mod.getOrders();
  assert.deepEqual(res.orders, []);
  assert.equal(res.total, 0);
});

test('failures degrade to an empty list instead of throwing (401, network error, malformed body)', async () => {
  const mod = await withOrders();
  installFetch(() => ({ status: 401, body: { success: false, error: { message: 'Authorization token missing or malformed', statusCode: 401 } } }));
  assert.deepEqual((await mod.getOrders()).orders, []);
  globalThis.fetch = async () => { throw new Error('network down'); };
  assert.deepEqual((await mod.getOrders()).orders, []);
  installFetch(() => ({ status: 200, body: { success: true, data: { orders: 'nope' } } }));
  assert.deepEqual((await mod.getOrders()).orders, []);
});

test('pagination: limit/offset are passed through and total/limit/offset come back; default is a bare /orders', async () => {
  const mod = await withOrders();
  const calls = installFetch(() => envelope({ total: 45, limit: 20, offset: 20, orders: [backendOrder()] }));
  const page = await mod.getOrders({ limit: 20, offset: 20 });
  assert.match(calls[0].url, /\/orders\?limit=20&offset=20$/);
  assert.deepEqual([page.total, page.limit, page.offset], [45, 20, 20]);
  assert.equal(mod.buildOrdersPath(), '/orders');
  assert.equal(mod.buildOrdersPath({ limit: -1, offset: 'x' }), '/orders', 'invalid values are dropped, not sent');
});

// ---- Store 2 isolation + ownership, as the client experiences them --------------------------------------------
// This fake mirrors the backend behavior verified against the real routers/services (GET /orders scopes by the
// token's user AND X-Store-ID; GET /orders/:id returns 404 unless the caller owns it in that store).
const DB = [
  backendOrder({ id: 101, order_number: 'MAR-101', customer_id: 1, store_id: 2 }),
  backendOrder({ id: 102, order_number: 'MAR-102', customer_id: 2, store_id: 2 }),
  backendOrder({ id: 201, order_number: 'CHP-201', customer_id: 1, store_id: 1 })
];
const OWNER = { tokA: 1, tokB: 2 };
function fakeBackend(url, init, headers) {
  const token = (headers['authorization'] || '').replace('Bearer ', '');
  const customerId = OWNER[token];
  if (!customerId) return { status: 401, body: { success: false, error: { message: 'Authorization token missing or malformed' } } };
  const store = parseInt(headers['x-store-id'], 10) || 1;
  const p = new URL(url).pathname.replace(/^\/api/, '');
  const mine = DB.filter((o) => o.customer_id === customerId && o.store_id === store);
  if (p === '/orders') return envelope({ total: mine.length, limit: 20, offset: 0, orders: mine });
  const key = decodeURIComponent(p.replace('/orders/', ''));
  const hit = mine.find((o) => String(o.id) === key || o.order_number === key);
  return hit ? envelope(hit) : { status: 404, body: { success: false, error: { message: 'Order not found or access denied.', statusCode: 404 } } };
}

test('Store 2: the customer sees their own store-2 order and never their store-1 (CHIPAKK) order', async () => {
  const mod = await withOrders();
  installFetch(fakeBackend);
  const { orders } = await mod.getOrders();
  assert.deepEqual(orders.map((o) => o.order_number), ['MAR-101']);
});

test('ownership: another customer cannot read this customer\'s order, by id or by order number', async () => {
  installBrowser({ user: { uid: 'uidB', token: 'tokB' } });
  const mod = await loadModule('src/lib/api/orders.ts');
  installFetch(fakeBackend);
  assert.equal(await mod.getOrderById(101), null);
  assert.equal(await mod.getOrderById('MAR-101'), null);
  assert.deepEqual((await mod.getOrders()).orders.map((o) => o.order_number), ['MAR-102']);
});

test('order detail: the owner gets a normalized order; a store-1 order id is not reachable from the store-2 client', async () => {
  const mod = await withOrders();
  installFetch(fakeBackend);
  const o = await mod.getOrderById('MAR-101');
  assert.equal(o.total_amount, 2598);
  assert.equal(o.status, 'Ready To Ship');
  assert.equal(await mod.getOrderById(201), null);
});

test('signed-out: no token -> empty list and no crash', async () => {
  installBrowser({ user: null });
  const mod = await loadModule('src/lib/api/orders.ts');
  installFetch(fakeBackend);
  assert.deepEqual((await mod.getOrders()).orders, []);
});
