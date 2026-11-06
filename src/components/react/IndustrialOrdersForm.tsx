import React, { useState } from 'react';
import { apiClient } from '../../lib/api/client';

export interface IndustrialInquiryData {
  fullName: string;
  companyName: string;
  phoneNumber: string;
  emailAddress: string;
  isSameWhatsApp: 'Yes' | 'No' | '';
  whatsAppNumber?: string;
  requirementDescription: string;
}

export default function IndustrialOrdersForm() {
  const [formData, setFormData] = useState<IndustrialInquiryData>({
    fullName: '',
    companyName: '',
    phoneNumber: '',
    emailAddress: '',
    isSameWhatsApp: '',
    whatsAppNumber: '',
    requirementDescription: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) setServerError(null);
  };

  const handleWhatsAppChoice = (choice: 'Yes' | 'No') => {
    setFormData((prev) => ({
      ...prev,
      isSameWhatsApp: choice,
      // Clear separate WhatsApp field when Yes is selected
      whatsAppNumber: choice === 'Yes' ? '' : prev.whatsAppNumber
    }));

    if (errors.isSameWhatsApp) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.isSameWhatsApp;
        return next;
      });
    }
    if (choice === 'Yes' && errors.whatsAppNumber) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.whatsAppNumber;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company Name is required.';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required.';
    } else if (!/^[0-9+()-\s]{7,20}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid phone number.';
    }

    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress.trim())) {
      newErrors.emailAddress = 'Please enter a valid email address.';
    }

    if (!formData.isSameWhatsApp) {
      newErrors.isSameWhatsApp = 'Please confirm if this is the same number for WhatsApp.';
    } else if (formData.isSameWhatsApp === 'No') {
      if (!formData.whatsAppNumber || !formData.whatsAppNumber.trim()) {
        newErrors.whatsAppNumber = 'WhatsApp Number is required when different from phone.';
      } else if (!/^[0-9+()-\s]{7,20}$/.test(formData.whatsAppNumber.trim())) {
        newErrors.whatsAppNumber = 'Please enter a valid WhatsApp number.';
      }
    }

    if (!formData.requirementDescription.trim()) {
      newErrors.requirementDescription = 'Product / Industrial Requirement Description is required.';
    } else if (formData.requirementDescription.trim().length < 10) {
      newErrors.requirementDescription = 'Please provide a brief description of at least 10 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const finalWhatsAppNumber =
      formData.isSameWhatsApp === 'Yes' ? formData.phoneNumber.trim() : (formData.whatsAppNumber || '').trim();

    const payload = {
      full_name: formData.fullName.trim(),
      company_name: formData.companyName.trim(),
      phone_number: formData.phoneNumber.trim(),
      email_address: formData.emailAddress.trim(),
      whatsapp_number: finalWhatsAppNumber,
      requirement_description: formData.requirementDescription.trim(),
      source: 'custom_forge_industrial_inquiry'
    };

    try {
      // Attempt submission to backend endpoint
      const res = await apiClient<any>('/custom-3d/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setSubmitSuccess(true);
      } else {
        // Backend endpoint exists or responded with failure; do not invent a success state
        setServerError(
          res?.error?.message ||
          'Backend inquiry endpoint is currently pending deployment. Your inquiry has not been recorded.'
        );
      }
    } catch (err: any) {
      // Endpoint error or network failure: report clearly without pretending success
      setServerError(
        'Backend inquiry endpoint is currently pending deployment. Please check back shortly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="industrial-orders-section" id="industrial-orders" aria-labelledby="industrial-orders-heading">
      <div className="industrial-orders-container">
        <div className="industrial-orders-header">
          <span className="industrial-badge">ENTERPRISE FABRICATION</span>
          <h2 id="industrial-orders-heading" className="industrial-title">
            Industrial Orders
          </h2>
          <p className="industrial-intro">
            Submit your industrial requirements for rapid prototyping, batch additive manufacturing, and custom engineering. Our sales team reviews all specifications directly.
          </p>
        </div>

        {submitSuccess ? (
          <div className="industrial-success-box" role="status" aria-live="polite">
            <div className="industrial-success-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="industrial-success-message">
              Thank you! We have received your information. Our sales team will contact you shortly.
            </p>
          </div>
        ) : (
          <form className="industrial-form" onSubmit={handleSubmit} noValidate>
            <div className="industrial-form-grid">
              {/* 1. Full Name */}
              <div className="industrial-field-group">
                <label htmlFor="field-fullName" className="industrial-label">
                  Full Name <span className="req-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="field-fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`industrial-input ${errors.fullName ? 'is-invalid' : ''}`}
                  placeholder="e.g. Johnathan Vance"
                  aria-required="true"
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? 'err-fullName' : undefined}
                  disabled={isSubmitting}
                />
                {errors.fullName && (
                  <span id="err-fullName" className="industrial-field-error" role="alert">
                    {errors.fullName}
                  </span>
                )}
              </div>

              {/* 2. Company Name */}
              <div className="industrial-field-group">
                <label htmlFor="field-companyName" className="industrial-label">
                  Company Name <span className="req-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="field-companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`industrial-input ${errors.companyName ? 'is-invalid' : ''}`}
                  placeholder="e.g. Vance Dynamics Ltd."
                  aria-required="true"
                  aria-invalid={!!errors.companyName}
                  aria-describedby={errors.companyName ? 'err-companyName' : undefined}
                  disabled={isSubmitting}
                />
                {errors.companyName && (
                  <span id="err-companyName" className="industrial-field-error" role="alert">
                    {errors.companyName}
                  </span>
                )}
              </div>

              {/* 3. Phone Number */}
              <div className="industrial-field-group">
                <label htmlFor="field-phoneNumber" className="industrial-label">
                  Phone Number <span className="req-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  type="tel"
                  id="field-phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className={`industrial-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                  placeholder="+91 98765 43210"
                  aria-required="true"
                  aria-invalid={!!errors.phoneNumber}
                  aria-describedby={errors.phoneNumber ? 'err-phoneNumber' : undefined}
                  disabled={isSubmitting}
                />
                {errors.phoneNumber && (
                  <span id="err-phoneNumber" className="industrial-field-error" role="alert">
                    {errors.phoneNumber}
                  </span>
                )}
              </div>

              {/* 4. Email Address */}
              <div className="industrial-field-group">
                <label htmlFor="field-emailAddress" className="industrial-label">
                  Email Address <span className="req-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  id="field-emailAddress"
                  name="emailAddress"
                  value={formData.emailAddress}
                  onChange={handleInputChange}
                  className={`industrial-input ${errors.emailAddress ? 'is-invalid' : ''}`}
                  placeholder="name@company.com"
                  aria-required="true"
                  aria-invalid={!!errors.emailAddress}
                  aria-describedby={errors.emailAddress ? 'err-emailAddress' : undefined}
                  disabled={isSubmitting}
                />
                {errors.emailAddress && (
                  <span id="err-emailAddress" className="industrial-field-error" role="alert">
                    {errors.emailAddress}
                  </span>
                )}
              </div>
            </div>

            {/* 5. WhatsApp Number Confirmation */}
            <div className="industrial-whatsapp-block">
              <fieldset className="industrial-fieldset">
                <legend className="industrial-legend">
                  Is this the same number for WhatsApp? <span className="req-asterisk" aria-hidden="true">*</span>
                </legend>
                <div className="industrial-radio-row" role="radiogroup" aria-required="true">
                  <label className={`industrial-radio-chip ${formData.isSameWhatsApp === 'Yes' ? 'is-checked' : ''}`}>
                    <input
                      type="radio"
                      name="isSameWhatsApp"
                      value="Yes"
                      checked={formData.isSameWhatsApp === 'Yes'}
                      onChange={() => handleWhatsAppChoice('Yes')}
                      disabled={isSubmitting}
                    />
                    <span>Yes</span>
                  </label>

                  <label className={`industrial-radio-chip ${formData.isSameWhatsApp === 'No' ? 'is-checked' : ''}`}>
                    <input
                      type="radio"
                      name="isSameWhatsApp"
                      value="No"
                      checked={formData.isSameWhatsApp === 'No'}
                      onChange={() => handleWhatsAppChoice('No')}
                      disabled={isSubmitting}
                    />
                    <span>No</span>
                  </label>
                </div>
                {errors.isSameWhatsApp && (
                  <span className="industrial-field-error" role="alert">
                    {errors.isSameWhatsApp}
                  </span>
                )}
              </fieldset>

              {/* Conditional Separate WhatsApp Number field (Revealed only when No is selected) */}
              {formData.isSameWhatsApp === 'No' && (
                <div className="industrial-field-group industrial-conditional-field">
                  <label htmlFor="field-whatsAppNumber" className="industrial-label">
                    WhatsApp Number <span className="req-asterisk" aria-hidden="true">*</span>
                  </label>
                  <input
                    type="tel"
                    id="field-whatsAppNumber"
                    name="whatsAppNumber"
                    value={formData.whatsAppNumber || ''}
                    onChange={handleInputChange}
                    className={`industrial-input ${errors.whatsAppNumber ? 'is-invalid' : ''}`}
                    placeholder="+91 98765 43210 (WhatsApp)"
                    aria-required="true"
                    aria-invalid={!!errors.whatsAppNumber}
                    aria-describedby={errors.whatsAppNumber ? 'err-whatsAppNumber' : undefined}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  {errors.whatsAppNumber && (
                    <span id="err-whatsAppNumber" className="industrial-field-error" role="alert">
                      {errors.whatsAppNumber}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 6. Product / Industrial Requirement Description */}
            <div className="industrial-field-group">
              <label htmlFor="field-requirementDescription" className="industrial-label">
                Product / Industrial Requirement Description <span className="req-asterisk" aria-hidden="true">*</span>
              </label>
              <textarea
                id="field-requirementDescription"
                name="requirementDescription"
                rows={5}
                value={formData.requirementDescription}
                onChange={handleInputChange}
                className={`industrial-textarea ${errors.requirementDescription ? 'is-invalid' : ''}`}
                placeholder="Detail your industrial manufacturing specifications, target part volumes, tolerances, CAD file formats, surface finish requirements, and timelines..."
                aria-required="true"
                aria-invalid={!!errors.requirementDescription}
                aria-describedby={errors.requirementDescription ? 'err-requirementDescription' : undefined}
                disabled={isSubmitting}
              />
              {errors.requirementDescription && (
                <span id="err-requirementDescription" className="industrial-field-error" role="alert">
                  {errors.requirementDescription}
                </span>
              )}
            </div>

            {/* Server Error Notice */}
            {serverError && (
              <div className="industrial-server-error" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="industrial-submit-row">
              <button
                type="submit"
                className="industrial-submit-btn"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="industrial-spinner" aria-hidden="true"></span>
                    <span>Submitting Inquiry...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Industrial Inquiry</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3.333 8h9.334M8.667 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .industrial-orders-section {
          width: 100%;
          background: #faf7f2;
          border-top: 1px solid rgba(20, 37, 26, 0.08);
          border-bottom: 1px solid rgba(20, 37, 26, 0.08);
          padding: clamp(3.5rem, 6vw, 5.5rem) 0;
          box-sizing: border-box;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
        }

        .industrial-orders-container {
          max-width: 860px;
          margin: 0 auto;
          padding: 0 clamp(1.25rem, 4vw, 2.5rem);
          box-sizing: border-box;
        }

        .industrial-orders-header {
          text-align: center;
          margin-bottom: clamp(2rem, 4vw, 3rem);
        }

        .industrial-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #705e4d;
          background: rgba(140, 109, 59, 0.1);
          padding: 4px 12px;
          border-radius: 9999px;
          margin-bottom: 0.75rem;
          border: 1px solid rgba(140, 109, 59, 0.18);
        }

        .industrial-title {
          margin: 0 0 0.75rem;
          font-size: clamp(26px, 3.5vw, 40px);
          font-weight: 850;
          letter-spacing: -0.025em;
          color: #14251a;
          text-transform: uppercase;
        }

        .industrial-intro {
          margin: 0 auto;
          max-width: 620px;
          font-size: clamp(14px, 1.2vw, 16px);
          line-height: 1.6;
          color: #556358;
        }

        .industrial-form {
          background: #ffffff;
          border: 1px solid rgba(20, 37, 26, 0.09);
          border-radius: 16px;
          padding: clamp(1.75rem, 4vw, 3rem);
          box-shadow: 0 8px 30px rgba(20, 37, 26, 0.04);
        }

        .industrial-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 640px) {
          .industrial-form-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem 1.75rem;
          }
        }

        .industrial-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .industrial-label {
          font-size: 13px;
          font-weight: 700;
          color: #14251a;
          letter-spacing: -0.01em;
        }

        .req-asterisk {
          color: #b91c1c;
          margin-left: 2px;
        }

        .industrial-input,
        .industrial-textarea {
          width: 100%;
          padding: 12px 14px;
          background: #faf9f7;
          border: 1px solid #d4d4d8;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          color: #18181b;
          box-sizing: border-box;
          transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        }

        .industrial-input:focus,
        .industrial-textarea:focus {
          outline: none;
          background: #ffffff;
          border-color: #14251a;
          box-shadow: 0 0 0 3px rgba(20, 37, 26, 0.08);
        }

        .industrial-input.is-invalid,
        .industrial-textarea.is-invalid {
          border-color: #dc2626;
          background: #fffafa;
        }

        .industrial-textarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.55;
        }

        .industrial-field-error {
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
          margin-top: 2px;
        }

        .industrial-whatsapp-block {
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: #faf8f5;
          border: 1px solid rgba(20, 37, 26, 0.07);
          border-radius: 10px;
        }

        .industrial-fieldset {
          border: none;
          padding: 0;
          margin: 0;
        }

        .industrial-legend {
          font-size: 13px;
          font-weight: 700;
          color: #14251a;
          margin-bottom: 10px;
          display: block;
        }

        .industrial-radio-row {
          display: flex;
          gap: 12px;
        }

        .industrial-radio-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border: 1px solid #d4d4d8;
          border-radius: 9999px;
          background: #ffffff;
          font-size: 13px;
          font-weight: 600;
          color: #3f3f46;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .industrial-radio-chip input[type="radio"] {
          margin: 0;
          cursor: pointer;
          accent-color: #14251a;
        }

        .industrial-radio-chip.is-checked {
          border-color: #14251a;
          background: #14251a;
          color: #f6eee4;
        }

        .industrial-conditional-field {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px dashed rgba(20, 37, 26, 0.1);
          animation: industrialFadeDown 0.25s ease-out;
        }

        @keyframes industrialFadeDown {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .industrial-server-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          font-size: 13px;
          font-weight: 600;
          margin-top: 1.5rem;
        }

        .industrial-submit-row {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
        }

        .industrial-submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 36px;
          border-radius: 9999px;
          background: #14251a;
          color: #f6eee4;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid #14251a;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px rgba(20, 37, 26, 0.16);
        }

        .industrial-submit-btn:hover:not(:disabled) {
          background: #233e2d;
          border-color: #233e2d;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(20, 37, 26, 0.24);
        }

        .industrial-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .industrial-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(246, 238, 228, 0.3);
          border-top-color: #f6eee4;
          border-radius: 50%;
          animation: industrialSpin 0.7s linear infinite;
        }

        @keyframes industrialSpin {
          to { transform: rotate(360deg); }
        }

        .industrial-success-box {
          background: #ffffff;
          border: 1px solid #bbf7d0;
          border-radius: 16px;
          padding: clamp(2rem, 5vw, 3.5rem);
          text-align: center;
          box-shadow: 0 8px 30px rgba(22, 101, 52, 0.06);
        }

        .industrial-success-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #f0fdf4;
          border: 1px solid #86efac;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }

        .industrial-success-message {
          margin: 0;
          font-size: clamp(16px, 1.8vw, 20px);
          font-weight: 700;
          color: #14532d;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .industrial-submit-row {
            justify-content: stretch;
          }
          .industrial-submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
