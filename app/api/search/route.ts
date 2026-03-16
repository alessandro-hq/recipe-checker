import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ data: [] });

  const supabase = await createSupabaseServerClient();

  // Full-text search first
  const { data: ftsResults } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area, prep_time_minutes")
    .textSearch("name", q, { type: "websearch" })
    .limit(24);

  if (ftsResults && ftsResults.length > 0) {
    return NextResponse.json({ data: ftsResults });
  }

  // Fallback: ILIKE
  const { data: likeResults, error } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area, prep_time_minutes")
    .ilike("name", `%${q}%`)
    .limit(24);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: likeResults ?? [] });
}
