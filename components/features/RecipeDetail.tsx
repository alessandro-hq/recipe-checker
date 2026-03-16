import Image from "next/image";
import type { Recipe } from "@/types";
import FavouriteButton from "@/components/ui/FavouriteButton";

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TimeLabel({ minutes }: { minutes: number }) {
  let label: string;
  let bg: string;
  if (minutes <= 15) { label = "Quick"; bg = "#dcfce7"; }
  else if (minutes <= 60) { label = "Medium"; bg = "#fef9c3"; }
  else { label = "Long"; bg = "#fee2e2"; }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: bg, color: "#1a1a1a" }}
    >
      ⏱ {label} · {formatTime(minutes)}
    </span>
  );
}

function formatCategory(slug: string | null): string | null {
  if (!slug) return null;
  if (slug.startsWith("jc-")) {
    const name = slug.replace("jc-", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${name} (Julia Child)`;
  }
  return slug.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatArea(slug: string | null): string | null {
  if (!slug) return null;
  return slug.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseSteps(instructions: string, isJuliaChild: boolean): string[] {
  if (!isJuliaChild) {
    // Original behaviour for TheMealDB recipes (already well-formatted)
    return instructions
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== "STEP" && !/^\d+\.?$/.test(s));
  }

  // Julia Child: PDF text has line-wrapped sentences. Join continuation lines
  // into paragraphs, then use each paragraph as one step.
  const lines = instructions.split(/\r?\n/);
  const paragraphs: string[] = [];
  let current = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      // Blank line = paragraph break
      if (current) { paragraphs.push(current); current = ""; }
      continue;
    }
    if (!current) {
      current = line;
    } else {
      // If previous line ends with sentence-ending punctuation, start new paragraph
      const prevEndsWithPunct = /[.!?:;)]$/.test(current);
      // If this line starts with a capital or a number, it's likely a new sentence/paragraph
      const nextStartsNew = /^[A-Z0-9(]/.test(line) && prevEndsWithPunct;
      if (nextStartsNew) {
        paragraphs.push(current);
        current = line;
      } else {
        // Join as continuation (PDF line wrap)
        current = current + " " + line;
      }
    }
  }
  if (current) paragraphs.push(current);

  return paragraphs.filter(
    (p) => p.length > 15 && !/^\d+\.?$/.test(p) && p !== "STEP"
  );
}

export default function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const isJuliaChild = recipe.id?.startsWith("jc-") ?? false;
  const steps = recipe.instructions ? parseSteps(recipe.instructions, isJuliaChild) : [];

  const hasTime = recipe.prep_time_minutes != null && recipe.prep_time_minutes > 0;

  return (
    <article>
      {/* Hero */}
      <div className="relative w-full overflow-hidden" style={{ height: "60vh", minHeight: 320 }}>
        {recipe.thumbnail ? (
          <Image
            src={recipe.thumbnail}
            alt={recipe.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #2d2417 0%, #5c3d1e 50%, #8b5e3c 100%)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 60%)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 max-w-4xl">
          {(recipe.category || recipe.area) && (
            <p className="text-xs uppercase tracking-widest text-white/70 mb-3 font-medium">
              {[formatCategory(recipe.category), formatArea(recipe.area)].filter(Boolean).join(" · ")}
            </p>
          )}
          <h1
            className="text-3xl sm:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {recipe.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {hasTime && <TimeLabel minutes={recipe.prep_time_minutes!} />}
            {recipe.tags && recipe.tags.map((tag) => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/20 text-white">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute top-6 right-6">
          <FavouriteButton recipe={recipe} size="lg" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Ingredients */}
          <div className="lg:col-span-1">
            <h2
              className="text-xl font-semibold mb-6"
              style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
            >
              Ingredients
            </h2>
            <ul className="space-y-3">
              {recipe.recipe_ingredients.map((ri, i) => (
                <li
                  key={i}
                  className="flex gap-4 py-2 text-sm"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span className="w-24 shrink-0 font-medium" style={{ color: "var(--muted)" }}>
                    {ri.measure || "—"}
                  </span>
                  <span style={{ color: "var(--fg)" }}>{ri.display_name}</span>
                </li>
              ))}
            </ul>
            {recipe.youtube_url && (
              <a
                href={recipe.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z" />
                </svg>
                Watch on YouTube
              </a>
            )}
          </div>

          {/* Instructions */}
          <div className="lg:col-span-2">
            <h2
              className="text-xl font-semibold mb-6"
              style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
            >
              Instructions
            </h2>
            <ol className="space-y-6">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-5">
                  <span
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white mt-0.5"
                    style={{ background: "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-base leading-relaxed pt-1" style={{ color: "var(--fg)" }}>
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </article>
  );
}
