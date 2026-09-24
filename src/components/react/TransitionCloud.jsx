import React, { useEffect, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { HOME_HERO_CONFIG } from '../../config/marshansVisualConfig';

export default function TransitionCloud() {
  const containerRef = useRef(null);

  const { bottomCloud, transition } = HOME_HERO_CONFIG;

  // React Spring physics for smooth depth parallax
  const [{ progress }, api] = useSpring(() => ({
    progress: 0,
    config: {
      tension: 110,
      friction: 28,
      clamp: true,
      precision: 0.0005,
    },
  }));

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const winHeight = window.innerHeight || 1;
      
      // Calculate viewport progression through the transition section
      const visibleProgress = Math.min(Math.max((winHeight - rect.top) / (winHeight + rect.height), 0), 1);
      
      api.start({
        progress: visibleProgress,
        immediate: false,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [api]);

  // Secondary cloud depth transform: strictly vertical motion, no horizontal drift
  const cloudTransform = progress.to((p) => {
    const offset = (p - 0.5) * 50 * bottomCloud.movementSpeed;
    return `translate3d(-50%, ${offset}px, 0) scale(${bottomCloud.scale})`;
  });

  return (
    <div
      ref={containerRef}
      className="transition-cloud-container"
      style={{
        background: transition.background,
        overflow: transition.overflow,
      }}
    >
      {/* LARGE SECONDARY BOTTOM CLOUD */}
      <animated.img
        src={bottomCloud.src}
        alt=""
        aria-hidden="true"
        className="large-bottom-cloud-img"
        style={{
          top: bottomCloud.top,
          left: bottomCloud.left,
          width: bottomCloud.width,
          height: bottomCloud.height || 'auto',
          filter: `blur(${bottomCloud.blur})`,
          opacity: bottomCloud.opacity,
          zIndex: bottomCloud.zIndex,
          transform: cloudTransform,
        }}
      />

      <style>{`
        .transition-cloud-container {
          position: relative;
          width: 100vw;
          width: 100%;
          height: ${transition.height};
          margin: 0;
          padding: 0;
          border: none;
          border-radius: 0;
          outline: none;
          box-shadow: none;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          pointer-events: none;
          box-sizing: border-box;
        }

        .large-bottom-cloud-img {
          position: absolute;
          pointer-events: none;
          user-select: none;
          display: block;
          max-width: none;
          height: auto;
          will-change: transform, filter, opacity;
          transform-origin: center top;
          margin: 0;
          padding: 0;
          border: none;
          border-radius: 0;
          filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.04));
        }

        @media (max-width: 768px) {
          .transition-cloud-container {
            height: ${transition.mobileHeight};
          }
        }
      `}</style>
    </div>
  );
}
