import React, { useState, useMemo, useEffect } from 'react';
import ProductListingGrid from './ProductListingGrid';
import CollectionSearch from './collection/CollectionSearch';
import CollectionSort from './collection/CollectionSort';
import { getProducts } from '../../lib/api/products';
import { fetchCategories, resolveBackendCategory } from '../../lib/api/categories';

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
  const [sortBy, setSortBy] = useState('price-asc');
  const [inStockOnly, setInStockOnly] = useState(false);
  // Live backend category id for the selected route slug (undefined while resolving, null if no match)
  const [selectedCategoryId, setSelectedCategoryId] = useState(undefined);

  useEffect(() => {
    if (selectedCategory === 'all') return;
    let isMounted = true;
    setSelectedCategoryId(undefined);
    fetchCategories().then((categories) => {
      if (!isMounted || !categories) return;
      const category = resolveBackendCategory(selectedCategory, categories);
      setSelectedCategoryId(category ? category.id : null);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  // Runtime live fetch from Store 2 production API
  useEffect(() => {
    let isMounted = true;
    getProducts({ limit: 100 })
      .then((res) => {
        if (isMounted && res && Array.isArray(res.products)) {
          // Live API response replaces build-time products (even when it is now empty)
          if (res.ok) {
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
      list = list.filter((p) => selectedCategoryId != null && p.category_id === selectedCategoryId);
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

    // Filter by Stock (missing stock means unknown availability, never 0 or out of stock)
    if (inStockOnly) {
      list = list.filter((p) => (typeof p.stock === 'number' ? p.stock > 0 : true));
    }

    // Sorting (reliable options)
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return list;
  }, [products, selectedCategory, selectedCategoryId, searchQuery, sortBy, inStockOnly]);

  // Avoid flashing the empty state while live products or the category id are still loading
  const isResolving = loading || (selectedCategory !== 'all' && selectedCategoryId === undefined);

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
          <CollectionSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search catalog..."
          />
          <CollectionSort sortBy={sortBy} onSortChange={setSortBy} />
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
      <ProductListingGrid products={filteredProducts} />

      {filteredProducts.length === 0 && !isResolving && (
        <div className="catalog-empty-state">
          <div className="empty-icon">⚲</div>
          <h3>No matching artifacts found</h3>
          <p>Try searching for a different keyword or browse our rotating universes.</p>
          <button
            type="button"
            onClick={() => {
              updateCategory('all');
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
          align-items: flex-end;
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
          align-items: flex-end;
          gap: 12px;
        }

        .catalog-right-controls .collection-search-wrap,
        .catalog-right-controls .collection-sort-wrap {
          margin-bottom: 0;
        }

        .catalog-right-controls .collection-search-wrap {
          width: 240px;
        }

        .catalog-right-controls .collection-sort-wrap {
          width: 200px;
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

        @media (max-width: 768px) {
          .catalog-control-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .catalog-right-controls .collection-search-wrap {
            flex: 1 1 auto;
            min-width: 0;
            width: auto;
          }
          .catalog-right-controls .collection-sort-wrap {
            flex: 0 0 auto;
            width: 190px;
          }
        }

        @media (max-width: 480px) {
          .catalog-right-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .catalog-right-controls .collection-sort-wrap {
            width: 100%;
          }
        }
      ` }} />
    </div>
  );
}
