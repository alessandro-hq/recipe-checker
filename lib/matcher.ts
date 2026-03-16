import { createSupabaseServerClient } from "./supabase";
import type { MatchResult } from "@/types";

// Common qualifiers to strip before matching
const STRIP_WORDS = [
  "fresh", "dried", "chopped", "diced", "sliced", "minced", "crushed",
  "large", "small", "medium", "whole", "ground", "frozen", "canned",
  "cooked", "raw", "organic", "boneless", "skinless",
];

// Simple plural → singular map for common ingredients
const SINGULAR_MAP: Record<string, string> = {
  tomatoes: "tomato", onions: "onion", potatoes: "potato", carrots: "carrot",
  mushrooms: "mushroom", lemons: "lemon", limes: "lime", oranges: "orange",
  apples: "apple", cloves: "clove", leaves: "leaf", peppers: "pepper",
  chilies: "chili", chillies: "chilli", eggs: "egg", beans: "bean",
  peas: "pea", seeds: "seed", nuts: "nut", herbs: "herb",
};

export function normaliseIngredient(raw: string): string {
  let name = raw.toLowerCase().trim();
  // Strip qualifiers
  STRIP_WORDS.forEach((word) => {
    name = name.replace(new RegExp(`\\b${word}\\b`, "g"), "").trim();
  });
  // Singularise
  const words = name.split(/\s+/);
  const singularised = words.map((w) => SINGULAR_MAP[w] ?? w);
  return singularised.join(" ").replace(/\s+/g, " ").trim();
}

export async function matchIngredients(rawIngredients: string[]): Promise<MatchResult[]> {
  const supabase = await createSupabaseServerClient();
  const normalised = rawIngredients.map(normaliseIngredient).filter(Boolean);

  if (normalised.length === 0) return [];

  // Step 1: resolve ingredient IDs — exact match first, then fuzzy fallback
  const { data: exactMatches } = await supabase
    .from("ingredients")
    .select("id, name")
    .in("name", normalised);

  // Fuzzy fallback for terms that didn't match exactly
  const exactNames = new Set((exactMatches ?? []).map((i) => i.name));
  const unmatched = normalised.filter((n) => !exactNames.has(n));

  let fuzzyMatches: { id: number; name: string }[] = [];
  for (const term of unmatched) {
    const { data } = await supabase
      .from("ingredients")
      .select("id, name")
      .ilike("name", `%${term}%`)
      .limit(3);
    if (data) fuzzyMatches = fuzzyMatches.concat(data);
  }

  const allIngredientIds = [
    ...(exactMatches ?? []).map((i) => i.id),
    ...fuzzyMatches.map((i) => i.id),
  ];

  if (allIngredientIds.length === 0) return [];

  // Step 2: count matching ingredients per recipe using RPC
  const { data: scores } = await supabase.rpc("match_recipes_by_ingredients", {
    ingredient_ids: allIngredientIds,
  });

  if (!scores || scores.length === 0) return [];

  // Fetch recipe details for the top 20 matches
  const recipeIds = scores.slice(0, 20).map((s: { recipe_id: string }) => s.recipe_id);
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area")
    .in("id", recipeIds);

  if (!recipes) return [];

  // Build results
  const scoreMap = new Map(
    scores.map((s: { recipe_id: string; match_count: number; match_percent: number; matched_ingredients: string[] }) => [s.recipe_id, s])
  );

  return recipes
    .map((r) => {
      const score = scoreMap.get(r.id) as {
        match_count: number;
        match_percent: number;
        matched_ingredients: string[];
      } | undefined;
      if (!score) return null;
      return {
        recipe: r,
        matchCount: score.match_count,
        matchPercent: Math.round(score.match_percent),
        matchedIngredients: score.matched_ingredients ?? [],
      };
    })
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.matchPercent - a.matchPercent || b.matchCount - a.matchCount);
}
