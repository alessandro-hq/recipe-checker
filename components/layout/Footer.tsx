import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="mt-24 py-12 text-sm"
      style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span
          className="font-serif text-base font-medium"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          Recipe Checker
        </span>
        <nav className="flex gap-6">
          <Link href="/recipes" className="hover:text-[var(--fg)] transition-colors">Recipes</Link>
          <Link href="/matcher" className="hover:text-[var(--fg)] transition-colors">Ingredient Matcher</Link>
          <Link href="/favourites" className="hover:text-[var(--fg)] transition-colors">Favourites</Link>
        </nav>
        <p>Recipes via <a href="https://www.themealdb.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--fg)] transition-colors underline">TheMealDB</a></p>
      </div>
    </footer>
  );
}
