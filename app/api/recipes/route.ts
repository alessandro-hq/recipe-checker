import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const category = searchParams.get("category");
  const area = searchParams.get("area");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("recipes")
    .select("id, name, thumbnail, category, area, prep_time_minutes", { count: "exact" })
    .order("name")
    .range(from, to);

  if (category) query = query.eq("category", category);
  if (area) query = query.eq("area", area);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}
