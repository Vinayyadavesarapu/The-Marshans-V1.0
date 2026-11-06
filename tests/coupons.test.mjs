import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser, installFetch } from './helpers/load.mjs';

test('1. calculateCouponDiscount calculates exact fixed rupee discount', async () => {
  installBrowser();
  const { calculateCouponDiscount } = await loadModule('src/lib/api/coupons.ts');

  const coupon = {
    id: 101,
    code: 'MARS105',
    discountType: 'fixed',
    discountValue: 59900,
    discountRupees: 599,
    minOrderValueRupees: 5000
  };

  // Eligible order: ₹5,000
  const discount = calculateCouponDiscount(coupon, 5000);
  assert.strictEqual(discount, 599, 'Fixed ₹599 discount must deduct exactly ₹599');

  // Eligible higher order: ₹10,000
  const higherDiscount = calculateCouponDiscount(coupon, 10000);
  assert.strictEqual(higherDiscount, 599, 'Fixed discount remains ₹599 on higher order totals');

  // Ineligible order below min spend: ₹4,999
  const ineligibleDiscount = calculateCouponDiscount(coupon, 4999);
  assert.strictEqual(ineligibleDiscount, 0, 'Ineligible subtotal below min order must yield 0 discount');
});

test('2. calculateCouponDiscount calculates percentage discount with rounding', async () => {
  installBrowser();
  const { calculateCouponDiscount } = await loadModule('src/lib/api/coupons.ts');

  const coupon = {
    id: 102,
    code: 'MARS5',
    discountType: 'percent',
    discountValue: 5,
    discountRupees: 0,
    minOrderValueRupees: 2000
  };

  // Eligible order: ₹5,000 -> 5% = ₹250
  const discount = calculateCouponDiscount(coupon, 5000);
  assert.strictEqual(discount, 250, '5% of ₹5,000 must be ₹250');

  // Ineligible order below min spend: ₹1,500
  const ineligible = calculateCouponDiscount(coupon, 1500);
  assert.strictEqual(ineligible, 0, 'Ineligible subtotal below min order must yield 0 discount');
});

test('3. calculateCouponDiscount enforces discount cap (cannot exceed subtotal)', async () => {
  installBrowser();
  const { calculateCouponDiscount } = await loadModule('src/lib/api/coupons.ts');

  const coupon = {
    id: 103,
    code: 'SUPER500',
    discountType: 'fixed',
    discountValue: 50000,
    discountRupees: 500,
    minOrderValueRupees: 0
  };

  const discount = calculateCouponDiscount(coupon, 300);
  assert.strictEqual(discount, 300, 'Discount cannot exceed order subtotal');
});

test('4. calculateCouponDiscount enforces max discount amount ceiling when configured', async () => {
  installBrowser();
  const { calculateCouponDiscount } = await loadModule('src/lib/api/coupons.ts');

  const coupon = {
    id: 104,
    code: 'BIGDROP',
    discountType: 'percent',
    discountValue: 50,
    discountRupees: 0,
    minOrderValueRupees: 1000,
    maxDiscountAmountRupees: 1000
  };

  // 50% of ₹4,000 is ₹2,000, but ceiling is ₹1,000
  const discount = calculateCouponDiscount(coupon, 4000);
  assert.strictEqual(discount, 1000, 'Discount must be capped at max discount amount of ₹1,000');
});

test('5. buildOrderPayload attaches uppercase coupon_code to order payload', async () => {
  installBrowser();
  const { buildOrderPayload } = await loadModule('src/lib/api/checkoutPayload.ts');

  const form = {
    fullName: 'Vinay Kumar',
    phone: '9876543210',
    email: 'vinay@example.com',
    addressLine1: 'MG Road, Indiranagar',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560038'
  };
  const items = [{ productId: 5, quantity: 2 }];

  // With coupon
  const payloadWithCoupon = buildOrderPayload(form, items, 'upi', 'mars105');
  assert.strictEqual(payloadWithCoupon.coupon_code, 'MARS105', 'Coupon code must be normalized to uppercase');
  assert.strictEqual(payloadWithCoupon.store_id, 2, 'Store ID must be 2');
  assert.strictEqual(payloadWithCoupon.items[0].product_id, 5);

  // Without coupon
  const payloadWithoutCoupon = buildOrderPayload(form, items, 'cod');
  assert.strictEqual(payloadWithoutCoupon.coupon_code, undefined, 'coupon_code must be omitted when not applied');
});

test('6. validateCouponApi handles API success and failure responses safely', async () => {
  installBrowser();
  const calls = installFetch(async (url, init, headers) => {
    const body = JSON.parse(init.body);
    assert.strictEqual(body.code, 'MARS105');
    assert.strictEqual(body.subtotal_in_rupees, 5000);
    assert.strictEqual(headers['x-store-id'], '2');

    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: 1,
          code: 'MARS105',
          discount_type: 'fixed',
          discount_value: 59900,
          discount_rupees: 599,
          min_order_value_rupees: 5000
        },
        message: 'Coupon code applied successfully.'
      }
    };
  });

  const { validateCouponApi } = await loadModule('src/lib/api/coupons.ts');

  // Empty code check
  const emptyRes = await validateCouponApi('', 5000);
  assert.strictEqual(emptyRes.success, false);
  assert.strictEqual(emptyRes.error, 'Please enter a coupon code.');

  // Successful validation call
  const res = await validateCouponApi('mars105', 5000);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.coupon.code, 'MARS105');
  assert.strictEqual(res.coupon.discountRupees, 599);
  assert.strictEqual(res.coupon.discountType, 'fixed');
  assert.strictEqual(calls.length, 1);
});

test('7. validateCouponApi returns friendly error message when backend rejects coupon', async () => {
  installBrowser();
  installFetch(async () => ({
    status: 400,
    body: {
      success: false,
      error: { message: 'Minimum order value of ₹5,000 required for this coupon.', statusCode: 400 }
    }
  }));

  const { validateCouponApi } = await loadModule('src/lib/api/coupons.ts');
  const res = await validateCouponApi('MARS105', 3000);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, 'Minimum order value of ₹5,000 required for this coupon.');
});
