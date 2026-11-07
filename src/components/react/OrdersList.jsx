import React, { useState, useEffect } from 'react';
import { getOrders, getOrderTracking } from '../../lib/api/orders';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getOrders();
        setOrders(res.orders || []);
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  if (loading) {
    return (
      <div className="orders-loading-wrap">
        <p>Retrieving your order dispatches from the Marshan print network...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty-state">
        <div className="orders-box-icon">📦</div>
        <h2>No Dispatches Found</h2>
        <p>Your collection vault is currently empty. Explore our latest drops across the 5 universes to begin.</p>
        <a href="/#home-carousel-section" className="btn btn-primary">Discover Artifacts</a>
      </div>
    );
  }

  return (
    <div className="orders-list-layout">
      <div className="orders-feed">
        {orders.map((ord) => (
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
                <span className={`payment-tag payment-${(ord.payment_status || 'pending').toLowerCase()}`}>
                  {ord.payment_status === 'paid' ? 'Paid' : 'Pending Payment'}
                </span>
                <span className={`status-tag status-${ord.status || 'confirmed'}`}>
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
                <span>Shipping to: <strong>{ord.shipping_address?.city || 'India'}</strong> ({ord.shipping_address?.postal_code || 'PIN'})</span>
                {ord.coupon_code && <span className="coupon-used-badge">🎟️ {ord.coupon_code}</span>}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(ord)}
                className="btn btn-primary btn-sm track-order-action-btn"
              >
                Track Order →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fulfillment Status & Order Details Modal */}
      {selectedOrder && (
        <div className="tracking-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="tracking-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">ORDER DETAILS & TRACKING</span>
                <h3>#{selectedOrder.order_number || selectedOrder.id}</h3>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="close-btn">✕</button>
            </div>

            <div className="modal-body">
              {/* Order Meta Header */}
              <div className="order-summary-mini">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`payment-tag payment-${(selectedOrder.payment_status || 'pending').toLowerCase()}`}>
                      {selectedOrder.payment_status === 'paid' ? '✓ Paid Online' : 'Pending Payment'}
                    </span>
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
                        <div className="modal-item-info">
                          <strong>{item.name}</strong>
                          <div className="modal-item-specs">
                            <span>Edition: <strong>{item.finishing || 'Standard'}</strong></span>
                            <span>Qty: <strong>{item.quantity}</strong></span>
                            <span>Unit Price: <strong>₹{Number(item.price).toLocaleString('en-IN')}</strong></span>
                          </div>

                          {item.customization?.name && (
                            <div className="modal-custom-detail">
                              <span className="detail-tag">EMBOSSED SPECIFICATIONS</span>
                              <p>Name: <strong>{item.customization.name}</strong></p>
                              {item.customization.designation && item.customization.designation.toUpperCase() !== 'NIL' && (
                                <p>Designation: <strong>{item.customization.designation}</strong></p>
                              )}
                              <p>Material: <strong>{isWood ? 'Organic Wood / MDF (+₹50)' : 'Precision Polymer (+₹0)'}</strong></p>
                            </div>
                          )}

                          {hasCustomCharges && (
                            <div className="modal-price-breakdown-row">
                              <span>Base: ₹{Number(baseUnit).toLocaleString('en-IN')}</span>
                              {nameplateFee > 0 && <span className="add">• Nameplate: +₹{nameplateFee}</span>}
                              {woodFee > 0 && <span className="add">• Wood / MDF: +₹{woodFee}</span>}
                            </div>
                          )}
                        </div>
                        <div className="modal-item-total">
                          ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Financial Summary */}
              <div className="modal-section-card financial-breakdown-card">
                <h4 className="modal-section-title">Order Financial Summary</h4>
                <div className="financial-rows">
                  <div className="fin-row">
                    <span>Product Subtotal</span>
                    <strong>₹{Number(selectedOrder.subtotal || selectedOrder.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="fin-row discount-row">
                      <span>
                        Coupon Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}
                      </span>
                      <strong className="discount-val">−₹{Number(selectedOrder.discount_amount).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div className="fin-row">
                    <span>Standard Air Delivery</span>
                    <strong>₹{Number(selectedOrder.shipping_amount !== undefined ? selectedOrder.shipping_amount : 50).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="fin-row fin-total-row">
                    <span>Final Order Total</span>
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

              {/* Manufacturing & Fulfillment Timeline */}
              <div className="modal-section-card">
                <h4 className="modal-section-title">Manufacturing & Carrier Timeline</h4>
                <div className="carrier-status-summary">
                  <span>Courier: <strong>{trackingInfo?.courier || selectedOrder.courier || 'Velocity Air Express'}</strong></span>
                  {trackingInfo?.tracking_no ? (
                    <span>AWB Waybill: <strong>{trackingInfo.tracking_no}</strong></span>
                  ) : (
                    <span style={{ color: '#71717a' }}>AWB Waybill: <em>Assigned upon physical parcel dispatch</em></span>
                  )}
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
                  <div style={{ padding: '24px 0', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
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
                ) : trackingInfo?.tracking_no ? (
                  <div className="tracking-pending-state" style={{ marginTop: '14px' }}>
                    <div className="pending-badge-row">
                      <span className="courier-badge">{trackingInfo.courier || selectedOrder.courier || 'Velocity Air Express'}</span>
                      <span className="consignment-tag">Consignment Registered</span>
                    </div>
                    <h4>In Transit with Velocity Air Express</h4>
                    <p>
                      Waybill #{trackingInfo.tracking_no} is active. Physical checkpoint scans will appear as the parcel moves through courier routing hubs.
                    </p>
                  </div>
                ) : (
                  <div className="tracking-pending-state" style={{ marginTop: '14px' }}>
                    <div className="pending-badge-row">
                      <span className="courier-badge">Manufacturing Queue</span>
                      <span className="consignment-tag">{selectedOrder.status || 'Order Placed'}</span>
                    </div>
                    <h4>Fabrication in Progress at Marshan Farm</h4>
                    <p>
                      Your piece is progressing through additive manufacturing and precision inspection. Live courier waybill telemetry begins upon physical hand-over to Velocity Air Express.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .orders-list-layout {
          width: 100%;
        }

        .orders-loading-wrap, .orders-empty-state {
          text-align: center;
          padding: 80px 20px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .orders-box-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .orders-feed {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .order-card-detailed {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        .order-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 12px;
        }

        .order-id-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .order-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #71717a;
        }

        .order-num {
          font-size: 15px;
          color: #09090b;
        }

        .order-date {
          font-size: 12px;
          color: #a1a1aa;
          margin-left: 6px;
        }

        .order-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 9999px;
          background: #e0f2fe;
          color: #0284c7;
        }

        .order-total {
          font-family: var(--font-sans, sans-serif);
          font-weight: 800;
          font-size: 16px;
          color: #09090b;
        }

        .order-items-list {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-item-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .order-item-thumb {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          object-fit: cover;
          background: #f1f5f9;
        }

        .order-item-info {
          flex: 1;
        }

        .item-title {
          font-size: 14px;
          font-weight: 600;
          color: #09090b;
          margin: 0 0 4px 0;
        }

        .item-specs {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #71717a;
        }

        .item-price {
          font-size: 14px;
          font-weight: 700;
          color: #09090b;
        }

        .order-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          font-size: 12px;
          color: #71717a;
          flex-wrap: wrap;
          gap: 12px;
        }

        .tracking-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .tracking-modal-card {
          background: #ffffff;
          border-radius: 16px;
          max-width: 540px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f4f4f5;
        }

        .modal-header h3 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 24px;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #71717a;
        }

        .order-summary-mini {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 24px;
          font-size: 13px;
        }

        .tracking-timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          padding-left: 8px;
        }

        .timeline-step {
          display: flex;
          gap: 16px;
          position: relative;
        }

        .step-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          background: #f4f4f5;
          color: #a1a1aa;
          flex-shrink: 0;
          z-index: 2;
        }

        .step-complete .step-circle {
          background: #15803d;
          color: #ffffff;
        }

        .step-active .step-circle {
          background: #0284c7;
          color: #ffffff;
        }

        .step-content strong {
          display: block;
          font-size: 13px;
          color: #09090b;
        }

        .step-content p {
          font-size: 12px;
          color: #71717a;
          margin: 2px 0 0 0;
        }

        .track-order-action-btn {
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .tracking-pending-state {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }

        .pending-badge-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .courier-badge {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          background: #e0f2fe;
          color: #0369a1;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .consignment-tag {
          font-size: 11px;
          font-weight: 700;
          background: #fef3c7;
          color: #92400e;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .tracking-pending-state h4 {
          font-size: 16px;
          font-weight: 700;
          color: #09090b;
          margin: 0 0 8px 0;
        }

        .tracking-pending-state p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        .payment-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .payment-tag.payment-paid {
          background: #dcfce7;
          color: #15803d;
        }

        .payment-tag.payment-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .item-specs {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .spec-pill {
          background: #f4f4f5;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .item-customization-box {
          background: #fdfaf6;
          border: 1px solid rgba(180, 83, 9, 0.2);
          border-radius: 8px;
          padding: 8px 12px;
          margin: 6px 0;
          font-size: 11px;
        }

        .custom-box-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #b45309;
          display: block;
          margin-bottom: 4px;
        }

        .custom-box-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: #1f2937;
        }

        .item-pricing-breakdown {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
          margin-top: 4px;
        }

        .item-pricing-breakdown .add-fee {
          color: #15803d;
          font-weight: 700;
        }

        .coupon-used-badge {
          font-size: 11px;
          font-weight: 700;
          background: #eef2ff;
          color: #4338ca;
          padding: 2px 8px;
          border-radius: 4px;
          margin-left: 8px;
        }

        .modal-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #71717a;
          display: block;
          margin-bottom: 4px;
        }

        .modal-section-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .modal-section-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
          margin: 0 0 12px 0;
        }

        .modal-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-item-row {
          display: flex;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #edf2f7;
        }

        .modal-item-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .modal-item-thumb {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          object-fit: cover;
          background: #edf2f7;
          flex-shrink: 0;
        }

        .modal-item-info {
          flex: 1;
          font-size: 12px;
        }

        .modal-item-specs {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #64748b;
          margin: 2px 0 6px 0;
          flex-wrap: wrap;
        }

        .modal-custom-detail {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          margin-top: 4px;
        }

        .modal-custom-detail p {
          margin: 2px 0;
          color: #1e293b;
        }

        .detail-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #b45309;
          display: block;
          margin-bottom: 2px;
        }

        .modal-price-breakdown-row {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }

        .modal-price-breakdown-row .add {
          color: #15803d;
          font-weight: 700;
        }

        .modal-item-total {
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
        }

        .financial-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
        }

        .fin-row {
          display: flex;
          justify-content: space-between;
          color: #475569;
        }

        .discount-row {
          color: #15803d;
        }

        .discount-val {
          color: #15803d;
        }

        .fin-total-row {
          border-top: 1px solid #cbd5e1;
          padding-top: 8px;
          font-size: 14px;
          color: #09090b;
        }

        .grand-total {
          font-size: 16px;
          color: #09090b;
        }

        .shipping-address-detail p {
          margin: 2px 0;
          font-size: 12px;
          color: #334155;
        }

        .carrier-status-summary {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .order-date-tag {
          font-size: 11px;
          color: #71717a;
        }

        .tx-ref-line {
          font-size: 11px;
          color: #64748b;
        }

        .tx-ref-line code {
          background: #f1f5f9;
          padding: 1px 4px;
          border-radius: 4px;
          color: #0f172a;
        }
      ` }} />
    </div>
  );
}
