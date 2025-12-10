import { cn } from "@/lib/utils";

export function Tabs({
  options,
  active,
  onChange,
}: {
  options: { label: string; value: string }[];
  active: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange?.(option.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition",
            active === option.value
              ? "bg-brand text-white shadow"
              : "text-slate-300 hover:bg-slate-800",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
