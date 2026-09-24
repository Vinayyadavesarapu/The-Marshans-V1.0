import React from 'react';
import ProductCard from '../ProductCard';
import type { Product } from '../../../lib/api/products';
import type { FilterState } from './CollectionFilters';

export interface CollectionProductGridProps {
  products: Product[];
  totalBeforeFilters: number;
  activeFilterCount: number;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onResetFilters: () => void;
  onOpenMobileFilters: () => void;
  categoryName: string;
}

export default function CollectionProductGrid({
  products,
  totalBeforeFilters,
  activeFilterCount,
  filters,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onResetFilters,
  onOpenMobileFilters,
  categoryName
}: CollectionProductGridProps) {
  const hasActiveFilters = activeFilterCount > 0 || Boolean(searchQuery);

  return (
    <div className="collection-grid-root">
      {/* Top Results Bar */}
      <div className="collection-results-bar">
        <div className="results-count-wrap">
          <span className="results-count-text">
            <strong>{products.length}</strong> {products.length === 1 ? 'Artifact' : 'Artifacts'} found
            {totalBeforeFilters > products.length && (
              <span className="results-total-hint"> (out of {totalBeforeFilters})</span>
            )}
          </span>
        </div>

        {/* Mobile Filter & Sort Button */}
        <button
          type="button"
          className="mobile-filter-trigger"
          onClick={onOpenMobileFilters}
          aria-label="Open Filters and Sorting"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          <span>Filters & Sort</span>
          {activeFilterCount > 0 && (
            <span className="mobile-filter-badge">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="active-filter-chips">
          {searchQuery && (
            <span className="filter-chip">
              Search: "{searchQuery}"
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="chip-remove"
                aria-label="Remove search filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.inStockOnly && (
            <span className="filter-chip">
              In Stock Only
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, inStockOnly: false })}
                className="chip-remove"
                aria-label="Remove in stock filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.bestSellersOnly && (
            <span className="filter-chip">
              Best Sellers
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, bestSellersOnly: false })}
                className="chip-remove"
                aria-label="Remove best sellers filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.selectedMaterials.map((mat) => (
            <span key={mat} className="filter-chip">
              {mat}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    selectedMaterials: filters.selectedMaterials.filter((m) => m !== mat)
                  })
                }
                className="chip-remove"
                aria-label={`Remove material ${mat}`}
              >
                ✕
              </button>
            </span>
          ))}

          {filters.selectedFinishes.map((fin) => (
            <span key={fin} className="filter-chip">
              {fin}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    selectedFinishes: filters.selectedFinishes.filter((f) => f !== fin)
                  })
                }
                className="chip-remove"
                aria-label={`Remove finish ${fin}`}
              >
                ✕
              </button>
            </span>
          ))}

          <button type="button" onClick={onResetFilters} className="clear-all-chips">
            Reset All
          </button>
        </div>
      )}

      {/* Main Product Grid */}
      {products.length > 0 ? (
        <div className="collection-cards-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="collection-empty-state">
          <div className="empty-icon-wrap">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h3 className="empty-title">No Artifacts Match Your Filter Criteria</h3>
          <p className="empty-desc">
            Try adjusting or resetting your search keywords, material selections, or price range.
          </p>
          <button type="button" onClick={onResetFilters} className="empty-reset-btn">
            Reset Filters
          </button>
        </div>
      )}

      <style>{`
        .collection-grid-root {
          flex: 1;
          width: 100%;
          min-width: 0;
        }

        .collection-results-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          margin-bottom: 16px;
          border-bottom: 1px solid #f4f4f5;
        }

        .results-count-text {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13.5px;
          color: #52525b;
        }

        .results-count-text strong {
          color: #09090b;
          font-weight: 700;
        }

        .results-total-hint {
          color: #a1a1aa;
          font-size: 12px;
        }

        .mobile-filter-trigger {
          display: none;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          padding: 8px 14px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12.5px;
          font-weight: 700;
          color: #18181b;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .mobile-filter-trigger:hover {
          background-color: #f4f4f5;
          border-color: #d4d4d8;
        }

        .mobile-filter-badge {
          background: #09090b;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 999px;
        }

        /* Active Filter Chips */
        .active-filter-chips {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          padding: 4px 10px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12px;
          font-weight: 600;
          color: #27272a;
        }

        .chip-remove {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 11px;
          color: #71717a;
          cursor: pointer;
          line-height: 1;
        }

        .chip-remove:hover {
          color: #e11d48;
        }

        .clear-all-chips {
          background: transparent;
          border: none;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 11.5px;
          font-weight: 700;
          color: #e11d48;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 8px;
        }

        /* Product Grid */
        .collection-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Empty State */
        .collection-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 72px 24px;
          background: #ffffff;
          border: 1px dashed #e4e4e7;
          border-radius: 12px;
          margin-top: 12px;
        }

        .empty-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #f4f4f5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .empty-title {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 18px;
          font-weight: 700;
          color: #18181b;
          margin: 0 0 8px 0;
        }

        .empty-desc {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 14px;
          color: #71717a;
          max-width: 440px;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .empty-reset-btn {
          background: #09090b;
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 8px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .empty-reset-btn:hover {
          background: #27272a;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1380px) {
          .collection-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
          }
        }

        @media (max-width: 1024px) {
          .collection-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 900px) {
          .mobile-filter-trigger {
            display: inline-flex;
          }
        }

        @media (max-width: 640px) {
          .collection-cards-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
