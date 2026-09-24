import React, { useState, useMemo, useEffect } from 'react';
import ProductCard from './ProductCard';
import { getProducts } from '../../lib/api/products';

const CATEGORIES = [
  { id: 'all', name: 'All Drops' },
  { id: 'lumo', name: 'Lumo (Lamps)' },
  { id: 'fandom-tribe', name: 'Fandom Tribe' },
  { id: 'minitales', name: 'MiniTales' },
  { id: 'utility-co', name: 'Utility Co.' },
  { id: 'darshanam', name: 'Darshanam' }
];

export default function ShopCatalog({ initialProducts = [], initialCategory = 'all' }) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Runtime live fetch from Store 2 production API
  useEffect(() => {
    let isMounted = true;
    getProducts({ limit: 100 })
      .then((res) => {
        if (isMounted && res && Array.isArray(res.products)) {
          if (res.products.length > 0 || initialProducts.length === 0) {
            setProducts(res.products);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync with URL query param if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat) {
        setSelectedCategory(cat);
      }
      const q = params.get('q');
      if (q) {
        setSearchQuery(q);
      }
    }
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        const cat = (p.category_slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return cat.includes(selectedCategory);
      });
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => 
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Filter by Stock
    if (inStockOnly) {
      list = list.filter((p) => (p.stock || 0) > 0);
    }

    // Sorting
    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'bestseller') {
      list.sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0));
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortBy, inStockOnly]);

  const updateCategory = (catId) => {
    setSelectedCategory(catId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (catId === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', catId);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="shop-catalog-layout">
      {/* Top Filter & Sort Bar */}
      <div className="catalog-control-bar">
        {/* Category Pills */}
        <div className="catalog-category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateCategory(cat.id)}
              className={`cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="catalog-right-controls">
          <div className="catalog-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="catalog-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="catalog-clear-search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="catalog-sort-wrap">
            <label htmlFor="sort-select" className="sort-label">Sort:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="featured">Featured</option>
              <option value="bestseller">Bestsellers</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="catalog-results-header">
        <span className="results-count">
          Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'artifact' : 'artifacts'}
        </span>
        {selectedCategory !== 'all' && (
          <button
            type="button"
            onClick={() => updateCategory('all')}
            className="reset-filter-btn"
          >
            Clear Filter ✕
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="catalog-grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="catalog-empty-state">
          <div className="empty-icon">⚲</div>
          <h3>No matching artifacts found</h3>
          <p>Try searching for a different keyword or browse our rotating universes.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="btn btn-outline"
          >
            Reset All Filters
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .shop-catalog-layout {
          width: 100%;
        }

        .catalog-control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .catalog-category-pills {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 4px;
        }

        .catalog-category-pills::-webkit-scrollbar {
          display: none;
        }

        .cat-pill {
          font-family: var(--font-sans, sans-serif);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 18px;
          border-radius: 9999px;
          background: #f4f4f5;
          color: #71717a;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .cat-pill:hover {
          background: #e4e4e7;
          color: #111111;
        }

        .cat-pill.active {
          background: #111111;
          color: #ffffff;
        }

        .catalog-right-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .catalog-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          padding: 0 12px;
          height: 38px;
          width: 220px;
        }

        .catalog-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-family: var(--font-sans, sans-serif);
          font-size: 13px;
          margin-left: 8px;
          width: 100%;
          color: #18181b;
        }

        .catalog-clear-search {
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          font-size: 12px;
          padding: 2px;
        }

        .catalog-sort-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sort-label {
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
        }

        .sort-select {
          height: 38px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #ffffff;
          font-family: var(--font-sans, sans-serif);
          font-size: 13px;
          color: #18181b;
          outline: none;
          cursor: pointer;
        }

        .catalog-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          margin-bottom: 24px;
          border-bottom: 1px solid #f4f4f5;
        }

        .results-count {
          font-size: 13px;
          color: #71717a;
        }

        .reset-filter-btn {
          background: none;
          border: none;
          color: #e11d48;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .catalog-empty-state {
          text-align: center;
          padding: 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          font-size: 36px;
          color: #a1a1aa;
        }

        .catalog-empty-state h3 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 28px;
          color: #18181b;
          margin: 0;
        }

        .catalog-empty-state p {
          font-size: 14px;
          color: #71717a;
          margin: 0 0 16px 0;
          max-width: 400px;
        }

        @media (max-width: 1100px) {
          .catalog-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .catalog-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .catalog-search-wrap {
            width: 100%;
          }
          .catalog-control-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .catalog-right-controls {
            justify-content: space-between;
          }
        }

        @media (max-width: 480px) {
          .catalog-grid {
            grid-template-columns: 1fr;
          }
        }
      ` }} />
    </div>
  );
}
