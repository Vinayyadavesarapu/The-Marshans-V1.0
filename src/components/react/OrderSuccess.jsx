import React, { useState, useEffect } from 'react';

export default function OrderSuccess() {
  const [orderNumber, setOrderNumber] = useState('');
  const [total, setTotal] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setOrderNumber(params.get('orderNumber') || 'MSH-89210-4412');
      setTotal(params.get('total') || '');
    }
  }, []);

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
        <div className="detail-item">
          <span className="detail-label">ORDER NUMBER</span>
          <strong className="detail-val order-code">{orderNumber}</strong>
        </div>
        {total && (
          <div className="detail-item">
            <span className="detail-label">TOTAL PAID</span>
            <strong className="detail-val">₹{Number(total).toLocaleString('en-IN')}</strong>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">DISPATCH CARRIER</span>
          <strong className="detail-val">Air Express (48-72h Delivery)</strong>
        </div>
      </div>

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
        <a href="/shop" className="btn btn-outline">
          Continue Discovering Artifacts
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
          grid-template-columns: repeat(3, 1fr);
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
            grid-template-columns: 1fr;
          }
        }
      ` }} />
    </div>
  );
}
