import React, { useState, useEffect } from 'react';
import { onAuthStateChange, logOut } from '../../lib/firebase/client';

export default function HeaderUserNav() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await logOut();
      setMenuOpen(false);
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  if (loading) {
    return <div style={{ width: 36, height: 36 }} />;
  }

  if (!user) {
    return (
      <a href="/login" className="header-user-btn" aria-label="Sign In">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="user-btn-label">Sign In</span>
        <style dangerouslySetInnerHTML={{ __html: `
          .header-user-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #18181b;
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.06);
            transition: all 0.15s ease;
          }
          .header-user-btn:hover {
            background: rgba(0, 0, 0, 0.08);
            border-color: rgba(0, 0, 0, 0.12);
          }
          @media (max-width: 640px) {
            .user-btn-label {
              display: none;
            }
            .header-user-btn {
              padding: 10px;
              width: 38px;
              height: 38px;
              justify-content: center;
            }
          }
        ` }} />
      </a>
    );
  }

  const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="user-menu-container">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="user-avatar-btn"
        aria-label="User menu"
      >
        <span className="user-initial">{initial}</span>
      </button>

      {menuOpen && (
        <>
          <div className="user-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="user-dropdown">
            <div className="user-dropdown-header">
              <span className="user-name">{user.displayName || 'Marshan Collector'}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <div className="user-dropdown-divider" />
            <a href="/account" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
              My Account
            </a>
            <a href="/account/orders" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
              Orders & Tracking
            </a>
            <a href="/account/profile" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
              Shipping Addresses
            </a>
            <div className="user-dropdown-divider" />
            <button type="button" onClick={handleSignOut} className="user-dropdown-item signout-item">
              Sign Out
            </button>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .user-menu-container {
          position: relative;
        }

        .user-avatar-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #18181b;
          color: #ffffff;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .user-avatar-btn:hover {
          transform: scale(1.05);
        }

        .user-initial {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 16px;
          line-height: 1;
        }

        .user-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
        }

        .user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12);
          z-index: 101;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
        }

        .user-dropdown-header {
          padding: 10px 16px;
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 700;
          font-size: 13px;
          color: #111111;
        }

        .user-email {
          font-size: 11px;
          color: #71717a;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-dropdown-divider {
          height: 1px;
          background: #f4f4f5;
          margin: 6px 0;
        }

        .user-dropdown-item {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #27272a;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: block;
          transition: background-color 0.15s ease;
        }

        .user-dropdown-item:hover {
          background-color: #f4f4f5;
          color: #000000;
        }

        .signout-item {
          color: #dc2626;
          font-weight: 600;
        }

        .signout-item:hover {
          background-color: #fef2f2;
          color: #b91c1c;
        }
      ` }} />
    </div>
  );
}
