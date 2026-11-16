import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('Dynamic Pricing 1: mergeBackendVariantsWithDefaults overrides default prices with backend prices', async () => {
  const {
    LADY_JUSTICE_VARIANTS,
    mergeBackendVariantsWithDefaults
  } = await loadModule('src/lib/api/customForge.ts');

  const mockBackendVariants = [
    { id: 1, variant_sku: 'MRSH-CF-LJ-6IN', size_label: '6 inches', price: 219900, price_rupees: 2199, height_mm: 152, custom_mode_allowed: 0 },
    { id: 2, variant_sku: 'MRSH-CF-LJ-1FT', size_label: '1 foot', price: 399900, price_rupees: 3999, height_mm: 305, custom_mode_allowed: 1 },
    { id: 3, variant_sku: 'MRSH-CF-LJ-2FT', size_label: '2 feet', price: 649900, price_rupees: 6499, height_mm: 610, custom_mode_allowed: 1 }
  ];

  const merged = mergeBackendVariantsWithDefaults(mockBackendVariants);
  assert.equal(merged.length, 3);

  const var6in = merged.find(v => v.id === 'cf-lj-6in');
  assert.equal(var6in.price, 2199);
  assert.equal(var6in.weightLabel, '400 grams'); // Preserved metadata

  const var1ft = merged.find(v => v.id === 'cf-lj-1ft');
  assert.equal(var1ft.price, 3999);
  assert.equal(var1ft.weightLabel, '1 kg'); // Preserved metadata

  const var2ft = merged.find(v => v.id === 'cf-lj-2ft');
  assert.equal(var2ft.price, 6499);
  assert.equal(var2ft.isPopular, true); // Preserved metadata
});

test('Dynamic Pricing 2: mergeBackendVariantsWithDefaults handles paise without price_rupees', async () => {
  const {
    mergeBackendVariantsWithDefaults
  } = await loadModule('src/lib/api/customForge.ts');

  const mockBackendVariants = [
    { id: 1, variant_sku: 'MRSH-CF-LJ-6IN', price: 249900 },
    { id: 2, variant_sku: 'MRSH-CF-LJ-1FT', price: 419900 },
    { id: 3, variant_sku: 'MRSH-CF-LJ-2FT', price: 699900 }
  ];

  const merged = mergeBackendVariantsWithDefaults(mockBackendVariants);
  assert.equal(merged.find(v => v.id === 'cf-lj-6in').price, 2499);
  assert.equal(merged.find(v => v.id === 'cf-lj-1ft').price, 4199);
  assert.equal(merged.find(v => v.id === 'cf-lj-2ft').price, 6999);
});

test('Dynamic Pricing 3: Graceful fallback when backend returns empty or invalid data', async () => {
  const {
    mergeBackendVariantsWithDefaults
  } = await loadModule('src/lib/api/customForge.ts');

  const mergedEmpty = mergeBackendVariantsWithDefaults([]);
  assert.deepEqual(mergedEmpty.map(v => v.price), [1999, 3699, 5999]);

  const mergedNull = mergeBackendVariantsWithDefaults(null);
  assert.deepEqual(mergedNull.map(v => v.price), [1999, 3699, 5999]);
});

test('Dynamic Pricing 4: calculateLadyJusticePrice reflects dynamic edition prices accurately with add-ons', async () => {
  const {
    calculateLadyJusticePrice
  } = await loadModule('src/lib/api/customForge.ts');

  // Scenario: 1ft edition updated to ₹3,999 in Admin
  const dynamicPrice = 3999;

  // Vinyl (Free)
  const vinylRes = calculateLadyJusticePrice(dynamicPrice, true, 'Vinyl', 1);
  assert.equal(vinylRes.unitPrice, 3999);
  assert.equal(vinylRes.totalPrice, 3999);

  // Plastic (+₹29)
  const plasticRes = calculateLadyJusticePrice(dynamicPrice, true, 'Plastic', 1);
  assert.equal(plasticRes.unitPrice, 4028); // 3999 + 29
  assert.equal(plasticRes.totalPrice, 4028);

  // MDF (+₹49)
  const mdfRes = calculateLadyJusticePrice(dynamicPrice, true, 'MDF', 2);
  assert.equal(mdfRes.unitPrice, 4048); // 3999 + 49
  assert.equal(mdfRes.totalPrice, 8096); // (3999 + 49) * 2
});

test('Dynamic Pricing 5: syncCustomForgeCartPrices updates cart item prices when Admin changes variant price', async () => {
  installBrowser();
  installFetch(() => ({
    status: 200,
    body: {
      success: true,
      data: {
        variants: [
          { id: 1, variant_sku: 'MRSH-CF-LJ-6IN', price_rupees: 2199, price: 219900 },
          { id: 2, variant_sku: 'MRSH-CF-LJ-1FT', price_rupees: 3999, price: 399900 },
          { id: 3, variant_sku: 'MRSH-CF-LJ-2FT', price_rupees: 6499, price: 649900 }
        ]
      }
    }
  }));

  const {
    saveLocalCart,
    syncCustomForgeCartPrices,
    getLocalCart
  } = await loadModule('src/lib/api/cart.ts');

  // Customer added 1ft with MFD at old price (3699 + 49 = 3748)
  const initialCartItem = {
    id: 'cf-cart-item-1',
    productId: 2,
    name: 'Lady Justice',
    price: 3748,
    quantity: 1,
    imageUrl: '/test.png',
    options: {
      is_custom_forge: true,
      variant_id: 'cf-lj-1ft',
      variant_key: 'cf-lj-1ft',
      custom_mode_enabled: true,
      nameplate_material: 'MDF',
      base_price: 3699,
      unit_price: 3748
    }
  };

  saveLocalCart([initialCartItem]);

  // When live backend returns updated prices (3999 + 49 = 4048)
  const { items, hasChanged } = await syncCustomForgeCartPrices([initialCartItem]);
  assert.equal(hasChanged, true, 'Cart must detect and apply price change');
  assert.equal(items[0].price, 4048, 'Item price must update to 3999 + 49');
  assert.equal(items[0].options.base_price, 3999, 'Base price option must update');
  assert.equal(items[0].options.unit_price, 4048, 'Unit price option must update');

  // Verify updated cart persisted in storage
  const persisted = getLocalCart();
  assert.equal(persisted[0].price, 4048);
});
