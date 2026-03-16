-- ============================================================
-- Recipe Checker — Supabase Schema
-- Run this in the Supabase Studio SQL editor before seeding
-- ============================================================

-- Categories (from TheMealDB /categories.php)
CREATE TABLE IF NOT EXISTS categories (
  slug         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  thumbnail    TEXT
);

-- Areas / cuisines (from TheMealDB /list.php?a=list)
CREATE TABLE IF NOT EXISTS areas (
  slug  TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT,
  area         TEXT,
  instructions TEXT,
  thumbnail    TEXT,
  youtube_url  TEXT,
  tags         TEXT[],
  source_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Normalised ingredient names
CREATE TABLE IF NOT EXISTS ingredients (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Recipe ↔ ingredient junction
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id            SERIAL PRIMARY KEY,
  recipe_id     TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INT  NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  measure       TEXT,
  display_name  TEXT,
  sort_order    SMALLINT DEFAULT 0,
  UNIQUE (recipe_id, ingredient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ri_recipe      ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ri_ingredient  ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipes_cat    ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_area   ON recipes(area);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_recipes_fts ON recipes
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(category,'') || ' ' || COALESCE(area,'')));

-- ============================================================
-- RPC function used by the ingredient matcher
-- ============================================================
CREATE OR REPLACE FUNCTION match_recipes_by_ingredients(ingredient_ids INT[])
RETURNS TABLE (
  recipe_id          TEXT,
  match_count        BIGINT,
  match_percent      NUMERIC,
  matched_ingredients TEXT[]
)
LANGUAGE sql
STABLE
AS $$
  WITH recipe_scores AS (
    SELECT
      ri.recipe_id,
      COUNT(*)                             AS match_count,
      COUNT(*) * 100.0 / (
        SELECT COUNT(*)
        FROM   recipe_ingredients ri2
        WHERE  ri2.recipe_id = ri.recipe_id
      )                                    AS match_percent
    FROM  recipe_ingredients ri
    WHERE ri.ingredient_id = ANY(ingredient_ids)
    GROUP BY ri.recipe_id
  )
  SELECT
    rs.recipe_id,
    rs.match_count,
    ROUND(rs.match_percent, 1),
    ARRAY_AGG(i.name)
  FROM   recipe_scores rs
  JOIN   recipe_ingredients ri ON ri.recipe_id = rs.recipe_id
  JOIN   ingredients i         ON i.id = ri.ingredient_id
  WHERE  ri.ingredient_id = ANY(ingredient_ids)
  GROUP  BY rs.recipe_id, rs.match_count, rs.match_percent
  ORDER  BY rs.match_percent DESC, rs.match_count DESC
  LIMIT  20;
$$;
