/**
 * THE MARSHANS — Home Carousel Configuration
 *
 * The number of slides is dynamically derived from HOME_CAROUSEL_IMAGES.length.
 * It automatically adapts to 0, 1, 2, 3, 4, 5+ images with zero code changes required.
 *
 * Image assets belong in:
 * public/assets/carousel/home/
 */

export interface CarouselSlideData {
  src: string;
  alt?: string;
  link?: string;
}

export type CarouselItem = string | CarouselSlideData;

export const HOME_CAROUSEL_IMAGES: CarouselItem[] = [
  {
    src: '/assets/carousel/home/slide-01.webp',
    alt: 'THE MARSHANS — Slide 1',
    link: '/categories/lumo'
  },
  {
    src: '/assets/carousel/home/slide-02.webp',
    alt: 'THE MARSHANS — Slide 2',
    link: '/categories/fandom-tribe'
  },
  {
    src: '/assets/carousel/home/slide-03.webp',
    alt: 'THE MARSHANS — Slide 3',
    link: '/categories/minitales'
  },
  {
    src: '/assets/carousel/home/slide-04.webp',
    alt: 'THE MARSHANS — Slide 4',
    link: '/categories/utility-co'
  }
];