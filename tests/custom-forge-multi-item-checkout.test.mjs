import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('Multi-Item Custom Forge 1: Adding 1ft Custom, 6in Standard, and 2ft Custom to cart preserves all distinct configurations', async () => {
  installBrowser();
  installFetch(async () => ({ status: 200, body: { success: true, data: { items: [] } } }));
  const { addCustomForgeToCart, getLocalCart, getCartSummary, clearCart } = await loadModule('src/lib/api/cart.ts');
  await clearCart();

  // Item 1: 1-foot Custom Mode (₹3,500)
  await addCustomForgeToCart({
    id: 'cf-1ft-custom',
    productId: 2,
    name: 'Lady Justice Statue (1 foot)',
    price: 3500,
    quantity: 1,
    options: {
      is_custom_forge: true,
      variant_id: 2,
      size_label: '1 foot',
      custom_mode_enabled: true,
      custom_name: 'Adv. Rajesh Sharma',
      custom_designation: 'Senior Advocate, High Court',
      nameplate_material: 'Plastic'
    }
  });

  // Item 2: 6-inch Standard (₹1,600)
  await addCustomForgeToCart({
    id: 'cf-6in-std',
    productId: 2,
    name: 'Lady Justice Statue (6 inches)',
    price: 1600,
    quantity: 1,
    options: {
      is_custom_forge: true,
      variant_id: 1,
      size_label: '6 inches',
      custom_mode_enabled: false
    }
  });

  // Item 3: 2-foot Custom Mode (₹5,600)
  await addCustomForgeToCart({
    id: 'cf-2ft-custom',
    productId: 2,
    name: 'Lady Justice Statue (2 feet)',
    price: 5600,
    quantity: 1,
    options: {
      is_custom_forge: true,
      variant_id: 3,
      size_label: '2 feet',
      custom_mode_enabled: true,
      custom_name: 'Chief Justice Courtroom',
      custom_designation: 'Bench Hall IV',
      nameplate_material: 'MDF'
    }
  });

  const cart = getLocalCart();
  assert.equal(cart.length, 3, 'Cart must contain all 3 distinct items');

  const summary = getCartSummary(cart);
  // Expected product subtotal: 3500 + 1600 + 5600 = 10,700
  assert.equal(summary.subtotal, 10700, 'Subtotal for one of each variant must be exactly ₹10,700');
  assert.equal(summary.itemCount, 3);
});

test('Multi-Item Custom Forge 2: createCustomForgeOrderApi sends multi-item payload with Store 2 headers', async () => {
  installBrowser();

  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = null;

  installFetch(async (url, opts) => {
    capturedUrl = String(url);
    capturedHeaders = opts.headers || {};
    capturedBody = JSON.parse(opts.body || '{}');

    return {
      status: 201,
      body: {
        success: true,
        data: {
          id: 42,
          order_number: 'CF-MRSH-2026-9999',
          subtotal: 1070000,
          total_price: 1075000,
          payment_status: 'pending'
        }
      }
    };
  });

  const { createCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');

  const payload = {
    items: [
      {
        variant_id: 2,
        quantity: 1,
        custom_mode: 1,
        customization: {
          customer_name: 'Adv. Rajesh Sharma',
          customer_designation: 'Senior Advocate, High Court',
          nameplate_material: 'Plastic'
        }
      },
      {
        variant_id: 1,
        quantity: 1,
        custom_mode: 0,
        customization: null
      },
      {
        variant_id: 3,
        quantity: 1,
        custom_mode: 1,
        customization: {
          customer_name: 'Chief Justice Courtroom',
          customer_designation: 'Bench Hall IV',
          nameplate_material: 'MDF'
        }
      }
    ],
    shipping_address: {
      name: 'Adv. Rajesh Sharma',
      phone: '9876543210',
      address: 'High Court Chambers, Chamber 402',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400032',
      country: 'India',
      email: 'advocate.sharma@gmail.com'
    }
  };

  const res = await createCustomForgeOrderApi(payload);

  assert.equal(res.success, true);
  assert.match(capturedUrl, /\/api\/custom-forge\/orders$/);
  assert.equal(capturedHeaders['X-Store-ID'], '2');
  assert.equal(capturedHeaders['X-Store-Code'], 'marshans');

  assert.equal(capturedBody.items.length, 3);
  assert.equal(capturedBody.items[0].variant_id, 2);
  assert.equal(capturedBody.items[0].customization.customer_name, 'Adv. Rajesh Sharma');
  assert.equal(capturedBody.items[1].variant_id, 1);
  assert.equal(capturedBody.items[1].custom_mode, 0);
  assert.equal(capturedBody.items[2].variant_id, 3);
  assert.equal(capturedBody.items[2].customization.nameplate_material, 'MDF');
});

test('Multi-Item Custom Forge 3: Order confirmation handles and displays multi-item fabrication list', async () => {
  installBrowser();
  delete globalThis.window.location;
  globalThis.window.location = new URL('https://themarshans.shop/order-confirmation/?orderNumber=CF-MRSH-2026-9999');

  installFetch(async (url) => {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: 42,
          order_number: 'CF-MRSH-2026-9999',
          payment_status: 'paid',
          gateway_order_id: 'order_RzpCfVerifiedMulti',
          subtotal: 1070000,
          total_price: 1075000,
          subtotal_rupees: 10700,
          total_price_rupees: 10750,
          items: [
            {
              id: 1,
              product_name_snapshot: 'Lady Justice Statue',
              size_label_snapshot: '1 foot',
              quantity: 1,
              unit_price_rupees: 3500,
              total_price_rupees: 3500,
              customization: {
                name: 'Adv. Rajesh Sharma',
                designation: 'Senior Advocate, High Court',
                material: 'Plastic'
              }
            },
            {
              id: 2,
              product_name_snapshot: 'Lady Justice Statue',
              size_label_snapshot: '6 inches',
              quantity: 1,
              unit_price_rupees: 1600,
              total_price_rupees: 1600,
              customization: null
            },
            {
              id: 3,
              product_name_snapshot: 'Lady Justice Statue',
              size_label_snapshot: '2 feet',
              quantity: 1,
              unit_price_rupees: 5600,
              total_price_rupees: 5600,
              customization: {
                name: 'Chief Justice Courtroom',
                designation: 'Bench Hall IV',
                material: 'MDF'
              }
            }
          ]
        }
      }
    };
  });

  const { getCustomForgeOrderApi } = await loadModule('src/lib/api/customForge.ts');
  const res = await getCustomForgeOrderApi('CF-MRSH-2026-9999');

  assert.equal(res.success, true);
  assert.equal(res.data.payment_status, 'paid');
  assert.equal(res.data.items.length, 3);
  assert.equal(res.data.total_price_rupees, 10750);
});
