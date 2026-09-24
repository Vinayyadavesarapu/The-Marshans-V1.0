import React, { useState, useEffect } from 'react';
import { addToCart } from '../../lib/api/cart';
import type { Product, ProductColorOption, ProductSizeOption, ProductMaterial, ProductFinishingOption } from '../../lib/api/products';
import { resolveImageUrl } from '../../lib/utils/media';

export interface GalleryItem {
  id: string | number;
  image_url: string;
  is_primary?: boolean | number;
  is_video?: boolean;
  video_url?: string;
  is_360?: boolean;
  view_360_url?: string;
}

interface ProductMasterViewProps {
  product: Product;
}

export default function ProductMasterView({ product }: ProductMasterViewProps) {
  // 1. DYNAMIC COLOR SELECTION
  const [selectedColor, setSelectedColor] = useState<ProductColorOption | null>(
    product.colors && product.colors.length > 0 ? product.colors[0] : null
  );

  // 2. DYNAMIC SIZE SELECTION
  const [selectedSize, setSelectedSize] = useState<ProductSizeOption | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  );

  // 3. DYNAMIC MATERIAL SELECTION
  const [selectedMaterial, setSelectedMaterial] = useState<ProductMaterial | null>(
    product.materials && product.materials.length > 0 ? product.materials[0] : null
  );

  // 4. DYNAMIC FINISHING SELECTION
  const [selectedFinish, setSelectedFinish] = useState<ProductFinishingOption | null>(
    product.finishing_options && product.finishing_options.length > 0 ? product.finishing_options[0] : null
  );

  // 5. QUANTITY & CART FEEDBACK
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'shipping'>('description');

  // 6. GALLERY MEDIA SETUP
  const rawImages = product.images && product.images.length > 0
    ? product.images
    : [{ id: 1, image_url: resolveImageUrl(product.primary_image_url), is_primary: true }];

  const allMedia: GalleryItem[] = rawImages.map((img: any) => ({
    id: img.id,
    image_url: resolveImageUrl(typeof img === 'string' ? img : img.image_url),
    is_primary: img.is_primary,
    is_video: false
  }));

  if (product.video_url && !allMedia.some((m) => m.is_video)) {
    allMedia.push({
      id: 'product-video-main',
      image_url: resolveImageUrl(rawImages[0]?.image_url),
      is_video: true,
      video_url: product.video_url
    });
  }

  // 360° Media Item (ONLY when a valid 360 URL exists)
  const resolved360Url = product.view_360_url ? resolveImageUrl(product.view_360_url) : null;
  if (resolved360Url && !allMedia.some((m) => m.is_360)) {
    allMedia.push({
      id: 'product-360-main',
      image_url: allMedia[0]?.image_url || resolveImageUrl(product.primary_image_url),
      is_360: true,
      view_360_url: resolved360Url
    });
  }

  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // When selected color changes and has an associated image_url, switch gallery
  useEffect(() => {
    if (!selectedColor?.image_url) return;
    const matchIdx = allMedia.findIndex((m) => m.image_url === selectedColor.image_url);
    if (matchIdx > -1) {
      setSelectedMediaIdx(matchIdx);
    }
  }, [selectedColor]);

  // Fullscreen escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const activeMedia = allMedia[selectedMediaIdx] || allMedia[0] || {
    id: 'placeholder',
    image_url: '/assets/placeholders/product-placeholder.svg',
    is_video: false
  };

  // 7. DYNAMIC PRICE CALCULATION
  const colorModifier = selectedColor?.price_modifier || 0;
  const sizeModifier = selectedSize?.price_modifier || 0;
  const materialModifier = selectedMaterial?.price_modifier || 0;
  const finishModifier = selectedFinish?.price_modifier || 0;

  const currentPrice = Number(product.price) + colorModifier + sizeModifier + materialModifier + finishModifier;

  // 8. ADD TO CART
  const handleAddToCart = async () => {
    const res = await addToCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: currentPrice,
      quantity: quantity,
      imageUrl: selectedColor?.image_url || product.primary_image_url || rawImages[0]?.image_url || '/assets/placeholders/product-placeholder.svg',
      categoryName: product.category_name,
      material: selectedMaterial?.name,
      finishing: selectedFinish?.name,
      options: {
        ...(selectedColor && { Color: selectedColor.name }),
        ...(selectedSize && { Size: selectedSize.name }),
        ...(selectedMaterial && { Material: selectedMaterial.name }),
        ...(selectedFinish && { Finish: selectedFinish.name }),
      }
    });

    if (res.requiresLogin) {
      setShowLoginModal(true);
      return;
    }

    if (res.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2400);
    }
  };

  const hasCustomOptions = Boolean(
    (product.colors && product.colors.length > 0) ||
    (product.sizes && product.sizes.length > 0) ||
    (product.materials && product.materials.length > 0) ||
    (product.finishing_options && product.finishing_options.length > 0)
  );

  return (
    <div className="product-master-layout">
      {/* ========================================================
          LEFT COLUMN: CURATED PRODUCT GALLERY
          ======================================================== */}
      <div className="product-gallery-column">
        <div className="gallery-sticky-wrapper">
          <div className="marshans-master-gallery">
            {/* Vertical Thumbnail Rail */}
            {allMedia.length > 1 && (
              <div className="gallery-thumbnail-rail" role="tablist" aria-label="Product thumbnails">
                {allMedia.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={selectedMediaIdx === idx}
                    aria-label={item.is_360 ? 'View 360° interactive view' : item.is_video ? 'View video' : `View media ${idx + 1}`}
                    onClick={() => setSelectedMediaIdx(idx)}
                    className={`thumbnail-btn ${selectedMediaIdx === idx ? 'active' : ''} ${item.is_video ? 'is-video-thumb' : ''} ${item.is_360 ? 'is-360-thumb' : ''}`}
                  >
                    <img src={item.image_url} alt="" className="thumb-img" />
                    {item.is_video && (
                      <div className="video-thumb-badge" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    )}
                    {item.is_360 && (
                      <div className="video-thumb-badge is-360-badge" aria-hidden="true">
                        360°
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Main Stage */}
            <div className="gallery-primary-stage">
              {activeMedia.is_video && activeMedia.video_url ? (
                <div className="video-player-container">
                  <video
                    src={activeMedia.video_url}
                    controls
                    autoPlay
                    playsInline
                    className="gallery-active-video"
                  />
                </div>
              ) : activeMedia.is_360 && activeMedia.view_360_url ? (
                <div className="three-sixty-player-container">
                  <iframe
                    src={activeMedia.view_360_url}
                    title={`${product.name} 360 view`}
                    className="gallery-active-360"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="image-viewport-wrapper">
                  <img
                    key={activeMedia.image_url}
                    src={activeMedia.image_url}
                    alt={`${product.name} frame ${selectedMediaIdx + 1}`}
                    className="gallery-active-image"
                    loading="eager"
                  />
                </div>
              )}

              {/* Fullscreen Expand Action */}
              {!activeMedia.is_video && !activeMedia.is_360 && (
                <button
                  type="button"
                  className="stage-expand-btn"
                  onClick={() => setIsFullscreen(true)}
                  aria-label="Expand image fullscreen"
                  title="View Fullscreen"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              )}
            </div>

            {/* Interactive 360 quick button - ONLY when 360 exists */}
            {resolved360Url && (
              <div className="gallery-360-quick-action">
                <button
                  type="button"
                  className={`btn-360-quick ${activeMedia.is_360 ? 'active' : ''}`}
                  onClick={() => {
                    const idx = allMedia.findIndex(m => m.is_360);
                    if (idx !== -1) setSelectedMediaIdx(idx);
                  }}
                  aria-label="Toggle 360° interactive view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                  Interactive 360° View
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: PRODUCT DETAILS & PURCHASE SUITE
          ======================================================== */}
      <div className="product-details-column">
        {/* Bestseller Badge */}
        {product.is_best_seller && (
          <div className="product-tag-row">
            <span className="bestseller-pill">BESTSELLER</span>
          </div>
        )}

        {/* Product Title */}
        <h1 className="product-editorial-title">{product.name}</h1>

        {/* Subtitle / Short Description */}
        {product.short_description && (
          <p className="product-editorial-subtitle">{product.short_description}</p>
        )}

        {/* Price and Rating Row */}
        <div className="price-rating-row">
          <div className="price-cluster">
            <span className="price-main">₹{currentPrice.toLocaleString('en-IN')}/-</span>
            {product.compare_at_price && Number(product.compare_at_price) > currentPrice && (
              <span className="price-compare">₹{Number(product.compare_at_price).toLocaleString('en-IN')}/-</span>
            )}
          </div>

          {product.rating !== undefined && product.rating !== null && product.rating > 0 && (
            <div className="rating-cluster" aria-label={`Rated ${product.rating} out of 5 stars`}>
              <span className="stars-icons" aria-hidden="true">★★★★★</span>
              <span className="rating-text">
                <strong>{product.rating}</strong> {product.review_count ? `(${product.review_count} reviews)` : ''}
              </span>
            </div>
          )}
        </div>

        {/* CUSTOMISE SECTION (Rendered only if product has options) */}
        {hasCustomOptions && (
          <div className="customise-container">
            <h2 className="customise-header">CUSTOMISE</h2>

            <div className="customise-options-grid">
              {/* Dynamic Colour Swatches */}
              {product.colors && product.colors.length > 0 && (
                <div className="customise-field colour-field">
                  <span className="field-title">Colour</span>
                  <div className="swatches-row" role="radiogroup" aria-label="Product colour options">
                    {product.colors.map((color) => {
                      const isSelected = selectedColor?.name === color.name;
                      return (
                        <button
                          key={color.name}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={color.name}
                          title={color.name}
                          onClick={() => setSelectedColor(color)}
                          className={`swatch-circle ${isSelected ? 'selected' : ''}`}
                          style={{
                            backgroundColor: color.value,
                            borderColor: color.value.toLowerCase() === '#ffffff' || color.value.toLowerCase() === '#fff' ? '#d4d4d8' : color.value
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Size Pills */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="customise-field size-field">
                  <span className="field-title">Size</span>
                  <div className="pills-row" role="radiogroup" aria-label="Product size options">
                    {product.sizes.map((size) => {
                      const isSelected = selectedSize?.name === size.name;
                      return (
                        <button
                          key={size.name}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedSize(size)}
                          className={`pill-btn ${isSelected ? 'selected' : ''}`}
                        >
                          {size.name}
                          {size.price_modifier && size.price_modifier > 0 ? (
                            <span className="pill-price-mod">+₹{size.price_modifier}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Materials */}
              {product.materials && product.materials.length > 0 && (
                <div className="customise-field full-width-field">
                  <span className="field-title">Material</span>
                  <div className="pills-row" role="radiogroup" aria-label="Material options">
                    {product.materials.map((mat) => {
                      const isSelected = selectedMaterial?.name === mat.name;
                      return (
                        <button
                          key={mat.name}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedMaterial(mat)}
                          className={`pill-btn ${isSelected ? 'selected' : ''}`}
                        >
                          {mat.name}
                          {mat.price_modifier && mat.price_modifier > 0 ? (
                            <span className="pill-price-mod">+₹{mat.price_modifier}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Surface Finishing */}
              {product.finishing_options && product.finishing_options.length > 0 && (
                <div className="customise-field full-width-field">
                  <span className="field-title">Surface Finish</span>
                  <div className="pills-row" role="radiogroup" aria-label="Finishing options">
                    {product.finishing_options.map((fin) => {
                      const isSelected = selectedFinish?.name === fin.name;
                      return (
                        <button
                          key={fin.name}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedFinish(fin)}
                          className={`pill-btn ${isSelected ? 'selected' : ''}`}
                        >
                          {fin.name}
                          {fin.price_modifier && fin.price_modifier > 0 ? (
                            <span className="pill-price-mod">+₹{fin.price_modifier}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Purchase Action Row: Quantity + ADD TO CART */}
        <div className="purchase-action-row">
          <div className="stepper-box">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="stepper-btn"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="stepper-val">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="stepper-btn"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`btn-add-to-cart ${added ? 'is-added' : ''}`}
          >
            {added ? (
              <span className="btn-inner">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                ADDED TO CART
              </span>
            ) : (
              <span className="btn-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                ADD TO CART
              </span>
            )}
          </button>
        </div>

        {/* 4-Pillar Assurance Strip */}
        <div className="assurance-strip">
          <div className="assurance-pillar">
            <div className="pillar-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <span className="pillar-head">Free Shipping</span>
            <span className="pillar-sub">on orders above ₹999</span>
          </div>

          <div className="assurance-pillar">
            <div className="pillar-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </div>
            <span className="pillar-head">Easy Returns</span>
            <span className="pillar-sub">7-day return policy</span>
          </div>

          <div className="assurance-pillar">
            <div className="pillar-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="pillar-head">Secure Payment</span>
            <span className="pillar-sub">100% safe & secure</span>
          </div>

          <div className="assurance-pillar">
            <div className="pillar-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="pillar-head">Made for Fans</span>
            <span className="pillar-sub">Designed with love</span>
          </div>
        </div>

        {/* Tabbed Editorial Narrative, Specifications, and Shipping */}
        <div className="tabs-suite">
          <div className="tabs-nav" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'description'}
              onClick={() => setActiveTab('description')}
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            >
              DESCRIPTION
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'specifications'}
              onClick={() => setActiveTab('specifications')}
              className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            >
              SPECIFICATIONS
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'shipping'}
              onClick={() => setActiveTab('shipping')}
              className={`tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
            >
              SHIPPING & RETURNS
            </button>
          </div>

          <div className="tab-pane">
            {activeTab === 'description' && (
              <div className="pane-description">
                {product.description && product.description.trim() ? (
                  product.description.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i} className="description-p">{para}</p>
                  ))
                ) : (
                  <p className="description-p empty-description">No detailed description provided for this piece.</p>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="pane-specs">
                <table className="specs-table">
                  <tbody>
                    <tr>
                      <th>Layer Resolution</th>
                      <td>0.12mm Ultra-Fine Micro-Deposition</td>
                    </tr>
                    <tr>
                      <th>Dimensions (L × W × H)</th>
                      <td>{selectedSize?.dimensions || product.dimensions_mm || '160 × 160 × 240 mm'}</td>
                    </tr>
                    <tr>
                      <th>Net Weight</th>
                      <td>{product.weight_grams ? `${product.weight_grams} grams` : '380 grams'}</td>
                    </tr>
                    <tr>
                      <th>Infill Geometry</th>
                      <td>Gyroid 25% Cohesion Architecture</td>
                    </tr>
                    <tr>
                      <th>Fabrication Material</th>
                      <td>{selectedMaterial?.name || 'High-Grade Precision Biopolymer'}</td>
                    </tr>
                    <tr>
                      <th>Surface Finish</th>
                      <td>{selectedFinish?.name || 'Studio Hand-Finished Satin'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="pane-shipping">
                <h4>Complimentary Dispatch</h4>
                <p>Every piece is individually fabricated and hand-finished in our studio within 24 to 48 hours. Orders above ₹999 receive complimentary expedited shipping across India.</p>
                <h4>7-Day Defect Guarantee</h4>
                <p>Because each artifact is a custom collectible, we inspect every millimeter before departure. If your artifact arrives with any fabrication defect, we provide a 100% free immediate replacement within 7 days of delivery.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      {isFullscreen && (
        <div
          className="fullscreen-backdrop"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close fullscreen"
          >
            ✕
          </button>
          <div className="lightbox-image-box" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeMedia.image_url}
              alt={product.name}
              className="lightbox-img"
            />
          </div>
        </div>
      )}

      {/* Login Required Modal */}
      {showLoginModal && (
        <div
          className="login-modal-backdrop"
          onClick={() => setShowLoginModal(false)}
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

      <style dangerouslySetInnerHTML={{ __html: `
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
          animation: fadeIn 0.2s ease-out;
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
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
          background: #f4f4f5;
          padding: 4px 10px;
          border-radius: 4px;
          margin-bottom: 14px;
        }

        .login-modal-title {
          font-family: var(--font-display, "Bebas Neue", sans-serif);
          font-size: 26px;
          letter-spacing: 0.04em;
          color: #09090b;
          margin: 0 0 10px;
          text-transform: uppercase;
        }

        .login-modal-desc {
          font-size: 14px;
          color: #52525b;
          line-height: 1.5;
          margin: 0 0 24px;
        }

        .login-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-modal-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #09090b;
          color: #ffffff;
          padding: 14px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: background-color 0.15s ease;
        }

        .btn-modal-primary:hover {
          background: #27272a;
        }

        .btn-modal-secondary {
          background: transparent;
          border: 1px solid #e4e4e7;
          color: #52525b;
          padding: 12px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-modal-secondary:hover {
          background: #f4f4f5;
          color: #09090b;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .product-master-layout {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 56px;
          align-items: start;
          width: 100%;
          box-sizing: border-box;
        }

        /* Gallery Column */
        .product-gallery-column {
          width: 100%;
          box-sizing: border-box;
        }

        .gallery-sticky-wrapper {
          position: sticky;
          top: 96px;
          width: 100%;
        }

        .marshans-master-gallery {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
          user-select: none;
        }

        .gallery-thumbnail-rail {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
          max-height: 580px;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .gallery-thumbnail-rail::-webkit-scrollbar {
          display: none;
        }

        .thumbnail-btn {
          position: relative;
          width: 70px;
          height: 70px;
          border-radius: 12px;
          background: #f7f6f4;
          border: 1.5px solid transparent;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        .thumbnail-btn:hover {
          border-color: rgba(9, 9, 11, 0.3);
          transform: translateY(-1px);
        }

        .thumbnail-btn.active {
          border-color: #09090b;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .video-thumb-badge {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.45);
          border-radius: 10px;
        }

        .gallery-primary-stage {
          position: relative;
          flex: 1;
          aspect-ratio: 1 / 1.05;
          background: #f7f6f4;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
        }

        .image-viewport-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gallery-active-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .gallery-primary-stage:hover .gallery-active-image {
          transform: scale(1.03);
        }

        .video-player-container {
          width: 100%;
          height: 100%;
          background: #000000;
        }

        .gallery-active-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .is-360-badge {
          background: rgba(9, 9, 11, 0.7);
          color: #ffffff;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .three-sixty-player-container {
          width: 100%;
          height: 100%;
          background: #ffffff;
        }

        .gallery-active-360 {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .gallery-360-quick-action {
          margin-top: 14px;
          display: flex;
          justify-content: center;
        }

        .btn-360-quick {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #ffffff;
          color: #09090b;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-360-quick:hover {
          background: #f4f4f5;
          border-color: #09090b;
        }

        .btn-360-quick.active {
          background: #09090b;
          color: #ffffff;
          border-color: #09090b;
        }

        .empty-description {
          font-style: italic;
          opacity: 0.7;
        }

        .stage-expand-btn {
          position: absolute;
          bottom: 18px;
          right: 18px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #09090b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
          z-index: 2;
        }

        .stage-expand-btn:hover {
          background: #ffffff;
          transform: scale(1.08);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
        }

        /* Right Column */
        .product-details-column {
          display: flex;
          flex-direction: column;
          width: 100%;
          box-sizing: border-box;
        }

        .product-tag-row {
          margin-bottom: 8px;
        }

        .bestseller-pill {
          display: inline-block;
          background-color: #ffe4e6;
          color: #e11d48;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 9999px;
        }

        .product-editorial-title {
          font-family: var(--font-display, 'Bebas Neue', Impact, sans-serif);
          font-size: clamp(38px, 4.2vw, 56px);
          letter-spacing: 0.03em;
          color: #09090b;
          line-height: 1;
          margin: 0 0 10px 0;
          text-transform: uppercase;
        }

        .product-editorial-subtitle {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 14.5px;
          line-height: 1.6;
          color: #52525b;
          margin: 0 0 18px 0;
          max-width: 540px;
        }

        /* Price and Rating Row */
        .price-rating-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .price-cluster {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .price-main {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #09090b;
          line-height: 1;
        }

        .price-compare {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 17px;
          font-weight: 500;
          color: #a1a1aa;
          text-decoration: line-through;
        }

        .rating-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
        }

        .stars-icons {
          color: #f59e0b;
          letter-spacing: 2px;
          font-size: 15px;
        }

        .rating-text {
          color: #52525b;
        }

        .rating-text strong {
          color: #09090b;
        }

        /* Customise Block */
        .customise-container {
          margin-bottom: 22px;
        }

        .customise-header {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #09090b;
          margin: 0 0 14px 0;
        }

        .customise-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 24px;
        }

        .customise-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .full-width-field {
          grid-column: 1 / -1;
        }

        .field-title {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 600;
          color: #3f3f46;
        }

        /* Circular Swatches */
        .swatches-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .swatch-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          outline: none;
          padding: 0;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .swatch-circle:hover {
          transform: scale(1.1);
        }

        .swatch-circle.selected {
          transform: scale(1.15);
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #09090b;
        }

        /* Pills Row */
        .pills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 18px;
          border-radius: 9999px;
          background: #f4f4f5;
          border: 1.5px solid transparent;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12.5px;
          font-weight: 600;
          color: #3f3f46;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pill-btn:hover {
          background: #e4e4e7;
          color: #09090b;
        }

        .pill-btn.selected {
          background: #ffffff;
          border-color: #09090b;
          color: #09090b;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .pill-price-mod {
          font-size: 11px;
          color: #71717a;
          font-weight: 500;
        }

        /* Purchase Action Row */
        .purchase-action-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .stepper-box {
          display: flex;
          align-items: center;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 9999px;
          height: 50px;
          background: #ffffff;
          padding: 0 6px;
          flex-shrink: 0;
        }

        .stepper-btn {
          background: none;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          font-weight: 600;
          color: #18181b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s ease;
        }

        .stepper-btn:hover {
          background-color: #f4f4f5;
        }

        .stepper-val {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-weight: 700;
          font-size: 15px;
          min-width: 28px;
          text-align: center;
          color: #09090b;
        }

        .btn-add-to-cart {
          flex: 1;
          height: 50px;
          border-radius: 9999px;
          background: #09090b;
          color: #ffffff;
          border: none;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        .btn-add-to-cart:hover {
          background: #27272a;
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .btn-add-to-cart.is-added {
          background-color: #15803d;
        }

        .btn-inner {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* 4-Pillar Assurance Strip */
        .assurance-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          padding: 20px 0;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 24px;
        }

        .assurance-pillar {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 3px;
          padding: 0 8px;
          border-right: 1px solid rgba(0, 0, 0, 0.06);
        }

        .assurance-pillar:last-child {
          border-right: none;
        }

        .pillar-icon {
          margin-bottom: 4px;
        }

        .pillar-head {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -0.01em;
        }

        .pillar-sub {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 10px;
          color: #71717a;
          line-height: 1.3;
        }

        /* Tabs Suite */
        .tabs-suite {
          display: flex;
          flex-direction: column;
        }

        .tabs-nav {
          display: flex;
          border-bottom: 1.5px solid rgba(0, 0, 0, 0.08);
          gap: 28px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 12px 0;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #71717a;
          cursor: pointer;
          position: relative;
          transition: color 0.15s ease;
        }

        .tab-btn:hover {
          color: #09090b;
        }

        .tab-btn.active {
          color: #09090b;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1.5px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #09090b;
        }

        .tab-pane {
          padding-top: 18px;
        }

        .description-p {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 14px;
          line-height: 1.7;
          color: #52525b;
          margin: 0 0 22px 0;
        }

        .specs-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
        }

        .specs-table th {
          text-align: left;
          padding: 8px 0;
          font-weight: 600;
          color: #71717a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          width: 44%;
        }

        .specs-table td {
          padding: 8px 0;
          color: #09090b;
          font-weight: 600;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .pane-shipping h4 {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
          margin: 0 0 4px 0;
        }

        .pane-shipping p {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          line-height: 1.6;
          color: #52525b;
          margin: 0 0 14px 0;
        }

        /* Lightbox */
        .fullscreen-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(9, 9, 11, 0.88);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          animation: fadeIn 0.2s ease;
        }

        .lightbox-close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .lightbox-image-box {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .product-master-layout {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .gallery-sticky-wrapper {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .marshans-master-gallery {
            flex-direction: column-reverse;
            gap: 14px;
          }

          .gallery-thumbnail-rail {
            flex-direction: row;
            width: 100%;
            overflow-x: auto;
            max-height: none;
            padding-bottom: 4px;
          }

          .thumbnail-btn {
            width: 60px;
            height: 60px;
            border-radius: 10px;
          }

          .gallery-primary-stage {
            border-radius: 18px;
            aspect-ratio: 1 / 1;
          }

          .customise-options-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .assurance-strip {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .assurance-pillar:nth-child(2) {
            border-right: none;
          }

          .tabs-nav {
            gap: 16px;
            overflow-x: auto;
          }

          .tab-btn {
            font-size: 11px;
            white-space: nowrap;
          }
        }
      ` }} />
    </div>
  );
}
