import React, { useState, useEffect } from 'react';
import { onAuthStateChange } from '../../lib/firebase/client';
import { getOrders, getOrderTracking } from '../../lib/api/orders';
import { formatPaymentStatus } from '../../lib/api/orderMapper';
import { loadRazorpayCheckoutScript, createPaymentOrder, verifyPaymentSignature } from '../../lib/api/payments';
import AccountNav from './AccountNav';

export default function OrdersList() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [retryingOrderId, setRetryingOrderId] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadOrders();
      } else {
        setOrders([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Handle URL track param on mount or after orders load
  useEffect(() => {
    if (orders.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const trackParam = params.get('track');
      if (trackParam) {
        const found = orders.find(
          (o) => String(o.id) === String(trackParam) || String(o.order_number) === String(trackParam)
        );
        if (found) {
          setSelectedOrder(found);
        }
      }
    } catch {}
  }, [orders]);

  // Load tracking details when modal opens
  useEffect(() => {
    if (selectedOrder) {
      setTrackingLoading(true);
      getOrderTracking(selectedOrder.id)
        .then((data) => setTrackingInfo(data))
        .catch(() => setTrackingInfo(null))
        .finally(() => setTrackingLoading(false));
    } else {
      setTrackingInfo(null);
    }
  }, [selectedOrder]);

  // Safe payment retry via official Razorpay Standard Checkout SDK
  const handleRetryPayment = async (order, e) => {
    if (e) e.stopPropagation();
    setActionMessage({ type: '', text: '' });
    setRetryingOrderId(order.id);

    try {
      const scriptLoaded = await loadRazorpayCheckoutScript();
      if (!scriptLoaded) {
        throw new Error('Payment gateway SDK failed to load. Please verify your network connection.');
      }

      const initRes = await createPaymentOrder(order.order_number || order.id);
      if (initRes.already_paid) {
        setActionMessage({
          type: 'success',
          text: `Order #${order.order_number || order.id} is already verified and marked Paid.`
        });
        await loadOrders();
        return;
      }

      if (!initRes.success || !initRes.gateway_order_id) {
        throw new Error(initRes.error || 'Failed to initialize payment gateway.');
      }

      const options = {
        key: initRes.key_id,
        amount: initRes.amount,
        currency: initRes.currency || 'INR',
        name: 'THE MARSHANS',
        description: `Order #${order.order_number || order.id}`,
        order_id: initRes.gateway_order_id,
        prefill: initRes.prefill || {
          name: order.shipping_address?.name || '',
          email: order.customer_email || user?.email || '',
          contact: order.shipping_address?.phone || ''
        },
        theme: { color: '#09090b' },
        handler: async (response) => {
          try {
            const verifyRes = await verifyPaymentSignature({
              order_id: order.order_number || order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.success) {
              setActionMessage({
                type: 'success',
                text: `Payment confirmed for Order #${order.order_number || order.id}! Status is now Paid.`
              });
              await loadOrders();
            } else {
              setActionMessage({
                type: 'error',
                text: verifyRes.error || 'Payment verification encountered an issue. Please contact collector support.'
              });
            }
          } catch (verifyErr) {
            setActionMessage({
              type: 'error',
              text: verifyErr.message || 'Signature verification error.'
            });
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setActionMessage({
          type: 'error',
          text: resp.error?.description || 'Payment was declined by bank or gateway.'
        });
      });
      rzp.open();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Unable to open payment gateway.'
      });
    } finally {
      setRetryingOrderId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="orders-loading-wrap">
        <div className="spinner"></div>
        <p>Connecting to Marshan dispatch network...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="orders-wrapper">
        <div className="orders-guest-state">
          <div className="orders-box-icon">🔒</div>
          <h2>Collector Sign-In Required</h2>
          <p>Please sign in to inspect your order dispatches, live manufacturing queue, and waybill tracking numbers.</p>
          <div className="guest-action-row">
            <a href="/login?redirect=/account/orders" className="btn btn-primary">Sign In</a>
            <a href="/#home-carousel-section" className="btn btn-outline">Explore Artifacts</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-wrapper">
      <AccountNav activeTab="orders" />

      {actionMessage.text && (
        <div className={`orders-alert alert-${actionMessage.type}`}>
          <span>{actionMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{actionMessage.text}</span>
          <button type="button" onClick={() => setActionMessage({ type: '', text: '' })} className="alert-close">✕</button>
        </div>
      )}

      {loading ? (
        <div className="orders-loading-wrap">
          <div className="spinner"></div>
          <p>Retrieving your order dispatches from the Marshan network...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-empty-state">
          <div className="orders-box-icon">📦</div>
          <h2>No Orders Found</h2>
          <p>You haven't placed any orders yet. Discover our signature Lady Justice statue.</p>
          <div className="empty-actions-row">
            <a href="/product/lady-justice/" className="btn btn-primary">View Lady Justice Statue</a>
            <button type="button" onClick={loadOrders} className="btn btn-outline btn-sm">Refresh Orders ↻</button>
          </div>
        </div>
      ) : (
        <div className="orders-list-layout">
          <div className="orders-feed-header">
            <span className="orders-count-tag">Showing {orders.length} Dispatches</span>
            <button type="button" onClick={loadOrders} className="btn btn-outline btn-sm refresh-btn">
              Refresh ↻
            </button>
          </div>

          <div className="orders-feed">
            {orders.map((ord) => {
              const paymentInfo = formatPaymentStatus(ord.payment_status);
              const isUnpaid = paymentInfo.canRetryPayment;

              return (
                <div key={ord.id} className="order-card-detailed">
                  <div className="order-card-header">
                    <div className="order-id-group">
                      <span className="order-label">ORDER</span>
                      <strong className="order-num">#{ord.order_number || ord.id}</strong>
                      <span className="order-date">
                        {new Date(ord.created_at || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="order-header-right">
                      <span className={`payment-tag ${paymentInfo.badgeClass}`}>
                        {paymentInfo.label}
                      </span>
                      <span className={`status-tag status-${(ord.status || 'confirmed').toLowerCase().replace(/\s+/g, '-')}`}>
                        {ord.status || 'Print Queued'}
                      </span>
                      <span className="order-total">₹{Number(ord.total_amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Items in this order */}
                  <div className="order-items-list">
                    {(ord.items || []).map((item, idx) => {
                      const isCustom = Boolean(item.customization && (item.customization.name || item.customization.custom_mode_enabled));
                      const matName = item.nameplate_material || item.customization?.material || item.material;
                      const isWood = /mdf/i.test(matName) || /wood/i.test(matName);
                      const hasCustomCharges = isCustom && (item.nameplate_charge || item.material_charge || item.price === 3529 || item.price === 3579 || item.price === 5629 || item.price === 5679);
                      const nameplateFee = item.nameplate_charge || (hasCustomCharges ? 29 : 0);
                      const woodFee = item.material_charge || (hasCustomCharges && isWood ? 50 : 0);
                      const baseUnit = item.base_price || (hasCustomCharges ? (item.price - nameplateFee - woodFee) : item.price);

                      return (
                        <div key={idx} className="order-item-row">
                          <img
                            src={item.image_url || '/assets/placeholders/product-placeholder.svg'}
                            alt={item.name}
                            className="order-item-thumb"
                          />
                          <div className="order-item-info">
                            <h4 className="item-title">{item.name}</h4>
                            <div className="item-specs">
                              {item.finishing && <span className="spec-pill">Edition: {item.finishing}</span>}
                              {matName && <span className="spec-pill">Plinth: {isWood ? 'Organic Wood / MDF' : 'Precision Polymer'}</span>}
                              <span>Qty: {item.quantity}</span>
                            </div>

                            {item.customization?.name && (
                              <div className="item-customization-box">
                                <span className="custom-box-label">BESPOKE NAMEPLATE</span>
                                <div className="custom-box-content">
                                  <span>Name: <strong>{item.customization.name}</strong></span>
                                  {item.customization.designation && item.customization.designation.toUpperCase() !== 'NIL' && (
                                    <span>Designation: <strong>{item.customization.designation}</strong></span>
                                  )}
                                  <span>Material: <strong>{isWood ? 'Organic Wood / MDF (+₹50)' : 'Precision Polymer (+₹0)'}</strong></span>
                                </div>
                              </div>
                            )}

                            {hasCustomCharges && (
                              <div className="item-pricing-breakdown">
                                <span>Base: ₹{Number(baseUnit).toLocaleString('en-IN')}</span>
                                {nameplateFee > 0 && <span className="add-fee">• Nameplate: +₹{nameplateFee}</span>}
                                {woodFee > 0 && <span className="add-fee">• Wood / MDF: +₹{woodFee}</span>}
                              </div>
                            )}
                          </div>
                          <div className="item-price">
                            ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Footer & Breakdown info */}
                  <div className="order-card-footer">
                    <div className="shipping-address-snippet">
                      <span>Shipping to: <strong>{ord.shipping_address?.city || 'India'}</strong> ({ord.shipping_address?.postal_code || ord.shipping_address?.postalCode || 'PIN'})</span>
                      {ord.coupon_code && <span className="coupon-used-badge">🎟️ {ord.coupon_code}</span>}
                    </div>

                    <div className="order-actions-cluster">
                      {isUnpaid && (
                        <button
                          type="button"
                          onClick={(e) => handleRetryPayment(ord, e)}
                          disabled={retryingOrderId === ord.id}
                          className="btn btn-warning btn-sm retry-payment-btn"
                        >
                          {retryingOrderId === ord.id ? (
                            'Opening Gateway...'
                          ) : ord.payment_status === 'failed' ? (
                            `Retry Payment (₹${Number(ord.total_amount).toLocaleString('en-IN')}) →`
                          ) : (
                            `Complete Payment (₹${Number(ord.total_amount).toLocaleString('en-IN')}) →`
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="btn btn-primary btn-sm track-order-action-btn"
                      >
                        Track Order →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fulfillment Status & Order Details Modal */}
      {selectedOrder && (
        <div className="tracking-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="tracking-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">ORDER DETAILS & TRACKING</span>
                <h3>#{selectedOrder.order_number || selectedOrder.id}</h3>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="close-btn" aria-label="Close modal">✕</button>
            </div>

            <div className="modal-body">
              {/* Order Meta Header */}
              <div className="order-summary-mini">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(() => {
                      const pStatus = formatPaymentStatus(selectedOrder.payment_status);
                      return (
                        <span className={`payment-tag ${pStatus.badgeClass}`}>
                          {pStatus.label}
                        </span>
                      );
                    })()}
                    <span className="order-date-tag">
                      {new Date(selectedOrder.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <span style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: selectedOrder.status === 'Delivered' ? '#dcfce7' : '#e0f2fe',
                    color: selectedOrder.status === 'Delivered' ? '#15803d' : '#0369a1',
                    fontWeight: 700
                  }}>
                    {trackingInfo?.current_status || selectedOrder.status}
                  </span>
                </div>

                {selectedOrder.transaction_id && (
                  <span className="tx-ref-line">
                    Transaction Ref: <code>{selectedOrder.transaction_id}</code>
                  </span>
                )}

                {formatPaymentStatus(selectedOrder.payment_status).canRetryPayment && (
                  <div className="modal-retry-notice">
                    <p>This order is currently pending payment. Authorize the transaction to advance your piece into the manufacturing queue.</p>
                    <button
                      type="button"
                      onClick={(e) => handleRetryPayment(selectedOrder, e)}
                      disabled={retryingOrderId === selectedOrder.id}
                      className="btn btn-warning btn-sm"
                    >
                      {retryingOrderId === selectedOrder.id ? 'Connecting Gateway...' : `Authorize & Pay ₹${Number(selectedOrder.total_amount).toLocaleString('en-IN')} →`}
                    </button>
                  </div>
                )}
              </div>

              {/* Items in this Order */}
              <div className="modal-section-card">
                <h4 className="modal-section-title">Purchased Items & Specifications</h4>
                <div className="modal-items-list">
                  {(selectedOrder.items || []).map((item, idx) => {
                    const isCustom = Boolean(item.customization && (item.customization.name || item.customization.custom_mode_enabled));
                    const matName = item.nameplate_material || item.customization?.material || item.material;
                    const isWood = /mdf/i.test(matName) || /wood/i.test(matName);
                    const hasCustomCharges = isCustom && (item.nameplate_charge || item.material_charge || item.price === 3529 || item.price === 3579 || item.price === 5629 || item.price === 5679);
                    const nameplateFee = item.nameplate_charge || (hasCustomCharges ? 29 : 0);
                    const woodFee = item.material_charge || (hasCustomCharges && isWood ? 50 : 0);
                    const baseUnit = item.base_price || (hasCustomCharges ? (item.price - nameplateFee - woodFee) : item.price);

                    return (
                      <div key={idx} className="modal-item-row">
                        <img
                          src={item.image_url || '/assets/placeholders/product-placeholder.svg'}
                          alt={item.name}
                          className="modal-item-thumb"
                        />
                        <div className="modal-item-details">
                          <strong className="item-name">{item.name}</strong>
                          <div className="item-meta-tags">
                            {item.finishing && <span>Edition: {item.finishing}</span>}
                            {matName && <span>Plinth: {isWood ? 'Organic Wood / MDF' : 'Precision Polymer'}</span>}
                            <span>Quantity: {item.quantity}</span>
                          </div>

                          {item.customization?.name && (
                            <div className="modal-custom-detail">
                              <span className="custom-detail-title">Mounted Bespoke Nameplate:</span>
                              <p>Name: <strong>{item.customization.name}</strong></p>
                              {item.customization.designation && item.customization.designation.toUpperCase() !== 'NIL' && (
                                <p>Title: <strong>{item.customization.designation}</strong></p>
                              )}
                              <p>Material: <strong>{isWood ? 'Organic Wood / MDF (+₹50)' : 'Precision Polymer (+₹0)'}</strong></p>
                            </div>
                          )}

                          {hasCustomCharges && (
                            <div className="modal-price-breakdown">
                              <span>Base Edition: ₹{Number(baseUnit).toLocaleString('en-IN')}</span>
                              {nameplateFee > 0 && <span>+ Nameplate Personalization: ₹{nameplateFee}</span>}
                              {woodFee > 0 && <span>+ Organic Wood Upgrade: ₹{woodFee}</span>}
                            </div>
                          )}
                        </div>
                        <div className="modal-item-price">
                          ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="modal-section-card">
                <h4 className="modal-section-title">Order Cost Breakdown</h4>
                <div className="cost-breakdown-table">
                  <div className="cost-row">
                    <span>Merchandise Subtotal</span>
                    <span>₹{Number(selectedOrder.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="cost-row discount-row">
                      <span>Coupon Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}</span>
                      <span>−₹{Number(selectedOrder.discount_amount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="cost-row">
                    <span>Standard Air Delivery (Store 2 Flat)</span>
                    <span>₹{Number(selectedOrder.shipping_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="cost-row grand-total-row">
                    <strong>Total Amount Payable</strong>
                    <strong className="grand-total">₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Shipping Coordinates */}
              {selectedOrder.shipping_address && (
                <div className="modal-section-card">
                  <h4 className="modal-section-title">Delivery Coordinates</h4>
                  <div className="shipping-address-detail">
                    <p><strong>{selectedOrder.shipping_address.name}</strong> • {selectedOrder.shipping_address.phone}</p>
                    <p>{selectedOrder.shipping_address.line1} {selectedOrder.shipping_address.line2}</p>
                    <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} — {selectedOrder.shipping_address.postal_code || selectedOrder.shipping_address.postalCode}</p>
                  </div>
                </div>
              )}

              {/* STAGE 1: ORDER PROCESSING TIMELINE */}
              {(() => {
                const rawStatus = String(selectedOrder.status || '').toLowerCase();
                const isDelivered = rawStatus.includes('deliver');
                const isShipped = isDelivered || rawStatus.includes('ship') || rawStatus.includes('dispatch') || rawStatus.includes('transit');
                const isReadyToShip = isShipped || rawStatus.includes('ready');
                const isProcessing = isReadyToShip || rawStatus.includes('process') || rawStatus.includes('produc') || rawStatus.includes('manufactur') || rawStatus.includes('print');
                const isPlaced = true;

                return (
                  <div className="modal-section-card">
                    <h4 className="modal-section-title">Order Processing</h4>
                    <div className="processing-steps-row">
                      {/* Step 1: Order Placed */}
                      <div className={`process-step ${isPlaced ? 'step-done' : 'step-current'}`}>
                        <div className="step-marker">{isPlaced ? '✓' : '1'}</div>
                        <div className="step-info">
                          <strong>Order Placed</strong>
                          <span>
                            {new Date(selectedOrder.created_at || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Step 2: Processing */}
                      <div className={`process-step ${isReadyToShip ? 'step-done' : isProcessing ? 'step-active' : 'step-pending'}`}>
                        <div className="step-marker">{isReadyToShip ? '✓' : isProcessing ? '●' : '2'}</div>
                        <div className="step-info">
                          <strong>Processing</strong>
                          <span>{isReadyToShip ? 'Completed' : isProcessing ? 'In Progress' : 'Queued'}</span>
                        </div>
                      </div>

                      {/* Step 3: Ready to Ship */}
                      <div className={`process-step ${isShipped ? 'step-done' : isReadyToShip ? 'step-active' : 'step-pending'}`}>
                        <div className="step-marker">{isShipped ? '✓' : isReadyToShip ? '●' : '3'}</div>
                        <div className="step-info">
                          <strong>Ready to Ship</strong>
                          <span>{isShipped ? 'Dispatched' : isReadyToShip ? 'Packaged & Ready' : 'Pending'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* STAGE 2: COURIER TRACKING */}
              {(() => {
                const realAwb = trackingInfo?.tracking_no || selectedOrder.tracking_no;
                const hasRealAwb = Boolean(realAwb && String(realAwb).trim() !== '');
                const courierName = trackingInfo?.courier || selectedOrder.courier || 'Velocity Air Express';
                const shipmentStatus = trackingInfo?.current_status || trackingInfo?.status || 'In Transit';
                const rawStatus = String(selectedOrder.status || '').toLowerCase();
                const isDelivered = rawStatus.includes('deliver') || shipmentStatus.toLowerCase().includes('deliver');

                return (
                  <div className="modal-section-card">
                    <h4 className="modal-section-title">Courier Tracking</h4>
                    {hasRealAwb ? (
                      <div className="courier-tracking-block">
                        <div className="carrier-status-summary">
                          <div>
                            <span className="courier-field-label">Courier: </span>
                            <strong>{courierName}</strong>
                          </div>
                          <div>
                            <span className="courier-field-label">AWB Number: </span>
                            <strong className="awb-code">{realAwb}</strong>
                          </div>
                          <div>
                            <span className="courier-field-label">Shipment Status: </span>
                            <span className="shipment-status-tag">{shipmentStatus}</span>
                          </div>
                        </div>

                        {trackingInfo?.track_url && (
                          <div style={{ marginTop: '10px' }}>
                            <a
                              href={trackingInfo.track_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                            >
                              Open Carrier Live Tracking ↗
                            </a>
                          </div>
                        )}

                        {trackingLoading ? (
                          <div style={{ padding: '20px 0', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                            Connecting to live carrier telemetry...
                          </div>
                        ) : trackingInfo?.activities && trackingInfo.activities.length > 0 ? (
                          <div className="tracking-timeline" style={{ marginTop: '16px' }}>
                            {trackingInfo.activities.map((act, idx) => (
                              <div key={idx} className={`timeline-step ${idx === 0 ? 'step-active' : 'step-complete'}`}>
                                <div className="step-circle">{idx === 0 ? '●' : '✓'}</div>
                                <div className="step-content">
                                  <strong>{act.activity || act.status || 'Consignment Update'}</strong>
                                  {act.location && <p>Location: {act.location}</p>}
                                  {(act.date || act.time || act.timestamp) && (
                                    <p style={{ fontSize: '11px', color: '#a1a1aa' }}>
                                      {[act.date, act.time].filter(Boolean).join(' ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {isDelivered && (
                          <div className="delivery-confirmed-alert">
                            <span className="delivery-check-icon">✓</span>
                            <div>
                              <strong>Delivery Confirmed</strong>
                              <p>Your package has been successfully delivered to your shipping address.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="tracking-pending-notice-card">
                        <div className="pending-notice-icon">📦</div>
                        <p className="pending-notice-text">
                          Your order is being processed. Tracking details will appear once your order is dispatched.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn btn-outline"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .orders-wrapper {
          max-width: 900px;
          margin: 0 auto;
        }

        .orders-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .alert-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-close {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: inherit;
        }

        .orders-loading-wrap, .orders-empty-state, .orders-guest-state {
          text-align: center;
          padding: 72px 20px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #09090b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .orders-box-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .orders-empty-state h2, .orders-guest-state h2 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: clamp(24px, 4vw, 32px);
          letter-spacing: 0.02em;
          margin-bottom: 8px;
        }

        .orders-empty-state p, .orders-guest-state p {
          color: #71717a;
          font-size: 14px;
          max-width: 440px;
          margin: 0 auto 24px;
          line-height: 1.6;
        }

        .empty-actions-row, .guest-action-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .orders-feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 4px;
        }

        .orders-count-tag {
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .refresh-btn {
          font-size: 11px;
          padding: 4px 10px;
        }

        .order-card-detailed {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .order-card-detailed:hover {
          border-color: rgba(0, 0, 0, 0.16);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
        }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 1px solid #f4f4f5;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .order-id-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .order-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #71717a;
        }

        .order-num {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 20px;
          color: #09090b;
        }

        .order-date {
          font-size: 12px;
          color: #a1a1aa;
        }

        .order-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .payment-tag {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .payment-tag.payment-paid {
          background: #dcfce7;
          color: #15803d;
        }

        .payment-tag.payment-pending {
          background: #fef3c7;
          color: #b45309;
        }

        .payment-tag.payment-failed {
          background: #fee2e2;
          color: #b91c1c;
        }

        .payment-tag.payment-expired {
          background: #f4f4f5;
          color: #71717a;
        }

        .payment-tag.payment-refunded {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .payment-tag.payment-cancelled {
          background: #f4f4f5;
          color: #71717a;
        }

        .status-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
          background: #f4f4f5;
          color: #3f3f46;
        }

        .order-total {
          font-size: 16px;
          font-weight: 800;
          color: #09090b;
        }

        .order-items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f4f4f5;
        }

        .order-item-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .order-item-thumb {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fafafa;
          flex-shrink: 0;
        }

        .order-item-info {
          flex: 1;
        }

        .item-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #18181b;
        }

        .item-specs {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: #71717a;
          flex-wrap: wrap;
        }

        .spec-pill {
          background: #f4f4f5;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .item-customization-box {
          margin-top: 8px;
          padding: 8px 12px;
          background: #faf7f2;
          border: 1px solid #ebdccb;
          border-radius: 8px;
          font-size: 12px;
        }

        .custom-box-label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #8c6d3b;
          margin-bottom: 4px;
        }

        .custom-box-content {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          color: #57431e;
        }

        .item-pricing-breakdown {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .add-fee {
          color: #8c6d3b;
          font-weight: 600;
        }

        .item-price {
          font-weight: 700;
          font-size: 14px;
          color: #09090b;
        }

        .order-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .shipping-address-snippet {
          font-size: 12px;
          color: #71717a;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .coupon-used-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 11px;
        }

        .order-actions-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .retry-payment-btn {
          background: #f59e0b;
          border-color: #d97706;
          color: #ffffff;
          font-weight: 700;
        }

        .retry-payment-btn:hover {
          background: #d97706;
        }

        /* Modal Styles */
        .tracking-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .tracking-modal-card {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #f4f4f5;
        }

        .modal-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #71717a;
        }

        .modal-header h3 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 24px;
          margin: 2px 0 0;
          color: #09090b;
        }

        .close-btn {
          background: #f4f4f5;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .order-summary-mini {
          background: #fafafa;
          border: 1px solid #f4f4f5;
          border-radius: 12px;
          padding: 16px;
        }

        .order-date-tag {
          font-size: 12px;
          color: #71717a;
        }

        .tx-ref-line {
          display: block;
          font-size: 11px;
          color: #71717a;
          margin-top: 6px;
        }

        .tx-ref-line code {
          background: #e4e4e7;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #18181b;
        }

        .modal-retry-notice {
          margin-top: 12px;
          padding: 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
        }

        .modal-retry-notice p {
          font-size: 12px;
          color: #92400e;
          margin: 0 0 8px;
          line-height: 1.5;
        }

        .modal-section-card {
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 16px;
        }

        .modal-section-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #71717a;
          margin-bottom: 12px;
        }

        .modal-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-item-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding-bottom: 12px;
          border-bottom: 1px solid #f4f4f5;
        }

        .modal-item-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .modal-item-thumb {
          width: 54px;
          height: 54px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e4e4e7;
          background: #fafafa;
          flex-shrink: 0;
        }

        .modal-item-details {
          flex: 1;
        }

        .item-name {
          font-size: 13px;
          color: #18181b;
        }

        .item-meta-tags {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
          margin: 2px 0 4px;
        }

        .modal-custom-detail {
          background: #faf7f2;
          border: 1px solid #ebdccb;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          color: #57431e;
          margin-top: 4px;
        }

        .custom-detail-title {
          font-weight: 800;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8c6d3b;
          display: block;
          margin-bottom: 2px;
        }

        .modal-custom-detail p {
          margin: 1px 0;
        }

        .modal-price-breakdown {
          display: flex;
          gap: 8px;
          font-size: 10px;
          color: #71717a;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .modal-item-price {
          font-weight: 700;
          font-size: 13px;
          color: #18181b;
        }

        .cost-breakdown-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
        }

        .cost-row {
          display: flex;
          justify-content: space-between;
          color: #52525b;
        }

        .discount-row {
          color: #15803d;
        }

        .grand-total-row {
          padding-top: 8px;
          border-top: 1px solid #e4e4e7;
          font-size: 15px;
          color: #09090b;
        }

        .grand-total {
          color: #09090b;
          font-weight: 850;
        }

        .shipping-address-detail p {
          margin: 2px 0;
          font-size: 13px;
          color: #3f3f46;
        }

        /* Order Processing Step Indicators */
        .processing-steps-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 4px;
        }

        .process-step {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e4e4e7;
          background: #fafafa;
          transition: all 0.15s ease;
        }

        .process-step.step-done {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .process-step.step-active {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .step-marker {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
          background: #e4e4e7;
          color: #71717a;
        }

        .process-step.step-done .step-marker {
          background: #15803d;
          color: #ffffff;
        }

        .process-step.step-active .step-marker {
          background: #2563eb;
          color: #ffffff;
        }

        .step-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .step-info strong {
          font-size: 12px;
          color: #18181b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .step-info span {
          font-size: 11px;
          color: #71717a;
        }

        .process-step.step-done .step-info span {
          color: #15803d;
          font-weight: 600;
        }

        .process-step.step-active .step-info span {
          color: #2563eb;
          font-weight: 600;
        }

        @media (max-width: 580px) {
          .processing-steps-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        /* Courier Tracking Details */
        .courier-field-label {
          color: #71717a;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .awb-code {
          font-family: monospace;
          background: #f4f4f5;
          padding: 2px 6px;
          border-radius: 4px;
          color: #09090b;
        }

        .shipment-status-tag {
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          text-transform: uppercase;
        }

        .delivery-confirmed-alert {
          margin-top: 14px;
          padding: 12px 14px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .delivery-check-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #15803d;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
        }

        .delivery-confirmed-alert strong {
          display: block;
          font-size: 13px;
          color: #065f46;
        }

        .delivery-confirmed-alert p {
          margin: 0;
          font-size: 12px;
          color: #047857;
        }

        .tracking-pending-notice-card {
          background: #fbfbfb;
          border: 1px dashed #d4d4d8;
          border-radius: 10px;
          padding: 20px 16px;
          text-align: center;
        }

        .pending-notice-icon {
          font-size: 28px;
          margin-bottom: 6px;
        }

        .pending-notice-text {
          font-size: 13px;
          color: #52525b;
          margin: 0;
          line-height: 1.5;
          max-width: 480px;
          margin: 0 auto;
        }

        .carrier-status-summary {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #52525b;
          padding-bottom: 10px;
          border-bottom: 1px solid #f4f4f5;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tracking-pending-state {
          background: #fbfbfb;
          border: 1px dashed #d4d4d8;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }

        .pending-badge-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .courier-badge {
          background: #18181b;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .consignment-tag {
          background: #e0f2fe;
          color: #0369a1;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .tracking-pending-state h4 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #18181b;
        }

        .tracking-pending-state p {
          font-size: 12px;
          color: #71717a;
          margin: 0;
          line-height: 1.5;
        }

        .tracking-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .timeline-step {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .step-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .step-active .step-circle {
          background: #09090b;
          color: #ffffff;
        }

        .step-complete .step-circle {
          background: #dcfce7;
          color: #15803d;
        }

        .step-content strong {
          display: block;
          font-size: 13px;
          color: #18181b;
        }

        .step-content p {
          font-size: 12px;
          color: #71717a;
          margin: 2px 0 0;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #f4f4f5;
          display: flex;
          justify-content: flex-end;
          background: #fafafa;
        }

        @media (max-width: 640px) {
          .order-card-detailed {
            padding: 16px;
          }

          .order-item-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .order-item-thumb {
            width: 48px;
            height: 48px;
          }

          .order-card-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .order-actions-cluster {
            flex-direction: column;
            width: 100%;
          }

          .track-order-action-btn, .retry-payment-btn {
            width: 100%;
            text-align: center;
          }
        }
      ` }} />
    </div>
  );
}
