import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";
import RecipeGrid from "@/components/ui/RecipeGrid";
import CategoryBrowser from "@/components/features/CategoryBrowser";
import type { Category } from "@/types";

async function getFeaturedRecipes() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("recipes")
      .select("id, name, thumbnail, category, area, prep_time_minutes")
      .limit(8)
      .order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("categories")
      .select("slug, name, thumbnail, description")
      .order("name")
      .limit(12);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    getFeaturedRecipes(),
    getCategories(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="py-20 sm:py-32 text-center max-w-3xl mx-auto px-4">
        <p
          className="text-xs uppercase tracking-widest mb-4 font-medium"
          style={{ color: "var(--accent)" }}
        >
          Discover · Cook · Enjoy
        </p>
        <h1
          className="text-4xl sm:text-6xl font-bold leading-tight mb-6"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          What will you cook today?
        </h1>
        <p className="text-lg mb-10" style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 2.5rem" }}>
          Browse hundreds of recipes or tell us what&apos;s in your fridge — we&apos;ll find what you can make.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/recipes"
            className="px-8 py-3 rounded-full font-medium text-sm transition-opacity hover:opacity-80"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            Browse Recipes
          </Link>
          <Link
            href="/matcher"
            className="px-8 py-3 rounded-full font-medium text-sm transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
            }}
          >
            Match by Ingredients
          </Link>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <CategoryBrowser categories={categories} />
        </section>
      )}

      {/* Featured recipes */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="flex items-baseline justify-between mb-8">
            <h2
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
            >
              Featured Recipes
            </h2>
            <Link
              href="/recipes"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              View all →
            </Link>
          </div>
          <RecipeGrid recipes={featured} />
        </section>
      )}

      {/* Matcher promo */}
      <section
        className="mx-4 sm:mx-6 lg:mx-8 mb-24 rounded-2xl p-10 sm:p-16 text-center max-w-7xl xl:mx-auto"
        style={{ background: "var(--fg)", color: "var(--bg)" }}
      >
        <h2
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Have ingredients? We&apos;ll find your recipe.
        </h2>
        <p className="text-base mb-8 opacity-70 max-w-lg mx-auto">
          Tell us what&apos;s in your kitchen. Our ingredient matcher finds recipes ranked by how closely they match.
        </p>
        <Link
          href="/matcher"
          className="inline-block px-8 py-3 rounded-full font-medium text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--bg)", color: "var(--fg)" }}
        >
          Try the Matcher
        </Link>
      </section>
    </div>
  );
}
