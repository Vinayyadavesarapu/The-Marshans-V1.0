import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('1. Three Nameplate Material Options & Authoritative Pricing Constants', async () => {
  const {
    LADY_JUSTICE_CUSTOMIZATION_PRICING,
    LADY_JUSTICE_MATERIAL_LABELS,
    LADY_JUSTICE_VARIANTS,
    calculateLadyJusticePrice
  } = await loadModule('src/lib/api/customForge.ts');

  // Authoritative constants
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.VINYL_RUPEES, 0, 'Vinyl Sticker must be ₹0 (FREE)');
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.PLASTIC_RUPEES, 29, 'Precision Polymer (Plastic) must be +₹29');
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.MFD_RUPEES, 49, 'MFD Engraving (Wooden Board) must be +₹49');
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.NAME_FREE, 0, 'Adding a name is FREE');
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.DESIGNATION_FREE, 0, 'Adding a designation is FREE');
  assert.equal(LADY_JUSTICE_CUSTOMIZATION_PRICING.SECOND_PERSON_FREE, 0, 'Adding a second person is FREE');

  // Exact approved customer-facing labels
  assert.equal(LADY_JUSTICE_MATERIAL_LABELS.Vinyl, 'Vinyl Sticker');
  assert.equal(LADY_JUSTICE_MATERIAL_LABELS.Plastic, 'Precision Polymer (Plastic)');
  assert.equal(LADY_JUSTICE_MATERIAL_LABELS.MDF, 'MFD Engraving (Wooden Board)');

  // Base editions
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

test('2. Default Selection (Vinyl Sticker) & Material Switching Calculations', async () => {
  const { calculateLadyJusticePrice, LADY_JUSTICE_VARIANTS } = await loadModule('src/lib/api/customForge.ts');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');
  const v2ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '2 feet');

  // --- 1 FOOT EDITION (Base ₹3,699) ---
  // Default: Vinyl Sticker (FREE) -> ₹3,699
  const v1_vinyl = calculateLadyJusticePrice(v1ft.price, true, 'Vinyl', 1);
  assert.equal(v1_vinyl.materialCharge, 0, 'Vinyl Sticker is ₹0');
  assert.equal(v1_vinyl.nameplateCharge, 0, 'Nameplate text is ₹0');
  assert.equal(v1_vinyl.unitPrice, 3699, '1ft + Vinyl = ₹3,699');
  assert.equal(v1_vinyl.totalPrice, 3699);

  // Switch to Plastic -> ₹3,728 (3699 + 29)
  const v1_plastic = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(v1_plastic.materialCharge, 29);
  assert.equal(v1_plastic.unitPrice, 3728);
  assert.equal(v1_plastic.totalPrice, 3728);

  // Switch to MFD -> ₹3,748 (3699 + 49)
  const v1_mfd = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  assert.equal(v1_mfd.materialCharge, 49);
  assert.equal(v1_mfd.unitPrice, 3748);
  assert.equal(v1_mfd.totalPrice, 3748);

  // Switch back to Vinyl -> ₹3,699
  const v1_vinyl_back = calculateLadyJusticePrice(v1ft.price, true, 'Vinyl', 1);
  assert.equal(v1_vinyl_back.unitPrice, 3699);

  // --- 2 FEET EDITION (Base ₹5,999) ---
  // Default: Vinyl Sticker (FREE) -> ₹5,999
  const v2_vinyl = calculateLadyJusticePrice(v2ft.price, true, 'Vinyl', 1);
  assert.equal(v2_vinyl.unitPrice, 5999);
  assert.equal(v2_vinyl.totalPrice, 5999);

  // Plastic -> ₹6,028 (5999 + 29)
  const v2_plastic = calculateLadyJusticePrice(v2ft.price, true, 'Plastic', 1);
  assert.equal(v2_plastic.unitPrice, 6028);

  // MFD -> ₹6,048 (5999 + 49)
  const v2_mfd = calculateLadyJusticePrice(v2ft.price, true, 'MDF', 1);
  assert.equal(v2_mfd.unitPrice, 6048);
});

test('3. Free Names, Designations, and Second Person personalization across all materials', async () => {
  const { calculateLadyJusticePrice, LADY_JUSTICE_VARIANTS } = await loadModule('src/lib/api/customForge.ts');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');

  // Single person vs two people with Vinyl
  const p1_vinyl = calculateLadyJusticePrice(v1ft.price, true, 'Vinyl', 1);
  const p2_vinyl = calculateLadyJusticePrice(v1ft.price, true, 'Vinyl', 1);
  assert.equal(p1_vinyl.unitPrice, 3699);
  assert.equal(p2_vinyl.unitPrice, 3699, 'Second person must be ₹0 (FREE)');

  // Single person vs two people with Plastic
  const p1_plastic = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  const p2_plastic = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 1);
  assert.equal(p1_plastic.unitPrice, 3728);
  assert.equal(p2_plastic.unitPrice, 3728, 'Second person must be ₹0 (FREE)');

  // Single person vs two people with MFD
  const p1_mfd = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  const p2_mfd = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 1);
  assert.equal(p1_mfd.unitPrice, 3748);
  assert.equal(p2_mfd.unitPrice, 3748, 'Second person must be ₹0 (FREE)');
});

test('4. Quantity Multiplier: (Edition Price + Material Charge) × Quantity', async () => {
  const { calculateLadyJusticePrice, LADY_JUSTICE_VARIANTS } = await loadModule('src/lib/api/customForge.ts');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');
  const v2ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '2 feet');

  // 1 foot + Vinyl Sticker @ Qty 3: 3699 * 3 = 11,097
  const q_vinyl = calculateLadyJusticePrice(v1ft.price, true, 'Vinyl', 3);
  assert.equal(q_vinyl.unitPrice, 3699);
  assert.equal(q_vinyl.totalPrice, 11097);

  // 1 foot + Plastic @ Qty 2: (3699 + 29) * 2 = 3728 * 2 = 7,456
  const q_plastic = calculateLadyJusticePrice(v1ft.price, true, 'Plastic', 2);
  assert.equal(q_plastic.unitPrice, 3728);
  assert.equal(q_plastic.totalPrice, 7456);

  // 1 foot + MFD @ Qty 4: (3699 + 49) * 4 = 3748 * 4 = 14,992
  const q_mfd = calculateLadyJusticePrice(v1ft.price, true, 'MDF', 4);
  assert.equal(q_mfd.unitPrice, 3748);
  assert.equal(q_mfd.totalPrice, 14992);

  // 2 feet + MFD @ Qty 2: (5999 + 49) * 2 = 6048 * 2 = 12,096
  const q2_mfd = calculateLadyJusticePrice(v2ft.price, true, 'MDF', 2);
  assert.equal(q2_mfd.unitPrice, 6048);
  assert.equal(q2_mfd.totalPrice, 12096);
});

test('5. Customization Validation: accepts Vinyl, Plastic, MDF; rejects invalid materials', async () => {
  const { validateCustomForgeCustomization, LADY_JUSTICE_VARIANTS } = await loadModule('src/lib/api/customForge.ts');
  const v1ft = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '1 foot');
  const v6in = LADY_JUSTICE_VARIANTS.find(v => v.sizeLabel === '6 inches');

  // Valid Vinyl
  const valVinyl = validateCustomForgeCustomization(v1ft, true, {
    name: 'Adv. Test User',
    designation: 'High Court',
    material: 'Vinyl'
  });
  assert.equal(valVinyl.valid, true);

  // Valid Plastic
  const valPlastic = validateCustomForgeCustomization(v1ft, true, {
    name: 'Adv. Test User',
    designation: 'High Court',
    material: 'Plastic'
  });
  assert.equal(valPlastic.valid, true);

  // Valid MDF
  const valMdf = validateCustomForgeCustomization(v1ft, true, {
    name: 'Adv. Test User',
    designation: 'High Court',
    material: 'MDF'
  });
  assert.equal(valMdf.valid, true);

  // Invalid material: Aluminum
  const valInvalid = validateCustomForgeCustomization(v1ft, true, {
    name: 'Adv. Test User',
    designation: 'High Court',
    material: 'Aluminum'
  });
  assert.equal(valInvalid.valid, false);
  assert.match(valInvalid.errors.material, /select a nameplate material/i);

  // 6 inches: Custom mode disallowed
  const val6in = validateCustomForgeCustomization(v6in, true, {
    name: 'Adv. Test User',
    designation: 'High Court',
    material: 'Vinyl'
  });
  assert.equal(val6in.valid, false);
  assert.match(val6in.errors.variant, /unavailable for the 6-inch/i);
});

test('6. Cart and Order Normalization: Preserves Vinyl Sticker, Precision Polymer, and MFD Engraving', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));

  const { addCustomForgeToCart, getLocalCart, clearCart, getCartSummary } = await loadModule('src/lib/api/cart.ts');
  const { normalizeOrderItem } = await loadModule('src/lib/api/orderMapper.ts');
  await clearCart();

  // Add Item 1: Vinyl Sticker
  await addCustomForgeToCart({
    id: 'cf-cart-vinyl',
    productId: 2,
    name: 'Lady Justice Statue (1 foot)',
    slug: 'lady-justice',
    price: 3699,
    quantity: 1,
    material: 'Vinyl Sticker',
    options: {
      is_custom_forge: true,
      variant_id: 'cf-lj-1ft',
      size_label: '1 foot',
      custom_mode_enabled: true,
      custom_name: 'Adv. Vinyl Person',
      custom_designation: 'Supreme Court',
      nameplate_material: 'Vinyl',
      nameplate_material_label: 'Vinyl Sticker',
      nameplate_charge: 0,
      material_charge: 0
    }
  });

  // Add Item 2: Precision Polymer (+₹29)
  await addCustomForgeToCart({
    id: 'cf-cart-plastic',
    productId: 2,
    name: 'Lady Justice Statue (1 foot)',
    slug: 'lady-justice',
    price: 3728,
    quantity: 1,
    material: 'Precision Polymer (Plastic)',
    options: {
      is_custom_forge: true,
      variant_id: 'cf-lj-1ft',
      size_label: '1 foot',
      custom_mode_enabled: true,
      custom_name: 'Adv. Plastic Person',
      custom_designation: 'High Court',
      nameplate_material: 'Plastic',
      nameplate_material_label: 'Precision Polymer (Plastic)',
      nameplate_charge: 0,
      material_charge: 29
    }
  });

  // Add Item 3: MFD Engraving (+₹49)
  await addCustomForgeToCart({
    id: 'cf-cart-mdf',
    productId: 3,
    name: 'Lady Justice Statue (2 feet)',
    slug: 'lady-justice',
    price: 6048,
    quantity: 1,
    material: 'MFD Engraving (Wooden Board)',
    options: {
      is_custom_forge: true,
      variant_id: 'cf-lj-2ft',
      size_label: '2 feet',
      custom_mode_enabled: true,
      custom_name: 'Justice MDF Person',
      custom_designation: 'Bench Hall',
      nameplate_material: 'MDF',
      nameplate_material_label: 'MFD Engraving (Wooden Board)',
      nameplate_charge: 0,
      material_charge: 49
    }
  });

  const cart = getLocalCart();
  assert.equal(cart.length, 3);
  const summary = getCartSummary(cart);
  // Total: 3,699 + 3,728 + 6,048 = 13,475
  assert.equal(summary.subtotal, 13475);

  // Normalize order item checks
  const normVinyl = normalizeOrderItem({
    unit_price: 3699,
    quantity: 1,
    name: 'Lady Justice (1 foot)',
    nameplate_material: 'Vinyl',
    customization: { name: 'Adv. Test', designation: 'Advocate', material: 'Vinyl' }
  });
  assert.equal(normVinyl.base_price, 3699);
  assert.equal(normVinyl.nameplate_material, 'Vinyl');
  assert.equal(normVinyl.nameplate_material_label, 'Vinyl Sticker');

  const normPlastic = normalizeOrderItem({
    unit_price: 3728,
    quantity: 1,
    name: 'Lady Justice (1 foot)',
    nameplate_material: 'Plastic',
    customization: { name: 'Adv. Test', designation: 'Advocate', material: 'Plastic' }
  });
  assert.equal(normPlastic.base_price, 3699);
  assert.equal(normPlastic.material_charge, 29);
  assert.equal(normPlastic.nameplate_material_label, 'Precision Polymer (Plastic)');

  const normMdf = normalizeOrderItem({
    unit_price: 6048,
    quantity: 1,
    name: 'Lady Justice (2 feet)',
    nameplate_material: 'MDF',
    customization: { name: 'Justice Test', designation: 'High Court', material: 'MDF' }
  });
  assert.equal(normMdf.base_price, 5999);
  assert.equal(normMdf.material_charge, 49);
  assert.equal(normMdf.nameplate_material_label, 'MFD Engraving (Wooden Board)');
});

test('7. LadyJusticePurchase UI Source Verification: 3 options with default Vinyl Sticker and dynamic craft section', () => {
  const compPath = resolve('src/components/react/LadyJusticePurchase.tsx');
  const src = readFileSync(compPath, 'utf8');

  // Default state is Vinyl
  assert.match(src, /useState<'Vinyl' \| 'Plastic' \| 'MDF'>\('Vinyl'\)/, 'Default nameplateMaterial state must be "Vinyl"');

  // Exact names in the 3 options
  assert.match(src, />Vinyl Sticker</, 'Must render "Vinyl Sticker" button');
  assert.match(src, />Precision Polymer \(Plastic\)</, 'Must render "Precision Polymer (Plastic)" button');
  assert.match(src, />MFD Engraving \(Wooden Board\)</, 'Must render "MFD Engraving (Wooden Board)" button');

  // Badges
  assert.match(src, /material-price-badge free">FREE</, 'Vinyl Sticker must have FREE badge');
  assert.match(src, /\+₹29/, 'Precision Polymer must have +₹29 badge');
  assert.match(src, /\+₹49/, 'MFD Engraving must have +₹49 badge');

  // Textures in mounted preview
  assert.match(src, /vinyl-texture/, 'Must define vinyl-texture for preview');
  assert.match(src, /polymer-texture/, 'Must define polymer-texture for preview');
  assert.match(src, /mdf-texture/, 'Must define mdf-texture for preview');

  // Dynamic craftsmanship section strictly preserved
  assert.match(src, /PREMIUM RESIN MATERIAL/, 'Must preserve 6-inch Resin craftsmanship info');
  assert.match(src, /PLA MATERIAL/, 'Must preserve 1-foot & 2-feet PLA craftsmanship info');

  // No addition below Add to Cart button
  const afterCta = src.substring(src.indexOf('add-to-cart-primary-btn'));
  assert.doesNotMatch(afterCta, /<section|<footer|<article/i, 'Nothing must be placed below Add to Cart button');
});

test('8. Weight Information & Homepage Price Removal Verification', () => {
  const compPath = resolve('src/components/react/LadyJusticePurchase.tsx');
  const src = readFileSync(compPath, 'utf8');

  // FREE badge removed from Personalized Nameplate heading
  assert.doesNotMatch(src, /<strong className="toggle-title">Personalized Nameplate<\/strong>\s*<span className="toggle-price-tag free">/, 'FREE badge must be removed from Personalized Nameplate heading');

  // Weight references present for 6 inches, 1 foot, and 2 feet
  assert.match(src, /400 grams/, 'Must reference 400 grams for 6 inches');
  assert.match(src, /1 kg/, 'Must reference 1 kg for 1 foot');
  assert.match(src, /2 kg/, 'Must reference 2 kg for 2 feet');
  assert.match(src, /edition-spec-summary-bar/, 'Must render edition live specifications bar');

  // Homepage prices and edition specifications section completely removed
  const homePath = resolve('src/pages/index.astro');
  const homeSrc = readFileSync(homePath, 'utf8');
  assert.doesNotMatch(homeSrc, /₹1,999/, 'Homepage must not display ₹1,999');
  assert.doesNotMatch(homeSrc, /₹3,699/, 'Homepage must not display ₹3,699');
  assert.doesNotMatch(homeSrc, /₹5,999/, 'Homepage must not display ₹5,999');
  assert.doesNotMatch(homeSrc, /Available Editions/, 'Homepage must not contain Available Editions block');
  assert.doesNotMatch(homeSrc, /editions-grid/, 'Homepage must not contain editions-grid');
  assert.doesNotMatch(homeSrc, /edition-card/, 'Homepage must not contain edition-card');

  // Homepage labels: 6 inches, 1 ft, 2 ft
  assert.match(homeSrc, /<span class="summary-edition-tag">6 inches<\/span>/, 'Homepage must have 6 inches label');
  assert.match(homeSrc, /<span class="summary-edition-tag">1 ft<\/span>/, 'Homepage must have 1 ft label');
  assert.match(homeSrc, /<span class="summary-edition-tag">2 ft<\/span>/, 'Homepage must have 2 ft label');
});
