import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
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

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Sort ingredients by sort_order
  if (data?.recipe_ingredients) {
    data.recipe_ingredients.sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    );
  }

  return NextResponse.json(data);
}
