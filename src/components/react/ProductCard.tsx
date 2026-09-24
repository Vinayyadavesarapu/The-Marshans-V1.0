import React, { useState } from 'react';
import { addToCart } from '../../lib/api/cart';
import type { Product } from '../../lib/api/products';
import { resolveImageUrl } from '../../lib/utils/media';

export interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  // Variant color dots
  const variantColors = [
    { name: 'Pure White', bg: '#ffffff', border: '#d4d4d8' },
    { name: 'Obsidian Grey', bg: '#52525b', border: '#52525b' },
    { name: 'Midnight Black', bg: '#09090b', border: '#09090b' }
  ];

  const [showLoginModal, setShowLoginModal] = useState(false);

  // Quick Add to Cart Handler
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding) return;

    setAdding(true);
    const res = await addToCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      quantity: 1,
      imageUrl: resolveImageUrl(product.primary_image_url || product.images?.[0]?.image_url),
      categoryName: product.category_name,
      material: product.materials?.[0]?.name || variantColors[selectedVariantIndex]?.name || 'Standard PLA+',
      finishing: product.finishing_options?.[0]?.name || 'Studio Finish'
    });

    setAdding(false);

    if (res?.requiresLogin) {
      setShowLoginModal(true);
      return;
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  // Safe Wishlist Toggle
  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted((prev) => !prev);
  };

  // Format category badge text (spaced uppercase, e.g. L U M O)
  const formatBadgeText = (catName?: string) => {
    if (!catName) return 'M A R S H A N';
    const clean = catName.split(' ')[0].toUpperCase();
    return clean.split('').join(' ');
  };

  // Format subtitle (e.g. C O L L E C T I B L E   S T A T U E)
  const formatSubtitle = () => {
    if (product.category_name?.toLowerCase().includes('lumo')) {
      return 'A M B I E N T   I L L U M I N A T I O N';
    }
    if (product.category_name?.toLowerCase().includes('fandom')) {
      return 'C O L L E C T I B L E   S T A T U E';
    }
    if (product.category_name?.toLowerCase().includes('mini')) {
      return 'P O C K E T   D I O R A M A';
    }
    if (product.category_name?.toLowerCase().includes('utility')) {
      return 'M O D U L A R   D E S K   G E A R';
    }
    if (product.category_name?.toLowerCase().includes('darshanam')) {
      return 'S A C R E D   G E O M E T R Y';
    }
    return (product.category_name || '3D PRINTED ARTIFACT')
      .toUpperCase()
      .split('')
      .join(' ');
  };

  const imageUrl = resolveImageUrl(
    product.primary_image_url || product.images?.[0]?.image_url,
    '/assets/placeholders/product-placeholder.svg'
  );

  const productHref = `/product?slug=${encodeURIComponent(product.slug || product.id)}&id=${product.id}`;

  return (
    <div className={`marshans-product-card-wrap ${className}`}>
      <a href={productHref} className="marshans-card-anchor">
        {/* TOP: Image & Status Badges */}
        <div className="marshans-image-stage">
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="marshans-product-img"
          />

          {/* Top-Left Category Badge */}
          <div className="marshans-badge-pill" aria-label={`Category: ${product.category_name}`}>
            {formatBadgeText(product.category_name)}
          </div>

          {/* Top-Right Wishlist Button */}
          <button
            type="button"
            className={`marshans-wishlist-btn ${isWishlisted ? 'is-active' : ''}`}
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isWishlisted ? '#e11d48' : 'none'}
              stroke={isWishlisted ? '#e11d48' : '#09090b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* BOTTOM: Information Panel */}
        <div className="marshans-info-panel">
          <div className="marshans-title-group">
            <h3 className="marshans-product-title">{product.name}</h3>
            <span className="marshans-product-subtitle">{formatSubtitle()}</span>
          </div>

          <div className="marshans-bottom-row">
            {/* Price & Variant Dots */}
            <div className="marshans-pricing-group">
              <div className="marshans-price-display">
                <span className="marshans-current-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="marshans-compare-price">₹{Number(product.compare_at_price).toLocaleString('en-IN')}</span>
                )}
              </div>

              {/* Variant / Color Dots */}
              <div className="marshans-variant-dots" role="radiogroup" aria-label="Available Finishes">
                {variantColors.map((color, idx) => (
                  <button
                    key={color.name}
                    type="button"
                    role="radio"
                    aria-checked={selectedVariantIndex === idx}
                    aria-label={color.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariantIndex(idx);
                    }}
                    className={`marshans-variant-dot ${selectedVariantIndex === idx ? 'is-selected' : ''}`}
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Glowing Circular Cart Button */}
            <button
              type="button"
              className={`marshans-cart-action-btn ${added ? 'is-added' : ''}`}
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
            >
              {added ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1.5" />
                  <circle cx="20" cy="21" r="1.5" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </a>

      {/* Login Required Modal */}
      {showLoginModal && (
        <div
          className="login-modal-backdrop"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowLoginModal(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="login-modal-close"
              onClick={() => setShowLoginModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="login-modal-badge">COLLECTOR ACCESS REQUIRED</div>
            <h3 className="login-modal-title">Sign In to Continue</h3>
            <p className="login-modal-desc">
              Please sign in to add collectibles to your shopping bag and proceed with priority fulfillment.
            </p>
            <div className="login-modal-actions">
              <a
                href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/product/${product.slug}`)}`}
                className="btn-modal-primary"
              >
                Login to Continue
              </a>
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowLoginModal(false)}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .marshans-product-card-wrap {
          position: relative;
          width: 100%;
          background: #ffffff;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 14px 34px -10px rgba(0, 0, 0, 0.08), 0 4px 14px -2px rgba(0, 0, 0, 0.03);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          border: none;
        }

        .marshans-product-card-wrap:hover {
          transform: translateY(-5px);
          box-shadow: 0 22px 48px -12px rgba(0, 0, 0, 0.12), 0 8px 20px -2px rgba(0, 0, 0, 0.05);
        }

        .marshans-card-anchor {
          display: flex;
          flex-direction: column;
          height: 100%;
          text-decoration: none;
          color: inherit;
        }

        /* Top Image Stage */
        .marshans-image-stage {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1.05;
          background: #f7f6f4;
          overflow: hidden;
        }

        .marshans-product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: transform 0.45s ease;
        }

        .marshans-product-card-wrap:hover .marshans-product-img {
          transform: scale(1.04);
        }

        /* Category Badge (Pill) */
        .marshans-badge-pill {
          position: absolute;
          top: 16px;
          left: 16px;
          background: #ffffff;
          padding: 8px 18px;
          border-radius: 9999px;
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #09090b;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
          z-index: 3;
          pointer-events: none;
        }

        /* Wishlist Circular Button */
        .marshans-wishlist-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
          cursor: pointer;
          z-index: 4;
          transition: transform 0.2s ease, background-color 0.2s ease;
        }

        .marshans-wishlist-btn:hover {
          transform: scale(1.08);
          background: #fcfcfc;
        }

        /* Bottom Info Panel */
        .marshans-info-panel {
          position: relative;
          background: #ffffff;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          margin-top: -14px;
          z-index: 2;
          padding: 22px 20px 22px 20px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          justify-content: space-between;
          gap: 16px;
          box-sizing: border-box;
        }

        .marshans-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .marshans-product-title {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #09090b;
          line-height: 1.25;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .marshans-product-subtitle {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #71717a;
        }

        .marshans-bottom-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
        }

        .marshans-pricing-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .marshans-price-display {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .marshans-current-price {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 23px;
          font-weight: 800;
          color: #09090b;
          letter-spacing: -0.01em;
          line-height: 1;
        }

        .marshans-compare-price {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: #a1a1aa;
          text-decoration: line-through;
        }

        /* Variant Color Dots */
        .marshans-variant-dots {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .marshans-variant-dot {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          border: 1.5px solid;
          padding: 0;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }

        .marshans-variant-dot:hover {
          transform: scale(1.15);
        }

        .marshans-variant-dot.is-selected {
          transform: scale(1.1);
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px #09090b;
        }

        /* Glowing Amber Circular Cart Button */
        .marshans-cart-action-btn {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #09090b;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          /* Warm golden/amber halo glow matching reference */
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.42), 0 0 22px 5px rgba(245, 158, 11, 0.32);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .marshans-cart-action-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 0 0 2.5px rgba(251, 191, 36, 0.6), 0 0 28px 7px rgba(245, 158, 11, 0.45);
        }

        .marshans-cart-action-btn.is-added {
          background: #15803d;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.4), 0 0 22px 5px rgba(34, 197, 94, 0.35);
          transform: scale(1.05);
        }

        @media (max-width: 480px) {
          .marshans-product-card-wrap {
            border-radius: 24px;
          }
          .marshans-badge-pill {
            top: 12px;
            left: 12px;
            padding: 6px 14px;
            font-size: 10px;
          }
          .marshans-wishlist-btn {
            top: 12px;
            right: 12px;
            width: 38px;
            height: 38px;
          }
          .marshans-info-panel {
            padding: 16px 14px 16px 14px;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
          }
          .marshans-product-title {
            font-size: 17px;
          }
          .marshans-current-price {
            font-size: 20px;
          }
          .marshans-cart-action-btn {
            width: 48px;
            height: 48px;
          }
        }

        .login-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: modalFadeIn 0.2s ease-out;
        }

        .login-modal-card {
          position: relative;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 36px 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .login-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: transparent;
          border: none;
          font-size: 16px;
          color: #71717a;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.15s ease;
        }

        .login-modal-close:hover {
          background: #f4f4f5;
          color: #09090b;
        }

        .login-modal-badge {
          display: inline-block;
          font-family: var(--font-display, "Bebas Neue", sans-serif);
          font-size: 13px;
          letter-spacing: 0.12em;
          color: #71717a;
          margin-bottom: 12px;
        }

        .login-modal-title {
          font-family: var(--font-display, "Bebas Neue", sans-serif);
          font-size: 32px;
          line-height: 1.1;
          color: #09090b;
          margin: 0 0 12px 0;
          letter-spacing: 0.02em;
        }

        .login-modal-desc {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 14px;
          line-height: 1.5;
          color: #52525b;
          margin: 0 0 24px 0;
        }

        .login-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-modal-primary {
          display: block;
          width: 100%;
          background: #09090b;
          color: #ffffff;
          padding: 14px 20px;
          border-radius: 4px;
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          text-align: center;
          transition: background-color 0.2s ease;
          box-sizing: border-box;
        }

        .btn-modal-primary:hover {
          background: #27272a;
        }

        .btn-modal-secondary {
          background: transparent;
          border: 1px solid #e4e4e7;
          color: #71717a;
          padding: 12px 20px;
          border-radius: 4px;
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-modal-secondary:hover {
          background: #f4f4f5;
          color: #09090b;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
