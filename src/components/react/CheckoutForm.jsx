import React, { useState, useEffect } from 'react';
import { getLocalCart, clearCart, getCartSummary, getBackendCart, isCustomerAuthenticated } from '../../lib/api/cart';
import { createOrder } from '../../lib/api/orders';
import { buildOrderPayload, CheckoutPayloadError } from '../../lib/api/checkoutPayload';
import { SAVED_ADDRESS_KEY } from '../../lib/session/cache';
import { onAuthStateChange } from '../../lib/firebase/client';

export default function CheckoutForm() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: ''
  });

  useEffect(() => {
    setItems(getLocalCart());

    const unsub = onAuthStateChange((user) => {
      if (user) {
        setFormData((prev) => ({
          ...prev,
          email: user.email || prev.email,
          fullName: user.displayName || prev.fullName
        }));
        getBackendCart().then((res) => {
          if (res && res.items && res.items.length > 0) {
            setItems(res.items);
          }
        }).catch(console.error);
      } else {
        window.location.href = '/login?redirect=/checkout';
      }
    });

    try {
      const savedAddress = localStorage.getItem(SAVED_ADDRESS_KEY);
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress);
        setFormData((prev) => ({
          ...prev,
          fullName: parsed.fullName || prev.fullName,
          phone: parsed.phone || prev.phone,
          addressLine1: parsed.addressLine1 || prev.addressLine1,
          addressLine2: parsed.addressLine2 || prev.addressLine2,
          city: parsed.city || prev.city,
          state: parsed.state || prev.state,
          postalCode: parsed.postalCode || prev.postalCode
        }));
      }
    } catch {}

    return () => unsub();
  }, []);

  const summary = getCartSummary(items);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    setLoading(true);

    try {
      // Contract-shaped payload (shipping_address.{name,phone,address,city,state,pincode}, items[].product_id).
      // No prices/totals are sent: the backend recomputes everything from its own catalogue.
      const payload = buildOrderPayload(formData, items, paymentMethod);

      const res = await createOrder(payload);

      if (res.success) {
        // Clear cart
        clearCart();
        // Redirect to confirmation
        window.location.href = `/order-confirmation?orderNumber=${res.orderNumber}&total=${summary.total}`;
      } else {
        setError(res.error || 'Failed to place order. Please check connection and try again.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof CheckoutPayloadError
        ? err.message
        : 'An unexpected error occurred while routing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="checkout-empty-wrap">
        <h2>No Items in Bag</h2>
        <p>Please add artifacts to your bag before proceeding to checkout.</p>
        <a href="/#home-carousel-section" className="btn btn-primary">Return to Collection</a>
      </div>
    );
  }

  return (
    <div className="checkout-layout">
      {/* Left Column: Checkout Inputs Form */}
      <div className="checkout-form-column">
        {error && <div className="checkout-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="checkout-core-form">
          {/* Step 1: Collector Contact */}
          <div className="checkout-section-card">
            <div className="card-sec-header">
              <span className="step-badge">1</span>
              <h3>Contact Credentials</h3>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email for Order Updates</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="collector@themarshans.shop"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Mobile Phone (for delivery SMS)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Shipping Coordinates */}
          <div className="checkout-section-card">
            <div className="card-sec-header">
              <span className="step-badge">2</span>
              <h3>Delivery Coordinates</h3>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Recipient Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Vinay Yadav"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="addressLine1">Street Address / House No.</label>
              <input
                id="addressLine1"
                name="addressLine1"
                type="text"
                required
                value={formData.addressLine1}
                onChange={handleChange}
                placeholder="Flat / Floor, Building, Street, Locality"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="addressLine2">Apartment, Landmark (Optional)</label>
              <input
                id="addressLine2"
                name="addressLine2"
                type="text"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Near landmark"
                className="form-input"
              />
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label" htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="state">State</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="postalCode">PIN Code</label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="PIN"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div className="checkout-section-card">
            <div className="card-sec-header">
              <span className="step-badge">3</span>
              <h3>Payment Protocol</h3>
            </div>

            <div className="payment-options-grid">
              <label className={`payment-option ${paymentMethod === 'upi' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                />
                <div className="payment-opt-info">
                  <strong>Instant UPI (Zero Gateway Fee)</strong>
                  <p>Google Pay, PhonePe, Paytm, BHIM</p>
                </div>
                <span className="pay-badge">Instant</span>
              </label>

              <label className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <div className="payment-opt-info">
                  <strong>Credit / Debit Card</strong>
                  <p>Visa, Mastercard, RuPay, Amex</p>
                </div>
                <span className="pay-badge">Secure</span>
              </label>

              <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className="payment-opt-info">
                  <strong>Cash on Delivery (COD)</strong>
                  <p>Pay cash upon air express courier arrival</p>
                </div>
                <span className="pay-badge">Standard</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary place-order-submit-btn"
          >
            {loading ? 'Fabricating & Placing Order...' : `Authorize & Confirm Order (₹${summary.total.toLocaleString('en-IN')})`}
          </button>
        </form>
      </div>

      {/* Right Column: Order Items Summary */}
      <div className="checkout-summary-column">
        <div className="checkout-summary-card">
          <h3 className="summary-title">BAG SUMMARY ({summary.itemCount})</h3>

          <div className="checkout-items-scroll">
            {items.map((item) => (
              <div key={item.id} className="checkout-item-compact">
                <img
                  src={item.imageUrl || '/assets/placeholders/product-placeholder.svg'}
                  alt={item.name}
                  className="checkout-item-img"
                />
                <div className="checkout-item-details">
                  <h4>{item.name}</h4>
                  <div className="item-sub-specs">
                    {item.material && <span>{item.material}</span>}
                    <span>Qty: {item.quantity}</span>
                  </div>
                </div>
                <div className="checkout-item-price">
                  ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          <div className="summary-divider" />

          <div className="summary-line">
            <span>Subtotal</span>
            <span>₹{summary.subtotal.toLocaleString('en-IN')}</span>
          </div>

          <div className="summary-line">
            <span>Air Express Delivery</span>
            <span>{summary.shipping === 0 ? <strong style={{ color: '#15803d' }}>FREE</strong> : `₹${summary.shipping}`}</span>
          </div>

          <div className="summary-divider" />

          <div className="summary-line total-line">
            <span>Final Amount</span>
            <span className="total-val">₹{summary.total.toLocaleString('en-IN')}</span>
          </div>

          <div className="guarantee-points">
            <div>🛡️ <strong>Quality Inspection Guarantee:</strong> Every print tested for dimensional tolerance.</div>
            <div>⚡ <strong>Tracking:</strong> Live dispatch status via SMS & Email.</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .checkout-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .checkout-empty-wrap {
          text-align: center;
          padding: 80px 20px;
          background: #ffffff;
          border-radius: 16px;
          max-width: 480px;
          margin: 0 auto;
        }

        .checkout-error-banner {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 14px 18px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 600;
        }

        .checkout-core-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .checkout-section-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: clamp(24px, 4vw, 36px);
        }

        .card-sec-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .step-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #18181b;
          color: #ffffff;
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-sec-header h3 {
          font-family: var(--font-sans, sans-serif);
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #09090b;
          margin: 0;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1fr;
          gap: 16px;
        }

        .payment-options-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .payment-option {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .payment-option.selected {
          border-color: #111111;
          background: #f8fafc;
        }

        .payment-opt-info {
          flex: 1;
        }

        .payment-opt-info strong {
          display: block;
          font-size: 14px;
          color: #09090b;
        }

        .payment-opt-info p {
          font-size: 12px;
          color: #71717a;
          margin: 2px 0 0 0;
        }

        .pay-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          background: #e4e4e7;
          color: #3f3f46;
        }

        .place-order-submit-btn {
          width: 100%;
          height: 54px;
          font-size: 15px;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        /* Summary Column */
        .checkout-summary-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 28px;
          position: sticky;
          top: 100px;
        }

        .checkout-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .checkout-item-compact {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .checkout-item-img {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          object-fit: cover;
          background: #f8fafc;
        }

        .checkout-item-details {
          flex: 1;
        }

        .checkout-item-details h4 {
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
          margin: 0 0 2px 0;
        }

        .item-sub-specs {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
        }

        .checkout-item-price {
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
        }

        .guarantee-points {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f4f4f5;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 12px;
          color: #52525b;
          line-height: 1.4;
        }

        @media (max-width: 960px) {
          .checkout-layout {
            grid-template-columns: 1fr;
          }
          .checkout-summary-card {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .form-row-2, .form-row-3 {
            grid-template-columns: 1fr;
          }
        }
      ` }} />
    </div>
  );
}
