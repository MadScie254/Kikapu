import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Camera, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY, MOBILE_SECONDARY, MOBILE_MORE } from "./navConfig";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.68rem] font-medium",
      isActive ? "text-accent" : "text-muted-foreground"
    );

  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass}>
            <item.icon className="size-5" />
            {item.label === "Overview" ? "Home" : item.label}
          </NavLink>
        ))}

        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={() => navigate("/app/scan")}
            aria-label="Scan a receipt"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft-lg ring-4 ring-background transition-transform active:scale-95"
          >
            <Camera className="size-6" />
          </button>
        </div>

        {MOBILE_SECONDARY.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass}>
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        ))}

        <button onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.68rem] font-medium text-muted-foreground">
          <MoreHorizontal className="size-5" />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pb-2">
            {MOBILE_MORE.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm font-medium"
              >
                <item.icon className="size-5 text-accent" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
