import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HOME_CAROUSEL_IMAGES, type CarouselItem, type CarouselSlideData } from '../../config/homeCarousel';

interface HomeCarouselProps {
  images?: CarouselItem[];
  autoplayInterval?: number;
}

export default function HomeCarousel({
  images = HOME_CAROUSEL_IMAGES,
  autoplayInterval = 5500
}: HomeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = images.length;

  // Normalized slide objects
  const slides: CarouselSlideData[] = images.map((item, index) => {
    if (typeof item === 'string') {
      return {
        src: item,
        alt: `The Marshans Exhibition Item ${index + 1}`
      };
    }
    return item;
  });

  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentIndex(index);
    }
  };

  // Autoplay timer
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = setInterval(nextSlide, autoplayInterval);
    return () => clearInterval(timer);
  }, [isPaused, totalSlides, nextSlide, autoplayInterval]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (totalSlides <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  // Mobile touch / swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (deltaX > minSwipeDistance) {
      nextSlide();
    } else if (deltaX < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 1. GRACEFUL EMPTY STATE: 0 images
  if (totalSlides === 0) {
    return (
      <div className="home-carousel-wrapper" aria-label="Home Exhibition Carousel">
        <div className="carousel-empty-stage">
          <div className="empty-content">
            <span className="empty-tag">CURATED EXHIBITION</span>
            <h2 className="empty-title">THE MARSHANS VAULT</h2>
            <p className="empty-desc">
              Precision 3D artifacts and upcoming limited exhibition drops will be featured here. Explore our signature collector pieces below.
            </p>
            <div className="empty-accent-line" />
          </div>
        </div>

        <style>{`
          .home-carousel-wrapper {
            position: relative;
            width: 100%;
            max-width: 1440px;
            margin: 0 auto;
            padding: 0 1.5rem;
            box-sizing: border-box;
            overflow: hidden;
          }
          .carousel-empty-stage {
            width: 100%;
            min-height: 380px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #fafaf9 0%, #f4f4f5 100%);
            border-radius: 28px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            text-align: center;
            padding: 3rem 1.5rem;
            box-sizing: border-box;
          }
          .empty-content {
            max-width: 580px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .empty-tag {
            font-family: var(--font-sans, -apple-system, sans-serif);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #71717a;
            margin-bottom: 0.75rem;
          }
          .empty-title {
            font-family: var(--font-sans, -apple-system, sans-serif);
            font-size: clamp(1.75rem, 3.5vw, 2.5rem);
            font-weight: 800;
            letter-spacing: 0.12em;
            color: #09090b;
            margin: 0 0 1rem 0;
            text-transform: uppercase;
          }
          .empty-desc {
            font-family: var(--font-sans, -apple-system, sans-serif);
            font-size: 0.95rem;
            line-height: 1.6;
            color: #52525b;
            margin: 0 0 1.5rem 0;
          }
          .empty-accent-line {
            width: 48px;
            height: 2px;
            background: #18181b;
            border-radius: 2px;
            opacity: 0.3;
          }
          @media (max-width: 768px) {
            .home-carousel-wrapper {
              padding: 0 1rem;
            }
            .carousel-empty-stage {
              min-height: 280px;
              border-radius: 20px;
              padding: 2rem 1rem;
            }
          }
        `}</style>
      </div>
    );
  }

  // 2. ACTIVE CAROUSEL (1, 2, 3, 4, 5+ images)
  return (
    <div
      className="home-carousel-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      aria-label="Home Exhibition Carousel"
      aria-roledescription="carousel"
    >
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {slides.map((slide, index) => {
            const isCurrent = index === currentIndex;
            return (
              <div
                key={slide.src || index}
                className={`carousel-slide ${isCurrent ? 'is-active' : ''}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${totalSlides}`}
                aria-hidden={!isCurrent}
              >
                {slide.link ? (
                  <a href={slide.link} className="slide-link">
                    <img
                      src={slide.src}
                      alt={slide.alt || `Exhibition slide ${index + 1}`}
                      className="slide-image"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </a>
                ) : (
                  <div className="slide-inner">
                    <img
                      src={slide.src}
                      alt={slide.alt || `Exhibition slide ${index + 1}`}
                      className="slide-image"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Controls (Arrow buttons shown only when 2+ slides) */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              className="carousel-control-btn btn-prev"
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              className="carousel-control-btn btn-next"
              onClick={nextSlide}
              aria-label="Next slide"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Pagination Indicators (shown only when 2+ slides) */}
        {totalSlides > 1 && (
          <div className="carousel-indicators" role="tablist" aria-label="Slide indicators">
            {slides.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                role="tab"
                aria-selected={dotIndex === currentIndex}
                aria-label={`Go to slide ${dotIndex + 1}`}
                className={`indicator-dot ${dotIndex === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(dotIndex)}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .home-carousel-wrapper {
          position: relative;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 1.5rem;
          box-sizing: border-box;
          outline: none;
          overflow: hidden;
        }

        .carousel-viewport {
          position: relative;
          width: 100%;
          border-radius: 28px;
          overflow: hidden;
          background: #f4f4f5;
          aspect-ratio: 16 / 7;
          min-height: 320px;
          box-shadow: 0 12px 36px -10px rgba(0, 0, 0, 0.08);
        }

        .carousel-track {
          display: flex;
          width: 100%;
          height: 100%;
        }

        .carousel-slide {
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
          position: relative;
          box-sizing: border-box;
        }

        .slide-link, .slide-inner {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          text-decoration: none;
          color: inherit;
          overflow: hidden;
        }

        .slide-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .slide-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 2.5rem;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          z-index: 2;
        }

        .slide-badge {
          display: inline-block;
          background: #ffffff;
          color: #09090b;
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-bottom: 0.5rem;
        }

        .slide-title {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          font-weight: 800;
          letter-spacing: 0.08em;
          margin: 0 0 0.25rem 0;
          text-transform: uppercase;
        }

        .slide-subtitle {
          font-family: var(--font-sans, -apple-system, sans-serif);
          font-size: 0.95rem;
          opacity: 0.9;
          margin: 0;
          max-width: 600px;
        }

        .carousel-control-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: none;
          color: #09090b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          transition: all 0.2s ease;
        }

        .carousel-control-btn:hover {
          background: #ffffff;
          transform: translateY(-50%) scale(1.06);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        }

        .btn-prev {
          left: 1.25rem;
        }

        .btn-next {
          right: 1.25rem;
        }

        .carousel-indicators {
          position: absolute;
          bottom: 1.25rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 5;
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 9999px;
        }

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .indicator-dot.active {
          width: 24px;
          border-radius: 9999px;
          background: #ffffff;
        }

        @media (max-width: 768px) {
          .home-carousel-wrapper {
            padding: 0 1rem;
          }
          .carousel-viewport {
            border-radius: 20px;
            aspect-ratio: 16 / 9;
            min-height: 220px;
          }
          .carousel-control-btn {
            display: none;
          }
          .slide-caption {
            padding: 1.25rem;
          }
          .slide-title {
            font-size: 1.25rem;
          }
          .slide-subtitle {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
