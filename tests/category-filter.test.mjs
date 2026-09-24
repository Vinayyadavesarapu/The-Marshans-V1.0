import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

// Mirrors the live API: /products ignores category_slug and returns the whole Store 2 catalog.
const CATALOG = [
  { id: 2, store_id: 2, name: 'TEST-1', category_id: 2, category_name: 'Fandom', category_slug: 'fandom', price: 350000 },
  { id: 7, store_id: 2, name: 'Lamp', category_id: 4, category_name: 'LUMO', category_slug: 'lumo', price: 100000 }
];

async function setup() {
  installBrowser({ user: null });
  const calls = installFetch(() => ({ status: 200, body: { success: true, data: { total: CATALOG.length, products: CATALOG } } }));
  const mod = await loadModule('src/lib/api/products.ts');
  return { ...mod, calls };
}

test('category pages only receive products whose API category matches', async () => {
  const { getProducts, calls } = await setup();

  const fandom = await getProducts({ category_slug: 'fandom-tribe' });
  assert.deepEqual(fandom.products.map((p) => p.id), [2]);
  assert.equal(fandom.total, 1);

  const darshanam = await getProducts({ category_slug: 'darshanam' });
  assert.deepEqual(darshanam.products, []);
  assert.equal(darshanam.total, 0);

  assert.equal(calls[0].headers['x-store-id'], '2');
  assert.match(calls[0].url, /category_slug=fandom\b/);
});

test('unfiltered catalog (home/shop) is returned untouched', async () => {
  const { getProducts } = await setup();
  const all = await getProducts({ limit: 100 });
  assert.deepEqual(all.products.map((p) => p.id), [2, 7]);
  assert.equal(all.total, 2);
});
