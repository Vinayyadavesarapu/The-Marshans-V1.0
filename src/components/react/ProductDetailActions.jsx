import React, { useState } from 'react';
import { addToCart } from '../../lib/api/cart';

export default function ProductDetailActions({ product, onColorChange }) {
  // 1. DYNAMIC COLOR SELECTION (Driven by product.colors array from API/Admin)
  const [selectedColor, setSelectedColor] = useState(
    product.colors && product.colors.length > 0 ? product.colors[0] : null
  );

  // 2. DYNAMIC SIZE SELECTION (Driven by product.sizes array from API/Admin)
  const [selectedSize, setSelectedSize] = useState(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  );

  // 3. DYNAMIC MATERIAL SELECTION (Driven by product.materials array)
  const [selectedMaterial, setSelectedMaterial] = useState(
    product.materials && product.materials.length > 0 ? product.materials[0] : null
  );

  // 4. DYNAMIC FINISHING SELECTION (Driven by product.finishing_options array)
  const [selectedFinish, setSelectedFinish] = useState(
    product.finishing_options && product.finishing_options.length > 0 ? product.finishing_options[0] : null
  );

  // 5. QUANTITY & ACTIVE STATE
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  // Handle color change and inform parent gallery if an image is mapped
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    if (onColorChange) {
      onColorChange(color);
    }
  };

  // Dynamic server-authoritative preview price calculation
  const colorModifier = selectedColor?.price_modifier || 0;
  const sizeModifier = selectedSize?.price_modifier || 0;
  const materialModifier = selectedMaterial?.price_modifier || 0;
  const finishModifier = selectedFinish?.price_modifier || 0;

  const currentPrice = Number(product.price) + colorModifier + sizeModifier + materialModifier + finishModifier;

  // Add to cart with complete selected configuration
  const handleAddToCart = (redirect = false) => {
    addToCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: currentPrice,
      quantity: quantity,
      imageUrl: selectedColor?.image_url || product.primary_image_url || product.images?.[0]?.image_url || '/assets/placeholders/product-placeholder.svg',
      categoryName: product.category_name,
      color: selectedColor?.name,
      size: selectedSize?.name,
      material: selectedMaterial?.name,
      finishing: selectedFinish?.name,
      options: {
        ...(selectedColor && { Color: selectedColor.name }),
        ...(selectedSize && { Size: selectedSize.name }),
        ...(selectedMaterial && { Material: selectedMaterial.name }),
        ...(selectedFinish && { Finish: selectedFinish.name }),
      }
    });

    if (redirect) {
      window.location.href = '/checkout';
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2400);
    }
  };

  // Check if any customisable option exists on this product
  const hasCustomOptions = Boolean(
    (product.colors && product.colors.length > 0) ||
    (product.sizes && product.sizes.length > 0) ||
    (product.materials && product.materials.length > 0) ||
    (product.finishing_options && product.finishing_options.length > 0)
  );

  return (
    <div className="product-actions-panel">
      {/* Dynamic Price Display */}
      <div className="product-price-section">
        <div className="price-tag-row">
          <span className="current-price-val">₹{currentPrice.toLocaleString('en-IN')}/-</span>
          {product.compare_at_price && Number(product.compare_at_price) > currentPrice && (
            <span className="compare-price-val">₹{Number(product.compare_at_price).toLocaleString('en-IN')}/-</span>
          )}
        </div>
      </div>

      {/* CUSTOMISE SECTION (Rendered only if product has customizable attributes) */}
      {hasCustomOptions && (
        <div className="customise-block">
          <div className="customise-header">
            <span className="customise-title">CUSTOMISE</span>
          </div>

          <div className="customise-grid">
            {/* 1. DATA-DRIVEN COLOUR SWATCHES */}
            {product.colors && product.colors.length > 0 && (
              <div className="option-field colour-field">
                <div className="field-label-row">
                  <span className="field-name">Colour</span>
                  {selectedColor && <span className="field-value-text">{selectedColor.name}</span>}
                </div>
                <div className="colour-swatches-row" role="radiogroup" aria-label="Product Colours">
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
                        onClick={() => handleColorSelect(color)}
                        className={`colour-swatch-circle ${isSelected ? 'selected' : ''}`}
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

            {/* 2. DATA-DRIVEN SIZE PILLS */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="option-field size-field">
                <div className="field-label-row">
                  <span className="field-name">Size</span>
                  {selectedSize && <span className="field-value-text">{selectedSize.name}</span>}
                </div>
                <div className="size-pills-row" role="radiogroup" aria-label="Product Sizes">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize?.name === size.name;
                    return (
                      <button
                        key={size.name}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedSize(size)}
                        className={`size-pill-btn ${isSelected ? 'selected' : ''}`}
                      >
                        {size.name}
                        {size.price_modifier && size.price_modifier > 0 ? (
                          <span className="pill-mod">+₹{size.price_modifier}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. DATA-DRIVEN MATERIAL CHIPS */}
            {product.materials && product.materials.length > 0 && (
              <div className="option-field material-field">
                <div className="field-label-row">
                  <span className="field-name">Material</span>
                  {selectedMaterial && <span className="field-value-text">{selectedMaterial.name}</span>}
                </div>
                <div className="size-pills-row" role="radiogroup" aria-label="Fabrication Materials">
                  {product.materials.map((mat) => {
                    const isSelected = selectedMaterial?.name === mat.name;
                    return (
                      <button
                        key={mat.name}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedMaterial(mat)}
                        className={`size-pill-btn ${isSelected ? 'selected' : ''}`}
                      >
                        {mat.name}
                        {mat.price_modifier && mat.price_modifier > 0 ? (
                          <span className="pill-mod">+₹{mat.price_modifier}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. DATA-DRIVEN FINISHING CHIPS */}
            {product.finishing_options && product.finishing_options.length > 0 && (
              <div className="option-field finish-field">
                <div className="field-label-row">
                  <span className="field-name">Surface Finish</span>
                  {selectedFinish && <span className="field-value-text">{selectedFinish.name}</span>}
                </div>
                <div className="size-pills-row" role="radiogroup" aria-label="Surface Finishes">
                  {product.finishing_options.map((fin) => {
                    const isSelected = selectedFinish?.name === fin.name;
                    return (
                      <button
                        key={fin.name}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedFinish(fin)}
                        className={`size-pill-btn ${isSelected ? 'selected' : ''}`}
                      >
                        {fin.name}
                        {fin.price_modifier && fin.price_modifier > 0 ? (
                          <span className="pill-mod">+₹{fin.price_modifier}</span>
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

      {/* QUANTITY STEPPER & PRIMARY ADD TO CART CTA */}
      <div className="cta-purchase-row">
        <div className="quantity-counter-box">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="qty-adjust-btn"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="qty-digit">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="qty-adjust-btn"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          className={`btn-add-to-cart-primary ${added ? 'added' : ''}`}
        >
          {added ? (
            <span className="btn-content-inner">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              ADDED TO CART
            </span>
          ) : (
            <span className="btn-content-inner">
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

      {/* BRAND ASSURANCE 4-PILLAR GRID (Matches visual reference) */}
      <div className="brand-assurance-strip">
        <div className="assurance-pillar">
          <div className="pillar-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <span className="pillar-title">Free Shipping</span>
          <span className="pillar-sub">on orders above ₹999</span>
        </div>

        <div className="assurance-pillar">
          <div className="pillar-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <span className="pillar-title">Easy Returns</span>
          <span className="pillar-sub">7-day return policy</span>
        </div>

        <div className="assurance-pillar">
          <div className="pillar-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="pillar-title">Secure Payment</span>
          <span className="pillar-sub">100% safe & secure</span>
        </div>

        <div className="assurance-pillar">
          <div className="pillar-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="pillar-title">Made for Fans</span>
          <span className="pillar-sub">Designed with love</span>
        </div>
      </div>

      {/* TABS: DESCRIPTION | SPECIFICATIONS | SHIPPING & RETURNS */}
      <div className="product-tabs-container">
        <div className="tabs-nav-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'description'}
            onClick={() => setActiveTab('description')}
            className={`tab-nav-btn ${activeTab === 'description' ? 'active' : ''}`}
          >
            DESCRIPTION
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'specifications'}
            onClick={() => setActiveTab('specifications')}
            className={`tab-nav-btn ${activeTab === 'specifications' ? 'active' : ''}`}
          >
            SPECIFICATIONS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shipping'}
            onClick={() => setActiveTab('shipping')}
            className={`tab-nav-btn ${activeTab === 'shipping' ? 'active' : ''}`}
          >
            SHIPPING & RETURNS
          </button>
        </div>

        <div className="tab-body-pane">
          {activeTab === 'description' && (
            <div className="tab-pane-content">
              <p className="editorial-desc-p">{product.description}</p>
              {/* Product Feature Highlights */}
              <div className="editorial-highlights-grid">
                <div className="feature-item">
                  <span className="feature-icon">🌱</span>
                  <div className="feature-text">
                    <strong>Eco-friendly materials</strong>
                    <span>High-grade biopolymers</span>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✨</span>
                  <div className="feature-text">
                    <strong>Warm ambient lighting</strong>
                    <span>Diffused radiance</span>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💎</span>
                  <div className="feature-text">
                    <strong>Modern minimal design</strong>
                    <span>Curated collector art</span>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎁</span>
                  <div className="feature-text">
                    <strong>Perfect for gifting</strong>
                    <span>Signature unboxing</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="tab-pane-content">
              <table className="specs-table-master">
                <tbody>
                  <tr>
                    <th>Layer Resolution</th>
                    <td>0.12mm Ultra-Fine Micro-Deposition</td>
                  </tr>
                  <tr>
                    <th>Dimensions (L × W × H)</th>
                    <td>{product.dimensions_mm || '160 × 160 × 240 mm'}</td>
                  </tr>
                  <tr>
                    <th>Net Weight</th>
                    <td>{product.weight_grams ? `${product.weight_grams} grams` : '380 grams'}</td>
                  </tr>
                  <tr>
                    <th>Infill Architecture</th>
                    <td>Gyroid 25% Structural Cohesion</td>
                  </tr>
                  <tr>
                    <th>Selected Material</th>
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
            <div className="tab-pane-content">
              <div className="shipping-policy-block">
                <h4>Complimentary Dispatch</h4>
                <p>Every piece is individually fabricated and hand-finished in our studio within 24 to 48 hours. Orders above ₹999 receive complimentary expedited shipping across India.</p>
                <h4>7-Day Defect Guarantee</h4>
                <p>Because each artifact is a custom collectible, we inspect every millimeter before departure. If your artifact arrives with any fabrication defect, we provide a 100% free immediate replacement within 7 days of delivery.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .product-actions-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Price */
        .product-price-section {
          padding-bottom: 4px;
        }

        .price-tag-row {
          display: flex;
          align-items: baseline;
          gap: 14px;
        }

        .current-price-val {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #09090b;
          line-height: 1;
        }

        .compare-price-val {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 18px;
          font-weight: 500;
          color: #a1a1aa;
          text-decoration: line-through;
        }

        /* Customise Block */
        .customise-block {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 8px;
        }

        .customise-title {
          font-family: var(--font-display, 'Bebas Neue', Impact, sans-serif);
          font-size: 22px;
          letter-spacing: 0.06em;
          color: #09090b;
        }

        .customise-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .option-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
        }

        .field-name {
          font-weight: 700;
          color: #09090b;
        }

        .field-value-text {
          font-weight: 500;
          color: #71717a;
        }

        /* Dynamic Colour Swatches (Circular) */
        .colour-swatches-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .colour-swatch-circle {
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

        .colour-swatch-circle:hover {
          transform: scale(1.12);
        }

        .colour-swatch-circle.selected {
          transform: scale(1.15);
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #09090b;
        }

        /* Dynamic Size & Option Pills */
        .size-pills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .size-pill-btn {
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

        .size-pill-btn:hover {
          background: #e4e4e7;
          color: #09090b;
        }

        .size-pill-btn.selected {
          background: #ffffff;
          border-color: #09090b;
          color: #09090b;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .pill-mod {
          font-size: 11px;
          color: #71717a;
          font-weight: 500;
        }

        /* Quantity & CTA Row */
        .cta-purchase-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 10px;
        }

        .quantity-counter-box {
          display: flex;
          align-items: center;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 9999px;
          height: 52px;
          background: #ffffff;
          padding: 0 6px;
          flex-shrink: 0;
        }

        .qty-adjust-btn {
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

        .qty-adjust-btn:hover {
          background-color: #f4f4f5;
        }

        .qty-digit {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-weight: 700;
          font-size: 15px;
          min-width: 28px;
          text-align: center;
          color: #09090b;
        }

        .btn-add-to-cart-primary {
          flex: 1;
          height: 52px;
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

        .btn-add-to-cart-primary:hover {
          background: #27272a;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .btn-add-to-cart-primary.added {
          background-color: #15803d;
        }

        .btn-content-inner {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Brand Assurance Strip (4 Pillars) */
        .brand-assurance-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 24px 0;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          margin-top: 12px;
        }

        .assurance-pillar {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
        }

        .pillar-icon {
          margin-bottom: 4px;
          color: #09090b;
        }

        .pillar-title {
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

        /* Tabs (Description, Specifications, Shipping & Returns) */
        .product-tabs-container {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
        }

        .tabs-nav-bar {
          display: flex;
          border-bottom: 1.5px solid rgba(0, 0, 0, 0.08);
          gap: 28px;
        }

        .tab-nav-btn {
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

        .tab-nav-btn:hover {
          color: #09090b;
        }

        .tab-nav-btn.active {
          color: #09090b;
        }

        .tab-nav-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1.5px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #09090b;
        }

        .tab-body-pane {
          padding-top: 18px;
        }

        .editorial-desc-p {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 14px;
          line-height: 1.7;
          color: #52525b;
          margin: 0 0 20px 0;
        }

        .editorial-highlights-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .feature-icon {
          font-size: 16px;
        }

        .feature-text {
          display: flex;
          flex-direction: column;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
        }

        .feature-text strong {
          font-size: 12px;
          color: #09090b;
          font-weight: 700;
        }

        .feature-text span {
          font-size: 11px;
          color: #71717a;
        }

        .specs-table-master {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
        }

        .specs-table-master th {
          text-align: left;
          padding: 8px 0;
          font-weight: 600;
          color: #71717a;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          width: 44%;
        }

        .specs-table-master td {
          padding: 8px 0;
          color: #09090b;
          font-weight: 600;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .shipping-policy-block h4 {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: #09090b;
          margin: 0 0 4px 0;
        }

        .shipping-policy-block p {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13px;
          line-height: 1.6;
          color: #52525b;
          margin: 0 0 14px 0;
        }

        @media (max-width: 640px) {
          .brand-assurance-strip {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .editorial-highlights-grid {
            grid-template-columns: 1fr;
          }
          .tabs-nav-bar {
            gap: 14px;
            overflow-x: auto;
          }
          .tab-nav-btn {
            font-size: 11px;
            white-space: nowrap;
          }
        }
      ` }} />
    </div>
  );
}
