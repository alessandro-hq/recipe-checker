export type TimeCategory = "quick" | "medium" | "long";

export interface RecipeCard {
  id: string;
  name: string;
  thumbnail: string;
  category: string | null;
  area: string | null;
  prep_time_minutes?: number | null;
}

export interface Ingredient {
  id: number;
  name: string;
}

export interface RecipeIngredient {
  ingredient_id: number;
  measure: string | null;
  display_name: string;
  sort_order: number;
  ingredients: { name: string } | { name: string }[] | null;
}

export interface Recipe extends RecipeCard {
  instructions: string | null;
  youtube_url: string | null;
  tags: string[] | null;
  source_url: string | null;
  recipe_ingredients: RecipeIngredient[];
}

export interface Category {
  slug: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
}

export interface Area {
  slug: string;
  name: string;
}

export interface MatchResult {
  recipe: RecipeCard;
  matchCount: number;
  matchPercent: number;
  matchedIngredients: string[];
}

export interface PaginatedRecipes {
  data: RecipeCard[];
  total: number;
  page: number;
  limit: number;
}
