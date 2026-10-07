import React, { useState, useEffect } from 'react';
import {
  getLocalCart,
  clearCart,
  getCartSummary,
  getBackendCart,
  isCustomerAuthenticated,
  getShippingPolicy,
  getCachedShippingPolicy
} from '../../lib/api/cart';
import { createOrder } from '../../lib/api/orders';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  loadRazorpayCheckoutScript
} from '../../lib/api/payments';
import {
  sanitizePincodeInput,
  isValidPincode,
  SERVICEABILITY_MESSAGES
} from '../../lib/api/shipping';
import { resolveImageUrl } from '../../lib/utils/media';
import { buildOrderPayload, CheckoutPayloadError } from '../../lib/api/checkoutPayload';
import { SAVED_ADDRESS_KEY } from '../../lib/session/cache';
import { getSavedAddresses, getActiveAddress, selectAddress } from '../../lib/session/addresses';
import { onAuthStateChange } from '../../lib/firebase/client';

export default function CheckoutForm() {
  const [items, setItems] = useState([]);
  const [shippingPolicy, setShippingPolicy] = useState(getCachedShippingPolicy());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

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

    // Fetch authoritative backend shipping policy
    getShippingPolicy().then((policy) => {
      if (policy) setShippingPolicy(policy);
    }).catch(console.error);

    const handlePolicyUpdate = (e) => {
      if (e.detail) setShippingPolicy(e.detail);
    };
    window.addEventListener('marshans:shipping-policy-updated', handlePolicyUpdate);

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
      const addressList = getSavedAddresses();
      setSavedAddresses(addressList);
      const active = getActiveAddress();
      if (active) {
        setSelectedAddressId(active.id);
        setFormData((prev) => ({
          ...prev,
          fullName: active.fullName || prev.fullName,
          phone: active.phone || prev.phone,
          addressLine1: active.addressLine1 || prev.addressLine1,
          addressLine2: active.addressLine2 || prev.addressLine2,
          city: active.city || prev.city,
          state: active.state || prev.state,
          postalCode: active.postalCode || prev.postalCode
        }));
      }
    } catch {}

    // Pre-load Razorpay script in background for instant checkout response
    loadRazorpayCheckoutScript().catch(() => {});

    return () => {
      unsub();
      window.removeEventListener('marshans:shipping-policy-updated', handlePolicyUpdate);
    };
  }, []);

  const summary = getCartSummary(items, shippingPolicy);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    selectAddress(addr.id);
    setFormData((prev) => ({
      ...prev,
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || ''
    }));
    setPendingOrder(null);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId('custom');
    setFormData((prev) => ({
      ...prev,
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: ''
    }));
    setPendingOrder(null);
  };

  const handleChange = (e) => {
    const { name } = e.target;
    const value = name === 'postalCode' ? sanitizePincodeInput(e.target.value) : e.target.value;
    setFormData({ ...formData, [name]: value });
    setPendingOrder(null);
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setPendingOrder(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    // Velocity serviceability is temporarily bypassed at checkout: a valid 6-digit PIN proceeds straight to
    // order creation and payment. (The backend serviceability endpoint and shipping.ts client remain in place.)
    if (!isValidPincode(formData.postalCode)) {
      setError(SERVICEABILITY_MESSAGES.invalid_pin);
      return;
    }

    setLoading(true);

    try {
      // Contract-shaped payload (shipping_address.{name,phone,address,city,state,pincode}, items[].product_id).
      // No prices/totals are sent: the backend recomputes everything from its own catalogue.
      const payload = buildOrderPayload(formData, items, paymentMethod);

      // Handle COD (Cash on Delivery)
      if (paymentMethod === 'cod') {
        const res = await createOrder(payload);
        if (res.success) {
          clearCart();
          setPendingOrder(null);
          window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(res.orderNumber)}&total=${summary.total}`;
        } else {
          setLoading(false);
          setError(res.error || 'Failed to place order. Please check connection and try again.');
        }
        return;
      }

      // Handle Online Payment (UPI, Card, NetBanking via Razorpay Standard Checkout)
      const scriptReady = await loadRazorpayCheckoutScript();
      if (!scriptReady || typeof window === 'undefined' || !window.Razorpay) {
        setError('Unable to initialize secure payment gateway. Please check your connection or choose Cash on Delivery.');
        setLoading(false);
        return;
      }

      // Step 1: Create or reuse pending online order in database
      let orderId;
      let orderNumber;

      if (pendingOrder && pendingOrder.orderId) {
        orderId = pendingOrder.orderId;
        orderNumber = pendingOrder.orderNumber;
      } else {
        const orderRes = await createOrder(payload);
        if (!orderRes.success) {
          setError(orderRes.error || 'Failed to place order. Please check connection and try again.');
          setLoading(false);
          return;
        }
        orderId = orderRes.orderId;
        orderNumber = orderRes.orderNumber;
        setPendingOrder({ orderId, orderNumber });
      }

      // Step 2: Request authoritative payment order from backend
      const payInit = await createPaymentOrder(orderId);
      if (!payInit.success) {
        setError(payInit.error || 'Failed to initiate secure payment order.');
        setLoading(false);
        return;
      }

      if (payInit.already_paid) {
        clearCart();
        setPendingOrder(null);
        window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&total=${summary.total}`;
        return;
      }

      const rzpKey = payInit.key_id || (typeof window !== 'undefined' && window.__PUBLIC_RAZORPAY_KEY_ID__) || import.meta.env.PUBLIC_RAZORPAY_KEY_ID;
      if (!rzpKey) {
        setError('Payment gateway configuration is missing. Please select Cash on Delivery or contact customer support.');
        setLoading(false);
        return;
      }

      // Step 3: Launch Razorpay Standard Checkout modal
      const options = {
        key: rzpKey,
        amount: payInit.amount, // Authoritative paise from backend
        currency: payInit.currency || 'INR',
        name: 'THE MARSHANS',
        description: `Order #${orderNumber}`,
        order_id: payInit.gateway_order_id,
        prefill: {
          name: (formData.fullName || payInit.prefill?.name || '').trim(),
          email: (formData.email || payInit.prefill?.email || '').trim(),
          contact: (formData.phone || payInit.prefill?.contact || '').trim()
        },
        theme: {
          color: '#09090b'
        },
        ...(payInit.checkout_config_id ? { checkout_config_id: payInit.checkout_config_id } : {}),
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment window was closed before completion. Your shopping bag is intact. You can retry payment below or choose Cash on Delivery.');
          }
        },
        handler: async (response) => {
          try {
            setLoading(true);
            const verifyRes = await verifyPaymentSignature({
              order_id: orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.success && verifyRes.payment_status === 'paid') {
              clearCart();
              setPendingOrder(null);
              window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&paymentId=${encodeURIComponent(response.razorpay_payment_id)}&total=${summary.total}`;
            } else {
              setError(verifyRes.error || 'Payment signature verification failed. If your money was deducted, our team will confirm your order shortly.');
            }
          } catch (vErr) {
            console.error('Payment verification error:', vErr);
            setError('Payment signature verification encountered a server error. Please contact customer support.');
          } finally {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setLoading(false);
        setError(resp.error?.description || 'Payment was declined by the bank or gateway. Please try another payment method.');
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      setError(err instanceof CheckoutPayloadError
        ? err.message
        : 'An unexpected error occurred while routing your order. Please try again.');
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

            {savedAddresses.length > 0 && (
              <div className="saved-addresses-selector">
                <div className="selector-title-row">
                  <span className="selector-label">Saved Delivery Coordinates</span>
                  <a href="/account/profile" className="manage-addresses-link" target="_blank" rel="noopener noreferrer">
                    Manage Addresses ↗
                  </a>
                </div>
                <div className="saved-addresses-cards">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        className={`saved-addr-choice-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectSavedAddress(addr)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectSavedAddress(addr); }}
                      >
                        <div className="addr-choice-header">
                          <span className={`label-badge label-${addr.label?.toLowerCase() || 'home'}`}>
                            {addr.label || 'Home'}
                          </span>
                          {addr.isDefault && <span className="default-mini-badge">DEFAULT</span>}
                          <div className={`radio-dot ${isSelected ? 'active' : ''}`} />
                        </div>
                        <strong className="choice-name">{addr.fullName}</strong>
                        <p className="choice-text">
                          {addr.addressLine1}, {addr.city} - {addr.postalCode}
                        </p>
                      </div>
                    );
                  })}
                  <div
                    className={`saved-addr-choice-card new-addr-card ${selectedAddressId === 'custom' ? 'selected' : ''}`}
                    onClick={handleUseNewAddress}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleUseNewAddress(); }}
                  >
                    <div className="new-addr-content">
                      <span className="plus-icon">+</span>
                      <strong>New Coordinates</strong>
                      <p>Type custom shipping details below</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  inputMode="numeric"
                  autoComplete="postal-code"
                  pattern="\d{6}"
                  maxLength={6}
                  title="Enter a 6-digit PIN code"
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
                  onChange={() => handlePaymentMethodChange('upi')}
                />
                <div className="payment-opt-info">
                  <strong>Instant UPI</strong>
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
                  onChange={() => handlePaymentMethodChange('card')}
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
                  onChange={() => handlePaymentMethodChange('cod')}
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
                  src={resolveImageUrl(item.imageUrl)}
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
            <span>Standard Air Delivery</span>
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

        .saved-addresses-selector {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .selector-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .selector-label {
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
        }

        .manage-addresses-link {
          font-size: 12px;
          color: #71717a;
          text-decoration: underline;
        }

        .manage-addresses-link:hover {
          color: #09090b;
        }

        .saved-addresses-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }

        .saved-addr-choice-card {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          padding: 14px;
          background: #fafafa;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .saved-addr-choice-card:hover {
          border-color: #111111;
          background: #ffffff;
        }

        .saved-addr-choice-card.selected {
          border-color: #111111;
          background: #ffffff;
          box-shadow: 0 0 0 1px #111111;
        }

        .addr-choice-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 4px;
        }

        .default-mini-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 5px;
          background: #111111;
          color: #ffffff;
          border-radius: 3px;
        }

        .radio-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid #a1a1aa;
          margin-left: auto;
          position: relative;
        }

        .radio-dot.active {
          border-color: #111111;
        }

        .radio-dot.active::after {
          content: '';
          position: absolute;
          inset: 2.5px;
          border-radius: 50%;
          background: #111111;
        }

        .choice-name {
          font-size: 13px;
          color: #09090b;
        }

        .choice-text {
          font-size: 11px;
          color: #71717a;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .new-addr-card {
          border-style: dashed;
          background: #ffffff;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .new-addr-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .plus-icon {
          font-size: 18px;
          font-weight: 700;
          color: #71717a;
        }

        .new-addr-card strong {
          font-size: 12px;
          color: #09090b;
        }

        .new-addr-card p {
          font-size: 10px;
          color: #a1a1aa;
          margin: 0;
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
