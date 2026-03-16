"use client";
import { useState, useRef } from "react";
import type { MatchResult } from "@/types";
import Image from "next/image";
import Link from "next/link";
import MatchScore from "@/components/ui/MatchScore";
import FavouriteButton from "@/components/ui/FavouriteButton";

export default function IngredientMatcher() {
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addIngredient(raw: string) {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed || ingredients.includes(trimmed)) return;
    setIngredients((prev) => [...prev, trimmed]);
    setInput("");
    setResults(null);
  }

  function removeIngredient(name: string) {
    setIngredients((prev) => prev.filter((i) => i !== name));
    setResults(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addIngredient(input);
    }
    if (e.key === "Backspace" && !input && ingredients.length > 0) {
      setIngredients((prev) => prev.slice(0, -1));
    }
  }

  async function handleMatch() {
    if (ingredients.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Input area */}
      <div
        className="rounded-xl p-4 cursor-text"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {ingredients.map((ing) => (
            <span
              key={ing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
            >
              {ing}
              <button
                onClick={(e) => { e.stopPropagation(); removeIngredient(ing); }}
                className="opacity-50 hover:opacity-100 transition-opacity ml-0.5"
                style={{ lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) addIngredient(input); }}
            placeholder={ingredients.length === 0 ? "Type an ingredient and press Enter…" : "Add more…"}
            className="flex-1 min-w-[180px] outline-none bg-transparent text-sm py-1"
            style={{ color: "var(--fg)" }}
          />
        </div>
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Press Enter or comma to add each ingredient. Press Backspace to remove the last one.
      </p>

      <button
        onClick={handleMatch}
        disabled={ingredients.length === 0 || loading}
        className="mt-6 px-8 py-3 rounded-full font-medium text-sm transition-opacity disabled:opacity-40"
        style={{ background: "var(--fg)", color: "var(--bg)" }}
      >
        {loading ? "Matching…" : `Find recipes with ${ingredients.length || "your"} ingredient${ingredients.length !== 1 ? "s" : ""}`}
      </button>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--accent)" }}>{error}</p>
      )}

      {/* Results */}
      {results !== null && (
        <div className="mt-12">
          <h2
            className="text-2xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
          >
            {results.length > 0
              ? `${results.length} recipes match your ingredients`
              : "No matches found"}
          </h2>
          {results.length === 0 && (
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Try different ingredients or check for spelling.
            </p>
          )}
          <div className="mt-8 space-y-4">
            {results.map(({ recipe, matchCount, matchPercent, matchedIngredients }) => (
              <div
                key={recipe.id}
                className="flex gap-4 rounded-xl p-4 transition-shadow hover:shadow-md"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <Link href={`/recipes/${recipe.id}`} className="shrink-0">
                  <div className="relative rounded-lg overflow-hidden" style={{ width: 96, height: 72 }}>
                    <Image
                      src={recipe.thumbnail}
                      alt={recipe.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/recipes/${recipe.id}`}>
                    <h3
                      className="font-semibold text-base leading-snug hover:underline"
                      style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
                    >
                      {recipe.name}
                    </h3>
                  </Link>
                  {(recipe.category || recipe.area) && (
                    <p className="text-xs uppercase tracking-wider mt-1" style={{ color: "var(--muted)" }}>
                      {[recipe.category, recipe.area].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {matchedIngredients.map((ing) => (
                      <span
                        key={ing}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(200,64,30,0.08)",
                          color: "var(--accent)",
                          borderLeft: "2px solid var(--accent)",
                        }}
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                    {matchCount} of your ingredients matched
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <MatchScore percent={matchPercent} />
                  <div onClick={(e) => e.stopPropagation()}>
                    <FavouriteButton recipe={recipe} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
