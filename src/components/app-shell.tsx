"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { BarChart3, BookOpen, Cog, Layers, ListOrdered, Upload } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/budget", label: "Budget", icon: Layers },
  { href: "/rules", label: "Rules", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Cog },
];

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string | null;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parris Family</p>
          <h1 className="text-2xl font-semibold text-white">Budget Keeper</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-800/60 px-4 py-2 text-sm text-slate-200">
            Signed in as <span className="font-semibold text-white">{userName ?? "Guest"}</span>
          </div>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand hover:text-white",
                isActive && "border-brand bg-brand/20 text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
