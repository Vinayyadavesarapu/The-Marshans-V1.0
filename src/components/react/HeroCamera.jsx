import React, { useEffect, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { HOME_HERO_CONFIG } from '../../config/marshansVisualConfig';
import { shouldSkipHomeHero, markHomeIntroCompleted } from '../../lib/homeIntroState';

export default function HeroCamera() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(true);
  const transitionInProgressRef = useRef(false);

  const { video, videoCloud } = HOME_HERO_CONFIG;

  // Immediately evaluate whether hero should run or skip
  useEffect(() => {
    if (shouldSkipHomeHero()) {
      setShouldRender(false);
      document.documentElement.classList.add('skip-home-hero');
    }
  }, []);

  // PART 2: Subtle cinematic React Spring animation for the primary cloud
  // Cloud starts slightly below/behind its normal position and gently moves upward into place
  const [cloudSpring] = useSpring(() => ({
    from: {
      y: 35,
      x: -6,
      opacity: 0.35,
      scale: 1.06
    },
    to: {
      y: 0,
      x: 0,
      opacity: videoCloud.opacity || 0.95,
      scale: videoCloud.scale || 1.15
    },
    config: {
      tension: 26,
      friction: 20,
      clamp: true
    }
  }), []);

  // Ensure video element autoplays reliably and native ended event is attached
  useEffect(() => {
    if (!shouldRender || shouldSkipHomeHero()) return;

    // Reset to top to guarantee no partial scroll visibility
    window.scrollTo(0, 0);

    // Apply scroll lock classes to html & body
    document.documentElement.classList.add('hero-scroll-locked');
    document.body.classList.add('hero-scroll-locked');

    // Prevent wheel, touchmove, and keyboard scrolling while hero plays
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventKeyScroll = (e) => {
      const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Space', ' ', 'Home', 'End', 'Tab'];
      if (keys.includes(e.key) || keys.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('wheel', preventScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
    window.addEventListener('keydown', preventKeyScroll, { capture: true });
    document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
    document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
    document.addEventListener('keydown', preventKeyScroll, { capture: true });

    const vid = videoRef.current;
    if (vid) {
      vid.muted = true;
      vid.defaultMuted = true;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Hero video play notice:', err);
        });
      }

      const onEndedHandler = () => {
        performOneWayTransition();
      };

      vid.addEventListener('ended', onEndedHandler);

      return () => {
        vid.removeEventListener('ended', onEndedHandler);
        document.documentElement.classList.remove('hero-scroll-locked');
        document.body.classList.remove('hero-scroll-locked');
        window.removeEventListener('wheel', preventScroll, { capture: true });
        window.removeEventListener('touchmove', preventScroll, { capture: true });
        window.removeEventListener('keydown', preventKeyScroll, { capture: true });
        document.removeEventListener('wheel', preventScroll, { capture: true });
        document.removeEventListener('touchmove', preventScroll, { capture: true });
        document.removeEventListener('keydown', preventKeyScroll, { capture: true });
      };
    }

    return () => {
      document.documentElement.classList.remove('hero-scroll-locked');
      document.body.classList.remove('hero-scroll-locked');
      window.removeEventListener('wheel', preventScroll, { capture: true });
      window.removeEventListener('touchmove', preventScroll, { capture: true });
      window.removeEventListener('keydown', preventKeyScroll, { capture: true });
      document.removeEventListener('wheel', preventScroll, { capture: true });
      document.removeEventListener('touchmove', preventScroll, { capture: true });
      document.removeEventListener('keydown', preventKeyScroll, { capture: true });
    };
  }, [shouldRender]);

  // Smooth one-way downward transition ONLY when video fires ended
  const performOneWayTransition = () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;

    // 1. Remove scroll-lock classes so content below becomes visible and document can scroll
    document.documentElement.classList.remove('hero-scroll-locked');
    document.body.classList.remove('hero-scroll-locked');

    // Remove the early blocking listeners
    if (typeof window !== 'undefined' && window.__marshans_block_scroll) {
      const bs = window.__marshans_block_scroll;
      const bk = window.__marshans_block_key;
      window.removeEventListener('wheel', bs, { capture: true });
      window.removeEventListener('touchmove', bs, { capture: true });
      window.removeEventListener('keydown', bk, { capture: true });
      document.removeEventListener('wheel', bs, { capture: true });
      document.removeEventListener('touchmove', bs, { capture: true });
      document.removeEventListener('keydown', bk, { capture: true });
    }

    // 2. Prevent user interaction from interrupting this automatic transition
    const blockInterrupt = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener('wheel', blockInterrupt, { passive: false, capture: true });
    window.addEventListener('touchmove', blockInterrupt, { passive: false, capture: true });
    window.addEventListener('keydown', blockInterrupt, { capture: true });

    // 3. Smooth programmatic transition down to #home-navbar
    const navbar = document.getElementById('home-navbar');
    const startY = window.scrollY || window.pageYOffset || 0;
    const targetY = navbar ? (navbar.getBoundingClientRect().top + startY) : window.innerHeight;
    const distance = targetY - startY;

    // Smooth and relatively quick transition (~650ms)
    const duration = 650;
    let startTime = null;

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easeInOutCubic curve
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      window.scrollTo(0, startY + (distance * ease));

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        // Transition finished!
        // Remove interrupt blockers
        window.removeEventListener('wheel', blockInterrupt, { capture: true });
        window.removeEventListener('touchmove', blockInterrupt, { capture: true });
        window.removeEventListener('keydown', blockInterrupt, { capture: true });

        // Mark intro completed for session
        markHomeIntroCompleted();

        // Completely collapse hero from document flow
        document.documentElement.classList.add('skip-home-hero');
        setShouldRender(false);

        // Instantly reset scroll to top so Home navbar is at the actual top of the page
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Video ended event listener: video itself triggers the transition
  const handleVideoEnded = () => {
    performOneWayTransition();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="hero-video-container"
    >
      {/* 1. HERO VIDEO LAYER */}
      <div className="hero-video-layer">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          playsInline
          preload="auto"
          loop={false}
          onEnded={handleVideoEnded}
          style={{
            objectFit: video.objectFit,
            objectPosition: video.objectPosition,
          }}
        >
          <source src={video.src} type="video/mp4" />
        </video>
      </div>

      {/* 2. ATMOSPHERIC CLOUD LAYER OVER VIDEO WITH REACT SPRING ANIMATION */}
      <animated.div
        className="hero-cloud-overlay-layer"
        style={{
          top: videoCloud.top,
          left: videoCloud.left,
          width: videoCloud.width,
          opacity: cloudSpring.opacity,
          transform: cloudSpring.y.to((y) => {
            const x = cloudSpring.x.get();
            const s = cloudSpring.scale.get();
            return `translate3d(calc(-50% + ${x}px), ${y}px, 0) scale(${s})`;
          }),
          filter: `blur(${videoCloud.blur})`,
          zIndex: videoCloud.zIndex,
        }}
        aria-hidden="true"
      >
        <img
          src={videoCloud.src}
          alt=""
          className="hero-atmospheric-cloud-img"
          loading="eager"
        />
      </animated.div>

      <style>{`
        .hero-video-container {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background-color: #000000;
          margin: 0;
          padding: 0;
          border: none;
          border-radius: 0;
        }

        .hero-video-layer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
          margin: 0;
          padding: 0;
          border: none;
        }

        .hero-video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center center;
          border: none;
          outline: none;
          margin: 0;
          padding: 0;
        }

        .hero-cloud-overlay-layer {
          position: absolute;
          pointer-events: none;
          user-select: none;
          will-change: transform, opacity;
          transform-origin: center center;
          margin: 0;
          padding: 0;
          border: none;
        }

        .hero-atmospheric-cloud-img {
          width: 100%;
          height: auto;
          display: block;
          filter: drop-shadow(0 20px 35px rgba(0, 0, 0, 0.04));
          margin: 0;
          padding: 0;
          border: none;
        }

        @media (max-width: 768px) {
          .hero-cloud-overlay-layer {
            width: 150vw !important;
          }
        }
      `}</style>
    </div>
  );
}
