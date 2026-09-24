import React, { useState, useEffect } from 'react';
import SearchModal from './SearchModal.jsx';
import HeaderUserNav from './HeaderUserNav.jsx';
import CartBadge from './CartBadge.jsx';
import { markHomeIntroCompleted } from '../../lib/homeIntroState';

export interface NavItem {
  label: string;
  href: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/#home-navbar' },
  { label: 'LUMO', href: '/categories/lumo' },
  { label: 'Fandom Tribe', href: '/categories/fandom-tribe' },
  { label: 'Mini Tales', href: '/categories/minitales' },
  { label: 'Utility Co.', href: '/categories/utility-co' },
  { label: 'Darshanam', href: '/categories/darshanam' },
  { label: 'Custom Forge', href: '/custom-3d' },
];

export default function MarshansNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll for subtle shadow boundary
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Handle Home link click smoothly without hero flash
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    markHomeIntroCompleted();
    document.documentElement.classList.add('skip-home-hero');

    if (window.location.pathname === '/' || window.location.pathname === '') {
      e.preventDefault();
      const navbar = document.getElementById('home-navbar');
      const carousel = document.getElementById('home-carousel-section');
      const target = navbar || carousel;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <header className={`marshans-navbar ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* LEFT: MARSHANS LOGO */}
        <div className="navbar-left">
          <a
            href="/#home-navbar"
            onClick={handleHomeClick}
            className="navbar-brand"
            aria-label="THE MARSHANS Home"
          >
            <img
              src="/assets/brand/the-marshans-logo.png"
              alt="THE MARSHANS"
              className="navbar-logo-img"
              width="180"
              height="34"
            />
          </a>
        </div>

        {/* CENTER: DESKTOP NAVIGATION LINKS */}
        <nav className="navbar-center" aria-label="Main Navigation">
          <ul className="nav-links-list">
            {MAIN_NAV_ITEMS.map((item) => (
              <li key={item.label} className="nav-item">
                <a
                  href={item.href}
                  className="nav-link"
                  onClick={item.label === 'Home' ? handleHomeClick : undefined}
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
            href="/#home-carousel-section"
            className="mobile-drawer-brand"
            onClick={(e) => {
              setMobileMenuOpen(false);
              handleHomeClick(e);
            }}
          >
            <img
              src="/assets/branding/marshans-logo.png"
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
            {MAIN_NAV_ITEMS.map((item) => (
              <li key={item.label} className="mobile-link-item">
                <a
                  href={item.href}
                  className="mobile-nav-link"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (item.label === 'Home') {
                      handleHomeClick(e);
                    }
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
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
          transition: box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .marshans-navbar.is-scrolled {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
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
          transition: color 0.15s ease;
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
          transition: width 0.2s ease;
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
          transition: background-color 0.15s ease;
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
          transition: opacity 0.25s ease;
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
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .mobile-nav-link:hover, .mobile-nav-link:active {
          background-color: #f4f4f5;
          color: #000000;
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
      `}</style>
    </header>
  );
}
