"use client";
import Image from "next/image";
import Link from "next/link";
import type { RecipeCard as RecipeCardType } from "@/types";
import FavouriteButton from "./FavouriteButton";

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeBadgeStyle(minutes: number): { label: string; bg: string; color: string } {
  if (minutes <= 15) return { label: "Quick", bg: "#dcfce7", color: "#166534" };
  if (minutes <= 60) return { label: "Medium", bg: "#fef9c3", color: "#854d0e" };
  return { label: "Long", bg: "#fee2e2", color: "#991b1b" };
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

export default function RecipeCard({ recipe }: { recipe: RecipeCardType }) {
  const hasTime = recipe.prep_time_minutes != null && recipe.prep_time_minutes > 0;

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: "4/3" }}>
        {recipe.thumbnail ? (
          <Image
            src={recipe.thumbnail}
            alt={recipe.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.04]"
            style={{ background: "linear-gradient(135deg, #2d2417 0%, #5c3d1e 50%, #8b5e3c 100%)" }}
          >
            <span className="text-4xl opacity-40">🍽️</span>
          </div>
        )}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "rgba(0,0,0,0.08)" }}
        />
        <div
          className="absolute top-2 right-2"
          onClick={(e) => e.preventDefault()}
        >
          <FavouriteButton recipe={recipe} />
        </div>
        {/* Time badge */}
        {hasTime && (() => {
          const mins = recipe.prep_time_minutes!;
          const badge = timeBadgeStyle(mins);
          return (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
              >
                ⏱ {formatTime(mins)}
              </span>
            </div>
          );
        })()}
      </div>
      <div className="mt-3 space-y-1">
        <h3
          className="text-base font-semibold leading-snug group-hover:underline"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          {recipe.name}
        </h3>
        {(recipe.category || recipe.area) && (
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            {[formatCategory(recipe.category), formatArea(recipe.area)].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
