import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('1. Lady Justice Customization Pricing: 3 Valid Pricing States on 1-foot edition (base ₹3,500)', async () => {
  const {
    calculateLadyJusticePrice,
    validateCustomForgeCustomization,
    LADY_JUSTICE_VARIANTS
  } = await loadModule('src/lib/api/customForge.ts');

  const v1ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '1 foot');
  assert.ok(v1ft);
  assert.equal(v1ft.price, 3500);

  // State 1: No personalization (Polymer) -> ₹3,500
  const state1 = calculateLadyJusticePrice(v1ft.price, false, 'Plastic', 1);
  assert.equal(state1.nameplateCharge, 0);
  assert.equal(state1.materialCharge, 0);
  assert.equal(state1.unitPrice, 3500);
  assert.equal(state1.totalPrice, 3500);

  // State 2: Personalized Nameplate (+₹29), Polymer (+₹0) -> ₹3,529
  const state2 = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(state2.nameplateCharge, 29);
  assert.equal(state2.materialCharge, 0);
  assert.equal(state2.unitPrice, 3529);
  assert.equal(state2.totalPrice, 3529);

  // State 3: Personalized Nameplate (+₹29) + Wood/MDF (+₹50) -> ₹3,579
  const state3 = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  assert.equal(state3.nameplateCharge, 29);
  assert.equal(state3.materialCharge, 50);
  assert.equal(state3.unitPrice, 3579);
  assert.equal(state3.totalPrice, 3579);

  // State 4 (Strict Rule): Wood without personalization is NOT allowed
  const state4 = calculateLadyJusticePrice(v1ft.price, false, 'MDF', 1);
  assert.equal(state4.nameplateCharge, 0);
  assert.equal(state4.materialCharge, 0, 'Wood charge must be 0 when personalization is off');
  assert.equal(state4.unitPrice, 3500);

  const valDisallowed = validateCustomForgeCustomization(v1ft, false, { material: 'MDF' });
  assert.equal(valDisallowed.valid, false, 'Wood selection must fail validation when personalization is off');
  assert.match(valDisallowed.errors.material, /only available when Personalized Nameplate is enabled/);
});

test('2. Lady Justice Customization Pricing: Combinations on 2-feet edition (base ₹5,600)', async () => {
  const {
    calculateLadyJusticePrice,
    LADY_JUSTICE_VARIANTS
  } = await loadModule('src/lib/api/customForge.ts');

  const v2ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '2 feet');
  assert.ok(v2ft);
  assert.equal(v2ft.price, 5600);

  // No personalization -> ₹5,600
  const c1 = calculateLadyJusticePrice(v2ft.price, false, 'Plastic', 1);
  assert.equal(c1.totalPrice, 5600);

  // Nameplate (+₹29), Polymer (+₹0) -> ₹5,629
  const c2 = calculateLadyJusticePrice(v2ft.price, true, 'Plastic', 1);
  assert.equal(c2.totalPrice, 5629);

  // Nameplate (+₹29) + Wood (+₹50) -> ₹5,679
  const c3 = calculateLadyJusticePrice(v2ft.price, true, 'MDF', 1);
  assert.equal(c3.totalPrice, 5679);

  // Wood with no personalization is disallowed -> ₹5,600 (no charge)
  const c4 = calculateLadyJusticePrice(v2ft.price, false, 'MDF', 1);
  assert.equal(c4.totalPrice, 5600);
});

test('3. Lady Justice Customization Pricing: Quantity scaling formula (unitPrice * quantity)', async () => {
  const {
    calculateLadyJusticePrice,
    LADY_JUSTICE_VARIANTS
  } = await loadModule('src/lib/api/customForge.ts');

  const v1ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '1 foot');

  // Nameplate + Wood at Qty 3: (3,500 + 29 + 50) * 3 = 3,579 * 3 = ₹10,737
  const scaled = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 3);
  assert.equal(scaled.unitPrice, 3579);
  assert.equal(scaled.totalPrice, 10737);

  // Nameplate + Polymer at Qty 2: (3,500 + 29) * 2 = 3,529 * 2 = ₹7,058
  const scaledPolymer = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 2);
  assert.equal(scaledPolymer.unitPrice, 3529);
  assert.equal(scaledPolymer.totalPrice, 7058);
});

test('4. Lady Justice UI Template Audit: Complimentary tag removed, +₹29 and +₹50 badges present', () => {
  const compPath = resolve('src/components/react/LadyJusticePurchase.tsx');
  assert.ok(existsSync(compPath), 'LadyJusticePurchase.tsx exists');
  const source = readFileSync(compPath, 'utf8');

  // Must NOT contain the old Complimentary tag
  assert.doesNotMatch(source, /Complimentary/i, 'Complimentary tag must be completely removed');

  // Must display +₹29 for Personalized Nameplate
  assert.match(source, /\+₹29/, 'Must display +₹29 tag for personalized nameplate');

  // Must display +₹50 for Organic Wood / MDF
  assert.match(source, /\+₹50/, 'Must display +₹50 tag for Organic Wood / MDF');

  // Must have price breakdown near payable total
  assert.match(source, /price-breakdown-details/, 'Must contain price breakdown details wrap');
});

test('5. Shopping Cart integration: adds customized item with authoritative unit price and calculates subtotal', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));

  const {
    calculateLadyJusticePrice,
    LADY_JUSTICE_VARIANTS
  } = await loadModule('src/lib/api/customForge.ts');
  const { addCustomForgeToCart, getLocalCart, clearCart, getCartSummary } = await loadModule('src/lib/api/cart.ts');

  await clearCart();

  const v1ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '1 foot');
  const priceData = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 2); // 3,579 each, Qty 2 = 7,158

  const cartItem = {
    id: 'cf-test-item-pricing',
    productId: v1ft.backendVariantId,
    name: `Lady Justice Statue (${v1ft.sizeLabel})`,
    slug: 'lady-justice',
    price: priceData.unitPrice,
    quantity: 2,
    options: {
      is_custom_forge: true,
      variant_id: v1ft.id,
      size_label: v1ft.sizeLabel,
      custom_mode_enabled: true,
      custom_name: 'Adv. Test Pricing',
      nameplate_material: 'MDF',
      nameplate_charge: priceData.nameplateCharge,
      material_charge: priceData.materialCharge,
      customization_charge: priceData.nameplateCharge + priceData.materialCharge
    }
  };

  const res = await addCustomForgeToCart(cartItem);
  assert.equal(res.success, true);

  const localItems = getLocalCart();
  assert.equal(localItems.length, 1);
  assert.equal(localItems[0].price, 3579);
  assert.equal(localItems[0].quantity, 2);

  const summary = getCartSummary(localItems);
  assert.equal(summary.subtotal, 7158); // 3,579 * 2
  assert.equal(summary.itemCount, 2);
});
