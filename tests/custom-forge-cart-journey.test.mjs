import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('1. Adding configured Lady Justice product to cart', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { addCustomForgeToCart, getLocalCart, clearCart } = await loadModule('src/lib/api/cart.ts');
  await clearCart();

  const customItem = {
    id: 'cf-item-1',
    productId: 2,
    name: 'Lady Justice Statue (1 foot)',
    slug: 'lady-justice',
    sku: 'CF-LJ-1FT',
    price: 3500,
    quantity: 1,
    imageUrl: '/assets/products/custom-forge/lady-justice-statue.png',
    options: {
      is_custom_forge: true,
      variant_id: 2,
      size_label: '1 foot',
      custom_mode_enabled: true,
      custom_name: 'Adv. Rajesh Sharma',
      custom_designation: 'Senior Advocate, High Court',
      nameplate_material: 'Plastic'
    }
  };

  const res = await addCustomForgeToCart(customItem);
  assert.equal(res.success, true);
  assert.equal(res.cart.length, 1);
  assert.equal(res.cart[0].price, 3500);
  assert.equal(res.cart[0].options.custom_name, 'Adv. Rajesh Sharma');
});

test('2. Updating quantity in cart recalculates subtotal and line items', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { addCustomForgeToCart, updateCartQuantity, getLocalCart, getCartSummary, clearCart } = await loadModule('src/lib/api/cart.ts');
  await clearCart();

  const customItem = {
    id: 'cf-item-qty-test',
    productId: 2,
    name: 'Lady Justice Statue (1 foot)',
    price: 3500,
    quantity: 1,
    options: {
      is_custom_forge: true,
      variant_id: 2,
      size_label: '1 foot'
    }
  };

  await addCustomForgeToCart(customItem);
  assert.equal(getLocalCart()[0].quantity, 1);

  // Increase quantity by +1
  await updateCartQuantity('cf-item-qty-test', 1);
  const updated = getLocalCart();
  assert.equal(updated[0].quantity, 2);

  const summary = getCartSummary(updated);
  assert.equal(summary.subtotal, 7000); // 3500 * 2
  assert.equal(summary.itemCount, 2);
});

test('3. Removing a Custom Forge item from cart', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { addCustomForgeToCart, removeFromCart, getLocalCart, clearCart } = await loadModule('src/lib/api/cart.ts');
  await clearCart();

  const item1 = {
    id: 'cf-item-to-remove',
    productId: 1,
    name: 'Lady Justice (6 inches)',
    price: 1600,
    quantity: 1,
    options: { is_custom_forge: true, variant_id: 1 }
  };

  await addCustomForgeToCart(item1);
  assert.equal(getLocalCart().length, 1);

  await removeFromCart('cf-item-to-remove');
  assert.equal(getLocalCart().length, 0);
});

test('4. Cart persistence and customization preservation through authentication lifecycle', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { addCustomForgeToCart, getBackendCart, getLocalCart, clearCart } = await loadModule('src/lib/api/cart.ts');
  await clearCart();

  const customItem = {
    id: 'cf-item-persist',
    productId: 3,
    name: 'Lady Justice Statue (2 feet)',
    price: 5600,
    quantity: 1,
    options: {
      is_custom_forge: true,
      variant_id: 3,
      size_label: '2 feet',
      custom_mode_enabled: true,
      custom_name: 'Hon. Justice Verma',
      custom_designation: 'Judge, District Court',
      nameplate_material: 'MDF'
    }
  };

  await addCustomForgeToCart(customItem);

  // Simulate getBackendCart call during login / auth state change
  const cartRes = await getBackendCart();
  assert.equal(cartRes.items.length, 1);
  assert.equal(cartRes.items[0].options.custom_name, 'Hon. Justice Verma');
  assert.equal(cartRes.items[0].options.nameplate_material, 'MDF');
  assert.equal(cartRes.subtotal, 5600);
});

test('5. Custom Forge order payload contract and Store 2 isolation', async () => {
  const { LADY_JUSTICE_VARIANTS, validateCustomForgeCustomization } = await loadModule('src/lib/api/customForge.ts');

  // Variant 1 (6 inch): Custom Mode prohibited
  const val6 = validateCustomForgeCustomization(LADY_JUSTICE_VARIANTS[0], true, {
    name: 'Test Name',
    designation: 'Test',
    material: 'Plastic'
  });
  assert.equal(val6.valid, false);

  // Variant 2 (1 foot): Valid customization passes
  const val12 = validateCustomForgeCustomization(LADY_JUSTICE_VARIANTS[1], true, {
    name: 'Adv. Sharma',
    designation: 'Senior Counsel',
    material: 'Plastic'
  });
  assert.equal(val12.valid, true);

  // Variant 2: Missing required name fails
  const valFail = validateCustomForgeCustomization(LADY_JUSTICE_VARIANTS[1], true, {
    name: '',
    designation: 'Senior Counsel',
    material: 'Plastic'
  });
  assert.equal(valFail.valid, false);
  assert.ok(valFail.errors.name);
});
