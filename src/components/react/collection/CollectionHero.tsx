import React from 'react';
import type { CategoryMeta } from '../../../config/categoriesConfig';

export interface CollectionHeroProps {
  category: CategoryMeta;
  totalProducts?: number;
}

/**
 * Category banner.
 * - Artwork banners render at their intrinsic ratio (width/height reserve the space, no cropping).
 * - Text-free plates (`heroOverlay`) render in a fixed responsive frame with only the category
 *   name and title on top; with no `heroImage` the frame falls back to a neutral CSS backdrop.
 */
export default function CollectionHero({ category }: CollectionHeroProps) {
  const overlay = category.heroOverlay;

  if (!overlay) {
    return (
      <section className="collection-hero-banner" aria-label={`${category.name} Realm Hero Banner`}>
        <h1 className="collection-hero-sr">{category.name} — {category.title}</h1>
        <img
          src={category.heroImage}
          alt={`${category.name} — THE MARSHANS`}
          width={category.heroImageSize?.width}
          height={category.heroImageSize?.height}
          className="collection-hero-banner-img"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <style>{HERO_STYLES}</style>
      </section>
    );
  }

  return (
    <section
      className={`collection-hero-banner has-overlay tone-${overlay} ${category.heroImage ? '' : 'is-neutral'}`}
      aria-label={`${category.name} Realm Hero Banner`}
      style={{ '--hero-accent': category.color } as React.CSSProperties}
    >
      {category.heroImage && (
        <img
          src={category.heroImage}
          alt=""
          width={category.heroImageSize?.width}
          height={category.heroImageSize?.height}
          className="collection-hero-plate"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}
      <div className="collection-hero-copy">
        <span className="collection-hero-eyebrow">THE MARSHANS</span>
        <h1 className="collection-hero-name">{category.name}</h1>
        <span className="collection-hero-rule" aria-hidden="true" />
        <p className="collection-hero-title">{category.title}</p>
      </div>
      <style>{HERO_STYLES}</style>
    </section>
  );
}

const HERO_STYLES = `
  .collection-hero-banner {
    width: 100%;
    position: relative;
    margin: 0;
    padding: 0;
    overflow: hidden;
    line-height: 0;
    box-sizing: border-box;
    background: transparent;
  }

  .collection-hero-banner-img {
    width: 100%;
    max-height: min(480px, 45vh);
    object-fit: cover;
    object-position: center;
    display: block;
    margin: 0;
    padding: 0;
    border: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .collection-hero-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  /* Text-free plate frame: fixed ratio per breakpoint so the copy never shifts layout */
  .collection-hero-banner.has-overlay {
    aspect-ratio: 12 / 5;
    max-height: 620px;
    display: flex;
    align-items: center;
    line-height: normal;
  }

  .collection-hero-plate {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }

  .collection-hero-banner.tone-light::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(90deg, rgba(4, 30, 60, 0.42) 0%, rgba(4, 30, 60, 0.16) 45%, rgba(4, 30, 60, 0) 70%);
    pointer-events: none;
  }

  /* Neutral backdrop when no plate exists: soft wall with diagonal light */
  .collection-hero-banner.is-neutral {
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 38%),
      linear-gradient(115deg, rgba(255, 255, 255, 0) 52%, rgba(255, 255, 255, 0.55) 64%, rgba(255, 255, 255, 0) 78%),
      linear-gradient(180deg, #f3f3ef 0%, #e6e8e2 100%);
  }

  .collection-hero-banner.is-neutral::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 18%;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.04) 100%);
    pointer-events: none;
  }

  .collection-hero-copy {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 clamp(20px, 5vw, 64px);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .collection-hero-eyebrow {
    font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .collection-hero-name {
    font-family: var(--font-display, 'Bebas Neue', Impact, sans-serif);
    font-size: clamp(56px, 9vw, 132px);
    font-weight: 400;
    line-height: 0.9;
    letter-spacing: 0.04em;
    margin: 10px 0 0 0;
  }

  .collection-hero-rule {
    display: block;
    width: 56px;
    height: 3px;
    border-radius: 2px;
    background: var(--hero-accent, #09090b);
    margin: 18px 0 14px 0;
  }

  .collection-hero-title {
    font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
    font-size: clamp(11px, 1.1vw, 14px);
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    margin: 0;
  }

  .collection-hero-banner.tone-light .collection-hero-copy {
    color: #ffffff;
    text-shadow: 0 2px 18px rgba(4, 30, 60, 0.35);
  }

  .collection-hero-banner.tone-light .collection-hero-rule {
    background: #ffffff;
  }

  .collection-hero-banner.tone-dark .collection-hero-copy {
    color: #1c1917;
  }

  @media (max-width: 900px) {
    .collection-hero-banner.has-overlay {
      aspect-ratio: 16 / 9;
    }
  }

  @media (max-width: 520px) {
    .collection-hero-banner.has-overlay {
      aspect-ratio: 4 / 3;
    }

    .collection-hero-title {
      letter-spacing: 0.2em;
      max-width: 260px;
      line-height: 1.6;
    }
  }
`;
