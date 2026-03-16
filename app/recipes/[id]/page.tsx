import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import RecipeDetail from "@/components/features/RecipeDetail";
import type { Metadata } from "next";
import type { Recipe } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getRecipe(id: string): Promise<Recipe | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("recipes")
    .select(`
      id, name, thumbnail, category, area,
      instructions, youtube_url, tags, source_url,
      recipe_ingredients (
        ingredient_id, measure, display_name, sort_order,
        ingredients ( name )
      )
    `)
    .eq("id", id)
    .single();

  if (!data) return null;
  if (data.recipe_ingredients) {
    data.recipe_ingredients.sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    );
  }
  return data as unknown as Recipe;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return { title: "Recipe Not Found | Recipe Checker" };
  return {
    title: `${recipe.name} | Recipe Checker`,
    description: `${recipe.category ?? ""} recipe from ${recipe.area ?? "around the world"}.`,
    openGraph: {
      images: [{ url: recipe.thumbnail }],
    },
  };
}

export default async function RecipePage({ params }: Props) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}
