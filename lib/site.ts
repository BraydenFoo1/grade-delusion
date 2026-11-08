// Central place for brand copy and links.
// TODO: replace remaining placeholder URLs (site url, Grade Solution) before launch.
export const site = {
  // Preferred site name for Google Search / link previews. Visible branding keeps the ™.
  name: "Grade Delusion",
  alternateName: "Grade Delusion™",
  tagline: "All students only have delusions.",
  // Home page <title>, og:title and twitter:title. Kept under ~60 characters so Google shows it in full.
  homeTitle: "Grade Delusion | Student Memes & Delusions",
  description:
    "Grade Delusion is a student meme, humour and interactive entertainment project: student memes, a delusion generator and a very unscientific delusion test.",
  url: "https://grade-delusion.vercel.app",
  handle: "@gradedelusion",
  email: "gradedelusion.sg@gmail.com",
  gradeSolutionName: "Grade Solution Learning Centre",
  gradeSolutionUrl: "https://gradesolution.com.sg",
  socials: {
    instagram: "https://www.instagram.com/gradedelusion/",
    youtube: "https://youtube.com/@gradesolutionsg",
    facebook: "https://www.facebook.com/profile.php?id=61595322110945",
  },
} as const;

/** Canonical home page URL (with trailing slash), used everywhere the home page is referenced. */
export const homeUrl = `${site.url}/`;

// Shown in the footer and legal pages. Empty fields are hidden automatically.
// TODO: fill in Grade Solution's registered details before launch.
export const business = {
  legalName: "Grade Solution",
  uen: "", // e.g. "202312345K"
  address: "", // registered business address (optional)
  dpoEmail: site.email, // data protection contact required under Singapore's PDPA
  country: "Singapore",
} as const;

export const legal = {
  lastUpdated: "7 November 2026",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const navLinks = [
  { href: "#top", label: "Home" },
  { href: "#feed", label: "Memes" },
  { href: "#generator", label: "Generator" },
  { href: "#test", label: "The Test" },
  { href: "#about", label: "About" },
  { href: "/community", label: "Community" },
  { href: "#socials", label: "Socials" },
] as const;

export const slogans = [
  "100% confidence. 0% evidence.",
  "Dream big. Study later.",
  "Think you got an A? DELUSION.",
  "Academic confidence, questionable results.",
  "Your grades may vary. Your delusion won't.",
  "Where academic confidence meets academic reality.",
  "Mr Jerry is probably responsible.",
] as const;
