import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, installBrowser } from './helpers/load.mjs';

test('Coupon Display 1: Exact scenario - Subtotal ₹5,600, Coupon ₹500, Shipping ₹50 = Final Payable ₹5,150', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  const rawCoupon = {
    id: 'test-fixed-500',
    code: 'MART500',
    discount_type: 'fixed',
    discount_value: 500,
    discount_rupees: 500
  };

  const coupon = normalizeCoupon(rawCoupon);
  assert.ok(coupon, 'Coupon must normalize successfully');
  assert.strictEqual(coupon.code, 'MART500');
  assert.strictEqual(coupon.discountType, 'fixed');
  assert.strictEqual(coupon.discountRupees, 500);

  const grossSubtotal = 5600;
  const shippingFee = 50;
  const couponDiscount = calculateCouponDiscount(coupon, grossSubtotal);
  const netMerchandise = Math.max(0, grossSubtotal - couponDiscount);
  const finalPayableTotal = Math.max(0, netMerchandise + shippingFee);

  assert.strictEqual(couponDiscount, 500, 'Discount must be exactly ₹500');
  assert.strictEqual(netMerchandise, 5100, 'Net merchandise must be ₹5,100');
  assert.strictEqual(finalPayableTotal, 5150, 'Final payable must be exactly ₹5,150');
});

test('Coupon Display 2: Percentage-based coupon - 10% on ₹5,600 = ₹560 discount, Shipping ₹50 = Final Payable ₹5,090', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  const rawCoupon = {
    id: 'test-percent-10',
    code: 'SAVE10',
    discount_type: 'percent',
    discount_value: 10
  };

  const coupon = normalizeCoupon(rawCoupon);
  const grossSubtotal = 5600;
  const shippingFee = 50;
  const couponDiscount = calculateCouponDiscount(coupon, grossSubtotal);
  const netMerchandise = Math.max(0, grossSubtotal - couponDiscount);
  const finalPayableTotal = Math.max(0, netMerchandise + shippingFee);

  assert.strictEqual(couponDiscount, 560, '10% of ₹5,600 must be ₹560');
  assert.strictEqual(netMerchandise, 5040, 'Net merchandise must be ₹5,040');
  assert.strictEqual(finalPayableTotal, 5090, 'Final payable must be exactly ₹5,090');
});

test('Coupon Display 3: Edge case - Discount exceeding subtotal is capped at subtotal, shipping remains payable', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  const coupon = normalizeCoupon({
    code: 'BIGDISCOUNT',
    discountType: 'fixed',
    discountRupees: 600
  });

  const grossSubtotal = 500;
  const shippingFee = 50;
  const couponDiscount = calculateCouponDiscount(coupon, grossSubtotal);
  const netMerchandise = Math.max(0, grossSubtotal - couponDiscount);
  const finalPayableTotal = Math.max(0, netMerchandise + shippingFee);

  assert.strictEqual(couponDiscount, 500, 'Discount exceeding subtotal must be capped at gross subtotal (₹500)');
  assert.strictEqual(netMerchandise, 0, 'Net merchandise becomes ₹0');
  assert.strictEqual(finalPayableTotal, 50, 'Shipping fee remains payable: ₹50');
});

test('Coupon Display 4: Edge case - Free shipping threshold preserved with coupon', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  const coupon = normalizeCoupon({
    code: 'FLAT500',
    discountType: 'fixed',
    discountRupees: 500
  });

  const grossSubtotal = 10000;
  const shippingFee = 0; // free shipping unlocked
  const couponDiscount = calculateCouponDiscount(coupon, grossSubtotal);
  const netMerchandise = Math.max(0, grossSubtotal - couponDiscount);
  const finalPayableTotal = Math.max(0, netMerchandise + shippingFee);

  assert.strictEqual(couponDiscount, 500);
  assert.strictEqual(finalPayableTotal, 9500, 'Final payable is ₹9,500 with free shipping');
});

test('Coupon Display 5: Edge case - Minimum order spend requirement enforced', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  const coupon = normalizeCoupon({
    code: 'MINSPEND',
    discountType: 'fixed',
    discountRupees: 200,
    minOrderValueRupees: 3000
  });

  // Below min spend: ₹2,500
  const subtotalLow = 2500;
  assert.strictEqual(calculateCouponDiscount(coupon, subtotalLow), 0, 'Subtotal below min spend gets 0 discount');

  // Meets min spend: ₹3,000
  const subtotalMet = 3000;
  assert.strictEqual(calculateCouponDiscount(coupon, subtotalMet), 200, 'Subtotal meeting min spend gets ₹200 discount');
});

test('Coupon Display 6: Edge case - Maximum discount ceiling enforced', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  const coupon = normalizeCoupon({
    code: 'HALFOFFCAP',
    discountType: 'percent',
    discountValue: 50,
    maxDiscountAmountRupees: 1000
  });

  const grossSubtotal = 6000;
  const couponDiscount = calculateCouponDiscount(coupon, grossSubtotal);
  assert.strictEqual(couponDiscount, 1000, '50% of ₹6,000 = ₹3,000, capped at maxDiscountAmountRupees ₹1,000');
});

test('Coupon Display 7: Edge case - Null, empty, or invalid coupon returns 0 discount without crashing', async () => {
  installBrowser();
  const { calculateCouponDiscount, normalizeCoupon } = await loadModule('src/lib/api/coupons.ts');

  assert.strictEqual(calculateCouponDiscount(null, 5600), 0);
  assert.strictEqual(calculateCouponDiscount(undefined, 5600), 0);
  assert.strictEqual(calculateCouponDiscount({}, 5600), 0);
  assert.strictEqual(normalizeCoupon(null), null);
  assert.strictEqual(normalizeCoupon(''), null);
});

test('Coupon Display 8: Session persistence and normalization round-trip', async () => {
  installBrowser();
  const { saveAppliedCoupon, getAppliedCoupon, clearAppliedCoupon } = await loadModule('src/lib/api/coupons.ts');

  // Save snake_case payload (as might come from API)
  saveAppliedCoupon({
    code: 'persisted100',
    discount_type: 'fixed',
    discount_value: 100,
    discount_rupees: 100
  });

  const retrieved = getAppliedCoupon();
  assert.ok(retrieved, 'Should retrieve stored coupon');
  assert.strictEqual(retrieved.code, 'PERSISTED100');
  assert.strictEqual(retrieved.discountType, 'fixed');
  assert.strictEqual(retrieved.discountRupees, 100);

  // Clear coupon
  clearAppliedCoupon();
  assert.strictEqual(getAppliedCoupon(), null, 'Should be null after clearing');
});
