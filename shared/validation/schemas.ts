import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: "Password must include at least one letter and one number",
  });

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "Enter your name").max(80),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  currency: z.string().length(3).default("KES"),
  monthlyBudgetMinor: z.number().int().min(0).nullable().optional(),
  selectedCategorySlugs: z.array(z.string()).max(20).optional(),
});

export const receiptItemInputSchema = z.object({
  id: z.string().optional(),
  rawDescription: z.string().trim().min(1).max(200),
  normalizedName: z.string().trim().min(1).max(200).optional(),
  quantity: z.number().positive().max(100000),
  unitPriceMinor: z.number().int().min(0),
  lineTotalMinor: z.number().int().min(0),
  categoryId: z.string().uuid().nullable().optional(),
  categorySlug: z.string().optional(),
  isUncertain: z.boolean().optional().default(false),
});

export const receiptInputSchema = z.object({
  merchantNameRaw: z.string().trim().min(1).max(150),
  purchasedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  receiptNumber: z.string().trim().max(100).nullable().optional(),
  subtotalMinor: z.number().int().min(0),
  discountMinor: z.number().int().min(0).default(0),
  taxMinor: z.number().int().min(0).default(0),
  otherChargesMinor: z.number().int().min(0).default(0),
  totalMinor: z.number().int().min(0),
  printedTotalMinor: z.number().int().min(0).nullable().optional(),
  paymentMethod: z.string().trim().max(40).nullable().optional(),
  source: z.enum(["ocr", "manual", "ai", "market"]).default("manual"),
  notes: z.string().trim().max(1000).nullable().optional(),
  rawOcrText: z.string().max(20000).nullable().optional(),
  imageBlobPath: z.string().max(300).nullable().optional(),
  shoppingListId: z.string().uuid().nullable().optional(),
  items: z.array(receiptItemInputSchema).min(1, "Add at least one item"),
  acknowledgeDuplicate: z.boolean().optional().default(false),
});

export const receiptUpdateSchema = receiptInputSchema.partial({ items: true }).extend({
  items: z.array(receiptItemInputSchema).optional(),
});

export const budgetInputSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM"),
  amountMinor: z.number().int().min(0),
});

export const shoppingListInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const shoppingListItemInputSchema = z.object({
  name: z.string().trim().min(1).max(150),
  quantity: z.number().positive().max(100000).default(1),
  estimatedPriceMinor: z.number().int().min(0).nullable().optional(),
  purchased: z.boolean().optional(),
});

export const userPreferencesUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  currency: z.string().length(3).optional(),
  monthlyBudgetMinor: z.number().int().min(0).nullable().optional(),
  aiEnhancementOptIn: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(40).default("Package"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#64748B"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReceiptInput = z.infer<typeof receiptInputSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
