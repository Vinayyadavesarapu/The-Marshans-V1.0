import React, { useState, useEffect } from 'react';
import SearchModal from './SearchModal.jsx';
import HeaderUserNav from './HeaderUserNav.jsx';
import CartBadge from './CartBadge.jsx';
import {
  RETAIL_NAV_ITEMS,
  getNavItems,
  getLogoHref,
  isCustomForgeOnly,
  type NavItem
} from '../../config/launchMode';

export type { NavItem } from '../../config/launchMode';
export const MAIN_NAV_ITEMS: NavItem[] = RETAIL_NAV_ITEMS;

export interface MarshansNavbarProps {
  /** Ignored: every page renders the same pill navbar. Kept so older call sites still type-check. */
  variant?: 'default' | 'pill';
}

export default function MarshansNavbar(_props: MarshansNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  const logoHref = getLogoHref();
  const navItems = getNavItems();

  // Resolved after hydration so the server-rendered markup stays identical
  useEffect(() => {
    setCurrentPath(window.location.pathname.replace(/\/+$/, '') || '/');
  }, []);

  const isActive = (href: string) => currentPath !== '' && (href === '/' ? currentPath === '/' : currentPath.startsWith(href));

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Handle Logo & Home link clicks smoothly
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isTargetPage = logoHref === '/'
      ? (window.location.pathname === '/' || window.location.pathname === '')
      : window.location.pathname.startsWith(logoHref);

    if (isTargetPage) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="marshans-navbar navbar--pill">
      <div className="navbar-container">
        {/* LEFT: MARSHANS LOGO */}
        <div className="navbar-left">
          <a
            href={logoHref}
            onClick={handleLogoClick}
            className="navbar-brand"
            aria-label={isCustomForgeOnly() ? 'THE MARSHANS Custom Forge' : 'THE MARSHANS Home'}
          >
            <span className="navbar-logo-badge">
              <img
                src="/assets/brand/the-marshans-logo.png"
                alt="THE MARSHANS"
                className="navbar-logo-img"
                width="180"
                height="34"
              />
            </span>
          </a>
        </div>

        {/* CENTER: DESKTOP NAVIGATION LINKS */}
        <nav className="navbar-center" aria-label="Main Navigation">
          <ul className="nav-links-list">
            {navItems.map((item) => (
              <li key={item.label} className="nav-item">
                <a
                  href={item.href}
                  className={`nav-link ${isActive(item.href) ? 'is-active' : ''}`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  onClick={item.label === 'Home' ? handleHomeClick : (item.href === logoHref ? handleLogoClick : undefined)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* RIGHT: SEARCH, ACCOUNT, CART, MOBILE BURGER */}
        <div className="navbar-right">
          <div className="action-item search-wrap">
            <SearchModal />
          </div>

          <div className="action-item user-wrap">
            <HeaderUserNav />
          </div>

          <div className="action-item cart-wrap">
            <CartBadge />
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE FULL-WIDTH DRAWER / PANEL */}
      <div
        className={`mobile-panel-backdrop ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />

      <div
        className={`mobile-panel-drawer ${mobileMenuOpen ? 'open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="mobile-panel-header">
          <a
            href={logoHref}
            className="mobile-drawer-brand"
            onClick={(e) => {
              setMobileMenuOpen(false);
              handleLogoClick(e);
            }}
          >
            <img
              src="/assets/brand/the-marshans-logo.png"
              alt="THE MARSHANS"
              className="navbar-logo-img"
              width="150"
              height="30"
            />
          </a>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="mobile-panel-nav" aria-label="Mobile Navigation">
          <ul className="mobile-links-list">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.label} className="mobile-link-item">
                  <a
                    href={item.href}
                    className={`mobile-nav-link ${active ? 'is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      if (item.label === 'Home') {
                        handleHomeClick(e);
                      } else if (item.href === logoHref) {
                        handleLogoClick(e);
                      }
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
            <li className="mobile-divider" role="separator" />
            <li className="mobile-link-item">
              <a
                href="/account"
                className="mobile-nav-link mobile-nav-account"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Account
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <style>{`
        .marshans-navbar {
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 50;
          background-color: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
          box-sizing: border-box;
        }

        .navbar-container {
          max-width: 1440px;
          margin: 0 auto;
          height: 68px;
          padding: 0 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          gap: 1.5rem;
        }

        /* Left: Logo */
        .navbar-left {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .navbar-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          line-height: 0;
        }

        .navbar-logo-img {
          height: 32px;
          width: auto;
          max-width: 140px;
          object-fit: contain;
          display: block;
          image-rendering: -webkit-optimize-contrast;
        }

        /* Center: Desktop Nav Links */
        .navbar-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .nav-links-list {
          display: flex;
          align-items: center;
          gap: 1.75rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-item {
          display: inline-block;
          margin: 0;
          padding: 0;
        }

        .nav-link {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #27272a;
          text-decoration: none;
          padding: 6px 2px;
          position: relative;
        }

        .nav-link:hover {
          color: #000000;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 1.5px;
          background-color: #09090b;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        /* Right: Actions */
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .action-item {
          display: flex;
          align-items: center;
        }

        .mobile-menu-toggle {
          display: none;
          background: transparent;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #18181b;
          border-radius: 8px;
          line-height: 0;
        }

        .mobile-menu-toggle:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        /* Mobile Drawer */
        .mobile-panel-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.4);
          z-index: 99;
          opacity: 0;
          pointer-events: none;
        }

        .mobile-panel-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-panel-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 85%;
          max-width: 380px;
          background-color: #ffffff;
          z-index: 100;
          transform: translateX(100%);
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .mobile-panel-drawer.open {
          transform: translateX(0);
        }

        .mobile-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .mobile-drawer-close {
          background: transparent;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #52525b;
          border-radius: 6px;
          line-height: 0;
        }

        .mobile-drawer-close:hover {
          color: #09090b;
          background-color: rgba(0, 0, 0, 0.05);
        }

        .mobile-panel-nav {
          padding: 1.25rem 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .mobile-links-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .mobile-link-item {
          width: 100%;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 16px;
          font-weight: 600;
          color: #18181b;
          text-decoration: none;
          padding: 12px 14px;
          border-radius: 10px;
        }

        .mobile-nav-link:hover, .mobile-nav-link:active {
          background-color: #f4f4f5;
          color: #000000;
        }

        .mobile-nav-link.is-active {
          background-color: #f4f4f5;
          color: #000000;
          font-weight: 700;
          border-left: 3px solid #1f1c18;
          padding-left: 11px;
        }

        .mobile-divider {
          height: 1px;
          background-color: rgba(0, 0, 0, 0.08);
          margin: 0.75rem 0;
        }

        .mobile-nav-account {
          color: #3f3f46;
          font-size: 15px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1100px) {
          .nav-links-list {
            gap: 1.15rem;
          }
          .nav-link {
            font-size: 13px;
          }
        }

        @media (max-width: 900px) {
          .navbar-center {
            display: none;
          }
          .mobile-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .navbar-container {
            height: 60px;
            padding: 0 1rem;
            gap: 0.5rem;
          }
          .navbar-logo-img {
            height: 26px;
            max-width: 120px;
          }
          .action-item.user-wrap {
            display: none; /* Accessible inside mobile drawer */
          }
        }

        /* ==========================================================
           PILL NAVBAR (every page) — original homepage reference structure:
           separate logo badge, all links inside one rounded pill,
           search / sign-in / cart as individual rounded controls.
           Flat neutral cream/white: no gradients, blur, gloss or shadows.
           The bar itself is transparent (no full-width background) and
           visually static: no transitions, transforms or entrance effects.
           Stickiness comes from the wrapper in Header.astro.
           ========================================================== */
        .navbar--pill {
          --ink: #1f1c18;
          --ink-soft: #4a453f;
          --surface: #fbf8f3;        /* soft cream, just lighter than the page */
          --surface-hover: #ffffff;
          --rim: rgba(31, 28, 24, 0.12);
          --rim-strong: rgba(31, 28, 24, 0.22);
          position: static; /* the sticky wrapper in Header.astro positions the bar */
          background: transparent;
          border-bottom: none;
          padding: 12px clamp(10px, 2vw, 24px);
        }

        /* global.css gives every link a colour/opacity transition; the navbar's links stay static */
        .marshans-navbar a {
          transition: none;
        }

        .navbar--pill .navbar-container {
          height: 64px;
          max-width: 1360px;
          padding: 0 14px 0 16px;
          background: transparent;
        }

        /* Separate logo on the left */
        .navbar--pill .navbar-logo-badge {
          display: inline-flex;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--rim);
          border-radius: 12px;
          padding: 6px 10px;
        }

        .navbar--pill .navbar-logo-img {
          height: 26px;
          max-width: 70px;
          mix-blend-mode: multiply; /* the logo file has an opaque white ground: let the cream surface show through */
        }

        .navbar--pill .navbar-brand:focus-visible,
        .navbar--pill .nav-link:focus-visible,
        .navbar--pill .mobile-menu-toggle:focus-visible,
        .navbar--pill .navbar-right a:focus-visible,
        .navbar--pill .navbar-right button:focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 3px;
          border-radius: 999px;
        }

        /* All seven links side by side inside one rounded pill */
        .navbar--pill .nav-links-list {
          gap: 2px;
          padding: 5px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--rim);
          box-shadow: none;
        }

        .navbar--pill .nav-link {
          display: inline-block;
          padding: 7px 13px;
          border: 1px solid transparent;
          border-radius: 999px;
          background: none;
          color: var(--ink-soft);
          font-size: 13px;
          font-weight: 600;
        }

        .navbar--pill .nav-link::after {
          display: none;
        }

        .navbar--pill .nav-link:hover {
          color: var(--ink);
          background: rgba(31, 28, 24, 0.05);
        }

        /* Active page: a clean white pill with a fine rim */
        .navbar--pill .nav-link.is-active {
          color: var(--ink);
          background: var(--surface-hover);
          border-color: var(--rim-strong);
          box-shadow: none;
        }

        .navbar--pill .navbar-right {
          gap: 8px;
        }

        /* Search / cart: rounded square controls; sign-in: rounded pill */
        .navbar--pill .header-icon-btn,
        .navbar--pill .user-avatar-btn,
        .navbar--pill .header-user-btn,
        .navbar--pill .mobile-menu-toggle {
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--rim);
          border-radius: 12px;
          box-shadow: none;
          min-width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          transition: none;
        }

        /* Controls come from SearchModal / HeaderUserNav / CartBadge, which carry their own hover lifts and count
           bump; inside the navbar they stay still */
        .navbar--pill .header-icon-btn:hover,
        .navbar--pill .user-avatar-btn:hover,
        .navbar--pill .cart-count-badge,
        .navbar--pill .cart-count-badge.bump {
          transform: none;
          transition: none;
        }

        .navbar--pill .header-icon-btn,
        .navbar--pill .user-avatar-btn,
        .navbar--pill .header-user-btn {
          display: inline-flex;
        }

        .navbar--pill .header-user-btn,
        .navbar--pill .user-avatar-btn {
          border-radius: 999px;
          padding: 0 12px;
        }

        .navbar--pill .header-icon-btn:hover,
        .navbar--pill .user-avatar-btn:hover,
        .navbar--pill .header-user-btn:hover,
        .navbar--pill .mobile-menu-toggle:hover {
          background: var(--surface-hover);
          border-color: var(--rim-strong);
        }

        .navbar--pill .navbar-right svg {
          stroke: currentColor;
        }

        .navbar--pill .header-user-btn,
        .navbar--pill .user-btn-label,
        .navbar--pill .user-name {
          color: var(--ink);
        }

        .navbar--pill .cart-count-badge {
          background-color: var(--ink);
          color: #ffffff;
          box-shadow: none;
        }

        @media (max-width: 1240px) {
          .navbar--pill .nav-link {
            padding: 7px 10px;
            font-size: 12.5px;
          }
        }

        @media (max-width: 640px) {
          .navbar--pill {
            padding: 8px 10px;
          }
          .navbar--pill .navbar-container {
            height: 56px;
            padding: 0 8px 0 10px;
          }
          .navbar--pill .navbar-logo-img {
            height: 22px;
          }
          .navbar--pill .header-icon-btn,
          .navbar--pill .mobile-menu-toggle {
            min-width: 38px;
            height: 38px;
          }
        }
      `}</style>
    </header>
  );
}
