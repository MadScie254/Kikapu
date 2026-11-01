import { Link } from "react-router-dom";
import { ShoppingBasket } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingBasket className="size-4" />
              </div>
              <span className="font-display text-base font-bold">Kikapu</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Every receipt has a story. Make yours add up.</p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { to: "/features", label: "Features" },
              { to: "/how-it-works", label: "How It Works" },
              { to: "/demo", label: "Try the Demo" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { to: "/about", label: "About" },
              { to: "/privacy", label: "Privacy" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { to: "/login", label: "Sign In" },
              { to: "/register", label: "Get Started" },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Kikapu. Built for Kenyan households.</p>
          <p>Made with care in Nairobi · KES by default</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
