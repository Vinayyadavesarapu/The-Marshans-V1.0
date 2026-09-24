import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';

const TABS = [
  { id: 'all', label: 'All Drops' },
  { id: 'lumo', label: 'Lumo (Lamps)' },
  { id: 'fandom-tribe', label: 'Fandom Tribe' },
  { id: 'minitales', label: 'MiniTales' },
  { id: 'utility-co', label: 'Utility Co.' },
  { id: 'darshanam', label: 'Darshanam' }
];

export default function ProductShowcase({ initialProducts = [] }) {
  const [activeTab, setActiveTab] = useState('all');

  const filteredProducts = useMemo(() => {
    if (activeTab === 'all') return initialProducts;
    return initialProducts.filter((p) => {
      const slug = (p.category_slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return slug.includes(activeTab);
    });
  }, [activeTab, initialProducts]);

  return (
    <div className="product-showcase-section">
      {/* Tabs Filter Bar */}
      <div className="showcase-tabs-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`showcase-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="showcase-grid">

        {filteredProducts.map((prod) => (
          <ProductCard key={prod.id} product={prod} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="showcase-empty">
          <p>No artifacts found in this category yet.</p>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="btn btn-outline btn-sm"
          >
            View All Artifacts
          </button>
        </div>
      )}

      <div className="showcase-footer-action">
        <a href="/shop" className="btn btn-primary">
          <span>Explore Entire Catalog ({initialProducts.length}+ Artifacts)</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .product-showcase-section {
          width: 100%;
        }

        .showcase-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 32px;
          scrollbar-width: none;
        }

        .showcase-tabs-bar::-webkit-scrollbar {
          display: none;
        }

        .showcase-tab {
          font-family: var(--font-sans, sans-serif);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 18px;
          border-radius: 9999px;
          background-color: #f4f4f5;
          color: #71717a;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .showcase-tab:hover {
          color: #18181b;
          background-color: #e4e4e7;
        }

        .showcase-tab.active {
          background-color: #18181b;
          color: #ffffff;
        }

        .showcase-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .showcase-empty {
          text-align: center;
          padding: 64px 20px;
          color: #71717a;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .showcase-footer-action {
          display: flex;
          justify-content: center;
          margin-top: 48px;
        }

        @media (max-width: 1100px) {
          .showcase-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .showcase-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .showcase-grid {
            grid-template-columns: 1fr;
          }
        }
      ` }} />
    </div>
  );
}
