import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getProducts, type Product } from '../../lib/api/products';
import { addToCart } from '../../lib/api/cart';
import { resolveImageUrl, DEFAULT_PRODUCT_PLACEHOLDER } from '../../lib/utils/media';

/**
 * THE MARSHANS — Homepage editorial showcase
 *
 * Real Store 2 products only. Products flagged `featured` in Admin are shown as "Featured"; otherwise the newest
 * products are shown as "New Arrivals" (no invented rankings, ratings or popularity). Best sellers have their own
 * section (HomeBestSellers) driven by the separate `is_best_seller` flag.
 * The lead product is the large centre card; the rest fan out left/right on desktop and scroll on mobile.
 * Each card gets its own choreography (float period, amplitude, tilt, light sweep, pedestal glow) so no two move alike.
 */

const MAX_ITEMS = 5;

// End stops are deep enough that, with the card's lower scrim, white card text meets WCAG AA (≥ 4.5:1) everywhere.
const CATEGORY_PALETTES: Record<string, { a: string; b: string }> = {
  lumo: { a: '#7cc8f5', b: '#1f4fc0' },
  'fandom-tribe': { a: '#c7b6fb', b: '#5a2fc2' },
  minitales: { a: '#f7b2cf', b: '#b01f5e' },
  'utility-co': { a: '#9be3ae', b: '#14633a' },
  darshanam: { a: '#fcd27a', b: '#ad3f0a' },
  'custom-3d': { a: '#d9d9de', b: '#4b4b55' },
  'custom-forge': { a: '#d9d9de', b: '#4b4b55' }
};
const DEFAULT_PALETTE = { a: '#d8d2c8', b: '#4a443b' };

// Per-slot choreography (cycled): float period (s), float amplitude (px), resting tilt (deg), phase delay (s),
// light-sweep delay (s). Deliberately irregular so the row never moves in unison.
const CHOREO = [
  { dur: 6.4, amp: 14, tilt: -1.6, delay: 0, sweep: 2.2 },
  { dur: 5.1, amp: 9, tilt: 2.1, delay: 0.9, sweep: 5.4 },
  { dur: 7.3, amp: 11, tilt: -2.4, delay: 0.35, sweep: 3.6 },
  { dur: 4.7, amp: 7, tilt: 1.3, delay: 1.5, sweep: 6.8 },
  { dur: 6.9, amp: 12, tilt: -1.1, delay: 0.6, sweep: 4.3 }
];

type CartState = 'idle' | 'adding' | 'added' | 'error';

export function pickShowcase(products: Product[]): { mode: 'featured' | 'new'; items: Product[] } {
  const featured = products.filter((p) => p.featured);
  if (featured.length > 0) return { mode: 'featured', items: featured.slice(0, MAX_ITEMS) };
  return { mode: 'new', items: products.slice(0, MAX_ITEMS) };
}

/** Desktop order: lead product in the centre, the rest alternating left/right outward. */
export function desktopOrder(count: number): number[] {
  const slots: number[] = [0];
  for (let rank = 1; rank < count; rank++) {
    if (rank % 2 === 1) slots.unshift(rank);
    else slots.push(rank);
  }
  const order: number[] = [];
  slots.forEach((rank, position) => { order[rank] = position + 1; });
  return order;
}

const formatPrice = (rupees: number) => `₹${Number(rupees || 0).toLocaleString('en-IN')}`;
const productHref = (p: Product) => `/product/${encodeURIComponent(p.slug || String(p.id))}/`;

export interface HomeShowcaseProps {
  initialProducts?: Product[];
}

export default function HomeShowcase({ initialProducts = [] }: HomeShowcaseProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [cartState, setCartState] = useState<Record<number, CartState>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const sectionRef = useRef<HTMLElement | null>(null);

  // Live Store 2 data replaces build-time data whenever the API answers
  useEffect(() => {
    let active = true;
    getProducts({ limit: 50 }).then((res) => {
      if (active && res.ok) setProducts(res.products);
    });
    return () => { active = false; };
  }, []);

  // Reveal choreography: only "arm" (hide) the cards if the section is still below the fold, so content that is
  // already on screen never flashes out, and server-rendered markup stays visible without JavaScript.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setVisible(true);
      return;
    }
    setArmed(true);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: '0px' }); // reveal as soon as the carousel enters the viewport
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { mode, items } = useMemo(() => pickShowcase(products), [products]);
  const order = useMemo(() => desktopOrder(items.length), [items.length]);

  if (items.length === 0) return null;

  const handleAdd = async (product: Product) => {
    if (cartState[product.id] === 'adding') return;
    setCartState((s) => ({ ...s, [product.id]: 'adding' }));
    const res = await addToCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      quantity: 1,
      imageUrl: resolveImageUrl(product.primary_image_url || product.images?.[0]?.image_url),
      material: product.materials?.[0]?.name,
      finishing: product.finishing_options?.[0]?.name
    });
    if (res?.requiresLogin) {
      // addToCart has stored the pending item; the existing login flow adds it after sign-in
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setCartState((s) => ({ ...s, [product.id]: res?.success ? 'added' : 'error' }));
    setTimeout(() => setCartState((s) => ({ ...s, [product.id]: 'idle' })), 2400);
  };

  const title = mode === 'featured' ? 'Featured' : 'New Arrivals';

  return (
    <section
      ref={sectionRef}
      id="home-showcase"
      className={`mh-show ${armed ? 'is-armed' : ''} ${visible ? 'is-visible' : ''}`}
      aria-labelledby="home-showcase-title"
    >
      <span className="mh-show__backword" aria-hidden="true">{mode === 'featured' ? 'FEATURED' : 'NEW ARRIVALS'}</span>

      <div className="mh-show__inner">
        <header className="mh-show__head">
          <div className="mh-show__tabs">
            <h2 id="home-showcase-title" className="mh-show__title">{title}</h2>
            <a href="/shop" className="mh-show__tab-link">Shop all</a>
          </div>
          <p className="mh-show__sub">
            {mode === 'featured'
              ? 'Pieces our studio is spotlighting right now.'
              : 'The latest artifacts to leave our print studio.'}
          </p>
        </header>

        <div className="mh-show__row" role="list">
          {items.map((product, rank) => {
            const choreo = CHOREO[rank % CHOREO.length];
            const palette = CATEGORY_PALETTES[product.category_slug] || DEFAULT_PALETTE;
            const featured = rank === 0;
            const state = cartState[product.id] || 'idle';
            const src = failedImages[product.id]
              ? DEFAULT_PRODUCT_PLACEHOLDER
              : resolveImageUrl(product.primary_image_url || product.images?.[0]?.image_url);
            const style = {
              '--o-desk': order[rank],
              '--o-mob': rank + 1,
              '--card-a': palette.a,
              '--card-b': palette.b,
              '--float-dur': `${choreo.dur}s`,
              '--float-amp': `${choreo.amp}px`,
              '--tilt': `${choreo.tilt}deg`,
              '--phase': `${choreo.delay}s`,
              '--sweep-delay': `${choreo.sweep}s`,
              '--enter-delay': `${rank * 90}ms`
            } as React.CSSProperties;

            return (
              <article
                key={product.id}
                role="listitem"
                className={`mh-card ${featured ? 'is-featured' : ''}`}
                style={style}
              >
                <a className="mh-card__media" href={productHref(product)} tabIndex={-1} aria-hidden="true">
                  <span className="mh-card__pedestal" />
                  <span className="mh-card__shadow" />
                  <span className="mh-card__window">
                    <img
                      src={src}
                      alt=""
                      width={600}
                      height={600}
                      loading={featured ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={() => setFailedImages((f) => ({ ...f, [product.id]: true }))}
                    />
                    <span className="mh-card__sweep" />
                  </span>
                </a>

                <div className="mh-card__body">
                  <span className="mh-card__eyebrow">{product.category_name}</span>
                  <h3 className="mh-card__name">
                    <a href={productHref(product)}>{product.name}</a>
                  </h3>
                  <div className="mh-card__foot">
                    <span className="mh-card__price">
                      {formatPrice(product.price)}
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <s className="mh-card__compare">{formatPrice(product.compare_at_price)}</s>
                      )}
                    </span>
                    <button
                      type="button"
                      className={`mh-card__cart is-${state}`}
                      onClick={() => handleAdd(product)}
                      disabled={state === 'adding'}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      {state === 'added' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="9" cy="21" r="1.4" /><circle cx="20" cy="21" r="1.4" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <span className="mh-card__status" role="status" aria-live="polite">
                    {state === 'added' ? 'Added to your bag' : state === 'error' ? 'Could not add — please try again' : ''}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        .mh-show {
          --mh-cream: #f6eee4;
          --mh-green: #2f6b45;
          position: relative;
          overflow: hidden;
          padding: clamp(8px, 2vw, 28px) 0 clamp(56px, 8vw, 110px);
          background:
            radial-gradient(60% 50% at 50% 62%, rgba(91, 148, 102, 0.16), transparent 70%),
            linear-gradient(to bottom, var(--mh-cream) 0%, #f3ede6 60%, #faf9f7 100%);
        }

        .mh-show__backword {
          position: absolute;
          left: 50%;
          top: clamp(64px, 9vw, 120px);
          translate: -50% 0;
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(88px, 17vw, 260px);
          line-height: 0.85;
          letter-spacing: 0.02em;
          white-space: nowrap;
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(47, 107, 69, 0.16);
          pointer-events: none;
          user-select: none;
        }

        /* Full-bleed section: only the heading keeps a readable column; the card row spans the full width */
        .mh-show__inner {
          position: relative;
          width: 100%;
        }

        .mh-show__head {
          max-width: 1360px;
          margin: 0 auto clamp(8px, 1vw, 16px);
          padding: 0 clamp(16px, 3vw, 32px);
        }

        .mh-show__tabs {
          display: flex;
          align-items: baseline;
          gap: clamp(18px, 3vw, 40px);
          flex-wrap: wrap;
        }

        .mh-show__title {
          margin: 0;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: clamp(30px, 4.4vw, 56px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #14251a;
        }

        .mh-show__tab-link {
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: clamp(16px, 1.8vw, 22px);
          font-weight: 600;
          color: #686d66; /* 4.6:1 on the cream background */
          text-decoration: none;
          transition: color 0.18s ease;
        }

        .mh-show__tab-link:hover { color: var(--mh-green); }

        .mh-show__sub {
          margin: 8px 0 0;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          font-size: 15px;
          color: #5f665e;
        }

        /* Desktop: 4 side cards (17.6%) + centre card (23%) + 4 gaps (1.4%) ≈ 99% of the row width, edge to edge.
           The row is a size container so every card dimension scales with the real row width (no 100vw scrollbar overflow). */
        .mh-show__row {
          container-type: inline-size;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 1.4cqw;
          /* room for the centre window, which rises 28% of its 23%-wide card above the card top (+ float) */
          padding: max(56px, 7.6vw) 0 0;
          box-sizing: border-box;
        }

        /* ---------- Card ---------- */
        .mh-card {
          --card-w: 17.6cqw;
          order: var(--o-desk);
          position: relative;
          flex: 0 0 var(--card-w);
          display: flex;
          flex-direction: column;
          padding: calc(var(--card-w) * 0.62) 16px 16px;
          border-radius: 34px 34px 30px 30px;
          background: linear-gradient(160deg, var(--card-a) 0%, var(--card-b) 92%);
          box-shadow: 0 22px 40px -18px color-mix(in srgb, var(--card-b) 70%, transparent);
          color: #ffffff;
          transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.45s ease, opacity 0.6s ease;
        }

        /* Lower scrim: keeps white text legible (AA) on the light ends of the category gradients */
        .mh-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(12, 10, 8, 0) 40%, rgba(12, 10, 8, 0.45) 100%);
          pointer-events: none;
        }

        .mh-card.is-featured::before {
          display: none;
        }

        .mh-card.is-featured {
          --card-w: 23cqw;
          padding-top: calc(var(--card-w) * 0.66);
          border-radius: 46px 46px 40px 40px;
          background:
            radial-gradient(90% 60% at 30% 10%, color-mix(in srgb, var(--card-a) 45%, transparent), transparent 70%),
            linear-gradient(165deg, #1d3a2a 0%, #0f1f17 100%);
          box-shadow: 0 34px 60px -24px rgba(15, 31, 23, 0.65);
        }

        .mh-card:hover {
          transform: translateY(-8px);
        }

        .mh-show.is-armed .mh-card {
          opacity: 0;
          transform: translateY(46px);
        }

        .mh-show.is-armed.is-visible .mh-card {
          opacity: 1;
          transform: none;
          transition-delay: var(--enter-delay);
        }

        .mh-show.is-armed.is-visible .mh-card:hover {
          transform: translateY(-8px);
          transition-delay: 0s;
        }

        /* Media: window floats above the card top; pedestal + shadow sit beneath and move independently */
        .mh-card__media {
          z-index: 2;
          position: absolute;
          left: 50%;
          top: calc(var(--card-w) * -0.28);
          width: calc(var(--card-w) * 0.82);
          aspect-ratio: 1 / 1;
          translate: -50% 0;
          display: block;
        }

        .mh-card__window {
          position: absolute;
          inset: 0;
          display: block;
          overflow: hidden;
          border-radius: 26px;
          background: #ffffff;
          box-shadow: 0 18px 30px -16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
          transform-origin: 50% 90%;
          animation: mh-float var(--float-dur) ease-in-out var(--phase) infinite;
          will-change: transform;
        }

        .mh-card.is-featured .mh-card__window {
          border-radius: 32px;
        }

        .mh-card__window img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8%;
          box-sizing: border-box;
          display: block;
          background: transparent;
          transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .mh-card:hover .mh-card__window img {
          transform: scale(1.05);
        }

        .mh-card__sweep {
          position: absolute;
          inset: -40% -60%;
          background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, 0.55) 50%, transparent 58%);
          transform: translateX(-60%);
          animation: mh-sweep 9s ease-in-out var(--sweep-delay) infinite;
          pointer-events: none;
          mix-blend-mode: soft-light;
        }

        .mh-card__pedestal {
          position: absolute;
          left: 50%;
          bottom: -14%;
          width: 78%;
          height: 16%;
          translate: -50% 0;
          border-radius: 50%;
          background: radial-gradient(closest-side, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 100%);
          animation: mh-pedestal calc(var(--float-dur) * 1.6) ease-in-out var(--phase) infinite;
        }

        .mh-card__shadow {
          position: absolute;
          left: 50%;
          bottom: -9%;
          width: 62%;
          height: 9%;
          translate: -50% 0;
          border-radius: 50%;
          background: radial-gradient(closest-side, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0));
          animation: mh-shadow var(--float-dur) ease-in-out var(--phase) infinite;
        }

        @keyframes mh-float {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--tilt)); }
          50% { transform: translate3d(0, calc(var(--float-amp) * -1), 0) rotate(calc(var(--tilt) * -0.6)); }
        }

        @keyframes mh-shadow {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(0.74); opacity: 0.45; }
        }

        @keyframes mh-pedestal {
          0%, 100% { opacity: 0.55; transform: scaleX(1); }
          50% { opacity: 0.9; transform: scaleX(1.08); }
        }

        @keyframes mh-sweep {
          0%, 70% { transform: translateX(-60%); }
          100% { transform: translateX(60%); }
        }

        /* Body */
        .mh-card__body {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
        }

        .mh-card__eyebrow {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.85;
        }

        .mh-card__name {
          margin: 0;
          font-family: var(--font-sans, 'Manrope', -apple-system, sans-serif);
          text-transform: none;
          font-size: clamp(14px, 1.05cqw, 20px);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }

        .mh-card.is-featured .mh-card__name {
          font-size: clamp(19px, 1.6cqw, 30px);
        }

        .mh-card__name a {
          color: inherit;
          text-decoration: none;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mh-card__name a::after {
          content: '';
          position: absolute;
          inset: 0;
        }

        .mh-card__name a:focus-visible {
          outline: none;
        }

        .mh-card:has(.mh-card__name a:focus-visible) {
          outline: 3px solid #fde68a;
          outline-offset: 4px;
        }

        .mh-card__foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 10px;
        }

        .mh-card__price {
          position: relative;
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.22);
          font-size: 14px;
          font-weight: 800;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .mh-card.is-featured .mh-card__price {
          font-size: 18px;
          padding: 12px 18px;
        }

        .mh-card__compare {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.7;
        }

        .mh-card__cart {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          color: #14251a;
          box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.5);
          transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        }

        .mh-card__cart:hover { transform: scale(1.08); }
        .mh-card__cart:focus-visible { outline: 3px solid #fde68a; outline-offset: 3px; }
        .mh-card__cart:disabled { cursor: progress; opacity: 0.75; }
        .mh-card__cart.is-added { background: #22c55e; color: #ffffff; }
        .mh-card__cart.is-error { background: #fee2e2; color: #b91c1c; }

        .mh-card.is-featured .mh-card__cart {
          width: 52px;
          height: 52px;
          background: #facc15;
          color: #1f2a1a;
        }

        .mh-card__status {
          min-height: 1em;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.9;
        }

        /* ---------- Tablet & mobile: horizontal, snap-scrolling row in rank order ---------- */
        @media (max-width: 1023px) {
          .mh-show__row {
            justify-content: flex-start;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x mandatory;
            /* full-bleed scroller; top padding leaves room for the product window breaking out of the card top */
            gap: 16px;
            padding: 96px 6vw 28px;
            margin: 0;
            scroll-padding-inline: 6vw;
            scrollbar-width: none;
          }

          .mh-show__row::-webkit-scrollbar { display: none; }

          .mh-card {
            order: var(--o-mob);
            --card-w: clamp(190px, 44vw, 240px);
            scroll-snap-align: center;
          }

          .mh-card.is-featured {
            --card-w: clamp(240px, 64vw, 300px);
          }

          .mh-show__head {
            margin-bottom: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mh-card,
          .mh-card__window img {
            transition: none;
          }
          .mh-card__window,
          .mh-card__shadow,
          .mh-card__pedestal,
          .mh-card__sweep {
            animation: none;
          }
          .mh-show.is-armed .mh-card {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}
