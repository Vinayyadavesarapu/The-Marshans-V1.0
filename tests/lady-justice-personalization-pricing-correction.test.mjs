import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('1. Authoritative Pricing Rules: Name FREE, Designation FREE, Second Person FREE, Plastic +₹29, MFD +₹49', async () => {
  const {
    calculateLadyJusticePrice,
    LADY_JUSTICE_VARIANTS,
    LADY_JUSTICE_CUSTOMIZATION_PRICING,
    LADY_JUSTICE_MATERIAL_LABELS
  } = await loadModule('src/lib/api/customForge.ts');

  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.PLASTIC_RUPEES, 29);
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.MFD_RUPEES, 49);
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.NAME_FREE, 0);
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.DESIGNATION_FREE, 0);
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.SECOND_PERSON_FREE, 0);

  assert.equal(LADY_JUSTICE_MATERIAL_LABELS.Plastic, 'Precision Polymer (Plastic)');
  assert.equal(LADY_JUSTICE_MATERIAL_LABELS.MDF, 'MFD Engraving (Wooden Board)');

  // Variant editions
  const v6in = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '6 inches');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');
  const v2ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '2 feet');

  assert.equal(v6in.price, 1999);
  assert.equal(v6in.customModeAllowed, false);

  assert.equal(v1ft.price, 3699);
  assert.equal(v1ft.customModeAllowed, true);

  assert.equal(v2ft.price, 5999);
  assert.equal(v2ft.customModeAllowed, true);
  assert.equal(v2ft.isPopular, true, '2 feet edition must have Most Popular badge');
});

test('2. All Customization Combinations: Plastic vs MFD with 1 person, 2 people, and material switching', async () => {
  const { calculateLadyJusticePrice, LADY_JUSTICE_VARIANTS } = await loadModule('src/lib/api/customForge.ts');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');

  // Combination A: Plastic with one person
  const combA = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(combA.nameplateCharge, 0, 'Name & designation are free');
  assert.equal(combA.materialCharge, 29, 'Plastic is +₹29');
  assert.equal(combA.unitPrice, 3728, '3699 + 29 = 3728');
  assert.equal(combA.totalPrice, 3728);

  // Combination B: Plastic with two people (price MUST be identical - second person is FREE)
  const combB = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(combB.unitPrice, 3728, 'Second person does not add any extra fee');
  assert.equal(combB.totalPrice, 3728);

  // Combination C: MFD with one person
  const combC = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  assert.equal(combC.nameplateCharge, 0, 'Name & designation are free');
  assert.equal(combC.materialCharge, 49, 'MFD is +₹49');
  assert.equal(combC.unitPrice, 3748, '3699 + 49 = 3748');
  assert.equal(combC.totalPrice, 3748);

  // Combination D: MFD with two people (price MUST be identical - second person is FREE)
  const combD = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  assert.equal(combD.unitPrice, 3748, 'Second person does not add any extra fee');
  assert.equal(combD.totalPrice, 3748);

  // Switching between materials
  const switch1 = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(switch1.unitPrice, 3728);
  const switch2 = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  assert.equal(switch2.unitPrice, 3748);
  const switch3 = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(switch3.unitPrice, 3728);
});

test('3. Quantity Greater than One: Multi-unit totals with correct material multiplier', async () => {
  const { calculateLadyJusticePrice, LADY_JUSTICE_VARIANTS } = await loadModule('src/lib/api/customForge.ts');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');
  const v2ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '2 feet');

  // 1 foot + Plastic @ Qty 3: (3699 + 29) * 3 = 3728 * 3 = 11184
  const q1 = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 3);
  assert.equal(q1.unitPrice, 3728);
  assert.equal(q1.totalPrice, 11184);

  // 1 foot + MFD @ Qty 2: (3699 + 49) * 2 = 3748 * 2 = 7496
  const q2 = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 2);
  assert.equal(q2.unitPrice, 3748);
  assert.equal(q2.totalPrice, 7496);

  // 2 feet + Plastic @ Qty 2: (5999 + 29) * 2 = 6028 * 2 = 12056
  const q3 = calculateLadyJusticePrice(v2ft.price, true, 'Plastic', 2);
  assert.equal(q3.unitPrice, 6028);
  assert.equal(q3.totalPrice, 12056);

  // 2 feet + MFD @ Qty 3: (5999 + 49) * 3 = 6048 * 3 = 18144
  const q4 = calculateLadyJusticePrice(v2ft.price, true, 'MDF', 3);
  assert.equal(q4.unitPrice, 6048);
  assert.equal(q4.totalPrice, 18144);
});

test('4. Cart, Checkout, Order Normalization, and Admin snapshots with exact material labels', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));

  const { addCustomForgeToCart, getLocalCart, clearCart, getCartSummary } = await loadModule('src/lib/api/cart.ts');
  const { normalizeOrderItem } = await loadModule('src/lib/api/orderMapper.ts');
  await clearCart();

  // Add Item 1: 1-foot with Precision Polymer (Plastic)
  const cartItemPlastic = {
    id: 'cf-cart-plastic',
    productId: 2,
    name: 'Lady Justice Statue (1 feet)',
    slug: 'lady-justice',
    price: 3728,
    quantity: 1,
    material: 'Precision Polymer (Plastic)',
    options: {
      is_custom_forge: true,
      variant_id: 'cf-lj-1ft',
      size_label: '1 feet',
      custom_mode_enabled: true,
      custom_name: 'Adv. Priya Sharma',
      custom_designation: 'Senior Advocate',
      nameplate_material: 'Plastic',
      nameplate_material_label: 'Precision Polymer (Plastic)',
      nameplate_charge: 0,
      material_charge: 29
    }
  };

  // Add Item 2: 2-feet with MFD Engraving (Wooden Board) and 2 persons
  const cartItemMdf = {
    id: 'cf-cart-mdf',
    productId: 3,
    name: 'Lady Justice Statue (2 feet)',
    slug: 'lady-justice',
    price: 6048,
    quantity: 2,
    material: 'MFD Engraving (Wooden Board)',
    options: {
      is_custom_forge: true,
      variant_id: 'cf-lj-2ft',
      size_label: '2 feet',
      custom_mode_enabled: true,
      custom_name: 'Justice K. Rao',
      custom_designation: 'High Court',
      custom_second_name: 'Adv. V. Rao',
      custom_second_designation: 'NIL',
      nameplate_material: 'MDF',
      nameplate_material_label: 'MFD Engraving (Wooden Board)',
      nameplate_charge: 0,
      material_charge: 49
    }
  };

  await addCustomForgeToCart(cartItemPlastic);
  await addCustomForgeToCart(cartItemMdf);

  const localCart = getLocalCart();
  assert.equal(localCart.length, 2);

  const summary = getCartSummary(localCart);
  // Total: 3,728 * 1 + 6,048 * 2 = 3,728 + 12,096 = 15,824
  assert.equal(summary.subtotal, 15824);

  // Order Normalization / Admin snapshot test
  const normalizedItem = normalizeOrderItem({
    unit_price: 3748,
    total_price: 3748,
    quantity: 1,
    name: 'Lady Justice (1 foot)',
    customization: {
      name: 'Adv. A. Roy',
      designation: 'Advocate',
      material: 'MDF'
    }
  });

  assert.equal(normalizedItem.base_price, 3699);
  assert.equal(normalizedItem.material_charge, 49);
  assert.equal(normalizedItem.nameplate_charge, undefined, 'Nameplate charge is 0 / undefined (FREE)');
  assert.equal(normalizedItem.nameplate_material_label, 'MFD Engraving (Wooden Board)');
});

test('5. Lady Justice Template Audit: Outdated labels completely absent, exact approved labels present', () => {
  const compPath = resolve('src/components/react/LadyJusticePurchase.tsx');
  const source = readFileSync(compPath, 'utf8');

  // Forbidden outdated strings
  assert.doesNotMatch(source, /Personalized Nameplate \(\+₹29\)/, 'Must not charge +₹29 on personalized nameplate toggle');
  assert.doesNotMatch(source, /Organic Wood \/ MDF/, 'Old label "Organic Wood / MDF" must not be present');
  assert.doesNotMatch(source, /Precision Polymer \(\+₹0\)/, 'Old label "Precision Polymer (+₹0)" must not be present');
  assert.doesNotMatch(source, /included in ₹29 price/, 'Helper text must not claim name costs ₹29');

  // Exact required customer-facing labels
  assert.match(source, /Precision Polymer \(Plastic\)/, 'Must have "Precision Polymer (Plastic)"');
  assert.match(source, /MFD Engraving \(Wooden Board\)/, 'Must have "MFD Engraving (Wooden Board)"');

  // Dynamic Resin / PLA craftsmanship section strictly preserved
  assert.match(source, /lady-craft-info-section/, 'Dynamic craftsmanship section must remain intact');
  assert.match(source, /PREMIUM RESIN MATERIAL/, 'Must retain 6in Resin craftsmanship copy');
  assert.match(source, /PLA MATERIAL/, 'Must retain 1ft/2ft PLA craftsmanship copy');
});
