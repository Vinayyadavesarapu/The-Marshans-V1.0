import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser } from './helpers/load.mjs';

test('1. ProductCard has NO color circles / variant dots', () => {
  const cardFilePath = resolve('src/components/react/ProductCard.tsx');
  const content = readFileSync(cardFilePath, 'utf8');

  // Verify variant dots or color circle markup are completely removed
  assert.equal(content.includes('marshans-variant-dots'), false, 'marshans-variant-dots JSX/CSS should be removed');
  assert.equal(content.includes('marshans-variant-dot'), false, 'marshans-variant-dot JSX/CSS should be removed');
  assert.equal(content.includes('selectedVariantIndex'), false, 'selectedVariantIndex state should be removed');
  assert.equal(content.includes('variantColors'), false, 'variantColors should be removed');

  // Verify essential product card elements remain intact
  assert.equal(content.includes('marshans-wishlist-btn'), true, 'Wishlist button must be preserved');
  assert.equal(content.includes('marshans-current-price'), true, 'Price display must be preserved');
  assert.equal(content.includes('marshans-cart-action-btn'), true, 'Add to cart button must be preserved');
  assert.equal(content.includes('marshans-badge-pill'), true, 'Category badge must be preserved');
});

test('2. ProductMasterView has NO hardcoded feature badges in Description tab', () => {
  const masterViewPath = resolve('src/components/react/ProductMasterView.tsx');
  const content = readFileSync(masterViewPath, 'utf8');

  // Verify hardcoded feature badges are removed
  assert.equal(content.includes('Eco-friendly materials'), false, 'Eco-friendly materials badge must be removed');
  assert.equal(content.includes('Warm ambient lighting'), false, 'Warm ambient lighting badge must be removed');
  assert.equal(content.includes('Modern minimal design'), false, 'Modern minimal design badge must be removed');
  assert.equal(content.includes('Perfect for gifting'), false, 'Perfect for gifting badge must be removed');
  assert.equal(content.includes('High-grade biopolymers'), false, 'High-grade biopolymers badge must be removed');
  assert.equal(content.includes('Diffused radiance'), false, 'Diffused radiance badge must be removed');

  // Verify dynamic product.description rendering
  assert.match(content, /product\.description/, 'Dynamic product.description must be rendered');
  assert.match(content, /empty-description/, 'Empty state fallback must be provided when description is missing');

  // Verify Specifications and Shipping tabs are preserved
  assert.equal(content.includes('SPECIFICATIONS'), true, 'Specifications tab button must be preserved');
  assert.equal(content.includes('SHIPPING & RETURNS'), true, 'Shipping & Returns tab button must be preserved');
  assert.equal(content.includes('specs-table'), true, 'Specifications table must be preserved');
  assert.equal(content.includes('pane-shipping'), true, 'Shipping pane must be preserved');
});

test('3. WebP images resolve to https://api.chipakk.shop/uploads/... without placeholder fallback issues', async () => {
  installBrowser();
  const { resolveImageUrl } = await loadModule('src/lib/utils/media.ts');

  const webpPath = '/uploads/product-1790198949772-749214484.webp';
  const resolved = resolveImageUrl(webpPath);
  assert.equal(resolved, 'https://api.chipakk.shop/uploads/product-1790198949772-749214484.webp');

  const webpRelative = 'uploads/sample.webp';
  assert.equal(resolveImageUrl(webpRelative), 'https://api.chipakk.shop/uploads/sample.webp');

  const alreadyAbsolute = 'https://api.chipakk.shop/uploads/banner.webp';
  assert.equal(resolveImageUrl(alreadyAbsolute), 'https://api.chipakk.shop/uploads/banner.webp');
});

test('4. 360° URL resolution in formatBackendProduct and conditional UI rendering', async () => {
  installBrowser();
  const { formatBackendProduct } = await loadModule('src/lib/api/products.ts');

  // When view_360_url is null (like TEST-1)
  const productNo360 = formatBackendProduct({
    id: 1,
    name: 'TEST-1',
    price: 50000,
    description: '5feet product',
    primary_image_url: '/uploads/product-1790198949772-749214484.webp',
    view_360_url: null,
    lumo_light_360_url: null
  });

  assert.equal(productNo360.view_360_url, null, 'view_360_url must be null when backend sends null');

  // When view_360_url is provided
  const productWith360 = formatBackendProduct({
    id: 2,
    name: '360 Product',
    price: 150000,
    description: 'Product with 360 view',
    primary_image_url: '/uploads/product-2.webp',
    view_360_url: '/uploads/360/spin-view'
  });

  assert.equal(
    productWith360.view_360_url,
    'https://api.chipakk.shop/uploads/360/spin-view',
    'view_360_url must be resolved via resolveImageUrl'
  );

  // When lumo_light_360_url is provided as fallback
  const productLumo360 = formatBackendProduct({
    id: 3,
    name: 'Lumo Product',
    price: 200000,
    description: 'Lumo Lamp',
    primary_image_url: '/uploads/lumo.webp',
    lumo_light_360_url: 'https://external-360.com/view/123'
  });

  assert.equal(
    productLumo360.view_360_url,
    'https://external-360.com/view/123',
    'lumo_light_360_url fallback must be supported'
  );

  // Inspect ProductMasterView to ensure 360 viewer/button is conditionally rendered ONLY when 360 exists
  const masterViewContent = readFileSync(resolve('src/components/react/ProductMasterView.tsx'), 'utf8');
  assert.match(masterViewContent, /resolved360Url/, 'Must guard 360 item creation by resolved360Url');
  assert.match(masterViewContent, /activeMedia\.is_360 && activeMedia\.view_360_url/, 'Must guard 360 iframe render by is_360 and view_360_url');
});
