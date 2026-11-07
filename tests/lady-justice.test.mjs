import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(p), 'utf8');

test('Lady Justice image exists and is a valid transparent or truecolor PNG', () => {
  const imgPath = resolve('public/assets/products/custom-forge/name plate front.png');
  assert.ok(existsSync(imgPath), 'name plate front.png exists in public assets');
  const buffer = readFileSync(imgPath);
  // PNG magic number check
  assert.equal(buffer.slice(0, 8).toString('hex'), '89504e470d0a1a0a', 'file starts with valid PNG magic header');
  // PNG color type is byte offset 25; type 2 = RGB, type 6 = RGBA
  assert.ok([2, 6].includes(buffer.readUInt8(25)), 'image is valid PNG (Truecolor RGB or RGBA)');

  // Verify all required variant assets exist
  assert.ok(existsSync(resolve('public/assets/products/custom-forge/name plate back.png')), 'name plate back.png exists');
  assert.ok(existsSync(resolve('public/assets/products/custom-forge/6 inches front.png')), '6 inches front.png exists');
  assert.ok(existsSync(resolve('public/assets/products/custom-forge/6 inches back.png')), '6 inches back.png exists');
});

test('Homepage features Lady Justice banner strictly between New Arrivals and The Collection', () => {
  const home = read('src/pages/index.astro');
  const showcaseIndex = home.indexOf('<HomeShowcase');
  const ladyJusticeIndex = home.indexOf('<HomeLadyJusticeFeature');
  const collectionIndex = home.indexOf('The Collection</h2>');

  assert.ok(showcaseIndex > -1, 'HomeShowcase is present');
  assert.ok(ladyJusticeIndex > -1, 'HomeLadyJusticeFeature is present');
  assert.ok(collectionIndex > -1, 'The Collection heading is present');

  assert.ok(
    showcaseIndex < ladyJusticeIndex && ladyJusticeIndex < collectionIndex,
    'HomeLadyJusticeFeature is strictly between HomeShowcase and The Collection'
  );
});

test('HomeLadyJusticeFeature contains all required editorial content, compact dimensions, and CTA link', () => {
  const banner = read('src/components/home/HomeLadyJusticeFeature.astro');

  // Eyebrow
  assert.match(banner, /NEW FROM CUSTOM FORGE/, 'contains eyebrow');

  // Headline
  assert.match(banner, /LADY JUSTICE/, 'contains headline');

  // Short supporting description
  assert.match(
    banner,
    /A symbol of truth, fairness and justice\./,
    'contains exact short supporting description'
  );

  // CTA link
  assert.match(banner, /href="\/product\/lady-justice\/"/, 'CTA links to /product/lady-justice/');
  assert.match(banner, /ORDER NOW/, 'CTA button text is ORDER NOW');

  // Image source
  assert.match(banner, /src="\/assets\/products\/custom-forge\/name plate front\.png"/);

  // Proportions: compact height in 180-220px range
  assert.match(banner, /height:\s*190px/, 'card desktop height is within 180-220px target');

  // Subtle angled presentation and reduced motion
  assert.match(banner, /rotateY\(-8deg\)/, 'has subtle angled presentation');
  assert.match(banner, /prefers-reduced-motion: reduce/, 'respects reduced-motion preference');
});

test('Lady Justice product detail page satisfies routing, SEO, and structured data standards', () => {
  const pagePath = resolve('src/pages/product/lady-justice.astro');
  assert.ok(existsSync(pagePath), 'lady-justice.astro route file exists');
  const page = read('src/pages/product/lady-justice.astro');

  // SEO & Metadata
  assert.match(page, /canonicalUrl = 'https:\/\/themarshans\.shop\/product\/lady-justice\/'/);
  assert.match(page, /productTitle = 'LADY JUSTICE — THE MARSHANS \| Architectural Sculpture'/);
  assert.match(page, /productDescription =[\s\S]*?A symbol of truth, fairness and justice\./);

  // Real product images and gallery
  assert.match(page, /productImage = LADY_JUSTICE_PRIMARY_IMAGE/);
  assert.match(page, /const LADY_JUSTICE_PRIMARY_IMAGE = '\/assets\/products\/custom-forge\/name plate front\.png'/);
  assert.match(page, /<ProductGallery/);
  assert.match(page, /variantImages=\{\{/);
  assert.match(page, /'6 inches': ladyJustice6inImages/);
  assert.match(page, /'1 foot': ladyJustice1ft2ftImages/);
  assert.doesNotMatch(page, /dummy\.png/);

  // Structured Data
  assert.match(page, /'@type': 'Product'/);
  assert.match(page, /'name': 'LADY JUSTICE'/);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.match(page, /'name': 'Lady Justice'/);

  // Purchase integration island
  assert.match(page, /<LadyJusticePurchase client:load \/>/);

  // No fake prices or fake specs invented
  assert.doesNotMatch(page, /price:\s*["']?₹?\d+/, 'does not invent fake hardcoded product price in Astro page');
  assert.doesNotMatch(page, /dimensions:\s*["']?\d+/, 'does not invent fake dimensions');
});

test('LadyJusticePurchase component enforces variant selection, Custom Mode rules, and standard cart journey', () => {
  const purchase = read('src/components/react/LadyJusticePurchase.tsx');

  // Interactive variants configuration
  assert.match(purchase, /LADY_JUSTICE_VARIANTS/);
  assert.match(purchase, /validateCustomForgeCustomization/);

  // Custom Mode toggle & validation rules
  assert.match(purchase, /Personalized Nameplate/);
  assert.match(purchase, /nameplateMaterial/);
  assert.match(purchase, /maxLength=\{35\}/, 'Name max length 35 chars');
  assert.match(purchase, /maxLength=\{50\}/, 'Designation max length 50 chars');

  // Standard cart journey
  assert.match(purchase, /addCustomForgeToCart\(/, 'adds configured product to cart');
  assert.match(purchase, /Added to Your Shopping Bag/, 'shows Add to Cart confirmation toast');
  assert.match(purchase, /View Bag & Checkout/, 'links to cart view');
  assert.doesNotMatch(purchase, /createOrder\(/, 'does NOT submit to retail orders');
});

test('Custom 3D page (/custom-3d) redirects directly to Lady Justice product page', () => {
  const pagePath = resolve('src/pages/custom-3d.astro');
  assert.ok(existsSync(pagePath), 'custom-3d.astro exists');
  const page = read('src/pages/custom-3d.astro');

  assert.match(page, /Astro\.redirect\('\/product\/lady-justice\/'/, 'redirects to Lady Justice product page');
  assert.doesNotMatch(page, /Custom 3D Printing Studio/, 'removes complex custom studio from customer shopping journey');
});

test('IndustrialOrdersForm contains all 6 required fields, conditional WhatsApp logic, and exact confirmation message', () => {
  const formPath = resolve('src/components/react/IndustrialOrdersForm.tsx');
  assert.ok(existsSync(formPath), 'IndustrialOrdersForm.tsx exists');
  const form = read('src/components/react/IndustrialOrdersForm.tsx');

  // Required fields
  assert.match(form, /Full Name/);
  assert.match(form, /Company Name/);
  assert.match(form, /Phone Number/);
  assert.match(form, /Email Address/);
  assert.match(form, /Is this the same number for WhatsApp\?/);
  assert.match(form, /Product \/ Industrial Requirement Description/);

  // Conditional WhatsApp behavior
  assert.match(form, /formData\.isSameWhatsApp === 'No'/);
  assert.match(form, /whatsAppNumber:\s*choice === 'Yes'\s*\?\s*''/);

  // Exact confirmation message
  assert.match(
    form,
    /Thank you! We have received your information\. Our sales team will contact you shortly\./,
    'exact required confirmation message present'
  );

  // Prevents duplicate submissions and shows loading state
  assert.match(form, /disabled=\{isSubmitting\}/);
  assert.match(form, /Submitting Inquiry\.\.\./);
});
