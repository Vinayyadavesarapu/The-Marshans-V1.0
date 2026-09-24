import React from 'react';

export type SortOption = 'featured' | 'best-seller' | 'price-asc' | 'price-desc' | 'rating' | 'name-asc';

export interface CollectionSortProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showLabel?: boolean;
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured Drops' },
  { value: 'best-seller', label: 'Best Sellers' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'name-asc', label: 'Alphabetical: A to Z' }
];

export default function CollectionSort({
  sortBy,
  onSortChange,
  showLabel = true
}: CollectionSortProps) {
  return (
    <div className="collection-sort-wrap">
      {showLabel && (
        <label className="collection-filter-label" htmlFor="collection-sort-select">
          Sort By
        </label>
      )}
      <div className="sort-select-box">
        <select
          id="collection-sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="collection-sort-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="sort-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <style>{`
        .collection-sort-wrap {
          margin-bottom: 24px;
        }

        .collection-filter-label {
          display: block;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #71717a;
          margin-bottom: 8px;
        }

        .sort-select-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .collection-sort-select {
          width: 100%;
          height: 42px;
          padding: 0 34px 0 14px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13.5px;
          font-weight: 600;
          color: #18181b;
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .collection-sort-select:focus {
          border-color: #09090b;
          box-shadow: 0 0 0 2px rgba(9, 9, 11, 0.08);
        }

        .sort-chevron {
          position: absolute;
          right: 12px;
          color: #71717a;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
