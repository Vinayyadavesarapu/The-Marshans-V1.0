import React, { useEffect, useMemo, useState } from 'react';
import ProductCard from '../react/ProductCard';
import { getProducts, type Product } from '../../lib/api/products';

/**
 * THE MARSHANS — Homepage "Best Sellers"
 *
 * Shows only products an admin has flagged `is_best_seller` (real Store 2 data, refreshed live).
 * In local preview / development, when no real products are flagged yet, clearly temporary placeholder
 * cards demonstrate the approved existing Best Sellers layout without inserting mock data into the database or API.
 * When real Best Sellers are selected through Admin later, those products display automatically instead.
 */

const MAX_ITEMS = 8;

export function pickBestSellers(products: Product[]): Product[] {
  return products.filter((p) => Boolean(p.is_best_seller)).slice(0, MAX_ITEMS);
}

// Fallback preview cards demonstrating the approved Best Sellers card design
const FALLBACK_PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: 99001,
    name: 'Custom Miniature Portrait Bust',
    slug: 'custom-miniature-portrait-bust',
    category_name: 'Mini Tales',
    price: 4500,
    compare_at_price: 5200,
    primary_image_url: 'https://api.chipakk.shop/uploads/bust-sample.webp',
    is_best_seller: true,
  } as Product,
  {
    id: 99002,
    name: 'Ayodhya Grand Temple',
    slug: 'ayodhya-grand-temple',
    category_name: 'Darshanam',
    price: 6000,
    compare_at_price: 7000,
    primary_image_url: 'https://api.chipakk.shop/uploads/ayodhya-temple.webp',
    is_best_seller: true,
  } as Product,
  {
    id: 99003,
    name: 'Marshans Spiralnest Lamp',
    slug: 'marshans-spiralnest-lamp',
    category_name: 'LUMO',
    price: 2500,
    compare_at_price: 3500,
    primary_image_url: 'https://api.chipakk.shop/uploads/spiralnest-lamp.webp',
    is_best_seller: true,
  } as Product,
  {
    id: 99004,
    name: 'Bloomwave Lamp',
    slug: 'bloomwave-lamp',
    category_name: 'LUMO',
    price: 1500,
    compare_at_price: 2000,
    primary_image_url: 'https://api.chipakk.shop/uploads/bloomwave-lamp.webp',
    is_best_seller: true,
  } as Product,
];

export interface HomeBestSellersProps {
  initialProducts?: Product[];
}

export default function HomeBestSellers({ initialProducts = [] }: HomeBestSellersProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    let active = true;
    getProducts({ limit: 50 }).then((res) => {
      if (active && res.ok && Array.isArray(res.products)) {
        setProducts(res.products);
      }
    });
    return () => { active = false; };
  }, []);

  const realBestSellers = useMemo(() => pickBestSellers(products), [products]);

  // When real best sellers are flagged in Admin, show them.
  // When none are flagged yet, use temporary placeholder cards to preview the approved layout.
  const hasRealBestSellers = realBestSellers.length > 0;
  const displayItems = useMemo(() => {
    if (hasRealBestSellers) {
      return realBestSellers;
    }
    if (initialProducts && initialProducts.length >= 4) {
      return initialProducts.slice(0, 4);
    }
    return FALLBACK_PLACEHOLDER_PRODUCTS;
  }, [hasRealBestSellers, realBestSellers, initialProducts]);

  return (
    <section className="home-products-section home-best-sellers" id="home-best-sellers" aria-labelledby="home-best-sellers-title">
      <div className="container">
        <div className="home-section-head">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <h2 id="home-best-sellers-title" className="home-catalogue-title">Best Sellers</h2>
            {!hasRealBestSellers && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(31, 28, 24, 0.08)',
                  color: '#6b645b',
                }}
              >
                Preview
              </span>
            )}
          </div>
          <a className="home-catalogue-link" href="/shop">Shop all →</a>
        </div>
        <div className="home-products-grid">
          {displayItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
