import React from 'react';
import ProductCard from './ProductCard';
import type { Product } from '../../lib/api/products';

export interface ProductListingGridProps {
  products: Product[];
  /** How many leading cards load their image eagerly (roughly the first visible row) */
  eagerCount?: number;
}

/**
 * Shared product grid for /shop and category pages.
 * Card scale follows the homepage catalogue: at most 4 columns, ~232px minimum card width,
 * and a single centred column on phones.
 */
export default function ProductListingGrid({ products, eagerCount = 4 }: ProductListingGridProps) {
  return (
    <div className="marshans-listing-grid">
      {products.map((product, idx) => (
        <ProductCard
          key={product.id}
          product={product}
          imageLoading={idx < eagerCount ? 'eager' : 'lazy'}
        />
      ))}

      <style>{`
        .marshans-listing-grid {
          --listing-gap: 24px;
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(max(232px, calc((100% - 3 * var(--listing-gap)) / 4)), 1fr)
          );
          gap: var(--listing-gap);
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .marshans-listing-grid {
            --listing-gap: 16px;
          }
        }

        @media (max-width: 520px) {
          .marshans-listing-grid {
            grid-template-columns: minmax(0, 1fr);
            max-width: 360px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}
