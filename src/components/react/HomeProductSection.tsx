import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { getProducts, type Product } from '../../lib/api/products';

export interface HomeProductSectionProps {
  initialProducts?: Product[];
}

export default function HomeProductSection({ initialProducts = [] }: HomeProductSectionProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);

  useEffect(() => {
    let isMounted = true;
    getProducts({ limit: 12 })
      .then((res) => {
        if (isMounted && res && Array.isArray(res.products)) {
          // If live products are returned, update products list
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
  }, []);

  if (products.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="home-products-section" id="product-cards" aria-label="Product Cards Collection">
      <div className="container">
        <div className="home-products-grid">
          {products.map((product) => (
            <ProductCard key={product.id || product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
