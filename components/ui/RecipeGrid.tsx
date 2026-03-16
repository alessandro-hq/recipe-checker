import type { RecipeCard as RecipeCardType } from "@/types";
import RecipeCard from "./RecipeCard";

export default function RecipeGrid({ recipes }: { recipes: RecipeCardType[] }) {
  if (recipes.length === 0) {
    return (
      <div className="py-24 text-center" style={{ color: "var(--muted)" }}>
        <p className="text-lg">No recipes found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
