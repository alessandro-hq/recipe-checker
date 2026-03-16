# Recipe Checker — Project Context

## What This App Does

Full-stack recipe discovery and ingredient-matching web app. Users can browse recipes, filter by cuisine/category/prep time, search by name, and enter ingredients they have on hand to get a ranked list of recipes they can make.

Two data sources:
- **TheMealDB free API** — main recipe database (seeded via `npm run seed`)
- **Julia Child's "Mastering the Art of French Cooking Vol. 1"** — 582 French recipes extracted from the plain-text version of the book and seeded via `npm run seed-julia-child`

---

## Tech Stack

- **Next.js 16** (App Router, server components) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + PostCSS
- **Supabase** — PostgreSQL database, RPC functions, SSR + browser clients
- **TheMealDB API** — free, no auth required
- **Fonts** — Playfair Display (serif) + Inter (sans-serif) from Google Fonts

---

## Run Commands

```bash
npm run dev                  # Start dev server
npm run build                # Production build
npm run seed                 # Seed database from TheMealDB
npm run seed-julia-child     # Seed Julia Child recipes from extracted JSON
npm run extract-julia-child  # Re-extract recipes from txt → julia_child_recipes.json
npm run update-prep-times    # Backfill prep time data
```

---

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

See `.env.example` for the template.
`SUPABASE_SERVICE_ROLE_KEY` is only needed for seeding scripts — never expose it client-side.

---

## Project Structure

```
recipe-checker/
├── app/
│   ├── api/
│   │   ├── matcher/route.ts         # Ingredient matching endpoint
│   │   ├── search/route.ts          # Search endpoint
│   │   ├── recipes/route.ts         # Recipe listing
│   │   ├── recipes/[id]/route.ts    # Recipe detail
│   │   ├── categories/route.ts      # Categories listing
│   │   └── areas/route.ts           # Cuisines/areas listing
│   ├── page.tsx                     # Homepage
│   ├── recipes/page.tsx             # All recipes with filters
│   ├── recipes/[id]/page.tsx        # Recipe detail
│   ├── matcher/page.tsx             # Ingredient matcher
│   ├── search/page.tsx              # Search results
│   ├── favourites/page.tsx          # Saved recipes
│   ├── category/[slug]/page.tsx     # Category view
│   ├── area/[slug]/page.tsx         # Cuisine view
│   ├── layout.tsx                   # Root layout (Navbar + Footer)
│   └── globals.css                  # Global styles + CSS variables
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx               # Top nav with search + favorites count
│   │   ├── Footer.tsx
│   │   └── PageWrapper.tsx
│   ├── features/
│   │   ├── IngredientMatcher.tsx    # Ingredient matching UI (client)
│   │   ├── CategoryBrowser.tsx      # Filter chips (hidden on jc-* category pages)
│   │   └── RecipeDetail.tsx         # Recipe display with JC-specific instruction parsing
│   └── ui/
│       ├── RecipeCard.tsx
│       ├── RecipeGrid.tsx
│       ├── FavouriteButton.tsx
│       └── MatchScore.tsx
├── lib/
│   ├── supabase.ts                  # Supabase client factories
│   ├── mealdb.ts                    # TheMealDB API wrapper
│   └── matcher.ts                   # Ingredient normalization & matching logic
├── hooks/
│   ├── useFavourites.ts             # localStorage-based favorites state
│   └── useDebounce.ts
├── types/
│   └── index.ts                     # TypeScript interfaces
└── scripts/
    ├── seed.ts                      # Populate DB from TheMealDB
    ├── seed_julia_child.ts          # Populate DB from julia_child_recipes.json
    ├── extract_julia_child_txt.py   # PRIMARY: Extract from .txt source → JSON (accurate)
    ├── extract_julia_child.py       # FALLBACK: Extract from PDF (word-based, less accurate)
    ├── julia_child_recipes.json     # Extracted recipe data (gitignored, regenerate locally)
    ├── update-prep-times.ts
    └── schema.sql                   # PostgreSQL DDL
```

---

## Database Schema

- **categories** — slug (PK), name, description, thumbnail
- **areas** — slug (PK), name
- **recipes** — id (PK), name, category, area, instructions, thumbnail, youtube_url, tags[], source_url, created_at
- **ingredients** — id (PK), name (unique)
- **recipe_ingredients** — id (PK), recipe_id (FK), ingredient_id (FK), measure, display_name, sort_order

Key RPC function: `match_recipes_by_ingredients(ingredient_ids)` — ranks recipes by ingredient overlap.

### Julia Child data conventions
- Recipe IDs are prefixed `jc-` (e.g. `jc-onion-soup`)
- Categories use slugs `jc-soups`, `jc-sauces`, `jc-eggs`, `jc-entrees`, `jc-fish`, `jc-poultry`, `jc-meat`, `jc-vegetables`, `jc-cold-buffet`, `jc-desserts`
- Area slug is `french` (lowercase)
- Tags always include `["Julia Child", "French", "Mastering the Art of French Cooking", <chapter>]`
- No thumbnail images — recipe detail page shows a gradient placeholder

---

## Key Implementation Details

### Ingredient Matching (`lib/matcher.ts`)
- Normalizes user input: lowercase, strips qualifiers (fresh, diced, etc.), singularizes plurals
- Exact match first, fuzzy `ilike` fallback
- Calls Supabase RPC to score and rank recipes
- Returns top 20 matches ranked by match % and ingredient count

### Search (`app/api/search/route.ts`)
- PostgreSQL full-text search (`textSearch`, websearch type)
- Falls back to `ilike` fuzzy search if no FTS results
- Minimum 2 characters required

### Favourites (`hooks/useFavourites.ts`)
- Stored in localStorage under key `recipe_checker_favourites`
- No backend sync — purely client-side
- Favorite count badge shown in Navbar

### Server vs. Client
- Page components are async server components — query Supabase directly
- `IngredientMatcher`, `Navbar`, `FavouriteButton` are client components using hooks
- API routes expose server-side logic to client fetches

### Julia Child Display Logic
- **`components/features/RecipeDetail.tsx`** — `isJuliaChild` flag (`recipe.id.startsWith("jc-")`) enables JC-specific instruction parsing (`parseSteps()`): strips ingredient measurement lines, joins PDF line-wrapped sentences into paragraphs
- **`components/ui/RecipeCard.tsx`** — `formatCategory()` converts `jc-desserts` → `Desserts (Julia Child)`, `formatArea()` capitalizes area slugs
- **`app/category/[slug]/page.tsx`** — queries by raw slug (not capitalized), hides `CategoryBrowser` for `jc-*` slugs (all JC recipes are French, so cuisine filter wastes space)

### Julia Child Extraction (`scripts/extract_julia_child_txt.py`)
- Reads the plain-text (.txt) version of the book — quantities are on the same line as ingredient names, no PDF layout issues
- Book source file: `/Users/alessandrofazio/Calibre Library/Julia Child/Mastering the Art of French Cooking, Volume 1 (2)/Mastering the Art of French Cooking, Volum - Julia Child.txt`
- Anchors recipe detection on `[English translation in brackets]` lines — unique to Julia Child's book format
- Chapter tracking via `CHAPTER ONE` / `CHAPTER TWO` / ... keywords (actual recipe content starts at line ~1474)
- `parse_ingredients()` uses `UNIT_RE` (quantity + unit + name), `A_UNIT_RE` (A/An pinch of...), and `OPTIONAL_RE` patterns; skips equipment lines via `EQUIPMENT_RE`
- Outputs `scripts/julia_child_recipes.json` (gitignored — regenerate locally with `npm run extract-julia-child`)
- Last extraction: 582 recipes, 2578 total ingredients (avg 4.4 per recipe)

---

## Design System (`app/globals.css`)

CSS custom properties for theming:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#FAFAF8` | Page background (warm cream) |
| `--fg` | `#1A1A1A` | Primary text |
| `--accent` | `#C8401E` | Rust/terracotta accent |
| `--border` | — | Borders |
| `--surface` | — | Card surfaces |
| `--muted` | — | Muted text |

Prep time badges: green (quick ≤15 min), yellow (medium 15–60 min), red (long >60 min).

---

## Deployment

- **GitHub** → `https://github.com/alessandro-hq/recipe-checker` — auto-triggers Vercel deploys on push to `main`
- **Vercel** → `https://recipe-checker-henna.vercel.app` (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in project env vars)
- **Supabase** — project: "Recipe tracker", region: eu-west-1
- Images served from `www.themealdb.com/images/**` (configured in `next.config.ts`)
- `SUPABASE_SERVICE_ROLE_KEY` must NOT be added to Vercel — only needed locally for seeding

---

## Bugs Fixed (session history)

| Bug | Fix |
|-----|-----|
| Julia Child recipes show broken image | Gradient placeholder in `RecipeCard` and `RecipeDetail` when `thumbnail` is null |
| Raw slug in card subtitle (`jc-desserts · french`) | `formatCategory()` / `formatArea()` helpers in `RecipeCard` and `RecipeDetail` |
| Category page shows 0 recipes for JC categories | Was uppercasing slug before query; fixed to use raw slug in `.eq("category", slug)` |
| CategoryBrowser shown on JC category pages | Hidden via `isJuliaChild` flag — wastes space, all JC recipes are French |
| PDF line-wraps became numbered steps | `parseSteps()` joins continuation lines into paragraphs for JC recipes |
| Ingredient measurement lines appeared in instructions | `INGREDIENT_LINE_RE` filter in `parseSteps()` strips them |
| Missing ingredient quantities (e.g. "cup sugar" instead of "1 cup sugar") | Switched extraction from PDF to .txt source — quantities always on same line in .txt |
