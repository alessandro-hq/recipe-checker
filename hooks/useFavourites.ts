"use client";
import { useState, useEffect, useCallback } from "react";
import type { RecipeCard } from "@/types";

const STORAGE_KEY = "recipe_checker_favourites";

export function useFavourites() {
  const [favourites, setFavourites] = useState<RecipeCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavourites(JSON.parse(stored));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: RecipeCard[]) => {
    setFavourites(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const toggle = useCallback((recipe: RecipeCard) => {
    setFavourites((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      const updated = exists
        ? prev.filter((r) => r.id !== recipe.id)
        : [...prev, recipe];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavourite = useCallback(
    (id: string) => favourites.some((r) => r.id === id),
    [favourites]
  );

  return { favourites, toggle, isFavourite, count: favourites.length, loaded, persist };
}
