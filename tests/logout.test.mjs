/**
 * Logout: Firebase sign-out still happens, AND the Marshans cached cart + saved address are wiped so a second
 * customer on the same browser never sees the previous customer's data. Unrelated storage is left alone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, installBrowser, ROOT } from './helpers/load.mjs';

const CART_KEY = 'marshans_cart_cache_v1';
const ADDRESS_KEY = 'marshans_saved_address_v1';
const PENDING_KEY = 'marshans_pending_cart_item';

function seed(b) {
  b.local.set(CART_KEY, JSON.stringify([{ id: '1', productId: 5, name: 'Lumo Orb', price: 1299, quantity: 2 }]));
  b.local.set(ADDRESS_KEY, JSON.stringify({ fullName: 'Customer One', phone: '9876543210', addressLine1: '12 Street Road', city: 'Pune', postalCode: '411001' }));
  b.session.set(PENDING_KEY, JSON.stringify({ productId: 9 }));
  b.local.set('some_other_site_pref', 'dark');
  b.local.set('marshans_unrelated_ui_state', 'x');
  b.session.set('marshans_home_intro_completed', '1');
}

test('logout performs the Firebase signOut', async () => {
  const b = installBrowser();
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await logOut();
  assert.equal(b.fb.calls.filter((c) => c === 'signOut').length, 1);
  assert.equal(b.fb.auth.currentUser, null, 'the stub signOut cleared the current user');
});

test('logout clears the Marshans cached cart', async () => {
  const b = installBrowser(); seed(b);
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await logOut();
  assert.equal(b.local.has(CART_KEY), false);
});

test('logout clears the Marshans saved address', async () => {
  const b = installBrowser(); seed(b);
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await logOut();
  assert.equal(b.local.has(ADDRESS_KEY), false);
});

test('logout clears the pending add-to-cart item (customer-specific, sessionStorage)', async () => {
  const b = installBrowser(); seed(b);
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await logOut();
  assert.equal(b.session.has(PENDING_KEY), false);
});

test('logout clears ONLY Marshans customer data -- unrelated localStorage/sessionStorage is untouched', async () => {
  const b = installBrowser(); seed(b);
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await logOut();
  assert.equal(b.local.get('some_other_site_pref'), 'dark');
  assert.equal(b.local.get('marshans_unrelated_ui_state'), 'x');
  assert.equal(b.session.get('marshans_home_intro_completed'), '1');
  assert.deepEqual([...b.local.keys()].sort(), ['marshans_unrelated_ui_state', 'some_other_site_pref']);
});

test('Firebase sign-out happens BEFORE the cache is wiped', async () => {
  const b = installBrowser(); seed(b);
  const order = [];
  const origRemove = window.localStorage.removeItem;
  window.localStorage.removeItem = (k) => { order.push(`remove:${k}`); origRemove(k); };
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  b.fb.calls.push = new Proxy(b.fb.calls.push, { apply: (t, self, args) => { order.push(args[0]); return Reflect.apply(t, self, args); } });
  await logOut();
  assert.ok(order.indexOf('signOut') !== -1 && order.indexOf('signOut') < order.indexOf(`remove:${CART_KEY}`), order.join(' > '));
});

test('a second customer on the same browser sees no cart and no address after the first logs out', async () => {
  const b = installBrowser(); seed(b);
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  const cart = await loadModule('src/lib/api/cart.ts');
  assert.equal(cart.getLocalCart().length, 1, 'precondition: customer one has a cached cart');
  await logOut();
  assert.deepEqual(cart.getLocalCart(), []);
  assert.equal(window.localStorage.getItem(ADDRESS_KEY), null);
  assert.equal(cart.getCartCount(), 0);
});

test('logout tells any mounted cart badge/view the cart is now empty', async () => {
  const b = installBrowser(); seed(b);
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await logOut();
  const ev = b.events.find((e) => e.type === 'marshans:cart-updated');
  assert.ok(ev, 'marshans:cart-updated dispatched');
  assert.equal(ev.detail.count, 0);
});

test('if Firebase sign-out FAILS the customer is still signed in, so their cache is kept and the error propagates', async () => {
  const b = installBrowser(); seed(b);
  b.fb.signOutError = new Error('auth/network-request-failed');
  const { logOut } = await loadModule('src/lib/firebase/client.ts');
  await assert.rejects(() => logOut(), /network-request-failed/);
  assert.equal(b.local.has(CART_KEY), true);
  assert.equal(b.local.has(ADDRESS_KEY), true);
});

test('clearMarshansCustomerCache is safe when storage is unavailable', async () => {
  installBrowser();
  const { clearMarshansCustomerCache } = await loadModule('src/lib/session/cache.ts');
  window.localStorage.removeItem = () => { throw new Error('denied'); };
  assert.doesNotThrow(() => clearMarshansCustomerCache());
});

test('every logout entry point uses the shared logOut (header menu + account dashboard), so both get the cleanup', () => {
  for (const f of ['HeaderUserNav.jsx', 'AccountDashboard.jsx']) {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/react', f), 'utf8');
    assert.match(src, /import \{[^}]*\blogOut\b[^}]*\} from '..\/..\/lib\/firebase\/client'/, f);
    assert.ok(src.includes('await logOut()'), f);
  }
});

test('the storage key names used by ProfileManager/CheckoutForm/cart come from one shared module', () => {
  for (const f of ['src/components/react/ProfileManager.jsx', 'src/components/react/CheckoutForm.jsx', 'src/lib/api/cart.ts']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!src.includes("'marshans_saved_address_v1'") && !src.includes("'marshans_cart_cache_v1'"), `${f} must import the key from session/cache`);
  }
});
