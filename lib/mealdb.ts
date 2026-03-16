const BASE = "https://www.themealdb.com/api/json/v1/1";

export interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags: string | null;
  strYoutube: string | null;
  strSource: string | null;
  [key: string]: string | null;
}

export interface MealDBCategory {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
}

export async function fetchAllCategories(): Promise<MealDBCategory[]> {
  const res = await fetch(`${BASE}/categories.php`);
  const data = await res.json();
  return data.categories ?? [];
}

export async function fetchAllAreas(): Promise<string[]> {
  const res = await fetch(`${BASE}/list.php?a=list`);
  const data = await res.json();
  return (data.meals ?? []).map((m: { strArea: string }) => m.strArea);
}

export async function fetchMealsByCategory(category: string): Promise<{ idMeal: string; strMeal: string; strMealThumb: string }[]> {
  const res = await fetch(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
  const data = await res.json();
  return data.meals ?? [];
}

export async function fetchMealDetail(id: string): Promise<MealDBMeal | null> {
  const res = await fetch(`${BASE}/lookup.php?i=${id}`);
  const data = await res.json();
  return data.meals?.[0] ?? null;
}

export function parseIngredients(meal: MealDBMeal): { name: string; measure: string; order: number }[] {
  const result: { name: string; measure: string; order: number }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim() ?? "";
    if (name) {
      result.push({ name, measure, order: i });
    }
  }
  return result;
}
