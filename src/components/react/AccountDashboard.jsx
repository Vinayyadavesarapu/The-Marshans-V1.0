import React, { useState, useEffect } from 'react';
import { onAuthStateChange, logOut } from '../../lib/firebase/client';
import { getOrders } from '../../lib/api/orders';

export default function AccountDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        getOrders().then((data) => setOrders(data.orders || [])).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await logOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="account-loading-wrap">
        <div className="spinner"></div>
        <p>Connecting to Marshan Network...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-guest-wrap">
        <h2>You are not signed in</h2>
        <p>Sign in to view your orders, saved addresses, and active print queues.</p>
        <div className="guest-action-row">
          <a href="/login?redirect=/account" className="btn btn-primary">Sign In</a>
          <a href="/register" className="btn btn-outline">Create Account</a>
        </div>
      </div>
    );
  }

  return (
    <div className="account-dashboard-wrap">
      {/* Collector Profile Header */}
      <div className="collector-profile-header">
        <div className="collector-avatar-block">
          <div className="avatar-circle">
            {(user.displayName || user.email || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="collector-names">
            <span className="collector-badge">VERIFIED MARSHAN COLLECTOR</span>
            <h1 className="collector-title">{user.displayName || 'Marshan Collector'}</h1>
            <span className="collector-email">{user.email}</span>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="btn btn-outline btn-sm logout-btn">
          Sign Out
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="account-sections-grid">

        <a href="/account/orders" className="account-nav-card">
          <div className="nav-card-icon">📦</div>
          <h3>Orders & Tracking</h3>
          <p>Inspect live dispatch progress, waybill tracking numbers, and invoice receipts.</p>
          <span className="nav-card-arrow">View Orders →</span>
        </a>

        <a href="/custom-3d" className="account-nav-card">
          <div className="nav-card-icon">📐</div>
          <h3>Custom 3D Printing</h3>
          <p>Submit custom STL/3MF files, calculate weight estimates, and start print jobs.</p>
          <span className="nav-card-arrow">Launch Studio →</span>
        </a>

        <a href="/account/profile" className="account-nav-card">
          <div className="nav-card-icon">📍</div>
          <h3>Saved Addresses</h3>
          <p>Manage your default shipping coordinates and phone contact for courier routing.</p>
          <span className="nav-card-arrow">Manage Details →</span>
        </a>
      </div>

      {/* Recent Orders Preview */}
      <div className="recent-orders-preview">
        <div className="preview-header">
          <h3>Recent Dispatches</h3>
          <a href="/account/orders" className="preview-all-link">View All ({orders.length}) →</a>
        </div>

        {orders.length === 0 ? (
          <div className="orders-empty-card">
            <p>You haven't placed any orders yet.</p>
            <a href="/#home-carousel-section" className="btn btn-primary btn-sm">Explore Drops</a>
          </div>
        ) : (
          <div className="orders-table-compact">
            {orders.slice(0, 3).map((ord) => (
              <div key={ord.id} className="order-row-item">
                <div className="order-meta-info">
                  <strong>#{ord.order_number || ord.id}</strong>
                  <span>{new Date(ord.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="order-status-pill status-ready">
                  {ord.status || 'Confirmed'}
                </div>
                <div className="order-price-info">
                  ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .account-loading-wrap, .account-guest-wrap {
          text-align: center;
          padding: 80px 20px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          max-width: 540px;
          margin: 0 auto;
        }

        .guest-action-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        }

        .collector-profile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: clamp(24px, 4vw, 36px);
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .collector-avatar-block {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .avatar-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #18181b;
          color: #ffffff;
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .collector-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #e11d48;
          display: block;
        }

        .collector-title {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 32px;
          letter-spacing: 0.04em;
          color: #09090b;
          line-height: 1.1;
          margin: 4px 0 2px 0;
        }

        .collector-email {
          font-size: 13px;
          color: #71717a;
        }

        .account-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }

        .stat-num {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 36px;
          color: #09090b;
          display: block;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .account-sections-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .account-nav-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 28px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .account-nav-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
          border-color: rgba(0, 0, 0, 0.16);
        }

        .nav-card-icon {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .account-nav-card h3 {
          font-family: var(--font-sans, sans-serif);
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #09090b;
        }

        .account-nav-card p {
          font-size: 13px;
          line-height: 1.5;
          color: #71717a;
          margin: 0 0 20px 0;
          flex-grow: 1;
        }

        .nav-card-arrow {
          font-size: 12px;
          font-weight: 700;
          color: #111111;
          margin-top: auto;
        }

        .recent-orders-preview {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 28px;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .preview-header h3 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 24px;
          color: #09090b;
          margin: 0;
        }

        .preview-all-link {
          font-size: 13px;
          font-weight: 700;
          color: #111111;
          text-decoration: underline;
        }

        .orders-empty-card {
          text-align: center;
          padding: 32px 16px;
          color: #71717a;
        }

        .orders-table-compact {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .order-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 8px;
          background: #f8fafc;
        }

        .order-meta-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-meta-info strong {
          font-size: 14px;
          color: #09090b;
        }

        .order-meta-info span {
          font-size: 11px;
          color: #71717a;
        }

        .order-status-pill {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 9999px;
          background: #e0f2fe;
          color: #0369a1;
        }

        .order-price-info {
          font-weight: 800;
          font-size: 15px;
          color: #09090b;
        }

        @media (max-width: 860px) {
          .account-stats-grid, .account-sections-grid {
            grid-template-columns: 1fr;
          }
        }
      ` }} />
    </div>
  );
}
