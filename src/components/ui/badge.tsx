import { cn } from "@/lib/utils";

export function Badge({
  children,
  intent = "default",
  className,
}: {
  children: React.ReactNode;
  intent?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const palette: Record<typeof intent, string> = {
    default: "bg-slate-800 text-slate-100",
    success: "bg-emerald-600/90 text-white",
    warning: "bg-amber-500/90 text-black",
    danger: "bg-rose-600/90 text-white",
  };
  return (
    <span
      className={cn(
        "chip border border-white/10 uppercase tracking-wide",
        palette[intent],
        className,
      )}
    >
      {children}
    </span>
  );
}
