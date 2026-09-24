import React from 'react';
import CollectionSearch from './CollectionSearch';
import CollectionSort, { type SortOption } from './CollectionSort';
import CollectionFilters, {
  type FilterState,
  type DynamicFilterOption
} from './CollectionFilters';

export interface CollectionSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableMaterials: DynamicFilterOption[];
  availableFinishes: DynamicFilterOption[];
  priceRange: { min: number; max: number };
  activeFilterCount: number;
  hasBestSellers?: boolean;
  onResetFilters: () => void;
  categoryName: string;
}

export default function CollectionSidebar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filters,
  onFilterChange,
  availableMaterials,
  availableFinishes,
  priceRange,
  activeFilterCount,
  hasBestSellers = false,
  onResetFilters,
  categoryName
}: CollectionSidebarProps) {
  return (
    <aside className="collection-sidebar-root" aria-label="Collection Filters & Sorting">
      <div className="collection-sidebar-inner">
        {/* Real-time search */}
        <CollectionSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          placeholder={`Search ${categoryName}...`}
        />

        {/* Sorting selection */}
        <CollectionSort sortBy={sortBy} onSortChange={onSortChange} />

        {/* Dynamic filters */}
        <CollectionFilters
          filters={filters}
          onFilterChange={onFilterChange}
          availableMaterials={availableMaterials}
          availableFinishes={availableFinishes}
          priceRange={priceRange}
          activeFilterCount={activeFilterCount}
          hasBestSellers={hasBestSellers}
          onResetFilters={onResetFilters}
        />
      </div>

      <style>{`
        .collection-sidebar-root {
          width: 260px;
          flex-shrink: 0;
        }

        .collection-sidebar-inner {
          position: sticky;
          top: 86px;
          background: #ffffff;
          border: 1px solid #f4f4f5;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
          max-height: calc(100vh - 110px);
          overflow-y: auto;
        }

        /* Custom subtle scrollbar */
        .collection-sidebar-inner::-webkit-scrollbar {
          width: 4px;
        }
        .collection-sidebar-inner::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 4px;
        }
      `}</style>
    </aside>
  );
}
