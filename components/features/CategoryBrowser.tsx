"use client";
import Link from "next/link";
import type { Category, Area, TimeCategory } from "@/types";

interface Props {
  categories?: Category[];
  areas?: Area[];
  activeCategory?: string;
  activeArea?: string;
  activeTime?: TimeCategory;
}

const TIME_FILTERS: { value: TimeCategory; label: string; sub: string }[] = [
  { value: "quick",  label: "Quick",  sub: "≤ 15 min" },
  { value: "medium", label: "Medium", sub: "15 – 60 min" },
  { value: "long",   label: "Long",   sub: "> 60 min" },
];

export default function CategoryBrowser({
  categories = [],
  areas = [],
  activeCategory,
  activeArea,
  activeTime,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Time filter */}
      <div>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Time</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/recipes">
            <Chip label="Any" active={!activeTime && !activeCategory && !activeArea} />
          </Link>
          {TIME_FILTERS.map((t) => (
            <Link key={t.value} href={`/recipes?time=${t.value}`}>
              <Chip label={`${t.label} · ${t.sub}`} active={activeTime === t.value} />
            </Link>
          ))}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}>
                <Chip label={c.name} active={activeCategory === c.slug} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cuisine filter */}
      {areas.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Cuisine</p>
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Link key={a.slug} href={`/area/${a.slug}`}>
                <Chip label={a.name} active={activeArea === a.slug} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm cursor-pointer transition-all"
      style={{
        background: active ? "var(--fg)" : "var(--surface)",
        color: active ? "var(--bg)" : "var(--fg)",
        border: "1px solid var(--border)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {label}
    </span>
  );
}
