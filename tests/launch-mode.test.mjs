import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LAUNCH_MODE,
  isCustomForgeOnly,
  getNavItems,
  getLogoHref,
  isRouteAllowed,
  CUSTOM_FORGE_SEARCH_PRODUCTS,
  CUSTOM_FORGE_SEARCH_SUGGESTIONS,
  RETAIL_NAV_ITEMS,
  CUSTOM_FORGE_NAV_ITEMS
} from '../src/config/launchMode.ts';
import { generateHtaccessContent } from '../src/lib/server/htaccessGenerator.ts';
import {
  LADY_JUSTICE_VARIANTS,
  validateCustomForgeCustomization,
  getCustomForgeBackendStatus
} from '../src/lib/api/customForge.ts';

function read(relPath) {
  return readFileSync(resolve(relPath), 'utf8');
}

test('1. LAUNCH MODE CONFIGURATION: Single Source of Truth & Toggleability', () => {
  assert.equal(LAUNCH_MODE, 'CUSTOM_FORGE_ONLY', 'Default launch mode is CUSTOM_FORGE_ONLY');
  assert.equal(isCustomForgeOnly('CUSTOM_FORGE_ONLY'), true, 'isCustomForgeOnly returns true for CUSTOM_FORGE_ONLY');
  assert.equal(isCustomForgeOnly('RETAIL'), false, 'isCustomForgeOnly returns false for RETAIL');

  // Route permission checks in CUSTOM_FORGE_ONLY mode
  assert.equal(isRouteAllowed('/', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/shop', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/custom-3d', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/product/lady-justice/', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/cart', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/checkout', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/account', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/terms-and-conditions', 'CUSTOM_FORGE_ONLY'), true);
  assert.equal(isRouteAllowed('/categories/lumo', 'CUSTOM_FORGE_ONLY'), false);
  assert.equal(isRouteAllowed('/product/cute-lamp', 'CUSTOM_FORGE_ONLY'), false);

  // In RETAIL mode, all routes are allowed
  assert.equal(isRouteAllowed('/shop', 'RETAIL'), true);
  assert.equal(isRouteAllowed('/categories/lumo', 'RETAIL'), true);
  assert.equal(isRouteAllowed('/product/cute-lamp', 'RETAIL'), true);
});

test('2. NAVIGATION: Navigation includes Home, Lady Justice, and Orders & Tracking (Shop removed)', () => {
  const launchNav = getNavItems('CUSTOM_FORGE_ONLY');
  const launchLabels = launchNav.map((n) => n.label);
  assert.deepEqual(launchNav, CUSTOM_FORGE_NAV_ITEMS);
  assert.ok(launchLabels.includes('Home'), 'Home link present in navigation');
  assert.ok(!launchLabels.includes('Shop'), 'Shop link removed from navigation');
  assert.ok(launchLabels.includes('Lady Justice'), 'Lady Justice link present in navigation');
  assert.ok(launchLabels.includes('Orders & Tracking'), 'Orders & Tracking link present in navigation');
  assert.ok(!launchLabels.includes('LUMO'), 'LUMO link hidden in launch mode');
  assert.ok(!launchLabels.includes('Fandom Tribe'), 'Fandom Tribe link hidden in launch mode');

  // Retail mode restoration
  const retailNav = getNavItems('RETAIL');
  const retailLabels = retailNav.map((n) => n.label);
  assert.deepEqual(retailNav, RETAIL_NAV_ITEMS);
  assert.ok(retailLabels.includes('Home'), 'Home restored in retail mode');
  assert.ok(retailLabels.includes('LUMO'), 'LUMO restored in retail mode');
  assert.ok(retailLabels.includes('Fandom Tribe'), 'Fandom Tribe restored in retail mode');
  assert.ok(retailLabels.includes('Mini Tales'), 'Mini Tales restored in retail mode');
  assert.ok(retailLabels.includes('Utility Co.'), 'Utility Co. restored in retail mode');
  assert.ok(retailLabels.includes('Darshanam'), 'Darshanam restored in retail mode');
  assert.ok(retailLabels.includes('Custom Forge'), 'Custom Forge retained in retail mode');
});

test('3. LOGO DESTINATION: Points to / for homepage in both modes', () => {
  assert.equal(getLogoHref('CUSTOM_FORGE_ONLY'), '/', 'Logo links to / during launch mode');
  assert.equal(getLogoHref('RETAIL'), '/', 'Logo links to / during RETAIL mode');

  const navbar = read('src/components/react/MarshansNavbar.tsx');
  assert.match(navbar, /const logoHref = getLogoHref\(\)/, 'MarshansNavbar consumes getLogoHref()');
});

test('4. SEARCH ISOLATION: Custom Forge indexed only; zero retail leakage in launch mode', () => {
  const searchModal = read('src/components/react/SearchModal.jsx');
  assert.match(searchModal, /isCustomForgeOnly\(\)/, 'SearchModal checks launch mode');
  assert.match(searchModal, /CUSTOM_FORGE_SEARCH_PRODUCTS/, 'Consumes Custom Forge search dataset');

  // Lady Justice product in launch search
  const lj = CUSTOM_FORGE_SEARCH_PRODUCTS.find((p) => p.slug === 'lady-justice');
  assert.ok(lj, 'Lady Justice exists in Custom Forge search dataset');
  assert.equal(lj.name, 'Lady Justice');
  assert.ok(lj.keywords.includes('statue'), 'Contains statue keyword');
  assert.ok(lj.keywords.includes('sculpture'), 'Contains sculpture keyword');
  assert.ok(lj.keywords.includes('law'), 'Contains law keyword');
  assert.ok(lj.keywords.includes('nameplate'), 'Contains nameplate keyword');

  // Retail suggestions not shown in launch mode
  assert.ok(!CUSTOM_FORGE_SEARCH_SUGGESTIONS.includes('Lumo Lamp'), 'Lumo Lamp excluded from launch suggestions');
  assert.ok(!CUSTOM_FORGE_SEARCH_SUGGESTIONS.includes('Fandom Statues'), 'Fandom Statues excluded from launch suggestions');
});

test('5. DIRECT URL PROTECTION: Route guards protect retail catalog while homepage is active', () => {
  // index.astro: active focused Coming Soon & Lady Justice homepage
  const indexPage = read('src/pages/index.astro');
  assert.match(indexPage, /hero-coming-soon-section/, 'index.astro features Coming Soon hero');
  assert.match(indexPage, /Lady Justice Statue/, 'index.astro features Lady Justice');
  assert.ok(!indexPage.includes('home-hero-section'), 'Hero section removed');
  assert.ok(!indexPage.includes('what-we-do-section'), 'What We Do section removed');
  assert.ok(!indexPage.includes('industrial-section'), 'Industrial section removed');

  // shop.astro: redirects to Lady Justice in launch mode, retains retail catalog
  const shopPage = read('src/pages/shop.astro');
  assert.match(shopPage, /if \(isCustomForgeOnly\(\)\) \{\s*return Astro\.redirect\('\/product\/lady-justice\/', 302\);\s*\}/, 'shop.astro redirects to /product/lady-justice/');
  assert.match(shopPage, /<ShopCatalog/, 'retains original retail ShopCatalog');

  // categories/[slug].astro: redirects retail categories to Lady Justice
  const catPage = read('src/pages/categories/[slug].astro');
  assert.match(catPage, /if \(isCustomForgeOnly\(\)\) \{\s*return Astro\.redirect\('\/product\/lady-justice\/', 302\);\s*\}/, 'categories/[slug].astro redirects to /product/lady-justice/');
  assert.match(catPage, /<CollectionPage/, 'retains original retail CollectionPage');

  // product/[slug].astro: redirects retail products to /product/lady-justice/
  const prodPage = read('src/pages/product/[slug].astro');
  assert.match(prodPage, /if \(isCustomForgeOnly\(\)\) \{\s*return Astro\.redirect\('\/product\/lady-justice\/', 302\);\s*\}/, 'product/[slug].astro redirects to /product/lady-justice/');
  assert.match(prodPage, /<ProductDetailPage/, 'retains original retail ProductDetailPage');
});

test('6. LADY JUSTICE VARIANTS & PRICING: Exact 3 sizes with GST inclusive pricing', () => {
  assert.equal(LADY_JUSTICE_VARIANTS.length, 3, 'Exactly 3 size editions');

  const v6in = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '6 inches');
  assert.ok(v6in, '6 inches variant exists');
  assert.equal(v6in.price, 1600, '6 inches price is ₹1,600');
  assert.equal(v6in.customModeAllowed, false, '6 inches Custom Mode is unavailable');

  const v1ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '1 foot');
  assert.ok(v1ft, '1 foot variant exists');
  assert.equal(v1ft.price, 3500, '1 foot price is ₹3,500');
  assert.equal(v1ft.customModeAllowed, true, '1 foot Custom Mode is allowed');

  const v2ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '2 feet');
  assert.ok(v2ft, '2 feet variant exists');
  assert.equal(v2ft.price, 5600, '2 feet price is ₹5,600');
  assert.equal(v2ft.customModeAllowed, true, '2 feet Custom Mode is allowed');
});

test('7. CUSTOM MODE VALIDATION RULES: 35/50 char limits, NIL accepted, Plastic/MDF required', () => {
  const v1ft = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '1 foot');
  const v6in = LADY_JUSTICE_VARIANTS.find((v) => v.sizeLabel === '6 inches');

  // When Custom Mode is disabled, no fields are required
  const resDisabled = validateCustomForgeCustomization(v1ft, false, {});
  assert.equal(resDisabled.valid, true);

  // 6-inch cannot enable Custom Mode
  const res6in = validateCustomForgeCustomization(v6in, true, { name: 'Valid Name', designation: 'Lawyer', material: 'Plastic' });
  assert.equal(res6in.valid, false);
  assert.ok(res6in.errors.variant);

  // Empty fields when Custom Mode enabled -> name, designation & material required (literal NIL accepted for designation)
  const resEmpty = validateCustomForgeCustomization(v1ft, true, {});
  assert.equal(resEmpty.valid, false);
  assert.ok(resEmpty.errors.name);
  assert.ok(resEmpty.errors.designation, 'Designation is required (or enter NIL)');
  assert.ok(resEmpty.errors.material);

  // Name > 35 characters -> invalid
  const resLongName = validateCustomForgeCustomization(v1ft, true, {
    name: 'A'.repeat(36),
    designation: 'Judge',
    material: 'Plastic'
  });
  assert.equal(resLongName.valid, false);
  assert.match(resLongName.errors.name, /35 characters/);

  // Designation > 50 characters -> invalid
  const resLongDesig = validateCustomForgeCustomization(v1ft, true, {
    name: 'Hon. Justice Kumar',
    designation: 'B'.repeat(51),
    material: 'Plastic'
  });
  assert.equal(resLongDesig.valid, false);
  assert.match(resLongDesig.errors.designation, /50 characters/);

  // Literal "NIL" as designation -> valid
  const resNil = validateCustomForgeCustomization(v1ft, true, {
    name: 'Advocate Verma',
    designation: 'NIL',
    material: 'MDF'
  });
  assert.equal(resNil.valid, true);
  assert.equal(Object.keys(resNil.errors).length, 0);

  // Valid Plastic material -> valid
  const resPlastic = validateCustomForgeCustomization(v1ft, true, {
    name: 'Chief Justice',
    designation: 'Supreme Court of India',
    material: 'Plastic'
  });
  assert.equal(resPlastic.valid, true);
});

test('8. CHECKOUT SAFETY: No retail orders created while dedicated backend queue is pending', async () => {
  const status = await getCustomForgeBackendStatus();
  assert.equal(status.operational, false, 'Reports operational: false');
  assert.equal(status.migrationExecuted, false, 'Reports migrationExecuted: false');
  assert.match(status.message, /temporarily paused/, 'Provides professional paused notice');

  const ljPurchase = read('src/components/react/LadyJusticePurchase.tsx');
  // Standard cart journey: does NOT import retail cart addToCart or retail createOrder
  assert.doesNotMatch(ljPurchase, /\baddToCart\(/, 'LadyJusticePurchase does NOT call retail addToCart');
  assert.doesNotMatch(ljPurchase, /\bcreateOrder\(/, 'LadyJusticePurchase does NOT call retail createOrder');
  assert.match(ljPurchase, /addCustomForgeToCart\(/, 'LadyJusticePurchase uses dedicated custom forge cart');
  assert.match(ljPurchase, /Added to Your Shopping Bag/, 'Mounts Add to Bag confirmation to shopper');
});

test('9. HOSTINGER .HTACCESS GENERATOR: 302 temporary redirects, no loops, product rewrite intact', () => {
  // Test launch mode generated .htaccess
  const launchHt = generateHtaccessContent('CUSTOM_FORGE_ONLY');
  assert.doesNotMatch(launchHt, /RewriteRule \^\$ \/product\/lady-justice\//, 'Does NOT redirect bare root / so homepage is served');
  assert.match(launchHt, /RewriteRule \^custom-3d\/\?\$ \/product\/lady-justice\/ \[R=302,L\]/, 'Redirects /custom-3d via 302');
  assert.match(launchHt, /RewriteRule \^shop\/\?\$ \/product\/lady-justice\/ \[R=302,L\]/, 'Redirects /shop via 302');
  assert.match(launchHt, /RewriteRule \^categories\/\.\*\$ \/product\/lady-justice\/ \[R=302,L\]/, 'Redirects retail categories via 302');
  assert.match(launchHt, /RewriteRule \^product\/\(\?!lady-justice\)\[\^\/\]\+\/\?\$ \/product\/lady-justice\/ \[R=302,L\]/, 'Redirects retail products via 302 without touching lady-justice');
  assert.match(launchHt, /RewriteRule \^product\/\(\[\^\/\]\+\)\/\?\$ \/product\/\?slug=\$1 \[L,QSA\]/, 'Preserves existing product runtime handler rewrite');
  assert.doesNotMatch(launchHt, /301/, 'Never uses permanent 301 redirects');

  // Test retail mode generated .htaccess
  const retailHt = generateHtaccessContent('RETAIL');
  assert.doesNotMatch(retailHt, /RewriteRule \^\$ \/custom-3d/, 'No root redirect in RETAIL mode');
  assert.doesNotMatch(retailHt, /RewriteRule \^shop/, 'No /shop redirect in RETAIL mode');
  assert.doesNotMatch(retailHt, /RewriteRule \^categories/, 'No /categories redirect in RETAIL mode');
  assert.match(retailHt, /\[RETAIL MODE ACTIVE\]/, 'Indicates RETAIL mode active');
  assert.match(retailHt, /RewriteRule \^product\/\(\[\^\/\]\+\)\/\?\$ \/product\/\?slug=\$1 \[L,QSA\]/, 'Preserves existing product runtime handler rewrite in RETAIL mode');
});

test('10. STORE & CHIPAKK ISOLATION: Store 2 isolated, Industrial Orders untouched, secrets secure', () => {
  // CHIPAKK untouched
  const clientApi = read('src/lib/api/client.ts');
  assert.match(clientApi, /X-Store-ID.*2/, 'Store 2 header strictly enforced');
  assert.match(clientApi, /X-Store-Code.*marshans/, 'Store code marshans strictly enforced');

  // RAZORPAY_KEY_SECRET value is never assigned or exposed in client bundles
  assert.equal(clientApi.includes('RAZORPAY_KEY_SECRET='), false, 'RAZORPAY_KEY_SECRET assignment never in client code');
  const paymentsApi = read('src/lib/api/payments.ts');
  assert.equal(paymentsApi.includes('RAZORPAY_KEY_SECRET='), false, 'RAZORPAY_KEY_SECRET assignment never in payments.ts');

  // Industrial Orders form exists untouched
  assert.ok(existsSync(resolve('src/components/react/IndustrialOrdersForm.tsx')), 'IndustrialOrdersForm.tsx preserved untouched');
});
