import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  char,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  userAgent: text("user_agent"),
});

/** Generic sliding-window rate-limit ledger (e.g. "login:email@x.com", "upload:userId"). */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketKey: text("bucket_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byBucket: index("rate_limit_events_bucket_idx").on(t.bucketKey, t.createdAt),
  })
);

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("My Household"),
  currency: char("currency", { length: 3 }).notNull().default("KES"),
  monthlyBudgetMinor: integer("monthly_budget_minor"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"), // 'owner' | 'member'
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqMember: uniqueIndex("household_members_unique").on(t.householdId, t.userId),
  })
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"), // 'light' | 'dark' | 'system'
  aiEnhancementOptIn: boolean("ai_enhancement_opt_in").notNull().default(false),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("Package"),
    color: text("color").notNull().default("#64748B"),
    isDefault: boolean("is_default").notNull().default(false),
    isOverall: boolean("is_overall").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqSlug: uniqueIndex("categories_household_slug_unique").on(t.householdId, t.slug),
  })
);

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    location: text("location"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byHousehold: index("merchants_household_idx").on(t.householdId, t.normalizedName),
  })
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    canonicalName: text("canonical_name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byHousehold: index("products_household_idx").on(t.householdId, t.canonicalName),
  })
);

export const productAliases = pgTable(
  "product_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    aliasText: text("alias_text").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqAlias: uniqueIndex("product_aliases_unique").on(t.productId, t.normalizedAlias),
  })
);

export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shoppingListId: uuid("shopping_list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull().default("1"),
    estimatedPriceMinor: integer("estimated_price_minor"),
    estimateSource: text("estimate_source").notNull().default("none"), // 'historical' | 'manual' | 'none'
    purchased: boolean("purchased").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byList: index("shopping_list_items_list_idx").on(t.shoppingListId),
  })
);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id").references(() => merchants.id, { onDelete: "set null" }),
    merchantNameRaw: text("merchant_name_raw").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    receiptNumber: text("receipt_number"),
    subtotalMinor: integer("subtotal_minor").notNull().default(0),
    discountMinor: integer("discount_minor").notNull().default(0),
    taxMinor: integer("tax_minor").notNull().default(0),
    otherChargesMinor: integer("other_charges_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    printedTotalMinor: integer("printed_total_minor"),
    totalDiscrepancyMinor: integer("total_discrepancy_minor").notNull().default(0),
    paymentMethod: text("payment_method"),
    source: text("source").notNull().default("manual"), // 'ocr' | 'manual' | 'ai' | 'market'
    notes: text("notes"),
    rawOcrText: text("raw_ocr_text"),
    imageUrl: text("image_url"),
    imageBlobPath: text("image_blob_path"),
    shoppingListId: uuid("shopping_list_id").references(() => shoppingLists.id, { onDelete: "set null" }),
    possibleDuplicateOfId: uuid("possible_duplicate_of_id"),
    duplicateAcknowledged: boolean("duplicate_acknowledged").notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byHouseholdDate: index("receipts_household_date_idx").on(t.householdId, t.purchasedAt),
  })
);

export const receiptItems = pgTable(
  "receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    rawDescription: text("raw_description").notNull(),
    normalizedName: text("normalized_name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull().default("1"),
    unitPriceMinor: integer("unit_price_minor").notNull().default(0),
    lineTotalMinor: integer("line_total_minor").notNull().default(0),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    isUncertain: boolean("is_uncertain").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byReceipt: index("receipt_items_receipt_idx").on(t.receiptId),
  })
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    periodMonth: char("period_month", { length: 7 }).notNull(), // 'YYYY-MM'
    amountMinor: integer("amount_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqBudget: uniqueIndex("budgets_unique").on(t.householdId, t.categoryId, t.periodMonth),
  })
);

// ───────────────────────────── relations ─────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  householdMembers: many(householdMembers),
  preferences: one(userPreferences, { fields: [users.id], references: [userPreferences.userId] }),
}));

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  receipts: many(receipts),
  budgets: many(budgets),
  categories: many(categories),
  merchants: many(merchants),
  products: many(products),
  shoppingLists: many(shoppingLists),
}));

export const receiptsRelations = relations(receipts, ({ many, one }) => ({
  items: many(receiptItems),
  merchant: one(merchants, { fields: [receipts.merchantId], references: [merchants.id] }),
}));

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, { fields: [receiptItems.receiptId], references: [receipts.id] }),
  product: one(products, { fields: [receiptItems.productId], references: [products.id] }),
  category: one(categories, { fields: [receiptItems.categoryId], references: [categories.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ many }) => ({
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  list: one(shoppingLists, { fields: [shoppingListItems.shoppingListId], references: [shoppingLists.id] }),
}));
