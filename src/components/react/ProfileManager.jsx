import React, { useState, useEffect } from 'react';
import { onAuthStateChange } from '../../lib/firebase/client';
import { SAVED_ADDRESS_KEY } from '../../lib/session/cache';

const ADDRESS_STORAGE_KEY = SAVED_ADDRESS_KEY;

export default function ProfileManager() {
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: ''
  });

  useEffect(() => {
    const unsub = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName && !form.fullName) {
        setForm((prev) => ({ ...prev, fullName: currentUser.displayName }));
      }
    });

    try {
      const stored = localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (stored) {
        setForm(JSON.parse(stored));
      }
    } catch {}

    return () => unsub();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(form));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="profile-manager-card">
      <div className="profile-header">
        <span className="profile-badge">DEFAULT DESTINATION</span>
        <h2>Saved Shipping Address</h2>
        <p>This address will be automatically populated during checkout for expedited dispatch.</p>
      </div>

      {saved && (
        <div className="save-alert">
          ✓ Shipping address updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={form.fullName}
              onChange={handleChange}
              placeholder="e.g. Vinay Yadav"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number (+91)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="addressLine1">Street Address</label>
          <input
            id="addressLine1"
            name="addressLine1"
            type="text"
            required
            value={form.addressLine1}
            onChange={handleChange}
            placeholder="Flat / Building / House No, Street"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="addressLine2">Apartment, Suite, Unit (Optional)</label>
          <input
            id="addressLine2"
            name="addressLine2"
            type="text"
            value={form.addressLine2}
            onChange={handleChange}
            placeholder="Landmark or locality"
            className="form-input"
          />
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label" htmlFor="city">City</label>
            <input
              id="city"
              name="city"
              type="text"
              required
              value={form.city}
              onChange={handleChange}
              placeholder="e.g. Bengaluru"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="state">State</label>
            <input
              id="state"
              name="state"
              type="text"
              required
              value={form.state}
              onChange={handleChange}
              placeholder="e.g. Karnataka"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="postalCode">PIN Code</label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              required
              value={form.postalCode}
              onChange={handleChange}
              placeholder="560001"
              className="form-input"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary save-btn">
          Save Shipping Coordinates
        </button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .profile-manager-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: clamp(28px, 5vw, 44px);
          max-width: 680px;
          margin: 0 auto;
        }

        .profile-header {
          margin-bottom: 28px;
        }

        .profile-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #e11d48;
          text-transform: uppercase;
          display: block;
          margin-bottom: 8px;
        }

        .profile-header h2 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 32px;
          letter-spacing: 0.04em;
          color: #09090b;
          margin: 0 0 8px 0;
        }

        .profile-header p {
          font-size: 14px;
          color: #71717a;
          margin: 0;
          line-height: 1.5;
        }

        .save-alert {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1fr;
          gap: 16px;
        }

        .save-btn {
          height: 48px;
          align-self: flex-start;
          margin-top: 8px;
        }

        @media (max-width: 640px) {
          .form-row-2, .form-row-3 {
            grid-template-columns: 1fr;
          }
          .save-btn {
            width: 100%;
          }
        }
      ` }} />
    </div>
  );
}
