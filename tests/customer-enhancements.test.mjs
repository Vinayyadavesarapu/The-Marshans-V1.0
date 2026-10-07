import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, installBrowser, ROOT } from './helpers/load.mjs';

test('addresses helper normalizes legacy single-object address seamlessly', async () => {
  const b = installBrowser();
  const { SAVED_ADDRESS_KEY } = await loadModule('src/lib/session/cache.ts');
  const legacy = {
    fullName: 'Legacy Collector',
    phone: '9876543210',
    addressLine1: '42 Galaxy Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001'
  };
  b.local.set(SAVED_ADDRESS_KEY, JSON.stringify(legacy));

  const { getSavedAddresses, getActiveAddress } = await loadModule('src/lib/session/addresses.ts');
  const list = getSavedAddresses();

  assert.equal(list.length, 1);
  assert.equal(list[0].fullName, 'Legacy Collector');
  assert.equal(list[0].label, 'Home');
  assert.equal(list[0].isDefault, true);

  const active = getActiveAddress();
  assert.ok(active);
  assert.equal(active.fullName, 'Legacy Collector');
});

test('addresses helper supports multi-address CRUD, labels, and default handling', async () => {
  installBrowser();
  const {
    getSavedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    setDefaultAddress,
    selectAddress,
    getActiveAddress
  } = await loadModule('src/lib/session/addresses.ts');

  assert.deepEqual(getSavedAddresses(), []);

  // Add first address (should auto-become default)
  const home = addSavedAddress({
    label: 'Home',
    fullName: 'Vinay Home',
    phone: '9876543210',
    addressLine1: 'Flat 101, Star Apts',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    isDefault: false
  });
  assert.equal(home.label, 'Home');
  assert.equal(home.isDefault, true);

  // Add second address (Work)
  const work = addSavedAddress({
    label: 'Work',
    fullName: 'Vinay Work',
    phone: '9876543210',
    addressLine1: 'Tech Park, Tower 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
    isDefault: false
  });
  assert.equal(work.label, 'Work');
  assert.equal(work.isDefault, false);

  let all = getSavedAddresses();
  assert.equal(all.length, 2);

  // Select work address
  selectAddress(work.id);
  assert.equal(getActiveAddress().id, work.id);

  // Set work as default
  setDefaultAddress(work.id);
  all = getSavedAddresses();
  assert.equal(all.find((a) => a.id === work.id).isDefault, true);
  assert.equal(all.find((a) => a.id === home.id).isDefault, false);

  // Update home address
  updateSavedAddress(home.id, { addressLine2: 'Near Central Park' });
  all = getSavedAddresses();
  assert.equal(all.find((a) => a.id === home.id).addressLine2, 'Near Central Park');

  // Delete work (default), home should now become default
  deleteSavedAddress(work.id);
  all = getSavedAddresses();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, home.id);
  assert.equal(all[0].isDefault, true);
});

test('ProfileManager and CheckoutForm support Saved Addresses without hardcoding storage key', () => {
  const profileSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/ProfileManager.jsx'), 'utf8');
  const checkoutSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/CheckoutForm.jsx'), 'utf8');

  // No hardcoded address key string literal
  assert.ok(!profileSrc.includes("'marshans_saved_address_v1'"));
  assert.ok(!checkoutSrc.includes("'marshans_saved_address_v1'"));

  // ProfileManager has "+ Add Address" button and label support
  assert.ok(profileSrc.includes('+ Add Address'));
  assert.ok(profileSrc.includes('Home') && profileSrc.includes('Work') && profileSrc.includes('Other'));

  // CheckoutForm has saved addresses selector
  assert.ok(checkoutSrc.includes('saved-addresses-selector') || checkoutSrc.includes('savedAddresses'));
  assert.ok(checkoutSrc.includes('getSavedAddresses'));
});

test('OrdersList and AccountDashboard feature prominent "Track Order →" and no fake telemetry steps', () => {
  const ordersListSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/OrdersList.jsx'), 'utf8');
  const dashboardSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/AccountDashboard.jsx'), 'utf8');

  // Both have "Track Order →"
  assert.ok(ordersListSrc.includes('Track Order →'), 'OrdersList must have "Track Order →" button');
  assert.ok(dashboardSrc.includes('Track Order →'), 'AccountDashboard must have "Track Order →" link');

  // Dashboard links with ?track= param
  assert.ok(dashboardSrc.includes('?track='), 'AccountDashboard must link with ?track=');

  // OrdersList handles URL track param on mount
  assert.ok(ordersListSrc.includes('params.get(\'track\')') || ordersListSrc.includes('trackParam'));

  // NO fake tracking timeline mock steps in OrdersList
  assert.ok(!ordersListSrc.includes('G-Code Sliced & Queued'), 'Must not contain fake G-Code step');
  assert.ok(!ordersListSrc.includes('Fabrication & UV Post-Curing'), 'Must not contain fake UV step');
  assert.ok(!ordersListSrc.includes('Micro-Sanded & QC Passed'), 'Must not contain fake Micro-Sanded step');
});

test('Footer has newsletter subscription section completely removed', () => {
  const footerSrc = fs.readFileSync(path.join(ROOT, 'src/components/Footer.astro'), 'utf8');

  assert.ok(!footerSrc.includes('JOIN THE MARSHAN DISPATCH'), 'Newsletter title must be removed');
  assert.ok(!footerSrc.includes('footer-newsletter-wrap'), 'Newsletter wrap class must be removed');
  assert.ok(!footerSrc.includes('newsletter-form'), 'Newsletter form must be removed');
});
