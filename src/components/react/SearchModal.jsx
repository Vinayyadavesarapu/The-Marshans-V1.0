import React, { useState, useEffect, useRef } from 'react';
import { fetchProducts } from '../../lib/api/products';
import { resolveImageUrl } from '../../lib/utils/media';
import {
  isCustomForgeOnly,
  CUSTOM_FORGE_SEARCH_PRODUCTS,
  CUSTOM_FORGE_SEARCH_SUGGESTIONS,
  RETAIL_SEARCH_SUGGESTIONS
} from '../../config/launchMode';

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState(isCustomForgeOnly() ? CUSTOM_FORGE_SEARCH_PRODUCTS : []);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isLaunch = isCustomForgeOnly();

  // Load products cache: in launch mode, strictly use Custom Forge products. In retail mode, load full catalog.
  useEffect(() => {
    if (isLaunch) {
      setProducts(CUSTOM_FORGE_SEARCH_PRODUCTS);
      return;
    }

    async function load() {
      try {
        const res = await fetchProducts({ limit: 50 });
        setProducts(res.products || []);
      } catch (err) {
        console.error('Failed to load products for search', err);
      }
    }
    load();
  }, [isLaunch]);

  // Global shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
  }, [isOpen]);

  const filtered = query.trim() === '' ? [] : products.filter((p) => {
    const q = query.toLowerCase().trim();
    const matchesName = p.name?.toLowerCase().includes(q);
    const matchesDesc = (p.description || p.short_description)?.toLowerCase().includes(q);
    const matchesCat = p.category_name?.toLowerCase().includes(q);
    const matchesKeywords = Array.isArray(p.keywords) && p.keywords.some((k) => k.toLowerCase().includes(q));
    return Boolean(matchesName || matchesDesc || matchesCat || matchesKeywords);
  });

  const popularChips = isLaunch ? CUSTOM_FORGE_SEARCH_SUGGESTIONS : RETAIL_SEARCH_SUGGESTIONS;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="header-icon-btn search-trigger-btn"
        aria-label="Open Search (Cmd + K)"
        title="Search (Cmd + K)"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {isOpen && (
        <div className="search-backdrop" onClick={() => setIsOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder={isLaunch ? "Search Custom Forge sculptures, Lady Justice..." : "Search artifacts, statues, lamps, keycaps..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="search-close-btn"
                aria-label="Close search"
              >
                ESC
              </button>
            </div>

            <div className="search-body">
              {query.trim() === '' ? (
                <div className="search-suggestions">
                  <span className="search-section-label">Popular Searches</span>
                  <div className="search-chips">
                    {popularChips.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="search-chip"
                        onClick={() => setQuery(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="search-empty">
                  <p>{isLaunch ? `No Custom Forge pieces found for "${query}".` : `No artifacts found for "${query}".`}</p>
                  <a
                    href={isLaunch ? "/custom-3d" : "/shop"}
                    className="search-browse-link"
                    onClick={() => setIsOpen(false)}
                  >
                    {isLaunch ? "Explore Custom Forge →" : "Browse full catalog →"}
                  </a>
                </div>
              ) : (
                <div className="search-results-list">
                  <span className="search-section-label">{filtered.length} {filtered.length === 1 ? 'Piece' : 'Pieces'} Found</span>
                  {filtered.map((item) => {
                    const targetHref = item.slug === 'lady-justice'
                      ? '/product/lady-justice/'
                      : `/product/${encodeURIComponent(item.slug || item.id)}/`;
                    return (
                      <a
                        key={item.id}
                        href={targetHref}
                        className="search-result-item"
                        onClick={() => setIsOpen(false)}
                      >
                        <img
                          src={resolveImageUrl(item.primary_image_url || item.images?.[0]?.image_url || item.images?.[0])}
                          alt={item.name}
                          className="search-result-img"
                        />
                        <div className="search-result-info">
                          <div className="search-result-meta">
                            <span className="search-result-category">{item.category_name || 'Artifact'}</span>
                          </div>
                          <span className="search-result-title">{item.name}</span>
                          <span className="search-result-price">₹{Number(item.price).toLocaleString('en-IN')}</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .search-trigger-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: #18181b;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .search-trigger-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .search-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 20px 20px;
          animation: fadeIn 0.15s ease;
        }

        .search-modal {
          background-color: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 640px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.08);
          animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .search-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #f4f4f5;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 16px;
          color: #18181b;
          background: transparent;
        }

        .search-close-btn {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 700;
          color: #71717a;
          background: #f4f4f5;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
        }

        .search-body {
          max-height: 480px;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .search-section-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a1a1aa;
          margin-bottom: 12px;
        }

        .search-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .search-chip {
          background: #f4f4f5;
          border: 1px solid transparent;
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #3f3f46;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .search-chip:hover {
          background: #e4e4e7;
          color: #111111;
        }

        .search-results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px;
          border-radius: 10px;
          transition: background-color 0.15s ease;
        }

        .search-result-item:hover {
          background-color: #f8fafc;
        }

        .search-result-img {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          object-fit: cover;
          background-color: #f1f5f9;
        }

        .search-result-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .search-result-category {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .search-result-title {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 14px;
          font-weight: 600;
          color: #09090b;
        }

        .search-result-price {
          font-size: 13px;
          font-weight: 700;
          color: #111111;
          margin-top: 2px;
        }

        .search-empty {
          text-align: center;
          padding: 32px 16px;
          color: #71717a;
        }

        .search-browse-link {
          display: inline-block;
          margin-top: 8px;
          font-weight: 600;
          color: #111111;
          text-decoration: underline;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      ` }} />
    </>
  );
}
