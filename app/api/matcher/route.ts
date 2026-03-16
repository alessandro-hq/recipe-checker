import { NextRequest, NextResponse } from "next/server";
import { matchIngredients } from "@/lib/matcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ingredients: string[] = body.ingredients ?? [];

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "ingredients array is required" }, { status: 400 });
    }

    const results = await matchIngredients(ingredients);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Matcher error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
