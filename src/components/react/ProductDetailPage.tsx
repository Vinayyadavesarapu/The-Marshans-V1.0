import React, { useState, useEffect } from 'react';
import ProductMasterView from './ProductMasterView';
import ProductCard from './ProductCard';
import { getProductByIdOrSlug, getProducts, type Product } from '../../lib/api/products';

export interface ProductDetailPageProps {
  initialProduct?: Product | null;
}

export default function ProductDetailPage({ initialProduct = null }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [loading, setLoading] = useState<boolean>(!initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      // Determine the requested slug or id from URL
      let targetParam: string | null = null;

      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        targetParam = searchParams.get('id') || searchParams.get('slug');

        if (!targetParam) {
          // Extract from pathname e.g. /product/my-slug
          const match = window.location.pathname.match(/\/product\/([^/?#]+)/);
          if (match && match[1] && match[1] !== 'index.html') {
            targetParam = decodeURIComponent(match[1]);
          }
        }
      }

      // If initial product already matches or is provided, fetch related and return
      if (initialProduct && (!targetParam || targetParam === initialProduct.slug || targetParam === String(initialProduct.id))) {
        setProduct(initialProduct);
        setLoading(false);
        loadRelated(initialProduct);

        // Refresh build-time product with live Store 2 data (id/price/images may have changed since build)
        getProductByIdOrSlug(initialProduct.slug || initialProduct.id)
          .then((live) => {
            if (isMounted && live) setProduct(live);
          })
          .catch(() => {});
        return;
      }

      if (!targetParam) {
        if (initialProduct) {
          setProduct(initialProduct);
          loadRelated(initialProduct);
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resolved = await getProductByIdOrSlug(targetParam);
        if (isMounted) {
          if (resolved) {
            setProduct(resolved);
            // Sync browser URL to clean slug if on query parameter
            if (typeof window !== 'undefined' && resolved.slug && window.location.search.includes('slug=')) {
              window.history.replaceState({}, '', `/product/${resolved.slug}`);
            }
            loadRelated(resolved);
          } else {
            setProduct(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function loadRelated(currProduct: Product) {
      try {
        const res = await getProducts({ limit: 20 });
        if (isMounted && res && Array.isArray(res.products)) {
          const filtered = res.products
            .filter((p) => p.id !== currProduct.id && p.category_slug === currProduct.category_slug)
            .slice(0, 4);
          setRelatedProducts(filtered);
        }
      } catch (e) {
        // non-blocking
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [initialProduct]);

  if (loading) {
    return (
      <div className="product-page-root" style={{ minHeight: '70vh', padding: '60px 1.5rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', width: 36, height: 36, border: '3px solid #e4e4e7', borderTopColor: '#09090b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
          <p style={{ fontFamily: 'var(--font-sans, sans-serif)', color: '#71717a', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Loading Artifact Coordinates...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-page-root" style={{ minHeight: '60vh', padding: '96px 1.5rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 640, margin: '0 auto' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🪐</span>
          <h1 style={{ fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)', fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.05em', color: '#09090b', margin: '0 0 12px 0' }}>
            ARTIFACT NOT FOUND
          </h1>
          <p style={{ fontFamily: 'var(--font-sans, sans-serif)', fontSize: 15, color: '#71717a', lineHeight: 1.6, marginBottom: 32 }}>
            The requested 3D printed artifact could not be located in The Marshans catalog or may have been rotated into the archives.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/shop"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                padding: '0 28px',
                background: '#09090b',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.05em',
                borderRadius: 4,
                textTransform: 'uppercase'
              }}
            >
              Explore Full Catalog
            </a>
            <a
              href="/#home-carousel-section"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                padding: '0 28px',
                background: 'transparent',
                color: '#09090b',
                border: '1px solid #e4e4e7',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.05em',
                borderRadius: 4,
                textTransform: 'uppercase'
              }}
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page-root">
      {/* Breadcrumbs Navigation */}
      <div className="container breadcrumbs-container">
        <nav className="breadcrumbs-nav" aria-label="Breadcrumbs">
          <a href="/#home-carousel-section">Home</a>
          <span className="breadcrumb-sep">&gt;</span>
          <a href={`/categories/${product.category_slug}`}>{product.category_name}</a>
          <span className="breadcrumb-sep">&gt;</span>
          <span className="breadcrumb-current">{product.name}</span>
        </nav>
      </div>

      {/* Master Editorial Product Experience */}
      <div className="container product-main-container">
        <ProductMasterView product={product} />
      </div>

      {/* Companion Artifacts Section */}
      {relatedProducts.length > 0 && (
        <section className="companion-artifacts-section" aria-label="Related Artifacts">
          <div className="container">
            <div className="companion-header">
              <span className="companion-eyebrow">CURATED EXPLORATION</span>
              <h2 className="companion-title">COMPANION ARTIFACTS</h2>
            </div>
            <div className="companion-grid">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id || rel.slug} product={rel} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
