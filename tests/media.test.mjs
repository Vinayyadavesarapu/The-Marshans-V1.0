import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser } from './helpers/load.mjs';

test('resolveImageUrl correctly resolves relative /uploads/... paths to production media host', async () => {
  installBrowser();
  const { resolveImageUrl, getMediaBaseUrl } = await loadModule('src/lib/utils/media.ts');

  assert.equal(getMediaBaseUrl(), 'https://api.chipakk.shop');

  // Relative paths
  assert.equal(
    resolveImageUrl('/uploads/product-123.webp'),
    'https://api.chipakk.shop/uploads/product-123.webp'
  );
  assert.equal(
    resolveImageUrl('uploads/product-123.webp'),
    'https://api.chipakk.shop/uploads/product-123.webp'
  );

  // Absolute paths
  assert.equal(
    resolveImageUrl('https://images.unsplash.com/photo-123'),
    'https://images.unsplash.com/photo-123'
  );
  assert.equal(
    resolveImageUrl('http://example.com/item.png'),
    'http://example.com/item.png'
  );

  // Local static assets
  assert.equal(
    resolveImageUrl('/assets/placeholders/product-placeholder.svg'),
    '/assets/placeholders/product-placeholder.svg'
  );

  // Null / undefined / empty fallbacks
  assert.equal(
    resolveImageUrl(null),
    '/assets/placeholders/product-placeholder.svg'
  );
  assert.equal(
    resolveImageUrl(''),
    '/assets/placeholders/product-placeholder.svg'
  );
});
