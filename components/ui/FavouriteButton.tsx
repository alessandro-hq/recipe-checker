"use client";
import { useFavourites } from "@/hooks/useFavourites";
import type { RecipeCard } from "@/types";

export default function FavouriteButton({
  recipe,
  size = "sm",
}: {
  recipe: RecipeCard;
  size?: "sm" | "lg";
}) {
  const { toggle, isFavourite } = useFavourites();
  const saved = isFavourite(recipe.id);
  const px = size === "lg" ? 24 : 18;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle(recipe);
      }}
      className="flex items-center justify-center rounded-full transition-transform active:scale-90"
      style={{
        background: "rgba(255,255,255,0.9)",
        width: size === "lg" ? "44px" : "32px",
        height: size === "lg" ? "44px" : "32px",
        backdropFilter: "blur(4px)",
      }}
      aria-label={saved ? "Remove from favourites" : "Add to favourites"}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill={saved ? "var(--accent)" : "none"}
        stroke={saved ? "var(--accent)" : "var(--fg)"}
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
