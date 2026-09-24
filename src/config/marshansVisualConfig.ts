/**
 * THE MARSHANS — VISUAL CONFIGURATION
 * ==========================================================
 * Central configuration for Home Hero Video, Hero Cloud Layer,
 * and Large Bottom Cloud Transition.
 *
 * Edit values here to adjust video playback, cloud geometry,
 * blur, depth parallax, and transition sizing without touching JSX.
 * ==========================================================
 */

export const HOME_HERO_CONFIG = {
  // ========================================================
  // 1. VIDEO CONFIGURATION
  // ========================================================
  video: {
    // Source path of the video asset
    src: '/assets/hero/home/hero-video.mp4',

    // Full viewport hero height
    height: '100vh',

    // How the video covers the viewport
    objectFit: 'cover' as const,
    objectPosition: 'center center',

    // Smooth transition scroll duration (ms) when HTML5 video ends
    transitionDuration: 1400,

    // Scroll distance factor for end-of-video auto-advance
    scrollDistance: 1,

    // Easing mode for camera travel feeling
    scrollEasing: 'easeOut',

    // Vertical camera parallax travel (px) while scrolling through video
    // Strictly 0 on horizontal axis (zero sideways movement)
    scrollIntensity: 25,
  },

  // ========================================================
  // 2. HERO VIDEO CLOUD (Atmospheric Cloud Layer OVER Video)
  // ========================================================
  videoCloud: {
    // Primary cloud asset positioned on top of the hero video
    src: '/assets/hero/home/cloud-home-primary.png',

    // Cloud width across viewport (vw, %, or px)
    width: '40vw',

    // Initial vertical top position
    top: '5%',

    // Horizontal alignment (keeps cloud horizontally centered at 50%)
    left: '80%',

    // Scale factor for optical depth
    scale: 1.15,

    // Gaussian blur filter for atmospheric depth (px)
    blur: '18px',

    // Transparency level (0 to 1)
    opacity: 0.95,

    // Movement speed multiplier (moves faster than bottom cloud for foreground depth)
    movementSpeed: 0.5,

    // Maximum downward movement distance (px) during camera descent
    movementDistance: 1000,

    // Layer stacking above video
    zIndex: 10,
  },

  // ========================================================
  // 3. BOTTOM CLOUD (Large Atmospheric Transition Cloud)
  // ========================================================
  bottomCloud: {
    // Secondary cloud asset filling the bottom transition area
    src: '/assets/hero/home/cloud-home-secondary.png',

    // Large cloud width to visually dominate and extend beyond viewport edges (increased by 60%: 220vw * 1.6 = 352vw)
    width: '352vw',
    height: 'auto',

    // Vertical top position within transition section (adjusted to show 60% more of cloud body)
    top: '-600%',

    // Horizontal alignment
    left: '0%',

    // Scale factor (increased by 60%: 1.2 * 1.6 = 1.92)
    scale: 1.92,

    // Gaussian blur filter
    blur: '12px',

    // Transparency level
    opacity: 1,

    // Slower movement speed multiplier for deep horizon layer
    movementSpeed: 0.2,

    // Layer stacking order
    zIndex: 2,
  },

  // ========================================================
  // 4. CLOUD TRANSITION SECTION (Real Document Flow)
  // ========================================================
  transition: {
    // Real document flow height on desktop
    height: '65vh',

    // Real document flow height on mobile screens (<= 768px)
    mobileHeight: '45vh',

    // Clean background
    background: '#ffffff',

    // Prevents wide cloud dimensions from causing horizontal scrollbars
    overflow: 'hidden' as const,
  }
};
