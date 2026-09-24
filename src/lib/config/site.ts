/**
 * THE MARSHANS — Site Configuration & Store Metadata
 */

export const siteConfig = {
  name: "THE MARSHANS",
  tagline: "Made to be Discovered",
  description: "Cinematic & editorial 3D printed artifacts, ambient luminous sculptures, collectible figures, and precision utility objects.",
  storeId: 2,
  storeCode: "marshans",
  apiBaseUrl: import.meta.env.PUBLIC_API_BASE_URL || "https://api.chipakk.shop/api",
  
  // Configurable Mascot Asset
  mascot: {
    name: "Marshan Bot",
    src: "/assets/mascot/mascot-placeholder.svg",
    alt: "The Marshans Mascot"
  },

  // Cross-Store CHIPAKK Connection
  chipakkStore: {
    name: "CHIPAKK",
    href: import.meta.env.PUBLIC_CHIPAKK_URL || "https://chipakk.shop",
    description: "Custom Stickers & Print-on-Demand Merch"
  },

  // Rotating Universes System
  universes: [
    {
      id: "lumo",
      name: "Lumo",
      tagline: "Luminous Ambient Sculptures",
      href: "/shop?category=lumo",
      themeColor: "#0284c7"
    },
    {
      id: "fandom-tribe",
      name: "Fandom Tribe",
      tagline: "High-Detail Collectible Statues",
      href: "/shop?category=fandom-tribe",
      themeColor: "#9333ea"
    },
    {
      id: "minitales",
      name: "MiniTales",
      tagline: "Pocket-Sized Dioramas",
      href: "/shop?category=minitales",
      themeColor: "#be123c"
    },
    {
      id: "utility-co",
      name: "Utility Co.",
      tagline: "Precision Functional Engineering",
      href: "/shop?category=utility-co",
      themeColor: "#15803d"
    },
    {
      id: "darshanam",
      name: "Darshanam",
      tagline: "Sacred Cultural Architecture",
      href: "/shop?category=darshanam",
      themeColor: "#b45309"
    }
  ]
};
