"use client";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useFavourites } from "@/hooks/useFavourites";

function NavbarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const { count } = useFavourites();

  useEffect(() => {
    if (pathname === "/search") {
      setQuery(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header
      style={{
        background: "var(--bg)",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "border-color 0.2s",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight shrink-0"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          Recipe Checker
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes…"
              className="w-full py-2 pl-4 pr-10 text-sm rounded-full border outline-none transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--fg)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>
        </form>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-6 text-sm shrink-0">
          <Link href="/recipes" style={{ color: "var(--muted)" }} className="hover:text-[var(--fg)] transition-colors">Browse</Link>
          <Link href="/matcher" style={{ color: "var(--muted)" }} className="hover:text-[var(--fg)] transition-colors">Matcher</Link>
          <Link
            href="/favourites"
            className="relative hover:opacity-80 transition-opacity"
            style={{ color: "var(--fg)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {count > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-semibold"
                style={{ background: "var(--accent)" }}
              >
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={
      <header style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }} className="sticky top-0 z-50 h-16" />
    }>
      <NavbarInner />
    </Suspense>
  );
}
