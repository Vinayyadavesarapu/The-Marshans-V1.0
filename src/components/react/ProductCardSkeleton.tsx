import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="product-card-skeleton" aria-hidden="true">
      {/* Image Stage Skeleton */}
      <div className="skeleton-image-stage">
        {/* Top-Left Category Badge Skeleton */}
        <div className="skeleton-badge shimmer" />
        {/* Top-Right Wishlist Button Skeleton */}
        <div className="skeleton-wishlist shimmer" />
      </div>

      {/* Lower Information Section Skeleton */}
      <div className="skeleton-info-panel">
        <div className="skeleton-title-row">
          <div className="skeleton-title shimmer" />
          <div className="skeleton-subtitle shimmer" />
        </div>

        <div className="skeleton-bottom-row">
          <div className="skeleton-left">
            <div className="skeleton-price shimmer" />
          </div>

          <div className="skeleton-cart-btn shimmer" />
        </div>
      </div>

      <style>{`
        .product-card-skeleton {
          position: relative;
          width: 100%;
          background: #ffffff;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.06), 0 4px 12px -2px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          pointer-events: none;
        }

        .skeleton-image-stage {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1.05;
          background: #f1f5f9;
          overflow: hidden;
          padding: 16px;
          box-sizing: border-box;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .skeleton-badge {
          width: 68px;
          height: 28px;
          border-radius: 9999px;
          background: #e2e8f0;
        }

        .skeleton-wishlist {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #e2e8f0;
        }

        .skeleton-info-panel {
          position: relative;
          background: #ffffff;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          margin-top: -14px;
          z-index: 2;
          padding: 22px 20px 22px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        .skeleton-title-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .skeleton-title {
          width: 65%;
          height: 22px;
          border-radius: 6px;
          background: #e2e8f0;
        }

        .skeleton-subtitle {
          width: 45%;
          height: 12px;
          border-radius: 4px;
          background: #e2e8f0;
        }

        .skeleton-bottom-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-top: 4px;
        }

        .skeleton-left {
          display: flex;
          flex-direction: column;
        }

        .skeleton-price {
          width: 90px;
          height: 24px;
          border-radius: 6px;
          background: #e2e8f0;
        }

        .skeleton-cart-btn {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #e2e8f0;
        }

        .shimmer {
          background: linear-gradient(
            90deg,
            #f1f5f9 0%,
            #e2e8f0 50%,
            #f1f5f9 100%
          );
          background-size: 200% 100%;
          animation: skeletonShimmer 1.8s ease-in-out infinite;
        }

        @keyframes skeletonShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 480px) {
          .product-card-skeleton {
            border-radius: 24px;
          }
          .skeleton-info-panel {
            padding: 16px 14px 16px 14px;
          }
          .skeleton-cart-btn {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
}
