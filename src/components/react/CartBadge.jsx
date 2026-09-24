import React, { useState, useEffect } from 'react';
import { getCartCount } from '../../lib/api/cart';

export default function CartBadge() {
  const [count, setCount] = useState(0);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    // Initial count
    setCount(getCartCount());

    const handleUpdate = (e) => {
      const newCount = e.detail?.count ?? getCartCount();
      setCount(newCount);
      setBump(true);
      setTimeout(() => setBump(false), 300);
    };

    window.addEventListener('marshans:cart-updated', handleUpdate);
    return () => window.removeEventListener('marshans:cart-updated', handleUpdate);
  }, []);

  return (
    <a href="/cart" className="header-icon-btn cart-btn" aria-label={`View Cart (${count} items)`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {count > 0 && (
        <span className={`cart-count-badge ${bump ? 'bump' : ''}`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .cart-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: #18181b;
          transition: background-color 0.15s ease, transform 0.15s ease;
        }

        .cart-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .cart-count-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background-color: #111111;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          font-family: var(--font-sans, -apple-system, sans-serif);
          min-width: 17px;
          height: 17px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          line-height: 1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .cart-count-badge.bump {
          transform: scale(1.35);
        }
      ` }} />
    </a>
  );
}
