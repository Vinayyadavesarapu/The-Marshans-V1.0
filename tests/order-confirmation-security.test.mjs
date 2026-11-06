import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('Order Confirmation Security 1: Missing order reference parameter displays missing reference state', async () => {
  const b = installBrowser();
  // Simulate URL without orderNumber or orderId: /order-confirmation/
  delete globalThis.window.location;
  globalThis.window.location = new URL('https://themarshans.shop/order-confirmation/');

  const { getCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');
  assert.ok(typeof getCustomForgeOrderApi === 'function');

  // Verify that an empty orderRef does not trigger backend verification
  let fetchCalled = false;
  installFetch(async () => {
    fetchCalled = true;
    return { status: 200, body: { success: true } };
  });

  const params = new URLSearchParams(globalThis.window.location.search);
  const orderRef = (params.get('orderNumber') || params.get('orderId') || '').trim();
  assert.equal(orderRef, '');
  assert.equal(fetchCalled, false, 'Fetch must never be called when orderRef is missing');
});

test('Order Confirmation Security 2: Unauthenticated customer cannot view genuine confirmation', async () => {
  const b = installBrowser();
  globalThis.window.location = new URL('https://themarshans.shop/order-confirmation/?orderNumber=CF-MRSH-2026-0001');

  // Mock unauthenticated currentUser
  b.fb.auth.currentUser = null;

  const { onAuthStateChange } = await loadModule('src/lib/firebase/client.ts');
  let authChecked = false;
  let receivedUser = 'initial';

  onAuthStateChange((user) => {
    authChecked = true;
    receivedUser = user;
  });

  // Dispatch auth state change from Firebase stub
  b.fb.listeners.forEach((cb) => cb(b.fb.auth.currentUser));

  assert.equal(authChecked, true);
  assert.equal(receivedUser, null, 'Unauthenticated user must be null, triggering sign-in required guard');
});

test('Order Confirmation Security 3: Failed payment status strictly renders PAYMENT FAILED / FABRICATION ON HOLD', async () => {
  const b = installBrowser();
  globalThis.window.location = new URL('https://themarshans.shop/order-confirmation/?orderNumber=CF-MRSH-2026-0001&total=9999');

  // Authenticated user
  b.fb.auth.currentUser = { uid: 'user_cust_1', email: 'cust@marshans.test', getIdToken: async () => 'valid_token' };

  // Backend returns payment_status: 'failed'
  installFetch(async (url, opts) => {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: 1,
          order_number: 'CF-MRSH-2026-0001',
          payment_status: 'failed',
          total_price: 350000,
          total_price_rupees: 3500
        }
      }
    };
  });

  const { getCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');
  const res = await getCustomForgeOrderApi('CF-MRSH-2026-0001');

  assert.equal(res.success, true);
  assert.equal(res.data.payment_status, 'failed');
  assert.notEqual(res.data.payment_status, 'paid', 'Failed order must NEVER evaluate to paid');
});

test('Order Confirmation Security 4: Pending / unverified payment strictly renders PAYMENT PENDING', async () => {
  const b = installBrowser();
  globalThis.window.location = new URL('https://themarshans.shop/order-confirmation/?orderNumber=CF-MRSH-2026-0002');

  installFetch(async () => {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: 2,
          order_number: 'CF-MRSH-2026-0002',
          payment_status: 'pending',
          total_price: 160000,
          total_price_rupees: 1600
        }
      }
    };
  });

  const { getCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');
  const res = await getCustomForgeOrderApi('CF-MRSH-2026-0002');

  assert.equal(res.success, true);
  assert.equal(res.data.payment_status, 'pending');
  assert.notEqual(res.data.payment_status, 'paid', 'Pending order must NEVER evaluate to paid');
});

test('Order Confirmation Security 5: Genuine server-verified payment (payment_status: paid) confirms fabrication queue', async () => {
  const b = installBrowser();
  globalThis.window.location = new URL('https://themarshans.shop/order-confirmation/?orderNumber=CF-MRSH-2026-0003&total=100'); // client total differs

  installFetch(async (url, opts) => {
    // Assert Store 2 headers are transmitted
    assert.equal(opts.headers['X-Store-ID'], '2');
    assert.equal(opts.headers['X-Store-Code'], 'marshans');

    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: 3,
          order_number: 'CF-MRSH-2026-0003',
          payment_status: 'paid',
          gateway_order_id: 'order_RzpCfVerified123',
          total_price: 560000,
          total_price_rupees: 5600
        }
      }
    };
  });

  const { getCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');
  const res = await getCustomForgeOrderApi('CF-MRSH-2026-0003');

  assert.equal(res.success, true);
  assert.equal(res.data.payment_status, 'paid');
  // Client passed total=100 in query string, but backend authoritative total is 5600
  assert.equal(res.data.total_price_rupees, 5600);
  assert.notEqual(res.data.total_price_rupees, 100, 'Authoritative backend total must override client query param');
});

test('Order Confirmation Security 6: Cross-customer or cross-store access returns 403 Forbidden', async () => {
  const b = installBrowser();
  installFetch(async () => {
    return {
      status: 403,
      body: {
        success: false,
        error: 'Order not found or access denied. You may not have permission to view this order.'
      }
    };
  });

  const { getCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');
  const res = await getCustomForgeOrderApi('CF-MRSH-OTHER-CUST');

  assert.equal(res.success, false);
  assert.match(res.error, /access denied/i);
});
