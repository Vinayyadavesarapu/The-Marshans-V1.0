import React, { useState, useMemo, useEffect } from 'react';
import { getProducts, type Product } from '../../../lib/api/products';
import { getCategoryMeta, type CategoryMeta } from '../../../config/categoriesConfig';
import CollectionHero from './CollectionHero';
import CollectionSidebar from './CollectionSidebar';
import CollectionProductGrid from './CollectionProductGrid';
import CollectionSearch from './CollectionSearch';
import CollectionSort, { type SortOption } from './CollectionSort';
import CollectionFilters, {
  type FilterState,
  type DynamicFilterOption
} from './CollectionFilters';

export interface CollectionPageProps {
  categorySlug: string;
  initialProducts: Product[];
  categoryMeta?: CategoryMeta;
}

export default function CollectionPage({
  categorySlug,
  initialProducts = [],
  categoryMeta
}: CollectionPageProps) {
  const meta = categoryMeta || getCategoryMeta(categorySlug);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);

  // Runtime live fetch from Store 2 production API for this category
  useEffect(() => {
    let isMounted = true;
    getProducts({ category_slug: categorySlug, limit: 50 })
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
  }, [categorySlug]);

  // Dynamic Price Range from Catalog
  const { minCatalogPrice, maxCatalogPrice } = useMemo(() => {
    if (!products || products.length === 0) {
      return { minCatalogPrice: 0, maxCatalogPrice: 10000 };
    }
    const prices = products.map((p) => p.price);
    return {
      minCatalogPrice: Math.min(...prices),
      maxCatalogPrice: Math.max(...prices)
    };
  }, [products]);

  // Check if any products have best seller flag
  const hasBestSellers = useMemo(() => {
    return products.some((p) => Boolean(p.is_best_seller));
  }, [products]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [filters, setFilters] = useState<FilterState>({
    inStockOnly: false,
    bestSellersOnly: false,
    selectedMaterials: [],
    selectedFinishes: [],
    minPrice: minCatalogPrice,
    maxPrice: maxCatalogPrice
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync price limits if catalog changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      minPrice: minCatalogPrice,
      maxPrice: maxCatalogPrice
    }));
  }, [minCatalogPrice, maxCatalogPrice]);

  // Lock body scroll when mobile filter is open
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFilterOpen]);

  // Extract Dynamic Filter Options from Product Data
  const availableMaterials: DynamicFilterOption[] = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (Array.isArray(p.materials)) {
        p.materials.forEach((m) => {
          if (m && m.name) {
            map.set(m.name, (map.get(m.name) || 0) + 1);
          }
        });
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  const availableFinishes: DynamicFilterOption[] = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (Array.isArray(p.finishing_options)) {
        p.finishing_options.forEach((f) => {
          if (f && f.name) {
            map.set(f.name, (map.get(f.name) || 0) + 1);
          }
        });
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.inStockOnly) count++;
    if (filters.bestSellersOnly) count++;
    count += filters.selectedMaterials.length;
    count += filters.selectedFinishes.length;
    if (filters.maxPrice < maxCatalogPrice) count++;
    return count;
  }, [filters, maxCatalogPrice]);

  // Reset Filters handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      inStockOnly: false,
      bestSellersOnly: false,
      selectedMaterials: [],
      selectedFinishes: [],
      minPrice: minCatalogPrice,
      maxPrice: maxCatalogPrice
    });
  };

  // Filter and Sort Pipeline
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // 2. In Stock Only
    if (filters.inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // 3. Best Sellers Only
    if (filters.bestSellersOnly) {
      result = result.filter((p) => p.is_best_seller);
    }

    // 4. Materials Filter
    if (filters.selectedMaterials.length > 0) {
      result = result.filter((p) =>
        p.materials?.some((m) => filters.selectedMaterials.includes(m.name))
      );
    }

    // 5. Finishes Filter
    if (filters.selectedFinishes.length > 0) {
      result = result.filter((p) =>
        p.finishing_options?.some((f) => filters.selectedFinishes.includes(f.name))
      );
    }

    // 6. Price Range Filter
    if (maxCatalogPrice > minCatalogPrice) {
      result = result.filter(
        (p) => p.price >= filters.minPrice && p.price <= filters.maxPrice
      );
    }

    // 7. Sorting
    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'best-seller') {
        if (a.is_best_seller === b.is_best_seller) return 0;
        return a.is_best_seller ? -1 : 1;
      }
      // 'featured'
      return 0;
    });

    return result;
  }, [products, searchQuery, filters, sortBy, minCatalogPrice, maxCatalogPrice]);

  return (
    <div className="collection-page-root">
      {/* 1. Category Hero */}
      <CollectionHero category={meta} totalProducts={products.length} />

      {/* 2. Breadcrumbs */}
      <div className="collection-breadcrumbs-bar">
        <div className="collection-container">
          <nav className="breadcrumbs-nav" aria-label="Breadcrumbs">
            <a href="/#home-carousel-section" className="breadcrumb-link">
              Home
            </a>
            <span className="breadcrumb-sep">&gt;</span>
            <span className="breadcrumb-link">Universes</span>
            <span className="breadcrumb-sep">&gt;</span>
            <span className="breadcrumb-current">{meta.name}</span>
          </nav>
        </div>
      </div>

      {/* 3. Main Workspace: Sidebar + Product Grid */}
      <div className="collection-main-section">
        <div className="collection-container collection-layout-grid">
          {/* Desktop Left Sidebar */}
          <div className="desktop-sidebar-container">
            <CollectionSidebar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filters={filters}
              onFilterChange={setFilters}
              availableMaterials={availableMaterials}
              availableFinishes={availableFinishes}
              priceRange={{ min: minCatalogPrice, max: maxCatalogPrice }}
              activeFilterCount={activeFilterCount}
              hasBestSellers={hasBestSellers}
              onResetFilters={handleResetFilters}
              categoryName={meta.name}
            />
          </div>

          {/* Right Product Grid */}
          <CollectionProductGrid
            products={filteredProducts}
            totalBeforeFilters={products.length}
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFilterChange={setFilters}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onResetFilters={handleResetFilters}
            onOpenMobileFilters={() => setMobileFilterOpen(true)}
            categoryName={meta.name}
          />
        </div>
      </div>

      {/* 4. Mobile Filter & Sort Drawer Modal */}
      <div
        className={`mobile-filter-backdrop ${mobileFilterOpen ? 'open' : ''}`}
        onClick={() => setMobileFilterOpen(false)}
        aria-hidden={!mobileFilterOpen}
      />

      <div
        className={`mobile-filter-drawer ${mobileFilterOpen ? 'open' : ''}`}
        aria-hidden={!mobileFilterOpen}
        role="dialog"
        aria-label="Filter and Sort Products"
      >
        <div className="mobile-drawer-header">
          <div className="drawer-title-wrap">
            <span className="drawer-title">FILTER & SORT</span>
            {activeFilterCount > 0 && (
              <span className="drawer-count-badge">({activeFilterCount} active)</span>
            )}
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setMobileFilterOpen(false)}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        <div className="mobile-drawer-body">
          {/* Search inside mobile drawer */}
          <CollectionSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={`Search ${meta.name}...`}
          />

          {/* Sort inside mobile drawer */}
          <CollectionSort sortBy={sortBy} onSortChange={setSortBy} />

          {/* Filters inside mobile drawer */}
          <CollectionFilters
            filters={filters}
            onFilterChange={setFilters}
            availableMaterials={availableMaterials}
            availableFinishes={availableFinishes}
            priceRange={{ min: minCatalogPrice, max: maxCatalogPrice }}
            activeFilterCount={activeFilterCount}
            hasBestSellers={hasBestSellers}
            onResetFilters={handleResetFilters}
          />
        </div>

        <div className="mobile-drawer-footer">
          <button
            type="button"
            onClick={handleResetFilters}
            className="drawer-reset-btn"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(false)}
            className="drawer-apply-btn"
          >
            Show {filteredProducts.length} Artifacts
          </button>
        </div>
      </div>

      <style>{`
        .collection-page-root {
          background-color: #ffffff;
          width: 100%;
          min-height: 85vh;
          box-sizing: border-box;
        }

        .collection-container {
          max-width: 1480px;
          margin: 0 auto;
          padding: 0 1.5rem;
          box-sizing: border-box;
        }

        /* Breadcrumbs */
        .collection-breadcrumbs-bar {
          background-color: #faf9f7;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          padding: 14px 0;
        }

        .breadcrumbs-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12px;
          font-weight: 500;
          color: #71717a;
          flex-wrap: wrap;
        }

        .breadcrumb-link {
          color: #71717a;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .breadcrumb-link:hover {
          color: #09090b;
        }

        .breadcrumb-sep {
          color: #d4d4d8;
          font-size: 10px;
        }

        .breadcrumb-current {
          color: #09090b;
          font-weight: 700;
        }

        /* Main Grid Section */
        .collection-main-section {
          padding: 36px 0 80px;
          background-color: #ffffff;
        }

        .collection-layout-grid {
          display: flex;
          align-items: flex-start;
          gap: 28px;
        }

        .desktop-sidebar-container {
          display: block;
        }

        /* Mobile Drawer */
        .mobile-filter-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }

        .mobile-filter-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-filter-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 88%;
          max-width: 380px;
          background: #ffffff;
          z-index: 1000;
          transform: translateX(100%);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          box-shadow: -6px 0 24px rgba(0, 0, 0, 0.15);
        }

        .mobile-filter-drawer.open {
          transform: translateX(0);
        }

        .mobile-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #f4f4f5;
        }

        .drawer-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .drawer-title {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #09090b;
        }

        .drawer-count-badge {
          font-size: 12px;
          color: #0284c7;
          font-weight: 700;
        }

        .drawer-close-btn {
          background: transparent;
          border: none;
          padding: 6px;
          font-size: 16px;
          color: #71717a;
          cursor: pointer;
        }

        .mobile-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mobile-drawer-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #f4f4f5;
          background: #ffffff;
        }

        .drawer-reset-btn {
          flex: 1;
          height: 44px;
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: #3f3f46;
          cursor: pointer;
        }

        .drawer-apply-btn {
          flex: 2;
          height: 44px;
          background: #09090b;
          border: none;
          border-radius: 8px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
        }

        /* Breakpoints */
        @media (max-width: 960px) {
          .desktop-sidebar-container {
            display: none;
          }
          .collection-layout-grid {
            gap: 0;
          }
          .collection-main-section {
            padding: 24px 0 64px;
          }
        }

        @media (max-width: 640px) {
          .collection-container {
            padding: 0 1rem;
          }
        }
      `}</style>
    </div>
  );
}
