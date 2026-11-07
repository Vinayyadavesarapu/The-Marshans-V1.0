import React from 'react';
import { logOut } from '../../lib/firebase/client';

export default function AccountNav({ activeTab = 'dashboard' }) {
  const handleLogout = async () => {
    try {
      await logOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Collector Dashboard', href: '/account', icon: '📊' },
    { id: 'orders', label: 'Orders & Tracking', href: '/account/orders', icon: '📦' },
    { id: 'addresses', label: 'Saved Addresses', href: '/account/profile', icon: '📍' },
    { id: 'custom-3d', label: 'Custom 3D Studio', href: '/custom-3d', icon: '📐' }
  ];

  return (
    <nav className="account-subnav-root" aria-label="Account Navigation">
      <div className="account-subnav-container">
        <div className="account-subnav-tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <a
                key={tab.id}
                href={tab.href}
                className={`account-subnav-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="subnav-icon">{tab.icon}</span>
                <span className="subnav-label">{tab.label}</span>
              </a>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="account-subnav-signout"
          title="Sign out of Marshan Network"
        >
          Sign Out
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .account-subnav-root {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          margin-bottom: 28px;
          padding: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .account-subnav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .account-subnav-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .account-subnav-tabs::-webkit-scrollbar {
          display: none;
        }

        .account-subnav-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #52525b;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .account-subnav-link:hover {
          color: #09090b;
          background: #f4f4f5;
        }

        .account-subnav-link.active {
          color: #09090b;
          background: #f4f4f5;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .subnav-icon {
          font-size: 14px;
        }

        .account-subnav-signout {
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 700;
          color: #dc2626;
          padding: 10px 16px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.15s ease;
          white-space: nowrap;
        }

        .account-subnav-signout:hover {
          background: #fef2f2;
        }

        @media (max-width: 768px) {
          .account-subnav-container {
            flex-direction: column;
            align-items: stretch;
          }

          .account-subnav-tabs {
            justify-content: flex-start;
          }

          .account-subnav-link {
            padding: 8px 12px;
            font-size: 12px;
          }

          .account-subnav-signout {
            text-align: center;
            border-top: 1px solid #f4f4f5;
            padding: 8px;
          }
        }
      ` }} />
    </nav>
  );
}
