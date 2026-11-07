import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, installBrowser, installFetch, ROOT } from './helpers/load.mjs';

test('1. formatPaymentStatus distinguishes paid, pending, failed, expired, and refunded states', async () => {
  const { formatPaymentStatus } = await loadModule('src/lib/api/orderMapper.ts');

  // Paid
  const sPaid = formatPaymentStatus('paid');
  assert.equal(sPaid.key, 'paid');
  assert.equal(sPaid.label, 'Paid');
  assert.equal(sPaid.badgeClass, 'payment-paid');
  assert.equal(sPaid.canRetryPayment, false);

  // Pending
  const sPending = formatPaymentStatus('pending');
  assert.equal(sPending.key, 'pending');
  assert.equal(sPending.label, 'Pending Payment');
  assert.equal(sPending.badgeClass, 'payment-pending');
  assert.equal(sPending.canRetryPayment, true);

  // Failed
  const sFailed = formatPaymentStatus('failed');
  assert.equal(sFailed.key, 'failed');
  assert.equal(sFailed.label, 'Payment Failed');
  assert.equal(sFailed.badgeClass, 'payment-failed');
  assert.equal(sFailed.canRetryPayment, true);

  // Expired
  const sExpired = formatPaymentStatus('expired');
  assert.equal(sExpired.key, 'expired');
  assert.equal(sExpired.label, 'Payment Expired');
  assert.equal(sExpired.badgeClass, 'payment-expired');
  assert.equal(sExpired.canRetryPayment, false);

  // Refunded
  const sRefunded = formatPaymentStatus('refunded');
  assert.equal(sRefunded.key, 'refunded');
  assert.equal(sRefunded.label, 'Refunded');
  assert.equal(sRefunded.badgeClass, 'payment-refunded');
  assert.equal(sRefunded.canRetryPayment, false);

  // Default fallback for null/unknown
  const sNull = formatPaymentStatus(null);
  assert.equal(sNull.key, 'pending');
  assert.equal(sNull.canRetryPayment, true);
});

test('2. OrdersList and AccountDashboard feature payment retry, distinguished tags, and auth listener', () => {
  const ordersListSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/OrdersList.jsx'), 'utf8');
  const dashboardSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/AccountDashboard.jsx'), 'utf8');

  // OrdersList subscribes to onAuthStateChange to prevent empty state on load
  assert.match(ordersListSrc, /onAuthStateChange\(/, 'OrdersList must subscribe to onAuthStateChange');

  // OrdersList features retry payment button
  assert.match(ordersListSrc, /retry-payment-btn/, 'OrdersList must have retry-payment-btn');
  assert.match(ordersListSrc, /Retry Payment|Complete Payment/, 'OrdersList must offer Retry or Complete Payment action');

  // OrdersList imports payments API
  assert.match(ordersListSrc, /createPaymentOrder/, 'OrdersList must call createPaymentOrder for payment retry');
  assert.match(ordersListSrc, /verifyPaymentSignature/, 'OrdersList must verify payment signature');

  // AccountDashboard distinguishes payment statuses
  assert.match(dashboardSrc, /formatPaymentStatus/, 'AccountDashboard must format payment status');
  assert.match(dashboardSrc, /payment-pill/, 'AccountDashboard must render payment pill');
});

test('3. Account Navigation covers Dashboard, Orders & Tracking, Saved Addresses, and Custom 3D', () => {
  const navSrc = fs.readFileSync(path.join(ROOT, 'src/components/react/AccountNav.jsx'), 'utf8');

  assert.match(navSrc, /\/account/, 'Must link to /account');
  assert.match(navSrc, /\/account\/orders/, 'Must link to /account/orders');
  assert.match(navSrc, /\/account\/profile/, 'Must link to /account/profile');
  assert.match(navSrc, /\/custom-3d/, 'Must link to /custom-3d');
  assert.match(navSrc, /logOut|handleLogout/, 'Must provide sign out option');
});

test('4. Custom 3D page mounts Custom 3D Studio and STL upload section', () => {
  const custom3dSrc = fs.readFileSync(path.join(ROOT, 'src/pages/custom-3d.astro'), 'utf8');

  assert.match(custom3dSrc, /Custom3DStudio/, 'custom-3d.astro must import and mount Custom3DStudio');
  assert.match(custom3dSrc, /<Custom3DStudio\s+client:load\s*\/>/, 'Custom3DStudio must be rendered with client:load');
  assert.match(custom3dSrc, /Custom 3D Printing Studio/, 'custom-3d.astro must have studio section heading');
});

test('5. Customer Addresses API layer normalizes backend rows and synchronizes with localStorage', async () => {
  installBrowser({ user: { uid: 'uid123', token: 'tok123' } });

  const { normalizeBackendAddress, fetchCustomerAddresses } = await loadModule('src/lib/api/addresses.ts');

  const backendRow = {
    id: 88,
    user_id: 1,
    full_name: 'Collector Vinay',
    phone: '9876543210',
    address_line: 'House 12, Park Street',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    is_default: 1
  };

  const normalized = normalizeBackendAddress(backendRow);
  assert.equal(normalized.id, '88');
  assert.equal(normalized.fullName, 'Collector Vinay');
  assert.equal(normalized.phone, '9876543210');
  assert.equal(normalized.addressLine1, 'House 12, Park Street');
  assert.equal(normalized.city, 'Hyderabad');
  assert.equal(normalized.state, 'Telangana');
  assert.equal(normalized.postalCode, '500001');
  assert.equal(normalized.isDefault, true);

  // installFetch simulating backend response
  installFetch(() => ({
    status: 200,
    body: {
      success: true,
      data: [backendRow]
    }
  }));

  const list = await fetchCustomerAddresses();
  assert.equal(list.length, 1);
  assert.equal(list[0].fullName, 'Collector Vinay');
});
