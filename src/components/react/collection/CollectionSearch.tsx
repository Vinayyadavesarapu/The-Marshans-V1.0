import React from 'react';

export interface CollectionSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export default function CollectionSearch({
  searchQuery,
  onSearchChange,
  placeholder = 'Search collection artifacts...'
}: CollectionSearchProps) {
  return (
    <div className="collection-search-wrap">
      <label className="collection-filter-label" htmlFor="collection-search-input">
        Search
      </label>
      <div className="search-input-box">
        <svg
          className="search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          id="collection-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="collection-search-input"
        />

        {searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <style>{`
        .collection-search-wrap {
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

        .search-input-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: #a1a1aa;
          pointer-events: none;
        }

        .collection-search-input {
          width: 100%;
          height: 42px;
          padding: 0 36px 0 36px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13.5px;
          font-weight: 500;
          color: #18181b;
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .collection-search-input:focus {
          border-color: #09090b;
          box-shadow: 0 0 0 2px rgba(9, 9, 11, 0.08);
        }

        .collection-search-input::placeholder {
          color: #a1a1aa;
          font-size: 13px;
        }

        .search-clear-btn {
          position: absolute;
          right: 8px;
          background: transparent;
          border: none;
          padding: 6px 8px;
          font-size: 12px;
          color: #71717a;
          cursor: pointer;
          border-radius: 4px;
          line-height: 1;
        }

        .search-clear-btn:hover {
          color: #09090b;
          background: #f4f4f5;
        }
      `}</style>
    </div>
  );
}
