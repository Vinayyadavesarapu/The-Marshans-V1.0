import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

const UNAVAILABLE = 'Shipping serviceability is temporarily unavailable. Please try again later.';
const NOT_SERVICEABLE = 'Delivery is not available for this PIN code.';

async function shippingWith(response) {
  installBrowser();
  const calls = installFetch(() => response);
  const mod = await loadModule('src/lib/api/shipping.ts');
  return { ...mod, calls };
}

const backend = (data) => ({ status: 200, body: { success: true, data } });

test('12. serviceable=true (carriers returned) allows checkout', async () => {
  const { checkPincodeServiceability, evaluateCheckoutServiceability, calls } = await shippingWith(backend({
    status: 'serviceable', serviceable: true, carriers: [{ carrier_id: 'CR1', carrier_name: 'Carrier One' }]
  }));
  const res = await checkPincodeServiceability('521456', 'cod');
  assert.equal(res.status, 'serviceable');
  assert.equal(res.serviceable, true);
  assert.deepEqual(res.carriers, [{ carrier_id: 'CR1', carrier_name: 'Carrier One' }]);
  assert.deepEqual(JSON.parse(calls[0].body), { pincode: '521456', payment_mode: 'cod' });
  assert.equal(calls[0].headers['x-store-id'], '2');
  assert.equal(evaluateCheckoutServiceability(res, '521456', 'cod').allowed, true);
});

test('13. serviceable=false (no carriers) blocks checkout with the not-serviceable message', async () => {
  const { checkPincodeServiceability, evaluateCheckoutServiceability } = await shippingWith(backend({
    status: 'not_serviceable', serviceable: false, carriers: []
  }));
  const res = await checkPincodeServiceability('521456', 'prepaid');
  assert.equal(res.status, 'not_serviceable');
  const gate = evaluateCheckoutServiceability(res, '521456', 'prepaid');
  assert.deepEqual(gate, { allowed: false, message: NOT_SERVICEABLE });
});

test('14. unavailable blocks checkout — backend unavailable, request failure, or undocumented shape', async () => {
  const responses = [
    backend({ status: 'unavailable', serviceable: false, carriers: [] }),
    { status: 401, body: { success: false, error: { message: 'Authorization token missing' } } },
    { status: 500, body: null },
    backend({ serviceable: true }), // legacy/undocumented shape: never trusted as serviceable
    backend({ status: 'serviceable', serviceable: true, carriers: [] }), // "serviceable" without carriers
    backend(null)
  ];
  for (const response of responses) {
    const { checkPincodeServiceability, evaluateCheckoutServiceability } = await shippingWith(response);
    const res = await checkPincodeServiceability('521456', 'prepaid');
    assert.equal(res.status, 'unavailable', JSON.stringify(response.body));
    assert.equal(res.serviceable, false);
    assert.deepEqual(evaluateCheckoutServiceability(res, '521456', 'prepaid'), { allowed: false, message: UNAVAILABLE });
  }

  // Network exception
  installBrowser();
  globalThis.fetch = async () => { throw new Error('offline'); };
  const { checkPincodeServiceability } = await loadModule('src/lib/api/shipping.ts');
  assert.equal((await checkPincodeServiceability('521456')).status, 'unavailable');
});

test('14b. missing, in-flight or stale results block checkout', async () => {
  const { evaluateCheckoutServiceability } = await shippingWith(backend(null));
  const ok = { status: 'serviceable', serviceable: true, pincode: '521456', paymentMode: 'prepaid', carriers: [{}], message: '' };
  assert.equal(evaluateCheckoutServiceability(null, '521456', 'prepaid').allowed, false);
  assert.equal(evaluateCheckoutServiceability(ok, '560001', 'prepaid').allowed, false, 'result for a different PIN');
  assert.equal(evaluateCheckoutServiceability(ok, '521456', 'cod').allowed, false, 'result for a different payment mode');
});

test('15. PIN accepts exactly 6 digits', async () => {
  const { isValidPincode, sanitizePincodeInput } = await shippingWith(backend(null));
  assert.equal(isValidPincode('521456'), true);
  assert.equal(sanitizePincodeInput('521456'), '521456');
  assert.equal(sanitizePincodeInput('52 14-56'), '521456', 'non-digits are stripped');
});

test('16. PIN rejects fewer or more than 6 digits (and is capped on input)', async () => {
  const { isValidPincode, sanitizePincodeInput, checkPincodeServiceability, evaluateCheckoutServiceability, calls } =
    await shippingWith(backend({ status: 'serviceable', serviceable: true, carriers: [{}] }));
  for (const pin of ['52145', '5214567', '52a456', '', '      ']) assert.equal(isValidPincode(pin), false, pin);
  assert.equal(sanitizePincodeInput('52145678'), '521456', 'input is capped at 6 digits');
  assert.equal(sanitizePincodeInput('abc'), '');
  const res = await checkPincodeServiceability('52145');
  assert.equal(res.status, 'invalid_pin');
  assert.equal(calls.length, 0, 'no request for an invalid PIN');
  assert.equal(evaluateCheckoutServiceability(res, '52145', 'prepaid').allowed, false);

  const checkout = readFileSync(resolve('src/components/react/CheckoutForm.jsx'), 'utf8');
  assert.match(checkout, /sanitizePincodeInput\(e\.target\.value\)/, 'PIN input strips non-digits');
  assert.match(checkout, /maxLength=\{6\}/);
  assert.match(checkout, /inputMode="numeric"/);
  assert.match(checkout, /if \(!isValidPincode\(formData\.postalCode\)\)/, 'submit is gated on a valid 6-digit PIN');
  assert.doesNotMatch(checkout, /serviceability && serviceability\.serviceable === false/, 'old permissive gate removed');
});

test('17. checkout thumbnails resolve /uploads paths to the API host', async () => {
  installBrowser();
  const { resolveImageUrl } = await loadModule('src/lib/utils/media.ts');
  assert.equal(resolveImageUrl('/uploads/product-1.webp'), 'https://api.chipakk.shop/uploads/product-1.webp');
  assert.equal(resolveImageUrl('https://cdn.example.com/a.webp'), 'https://cdn.example.com/a.webp');
  assert.equal(resolveImageUrl(''), '/assets/placeholders/product-placeholder.svg');

  const checkout = readFileSync(resolve('src/components/react/CheckoutForm.jsx'), 'utf8');
  assert.match(checkout, /src=\{resolveImageUrl\(item\.imageUrl\)\}/);
  assert.doesNotMatch(checkout, /src=\{item\.imageUrl/);
});

test('18. cart page image behaviour is unchanged (still resolved through resolveImageUrl)', () => {
  const cartView = readFileSync(resolve('src/components/react/CartView.jsx'), 'utf8');
  assert.match(cartView, /src=\{resolveImageUrl\(item\.imageUrl\)\}/);
});
