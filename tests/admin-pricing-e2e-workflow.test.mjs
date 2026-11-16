import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/load.mjs';

// Load storefront services via esbuild helper
const {
  getLiveLadyJusticeVariants,
  mergeBackendVariantsWithDefaults,
  calculateLadyJusticePrice,
  LADY_JUSTICE_VARIANTS
} = await loadModule('src/lib/api/customForge.ts');

const {
  syncCustomForgeCartPrices,
  calculateCartItemTotal
} = await loadModule('src/lib/api/cart.ts');

test('Admin Panel & Storefront End-to-End Pricing Workflow', async (t) => {
  // Mock backend database state for Custom Forge variants
  let dbVariants = [
    { id: 1, variant_sku: 'MRSH-CF-LJ-6IN', size_label: '6 inches', height_mm: 152, price: 199900, price_rupees: 1999, custom_mode_allowed: 0, active: 1 },
    { id: 2, variant_sku: 'MRSH-CF-LJ-1FT', size_label: '1 foot', height_mm: 305, price: 369900, price_rupees: 3699, custom_mode_allowed: 1, active: 1 },
    { id: 3, variant_sku: 'MRSH-CF-LJ-2FT', size_label: '2 feet', height_mm: 610, price: 599900, price_rupees: 5999, custom_mode_allowed: 1, active: 1 }
  ];

  // Intercept global fetch to simulate live backend endpoints
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    const storeId = headers['x-store-id'] || headers['X-Store-ID'] || '2';

    // Store isolation check
    if (urlStr.includes('/custom-forge') && String(storeId) !== '2') {
      return {
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Custom Forge is exclusively supported on Store 2 (THE MARSHANS).' })
      };
    }

    // Public/Storefront endpoint: GET /api/custom-forge/products/lady-justice
    if (urlStr.includes('/custom-forge/products/lady-justice') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 1,
            slug: 'lady-justice',
            name: 'Lady Justice',
            variants: JSON.parse(JSON.stringify(dbVariants))
          }
        })
      };
    }

    // Admin endpoint: GET /api/admin/custom-forge/product
    if (urlStr.includes('/admin/custom-forge/product') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 1,
            slug: 'lady-justice',
            variants: JSON.parse(JSON.stringify(dbVariants))
          }
        })
      };
    }

    // Admin endpoint: PUT /api/admin/custom-forge/product/variants
    if (urlStr.includes('/admin/custom-forge/product/variants') && method === 'PUT') {
      const body = JSON.parse(options.body || '{}');
      if (!body.variants || !Array.isArray(body.variants)) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ success: false, error: 'Variants array required' })
        };
      }
      for (const upd of body.variants) {
        const v = dbVariants.find((row) => row.id === upd.id || row.variant_sku === upd.variant_sku);
        if (v) {
          v.price = upd.price;
          v.price_rupees = Math.round(upd.price / 100);
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Lady Justice variant prices updated successfully',
          data: {
            id: 1,
            slug: 'lady-justice',
            variants: JSON.parse(JSON.stringify(dbVariants))
          }
        })
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Not found' })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('1. Baseline verification: Admin and Storefront reflect initial approved prices', async () => {
    const live = await getLiveLadyJusticeVariants();
    assert.equal(live.isLive, true);
    assert.equal(live.variants.length, 3);

    const v6 = live.variants.find((v) => v.sizeLabel === '6 inches');
    const v1 = live.variants.find((v) => v.sizeLabel === '1 foot');
    const v2 = live.variants.find((v) => v.sizeLabel === '2 feet');

    assert.equal(v6?.price, 1999, '6 inches baseline must be ₹1,999');
    assert.equal(v1?.price, 3699, '1 foot baseline must be ₹3,699');
    assert.equal(v2?.price, 5999, '2 feet baseline must be ₹5,999');
  });

  await t.test('2. Admin updates prices in Admin Panel (SAVE PRICING action)', async () => {
    // Admin changes prices:
    // 6 inches: ₹2,199 (219900 paise)
    // 1 foot:   ₹3,899 (389900 paise)
    // 2 feet:   ₹6,299 (629900 paise)
    const adminSaveResponse = await globalThis.fetch('http://localhost:3000/api/admin/custom-forge/product/variants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Store-ID': '2' },
      body: JSON.stringify({
        variants: [
          { id: 1, variant_sku: 'MRSH-CF-LJ-6IN', price: 219900 },
          { id: 2, variant_sku: 'MRSH-CF-LJ-1FT', price: 389900 },
          { id: 3, variant_sku: 'MRSH-CF-LJ-2FT', price: 629900 }
        ]
      })
    });

    const result = await adminSaveResponse.json();
    assert.equal(adminSaveResponse.status, 200);
    assert.equal(result.success, true);
  });

  await t.test('3. Storefront automatically retrieves latest saved prices without code changes', async () => {
    // The storefront component calls getLiveLadyJusticeVariants()
    const live = await getLiveLadyJusticeVariants();
    assert.equal(live.isLive, true);

    const v6 = live.variants.find((v) => v.sizeLabel === '6 inches');
    const v1 = live.variants.find((v) => v.sizeLabel === '1 foot');
    const v2 = live.variants.find((v) => v.sizeLabel === '2 feet');

    assert.equal(v6?.price, 2199, 'Storefront 6 inches should automatically display updated ₹2,199');
    assert.equal(v1?.price, 3899, 'Storefront 1 foot should automatically display updated ₹3,899');
    assert.equal(v2?.price, 6299, 'Storefront 2 feet should automatically display updated ₹6,299');
  });

  await t.test('4. Cart and Checkout use latest authoritative prices dynamically', async () => {
    // Customer has 1-foot edition in cart with stale price ₹3,699 and Vinyl Sticker (₹0)
    const cartItems = [
      {
        id: 'cf-lj-1ft',
        productId: 2,
        name: 'Lady Justice (1 foot)',
        price: 3699, // Stale cached price from before admin update
        quantity: 1,
        options: {
          is_custom_forge: true,
          variant_key: 'cf-lj-1ft',
          variant_id: 2,
          custom_mode_enabled: 1,
          nameplate_material: 'Vinyl',
          name: 'Adv. Sharma',
          designation: 'High Court'
        }
      }
    ];

    // syncCustomForgeCartPrices refreshes cached cart item prices against live backend
    const { items: syncedCart, hasChanged } = await syncCustomForgeCartPrices(cartItems);
    assert.equal(hasChanged, true, 'Cart should detect price change');
    assert.equal(syncedCart[0].price, 3899, 'Cart unit price must be updated to ₹3,899');
    assert.equal(syncedCart[0].options.base_price, 3899);

    // Customer upgrades to MFD Engraving (+₹49)
    const priceWithMfd = calculateLadyJusticePrice(syncedCart[0].price, true, 'MDF', 1);
    assert.equal(priceWithMfd.editionPrice, 3899);
    assert.equal(priceWithMfd.materialCharge, 49);
    assert.equal(priceWithMfd.unitPrice, 3948, 'Payable total should be ₹3,899 + ₹49 = ₹3,948');
    assert.equal(priceWithMfd.totalPrice, 3948);
  });

  await t.test('5. Restore original approved prices (₹1,999, ₹3,699, ₹5,999) and verify restoration', async () => {
    // Admin restores original prices
    const adminRestoreResponse = await globalThis.fetch('http://localhost:3000/api/admin/custom-forge/product/variants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Store-ID': '2' },
      body: JSON.stringify({
        variants: [
          { id: 1, variant_sku: 'MRSH-CF-LJ-6IN', price: 199900 },
          { id: 2, variant_sku: 'MRSH-CF-LJ-1FT', price: 369900 },
          { id: 3, variant_sku: 'MRSH-CF-LJ-2FT', price: 599900 }
        ]
      })
    });

    const restoreResult = await adminRestoreResponse.json();
    assert.equal(adminRestoreResponse.status, 200);
    assert.equal(restoreResult.success, true);

    // Confirm storefront reflects restored prices
    const restoredLive = await getLiveLadyJusticeVariants();
    assert.equal(restoredLive.variants.find((v) => v.sizeLabel === '6 inches')?.price, 1999);
    assert.equal(restoredLive.variants.find((v) => v.sizeLabel === '1 foot')?.price, 3699);
    assert.equal(restoredLive.variants.find((v) => v.sizeLabel === '2 feet')?.price, 5999);
  });

  await t.test('6. Multi-store isolation: Store 1 (CHIPAKK) is strictly blocked from modifying Lady Justice prices', async () => {
    const store1Attempt = await globalThis.fetch('http://localhost:3000/api/admin/custom-forge/product/variants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Store-ID': '1' }, // Store 1 attempt
      body: JSON.stringify({
        variants: [{ id: 1, price: 100000 }]
      })
    });

    assert.equal(store1Attempt.status, 403, 'Store 1 modification must return 403 Forbidden');
  });
});
