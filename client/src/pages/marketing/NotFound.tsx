import { Link } from "react-router-dom";
import { ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <ShoppingBasket className="size-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">The page you're looking for doesn't exist, or may have moved.</p>
      <Button asChild className="mt-2">
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
}
