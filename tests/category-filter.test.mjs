import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

// Shapes mirror the live Store 2 API (/api/categories and /api/products).
const CATEGORIES = [
  { id: 1, store_id: 2, name: 'Utility Co.', slug: 'utility-co', active: true },
  { id: 2, store_id: 2, name: 'Fandom', slug: 'fandom', active: true },
  { id: 3, store_id: 2, name: 'Darshanam', slug: 'darshanam', active: true },
  { id: 4, store_id: 2, name: 'LUMO', slug: 'lumo', active: true },
  { id: 5, store_id: 2, name: 'Mini Tales', slug: 'mini-tales', active: true },
  { id: 6, store_id: 2, name: 'Custom', slug: 'custom', active: true }
];
const CATALOG = [
  { id: 3, store_id: 2, name: 'TEST-1', category_id: 1, category_name: 'Utility Co.', category_slug: 'utility-co', price: 600000 },
  { id: 7, store_id: 2, name: 'Statue', category_id: 2, category_name: 'Fandom', category_slug: 'fandom', price: 100000 },
  { id: 8, store_id: 2, name: 'Diorama', category_id: 5, category_name: 'Mini Tales', category_slug: 'mini-tales', price: 90000 },
  { id: 9, store_id: 2, name: 'Uncategorised', category_id: null, price: 50000 }
];

async function setup({ catalog = CATALOG, offline = false } = {}) {
  installBrowser({ user: null });
  const calls = installFetch((url) => {
    if (offline) throw new Error('Network down');
    const u = new URL(url);
    if (u.pathname.endsWith('/categories')) return { body: { success: true, data: { count: CATEGORIES.length, categories: CATEGORIES } } };
    if (/\/products\/[^/]+$/.test(u.pathname)) {
      const key = decodeURIComponent(u.pathname.split('/').pop());
      const hit = catalog.find((p) => String(p.id) === key);
      return hit ? { body: { success: true, data: hit } } : { status: 404, body: { success: false, error: { message: 'not found' } } };
    }
    // Like the live backend: honours category_id, ignores category_slug
    const cid = u.searchParams.get('category_id');
    const products = cid ? catalog.filter((p) => String(p.category_id) === cid) : catalog;
    return { body: { success: true, data: { total: products.length, products } } };
  });
  const products = await loadModule('src/lib/api/products.ts');
  const categories = await loadModule('src/lib/api/categories.ts');
  return { ...products, ...categories, calls };
}

test('every frontend category route resolves to its live backend category id', async () => {
  const { getCategories, resolveBackendCategory } = await setup();
  const cats = await getCategories();
  const idFor = (route) => resolveBackendCategory(route, cats)?.id ?? null;
  assert.equal(idFor('fandom-tribe'), 2);
  assert.equal(idFor('lumo'), 4);
  assert.equal(idFor('minitales'), 5);
  assert.equal(idFor('utility-co'), 1);
  assert.equal(idFor('darshanam'), 3);
  assert.equal(idFor('custom-forge'), 6);
  assert.equal(idFor('custom-3d'), 6);
  assert.equal(idFor('does-not-exist'), null);
});

test('category pages filter by backend category_id and send category_id with Store 2 headers', async () => {
  const { getProducts, calls } = await setup();

  const fandom = await getProducts({ category_slug: 'fandom-tribe', limit: 50 });
  assert.deepEqual(fandom.products.map((p) => p.id), [7]);
  assert.equal(fandom.ok, true);
  const productCall = calls.find((c) => c.url.includes('/products?'));
  assert.match(productCall.url, /category_id=2\b/);
  assert.doesNotMatch(productCall.url, /category_slug=/);
  assert.equal(productCall.headers['x-store-id'], '2');
  assert.equal(productCall.headers['x-store-code'], 'marshans');

  assert.deepEqual((await getProducts({ category_slug: 'utility-co' })).products.map((p) => p.id), [3]);
  assert.deepEqual((await getProducts({ category_slug: 'minitales' })).products.map((p) => p.id), [8]);
  assert.deepEqual((await getProducts({ category_slug: 'darshanam' })).products, []);
  assert.deepEqual((await getProducts({ category_slug: 'unknown-route' })).products, []);
});

test('a product without a category is not pushed into Utility Co. (id 1)', async () => {
  const { getProducts } = await setup();
  const all = await getProducts({ limit: 100 });
  assert.equal(all.products.find((p) => p.id === 9).category_id, 0);
  assert.equal((await getProducts({ category_slug: 'utility-co' })).products.some((p) => p.id === 9), false);
});

test('ok flag distinguishes an empty live catalog from an unreachable API', async () => {
  const empty = await setup({ catalog: [] });
  const res = await empty.getProducts({ limit: 12 });
  assert.equal(res.ok, true);
  assert.deepEqual(res.products, []);

  const down = await setup({ offline: true });
  assert.equal((await down.getProducts({ limit: 12 })).ok, false);
  assert.equal((await down.getProducts({ category_slug: 'lumo' })).ok, false);
});

test('product lookup: current id resolves, deleted id is null, unreachable API throws', async () => {
  const { getProductByIdOrSlug } = await setup();
  assert.equal((await getProductByIdOrSlug(3)).id, 3);
  assert.equal(await getProductByIdOrSlug(2), null);

  const down = await setup({ offline: true });
  await assert.rejects(() => down.getProductByIdOrSlug(3));
});
