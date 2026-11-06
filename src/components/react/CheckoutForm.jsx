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
  createCustomForgeOrderApi,
  resolveVariantNumericId,
  resolveVariantKey
} from '../../lib/api/customForge';
import {
  sanitizePincodeInput,
  isValidPincode,
  SERVICEABILITY_MESSAGES
} from '../../lib/api/shipping';
import { resolveImageUrl } from '../../lib/utils/media';
import { buildOrderPayload, CheckoutPayloadError } from '../../lib/api/checkoutPayload';
import {
  getAppliedCoupon,
  saveAppliedCoupon,
  clearAppliedCoupon,
  validateCouponApi,
  calculateCouponDiscount,
  normalizeCoupon
} from '../../lib/api/coupons';
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
  const [appliedCoupon, setAppliedCoupon] = useState(getAppliedCoupon());
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

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

    const handleCouponUpdate = (e) => {
      setAppliedCoupon(e.detail ? normalizeCoupon(e.detail) : null);
    };
    window.addEventListener('marshans:coupon-updated', handleCouponUpdate);
    setAppliedCoupon(getAppliedCoupon());

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
      window.removeEventListener('marshans:coupon-updated', handleCouponUpdate);
    };
  }, []);

  const summary = getCartSummary(items, shippingPolicy);
  const grossSubtotal = Math.max(0, Number(summary.subtotal) || 0);
  const couponDiscount = calculateCouponDiscount(appliedCoupon, grossSubtotal);
  const shippingFee = Math.max(0, Number(summary.shipping) || 0);
  const netMerchandise = Math.max(0, grossSubtotal - couponDiscount);
  const finalPayableTotal = Math.max(0, netMerchandise + shippingFee);

  // Auto-remove coupon if cart drops below required minimum spend
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
      setCouponError(`Coupon ${appliedCoupon.code} removed: minimum order of ₹${minVal.toLocaleString('en-IN')} required.`);
    }
  }, [grossSubtotal, appliedCoupon]);

  const handleApplyCoupon = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponLoading(true);
    const result = await validateCouponApi(code, grossSubtotal);
    setCouponLoading(false);
    if (result.success && result.coupon) {
      setAppliedCoupon(result.coupon);
      saveAppliedCoupon(result.coupon);
      setCouponInput('');
      setCouponError('');
      setPendingOrder(null);
    } else {
      setCouponError(result.error || 'Failed to apply coupon.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    clearAppliedCoupon();
    setCouponError('');
    setPendingOrder(null);
  };

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

    const hasCustomForgeItem = items.some(it => it.options?.is_custom_forge);

    try {
      // -------------------------------------------------------------
      // CUSTOM FORGE DEDICATED CHECKOUT FLOW
      // -------------------------------------------------------------
      if (hasCustomForgeItem) {
        const cfItems = items.filter(it => it.options?.is_custom_forge);
        if (cfItems.length > 0) {
          if (paymentMethod === 'cod') {
            setError('Custom Forge pieces are precision made-to-order and require online payment authorization.');
            setLoading(false);
            return;
          }

          const scriptReady = await loadRazorpayCheckoutScript();
          if (!scriptReady || typeof window === 'undefined' || !window.Razorpay) {
            setError('Unable to initialize secure payment gateway. Please check your connection.');
            setLoading(false);
            return;
          }

          let orderId;
          let orderNumber;

          if (pendingOrder && pendingOrder.orderId) {
            orderId = pendingOrder.orderId;
            orderNumber = pendingOrder.orderNumber;
          } else {
            const line1 = (formData.addressLine1 || '').trim();
            const line2 = (formData.addressLine2 || '').trim();
            const fullAddress = line2 ? `${line1}, ${line2}` : line1;

            const primaryCf = cfItems[0];
            const primaryNumericId = resolveVariantNumericId(
              primaryCf.options?.variant_numeric_id || primaryCf.options?.variant_id || primaryCf.productId
            );
            const primaryVariantKey = resolveVariantKey(
              primaryCf.options?.variant_key || primaryCf.options?.variant_id || primaryCf.productId
            );

            const cfPayload = {
              coupon_code: appliedCoupon?.code || undefined,
              variant_id: primaryNumericId,
              variant_key: primaryVariantKey,
              quantity: Number(primaryCf.quantity) || 1,
              custom_mode: primaryCf.options?.custom_mode_enabled ? 1 : 0,
              customization: primaryCf.options?.custom_mode_enabled ? {
                customer_name: primaryCf.options?.custom_name || '',
                customer_designation: primaryCf.options?.custom_designation || 'NIL',
                nameplate_material: primaryCf.options?.nameplate_material || 'Plastic'
              } : null,
              items: cfItems.map(it => {
                const numId = resolveVariantNumericId(it.options?.variant_numeric_id || it.options?.variant_id || it.productId);
                const varKey = resolveVariantKey(it.options?.variant_key || it.options?.variant_id || it.productId);
                return {
                  variant_id: numId,
                  variant_key: varKey,
                  quantity: Number(it.quantity) || 1,
                  custom_mode: it.options?.custom_mode_enabled ? 1 : 0,
                  customization: it.options?.custom_mode_enabled ? {
                    customer_name: it.options?.custom_name || '',
                    customer_designation: it.options?.custom_designation || 'NIL',
                    nameplate_material: it.options?.nameplate_material || 'Plastic'
                  } : null
                };
              }),
              shipping_address: {
                name: (formData.fullName || '').trim(),
                phone: (formData.phone || '').trim(),
                address: fullAddress,
                city: (formData.city || '').trim(),
                state: (formData.state || '').trim(),
                pincode: (formData.postalCode || '').trim(),
                country: 'India',
                email: (formData.email || '').trim()
              }
            };

            const orderRes = await createCustomForgeOrderApi(cfPayload);
            if (!orderRes.success || !orderRes.data) {
              setError(orderRes.error || 'Failed to place Custom Forge order.');
              setLoading(false);
              return;
            }

            orderId = orderRes.data.id;
            orderNumber = orderRes.data.order_number;
            setPendingOrder({ orderId, orderNumber });
          }

          // Step 2: Request authoritative payment order from backend using canonical orderNumber
          const payInit = await createPaymentOrder(orderNumber || orderId);
          if (!payInit.success) {
            setError(payInit.error || 'Failed to initiate secure payment order.');
            setLoading(false);
            return;
          }

          if (payInit.already_paid) {
            clearCart();
            clearAppliedCoupon();
            setPendingOrder(null);
            window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&total=${finalPayableTotal}`;
            return;
          }

          const rzpKey = payInit.key_id || (typeof window !== 'undefined' && window.__PUBLIC_RAZORPAY_KEY_ID__) || import.meta.env.PUBLIC_RAZORPAY_KEY_ID;
          if (!rzpKey) {
            setError('Payment gateway configuration is missing. Please contact customer support.');
            setLoading(false);
            return;
          }

          // Step 3: Launch Razorpay Standard Checkout modal
          const options = {
            key: rzpKey,
            amount: payInit.amount,
            currency: payInit.currency || 'INR',
            name: 'THE MARSHANS',
            description: `Custom Forge Order #${orderNumber}`,
            order_id: payInit.gateway_order_id,
            prefill: {
              name: (formData.fullName || payInit.prefill?.name || '').trim(),
              email: (formData.email || payInit.prefill?.email || '').trim(),
              contact: (formData.phone || payInit.prefill?.contact || '').trim()
            },
            theme: {
              color: '#14251a'
            },
            ...(payInit.checkout_config_id ? { checkout_config_id: payInit.checkout_config_id } : {}),
            modal: {
              ondismiss: () => {
                setLoading(false);
                setError('Payment window was dismissed. Your allocation is preserved; you can retry payment below.');
              }
            },
            handler: async (response) => {
              try {
                setLoading(true);
                const verifyRes = await verifyPaymentSignature({
                  order_id: orderNumber || orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });

                if (verifyRes.success && verifyRes.payment_status === 'paid') {
                  clearCart();
                  clearAppliedCoupon();
                  setPendingOrder(null);
                  window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&paymentId=${encodeURIComponent(response.razorpay_payment_id)}&total=${finalPayableTotal}`;
                } else {
                  setError(verifyRes.error || 'Payment signature verification failed.');
                }
              } catch (vErr) {
                console.error('Payment verification error:', vErr);
                setError('Payment signature verification encountered a server error.');
              } finally {
                setLoading(false);
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', (resp) => {
            setLoading(false);
            setError(resp.error?.description || 'Payment was declined by your bank.');
          });
          rzp.open();
          return;
        }
      }

      // -------------------------------------------------------------
      // STANDARD RETAIL CHECKOUT FLOW (UNCHANGED)
      // -------------------------------------------------------------
      // Contract-shaped payload (shipping_address.{name,phone,address,city,state,pincode}, items[].product_id).
      // No prices/totals are sent: the backend recomputes everything from its own catalogue.
      const payload = buildOrderPayload(formData, items, paymentMethod, appliedCoupon?.code);

      // Handle COD (Cash on Delivery)
      if (paymentMethod === 'cod') {
        const res = await createOrder(payload);
        if (res.success) {
          clearCart();
          clearAppliedCoupon();
          setPendingOrder(null);
          window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(res.orderNumber)}&total=${finalPayableTotal}`;
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
        clearAppliedCoupon();
        setPendingOrder(null);
        window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&total=${finalPayableTotal}`;
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
              clearAppliedCoupon();
              setPendingOrder(null);
              window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&paymentId=${encodeURIComponent(response.razorpay_payment_id)}&total=${finalPayableTotal}`;
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

              {!items.some(it => it.options?.is_custom_forge) ? (
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
              ) : (
                <div className="cf-online-only-note">
                  <span className="cf-lock-icon">🔒</span>
                  <span>Custom Forge made-to-order artifacts require online payment authorization (Instant UPI, Cards, NetBanking).</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary place-order-submit-btn"
          >
            {loading ? 'Fabricating & Placing Order...' : `Authorize & Confirm Order (₹${finalPayableTotal.toLocaleString('en-IN')})`}
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
                  style={item.options?.is_custom_forge ? { objectFit: 'contain', padding: '3px', background: '#f8fafc' } : {}}
                />
                <div className="checkout-item-details">
                  <h4>{item.name}</h4>
                  <div className="item-sub-specs">
                    {item.options?.is_custom_forge ? (
                      <div className="cf-checkout-specs">
                        <span className="cf-spec-edition-tag">Edition: {item.options.size_label}</span>
                        {item.options.custom_mode_enabled && (
                          <div className="cf-mounted-summary-line">
                            <span>Nameplate: <strong>{item.options.custom_name}</strong></span>
                            {item.options.custom_designation && item.options.custom_designation !== 'NIL' && (
                              <span> ({item.options.custom_designation})</span>
                            )}
                            <span> [{item.options.nameplate_material || 'Plastic'}]</span>
                          </div>
                        )}
                        <span>Qty: {item.quantity}</span>
                      </div>
                    ) : (
                      <>
                        {item.material && <span>{item.material}</span>}
                        <span>Qty: {item.quantity}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="checkout-item-price">
                  ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          <div className="summary-divider" />

          {/* Coupon / Promo Code Entry & Status */}
          <div className="checkout-coupon-section">
            {appliedCoupon ? (
              <div className="checkout-applied-coupon-card">
                <div className="applied-coupon-info">
                  <span className="applied-coupon-badge">🎟️ {appliedCoupon.code}</span>
                  <span className="applied-coupon-discount">
                    {appliedCoupon.discountType === 'percent'
                      ? `${appliedCoupon.discountValue}% OFF`
                      : `₹${Number(appliedCoupon.discountRupees).toLocaleString('en-IN')} OFF`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="applied-coupon-remove-btn"
                  aria-label="Remove coupon"
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="checkout-coupon-input-group">
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. MARS105)"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(e); } }}
                  className="checkout-coupon-input"
                  disabled={couponLoading}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="checkout-coupon-apply-btn"
                >
                  {couponLoading ? 'APPLYING...' : 'APPLY'}
                </button>
              </div>
            )}
            {couponError && <div className="checkout-coupon-error">{couponError}</div>}
          </div>

          <div className="summary-divider" />

          <div className="summary-line">
            <span>Product Subtotal</span>
            <span>₹{grossSubtotal.toLocaleString('en-IN')}</span>
          </div>

          {appliedCoupon && couponDiscount > 0 && (
            <div className="summary-line coupon-line">
              <div className="coupon-label-group">
                <span className="coupon-tag-badge">🎟️ {appliedCoupon.code}</span>
                <span className="coupon-disc-text">
                  {appliedCoupon.discountType === 'percent'
                    ? `Coupon Discount (${appliedCoupon.discountValue}%)`
                    : 'Coupon Discount'}
                </span>
              </div>
              <span className="coupon-discount-val">−₹{couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="summary-line">
            <span>Standard Air Delivery</span>
            <span>{shippingFee === 0 ? <strong className="free-shipping-text">FREE</strong> : `₹${shippingFee}`}</span>
          </div>

          <div className="summary-divider" />

          <div className="summary-line total-line final-payable-line">
            <span className="total-label">Final Payable</span>
            <span className="total-val">₹{finalPayableTotal.toLocaleString('en-IN')}</span>
          </div>

          {appliedCoupon && couponDiscount > 0 && (
            <div className="coupon-savings-callout">
              <span>🎉 You save <strong>₹{couponDiscount.toLocaleString('en-IN')}</strong> on this order</span>
            </div>
          )}

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

        .summary-title {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 20px;
          letter-spacing: 0.05em;
          color: #09090b;
          margin: 0 0 18px 0;
        }

        .summary-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          color: #52525b;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .summary-divider {
          height: 1px;
          background: #f4f4f5;
          margin: 16px 0;
        }

        .coupon-line {
          color: #15803d;
          font-weight: 600;
        }

        .coupon-label-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .coupon-tag-badge {
          font-family: monospace;
          font-size: 11px;
          font-weight: 700;
          color: #166534;
          background: #dcfce7;
          border: 1px solid #86efac;
          border-radius: 4px;
          padding: 1px 5px;
        }

        .coupon-disc-text {
          font-size: 13px;
        }

        .coupon-discount-val {
          font-weight: 700;
          color: #15803d;
          font-size: 14px;
        }

        .free-shipping-text {
          color: #15803d;
          font-weight: 700;
        }

        .total-line {
          font-size: 16px;
          font-weight: 800;
          color: #09090b;
          margin-bottom: 6px;
        }

        .final-payable-line {
          padding-top: 4px;
        }

        .total-label {
          font-size: 16px;
          font-weight: 800;
          color: #09090b;
        }

        .total-val {
          font-size: 24px;
          font-weight: 800;
          color: #09090b;
          letter-spacing: -0.02em;
        }

        .coupon-savings-callout {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 8px 12px;
          margin-top: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #166534;
          text-align: center;
        }

        .cf-online-only-note {
          background: #fcfbf9;
          border: 1px dashed rgba(20, 37, 26, 0.25);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 12px;
          color: #27272a;
          line-height: 1.45;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cf-checkout-specs {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11px;
        }

        .cf-spec-edition-tag {
          font-weight: 700;
          color: #14251a;
        }

        .cf-mounted-summary-line {
          font-size: 10px;
          color: #52525b;
          background: #f4f4f5;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
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

        .checkout-coupon-section {
          margin: 14px 0;
        }

        .checkout-coupon-input-group {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }

        .checkout-coupon-input {
          flex: 1;
          background: #fafafa;
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          font-family: monospace;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #09090b;
          transition: all 0.2s ease;
        }

        .checkout-coupon-input:focus {
          outline: none;
          background: #ffffff;
          border-color: #09090b;
          box-shadow: 0 0 0 1px #09090b;
        }

        .checkout-coupon-apply-btn {
          background: #14251a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0 16px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .checkout-coupon-apply-btn:hover:not(:disabled) {
          background: #000000;
        }

        .checkout-coupon-apply-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .checkout-applied-coupon-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 10px 14px;
        }

        .applied-coupon-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .applied-coupon-badge {
          font-family: monospace;
          font-weight: 700;
          font-size: 13px;
          color: #166534;
          background: #dcfce7;
          border: 1px solid #86efac;
          border-radius: 4px;
          padding: 2px 6px;
        }

        .applied-coupon-discount {
          font-size: 12px;
          font-weight: 700;
          color: #15803d;
        }

        .applied-coupon-remove-btn {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px;
          transition: opacity 0.15s ease;
        }

        .applied-coupon-remove-btn:hover {
          opacity: 0.7;
          text-decoration: underline;
        }

        .checkout-coupon-error {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 6px 10px;
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
