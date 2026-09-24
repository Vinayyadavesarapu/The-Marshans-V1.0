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
          // Live API response replaces build-time products (even when it is now empty)
          if (res.ok) {
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

      <style>{`
        .home-products-section {
          width: 100%;
          padding: 2.5rem 0 5rem;
          box-sizing: border-box;
          background-color: #faf9f7;
        }

        .home-products-section .container {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 1.5rem;
          box-sizing: border-box;
        }

        .home-products-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 1100px) {
          .home-products-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .home-products-section {
            padding: 1.5rem 0 3.5rem;
          }

          .home-products-section .container {
            padding: 0 1rem;
          }

          .home-products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .home-products-grid {
            grid-template-columns: 1fr;
            max-width: 340px;
            margin: 0 auto;
          }
        }
      `}</style>
    </section>
  );
}
