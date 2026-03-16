import { createSupabaseServerClient } from "@/lib/supabase";
import RecipeGrid from "@/components/ui/RecipeGrid";
import CategoryBrowser from "@/components/features/CategoryBrowser";
import PageWrapper from "@/components/layout/PageWrapper";
import type { Category, Area, TimeCategory } from "@/types";

export const metadata = {
  title: "All Recipes | Recipe Checker",
};

const TIME_RANGES: Record<TimeCategory, { min: number; max: number }> = {
  quick:  { min: 1,  max: 15  },
  medium: { min: 16, max: 60  },
  long:   { min: 61, max: 9999 },
};

async function getData(time?: TimeCategory) {
  const supabase = await createSupabaseServerClient();

  let recipesQuery = supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area, prep_time_minutes")
    .order("name");

  if (time && TIME_RANGES[time]) {
    const { min, max } = TIME_RANGES[time];
    recipesQuery = recipesQuery
      .gte("prep_time_minutes", min)
      .lte("prep_time_minutes", max);
  }

  const [recipesRes, catsRes, areasRes] = await Promise.all([
    recipesQuery,
    supabase.from("categories").select("slug, name, thumbnail, description").order("name"),
    supabase.from("areas").select("slug, name").order("name"),
  ]);

  return {
    recipes: recipesRes.data ?? [],
    categories: (catsRes.data ?? []) as Category[],
    areas: (areasRes.data ?? []) as Area[],
  };
}

interface Props {
  searchParams: Promise<{ time?: string }>;
}

export default async function RecipesPage({ searchParams }: Props) {
  const { time } = await searchParams;
  const activeTime = (time && ["quick", "medium", "long"].includes(time))
    ? (time as TimeCategory)
    : undefined;

  const { recipes, categories, areas } = await getData(activeTime);

  return (
    <PageWrapper className="py-12">
      <div className="mb-10">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          {activeTime ? `${activeTime.charAt(0).toUpperCase() + activeTime.slice(1)} Recipes` : "All Recipes"}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {recipes.length} recipes
        </p>
      </div>
      <div className="mb-10">
        <CategoryBrowser categories={categories} areas={areas} activeTime={activeTime} />
      </div>
      <RecipeGrid recipes={recipes} />
    </PageWrapper>
  );
}
