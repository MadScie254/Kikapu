import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Wallet,
  ListChecks,
  Store,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/app/receipts", label: "Transactions", icon: Receipt },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/budgets", label: "Budgets", icon: Wallet },
  { to: "/app/shopping-lists", label: "Shopping Lists", icon: ListChecks },
  { to: "/app/stores", label: "Stores", icon: Store },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

export const MOBILE_PRIMARY: NavItem[] = [NAV_ITEMS[0], NAV_ITEMS[1]];
export const MOBILE_SECONDARY: NavItem[] = [NAV_ITEMS[3]];
export const MOBILE_MORE: NavItem[] = [NAV_ITEMS[2], NAV_ITEMS[4], NAV_ITEMS[5], NAV_ITEMS[6]];
