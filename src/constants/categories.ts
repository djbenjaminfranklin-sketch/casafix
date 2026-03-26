export const CATEGORIES = [
  { id: "plumbing", icon: "water", color: "#0284c7", bg: "#e0f2fe" },
  { id: "electrical", icon: "flash", color: "#d97706", bg: "#fef3c7" },
  { id: "locksmith", icon: "key", color: "#78716c", bg: "#f5f5f4" },
  { id: "heating", icon: "flame", color: "#ea580c", bg: "#fff7ed" },
  { id: "ac", icon: "snow", color: "#2563eb", bg: "#dbeafe" },
  { id: "pest", icon: "bug", color: "#65a30d", bg: "#ecfccb" },
  { id: "appliances", icon: "settings", color: "#7c3aed", bg: "#f5f3ff" },
  { id: "glazing", icon: "albums", color: "#0891b2", bg: "#cffafe" },
  { id: "smallworks", icon: "construct", color: "#b45309", bg: "#fef3c7" },
  { id: "pool", icon: "water", color: "#0891b2", bg: "#cffafe" },
  { id: "garden", icon: "leaf", color: "#16a34a", bg: "#dcfce7" },
  { id: "multimedia", icon: "phone-portrait", color: "#8b5cf6", bg: "#f5f3ff" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
