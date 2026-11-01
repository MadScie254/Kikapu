import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4 [&:has(svg)]:pl-11", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      warning: "border-warning/30 bg-warning/10 text-warning-foreground [&>svg]:text-warning",
      destructive: "border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive",
      success: "border-success/30 bg-success/10 text-success [&>svg]:text-success",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Alert({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)} {...props} />;
}
