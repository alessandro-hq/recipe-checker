/**
 * Parses time mentions from recipe instructions and updates prep_time_minutes in Supabase.
 * Run once after adding the prep_time_minutes column via SQL.
 *
 * Usage: npm run update-prep-times
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) { dotenv.config({ path: envPath }); } else { dotenv.config(); }

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function parseMinutes(instructions: string): number | null {
  if (!instructions) return null;
  const text = instructions.toLowerCase();
  let total = 0;

  const hourPattern = /(\d+(?:[.,]\d+)?)\s*hours?/g;
  let m;
  while ((m = hourPattern.exec(text)) !== null) {
    total += parseFloat(m[1].replace(",", ".")) * 60;
  }

  const minPattern = /(\d+)\s*[-–]\s*(\d+)\s*min(?:utes?|s)?|(\d+)\s*min(?:utes?|s)?/g;
  while ((m = minPattern.exec(text)) !== null) {
    if (m[1] && m[2]) {
      total += parseInt(m[2], 10); // upper bound of range
    } else if (m[3]) {
      total += parseInt(m[3], 10);
    }
  }

  if (total === 0) return null;
  return Math.min(Math.round(total), 300);
}

async function main() {
  console.log("Fetching recipes…");
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, instructions")
    .order("id");

  if (error || !recipes) {
    console.error("Failed to fetch recipes:", error);
    process.exit(1);
  }

  console.log(`Parsing times for ${recipes.length} recipes…`);
  let updated = 0;
  let skipped = 0;

  for (const recipe of recipes) {
    const minutes = parseMinutes(recipe.instructions ?? "");
    if (minutes !== null) {
      await supabase.from("recipes").update({ prep_time_minutes: minutes }).eq("id", recipe.id);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Done — ${updated} updated, ${skipped} skipped (no time found in instructions)`);
}

main();
