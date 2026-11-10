import React, { useState, useEffect } from 'react';
import {
  getLocalCart,
  updateCartQuantity,
  removeFromCart,
  getCartSummary,
  getBackendCart,
  isCustomerAuthenticated,
  getShippingPolicy,
  getCachedShippingPolicy,
  calculateShipping
} from '../../lib/api/cart';
import { onAuthStateChange } from '../../lib/firebase/client';
import { resolveImageUrl } from '../../lib/utils/media';
import { isCustomForgeOnly } from '../../config/launchMode';
import {
  getAppliedCoupon,
  saveAppliedCoupon,
  clearAppliedCoupon,
  validateCouponApi,
  calculateCouponDiscount,
  normalizeCoupon
} from '../../lib/api/coupons';

export default function CartView() {
  const [items, setItems] = useState([]);
  const [shippingPolicy, setShippingPolicy] = useState(getCachedShippingPolicy());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(getAppliedCoupon());
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const isLaunch = isCustomForgeOnly();

  useEffect(() => {
    // 1. Initial cached items
    setItems(getLocalCart());
    setIsAuthenticated(isCustomerAuthenticated());
    setAppliedCoupon(getAppliedCoupon());

    // 2. Fetch authoritative backend shipping policy
    getShippingPolicy().then((policy) => {
      if (policy) setShippingPolicy(policy);
    }).catch(console.error);

    const handlePolicyUpdate = (e) => {
      if (e.detail) setShippingPolicy(e.detail);
    };
    window.addEventListener('marshans:shipping-policy-updated', handlePolicyUpdate);

    // 3. Auth listener to load authoritative backend cart
    const unsub = onAuthStateChange((user) => {
      setIsAuthenticated(Boolean(user));
      if (user) {
        getBackendCart().then((res) => {
          if (res && res.items) {
            setItems(res.items);
          }
        }).catch(console.error);
      }
    });

    const handleCouponUpdate = (e) => {
      setAppliedCoupon(e.detail ? normalizeCoupon(e.detail) : null);
    };
    window.addEventListener('marshans:coupon-updated', handleCouponUpdate);

    const handleUpdate = (e) => {
      setItems(e.detail?.items || getLocalCart());
    };

    window.addEventListener('marshans:cart-updated', handleUpdate);
    return () => {
      unsub();
      window.removeEventListener('marshans:cart-updated', handleUpdate);
      window.removeEventListener('marshans:shipping-policy-updated', handlePolicyUpdate);
      window.removeEventListener('marshans:coupon-updated', handleCouponUpdate);
    };
  }, []);

  const summary = getCartSummary(items, shippingPolicy);
  const grossSubtotal = Math.max(0, Number(summary.subtotal) || 0);
  const couponDiscount = calculateCouponDiscount(appliedCoupon, grossSubtotal);
  const shippingFee = Math.max(0, Number(summary.shipping) || 0);
  const netMerchandise = Math.max(0, grossSubtotal - couponDiscount);
  const finalTotal = Math.max(0, netMerchandise + shippingFee);

  // Auto-remove coupon if subtotal falls below required minimum spend
  useEffect(() => {
    if (
      appliedCoupon &&
      Number(appliedCoupon.minOrderValueRupees) > 0 &&
      grossSubtotal > 0 &&
      grossSubtotal < appliedCoupon.minOrderValueRupees
    ) {
      const minVal = appliedCoupon.minOrderValueRupees;
      clearAppliedCoupon();
      setAppliedCoupon(null);
      setPromoError(`Coupon ${appliedCoupon.code} removed: minimum order of ₹${minVal.toLocaleString('en-IN')} required.`);
    }
  }, [grossSubtotal, appliedCoupon]);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a coupon code.');
      return;
    }

    setPromoLoading(true);
    const result = await validateCouponApi(code, grossSubtotal);
    setPromoLoading(false);
    if (result.success && result.coupon) {
      setAppliedCoupon(result.coupon);
      saveAppliedCoupon(result.coupon);
      setPromoCode('');
      setPromoError('');
    } else {
      setPromoError(result.error || 'Invalid promotion code.');
    }
  };

  const handleRemovePromo = () => {
    setAppliedCoupon(null);
    clearAppliedCoupon();
    setPromoError('');
  };

  if (items.length === 0) {
    if (isLaunch) {
      return (
        <div className="cart-empty-container">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your Bag is Empty</h2>
          <p>You haven't added the Lady Justice statue to your shopping bag yet.</p>
          <div className="empty-cart-actions">
            <a href="/product/lady-justice/" className="btn btn-primary">View Lady Justice Statue</a>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="cart-empty-container">
          <div className="empty-cart-icon">🛒</div>
          <h2>Sign In to Access Your Bag</h2>
          <p>Please sign in to view your bag, calculate delivery coordinates, and proceed with priority fulfillment.</p>
          <div className="empty-cart-actions">
            <a href="/login?redirect=/cart" className="btn btn-primary">Sign In to Continue</a>
            <a href="/#home-carousel-section" className="btn btn-outline">Discover Artifacts</a>
          </div>
        </div>
      );
    }

    return (
      <div className="cart-empty-container">
        <div className="empty-cart-icon">🛒</div>
        <h2>Your Bag is Empty</h2>
        <p>You haven't added any 3D printed artifacts or collectibles to your bag yet.</p>
        <div className="empty-cart-actions">
          <a href="/product/lady-justice/" className="btn btn-primary">Discover Lady Justice</a>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-view-layout">
      {/* Left: Cart Items List */}
      <div className="cart-items-column">
        {/* Shipping Banner / Progress Indicator */}
        <div className="free-shipping-card">
          {shippingPolicy.freeShippingEnabled && shippingPolicy.freeShippingThreshold > 0 ? (
            <>
              <div className="shipping-progress-text">
                {shippingCalc.isFreeShipping ? (
                  <span className="unlocked-msg">🎉 <strong>FREE PAN-INDIA DELIVERY UNLOCKED!</strong></span>
                ) : (
                  <span>Add <strong>₹{shippingCalc.amountNeededForFreeShipping.toLocaleString('en-IN')}</strong> more to unlock <strong>FREE Delivery</strong></span>
                )}
              </div>
              <div className="shipping-bar-track">
                <div
                  className="shipping-bar-fill"
                  style={{
                    width: `${shippingCalc.progressPercent}%`,
                    backgroundColor: shippingCalc.isFreeShipping ? '#15803d' : '#09090b'
                  }}
                />
              </div>
            </>
          ) : (
            <div className="shipping-progress-text">
              {summary.shipping === 0 ? (
                <span className="unlocked-msg">🎉 <strong>FREE PAN-INDIA DELIVERY</strong></span>
              ) : (
                <span>Standard Air Delivery: <strong>₹{summary.shipping}</strong> across India</span>
              )}
            </div>
          )}
        </div>

        {/* Item Rows */}
        <div className="cart-items-feed">
          {items.map((item) => (
            <div key={item.id} className="cart-item-row">
              <a href={`/product/${encodeURIComponent(item.slug || item.productId)}/`} className="item-thumb-link">
                <img
                  src={resolveImageUrl(item.imageUrl)}
                  alt={item.name}
                  className="cart-item-img"
                />
              </a>

              <div className="cart-item-core">
                <div className="cart-item-headings">
                  <span className="cart-item-cat">{item.categoryName || 'Artifact'}</span>
                  <a href={item.options?.is_custom_forge ? '/product/lady-justice/' : `/product/${encodeURIComponent(item.slug || item.productId)}/`} className="cart-item-name-link">
                    <h3>{item.name}</h3>
                  </a>
                  {item.options?.is_custom_forge ? (
                    <div className="cf-cart-spec-box">
                      <span className="cf-spec-edition">Edition: {item.options.size_label || '1 Foot'} ({item.options.height_mm ? `${item.options.height_mm}mm` : '305mm'})</span>
                      {item.options.custom_mode_enabled ? (
                        <div className="cf-custom-mounted-badge">
                          <span className="cf-mount-tag">Personalized Nameplate</span>
                          <span className="cf-mount-line"><strong>Name:</strong> {item.options.custom_name}</span>
                          {item.options.custom_designation && item.options.custom_designation !== 'NIL' && (
                            <span className="cf-mount-line"><strong>Title:</strong> {item.options.custom_designation}</span>
                          )}
                          {item.options.custom_second_name && (
                            <span className="cf-mount-line"><strong>Person 2:</strong> {item.options.custom_second_name}{item.options.custom_second_designation && item.options.custom_second_designation !== 'NIL' ? ` (${item.options.custom_second_designation})` : ''}</span>
                          )}
                          <span className="cf-mount-line">
                            <strong>Material:</strong> {
                              item.options.nameplate_material === 'MDF'
                                ? 'MFD Engraving (Wooden Board) (+₹49)'
                                : item.options.nameplate_material === 'Plastic'
                                  ? 'Precision Polymer (Plastic) (+₹29)'
                                  : 'Vinyl Sticker (FREE)'
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="cf-custom-mounted-badge">
                          <span className="cf-standard-tag">Standard Edition (No Personalization)</span>
                          {item.options.nameplate_material === 'MDF' && (
                            <span className="cf-mount-line"><strong>Material:</strong> MFD Engraving (Wooden Board) (+₹49)</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="cart-item-options">
                      {item.material && <span className="spec-badge">Material: {item.material}</span>}
                      {item.finishing && <span className="spec-badge">Finish: {item.finishing}</span>}
                    </div>
                  )}
                </div>

                <div className="cart-item-actions-row">
                  {/* Quantity Stepper */}
                  <div className="qty-stepper-small">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="qty-btn"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="qty-count">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="qty-btn"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="remove-item-btn"
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="cart-item-pricing">
                <span className="unit-price">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
                {item.quantity > 1 && (
                  <span className="each-price">₹{Number(item.price).toLocaleString('en-IN')} each</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="cart-summary-column">
        <div className="order-summary-box">
          <h3 className="summary-title">ORDER SUMMARY</h3>

          <div className="summary-line">
            <span>Product Subtotal ({summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'})</span>
            <span>₹{grossSubtotal.toLocaleString('en-IN')}</span>
          </div>

          {appliedCoupon && couponDiscount > 0 && (
            <div className="summary-line promo-line">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#166534',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '4px',
                  padding: '1px 5px'
                }}>🎟️ {appliedCoupon.code}</span>
                <span>
                  {appliedCoupon.discountType === 'percent'
                    ? `Coupon Discount (${appliedCoupon.discountValue}%)`
                    : 'Coupon Discount'}
                </span>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                  aria-label="Remove coupon"
                >
                  Remove
                </button>
              </div>
              <span className="discount-val">−₹{couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="summary-line">
            <span>Standard Air Delivery</span>
            <span>{shippingFee === 0 ? <strong style={{ color: '#15803d' }}>FREE</strong> : `₹${shippingFee}`}</span>
          </div>

          <div className="summary-divider" />

          <div className="summary-line total-line">
            <span>Final Payable</span>
            <span className="total-val">₹{finalTotal.toLocaleString('en-IN')}</span>
          </div>

          {appliedCoupon && couponDiscount > 0 && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 12px',
              marginTop: '8px',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#166534',
              textAlign: 'center'
            }}>
              🎉 You save <strong>₹{couponDiscount.toLocaleString('en-IN')}</strong> on this order
            </div>
          )}

          <span className="summary-gst-note">Inclusive of all taxes & insurance</span>

          <a href="/checkout" className="btn btn-primary checkout-action-btn">
            <span>Proceed to Checkout</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>

          <a href={isLaunch ? "/custom-3d" : "/shop"} className="continue-shopping-btn">
            ← Continue Shopping
          </a>

          {/* Promo / Coupon Code Section */}
          {appliedCoupon ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '10px 14px',
              margin: '16px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>🎟️</span>
                <div>
                  <strong style={{ fontSize: '13px', color: '#166534', fontFamily: 'monospace' }}>{appliedCoupon.code}</strong>
                  <span style={{ fontSize: '12px', color: '#15803d', marginLeft: '6px', fontWeight: 600 }}>
                    ({appliedCoupon.discountType === 'percent' ? `${appliedCoupon.discountValue}% OFF` : `₹${appliedCoupon.discountRupees.toLocaleString('en-IN')} OFF`})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemovePromo}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyPromo} className="promo-form">
              <input
                type="text"
                placeholder="Promo code (e.g. MARS105)"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                className="promo-input"
                disabled={promoLoading}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="btn btn-outline btn-sm"
                disabled={promoLoading || !promoCode.trim()}
              >
                {promoLoading ? 'Applying...' : 'Apply'}
              </button>
            </form>
          )}
          {promoError && <span className="promo-error-msg">{promoError}</span>}

          {/* Guarantees */}
          <div className="cart-trust-points">
            <div className="trust-point">
              <span>🔒</span>
              <span>100% Secure Checkout with Razorpay / UPI</span>
            </div>
            <div className="trust-point">
              <span>📦</span>
              <span>Crash-Resistant Triple Wall Packaging</span>
            </div>
            <div className="trust-point">
              <span>⚡</span>
              <span>Direct Dispatches from Our Bangalore Print Farm</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .cart-view-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .cart-empty-container {
          text-align: center;
          padding: 80px 20px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          max-width: 540px;
          margin: 0 auto;
        }

        .empty-cart-icon {
          font-size: 44px;
          margin-bottom: 12px;
        }

        .cart-empty-container h2 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 32px;
          color: #09090b;
          margin: 0 0 8px 0;
        }

        .cart-empty-container p {
          font-size: 14px;
          color: #71717a;
          margin: 0 0 24px 0;
        }

        .empty-cart-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .free-shipping-card {
          background: #f8fafc;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .shipping-progress-text {
          font-size: 13px;
          color: #3f3f46;
          margin-bottom: 8px;
        }

        .free-shipping-card .shipping-progress-text:only-child {
          margin-bottom: 0;
        }

        .unlocked-msg {
          color: #15803d;
        }

        .shipping-bar-track {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 9999px;
          overflow: hidden;
        }

        .shipping-bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.3s ease;
        }

        .cart-items-feed {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cart-item-row {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
        }

        .item-thumb-link {
          flex-shrink: 0;
        }

        .cart-item-img {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: contain;
          padding: 4px;
          box-sizing: border-box;
          background: #f8fafc;
        }

        .continue-shopping-btn {
          display: block;
          text-align: center;
          margin-top: 10px;
          padding: 12px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          color: #14251a;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .continue-shopping-btn:hover {
          background: #f4f4f5;
          border-color: #14251a;
        }

        /* Custom Forge Cart Item Badges */
        .cf-cart-spec-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .cf-spec-edition {
          font-size: 12px;
          font-weight: 750;
          color: #14251a;
          background: #f4f4f5;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
        }

        .cf-custom-mounted-badge {
          background: #fcfbf9;
          border: 1px dashed rgba(20, 37, 26, 0.2);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          color: #3f3f46;
        }

        .cf-mount-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #15803d;
          margin-bottom: 2px;
        }

        .cf-mount-line strong {
          color: #14251a;
        }

        .cf-standard-tag {
          font-size: 11px;
          color: #71717a;
          font-style: italic;
        }

        .cart-item-core {
          flex: 1;
        }

        .cart-item-cat {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .cart-item-name-link {
          text-decoration: none;
          color: inherit;
        }

        .cart-item-name-link h3 {
          font-family: var(--font-sans, sans-serif);
          font-size: 16px;
          font-weight: 700;
          color: #09090b;
          margin: 2px 0 6px 0;
        }

        .cart-item-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .spec-badge {
          font-size: 11px;
          background: #f4f4f5;
          color: #52525b;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .cart-item-actions-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .qty-stepper-small {
          display: flex;
          align-items: center;
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          height: 32px;
          background: #ffffff;
        }

        .qty-btn {
          background: none;
          border: none;
          width: 28px;
          height: 100%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qty-btn:hover {
          background: #f4f4f5;
        }

        .qty-count {
          font-size: 13px;
          font-weight: 700;
          min-width: 24px;
          text-align: center;
        }

        .remove-item-btn {
          background: none;
          border: none;
          font-size: 12px;
          color: #dc2626;
          cursor: pointer;
          padding: 0;
        }

        .remove-item-btn:hover {
          text-decoration: underline;
        }

        .cart-item-pricing {
          text-align: right;
          flex-shrink: 0;
        }

        .unit-price {
          display: block;
          font-family: var(--font-sans, sans-serif);
          font-size: 18px;
          font-weight: 800;
          color: #09090b;
        }

        .each-price {
          display: block;
          font-size: 11px;
          color: #a1a1aa;
          margin-top: 2px;
        }

        /* Summary Box */
        .order-summary-box {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
          position: sticky;
          top: 100px;
        }

        .summary-title {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 24px;
          letter-spacing: 0.05em;
          color: #09090b;
          margin: 0 0 20px 0;
        }

        .summary-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          color: #52525b;
          margin-bottom: 12px;
        }

        .promo-line {
          color: #15803d;
          font-weight: 600;
        }

        .summary-divider {
          height: 1px;
          background: #f4f4f5;
          margin: 16px 0;
        }

        .total-line {
          font-size: 18px;
          font-weight: 800;
          color: #09090b;
          margin-bottom: 4px;
        }

        .total-val {
          font-size: 24px;
        }

        .summary-gst-note {
          display: block;
          font-size: 11px;
          color: #a1a1aa;
          margin-bottom: 24px;
        }

        .checkout-action-btn {
          width: 100%;
          height: 52px;
          font-size: 14px;
        }

        .promo-form {
          display: flex;
          gap: 8px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f4f4f5;
        }

        .promo-input {
          flex: 1;
          height: 38px;
          padding: 0 12px;
          border-radius: 6px;
          border: 1px solid #e4e4e7;
          font-size: 13px;
          outline: none;
          text-transform: uppercase;
        }

        .promo-error-msg {
          display: block;
          font-size: 11px;
          color: #dc2626;
          margin-top: 6px;
        }

        .cart-trust-points {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f4f4f5;
          font-size: 12px;
          color: #71717a;
        }

        .trust-point {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 960px) {
          .cart-view-layout {
            grid-template-columns: 1fr;
          }
          .order-summary-box {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .cart-item-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .cart-item-pricing {
            text-align: left;
            margin-top: 8px;
          }
        }
      ` }} />
    </div>
  );
}
