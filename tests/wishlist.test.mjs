import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser } from './helpers/load.mjs';

const WISHLIST_KEY = 'marshans_wishlist_v1';

test('wishlist persistence in localStorage', async () => {
  const b = installBrowser();
  const { getWishlist, toggleWishlistItem, isItemInWishlist } = await loadModule('src/lib/utils/wishlist.ts');

  assert.deepEqual(getWishlist(), []);
  assert.equal(isItemInWishlist(3), false);

  // Toggle on
  const added = toggleWishlistItem(3);
  assert.equal(added, true);
  assert.equal(isItemInWishlist(3), true);
  assert.deepEqual(getWishlist(), [3]);
  assert.equal(b.local.get(WISHLIST_KEY), JSON.stringify([3]));

  // Toggle off
  const removed = toggleWishlistItem(3);
  assert.equal(removed, false);
  assert.equal(isItemInWishlist(3), false);
  assert.deepEqual(getWishlist(), []);
  assert.equal(b.local.get(WISHLIST_KEY), JSON.stringify([]));
});
