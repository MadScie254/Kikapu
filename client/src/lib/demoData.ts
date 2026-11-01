/**
 * Static, isolated demo fixture used ONLY by the public marketing site
 * (Home hero animation and /demo). Never touches the API or database —
 * clearly a sample, never confused with a real signed-in user's data.
 */
export const DEMO_RECEIPT_LINES = [
  "NAIVAS SUPERMARKET",
  "KILIMANI BRANCH",
  "TEL: 0700 000 000",
  "PIN: P000000000A",
  "------------------------------",
  "12/11/2026  18:42",
  "------------------------------",
  "COOKING OIL 2L        650.00",
  "MAIZE FLOUR 2KG  2 X  190.00  380.00",
  "MILK 500ML       3 X   65.00  195.00",
  "SUKUMA WIKI            40.00",
  "BATHING SOAP     2 X   85.00  170.00",
  "------------------------------",
  "SUBTOTAL             1,435.00",
  "VAT 16%                198.00",
  "TOTAL                1,435.00",
  "CASH                 1,500.00",
  "CHANGE                  65.00",
  "M-PESA REF: QGH7X9K2L1",
  "THANK YOU, SHOP AGAIN",
];

export const DEMO_ITEMS = [
  { name: "Cooking Oil 2L", quantity: 1, unitPriceMinor: 65000, lineTotalMinor: 65000, category: "Groceries" },
  { name: "Maize Flour 2Kg", quantity: 2, unitPriceMinor: 19000, lineTotalMinor: 38000, category: "Groceries" },
  { name: "Milk 500ml", quantity: 3, unitPriceMinor: 6500, lineTotalMinor: 19500, category: "Groceries" },
  { name: "Sukuma Wiki", quantity: 1, unitPriceMinor: 4000, lineTotalMinor: 4000, category: "Market" },
  { name: "Bathing Soap", quantity: 2, unitPriceMinor: 8500, lineTotalMinor: 17000, category: "Personal Care" },
];

export const DEMO_TOTAL_MINOR = DEMO_ITEMS.reduce((s, i) => s + i.lineTotalMinor, 0);

export const DEMO_WEEKLY_TREND = [
  { day: "Mon", totalMinor: 82000 },
  { day: "Tue", totalMinor: 0 },
  { day: "Wed", totalMinor: 143500 },
  { day: "Thu", totalMinor: 21000 },
  { day: "Fri", totalMinor: 0 },
  { day: "Sat", totalMinor: 214000 },
  { day: "Sun", totalMinor: DEMO_TOTAL_MINOR },
];

export const DEMO_CATEGORY_BREAKDOWN = [
  { name: "Groceries", totalMinor: 122500, color: "#10B981" },
  { name: "Personal Care", totalMinor: 17000, color: "#EC4899" },
  { name: "Open-Air Market", totalMinor: 4000, color: "#D97706" },
];

export const DEMO_MONTHLY_BUDGET_MINOR = 3_500_000;
export const DEMO_MONTH_SPENT_MINOR = 2_185_000;
