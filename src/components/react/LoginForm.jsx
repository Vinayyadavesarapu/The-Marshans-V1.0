import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle, sendResetPassword } from '../../lib/firebase/client';
import { addToCart } from '../../lib/api/cart';
import { getSafeRedirect } from '../../lib/auth/safeRedirect';
import { PENDING_CART_ITEM_KEY } from '../../lib/session/cache';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const getRedirect = () => {
    if (typeof window === 'undefined') return '/account';
    const params = new URLSearchParams(window.location.search);
    return getSafeRedirect(params.get('redirect'));
  };

  const postLoginRedirect = async () => {
    if (typeof window !== 'undefined') {
      try {
        const pendingRaw = sessionStorage.getItem(PENDING_CART_ITEM_KEY);
        if (pendingRaw) {
          const pendingItem = JSON.parse(pendingRaw);
          sessionStorage.removeItem(PENDING_CART_ITEM_KEY);
          await addToCart(pendingItem);
          window.location.href = '/cart';
          return;
        }
      } catch (err) {
        console.warn('Pending cart restoration notice:', err);
      }
    }
    window.location.href = getRedirect();
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      await postLoginRedirect();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please double check and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Access temporarily disabled due to many failed attempts. Try again later.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
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
      await postLoginRedirect();
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPass = async () => {
    if (!email) {
      setError('Please enter your email above first to reset your password.');
      return;
    }
    try {
      await sendResetPassword(email);
      setResetSent(true);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <span className="auth-badge">COLLECTOR ACCESS</span>
        <h2 className="auth-title">SIGN IN TO YOUR ACCOUNT</h2>
        <p className="auth-sub">Track order dispatches, manage custom 3D queues, and access priority drops.</p>
      </div>

      {error && <div className="auth-alert alert-error">{error}</div>}
      {resetSent && <div className="auth-alert alert-success">Password reset email sent! Please check your inbox.</div>}

      {/* Google Quick Sign-In */}
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
        <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </button>

      <div className="auth-divider">
        <span>OR WITH EMAIL</span>
      </div>

      <form onSubmit={handleEmailLogin} className="auth-form">
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collector@themarshans.shop"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="login-password">Password</label>
            <button type="button" onClick={handleForgotPass} className="forgot-pass-btn">
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="form-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary auth-submit-btn">
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-card-footer">
        <span>New to THE MARSHANS?</span>
        <a href="/register" className="auth-switch-link">Create an Account →</a>
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

        .alert-success {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
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

        .form-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-pass-btn {
          background: none;
          border: none;
          font-size: 12px;
          color: #71717a;
          cursor: pointer;
          padding: 0;
        }

        .forgot-pass-btn:hover {
          color: #111111;
          text-decoration: underline;
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
