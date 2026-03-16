/**
 * Seed Julia Child recipes from the extracted JSON into Supabase.
 * Run with: npx tsx scripts/seed_julia_child.ts
 *
 * Prerequisites:
 *   1. python3 scripts/extract_julia_child.py  (creates julia_child_recipes.json)
 *   2. NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load env
const envPath = path.join(process.cwd(), ".env.local");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : undefined });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface RawIngredient {
  display_name: string;
  measure: string;
}

interface RawRecipe {
  id: string;
  name: string;
  name_fr: string | null;
  name_en: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: null;
  youtube_url: null;
  tags: string[];
  source_url: null;
  ingredients: RawIngredient[];
  page: number;
}

// Map chapter names → category slugs we'll upsert
const CHAPTER_CATEGORIES: { slug: string; name: string; description: string }[] = [
  { slug: "jc-soups",       name: "Soups (Julia Child)",       description: "Soups from Mastering the Art of French Cooking" },
  { slug: "jc-sauces",      name: "Sauces (Julia Child)",      description: "Sauces from Mastering the Art of French Cooking" },
  { slug: "jc-eggs",        name: "Eggs (Julia Child)",        description: "Egg dishes from Mastering the Art of French Cooking" },
  { slug: "jc-entrees",     name: "Entrées (Julia Child)",     description: "Entrées from Mastering the Art of French Cooking" },
  { slug: "jc-fish",        name: "Fish (Julia Child)",        description: "Fish dishes from Mastering the Art of French Cooking" },
  { slug: "jc-poultry",     name: "Poultry (Julia Child)",     description: "Poultry from Mastering the Art of French Cooking" },
  { slug: "jc-meat",        name: "Meat (Julia Child)",        description: "Meat dishes from Mastering the Art of French Cooking" },
  { slug: "jc-vegetables",  name: "Vegetables (Julia Child)",  description: "Vegetable dishes from Mastering the Art of French Cooking" },
  { slug: "jc-cold-buffet", name: "Cold Buffet (Julia Child)", description: "Cold dishes from Mastering the Art of French Cooking" },
  { slug: "jc-desserts",    name: "Desserts (Julia Child)",    description: "Desserts from Mastering the Art of French Cooking" },
];

const CHAPTER_TO_SLUG: Record<string, string> = {
  "Soups":       "jc-soups",
  "Sauces":      "jc-sauces",
  "Eggs":        "jc-eggs",
  "Entrées":     "jc-entrees",
  "Fish":        "jc-fish",
  "Poultry":     "jc-poultry",
  "Meat":        "jc-meat",
  "Vegetables":  "jc-vegetables",
  "Cold Buffet": "jc-cold-buffet",
  "Desserts":    "jc-desserts",
};

async function ensureCategories() {
  console.log("Upserting Julia Child categories…");
  const { error } = await supabase.from("categories").upsert(
    CHAPTER_CATEGORIES.map((c) => ({ ...c, thumbnail: null })),
    { onConflict: "slug" }
  );
  if (error) console.error("  Category upsert error:", error.message);
  else console.log(`  ✓ ${CHAPTER_CATEGORIES.length} categories`);
}

async function ensureArea() {
  console.log("Ensuring French area exists…");
  const { error } = await supabase
    .from("areas")
    .upsert({ slug: "french", name: "French" }, { onConflict: "slug" });
  if (error) console.error("  Area upsert error:", error.message);
  else console.log("  ✓ French area");
}

async function upsertIngredient(name: string): Promise<number | null> {
  const normalised = name.trim().toLowerCase();
  if (!normalised) return null;

  const { data: existing } = await supabase
    .from("ingredients")
    .select("id")
    .eq("name", normalised)
    .single();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("ingredients")
    .insert({ name: normalised })
    .select("id")
    .single();

  if (error) {
    const { data: retry } = await supabase
      .from("ingredients")
      .select("id")
      .eq("name", normalised)
      .single();
    return retry?.id ?? null;
  }
  return data.id;
}

async function seedRecipe(recipe: RawRecipe): Promise<void> {
  const categorySlug = CHAPTER_TO_SLUG[recipe.category] ?? "jc-soups";

  // Upsert recipe row
  const { error: recipeErr } = await supabase.from("recipes").upsert(
    {
      id: recipe.id,
      name: recipe.name,
      category: categorySlug,
      area: "french",
      instructions: recipe.instructions,
      thumbnail: null,
      youtube_url: null,
      tags: recipe.tags,
      source_url: null,
    },
    { onConflict: "id" }
  );
  if (recipeErr) {
    console.warn(`  ⚠ Recipe ${recipe.id} error: ${recipeErr.message}`);
    return;
  }

  // Upsert ingredients
  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    const ingredientId = await upsertIngredient(ing.display_name);
    if (!ingredientId) continue;

    await supabase.from("recipe_ingredients").upsert(
      {
        recipe_id: recipe.id,
        ingredient_id: ingredientId,
        measure: ing.measure || null,
        display_name: ing.display_name,
        sort_order: i + 1,
      },
      { onConflict: "recipe_id, ingredient_id" }
    );
  }
}

async function main() {
  const jsonPath = path.join(process.cwd(), "scripts", "julia_child_recipes.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON not found: ${jsonPath}`);
    console.error("Run: python3 scripts/extract_julia_child.py");
    process.exit(1);
  }

  const recipes: RawRecipe[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`\n🌱 Seeding ${recipes.length} Julia Child recipes…\n`);

  await ensureCategories();
  await ensureArea();

  console.log(`\nSeeding recipes…`);
  const BATCH = 10;
  let done = 0;
  let failed = 0;

  for (let i = 0; i < recipes.length; i += BATCH) {
    const batch = recipes.slice(i, i + BATCH);
    await Promise.all(batch.map((r) => seedRecipe(r).catch(() => { failed++; })));
    done += batch.length;
    if (done % 100 === 0 || done === recipes.length) {
      console.log(`  ${done}/${recipes.length} processed…`);
    }
  }

  console.log(`\n✅ Done! ${recipes.length - failed} seeded, ${failed} failed`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
