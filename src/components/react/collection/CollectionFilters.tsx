import React, { useState } from 'react';

export interface FilterState {
  inStockOnly: boolean;
  bestSellersOnly: boolean;
  selectedMaterials: string[];
  selectedFinishes: string[];
  minPrice: number;
  maxPrice: number;
}

export interface DynamicFilterOption {
  name: string;
  count: number;
}

export interface CollectionFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableMaterials: DynamicFilterOption[];
  availableFinishes: DynamicFilterOption[];
  priceRange: { min: number; max: number };
  activeFilterCount: number;
  hasBestSellers?: boolean;
  onResetFilters: () => void;
}

export default function CollectionFilters({
  filters,
  onFilterChange,
  availableMaterials = [],
  availableFinishes = [],
  priceRange,
  activeFilterCount,
  hasBestSellers = false,
  onResetFilters
}: CollectionFiltersProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    materials: true,
    finishes: true,
    price: true
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMaterialToggle = (matName: string) => {
    const next = filters.selectedMaterials.includes(matName)
      ? filters.selectedMaterials.filter((m) => m !== matName)
      : [...filters.selectedMaterials, matName];
    onFilterChange({ ...filters, selectedMaterials: next });
  };

  const handleFinishToggle = (finName: string) => {
    const next = filters.selectedFinishes.includes(finName)
      ? filters.selectedFinishes.filter((f) => f !== finName)
      : [...filters.selectedFinishes, finName];
    onFilterChange({ ...filters, selectedFinishes: next });
  };

  const formatPrice = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;

  const hasAnyFilterGroups =
    hasBestSellers ||
    availableMaterials.length > 0 ||
    availableFinishes.length > 0 ||
    priceRange.max > priceRange.min;

  return (
    <div className="collection-filters-container">
      {/* Top Header: Title + Clear All */}
      <div className="filters-header">
        <span className="filters-title">
          FILTERS {activeFilterCount > 0 && <span className="filter-count-badge">({activeFilterCount})</span>}
        </span>
        {activeFilterCount > 0 && (
          <button type="button" onClick={onResetFilters} className="clear-filters-btn">
            Clear All
          </button>
        )}
      </div>

      {/* 1. Status & Availability (Rendered only when meaningful data exists) */}
      <div className="filter-accordion-group">
        <button
          type="button"
          className="accordion-header"
          onClick={() => toggleSection('status')}
          aria-expanded={openSections.status}
        >
          <span>Availability & Edition</span>
          <span className={`accordion-icon ${openSections.status ? 'open' : ''}`}>▾</span>
        </button>

        {openSections.status && (
          <div className="accordion-content">
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => onFilterChange({ ...filters, inStockOnly: e.target.checked })}
                className="filter-checkbox"
              />
              <span className="checkbox-custom" />
              <span className="checkbox-text">In Stock Only</span>
            </label>

            {hasBestSellers && (
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.bestSellersOnly}
                  onChange={(e) => onFilterChange({ ...filters, bestSellersOnly: e.target.checked })}
                  className="filter-checkbox"
                />
                <span className="checkbox-custom" />
                <span className="checkbox-text">Best Sellers Only</span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* 2. Materials (Dynamic based on product catalog) */}
      {availableMaterials.length > 0 && (
        <div className="filter-accordion-group">
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection('materials')}
            aria-expanded={openSections.materials}
          >
            <span>Material & Resin</span>
            <span className={`accordion-icon ${openSections.materials ? 'open' : ''}`}>▾</span>
          </button>

          {openSections.materials && (
            <div className="accordion-content">
              {availableMaterials.map((mat) => (
                <label key={mat.name} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.selectedMaterials.includes(mat.name)}
                    onChange={() => handleMaterialToggle(mat.name)}
                    className="filter-checkbox"
                  />
                  <span className="checkbox-custom" />
                  <span className="checkbox-text">{mat.name}</span>
                  <span className="checkbox-count">({mat.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Finishing Options (Dynamic based on product catalog) */}
      {availableFinishes.length > 0 && (
        <div className="filter-accordion-group">
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection('finishes')}
            aria-expanded={openSections.finishes}
          >
            <span>Surface Finishing</span>
            <span className={`accordion-icon ${openSections.finishes ? 'open' : ''}`}>▾</span>
          </button>

          {openSections.finishes && (
            <div className="accordion-content">
              {availableFinishes.map((fin) => (
                <label key={fin.name} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.selectedFinishes.includes(fin.name)}
                    onChange={() => handleFinishToggle(fin.name)}
                    className="filter-checkbox"
                  />
                  <span className="checkbox-custom" />
                  <span className="checkbox-text">{fin.name}</span>
                  <span className="checkbox-count">({fin.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Price Slider (Rendered only when price range varies) */}
      {priceRange.max > priceRange.min && (
        <div className="filter-accordion-group">
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection('price')}
            aria-expanded={openSections.price}
          >
            <span>Price Range</span>
            <span className={`accordion-icon ${openSections.price ? 'open' : ''}`}>▾</span>
          </button>

          {openSections.price && (
            <div className="accordion-content price-slider-content">
              <div className="price-inputs-row">
                <span className="price-tag">{formatPrice(filters.minPrice)}</span>
                <span className="price-sep">to</span>
                <span className="price-tag">{formatPrice(filters.maxPrice)}</span>
              </div>

              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                step={100}
                value={filters.maxPrice}
                onChange={(e) =>
                  onFilterChange({ ...filters, maxPrice: Number(e.target.value) })
                }
                className="price-range-slider"
                aria-label="Filter maximum price"
              />
            </div>
          )}
        </div>
      )}

      <style>{`
        .collection-filters-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .filters-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid #f4f4f5;
        }

        .filters-title {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #18181b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-count-badge {
          color: #0284c7;
          font-weight: 700;
        }

        .clear-filters-btn {
          background: none;
          border: none;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 700;
          color: #e11d48;
          cursor: pointer;
          padding: 2px 4px;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .clear-filters-btn:hover {
          color: #be123c;
        }

        .filter-accordion-group {
          border-bottom: 1px solid #f4f4f5;
          padding-bottom: 14px;
        }

        .accordion-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: none;
          border: none;
          padding: 8px 0;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: #27272a;
          cursor: pointer;
          text-align: left;
        }

        .accordion-header:hover {
          color: #09090b;
        }

        .accordion-icon {
          font-size: 14px;
          transition: transform 0.2s ease;
          display: inline-block;
        }

        .accordion-icon.open {
          transform: rotate(0deg);
        }

        .accordion-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 8px;
        }

        .filter-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .filter-checkbox {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }

        .checkbox-custom {
          width: 16px;
          height: 16px;
          background-color: #ffffff;
          border: 1.5px solid #d4d4d8;
          border-radius: 4px;
          flex-shrink: 0;
          transition: background-color 0.15s ease, border-color 0.15s ease;
          position: relative;
        }

        .filter-checkbox:checked ~ .checkbox-custom {
          background-color: #09090b;
          border-color: #09090b;
        }

        .filter-checkbox:checked ~ .checkbox-custom::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 1.8px 1.8px 0;
          transform: rotate(45deg);
        }

        .checkbox-text {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: #3f3f46;
          flex: 1;
        }

        .filter-checkbox-label:hover .checkbox-text {
          color: #09090b;
        }

        .checkbox-count {
          font-size: 11px;
          color: #a1a1aa;
          font-weight: 600;
        }

        /* Price Slider */
        .price-slider-content {
          gap: 12px;
        }

        .price-inputs-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          color: #18181b;
        }

        .price-tag {
          background: #f4f4f5;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .price-sep {
          color: #a1a1aa;
          font-size: 11px;
        }

        .price-range-slider {
          width: 100%;
          accent-color: #09090b;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
