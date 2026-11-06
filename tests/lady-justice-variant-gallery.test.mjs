import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

const read = (p) => readFileSync(resolve(p), 'utf8');

test('1. All 4 target Custom Forge Lady Justice image assets exist in public assets directory', () => {
  const images = [
    'name plate front.png',
    'name plate back.png',
    '6 inches front.png',
    '6 inches back.png'
  ];

  for (const img of images) {
    const fullPath = resolve('public/assets/products/custom-forge', img);
    assert.ok(existsSync(fullPath), `${img} exists in public/assets/products/custom-forge`);
    const buf = readFileSync(fullPath);
    assert.strictEqual(buf.slice(0, 8).toString('hex'), '89504e470d0a1a0a', `${img} has valid PNG header`);
  }
});

test('2. Lady Justice primary product thumbnail is name plate front.png across all catalog and page definitions', () => {
  const page = read('src/pages/product/lady-justice.astro');
  const launch = read('src/config/launchMode.ts');
  const custom3d = read('src/pages/custom-3d.astro');

  assert.match(page, /LADY_JUSTICE_PRIMARY_IMAGE = '\/assets\/products\/custom-forge\/name plate front\.png'/);
  assert.match(launch, /primary_image_url:\s*'\/assets\/products\/custom-forge\/name plate front\.png'/);
  assert.match(custom3d, /LADY_JUSTICE_IMAGE = '\/assets\/products\/custom-forge\/name plate front\.png'/);
});

test('3. Lady Justice gallery isolates images by variant (6-inch vs 1-foot / 2-foot)', () => {
  const page = read('src/pages/product/lady-justice.astro');

  // Verify 1ft / 2ft image set contains ONLY name plate front.png and name plate back.png
  assert.match(page, /ladyJustice1ft2ftImages = \[\s*\{\s*id: 'cf-lj-np-front',\s*image_url: '\/assets\/products\/custom-forge\/name plate front\.png'/);
  assert.match(page, /image_url: '\/assets\/products\/custom-forge\/name plate back\.png'/);

  // Verify 6in image set contains ONLY 6 inches front.png and 6 inches back.png
  assert.match(page, /ladyJustice6inImages = \[\s*\{\s*id: 'cf-lj-6in-front',\s*image_url: '\/assets\/products\/custom-forge\/6 inches front\.png'/);
  assert.match(page, /image_url: '\/assets\/products\/custom-forge\/6 inches back\.png'/);

  // Obsolete gallery images are completely removed
  assert.doesNotMatch(page, /lady-justice-statue-studio\.jpeg/);
  assert.doesNotMatch(page, /lady-justice-statue-angle-2\.jpeg/);
  assert.doesNotMatch(page, /lady-justice-statue-details\.jpeg/);
  assert.doesNotMatch(page, /lady-justice-statue-thumb\.png/);
  assert.doesNotMatch(page, /lady-justice-dummy\.png/);
});

test('4. LadyJusticePurchase assigns the exact variant image when adding to cart', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { addCustomForgeToCart, getLocalCart, clearCart } = await loadModule('src/lib/api/cart.ts');
  await clearCart();

  // 1-foot edition cart item
  const oneFootItem = {
    id: 'cf-1ft-test',
    productId: 2,
    name: 'Lady Justice Statue (1 foot)',
    price: 3500,
    quantity: 1,
    imageUrl: '/assets/products/custom-forge/name plate front.png',
    options: {
      is_custom_forge: true,
      variant_id: 2,
      size_label: '1 foot'
    }
  };
  await addCustomForgeToCart(oneFootItem);

  // 6-inch edition cart item
  const sixInchItem = {
    id: 'cf-6in-test',
    productId: 1,
    name: 'Lady Justice Statue (6 inches)',
    price: 1600,
    quantity: 1,
    imageUrl: '/assets/products/custom-forge/6 inches front.png',
    options: {
      is_custom_forge: true,
      variant_id: 1,
      size_label: '6 inches'
    }
  };
  await addCustomForgeToCart(sixInchItem);

  const cart = getLocalCart();
  assert.strictEqual(cart.length, 2);
  assert.strictEqual(cart[0].imageUrl, '/assets/products/custom-forge/name plate front.png');
  assert.strictEqual(cart[1].imageUrl, '/assets/products/custom-forge/6 inches front.png');
});

test('5. Product page removes outdated shipping claim (Free Air Express Dispatch)', () => {
  const purchase = read('src/components/react/LadyJusticePurchase.tsx');
  assert.doesNotMatch(purchase, /Free Air Express Dispatch/i, 'Outdated Free Air Express claim must be removed');
  assert.match(purchase, /Standard Air Delivery/);
});

test('6. CheckoutForm updates payable amount and order confirmation with applied coupon', () => {
  const checkout = read('src/components/react/CheckoutForm.jsx');

  // Submit button displays finalPayableTotal
  assert.match(checkout, /Authorize & Confirm Order \(₹\$\{finalPayableTotal\.toLocaleString\('en-IN'\)\}\)/);

  // Custom Forge order clears coupon upon payment success
  assert.match(checkout, /clearAppliedCoupon\(\);[\s\S]*?window\.location\.href = `\/order-confirmation\?orderNumber=\$\{encodeURIComponent\(orderNumber\)\}&total=\$\{finalPayableTotal\}`;/);

  // Passes coupon_code in Custom Forge payload
  assert.match(checkout, /coupon_code: appliedCoupon\?\.code \|\| undefined/);
});
