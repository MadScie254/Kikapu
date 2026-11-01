/** Core domain types shared between the client and the serverless API. */

export type UUID = string;

export type UserRole = "user" | "admin";

export interface PublicUser {
  id: UUID;
  email: string;
  displayName: string;
  role: UserRole;
  currency: string;
  monthlyBudgetMinor: number | null;
  onboardingCompletedAt: string | null;
  aiEnhancementOptIn: boolean;
  createdAt: string;
}

export interface Category {
  id: UUID;
  householdId: UUID;
  slug: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isOverall: boolean;
  isActive: boolean;
}

export interface Merchant {
  id: UUID;
  householdId: UUID;
  name: string;
  normalizedName: string;
  location: string | null;
}

export interface Product {
  id: UUID;
  householdId: UUID;
  canonicalName: string;
  categoryId: UUID | null;
}

export type ReceiptSource = "ocr" | "manual" | "ai" | "market";

export interface ReceiptItem {
  id: UUID;
  receiptId: UUID;
  productId: UUID | null;
  rawDescription: string;
  normalizedName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  categoryId: UUID | null;
  isUncertain: boolean;
}

export interface Receipt {
  id: UUID;
  householdId: UUID;
  merchantId: UUID | null;
  merchantNameRaw: string;
  purchasedAt: string; // ISO datetime
  receiptNumber: string | null;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  otherChargesMinor: number;
  totalMinor: number;
  printedTotalMinor: number | null;
  totalDiscrepancyMinor: number;
  paymentMethod: string | null;
  source: ReceiptSource;
  notes: string | null;
  rawOcrText: string | null;
  imageUrl: string | null;
  shoppingListId: UUID | null;
  possibleDuplicateOfId: UUID | null;
  createdAt: string;
  items: ReceiptItem[];
}

export interface Budget {
  id: UUID;
  householdId: UUID;
  categoryId: UUID | null; // null = overall household budget
  periodMonth: string; // "2026-11"
  amountMinor: number;
}

export interface ShoppingList {
  id: UUID;
  householdId: UUID;
  name: string;
  createdAt: string;
  completedAt: string | null;
  items: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: UUID;
  shoppingListId: UUID;
  name: string;
  quantity: number;
  estimatedPriceMinor: number | null;
  estimateSource: "historical" | "manual" | "none";
  purchased: boolean;
  sortOrder: number;
}

export interface AnalyticsSummary {
  periodStart: string;
  periodEnd: string;
  totalSpentMinor: number;
  todaySpentMinor: number;
  weekSpentMinor: number;
  monthSpentMinor: number;
  receiptCount: number;
  averageTransactionMinor: number;
  monthlyBudgetMinor: number | null;
  monthlyBudgetUsedRatio: number | null;
  dailyTrend: { date: string; totalMinor: number }[];
  categoryBreakdown: { categoryId: string; categoryName: string; color: string; totalMinor: number }[];
  topProducts: { productName: string; totalMinor: number; purchaseCount: number }[];
  storeBreakdown: { merchantName: string; totalMinor: number; visitCount: number }[];
}

export interface ApiError {
  error: string;
  message: string;
  fields?: Record<string, string>;
}
