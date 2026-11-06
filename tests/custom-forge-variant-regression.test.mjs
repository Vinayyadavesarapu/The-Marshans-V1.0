import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('Variant ID Regression 1: LADY_JUSTICE_VARIANTS defines exact slugs cf-lj-6in, cf-lj-1ft, cf-lj-2ft and backend IDs', async () => {
  const {
    LADY_JUSTICE_VARIANTS,
    resolveVariantNumericId,
    resolveVariantKey,
    VARIANT_ID_MAP,
    VARIANT_KEY_MAP
  } = await loadModule('src/lib/api/customForge.ts');

  assert.equal(LADY_JUSTICE_VARIANTS.length, 3);

  // 6 inches
  const v6 = LADY_JUSTICE_VARIANTS.find(v => v.id === 'cf-lj-6in');
  assert.ok(v6);
  assert.equal(v6.backendVariantId, 1);
  assert.equal(v6.sizeLabel, '6 inches');
  assert.equal(v6.price, 1600);
  assert.equal(v6.customModeAllowed, false);
  assert.equal(resolveVariantNumericId('cf-lj-6in'), 1);
  assert.equal(resolveVariantKey(1), 'cf-lj-6in');

  // 1 foot
  const v12 = LADY_JUSTICE_VARIANTS.find(v => v.id === 'cf-lj-1ft');
  assert.ok(v12);
  assert.equal(v12.backendVariantId, 2);
  assert.equal(v12.sizeLabel, '1 foot');
  assert.equal(v12.price, 3500);
  assert.equal(v12.customModeAllowed, true);
  assert.equal(resolveVariantNumericId('cf-lj-1ft'), 2);
  assert.equal(resolveVariantKey(2), 'cf-lj-1ft');

  // 2 feet
  const v24 = LADY_JUSTICE_VARIANTS.find(v => v.id === 'cf-lj-2ft');
  assert.ok(v24);
  assert.equal(v24.backendVariantId, 3);
  assert.equal(v24.sizeLabel, '2 feet');
  assert.equal(v24.price, 5600);
  assert.equal(v24.customModeAllowed, true);
  assert.equal(resolveVariantNumericId('cf-lj-2ft'), 3);
  assert.equal(resolveVariantKey(3), 'cf-lj-2ft');
});

test('Variant ID Regression 2: Cart preserves slug and numeric variant IDs through add, persist, and reload', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));

  const { addCustomForgeToCart, getLocalCart, clearCart, getBackendCart } = await loadModule('src/lib/api/cart.ts');
  const { resolveVariantNumericId, resolveVariantKey } = await loadModule('src/lib/api/customForge.ts');
  await clearCart();

  // Test all 3 variants added independently
  const variantsToTest = [
    { slug: 'cf-lj-6in', numId: 1, label: '6 inches', price: 1600, custom: false },
    { slug: 'cf-lj-1ft', numId: 2, label: '1 foot', price: 3500, custom: true, name: 'Adv. A. Sharma' },
    { slug: 'cf-lj-2ft', numId: 3, label: '2 feet', price: 5600, custom: true, name: 'Justice K. Rao' }
  ];

  for (const v of variantsToTest) {
    const item = {
      id: `cart-item-${v.slug}`,
      productId: v.numId,
      name: `Lady Justice Statue (${v.label})`,
      slug: 'lady-justice',
      sku: `MRSH-CF-LJ-${v.slug.replace('cf-lj-', '').toUpperCase()}`,
      price: v.price,
      quantity: 1,
      imageUrl: '/assets/products/custom-forge/name plate front.png',
      categoryName: 'Custom Forge',
      options: {
        is_custom_forge: true,
        variant_id: v.slug,
        variant_key: v.slug,
        variant_numeric_id: v.numId,
        size_label: v.label,
        custom_mode_enabled: v.custom,
        custom_name: v.name || null,
        custom_designation: v.custom ? 'Senior Counsel' : null,
        nameplate_material: v.custom ? 'Plastic' : null
      }
    };

    const res = await addCustomForgeToCart(item);
    assert.equal(res.success, true);
  }

  // 1. Verify all 3 in local cart
  const cart = getLocalCart();
  assert.equal(cart.length, 3);

  // 2. Simulate page refresh / reload from localStorage
  const { CART_CACHE_KEY } = await loadModule('src/lib/session/cache.ts');
  const rawStorage = localStorage.getItem(CART_CACHE_KEY);
  assert.ok(rawStorage);
  const reloadedCart = JSON.parse(rawStorage);
  assert.equal(reloadedCart.length, 3);

  // 3. Verify each item retains exact variant slug and numeric ID
  for (let i = 0; i < variantsToTest.length; i++) {
    const expected = variantsToTest[i];
    const actual = reloadedCart[i];
    assert.equal(actual.options.is_custom_forge, true);
    assert.equal(actual.options.variant_id, expected.slug);
    assert.equal(actual.options.variant_key, expected.slug);
    assert.equal(actual.options.variant_numeric_id, expected.numId);
    assert.equal(resolveVariantNumericId(actual.options.variant_id), expected.numId);
    assert.equal(resolveVariantKey(actual.options.variant_id), expected.slug);
  }
});

test('Variant ID Regression 3: Checkout order payload includes valid top-level and item variant IDs', async () => {
  installBrowser();

  let capturedPayload = null;
  installFetch(async (url, opts) => {
    capturedPayload = JSON.parse(opts.body || '{}');
    return {
      status: 201,
      body: {
        success: true,
        data: {
          id: 777,
          order_number: 'CF-MRSH-2026-7777',
          subtotal: 350000,
          total_price: 355000,
          payment_status: 'pending'
        }
      }
    };
  });

  const { createCustomForgeOrderApi, resolveVariantNumericId, resolveVariantKey } = await loadModule('src/lib/api/customForge.ts');

  // Simulate checkout payload for 1-foot edition
  const selectedSlug = 'cf-lj-1ft';
  const numericId = resolveVariantNumericId(selectedSlug);
  const variantKey = resolveVariantKey(selectedSlug);

  const payload = {
    variant_id: numericId,
    variant_key: variantKey,
    quantity: 1,
    custom_mode: 1,
    coupon_code: 'SAVE10',
    customization: {
      customer_name: 'Adv. Rajesh Sharma',
      customer_designation: 'Senior Advocate',
      nameplate_material: 'Plastic'
    },
    items: [
      {
        variant_id: numericId,
        variant_key: variantKey,
        quantity: 1,
        custom_mode: 1,
        customization: {
          customer_name: 'Adv. Rajesh Sharma',
          customer_designation: 'Senior Advocate',
          nameplate_material: 'Plastic'
        }
      }
    ],
    shipping_address: {
      name: 'Adv. Rajesh Sharma',
      phone: '9876543210',
      address: 'Chamber 402, High Court Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400032',
      country: 'India',
      email: 'rajesh.sharma@example.com'
    }
  };

  const res = await createCustomForgeOrderApi(payload);
  assert.equal(res.success, true);

  // Validate captured payload guarantees:
  assert.equal(capturedPayload.variant_id, 2);
  assert.equal(capturedPayload.variant_key, 'cf-lj-1ft');
  assert.equal(capturedPayload.coupon_code, 'SAVE10');
  assert.equal(capturedPayload.items.length, 1);
  assert.equal(capturedPayload.items[0].variant_id, 2);
  assert.equal(capturedPayload.items[0].variant_key, 'cf-lj-1ft');

  // Crucial: parseInt(capturedPayload.variant_id, 10) must be a positive integer, NEVER NaN
  assert.equal(Number.isInteger(capturedPayload.variant_id), true);
  assert.ok(capturedPayload.variant_id > 0);
  assert.equal(Number.isInteger(capturedPayload.items[0].variant_id), true);
  assert.ok(capturedPayload.items[0].variant_id > 0);
});
