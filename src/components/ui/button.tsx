import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "destructive";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-muted focus-visible:ring-2 focus-visible:ring-brand/70",
  ghost:
    "bg-transparent text-slate-200 hover:bg-slate-800/70 focus-visible:ring-2 focus-visible:ring-slate-700",
  outline:
    "border border-slate-700 text-slate-100 hover:bg-slate-800/60 focus-visible:ring-2 focus-visible:ring-slate-700",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[variant],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
