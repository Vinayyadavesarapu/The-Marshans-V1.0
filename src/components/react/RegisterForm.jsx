import React, { useState } from 'react';
import { registerWithEmail, loginWithGoogle } from '../../lib/firebase/client';
import { updateProfile } from 'firebase/auth';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const user = await registerWithEmail(email, password);
      if (name.trim()) {
        await updateProfile(user, { displayName: name.trim() });
      }
      window.location.href = '/account';
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger combination.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      window.location.href = '/account';
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <span className="auth-badge">NEW COLLECTOR</span>
        <h2 className="auth-title">CREATE YOUR MARSHAN ID</h2>
        <p className="auth-sub">Unlock priority access to limited physical artifact drops, real-time print farm tracking, and saved addresses.</p>
      </div>

      {error && <div className="auth-alert alert-error">{error}</div>}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="google-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
          <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8 0-1 .1-1.9.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
        </svg>
        <span>{googleLoading ? 'Connecting to Google...' : 'Sign Up with Google'}</span>
      </button>

      <div className="auth-divider">
        <span>OR COMPLETE DETAILS</span>
      </div>

      <form onSubmit={handleRegister} className="auth-form">
        <div className="form-group">
          <label className="form-label" htmlFor="register-name">Full Name</label>
          <input
            id="register-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="register-email">Email Address</label>
          <input
            id="register-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collector@themarshans.shop"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="register-password">Password (min 6 characters)</label>
          <input
            id="register-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="register-confirm">Confirm Password</label>
          <input
            id="register-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="form-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary auth-submit-btn">
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-card-footer">
        <span>Already have a Marshan account?</span>
        <a href="/login" className="auth-switch-link">Sign In →</a>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: clamp(28px, 5vw, 44px);
          max-width: 480px;
          margin: 0 auto;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.05);
        }

        .auth-card-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .auth-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #71717a;
          text-transform: uppercase;
          display: block;
          margin-bottom: 8px;
        }

        .auth-title {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: 32px;
          letter-spacing: 0.05em;
          color: #09090b;
          margin: 0 0 8px 0;
        }

        .auth-sub {
          font-size: 13px;
          color: #71717a;
          line-height: 1.5;
          margin: 0;
        }

        .auth-alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .alert-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .google-btn {
          width: 100%;
          height: 48px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.15);
          font-family: var(--font-sans, sans-serif);
          font-size: 13px;
          font-weight: 700;
          color: #18181b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.15s ease;
        }

        .google-btn:hover {
          background: #f8fafc;
          border-color: #18181b;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 24px 0;
          position: relative;
        }

        .auth-divider::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: #f4f4f5;
        }

        .auth-divider span {
          position: relative;
          background: #ffffff;
          padding: 0 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #a1a1aa;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .auth-submit-btn {
          width: 100%;
          height: 48px;
          margin-top: 8px;
        }

        .auth-card-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f4f4f5;
          font-size: 13px;
          color: #71717a;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .auth-switch-link {
          font-weight: 700;
          color: #111111;
          text-decoration: underline;
        }
      ` }} />
    </div>
  );
}
