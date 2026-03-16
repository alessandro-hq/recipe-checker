import { createSupabaseServerClient } from "@/lib/supabase";
import RecipeGrid from "@/components/ui/RecipeGrid";
import CategoryBrowser from "@/components/features/CategoryBrowser";
import PageWrapper from "@/components/layout/PageWrapper";
import type { Category, Area } from "@/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("areas").select("name").eq("slug", slug).single();
  const name = data?.name ?? (slug.charAt(0).toUpperCase() + slug.slice(1));
  return { title: `${name} Cuisine | Recipe Checker` };
}

async function getData(slug: string) {
  const supabase = await createSupabaseServerClient();
  const [recipesRes, catsRes, areasRes] = await Promise.all([
    supabase.from("recipes").select("id, name, thumbnail, category, area, prep_time_minutes").eq("area", slug).order("name"),
    supabase.from("categories").select("slug, name, thumbnail, description").order("name"),
    supabase.from("areas").select("slug, name").order("name"),
  ]);
  return {
    recipes: recipesRes.data ?? [],
    categories: (catsRes.data ?? []) as Category[],
    areas: (areasRes.data ?? []) as Area[],
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const { recipes, categories, areas } = await getData(slug);
  const areaObj = areas.find((a) => a.slug === slug);
  const areaName = areaObj?.name ?? (slug.charAt(0).toUpperCase() + slug.slice(1));

  return (
    <PageWrapper className="py-12">
      <div className="mb-10">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          {areaName} Cuisine
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {recipes.length} recipes
        </p>
      </div>
      <div className="mb-10">
        <CategoryBrowser categories={categories} areas={areas} activeArea={slug} />
      </div>
      <RecipeGrid recipes={recipes} />
    </PageWrapper>
  );
}
