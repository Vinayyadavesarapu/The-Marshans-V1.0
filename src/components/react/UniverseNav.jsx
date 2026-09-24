import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

const UNIVERSES = [
  { id: 'lumo', name: 'Lumo', tagline: 'Ambient Illumination', href: '/shop?category=lumo', color: '#0284c7' },
  { id: 'fandom-tribe', name: 'Fandom Tribe', tagline: 'Articulated Statues', href: '/shop?category=fandom-tribe', color: '#9333ea' },
  { id: 'minitales', name: 'MiniTales', tagline: 'Pocket Worlds', href: '/shop?category=minitales', color: '#be123c' },
  { id: 'utility-co', name: 'Utility Co.', tagline: 'Modular Desk Gear', href: '/shop?category=utility-co', color: '#15803d' },
  { id: 'darshanam', name: 'Darshanam', tagline: 'Sacred Architecture', href: '/shop?category=darshanam', color: '#b45309' }
];

export default function UniverseNav() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // React Spring rotation transition (180° arc feel between left -> center -> right)
  const springStyle = useSpring({
    to: {
      transform: 'rotateY(0deg) scale(1)',
      opacity: 1
    },
    from: {
      transform: `rotateY(${direction * 90}deg) scale(0.95)`,
      opacity: 0.7
    },
    reset: true,
    config: { tension: 300, friction: 26 }
  });

  const selectUniverse = (index) => {
    if (index === activeIndex) {
      // If already active, direct navigate
      window.location.href = UNIVERSES[index].href;
      return;
    }
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + UNIVERSES.length) % UNIVERSES.length);
  };

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % UNIVERSES.length);
  };

  const activeUniverse = UNIVERSES[activeIndex];

  return (
    <nav className="universe-dock-nav" aria-label="Universes Navigation">
      {/* Step Left Arrow */}
      <button
        type="button"
        onClick={handlePrev}
        className="dock-arrow-btn"
        aria-label="Previous realm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Individual Selectable Universe Items */}
      <div className="dock-items-row">
        {UNIVERSES.map((u, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => selectUniverse(idx)}
              className={`universe-nav-item ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              {isActive ? (
                <animated.div style={springStyle} className="active-item-content">
                  <span className="active-dot" style={{ backgroundColor: u.color }} />
                  <span className="universe-name-text active-name">{u.name}</span>
                  <a href={u.href} className="enter-realm-link" title={`Enter ${u.name}`}>
                    →
                  </a>
                </animated.div>
              ) : (
                <span className="universe-name-text">{u.name}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step Right Arrow */}
      <button
        type="button"
        onClick={handleNext}
        className="dock-arrow-btn"
        aria-label="Next realm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .universe-dock-nav {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 4px 8px;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          perspective: 600px;
        }

        .dock-arrow-btn {
          background: none;
          border: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          color: #71717a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .dock-arrow-btn:hover {
          background: rgba(0, 0, 0, 0.06);
          color: #111111;
        }

        .dock-items-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .universe-nav-item {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 9999px;
          cursor: pointer;
          font-family: var(--font-sans, sans-serif);
          font-size: 12px;
          font-weight: 600;
          color: #71717a;
          letter-spacing: 0.02em;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
        }

        .universe-nav-item:hover {
          color: #111111;
          background: rgba(0, 0, 0, 0.04);
        }

        .universe-nav-item.is-active {
          background: #111111;
          color: #ffffff;
          padding: 6px 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .active-item-content {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .active-name {
          color: #ffffff;
          font-weight: 700;
        }

        .enter-realm-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
          line-height: 1;
          padding-left: 2px;
          transition: color 0.15s ease;
        }

        .enter-realm-link:hover {
          color: #ffffff;
        }

        @media (max-width: 960px) {
          .universe-dock-nav {
            overflow-x: auto;
            max-width: 90vw;
          }
          .universe-nav-item {
            padding: 5px 10px;
            font-size: 11px;
          }
        }
      ` }} />
    </nav>
  );
}
