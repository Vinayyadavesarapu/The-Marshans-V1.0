import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(p), 'utf8');

test('Lady Justice image exists and is a valid transparent PNG', () => {
  const imgPath = resolve('public/assets/products/custom-forge/lady-justice-statue.png');
  assert.ok(existsSync(imgPath), 'lady-justice-statue.png exists in public assets');
  const buffer = readFileSync(imgPath);
  // PNG color type is byte offset 25; type 6 = RGBA
  assert.equal(buffer.readUInt8(25), 6, 'image is RGBA (colour type 6 with transparency)');
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
  assert.match(banner, /src="\/assets\/products\/custom-forge\/lady-justice-statue\.png"/);

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
  assert.match(page, /productTitle = 'LADY JUSTICE — THE MARSHANS \| Custom Forge'/);
  assert.match(page, /productDescription =[\s\S]*?A symbol of truth, fairness and justice\./);

  // Real product images and gallery
  assert.match(page, /productImage = LADY_JUSTICE_PRIMARY_IMAGE/);
  assert.match(page, /const LADY_JUSTICE_PRIMARY_IMAGE = '\/assets\/products\/custom-forge\/lady-justice-statue\.png'/);
  assert.match(page, /<ProductGallery/);
  assert.doesNotMatch(page, /dummy\.png/);

  // Structured Data
  assert.match(page, /'@type': 'Product'/);
  assert.match(page, /'name': 'LADY JUSTICE'/);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.match(page, /'name': 'Custom Forge'/);

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

test('Custom Forge page (/custom-3d) features Lady Justice launch showcase with static hero and sizing', () => {
  const pagePath = resolve('src/pages/custom-3d.astro');
  assert.ok(existsSync(pagePath), 'custom-3d.astro exists');
  const page = read('src/pages/custom-3d.astro');

  // Section 1: Static inner-page hero layout (homepage video hero removed)
  assert.doesNotMatch(page, /<HeroIntro/, 'removes cinematic homepage video hero from custom-3d');
  assert.match(page, /<CollectionHero client:load category=\{customForgeCategory\} \/>/, 'reuses existing inner-page hero layout');
  assert.match(page, /const CUSTOM_FORGE_HERO_IMAGE = '\/assets\/categories\/custom-forge\/hero\.webp'/, 'uses easily replaceable static hero image');

  // Section 2: Lady Justice launch showcase
  assert.match(page, /LADY JUSTICE/, 'showcases Lady Justice');
  assert.match(page, /LADY_JUSTICE_VARIANTS/, 'displays size editions and pricing');
  assert.match(page, /href="\/product\/lady-justice\/"/, 'links to /product/lady-justice/');

  // Second product is NOT shown
  assert.doesNotMatch(page, /Coming Soon|placeholder text|second product|another product/i, 'no mention or placeholder for second product');
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
