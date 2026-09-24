import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

// The API's CORS policy allows GET,POST,PUT,DELETE,OPTIONS for browsers (no PATCH),
// and the backend serves quantity updates on PUT /cart/items/:id.
test('cart quantity update uses PUT /cart/items/:id with Store 2 headers', async () => {
  installBrowser();
  const calls = installFetch(() => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { updateCartQuantity } = await loadModule('src/lib/api/cart.ts');

  await updateCartQuantity('41', 1, 1);

  const update = calls.find((c) => c.url.endsWith('/cart/items/41'));
  assert.ok(update, 'quantity update request was sent');
  assert.equal(update.method, 'PUT');
  assert.deepEqual(JSON.parse(update.body), { quantity: 2 });
  assert.equal(update.headers['x-store-id'], '2');
  assert.equal(update.headers['x-store-code'], 'marshans');
  assert.equal(calls.some((c) => c.method === 'PATCH'), false);
});
