import React, { useState, useMemo } from 'react';
import { calculateEstimatedQuote, submitCustom3DRequest } from '../../lib/api/custom3d';
import { addToCart } from '../../lib/api/cart';

export default function Custom3DStudio() {
  const [file, setFile] = useState(null);
  const [material, setMaterial] = useState('pla_plus');
  const [color, setColor] = useState('Obsidian Black');
  const [infill, setInfill] = useState(25);
  const [finishing, setFinishing] = useState('raw_satin');
  const [dimensions, setDimensions] = useState({ x: 100, y: 100, z: 100 });
  const [quantity, setQuantity] = useState(1);
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);

  // File drop handler
  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Live estimated quote
  const quote = useMemo(() => {
    return calculateEstimatedQuote({
      material,
      dimensionsMm: dimensions,
      infillPercent: infill,
      finishing,
      quantity
    });
  }, [material, dimensions, infill, finishing, quantity]);

  // Volume & approx weight
  const volumeCm3 = (dimensions.x * dimensions.y * dimensions.z) / 1000;
  const approxWeightGrams = Math.round(Math.max(volumeCm3 * 1.25 * ((infill / 100) * 0.4 + 0.2), 15) * quantity);

  // Add custom build to cart
  const handleAddToCart = async () => {
    const res = await addToCart({
      productId: 9999,
      name: `Custom 3D Print (${file ? file.name : 'Custom Model'})`,
      slug: 'custom-3d-print',
      sku: `CST-3D-${Date.now().toString().slice(-4)}`,
      price: quote,
      quantity: 1,
      imageUrl: '/assets/custom-3d/custom-hero.svg',
      categoryName: 'Custom Fabrication',
      material: `${material.toUpperCase()} (${color}, ${infill}% Infill)`,
      finishing: `${finishing.replace('_', ' ').toUpperCase()}`
    });

    if (res?.requiresLogin) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  // Submit quote request
  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!contactEmail) {
      alert('Please enter your contact email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCustom3DRequest({
        fileName: file ? file.name : 'Direct Configuration',
        fileSize: file ? file.size : 0,
        material,
        color,
        dimensionsMm: dimensions,
        quantity,
        infillPercent: infill,
        finishing,
        notes,
        contactEmail
      });

      if (res && res.success) {
        setSubmitted(true);
      } else {
        setSubmitError(res?.error || 'Custom 3D request submission is currently unavailable on the server.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Unable to connect to fabrication queue. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="custom-studio-grid">
      {/* Left Column: Interactive 3D Configurator */}
      <div className="studio-config-column">
        {/* Upload Zone */}
        <div
          className="upload-drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <input
            type="file"
            id="stl-upload"
            accept=".stl,.obj,.3mf,.step,.zip"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <label htmlFor="stl-upload" className="drop-label">
            <div className="upload-icon">📁</div>
            {file ? (
              <div className="uploaded-file-info">
                <strong>{file.name}</strong>
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB • File Ready for Slicing</span>
                <span className="replace-prompt">Click to swap file</span>
              </div>
            ) : (
              <div className="upload-prompt">
                <strong>DRAG & DROP 3D MODEL HERE</strong>
                <span>Supported: .STL, .OBJ, .3MF, .STEP (Max 100MB)</span>
                <span className="browse-btn">Or browse computer</span>
              </div>
            )}
          </label>
        </div>

        {/* Step 1: Material Selection */}
        <div className="studio-card">
          <div className="card-title-row">
            <span className="card-num">01</span>
            <h3>Select Engineering Polymer / Resin</h3>
          </div>
          <div className="material-options-grid">
            {[
              { id: 'pla_plus', name: 'High-Grade PLA+', desc: 'Crisp 0.12mm layers, rigid, biodegradable', tag: 'Standard' },
              { id: 'petg', name: 'Engineering PETG', desc: 'Impact resistant, high heat & weather proof', tag: 'Durable' },
              { id: 'resin', name: 'High-Def SLA Resin', desc: 'Ultra-smooth surface, zero visible print lines', tag: 'Ultra Fine' },
              { id: 'carbon_fiber', name: 'Carbon Fiber PETG', desc: 'Ultra-stiff, textured matte industrial finish', tag: 'High Tensile' },
              { id: 'tpu', name: 'Flexible TPU (95A)', desc: 'Rubberized shock-absorbing elastomeric core', tag: 'Flexible' }
            ].map((mat) => (
              <button
                key={mat.id}
                type="button"
                onClick={() => setMaterial(mat.id)}
                className={`mat-select-btn ${material === mat.id ? 'active' : ''}`}
              >
                <div className="mat-btn-top">
                  <strong>{mat.name}</strong>
                  <span className="mat-badge">{mat.tag}</span>
                </div>
                <p>{mat.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Color Palette */}
        <div className="studio-card">
          <div className="card-title-row">
            <span className="card-num">02</span>
            <h3>Filament / Resin Color</h3>
          </div>
          <div className="color-swatch-row">
            {[
              { name: 'Obsidian Black', hex: '#18181b' },
              { name: 'Polar White', hex: '#ffffff', border: true },
              { name: 'Cyber Crimson', hex: '#e11d48' },
              { name: 'Silk Gold', hex: '#eab308' },
              { name: 'Electric Cyan', hex: '#0284c7' },
              { name: 'Sage Industrial', hex: '#15803d' },
              { name: 'Slate Grey', hex: '#64748b' }
            ].map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                className={`color-swatch-btn ${color === c.name ? 'active' : ''}`}
                title={c.name}
              >
                <span
                  className="swatch-circle"
                  style={{
                    backgroundColor: c.hex,
                    border: c.border ? '1px solid #d4d4d8' : 'none'
                  }}
                />
                <span className="swatch-name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Dimensions & Infill */}
        <div className="studio-card">
          <div className="card-title-row">
            <span className="card-num">03</span>
            <h3>Bounding Box (mm) & Infill Ratio</h3>
          </div>

          <div className="dimensions-inputs-grid">
            <div className="dim-group">
              <label>X Length (mm)</label>
              <input
                type="number"
                min="10"
                max="350"
                value={dimensions.x}
                onChange={(e) => setDimensions({ ...dimensions, x: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="dim-group">
              <label>Y Width (mm)</label>
              <input
                type="number"
                min="10"
                max="350"
                value={dimensions.y}
                onChange={(e) => setDimensions({ ...dimensions, y: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="dim-group">
              <label>Z Height (mm)</label>
              <input
                type="number"
                min="10"
                max="400"
                value={dimensions.z}
                onChange={(e) => setDimensions({ ...dimensions, z: Number(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          {/* Infill Slider */}
          <div className="infill-slider-block">
            <div className="infill-label-row">
              <label>Internal Infill Density: <strong>{infill}%</strong></label>
              <span className="infill-note">
                {infill <= 20 ? 'Light / Display Only' : infill <= 40 ? 'Standard Structural' : 'Heavy Industrial Duty'}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={infill}
              onChange={(e) => setInfill(Number(e.target.value))}
              className="range-slider"
            />
          </div>
        </div>

        {/* Step 4: Finishing */}
        <div className="studio-card">
          <div className="card-title-row">
            <span className="card-num">04</span>
            <h3>Post-Processing & Finishing</h3>
          </div>
          <div className="finishing-grid">
            {[
              { id: 'raw_satin', name: 'Studio Satin Raw', desc: 'Support structures removed, ultrasonic cleaned, bead blasted' },
              { id: 'vapor_smooth', name: 'Chemical Vapor Smoothed', desc: 'Zero layer lines, glossy injection-mold appearance (+₹350)' },
              { id: 'hand_buffed', name: 'Hand-Buffed Micro Sanded', desc: 'Fine multi-grit wet sanding and matte sealing (+₹600)' }
            ].map((f) => (
              <label
                key={f.id}
                className={`finish-option-card ${finishing === f.id ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="finishing"
                  value={f.id}
                  checked={finishing === f.id}
                  onChange={() => setFinishing(f.id)}
                />
                <div>
                  <strong>{f.name}</strong>
                  <p>{f.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Live Price & Dispatch Actions */}
      <div className="studio-quote-column">
        <div className="quote-summary-card">
          <div className="quote-header">
            <span className="quote-badge">INSTANT ESTIMATE</span>
            <h2>ESTIMATED FABRICATION QUOTE</h2>
          </div>

          <div className="quote-big-price">
            <span className="currency-symbol">₹</span>
            <span className="quote-amount">{quote.toLocaleString('en-IN')}</span>
          </div>
          <span className="quote-gst-tag">Includes 0.12mm calibration & GST</span>

          <div className="quote-metrics-list">
            <div className="metric-row">
              <span>Model Weight</span>
              <strong>~{approxWeightGrams} grams</strong>
            </div>
            <div className="metric-row">
              <span>Material</span>
              <strong>{material.toUpperCase().replace('_', ' ')} ({color})</strong>
            </div>
            <div className="metric-row">
              <span>Layer Thickness</span>
              <strong>0.12 mm (120 microns)</strong>
            </div>
            <div className="metric-row">
              <span>Dispatch Estimate</span>
              <strong>Dispatches in 48 Hours</strong>
            </div>
          </div>

          {/* Quantity */}
          <div className="quantity-select-row">
            <label>Quantity Batch:</label>
            <div className="qty-buttons">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="qty-btn"
              >
                −
              </button>
              <span className="qty-num">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="qty-btn"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="quote-actions-stack">
            <button
              type="button"
              onClick={handleAddToCart}
              className={`btn btn-primary quote-main-btn ${addedToCart ? 'is-added' : ''}`}
            >
              {addedToCart ? '✓ Added Custom Print to Bag' : 'Add Custom Job to Bag'}
            </button>

            <a href="/cart" className="btn btn-outline">
              Review Bag & Checkout
            </a>
          </div>

          {/* Or submit RFQ Form */}
          <div className="quote-rfq-block">
            <h4>Need human review or special tolerance?</h4>
            <p>Send your file coordinates directly to our print engineers for manual review.</p>
            {submitted ? (
              <div className="quote-success-msg">
                ✓ Quote request dispatched! Our fabrication engineers will review your files within 2 business hours.
              </div>
            ) : (
              <form onSubmit={handleSubmitQuote} className="rfq-mini-form">
                {submitError && (
                  <div style={{ color: '#e11d48', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
                    {submitError}
                  </div>
                )}
                <input
                  type="email"
                  required
                  placeholder="engineer@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="form-input"
                />
                <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                  {submitting ? 'Sending...' : 'Request Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>


      <style dangerouslySetInnerHTML={{ __html: `
        .custom-studio-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .studio-config-column {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .upload-drop-zone {
          background: #ffffff;
          border: 2px dashed rgba(0, 0, 0, 0.15);
          border-radius: 16px;
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-drop-zone:hover {
          border-color: #111111;
          background: #f8fafc;
        }

        .drop-label {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          font-size: 40px;
        }

        .upload-prompt strong {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 24px;
          letter-spacing: 0.05em;
          color: #09090b;
          display: block;
        }

        .upload-prompt span {
          font-size: 13px;
          color: #71717a;
          margin-top: 4px;
          display: block;
        }

        .browse-btn {
          font-size: 13px;
          font-weight: 700;
          color: #e11d48 !important;
          text-decoration: underline;
          margin-top: 8px;
        }

        .uploaded-file-info strong {
          font-size: 18px;
          color: #15803d;
          display: block;
        }

        .uploaded-file-info span {
          font-size: 13px;
          color: #71717a;
          display: block;
        }

        .replace-prompt {
          text-decoration: underline;
          color: #111111 !important;
          margin-top: 8px;
        }

        .studio-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 28px;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .card-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #18181b;
          color: #ffffff;
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-title-row h3 {
          font-size: 16px;
          font-weight: 800;
          color: #09090b;
          margin: 0;
        }

        .material-options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .mat-select-btn {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          padding: 14px 18px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .mat-select-btn:hover {
          border-color: #111111;
        }

        .mat-select-btn.active {
          border-color: #111111;
          background: #f8fafc;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .mat-btn-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .mat-btn-top strong {
          font-size: 14px;
          color: #09090b;
        }

        .mat-badge {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: #e4e4e7;
          color: #3f3f46;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .mat-select-btn p {
          margin: 0;
          font-size: 12px;
          color: #71717a;
        }

        .color-swatch-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .color-swatch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .color-swatch-btn.active {
          border-color: #111111;
          background: #18181b;
          color: #ffffff;
        }

        .swatch-circle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
        }

        .swatch-name {
          font-size: 12px;
          font-weight: 600;
        }

        .dimensions-inputs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .dim-group label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          margin-bottom: 6px;
        }

        .infill-slider-block {
          background: #f8fafc;
          padding: 16px;
          border-radius: 10px;
        }

        .infill-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .infill-note {
          font-size: 11px;
          color: #e11d48;
          font-weight: 700;
        }

        .range-slider {
          width: 100%;
          cursor: pointer;
        }

        .finishing-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .finish-option-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          cursor: pointer;
        }

        .finish-option-card.active {
          border-color: #111111;
          background: #f8fafc;
        }

        .finish-option-card strong {
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        .finish-option-card p {
          font-size: 12px;
          color: #71717a;
          margin: 0;
        }

        /* Quote Column */
        .quote-summary-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06);
          position: sticky;
          top: 100px;
        }

        .quote-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #0284c7;
          text-transform: uppercase;
        }

        .quote-header h2 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 26px;
          letter-spacing: 0.04em;
          color: #09090b;
          margin: 4px 0 16px 0;
        }

        .quote-big-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 4px;
        }

        .currency-symbol {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 32px;
          color: #09090b;
        }

        .quote-amount {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 54px;
          color: #09090b;
          line-height: 1;
        }

        .quote-gst-tag {
          font-size: 12px;
          color: #71717a;
          display: block;
          margin-bottom: 24px;
        }

        .quote-metrics-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px 0;
          border-top: 1px solid #f4f4f5;
          border-bottom: 1px solid #f4f4f5;
          margin-bottom: 24px;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .metric-row span {
          color: #71717a;
        }

        .metric-row strong {
          color: #09090b;
        }

        .quantity-select-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          font-size: 13px;
          font-weight: 700;
        }

        .qty-buttons {
          display: flex;
          align-items: center;
          border: 1px solid #e4e4e7;
          border-radius: 6px;
        }

        .qty-btn {
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
        }

        .qty-num {
          width: 32px;
          text-align: center;
        }

        .quote-actions-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 32px;
        }

        .quote-main-btn {
          width: 100%;
          height: 52px;
          font-size: 14px;
        }

        .quote-main-btn.is-added {
          background-color: #15803d;
          border-color: #15803d;
        }

        .quote-rfq-block {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
        }

        .quote-rfq-block h4 {
          font-size: 13px;
          font-weight: 800;
          color: #09090b;
          margin: 0 0 6px 0;
        }

        .quote-rfq-block p {
          font-size: 12px;
          color: #71717a;
          margin: 0 0 12px 0;
          line-height: 1.4;
        }

        .rfq-mini-form {
          display: flex;
          gap: 8px;
        }

        .quote-success-msg {
          font-size: 12px;
          font-weight: 600;
          color: #15803d;
          background: #f0fdf4;
          padding: 10px;
          border-radius: 6px;
        }

        @media (max-width: 960px) {
          .custom-studio-grid {
            grid-template-columns: 1fr;
          }
          .quote-summary-card {
            position: static;
          }
        }
      ` }} />
    </div>
  );
}
