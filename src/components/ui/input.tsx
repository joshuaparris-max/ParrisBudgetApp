import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100 placeholder:text-slate-400 shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
