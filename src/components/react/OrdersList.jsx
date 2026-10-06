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
                <span className={`status-tag status-${ord.status || 'confirmed'}`}>
                  {ord.status || 'Print Queued'}
                </span>
                <span className="order-total">₹{Number(ord.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Items in this order */}
            <div className="order-items-list">
              {(ord.items || []).map((item, idx) => (
                <div key={idx} className="order-item-row">
                  <img
                    src={item.image_url || '/assets/placeholders/product-placeholder.svg'}
                    alt={item.name}
                    className="order-item-thumb"
                  />
                  <div className="order-item-info">
                    <h4 className="item-title">{item.name}</h4>
                    <div className="item-specs">
                      {item.material && <span>Mat: {item.material}</span>}
                      {item.finishing && <span>Finish: {item.finishing}</span>}
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="item-price">
                    ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Footer & Tracking info */}
            <div className="order-card-footer">
              <div className="shipping-address-snippet">
                <span>Shipping to: <strong>{ord.shipping_address?.city || 'India'}</strong> ({ord.shipping_address?.postal_code || 'PIN'})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(ord)}
                className="btn btn-outline btn-sm"
              >
                Track Fulfillment
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fulfillment Status Modal */}
      {selectedOrder && (
        <div className="tracking-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="tracking-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Fulfillment Timeline</h3>
              <button type="button" onClick={() => setSelectedOrder(null)} className="close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="order-summary-mini">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '16px' }}>#{selectedOrder.order_number || selectedOrder.id}</strong>
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
                <span>Courier: <strong>{trackingInfo?.courier || selectedOrder.courier || 'Velocity Air Express'}</strong></span>
                {trackingInfo?.tracking_no ? (
                  <span>AWB Consignment: <strong>{trackingInfo.tracking_no}</strong></span>
                ) : (
                  <span style={{ color: '#71717a' }}>AWB Consignment: <em>Assigned upon dispatch</em></span>
                )}
                {trackingInfo?.track_url && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={trackingInfo.track_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px' }}
                    >
                      Open Live Carrier Tracking ↗
                    </a>
                  </div>
                )}
              </div>

              {trackingLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                  Connecting to live carrier telemetry...
                </div>
              ) : trackingInfo?.activities && trackingInfo.activities.length > 0 ? (
                <div className="tracking-timeline">
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
              ) : (
                <div className="tracking-timeline">
                  <div className="timeline-step step-complete">
                    <div className="step-circle">✓</div>
                    <div className="step-content">
                      <strong>Order Verified & Placed</strong>
                      <p>Parameters validated and assigned to Store #2 fabrication queue.</p>
                    </div>
                  </div>
                  <div className={`timeline-step ${selectedOrder.status !== 'Order Placed' ? 'step-complete' : 'step-active'}`}>
                    <div className="step-circle">{selectedOrder.status !== 'Order Placed' ? '✓' : '●'}</div>
                    <div className="step-content">
                      <strong>G-Code Sliced & Queued</strong>
                      <p>High-resolution toolpath calibrated for 0.12mm layer height.</p>
                    </div>
                  </div>
                  <div className={`timeline-step ${['Shipped', 'Delivered', 'Completed'].includes(selectedOrder.status) ? 'step-complete' : (selectedOrder.status === 'Processing' ? 'step-active' : '')}`}>
                    <div className="step-circle">{['Shipped', 'Delivered', 'Completed'].includes(selectedOrder.status) ? '✓' : (selectedOrder.status === 'Processing' ? '●' : '○')}</div>
                    <div className="step-content">
                      <strong>Fabrication & UV Post-Curing</strong>
                      <p>Running on Bambu / Formlabs array.</p>
                    </div>
                  </div>
                  <div className={`timeline-step ${['Shipped', 'Delivered', 'Completed'].includes(selectedOrder.status) ? 'step-complete' : ''}`}>
                    <div className="step-circle">{['Shipped', 'Delivered', 'Completed'].includes(selectedOrder.status) ? '✓' : '○'}</div>
                    <div className="step-content">
                      <strong>Micro-Sanded & QC Passed</strong>
                      <p>Inspected for dimensional tolerance and safely packed.</p>
                    </div>
                  </div>
                  <div className={`timeline-step ${selectedOrder.status === 'Delivered' ? 'step-complete' : (['Shipped', 'Completed'].includes(selectedOrder.status) ? 'step-active' : '')}`}>
                    <div className="step-circle">{selectedOrder.status === 'Delivered' ? '✓' : (['Shipped', 'Completed'].includes(selectedOrder.status) ? '●' : '○')}</div>
                    <div className="step-content">
                      <strong>Dispatched via Velocity Air Express</strong>
                      <p>Estimated transit time 48-72 hours across India.</p>
                    </div>
                  </div>
                </div>
              )}
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
      ` }} />
    </div>
  );
}
