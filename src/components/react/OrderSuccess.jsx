import React, { useState, useEffect } from 'react';
import { isCustomForgeOnly } from '../../config/launchMode';
import { getCustomForgeOrderApi } from '../../lib/api/customForge';
import { getOrderById } from '../../lib/api/orders';
import { onAuthStateChange } from '../../lib/firebase/client';

export default function OrderSuccess() {
  const [loading, setLoading] = useState(true);
  const [orderState, setOrderState] = useState({
    status: 'loading', // 'loading' | 'confirmed' | 'pending' | 'failed' | 'unauthorized' | 'not_found' | 'missing'
    orderNumber: '',
    paymentId: '',
    total: '',
    items: [],
    message: ''
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const orderRef = (params.get('orderNumber') || params.get('orderId') || '').trim();
    const queryPaymentId = (params.get('paymentId') || '').trim();
    const queryTotal = (params.get('total') || '').trim();

    if (!orderRef) {
      setLoading(false);
      setOrderState({
        status: 'missing',
        orderNumber: '',
        paymentId: '',
        total: '',
        message: 'No order reference was provided. Please check your account to track your orders.'
      });
      return;
    }

    // Subscribe to auth state before making authenticated order verification call
    const unsub = onAuthStateChange(async (user) => {
      if (!user) {
        setLoading(false);
        setOrderState({
          status: 'unauthorized',
          orderNumber: orderRef,
          paymentId: '',
          total: '',
          message: 'Please sign in to your account to verify and view this order confirmation.'
        });
        return;
      }

      try {
        setLoading(true);
        const isCustomForge = orderRef.startsWith('CF-') || isCustomForgeOnly();

        if (isCustomForge) {
          const res = await getCustomForgeOrderApi(orderRef);
          if (res && res.success && res.data) {
            const order = res.data;
            const payStatus = String(order.payment_status || '').toLowerCase();

            if (payStatus === 'paid') {
              setOrderState({
                status: 'confirmed',
                orderNumber: order.order_number || orderRef,
                paymentId: queryPaymentId || order.gateway_order_id || 'VERIFIED_GATEWAY',
                total: String(order.total_price_rupees || (Number(order.total_price) / 100) || queryTotal),
                items: order.items || [],
                message: ''
              });
            } else if (payStatus === 'failed') {
              setOrderState({
                status: 'failed',
                orderNumber: order.order_number || orderRef,
                paymentId: '',
                total: '',
                message: 'Payment for this order failed or was declined. This order has NOT been placed in the fabrication queue.'
              });
            } else {
              setOrderState({
                status: 'pending',
                orderNumber: order.order_number || orderRef,
                paymentId: '',
                total: '',
                message: 'Payment confirmation is currently pending with the gateway. Unpaid orders cannot enter fabrication.'
              });
            }
          } else {
            setOrderState({
              status: 'not_found',
              orderNumber: orderRef,
              paymentId: '',
              total: '',
              message: res?.error || 'Order not found or access denied. You may not have permission to view this order.'
            });
          }
        } else {
          // Standard Retail Order Verification
          const retailOrder = await getOrderById(orderRef);
          if (retailOrder) {
            const payStatus = String(retailOrder.paymentStatus || '').toLowerCase();
            const isCod = String(retailOrder.paymentMethod || '').toLowerCase() === 'cod';

            if (payStatus === 'paid' || isCod) {
              setOrderState({
                status: 'confirmed',
                orderNumber: retailOrder.orderNumber || orderRef,
                paymentId: queryPaymentId || retailOrder.paymentId || (isCod ? 'CASH_ON_DELIVERY' : 'VERIFIED'),
                total: String(retailOrder.total || queryTotal),
                message: ''
              });
            } else if (payStatus === 'failed') {
              setOrderState({
                status: 'failed',
                orderNumber: retailOrder.orderNumber || orderRef,
                paymentId: '',
                total: '',
                message: 'Payment for this order was not completed. Unpaid orders cannot be confirmed.'
              });
            } else {
              setOrderState({
                status: 'pending',
                orderNumber: retailOrder.orderNumber || orderRef,
                paymentId: '',
                total: '',
                message: 'Payment is awaiting gateway confirmation. Unpaid orders cannot enter processing.'
              });
            }
          } else {
            setOrderState({
              status: 'not_found',
              orderNumber: orderRef,
              paymentId: '',
              total: '',
              message: 'Retail order not found or access denied.'
            });
          }
        }
      } catch (err) {
        console.error('Order verification notice:', err);
        setOrderState({
          status: 'not_found',
          orderNumber: orderRef,
          paymentId: '',
          total: '',
          message: 'Unable to verify order with server. Please check your connection or visit your account orders.'
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // 1. Loading Skeleton / Verification in Progress
  if (loading) {
    return (
      <div className="order-success-card">
        <div className="success-icon-badge loading-spinner-badge">
          <svg className="spin-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
        </div>
        <span className="success-tagline" style={{ color: '#2563eb' }}>VERIFYING ORDER STATUS</span>
        <h1 className="success-title">SECURE VERIFICATION</h1>
        <p className="success-sub">Checking authoritative payment authorization and fabrication queue with server...</p>
      </div>
    );
  }

  // 2. Security Error: Unauthorized
  if (orderState.status === 'unauthorized') {
    return (
      <div className="order-success-card">
        <div className="success-icon-badge" style={{ background: '#fef2f2' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className="success-tagline" style={{ color: '#dc2626' }}>AUTHENTICATION REQUIRED</span>
        <h1 className="success-title">PLEASE SIGN IN</h1>
        <p className="success-sub">{orderState.message}</p>
        <div className="success-actions-row">
          <a href={`/login?redirect=/order-confirmation?orderNumber=${encodeURIComponent(orderState.orderNumber)}`} className="btn btn-primary">
            Sign In to Verify Order
          </a>
        </div>
      </div>
    );
  }

  // 3. Security Error: Payment Failed
  if (orderState.status === 'failed') {
    return (
      <div className="order-success-card">
        <div className="success-icon-badge" style={{ background: '#fef2f2' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <span className="success-tagline" style={{ color: '#dc2626' }}>FABRICATION ON HOLD</span>
        <h1 className="success-title">PAYMENT FAILED</h1>
        <p className="success-sub">{orderState.message}</p>
        <div className="order-details-box" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="detail-item">
            <span className="detail-label">ORDER NUMBER</span>
            <strong className="detail-val order-code">{orderState.orderNumber}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label">PAYMENT STATUS</span>
            <strong className="detail-val" style={{ color: '#dc2626', fontWeight: 800 }}>FAILED / DECLINED</strong>
          </div>
        </div>
        <div className="success-actions-row">
          <a href="/checkout" className="btn btn-primary">
            Retry Payment
          </a>
          <a href={isCustomForgeOnly() ? '/custom-3d' : '/shop'} className="btn btn-outline">
            Return to Store
          </a>
        </div>
      </div>
    );
  }

  // 4. Security Notice: Payment Pending
  if (orderState.status === 'pending') {
    return (
      <div className="order-success-card">
        <div className="success-icon-badge" style={{ background: '#fffbeb' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <span className="success-tagline" style={{ color: '#d97706' }}>VERIFICATION IN PROGRESS</span>
        <h1 className="success-title">PAYMENT PENDING</h1>
        <p className="success-sub">{orderState.message}</p>
        <div className="order-details-box" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="detail-item">
            <span className="detail-label">ORDER NUMBER</span>
            <strong className="detail-val order-code">{orderState.orderNumber}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label">GATEWAY STATUS</span>
            <strong className="detail-val" style={{ color: '#d97706', fontWeight: 800 }}>AWAITING CONFIRMATION</strong>
          </div>
        </div>
        <div className="success-actions-row">
          <a href="/account/orders" className="btn btn-primary">
            Check Order in Account
          </a>
          <a href={isCustomForgeOnly() ? '/custom-3d' : '/shop'} className="btn btn-outline">
            Continue Exploring
          </a>
        </div>
      </div>
    );
  }

  // 5. Security Error: Missing or Not Found
  if (orderState.status === 'missing' || orderState.status === 'not_found') {
    return (
      <div className="order-success-card">
        <div className="success-icon-badge" style={{ background: '#f4f4f5' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span className="success-tagline" style={{ color: '#71717a' }}>ORDER INQUIRY</span>
        <h1 className="success-title">ORDER NOT FOUND</h1>
        <p className="success-sub">{orderState.message}</p>
        <div className="success-actions-row">
          <a href="/account/orders" className="btn btn-primary">
            View My Orders
          </a>
          <a href={isCustomForgeOnly() ? '/custom-3d' : '/shop'} className="btn btn-outline">
            {isCustomForgeOnly() ? 'Explore Custom Forge' : 'Return to Shop'}
          </a>
        </div>
      </div>
    );
  }

  // 6. Genuine Verified Confirmed Paid Order
  return (
    <div className="order-success-card">
      <div className="success-icon-badge">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <span className="success-tagline">FABRICATION QUEUED</span>
      <h1 className="success-title">ORDER CONFIRMED</h1>
      <p className="success-sub">
        Thank you for your order. Your artifact has entered our print farm queue for high-precision 0.12mm fabrication and quality inspection.
      </p>

      <div className="order-details-box">
        {orderState.orderNumber && (
          <div className="detail-item">
            <span className="detail-label">ORDER NUMBER</span>
            <strong className="detail-val order-code">{orderState.orderNumber}</strong>
          </div>
        )}
        {orderState.paymentId && (
          <div className="detail-item">
            <span className="detail-label">PAYMENT REF</span>
            <strong className="detail-val payment-ref">{orderState.paymentId}</strong>
          </div>
        )}
        {orderState.total && (
          <div className="detail-item">
            <span className="detail-label">TOTAL PAID</span>
            <strong className="detail-val">₹{Number(orderState.total).toLocaleString('en-IN')}</strong>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">DISPATCH CARRIER</span>
          <strong className="detail-val">Air Express (48-72h Delivery)</strong>
        </div>
      </div>

      {/* Confirmed Order Items List */}
      {orderState.items && orderState.items.length > 0 && (
        <div className="confirmed-items-box">
          <div className="confirmed-items-header">
            <span>FABRICATION QUEUE ITEMS ({orderState.items.length})</span>
          </div>
          <div className="confirmed-items-list">
            {orderState.items.map((it, idx) => (
              <div key={it.id || idx} className="confirmed-item-row">
                <div className="confirmed-item-meta">
                  <strong className="item-title">{it.product_name_snapshot || it.name || 'Lady Justice Statue'} ({it.size_label_snapshot || it.size_label || 'Standard'})</strong>
                  {it.customization ? (
                    <div className="confirmed-item-custom-details">
                      <span className="cust-pill">Engraved Nameplate: <strong>{it.customization.name}</strong></span>
                      {it.customization.designation && <span className="cust-sub">{it.customization.designation}</span>}
                      {it.customization.material && <span className="cust-mat">({it.customization.material})</span>}
                    </div>
                  ) : (
                    <span className="cust-standard-tag">Standard Edition (No Personalization)</span>
                  )}
                </div>
                <div className="confirmed-item-pricing">
                  <span className="item-qty">Qty: {it.quantity || 1}</span>
                  <strong className="item-price">₹{((it.total_price_rupees || (Number(it.total_price) / 100)) || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Production Flow Steps */}
      <div className="fulfillment-pipeline">
        <div className="pipeline-step completed">
          <span className="step-num">1</span>
          <div>
            <strong>Order & File Verification</strong>
            <p>Parameters validated by Marshan Bot.</p>
          </div>
        </div>
        <div className="pipeline-step in-progress">
          <span className="step-num">2</span>
          <div>
            <strong>3D Print Farm Slicing</strong>
            <p>Assigning to dual-extrusion or resin SLA array.</p>
          </div>
        </div>
        <div className="pipeline-step">
          <span className="step-num">3</span>
          <div>
            <strong>Hand Finish & Air Courier Dispatch</strong>
            <p>Tracking number will be sent via SMS & Email.</p>
          </div>
        </div>
      </div>

      <div className="success-actions-row">
        <a href="/account/orders" className="btn btn-primary">
          Track Order Status
        </a>
        <a href={isCustomForgeOnly() ? '/custom-3d' : '/shop'} className="btn btn-outline">
          {isCustomForgeOnly() ? 'Continue Exploring Custom Forge' : 'Continue Discovering Artifacts'}
        </a>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .order-success-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: clamp(36px, 6vw, 56px);
          max-width: 640px;
          margin: 0 auto;
          text-align: center;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.06);
        }

        .success-icon-badge {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
        }

        .loading-spinner-badge {
          background: #eff6ff;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin-icon {
          animation: spin 1.2s linear infinite;
        }

        .success-tagline {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: #15803d;
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
        }

        .success-title {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: clamp(36px, 4.5vw, 52px);
          letter-spacing: 0.04em;
          color: #09090b;
          line-height: 1;
          margin: 0 0 12px 0;
        }

        .success-sub {
          font-size: 14px;
          color: #71717a;
          line-height: 1.6;
          max-width: 480px;
          margin: 0 auto 32px auto;
        }

        .order-details-box {
          background: #f8fafc;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 36px;
          text-align: left;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #71717a;
          text-transform: uppercase;
        }

        .detail-val {
          font-size: 13px;
          color: #09090b;
        }

        .order-code {
          color: #e11d48;
          font-family: monospace;
          font-size: 13px;
        }

        .confirmed-items-box {
          background: #fafafa;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 32px;
          text-align: left;
        }

        .confirmed-items-header {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #52525b;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .confirmed-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .confirmed-item-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .confirmed-item-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .confirmed-item-meta .item-title {
          font-size: 13px;
          font-weight: 700;
          color: #18181b;
        }

        .confirmed-item-custom-details {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }

        .cust-pill {
          background: #eff6ff;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .cust-sub {
          color: #71717a;
        }

        .cust-mat {
          color: #a1a1aa;
        }

        .cust-standard-tag {
          font-size: 11px;
          color: #71717a;
          font-style: italic;
        }

        .confirmed-item-pricing {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .confirmed-item-pricing .item-qty {
          font-size: 11px;
          color: #71717a;
        }

        .confirmed-item-pricing .item-price {
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
        }

        .fulfillment-pipeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          margin-bottom: 40px;
          padding-left: 12px;
        }

        .pipeline-step {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          font-size: 13px;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #f4f4f5;
          color: #71717a;
          font-weight: 800;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .pipeline-step.completed .step-num {
          background: #15803d;
          color: #ffffff;
        }

        .pipeline-step.in-progress .step-num {
          background: #09090b;
          color: #ffffff;
        }

        .pipeline-step strong {
          display: block;
          color: #09090b;
          margin-bottom: 2px;
        }

        .pipeline-step p {
          margin: 0;
          color: #71717a;
          font-size: 12px;
        }

        .success-actions-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .order-details-box {
            grid-template-columns: 1fr 1fr;
          }
        }
      ` }} />
    </div>
  );
}
