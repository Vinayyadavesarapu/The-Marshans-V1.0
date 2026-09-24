import React, { useState, useEffect, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';

const SLIDES = [
  {
    id: 'slide-1',
    universe: 'LUMO UNIVERSE',
    title: 'ECLIPSE AMBIENT SCULPTURE',
    subtitle: 'Warm 2700K diffused luminescence through micro-textured translucent resin.',
    link: '/shop?category=lumo',
    cta: 'Discover Lumo',
    image: '/assets/carousel/home/poster-1.svg',
    accent: '#0284c7'
  },
  {
    id: 'slide-2',
    universe: 'FANDOM TRIBE',
    title: 'CHRONO MECHA TITAN',
    subtitle: '42 articulated micro-joints engineered in multi-tone structural polymer.',
    link: '/shop?category=fandom-tribe',
    cta: 'Explore Statues',
    image: '/assets/carousel/home/poster-2.svg',
    accent: '#9333ea'
  },
  {
    id: 'slide-3',
    universe: 'MINITALES',
    title: 'CYBERPUNK ALLEY NOCTURNE',
    subtitle: 'Hand-finished multi-layer miniature diorama with concealed optical conduits.',
    link: '/shop?category=minitales',
    cta: 'View MiniTales',
    image: '/assets/carousel/home/poster-3.svg',
    accent: '#be123c'
  },
  {
    id: 'slide-4',
    universe: 'DARSHANAM & UTILITY',
    title: 'SANCTUM GOPURAM & DESK GEAR',
    subtitle: 'Sacred architectural geometry meets precision modular engineering.',
    link: '/shop',
    cta: 'Explore Collection',
    image: '/assets/carousel/home/poster-4.svg',
    accent: '#b45309'
  }
];

export default function PosterCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Subtle auto-advance every 6s when not hovering
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const slide = SLIDES[current];

  // Smooth fade & scale spring animation
  const springProps = useSpring({
    to: { opacity: 1, transform: 'scale(1)' },
    from: { opacity: 0.65, transform: 'scale(1.02)' },
    reset: true,
    config: { tension: 180, friction: 22 }
  });

  return (
    <div
      className="carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Featured Drops Carousel"
    >
      <animated.div style={springProps} className="carousel-slide-stage">
        <img
          src={slide.image}
          alt={slide.title}
          className="carousel-poster-img"
        />

        <div className="carousel-overlay-content">
          <div className="carousel-content-box">
            <span className="carousel-universe-tag" style={{ color: slide.accent }}>
              <span className="carousel-tag-pip" style={{ backgroundColor: slide.accent }} />
              {slide.universe}
            </span>
            <h2 className="carousel-headline">{slide.title}</h2>
            <p className="carousel-description">{slide.subtitle}</p>
            <div className="carousel-cta-row">
              <a href={slide.link} className="btn btn-primary carousel-cta-btn">
                <span>{slide.cta}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
              <a href="/shop" className="btn btn-outline carousel-all-btn">
                All Artifacts
              </a>
            </div>
          </div>
        </div>
      </animated.div>

      {/* Carousel Navigation Controls */}
      <button
        type="button"
        onClick={prevSlide}
        className="carousel-nav-btn prev-btn"
        aria-label="Previous Slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={nextSlide}
        className="carousel-nav-btn next-btn"
        aria-label="Next Slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Indicator Dots / Progress Bar */}
      <div className="carousel-pagination">

        {SLIDES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrent(idx)}
            className={`carousel-dot ${idx === current ? 'active' : ''}`}
            aria-label={`Go to slide ${idx + 1}`}
          >
            <span className="dot-fill" style={{ backgroundColor: idx === current ? s.accent : 'rgba(0,0,0,0.2)' }} />
          </button>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .carousel-container {
          position: relative;
          width: 100vw;
          max-width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
        }

        .carousel-slide-stage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, opacity;
        }

        .carousel-poster-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          pointer-events: none;
        }

        .carousel-overlay-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1440px;
          height: 100%;
          padding: 0 clamp(24px, 5vw, 64px);
          display: flex;
          align-items: flex-end;
          padding-bottom: clamp(60px, 10vh, 120px);
        }

        .carousel-content-box {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: clamp(24px, 4vw, 40px);
          border-radius: 16px;
          max-width: 580px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .carousel-universe-tag {
          font-family: var(--font-sans, sans-serif);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .carousel-tag-pip {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .carousel-headline {
          font-family: var(--font-display, Impact, sans-serif);
          font-size: clamp(32px, 4.5vw, 56px);
          letter-spacing: 0.04em;
          line-height: 1.05;
          color: #09090b;
          margin: 0 0 12px 0;
          text-transform: uppercase;
        }

        .carousel-description {
          font-family: var(--font-sans, sans-serif);
          font-size: 14px;
          line-height: 1.6;
          color: #52525b;
          margin: 0 0 24px 0;
        }

        .carousel-cta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .carousel-cta-btn {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .carousel-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #18181b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .carousel-nav-btn:hover {
          background: #ffffff;
          transform: translateY(-50%) scale(1.08);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
        }

        .prev-btn {
          left: clamp(16px, 3vw, 40px);
        }

        .next-btn {
          right: clamp(16px, 3vw, 40px);
        }

        .carousel-pagination {
          position: absolute;
          bottom: 30px;
          right: clamp(24px, 5vw, 64px);
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .carousel-dot {
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
        }

        .dot-fill {
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.25s ease;
        }

        .carousel-dot.active .dot-fill {
          width: 24px;
          border-radius: 9999px;
        }

        @media (max-width: 768px) {
          .carousel-nav-btn {
            display: none;
          }

          .carousel-content-box {
            padding: 20px;
            margin-bottom: 24px;
          }

          .carousel-pagination {
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            right: auto;
          }
        }
      ` }} />
    </div>
  );
}
