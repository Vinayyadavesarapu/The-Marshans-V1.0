import React, { useEffect, useMemo, useState } from 'react';
import ProductCard from '../react/ProductCard';
import { getProducts, type Product } from '../../lib/api/products';

/**
 * THE MARSHANS — Homepage "Best Sellers"
 *
 * Shows only products an admin has flagged `is_best_seller` (real Store 2 data, refreshed live). No sales ranking is
 * invented: when nothing is flagged the section renders nothing, and it appears automatically once products are flagged.
 */

const MAX_ITEMS = 8;

export function pickBestSellers(products: Product[]): Product[] {
  return products.filter((p) => Boolean(p.is_best_seller)).slice(0, MAX_ITEMS);
}

export interface HomeBestSellersProps {
  initialProducts?: Product[];
}

export default function HomeBestSellers({ initialProducts = [] }: HomeBestSellersProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    let active = true;
    getProducts({ limit: 50 }).then((res) => {
      if (active && res.ok) setProducts(res.products);
    });
    return () => { active = false; };
  }, []);

  const bestSellers = useMemo(() => pickBestSellers(products), [products]);
  if (bestSellers.length === 0) return null;

  return (
    <section className="home-products-section home-best-sellers" id="home-best-sellers" aria-labelledby="home-best-sellers-title">
      <div className="container">
        <div className="home-section-head">
          <h2 id="home-best-sellers-title" className="home-catalogue-title">Best Sellers</h2>
          <a className="home-catalogue-link" href="/shop">Shop all →</a>
        </div>
        <div className="home-products-grid">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
