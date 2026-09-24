import React from 'react';
import type { CategoryMeta } from '../../../config/categoriesConfig';

export interface CollectionHeroProps {
  category: CategoryMeta;
  totalProducts?: number;
}

export default function CollectionHero({ category }: CollectionHeroProps) {
  return (
    <section className="collection-hero-banner" aria-label={`${category.name} Realm Hero Banner`}>
      <img
        src={category.heroImage}
        alt={`${category.name} — THE MARSHANS`}
        className="collection-hero-banner-img"
        loading="eager"
        decoding="async"
      />

      <style>{`
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
          height: auto;
          display: block;
          margin: 0;
          padding: 0;
          border: none;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>
    </section>
  );
}
