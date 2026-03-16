# Recipe Checker — Project Context

## What This App Does

Full-stack recipe discovery and ingredient-matching web app. Users can browse recipes, filter by cuisine/category/prep time, search by name, and enter ingredients they have on hand to get a ranked list of recipes they can make.

Two data sources:
- **TheMealDB free API** — main recipe database (seeded via `npm run seed`)
- **Julia Child's "Mastering the Art of French Cooking Vol. 1"** — 551 French recipes extracted from PDF and seeded via `npm run seed-julia-child`

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
npm run extract-julia-child  # Re-extract recipes from PDF → julia_child_recipes.json
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
│   │   ├── CategoryBrowser.tsx      # Filter chips
│   │   └── RecipeDetail.tsx         # Recipe display
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
    ├── extract_julia_child.py       # Extract recipes from Julia Child PDF → JSON
    ├── julia_child_recipes.json     # Extracted recipe data (gitignored)
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
- Area is `french`
- Tags always include `["Julia Child", "French", "Mastering the Art of French Cooking", <chapter>]`

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

### Julia Child PDF Extraction (`scripts/extract_julia_child.py`)
- Uses `pdfplumber` to extract text from the 1,150-page PDF
- Anchors recipe detection on the `[English translation in brackets]` pattern unique to the book's formatting
- Chapter tracking fires only on pages containing the word "CHAPTER" to avoid false matches
- Recipes start from page 85 (Chapter I — Soups)
- Outputs `scripts/julia_child_recipes.json` (gitignored, regenerate locally)

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

- **GitHub** → version control, auto-triggers Vercel deploys on push to `main`
- **Vercel** → hosting (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in project env vars)
- **Supabase** — project: "Recipe tracker", region: eu-west-1
- Images served from `www.themealdb.com/images/**` (configured in `next.config.ts`)
- `SUPABASE_SERVICE_ROLE_KEY` must NOT be added to Vercel — only needed locally for seeding
