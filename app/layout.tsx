import type { Metadata } from "next";
import Link from "next/link";
import { Film } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Memory",
  description: "A little more to love about your favorite film.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3 focus:text-black">Skip to content</a>
        <header className="site-shell flex h-20 items-center justify-between border-b border-white/10">
          <Link href="/" className="flex items-center gap-3" aria-label="Movie Memory home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#ed9d80]/40 bg-[#ed9d80]/10 text-[#f3a485]"><Film size={18} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className="text-[13px] font-bold tracking-[.02em]">movie memory<span className="text-[#f49a7a]">.</span></span>
          </Link>
          <span className="hidden text-[10px] font-bold tracking-[.2em] text-[#999ba4] uppercase sm:block">A little love for the movies</span>
        </header>
        {children}
        <footer className="site-shell movie-footer">
          <span><span aria-hidden="true">✦</span> Movie Memory</span>
          <span>A LITTLE MOVIE MAGIC, MADE FOR YOU <span aria-hidden="true">🍿</span></span>
        </footer>
      </body>
    </html>
  );
}
