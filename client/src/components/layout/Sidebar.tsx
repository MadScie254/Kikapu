import { NavLink } from "react-router-dom";
import { ShoppingBasket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navConfig";
import { useAuth } from "@/context/AuthContext";

export function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShoppingBasket className="size-4.5" />
        </div>
        <span className="font-display text-lg font-bold">Kikapu</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-accent/12 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="size-[1.1rem]" />
            {item.label}
          </NavLink>
        ))}

        {user?.role === "admin" && (
          <NavLink
            to="/app/admin"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-accent/12 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <ShieldCheck className="size-[1.1rem]" />
            Admin
          </NavLink>
        )}
      </nav>
      <div className="p-4">
        <NavLink
          to="/app/scan"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
        >
          Scan a Receipt
        </NavLink>
      </div>
    </aside>
  );
}
