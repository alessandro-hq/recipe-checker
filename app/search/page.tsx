import { createSupabaseServerClient } from "@/lib/supabase";
import RecipeGrid from "@/components/ui/RecipeGrid";
import PageWrapper from "@/components/layout/PageWrapper";
import type { RecipeCard } from "@/types";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export function generateMetadata() {
  return { title: "Search | Recipe Checker" };
}

async function searchRecipes(q: string): Promise<RecipeCard[]> {
  const supabase = await createSupabaseServerClient();

  const { data: ftsResults } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area, prep_time_minutes")
    .textSearch("name", q, { type: "websearch" })
    .limit(24);

  if (ftsResults && ftsResults.length > 0) return ftsResults;

  const { data } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area, prep_time_minutes")
    .ilike("name", `%${q}%`)
    .limit(24);

  return data ?? [];
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results: RecipeCard[] = query.length >= 2 ? await searchRecipes(query) : [];

  return (
    <PageWrapper className="py-12">
      <div className="mb-10">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          {query.length >= 2 ? `Results for "${query}"` : "Search Recipes"}
        </h1>
        {query.length >= 2 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {results.length} recipe{results.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>
      {query.length >= 2 ? (
        <RecipeGrid recipes={results} />
      ) : (
        <p style={{ color: "var(--muted)" }}>Enter at least 2 characters to search.</p>
      )}
    </PageWrapper>
  );
}
