import React, { useState, useEffect } from 'react';
import { onAuthStateChange } from '../../lib/firebase/client';
import { SAVED_ADDRESS_KEY } from '../../lib/session/cache';
import {
  getSavedAddresses,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultAddress
} from '../../lib/session/addresses';

const INITIAL_FORM = {
  label: 'Home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  isDefault: false
};

export default function ProfileManager() {
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null); // null = not editing; 'new' = adding new; string = editing address ID
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAddresses = () => {
    const list = getSavedAddresses();
    setAddresses(list);
  };

  useEffect(() => {
    const unsub = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });

    loadAddresses();

    const handleUpdate = () => {
      loadAddresses();
    };
    window.addEventListener('marshans:addresses-updated', handleUpdate);

    return () => {
      unsub();
      window.removeEventListener('marshans:addresses-updated', handleUpdate);
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingId('new');
    setFormData({
      ...INITIAL_FORM,
      fullName: user?.displayName || '',
      isDefault: addresses.length === 0
    });
    setError('');
  };

  const handleOpenEdit = (addr) => {
    setEditingId(addr.id);
    setFormData({
      label: addr.label || 'Home',
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      isDefault: Boolean(addr.isDefault)
    });
    setError('');
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLabelSelect = (label) => {
    setFormData((prev) => ({ ...prev, label }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // PIN code sanity check
    const pin = formData.postalCode.replace(/\D/g, '');
    if (pin.length !== 6) {
      setError('Please provide a valid 6-digit PIN code.');
      return;
    }

    // Phone sanity check
    const phoneClean = formData.phone.replace(/\D/g, '');
    if (phoneClean.length < 10) {
      setError('Please provide a valid 10-digit phone number.');
      return;
    }

    try {
      if (editingId === 'new') {
        addSavedAddress({
          ...formData,
          postalCode: pin,
          phone: phoneClean
        });
        setMessage('New address added successfully.');
      } else if (editingId) {
        updateSavedAddress(editingId, {
          ...formData,
          postalCode: pin,
          phone: phoneClean
        });
        setMessage('Address updated successfully.');
      }
      setEditingId(null);
      setFormData(INITIAL_FORM);
      loadAddresses();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save address. Please try again.');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteSavedAddress(id);
      loadAddresses();
      setMessage('Address removed.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSetDefault = (id) => {
    setDefaultAddress(id);
    loadAddresses();
    setMessage('Default address updated.');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="profile-manager-card">
      {/* Top Header with + Add Address Button */}
      <div className="profile-header-bar">
        <div className="profile-header-text">
          <span className="profile-badge">FULFILLMENT DESTINATIONS</span>
          <h2>Saved Addresses</h2>
          <p>Manage multiple addresses for expedited checkout and courier routing.</p>
        </div>
        {!editingId && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn btn-primary add-addr-top-btn"
          >
            + Add Address
          </button>
        )}
      </div>

      {message && (
        <div className="alert alert-success">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          ⚠ {error}
        </div>
      )}

      {/* Add / Edit Form Mode */}
      {editingId ? (
        <div className="address-form-box">
          <div className="form-box-header">
            <h3>{editingId === 'new' ? 'Add New Address' : 'Edit Saved Address'}</h3>
            <button type="button" onClick={handleCancelForm} className="close-text-btn">
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            {/* Label Selector: Home / Work / Other */}
            <div className="form-group">
              <label className="form-label">Address Type</label>
              <div className="label-toggle-group">
                {['Home', 'Work', 'Other'].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    className={`label-pill-btn ${formData.label === lbl ? 'active' : ''}`}
                    onClick={() => handleLabelSelect(lbl)}
                  >
                    {lbl === 'Home' ? '🏠 Home' : lbl === 'Work' ? '💼 Work' : '📍 Other'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
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
                  maxLength={10}
                  value={formData.phone}
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
                value={formData.addressLine1}
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
                value={formData.addressLine2}
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
                  value={formData.city}
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
                  value={formData.state}
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
                  maxLength={6}
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="560001"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                  disabled={addresses.length === 0}
                />
                <span>Set as default shipping address</span>
              </label>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn btn-primary">
                {editingId === 'new' ? 'Save Address' : 'Update Address'}
              </button>
              <button type="button" onClick={handleCancelForm} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Address Cards List Mode */
        <div className="addresses-list">
          {addresses.length === 0 ? (
            <div className="no-addresses-card">
              <div className="empty-icon">📍</div>
              <h3>No Addresses Saved Yet</h3>
              <p>Add your primary shipping coordinates to speed up checkout on your future orders.</p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                + Add Your First Address
              </button>
            </div>
          ) : (
            <div className="address-cards-grid">
              {addresses.map((addr) => (
                <div key={addr.id} className={`address-card ${addr.isDefault ? 'is-default' : ''}`}>
                  <div className="address-card-top">
                    <div className="badge-row">
                      <span className={`label-badge label-${addr.label?.toLowerCase() || 'home'}`}>
                        {addr.label || 'Home'}
                      </span>
                      {addr.isDefault && (
                        <span className="default-badge">DEFAULT</span>
                      )}
                    </div>
                  </div>

                  <div className="address-card-body">
                    <strong className="recipient-name">{addr.fullName}</strong>
                    <span className="recipient-phone">+91 {addr.phone}</span>
                    <p className="address-lines">
                      {addr.addressLine1}
                      {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                      <br />
                      {addr.city}, {addr.state} — {addr.postalCode}
                    </p>
                  </div>

                  <div className="address-card-actions">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id)}
                        className="btn-link"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(addr)}
                      className="btn-link"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      className="btn-link btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .profile-manager-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: clamp(24px, 4vw, 40px);
          max-width: 760px;
          margin: 0 auto;
        }

        .profile-header-bar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .profile-header-text {
          flex: 1;
        }

        .profile-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #e11d48;
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
        }

        .profile-header-text h2 {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 32px;
          letter-spacing: 0.04em;
          color: #09090b;
          margin: 0 0 6px 0;
        }

        .profile-header-text p {
          font-size: 14px;
          color: #71717a;
          margin: 0;
          line-height: 1.5;
        }

        .add-addr-top-btn {
          height: 40px;
          font-size: 13px;
          padding: 0 16px;
          white-space: nowrap;
          align-self: center;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .address-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .address-card {
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 20px;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .address-card:hover {
          border-color: rgba(0, 0, 0, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .address-card.is-default {
          border-color: #111111;
          background: #ffffff;
        }

        .address-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          background: #e4e4e7;
          color: #27272a;
        }

        .label-badge.label-home {
          background: #e0f2fe;
          color: #0369a1;
        }

        .label-badge.label-work {
          background: #fef3c7;
          color: #b45309;
        }

        .label-badge.label-other {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .default-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 3px 6px;
          border-radius: 4px;
          background: #111111;
          color: #ffffff;
        }

        .address-card-body {
          flex: 1;
        }

        .recipient-name {
          display: block;
          font-size: 15px;
          color: #09090b;
          margin-bottom: 2px;
        }

        .recipient-phone {
          display: block;
          font-size: 13px;
          color: #71717a;
          margin-bottom: 8px;
        }

        .address-lines {
          font-size: 13px;
          line-height: 1.5;
          color: #3f3f46;
          margin: 0;
        }

        .address-card-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .btn-link {
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: #09090b;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }

        .btn-link.btn-danger {
          color: #e11d48;
          margin-left: auto;
        }

        .no-addresses-card {
          text-align: center;
          padding: 48px 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px dashed rgba(0, 0, 0, 0.15);
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .no-addresses-card h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 6px 0;
        }

        .no-addresses-card p {
          font-size: 13px;
          color: #71717a;
          margin: 0;
        }

        .address-form-box {
          background: #fafafa;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
        }

        .form-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .form-box-header h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        .close-text-btn {
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: #71717a;
          cursor: pointer;
        }

        .label-toggle-group {
          display: flex;
          gap: 8px;
        }

        .label-pill-btn {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: #3f3f46;
          transition: all 0.15s ease;
        }

        .label-pill-btn.active {
          background: #111111;
          border-color: #111111;
          color: #ffffff;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
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

        .form-checkbox-row {
          margin-top: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #27272a;
          cursor: pointer;
        }

        .form-actions-row {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        @media (max-width: 640px) {
          .form-row-2, .form-row-3 {
            grid-template-columns: 1fr;
          }
          .profile-header-bar {
            flex-direction: column;
          }
          .add-addr-top-btn {
            width: 100%;
          }
        }
      ` }} />
    </div>
  );
}
