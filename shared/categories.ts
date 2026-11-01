/**
 * Default shopping category taxonomy. Seeded per-household on signup so
 * users can rename/add/deactivate without affecting other households.
 */
export interface CategoryDef {
  slug: string;
  name: string;
  icon: string; // lucide-react icon name
  color: string; // tailwind-ish hex for charts
  keywords: string[]; // used by the deterministic categorizer to guess a category from a product name
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    slug: "groceries",
    name: "Groceries & Food",
    icon: "ShoppingBasket",
    color: "#10B981",
    keywords: [
      "rice", "flour", "unga", "sugar", "sukari", "oil", "mafuta", "bread", "mkate",
      "milk", "maziwa", "egg", "mayai", "tea", "chai", "coffee", "kahawa", "salt", "chumvi",
      "beans", "maharagwe", "pasta", "spaghetti", "maize", "ugali", "cereal", "biscuit",
      "juice", "water", "maji", "soda", "vegetable", "tomato", "nyanya", "onion", "kitunguu",
      "sukuma", "cabbage", "kabichi", "potato", "viazi", "banana", "ndizi", "fruit",
    ],
  },
  {
    slug: "meat-fish",
    name: "Meat & Fish",
    icon: "Beef",
    color: "#F59E0B",
    keywords: ["beef", "nyama", "chicken", "kuku", "fish", "samaki", "pork", "mutton", "sausage", "bacon"],
  },
  {
    slug: "household",
    name: "Household Essentials",
    icon: "Home",
    color: "#64748B",
    keywords: [
      "soap", "sabuni", "detergent", "omo", "toothpaste", "tissue", "toilet paper",
      "paper towel", "bleach", "jik", "dishwash", "sponge", "bulb", "battery", "matchbox",
    ],
  },
  {
    slug: "personal-care",
    name: "Personal Care",
    icon: "Sparkles",
    color: "#EC4899",
    keywords: ["shampoo", "lotion", "deodorant", "razor", "pad", "diaper", "nappies", "sanitary", "cream", "perfume"],
  },
  {
    slug: "beverages",
    name: "Beverages",
    icon: "Cup",
    color: "#06B6D4",
    keywords: ["beer", "wine", "spirit", "whisky", "vodka", "soft drink", "energy drink"],
  },
  {
    slug: "electronics",
    name: "Electronics & Airtime",
    icon: "Smartphone",
    color: "#8B5CF6",
    keywords: ["airtime", "bundle", "data bundle", "charger", "cable", "battery pack"],
  },
  {
    slug: "clothing",
    name: "Clothing & Shoes",
    icon: "Shirt",
    color: "#F43F5E",
    keywords: ["shirt", "trouser", "dress", "shoe", "sock", "underwear"],
  },
  {
    slug: "transport",
    name: "Transport & Fuel",
    icon: "Car",
    color: "#14213D",
    keywords: ["fuel", "petrol", "diesel", "matatu", "uber", "bolt", "fare"],
  },
  {
    slug: "health",
    name: "Health & Pharmacy",
    icon: "Pill",
    color: "#22C55E",
    keywords: ["medicine", "tablet", "syrup", "painkiller", "panadol", "pharmacy", "vitamin"],
  },
  {
    slug: "market",
    name: "Open-Air Market",
    icon: "Carrot",
    color: "#D97706",
    keywords: [],
  },
  {
    slug: "other",
    name: "Other",
    icon: "Package",
    color: "#94A3B8",
    keywords: [],
  },
];

export function guessCategorySlug(productName: string): string {
  const name = productName.toLowerCase();
  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.keywords.some((kw) => name.includes(kw))) return cat.slug;
  }
  return "other";
}
