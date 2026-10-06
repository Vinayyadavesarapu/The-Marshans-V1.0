import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, installBrowser, installFetch, ROOT } from './helpers/load.mjs';

test('1. createPaymentOrder requests backend payment order with Store 2 headers', async () => {
  installBrowser();
  let requestedUrl = '';
  let requestedBody = null;
  let requestedHeaders = {};

  installFetch((url, opts) => {
    requestedUrl = url;
    requestedBody = JSON.parse(opts.body);
    requestedHeaders = opts.headers || {};
    return {
      status: 200,
      body: {
        success: true,
        data: {
          already_paid: false,
          key_id: 'rzp_test_public_123',
          gateway_order_id: 'order_test_rzp_abc',
          amount: 259800, // in paise
          currency: 'INR',
          order_id: 42,
          order_number: 'MSH-1042',
          prefill: { name: 'Vinay', email: 'vinay@test.com', contact: '9876543210' }
        }
      }
    };
  });

  const { createPaymentOrder } = await loadModule('src/lib/api/payments.ts');
  const res = await createPaymentOrder(42);

  assert.equal(res.success, true);
  assert.equal(res.gateway_order_id, 'order_test_rzp_abc');
  assert.equal(res.amount, 259800);
  assert.equal(requestedUrl, 'https://api.chipakk.shop/api/payments/create');
  assert.deepEqual(requestedBody, { order_id: 42 });
  assert.equal(requestedHeaders['X-Store-ID'], '2');
  assert.equal(requestedHeaders['X-Store-Code'], 'marshans');
});

test('2. verifyPaymentSignature sends required cryptographic parameters to backend', async () => {
  installBrowser();
  let requestedUrl = '';
  let requestedBody = null;

  installFetch((url, opts) => {
    requestedUrl = url;
    requestedBody = JSON.parse(opts.body);
    return {
      status: 200,
      body: {
        success: true,
        data: {
          success: true,
          payment_status: 'paid',
          order_id: 42,
          order_number: 'MSH-1042'
        }
      }
    };
  });

  const { verifyPaymentSignature } = await loadModule('src/lib/api/payments.ts');
  const payload = {
    order_id: 42,
    razorpay_order_id: 'order_test_rzp_abc',
    razorpay_payment_id: 'pay_test_xyz',
    razorpay_signature: 'signature_hmac_sha256_mock'
  };

  const res = await verifyPaymentSignature(payload);
  assert.equal(res.success, true);
  assert.equal(res.payment_status, 'paid');
  assert.equal(requestedUrl, 'https://api.chipakk.shop/api/payments/verify');
  assert.deepEqual(requestedBody, {
    order_id: 42,
    razorpay_order_id: 'order_test_rzp_abc',
    razorpay_payment_id: 'pay_test_xyz',
    razorpay_signature: 'signature_hmac_sha256_mock'
  });
});

test('3. Security rule: RAZORPAY_KEY_SECRET is never exposed in frontend files', () => {
  const srcFiles = [
    'src/lib/api/payments.ts',
    'src/lib/api/orders.ts',
    'src/lib/api/shipping.ts',
    'src/components/react/CheckoutForm.jsx',
    '.env.example'
  ];

  for (const relPath of srcFiles) {
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(
        !content.includes('RAZORPAY_KEY_SECRET='),
        `Frontend file ${relPath} contains RAZORPAY_KEY_SECRET assignment, violating payment security rules.`
      );
    }
  }
});

test('4. checkPincodeServiceability sends pincode and payment_mode to /orders/serviceability', async () => {
  installBrowser();
  let requestedUrl = '';
  let requestedBody = null;

  installFetch((url, opts) => {
    requestedUrl = url;
    requestedBody = JSON.parse(opts.body);
    return {
      status: 200,
      body: {
        success: true,
        data: {
          status: 'serviceable',
          serviceable: true,
          carriers: [{ carrier_id: 'CR1', carrier_name: 'Carrier One' }],
          pincode: '500090',
          payment_mode: 'prepaid',
          message: 'Delivery is available for this PIN code.'
        }
      }
    };
  });

  const { checkPincodeServiceability } = await loadModule('src/lib/api/shipping.ts');
  const res = await checkPincodeServiceability('500090', 'prepaid');

  assert.equal(res.serviceable, true);
  assert.equal(res.pincode, '500090');
  assert.equal(requestedUrl, 'https://api.chipakk.shop/api/orders/serviceability');
  assert.deepEqual(requestedBody, { pincode: '500090', payment_mode: 'prepaid' });

  // Invalid pincode is rejected client-side before network call
  const invalidRes = await checkPincodeServiceability('123');
  assert.equal(invalidRes.serviceable, false);
  assert.equal(invalidRes.status, 'invalid_pin');
});

test('5. getOrderTracking requests /orders/:id/tracking and parses courier metadata and activities', async () => {
  installBrowser();
  let requestedUrl = '';

  installFetch((url) => {
    requestedUrl = url;
    return {
      status: 200,
      body: {
        success: true,
        data: {
          order_id: 101,
          order_number: 'MSH-1101',
          fulfillment_status: 'shipped',
          payment_status: 'paid',
          courier: 'BlueDart Air Express',
          tracking_no: 'BD-88992211',
          current_status: 'In Transit',
          track_url: 'https://shazam.velocity.in/track/BD-88992211',
          activities: [
            {
              activity: 'Consignment picked up from Mallampet Hub',
              location: 'Hyderabad',
              date: '2026-10-06',
              time: '14:30:00'
            }
          ]
        }
      }
    };
  });

  const { getOrderTracking } = await loadModule('src/lib/api/orders.ts');
  const res = await getOrderTracking(101);

  assert.ok(res !== null);
  assert.equal(res.order_id, 101);
  assert.equal(res.courier, 'BlueDart Air Express');
  assert.equal(res.tracking_no, 'BD-88992211');
  assert.equal(res.activities.length, 1);
  assert.equal(res.activities[0].location, 'Hyderabad');
  assert.equal(requestedUrl, 'https://api.chipakk.shop/api/orders/101/tracking');
});

test('6. CheckoutForm.jsx handles both Razorpay Standard Checkout and Cash on Delivery', () => {
  const checkoutSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/CheckoutForm.jsx'), 'utf8');

  // Online payments initiate Razorpay and verify signature
  assert.ok(checkoutSrc.includes('createPaymentOrder'), 'CheckoutForm must call createPaymentOrder');
  assert.ok(checkoutSrc.includes('verifyPaymentSignature'), 'CheckoutForm must call verifyPaymentSignature');
  assert.ok(checkoutSrc.includes('window.Razorpay'), 'CheckoutForm must initialize window.Razorpay');

  // Cart must not be cleared on dismissal or cancel
  assert.ok(checkoutSrc.includes('ondismiss'), 'CheckoutForm must implement modal.ondismiss');

  // COD branch exists and directly completes
  assert.ok(checkoutSrc.includes("paymentMethod === 'cod'"), 'CheckoutForm must have dedicated COD handling');

  // Serviceability check is integrated
  // Velocity serviceability is temporarily bypassed at checkout (see checkout-direct-payment.test.mjs);
  // the shipping.ts serviceability client itself is still covered by test 4 above.
  assert.ok(!checkoutSrc.includes('checkPincodeServiceability'), 'CheckoutForm must not call the serviceability API while bypassed');
  assert.ok(checkoutSrc.includes('isValidPincode(formData.postalCode)'), 'CheckoutForm must still validate the 6-digit PIN');
});

test('7. Store Isolation: Payment and shipping client calls strictly enforce Store 2 headers', async () => {
  installBrowser();
  const capturedCalls = [];

  installFetch((url, opts) => {
    capturedCalls.push({ url, headers: opts.headers || {} });
    return {
      status: 200,
      body: { success: true, data: { success: true, payment_status: 'paid' } }
    };
  });

  const { createPaymentOrder, verifyPaymentSignature } = await loadModule('src/lib/api/payments.ts');
  const { checkPincodeServiceability } = await loadModule('src/lib/api/shipping.ts');

  await createPaymentOrder(88);
  await verifyPaymentSignature({ order_id: 88, razorpay_order_id: 'rzp_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig_1' });
  await checkPincodeServiceability('500090');

  for (const call of capturedCalls) {
    assert.equal(call.headers['X-Store-ID'], '2', `Endpoint ${call.url} must send X-Store-ID: 2`);
    assert.equal(call.headers['X-Store-Code'], 'marshans', `Endpoint ${call.url} must send X-Store-Code: marshans`);
  }
});

