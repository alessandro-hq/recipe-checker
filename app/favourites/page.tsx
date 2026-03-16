"use client";
import { useFavourites } from "@/hooks/useFavourites";
import RecipeGrid from "@/components/ui/RecipeGrid";
import PageWrapper from "@/components/layout/PageWrapper";
import Link from "next/link";

export default function FavouritesPage() {
  const { favourites, loaded } = useFavourites();

  return (
    <PageWrapper className="py-12">
      <div className="mb-10">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          Favourites
        </h1>
        {loaded && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {favourites.length} saved recipe{favourites.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {!loaded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="skeleton rounded-lg w-full" style={{ aspectRatio: "4/3" }} />
              <div className="skeleton mt-3 h-4 w-3/4 rounded" />
              <div className="skeleton mt-2 h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : favourites.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg mb-6" style={{ color: "var(--muted)" }}>
            No saved recipes yet.
          </p>
          <Link
            href="/recipes"
            className="px-8 py-3 rounded-full font-medium text-sm"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            Browse Recipes
          </Link>
        </div>
      ) : (
        <RecipeGrid recipes={favourites} />
      )}
    </PageWrapper>
  );
}
