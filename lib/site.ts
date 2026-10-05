// Central place for brand copy and links.
// TODO: replace remaining placeholder URLs (site url, Grade Solution) before launch.
export const site = {
  name: "Grade Delusion™",
  tagline: "All students only have delusions.",
  description:
    "Grade Delusion™ is the funny, chaotic, overly-confident side of being a student. Student memes, a delusion generator and a (very unscientific) delusion test. 100% confidence. 0% evidence.",
  url: "https://gradedelusion.com",
  handle: "@gradedelusion",
  email: "gradedelusion.sg@gmail.com",
  gradeSolutionUrl: "https://gradesolution.com.sg",
  socials: {
    instagram: "https://www.instagram.com/gradedelusion/",
    youtube: "https://youtube.com/@gradesolutionsg",
    facebook: "https://www.facebook.com/profile.php?id=61595322110945",
  },
} as const;

export const navLinks = [
  { href: "#top", label: "Home" },
  { href: "#feed", label: "Memes" },
  { href: "#generator", label: "Generator" },
  { href: "#test", label: "The Test" },
  { href: "#about", label: "About" },
  { href: "#socials", label: "Socials" },
] as const;

export const slogans = [
  "100% confidence. 0% evidence.",
  "Dream big. Study later.",
  "Think you got an A? DELUSION.",
  "Academic confidence, questionable results.",
  "Your grades may vary. Your delusion won't.",
  "Where academic confidence meets academic reality.",
] as const;
