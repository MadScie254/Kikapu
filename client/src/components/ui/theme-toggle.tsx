import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

/**
 * Cycles light -> dark -> system -> light. Used on both the public
 * marketing site and the authenticated app shell so the control behaves
 * identically everywhere (consistency per nav-pattern guidance).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  const label =
    theme === "system"
      ? `Theme: matching your system (currently ${resolvedTheme}). Click to switch to light.`
      : theme === "light"
        ? "Theme: light. Click to switch to dark."
        : "Theme: dark. Click to switch to system default.";

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={label} title={label} className={className}>
      {theme === "system" ? (
        <Monitor className="size-[1.1rem]" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="size-[1.1rem]" />
      ) : (
        <Sun className="size-[1.1rem]" />
      )}
    </Button>
  );
}
