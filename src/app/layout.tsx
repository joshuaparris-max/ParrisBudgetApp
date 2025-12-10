import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Josh & Kristy Budget Keeper",
  description:
    "A private budgeting web app for the Parris family with rollover, imports, and simple traffic lights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased bg-surface text-slate-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
