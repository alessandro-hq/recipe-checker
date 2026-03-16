import PageWrapper from "@/components/layout/PageWrapper";
import IngredientMatcher from "@/components/features/IngredientMatcher";

export const metadata = {
  title: "Ingredient Matcher | Recipe Checker",
  description: "Enter the ingredients you have and find the best matching recipes.",
};

export default function MatcherPage() {
  return (
    <PageWrapper className="py-12 max-w-3xl">
      <div className="mb-10">
        <p
          className="text-xs uppercase tracking-widest mb-3 font-medium"
          style={{ color: "var(--accent)" }}
        >
          Ingredient Matcher
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-3"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
        >
          What&apos;s in your kitchen?
        </h1>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          Add the ingredients you have available. We&apos;ll find recipes ranked by how many of your ingredients they use.
        </p>
      </div>
      <IngredientMatcher />
    </PageWrapper>
  );
}
