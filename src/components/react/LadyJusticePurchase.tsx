import React, { useState, useEffect } from 'react';
import {
  LADY_JUSTICE_VARIANTS,
  type CustomForgeSizeVariant,
  validateCustomForgeCustomization
} from '../../lib/api/customForge';
import { addCustomForgeToCart, type CartItem } from '../../lib/api/cart';

export default function LadyJusticePurchase() {
  const [selectedVariant, setSelectedVariant] = useState<CustomForgeSizeVariant>(LADY_JUSTICE_VARIANTS[1]); // Default to 1 foot
  const [customModeEnabled, setCustomModeEnabled] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customDesignation, setCustomDesignation] = useState<string>('');
  const [nameplateMaterial, setNameplateMaterial] = useState<'Plastic' | 'MDF'>('Plastic');
  const [quantity, setQuantity] = useState<number>(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showAddedConfirmation, setShowAddedConfirmation] = useState<boolean>(false);

  // Synchronize initial variant with the master product gallery on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('marshans:cf-variant-changed', {
        detail: { variantId: selectedVariant.id, sizeLabel: selectedVariant.sizeLabel }
      }));
    }
  }, []);

  // Switch variant & synchronize product gallery immediately
  const handleVariantSelect = (v: CustomForgeSizeVariant) => {
    setSelectedVariant(v);
    if (!v.customModeAllowed) {
      setCustomModeEnabled(false);
    }
    setValidationErrors({});
    setShowAddedConfirmation(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('marshans:cf-variant-changed', {
        detail: { variantId: v.id, sizeLabel: v.sizeLabel }
      }));
    }
  };

  // Toggle Custom Mode
  const handleCustomModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked && !selectedVariant.customModeAllowed) {
      return;
    }
    setCustomModeEnabled(checked);
    setValidationErrors({});
    setShowAddedConfirmation(false);
  };

  // Handle Add to Cart
  const handleAddToCart = async () => {
    const val = validateCustomForgeCustomization(selectedVariant, customModeEnabled, {
      name: customName,
      designation: customDesignation,
      material: nameplateMaterial
    });

    if (!val.valid) {
      setValidationErrors(val.errors);
      return;
    }

    setValidationErrors({});

    const variantImageUrl = selectedVariant.id === 'cf-lj-6in'
      ? '/assets/products/custom-forge/6 inches front.png'
      : '/assets/products/custom-forge/name plate front.png';

    const cartItem: CartItem = {
      id: `cf-lady-justice-${selectedVariant.id}-${Date.now()}`,
      productId: selectedVariant.backendVariantId,
      name: `Lady Justice Statue (${selectedVariant.sizeLabel})`,
      slug: 'lady-justice',
      sku: selectedVariant.sku,
      price: selectedVariant.price,
      quantity,
      imageUrl: variantImageUrl,
      categoryName: 'Custom Forge',
      material: customModeEnabled ? nameplateMaterial : 'Standard',
      options: {
        is_custom_forge: true,
        variant_id: selectedVariant.backendVariantId,
        variant_key: selectedVariant.id,
        size_label: selectedVariant.sizeLabel,
        size_inches: selectedVariant.sizeInches,
        height_mm: selectedVariant.heightMm,
        custom_mode_enabled: customModeEnabled,
        custom_name: customModeEnabled ? customName.trim() : null,
        custom_designation: customModeEnabled ? (customDesignation.trim() || 'NIL') : null,
        nameplate_material: customModeEnabled ? nameplateMaterial : null
      }
    };

    await addCustomForgeToCart(cartItem);
    setShowAddedConfirmation(true);
  };

  const totalPrice = selectedVariant.price * quantity;

  return (
    <div className="lady-purchase-root">
      {/* =========================================================================
          SUCCESS CONFIRMATION BANNER / MODAL (POST ADD TO CART)
         ========================================================================= */}
      {showAddedConfirmation && (
        <div className="add-cart-toast-banner" role="status" aria-live="polite">
          <div className="toast-content-row">
            <div className="toast-check-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="toast-text-wrap">
              <strong className="toast-title">Added to Your Shopping Bag</strong>
              <p className="toast-sub">
                Lady Justice ({selectedVariant.sizeLabel}) {customModeEnabled ? '• Custom Nameplate' : ''} × {quantity}
              </p>
            </div>
          </div>

          <div className="toast-actions-row">
            <a href="/cart" className="toast-view-cart-btn">
              View Bag & Checkout →
            </a>
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={() => setShowAddedConfirmation(false)}
            >
              Continue Exploring
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDITION / SIZE SELECTOR CHIPS
         ========================================================================= */}
      <div className="purchase-section">
        <div className="section-label-row">
          <label className="section-title">Select Edition</label>
          <span className="selected-size-label">{selectedVariant.sizeLabel} ({selectedVariant.heightMm}mm)</span>
        </div>

        <div className="lady-variant-chips-grid" role="radiogroup" aria-label="Statue Size Selection">
          {LADY_JUSTICE_VARIANTS.map((variant) => {
            const isSelected = selectedVariant.id === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleVariantSelect(variant)}
                className={`lady-variant-chip ${isSelected ? 'selected' : ''}`}
              >
                <div className="chip-top-row">
                  <strong className="chip-name">{variant.sizeLabel}</strong>
                  {variant.isPopular && <span className="chip-badge">Most Popular</span>}
                </div>
                <div className="chip-meta-row">
                  <span className="chip-dimensions">{variant.heightMm} mm tall</span>
                  <span className="chip-price">₹{variant.price.toLocaleString('en-IN')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          CUSTOM MODE (BESPOKE NAMEPLATE)
         ========================================================================= */}
      <div className="purchase-section custom-mode-container">
        <div className="custom-toggle-card">
          <div className="custom-toggle-info">
            <div className="toggle-heading-row">
              <strong className="toggle-title">Personalized Nameplate</strong>
              {selectedVariant.customModeAllowed ? (
                <span className="toggle-free-tag">Complimentary</span>
              ) : (
                <span className="toggle-disabled-tag">1ft & 2ft Editions Only</span>
              )}
            </div>
            <p className="toggle-desc">
              {selectedVariant.customModeAllowed
                ? 'Mount a bespoke engraved title plinth onto the lotus base.'
                : 'Customization is unavailable for the 6-inch edition due to plinth surface scale.'}
            </p>
          </div>

          <label className={`custom-switch ${!selectedVariant.customModeAllowed ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={customModeEnabled}
              disabled={!selectedVariant.customModeAllowed}
              onChange={handleCustomModeToggle}
              aria-label="Enable bespoke nameplate customization"
            />
            <span className="switch-slider" />
          </label>
        </div>

        {/* CUSTOMIZATION INPUT FORM */}
        {customModeEnabled && selectedVariant.customModeAllowed && (
          <div className="custom-fields-panel" role="region" aria-label="Bespoke Nameplate Inputs">
            <div className="custom-form-intro">
              <span className="form-intro-tag">EMBOSSED SPECIFICATIONS</span>
              <p className="form-intro-desc">Enter the details exactly as you wish them mounted on the lotus pedestal.</p>
            </div>

            {/* Field 1: Name */}
            <div className="input-group">
              <div className="label-with-counter">
                <label htmlFor="custom-name" className="field-label">Name on Nameplate <span className="req">*</span></label>
                <span className="char-count">{customName.length} / 35</span>
              </div>
              <input
                id="custom-name"
                type="text"
                maxLength={35}
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Adv. Rajesh Sharma"
                className={`field-input ${validationErrors.name ? 'has-error' : ''}`}
              />
              {validationErrors.name && (
                <p className="field-error-msg" role="alert">{validationErrors.name}</p>
              )}
            </div>

            {/* Field 2: Designation */}
            <div className="input-group">
              <div className="label-with-counter">
                <label htmlFor="custom-designation" className="field-label">Designation / Title (Optional)</label>
                <span className="char-count">{customDesignation.length} / 50</span>
              </div>
              <input
                id="custom-designation"
                type="text"
                maxLength={50}
                value={customDesignation}
                onChange={(e) => {
                  setCustomDesignation(e.target.value);
                  if (validationErrors.designation) setValidationErrors(prev => ({ ...prev, designation: '' }));
                }}
                placeholder="e.g. Senior Advocate, High Court (or NIL)"
                className={`field-input ${validationErrors.designation ? 'has-error' : ''}`}
              />
              <span className="field-hint">Leave blank or enter 'NIL' if only your name should appear.</span>
              {validationErrors.designation && (
                <p className="field-error-msg" role="alert">{validationErrors.designation}</p>
              )}
            </div>

            {/* Field 3: Material */}
            <div className="input-group">
              <label className="field-label">Nameplate Material</label>
              <div className="material-toggle-row">
                <button
                  type="button"
                  className={`material-choice-btn ${nameplateMaterial === 'Plastic' ? 'active' : ''}`}
                  onClick={() => setNameplateMaterial('Plastic')}
                >
                  <span className="material-btn-title">Precision Polymer</span>
                  <span className="material-btn-sub">Smooth matte monochrome matching statue</span>
                </button>
                <button
                  type="button"
                  className={`material-choice-btn ${nameplateMaterial === 'MDF' ? 'active' : ''}`}
                  onClick={() => setNameplateMaterial('MDF')}
                >
                  <span className="material-btn-title">Organic Wood / MDF</span>
                  <span className="material-btn-sub">Warm natural grain contrast</span>
                </button>
              </div>
            </div>

            {/* Live Visual Preview Card */}
            <div className="nameplate-live-preview">
              <span className="preview-label">MOUNTED PLINTH PREVIEW</span>
              <div className={`preview-plate ${nameplateMaterial === 'MDF' ? 'mdf-texture' : 'polymer-texture'}`}>
                <div className="plate-inner-border">
                  <span className="preview-name">{customName || 'YOUR FULL NAME'}</span>
                  <span className="preview-desig">
                    {customDesignation && customDesignation.toUpperCase() !== 'NIL'
                      ? customDesignation
                      : (customDesignation.toUpperCase() === 'NIL' ? '' : 'DESIGNATION / CHAMBER / COURT')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          QUANTITY & PRICING SUMMARY
         ========================================================================= */}
      <div className="purchase-section quantity-price-row">
        <div className="qty-picker-wrap">
          <label className="qty-label" htmlFor="qty-select">Quantity</label>
          <div className="qty-stepper">
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="qty-value">{quantity}</span>
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQuantity(q => Math.min(10, q + 1))}
              disabled={quantity >= 10}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className="price-display-wrap">
          <span className="price-label">Payable Total</span>
          <div className="price-value-row">
            <span className="price-currency">₹</span>
            <strong className="price-amount">{totalPrice.toLocaleString('en-IN')}</strong>
          </div>
          <span className="price-tax-note">All taxes included • Standard Air Delivery</span>
        </div>
      </div>

      {/* =========================================================================
          ADD TO CART CTA BUTTON
         ========================================================================= */}
      <div className="purchase-actions-container">
        <button
          type="button"
          onClick={handleAddToCart}
          className="lady-order-btn add-to-cart-primary-btn"
          aria-label="Add configured Lady Justice to shopping bag"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span>Add to Shopping Bag (₹{totalPrice.toLocaleString('en-IN')})</span>
        </button>
      </div>

      {/* Reassurance Trust Footnote */}
      <div className="lady-guarantee-row">
        <div className="guarantee-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2f6b45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>256-Bit SSL Encrypted Checkout</span>
        </div>
        <div className="guarantee-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2f6b45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <span>Reinforced Archival Packaging</span>
        </div>
      </div>

      <style>{`
        .lady-purchase-root {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
        }

        .purchase-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .section-label-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .section-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #14251a;
        }

        .selected-size-label {
          font-size: 13px;
          font-weight: 600;
          color: #52525b;
        }

        /* Variant Chips */
        .lady-variant-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .lady-variant-chip {
          background: #ffffff;
          border: 1.5px solid rgba(20, 37, 26, 0.12);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .lady-variant-chip:hover {
          border-color: #2f6b45;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20, 37, 26, 0.06);
        }

        .lady-variant-chip.selected {
          border-color: #14251a;
          background: #14251a;
          color: #ffffff;
          box-shadow: 0 6px 18px rgba(20, 37, 26, 0.16);
        }

        .chip-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .chip-name {
          font-size: 15px;
          font-weight: 800;
        }

        .chip-badge {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: #2f6b45;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .lady-variant-chip.selected .chip-badge {
          background: #ffffff;
          color: #14251a;
        }

        .chip-meta-row {
          display: flex;
          justify-content: space-between;
          width: 100%;
          align-items: center;
          font-size: 12px;
          color: #71717a;
        }

        .lady-variant-chip.selected .chip-meta-row {
          color: rgba(255, 255, 255, 0.8);
        }

        .chip-price {
          font-weight: 800;
          font-size: 14px;
          color: #14251a;
        }

        .lady-variant-chip.selected .chip-price {
          color: #ffffff;
        }

        /* Custom Mode Card */
        .custom-toggle-card {
          background: #ffffff;
          border: 1px solid rgba(20, 37, 26, 0.1);
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(20, 37, 26, 0.03);
        }

        .toggle-heading-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .toggle-title {
          font-size: 15px;
          font-weight: 800;
          color: #14251a;
        }

        .toggle-free-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          background: #eef8f1;
          color: #15803d;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .toggle-disabled-tag {
          font-size: 10px;
          font-weight: 700;
          color: #71717a;
          background: #f4f4f5;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .toggle-desc {
          margin: 0;
          font-size: 12px;
          color: #71717a;
          line-height: 1.45;
        }

        /* Toggle Switch */
        .custom-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 28px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .custom-switch.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .custom-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-slider {
          position: absolute;
          inset: 0;
          background-color: #e4e4e7;
          border-radius: 9999px;
          transition: background-color 0.25s ease;
        }

        .switch-slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: #ffffff;
          border-radius: 50%;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .custom-switch input:checked + .switch-slider {
          background-color: #14251a;
        }

        .custom-switch input:checked + .switch-slider:before {
          transform: translateX(20px);
        }

        /* Custom Fields Panel */
        .custom-fields-panel {
          margin-top: 12px;
          background: #fcfbf9;
          border: 1px dashed rgba(20, 37, 26, 0.22);
          border-radius: 16px;
          padding: 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .custom-form-intro {
          border-bottom: 1px solid rgba(20, 37, 26, 0.08);
          padding-bottom: 10px;
        }

        .form-intro-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #2f6b45;
        }

        .form-intro-desc {
          margin: 4px 0 0;
          font-size: 12px;
          color: #52525b;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .label-with-counter {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .field-label {
          font-size: 13px;
          font-weight: 700;
          color: #14251a;
        }

        .field-label .req {
          color: #dc2626;
        }

        .char-count {
          font-size: 11px;
          color: #71717a;
          font-variant-numeric: tabular-nums;
        }

        .field-input {
          background: #ffffff;
          border: 1.5px solid #d4d4d8;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          color: #14251a;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .field-input:focus {
          border-color: #14251a;
          box-shadow: 0 0 0 3px rgba(20, 37, 26, 0.1);
        }

        .field-input.has-error {
          border-color: #dc2626;
          background: #fff5f5;
        }

        .field-hint {
          font-size: 11px;
          color: #71717a;
        }

        .field-error-msg {
          margin: 0;
          font-size: 12px;
          color: #dc2626;
          font-weight: 600;
        }

        /* Material buttons */
        .material-toggle-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .material-choice-btn {
          background: #ffffff;
          border: 1.5px solid #e4e4e7;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .material-choice-btn.active {
          border-color: #14251a;
          background: #14251a;
          color: #ffffff;
        }

        .material-btn-title {
          font-size: 13px;
          font-weight: 800;
        }

        .material-btn-sub {
          font-size: 10px;
          color: #71717a;
          margin-top: 2px;
        }

        .material-choice-btn.active .material-btn-sub {
          color: rgba(255, 255, 255, 0.75);
        }

        /* Plinth Live Preview */
        .nameplate-live-preview {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .preview-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #71717a;
        }

        .preview-plate {
          padding: 14px 16px;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .preview-plate.polymer-texture {
          background: #18221b;
          color: #ffffff;
        }

        .preview-plate.mdf-texture {
          background: #684a32;
          color: #fefae0;
        }

        .plate-inner-border {
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          padding: 8px 14px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .preview-name {
          font-size: 14px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .preview-desig {
          font-size: 11px;
          letter-spacing: 0.04em;
          opacity: 0.85;
        }

        /* Quantity and Price Bar */
        .quantity-price-row {
          background: #ffffff;
          border: 1px solid rgba(20, 37, 26, 0.08);
          border-radius: 16px;
          padding: 16px 20px;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
        }

        .qty-picker-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .qty-label {
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
        }

        .qty-stepper {
          display: flex;
          align-items: center;
          background: #f4f4f5;
          border-radius: 8px;
          padding: 2px;
        }

        .qty-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: transparent;
          border: none;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #14251a;
          transition: background 0.15s ease;
        }

        .qty-btn:hover:not(:disabled) {
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        .qty-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .qty-value {
          width: 32px;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
        }

        .price-display-wrap {
          text-align: right;
        }

        .price-label {
          font-size: 11px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .price-value-row {
          display: flex;
          align-items: baseline;
          justify-content: flex-end;
          gap: 2px;
        }

        .price-currency {
          font-size: 18px;
          font-weight: 700;
          color: #14251a;
        }

        .price-amount {
          font-size: 28px;
          font-weight: 850;
          color: #14251a;
          line-height: 1;
        }

        .price-tax-note {
          font-size: 11px;
          color: #15803d;
          font-weight: 600;
        }

        /* Add to Cart Button */
        .lady-order-btn {
          width: 100%;
          background: #14251a;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 8px 24px rgba(20, 37, 26, 0.18);
          transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
        }

        .lady-order-btn:hover {
          background: #1f3827;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(20, 37, 26, 0.24);
        }

        .lady-order-btn:active {
          transform: translateY(0);
        }

        /* Success Toast Banner */
        .add-cart-toast-banner {
          background: #f0fdf4;
          border: 1.5px solid #86efac;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          animation: slideDownToast 0.25s ease-out;
        }

        @keyframes slideDownToast {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .toast-content-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toast-check-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #dcfce7;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .toast-title {
          font-size: 14px;
          font-weight: 800;
          color: #14532d;
        }

        .toast-sub {
          margin: 2px 0 0;
          font-size: 13px;
          color: #166534;
        }

        .toast-actions-row {
          display: flex;
          gap: 10px;
        }

        .toast-view-cart-btn {
          flex: 1;
          background: #15803d;
          color: #ffffff;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .toast-view-cart-btn:hover {
          background: #166534;
        }

        .toast-dismiss-btn {
          background: #ffffff;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .toast-dismiss-btn:hover {
          background: #f0fdf4;
        }

        /* Trust Footnote */
        .lady-guarantee-row {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(20, 37, 26, 0.08);
          font-size: 12px;
          color: #52525b;
          font-weight: 600;
        }

        .guarantee-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        @media (max-width: 640px) {
          .lady-variant-chips-grid {
            grid-template-columns: 1fr;
          }
          .quantity-price-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .price-display-wrap {
            text-align: left;
            width: 100%;
          }
          .price-value-row {
            justify-content: flex-start;
          }
          .toast-actions-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
