import React, { useState, useEffect } from 'react';

export interface GalleryItem {
  id: string | number;
  image_url: string;
  is_primary?: boolean | number;
  is_video?: boolean;
  video_url?: string;
  thumbnail_url?: string;
}

interface ProductGalleryProps {
  images: GalleryItem[];
  videoUrl?: string | null;
  productName: string;
  categoryName?: string;
  badge?: string | null;
  selectedColorImage?: string | null;
}

export default function ProductGallery({
  images = [],
  videoUrl = null,
  productName,
  categoryName,
  badge,
  selectedColorImage
}: ProductGalleryProps) {
  // Combine images and optional video item
  const allMedia: GalleryItem[] = [...images];
  if (videoUrl && !allMedia.some((m) => m.is_video)) {
    allMedia.push({
      id: 'product-video-main',
      image_url: images[0]?.image_url || '/assets/placeholders/product-placeholder.svg',
      is_video: true,
      video_url: videoUrl,
    });
  }

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // When selected color changes and has an associated image, jump to it
  useEffect(() => {
    if (!selectedColorImage) return;
    const matchIdx = allMedia.findIndex((m) => m.image_url === selectedColorImage);
    if (matchIdx > -1) {
      setSelectedIndex(matchIdx);
    }
  }, [selectedColorImage]);

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const activeMedia = allMedia[selectedIndex] || allMedia[0] || {
    id: 'placeholder',
    image_url: '/assets/placeholders/product-placeholder.svg',
    is_video: false
  };

  return (
    <div className="marshans-master-gallery">
      {/* LEFT: VERTICAL THUMBNAIL TRACK (DESKTOP) / HORIZONTAL (MOBILE) */}
      {allMedia.length > 1 && (
        <div className="gallery-thumbnail-rail" role="tablist" aria-label="Media thumbnails">
          {allMedia.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              role="tab"
              aria-selected={selectedIndex === idx}
              aria-label={`View item ${idx + 1}`}
              onClick={() => setSelectedIndex(idx)}
              className={`thumbnail-btn ${selectedIndex === idx ? 'active' : ''} ${item.is_video ? 'is-video-thumb' : ''}`}
            >
              <img src={item.image_url} alt="" className="thumb-img" />
              {item.is_video && (
                <div className="video-thumb-badge" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* RIGHT/MAIN: PRIMARY DISPLAY STAGE */}
      <div className="gallery-primary-stage">
        {activeMedia.is_video && activeMedia.video_url ? (
          <div className="video-player-container">
            <video
              src={activeMedia.video_url}
              controls
              autoPlay
              playsInline
              className="gallery-active-video"
            />
          </div>
        ) : (
          <div className="image-viewport-wrapper">
            <img
              key={activeMedia.image_url}
              src={activeMedia.image_url}
              alt={`${productName} curated frame ${selectedIndex + 1}`}
              className="gallery-active-image"
              loading="eager"
            />
          </div>
        )}

        {/* Editorial Pill Badges */}
        <div className="stage-overlay-badges">
          {badge && (
            <span className="curated-badge-tag">{badge}</span>
          )}
          {categoryName && !badge && (
            <span className="curated-category-tag">{categoryName}</span>
          )}
        </div>

        {/* Fullscreen Expand Action */}
        {!activeMedia.is_video && (
          <button
            type="button"
            className="stage-expand-btn"
            onClick={() => setIsFullscreen(true)}
            aria-label="Expand image fullscreen"
            title="View Fullscreen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isFullscreen && (
        <div
          className="fullscreen-lightbox-backdrop"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close fullscreen"
          >
            ✕
          </button>
          <div className="lightbox-content-box" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeMedia.image_url}
              alt={productName}
              className="lightbox-full-img"
            />
          </div>
        </div>
      )}

      <style>{`
        .marshans-master-gallery {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
          user-select: none;
        }

        /* Vertical Thumbnail Rail on Desktop */
        .gallery-thumbnail-rail {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
          max-height: 580px;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .gallery-thumbnail-rail::-webkit-scrollbar {
          display: none;
        }

        .thumbnail-btn {
          position: relative;
          width: 74px;
          height: 74px;
          border-radius: 14px;
          background: #f7f6f4;
          border: 2px solid transparent;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        .thumbnail-btn:hover {
          border-color: rgba(9, 9, 11, 0.35);
          transform: translateY(-2px);
        }

        .thumbnail-btn.active {
          border-color: #09090b;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .video-thumb-badge {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.45);
          border-radius: 12px;
        }

        /* Primary Image/Video Stage */
        .gallery-primary-stage {
          position: relative;
          flex: 1;
          aspect-ratio: 1 / 1.04;
          background: #f7f6f4;
          border-radius: 28px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
        }

        .image-viewport-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gallery-active-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .gallery-primary-stage:hover .gallery-active-image {
          transform: scale(1.035);
        }

        .video-player-container {
          width: 100%;
          height: 100%;
          background: #000000;
        }

        .gallery-active-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        /* Badges */
        .stage-overlay-badges {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          gap: 8px;
          z-index: 2;
          pointer-events: none;
        }

        .curated-badge-tag {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: #ffffff;
          color: #e11d48;
          padding: 6px 14px;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .curated-category-tag {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          color: #09090b;
          padding: 6px 14px;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        /* Expand Button */
        .stage-expand-btn {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #09090b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
          z-index: 2;
        }

        .stage-expand-btn:hover {
          background: #ffffff;
          transform: scale(1.08);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
        }

        /* Lightbox */
        .fullscreen-lightbox-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(9, 9, 11, 0.88);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          animation: fadeIn 0.2s ease;
        }

        .lightbox-close-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .lightbox-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .lightbox-content-box {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-full-img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        /* Mobile Layout */
        @media (max-width: 768px) {
          .marshans-master-gallery {
            flex-direction: column-reverse;
            gap: 16px;
          }
          .gallery-thumbnail-rail {
            flex-direction: row;
            width: 100%;
            overflow-x: auto;
            max-height: none;
            padding-bottom: 4px;
          }
          .thumbnail-btn {
            width: 64px;
            height: 64px;
            border-radius: 12px;
          }
          .gallery-primary-stage {
            border-radius: 20px;
            aspect-ratio: 1 / 1;
          }
          .stage-overlay-badges {
            top: 14px;
            left: 14px;
          }
          .curated-badge-tag, .curated-category-tag {
            font-size: 9px;
            padding: 5px 12px;
          }
          .stage-expand-btn {
            bottom: 14px;
            right: 14px;
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
