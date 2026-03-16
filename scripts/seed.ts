/**
 * Recipe Checker — Supabase Seed Script
 *
 * Populates the database from TheMealDB free API.
 * Run once before deploying:
 *   npx ts-node --esm scripts/seed.ts
 *   OR: npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const BASE = "https://www.themealdb.com/api/json/v1/1";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function seedCategories() {
  console.log("Seeding categories…");
  const data = await fetchJSON(`${BASE}/categories.php`);
  const rows = (data.categories ?? []).map((c: {
    strCategory: string;
    strCategoryDescription: string;
    strCategoryThumb: string;
  }) => ({
    slug: c.strCategory.toLowerCase(),
    name: c.strCategory,
    description: c.strCategoryDescription,
    thumbnail: c.strCategoryThumb,
  }));
  const { error } = await supabase.from("categories").upsert(rows, { onConflict: "slug" });
  if (error) console.error("Categories error:", error.message);
  else console.log(`  ✓ ${rows.length} categories`);
  return rows.map((r: { name: string }) => r.name);
}

async function seedAreas() {
  console.log("Seeding areas…");
  const data = await fetchJSON(`${BASE}/list.php?a=list`);
  const rows = (data.meals ?? []).map((m: { strArea: string }) => ({
    slug: m.strArea.toLowerCase(),
    name: m.strArea,
  }));
  const { error } = await supabase.from("areas").upsert(rows, { onConflict: "slug" });
  if (error) console.error("Areas error:", error.message);
  else console.log(`  ✓ ${rows.length} areas`);
}

async function collectMealIds(categories: string[]): Promise<Set<string>> {
  console.log("Collecting meal IDs…");
  const ids = new Set<string>();
  for (const cat of categories) {
    try {
      const data = await fetchJSON(`${BASE}/filter.php?c=${encodeURIComponent(cat)}`);
      (data.meals ?? []).forEach((m: { idMeal: string }) => ids.add(m.idMeal));
    } catch (err) {
      console.warn(`  ⚠ Failed to fetch category ${cat}:`, err);
    }
    await sleep(50);
  }
  console.log(`  ✓ ${ids.size} unique meal IDs collected`);
  return ids;
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
    // Race condition — try select again
    const { data: retry } = await supabase
      .from("ingredients")
      .select("id")
      .eq("name", normalised)
      .single();
    return retry?.id ?? null;
  }
  return data.id;
}

async function seedMeal(id: string) {
  const data = await fetchJSON(`${BASE}/lookup.php?i=${id}`);
  const meal = data.meals?.[0];
  if (!meal) return;

  // Upsert recipe
  const tags = meal.strTags
    ? meal.strTags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : null;

  const { error: recipeError } = await supabase.from("recipes").upsert(
    {
      id: meal.idMeal,
      name: meal.strMeal,
      category: meal.strCategory || null,
      area: meal.strArea || null,
      instructions: meal.strInstructions || null,
      thumbnail: meal.strMealThumb || null,
      youtube_url: meal.strYoutube || null,
      tags,
      source_url: meal.strSource || null,
    },
    { onConflict: "id" }
  );
  if (recipeError) { console.warn(`  Recipe ${id} error:`, recipeError.message); return; }

  // Parse and upsert ingredients
  for (let i = 1; i <= 20; i++) {
    const displayName = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (!displayName) continue;

    const ingredientId = await upsertIngredient(displayName);
    if (!ingredientId) continue;

    await supabase.from("recipe_ingredients").upsert(
      {
        recipe_id: meal.idMeal,
        ingredient_id: ingredientId,
        measure: measure || null,
        display_name: displayName,
        sort_order: i,
      },
      { onConflict: "recipe_id, ingredient_id" }
    );
  }
}

async function seedMeals(ids: Set<string>) {
  console.log(`Seeding ${ids.size} meals (this takes ~3-5 minutes)…`);
  const all = Array.from(ids);
  const BATCH = 10;
  let done = 0;

  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    await Promise.all(batch.map((id) => seedMeal(id)));
    done += batch.length;
    if (done % 50 === 0 || done === all.length) {
      console.log(`  ${done}/${all.length} meals processed`);
    }
    await sleep(100);
  }
}

async function main() {
  console.log("🌱 Starting seed…\n");
  const categoryNames = await seedCategories();
  await seedAreas();
  const mealIds = await collectMealIds(categoryNames);
  await seedMeals(mealIds);
  console.log("\n✅ Seed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
