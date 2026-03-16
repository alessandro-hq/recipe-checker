#!/usr/bin/env python3
"""
Extract recipes from Julia Child's "Mastering the Art of French Cooking Vol. 1"
and output a JSON file for seeding into the recipe-checker database.

Key insight: every named recipe (main or variation) in the book is followed
immediately by an [English translation in brackets]. This is the primary
detection signal.
"""

import re
import json
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "-q"])
    import pdfplumber

PDF_PATH = Path(
    "/Users/alessandrofazio/Calibre Library/Julia Child/"
    "Mastering the Art of French Cooking, Volume 1 (2)/"
    "Mastering the Art of French Cooking, Volum - Julia Child.pdf"
)
OUTPUT_PATH = Path(__file__).parent / "julia_child_recipes.json"

# Chapter 1 (SOUPS) starts on page 85 in the PDF
RECIPE_START_PAGE = 85

# Chapter detection patterns — only match pages that actually have "CHAPTER"
CHAPTER_PATTERNS = [
    (r"CHAPTER\s+(ONE|I)\b", "Soups"),
    (r"CHAPTER\s+(TWO|II)\b", "Sauces"),
    (r"CHAPTER\s+(THREE|III)\b", "Eggs"),
    (r"CHAPTER\s+(FOUR|IV)\b", "Entrées"),
    (r"CHAPTER\s+(FIVE|V)\b", "Fish"),
    (r"CHAPTER\s+(SIX|VI)\b", "Poultry"),
    (r"CHAPTER\s+(SEVEN|VII)\b", "Meat"),
    (r"CHAPTER\s+(EIGHT|VIII)\b", "Vegetables"),
    (r"CHAPTER\s+(NINE|IX)\b", "Cold Buffet"),
    (r"CHAPTER\s+(TEN|X)\b", "Desserts"),
]

# Regex: a recipe name is on the line BEFORE a [bracketed English translation]
# The name can be ALL CAPS (main recipe) or Title Case (variation)
TRANSLATION_RE = re.compile(r"^\[([^\]]+)\]\s*$")


def page_text_from_words(page) -> str:
    """
    Reconstruct page text using word-level positional extraction.

    pdfplumber's extract_text() loses words that sit at extreme left-margin
    x-positions (the ingredient quantity column in Julia Child's two-column
    layout).  extract_words() captures every word; we group by y-coordinate
    and sort by x so that a quantity like "1" at x≈62 ends up before
    "cup granulated sugar" at x≈75 on the same reconstructed line.
    """
    words = page.extract_words(x_tolerance=3, y_tolerance=5, keep_blank_chars=False)
    if not words:
        return ""

    # Sort all words by (top, x0) so rows are in reading order
    words.sort(key=lambda w: (w["top"], w["x0"]))

    rows: list[list] = []
    Y_TOL = 5
    for w in words:
        if rows and abs(w["top"] - rows[-1][0]["top"]) <= Y_TOL:
            rows[-1].append(w)
        else:
            rows.append([w])

    lines = []
    for row in rows:
        row.sort(key=lambda w: w["x0"])
        lines.append(" ".join(w["text"] for w in row))

    return "\n".join(lines)


def slugify(text: str) -> str:
    text = text.lower()
    for src, dst in [
        ("[àáâãäå]","a"),("[èéêë]","e"),("[ìíîï]","i"),
        ("[òóôõö]","o"),("[ùúûü]","u"),("[ç]","c"),("[ñ]","n"),
    ]:
        text = re.sub(src, dst, text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:80]


def parse_ingredients(text: str) -> list[dict]:
    """
    Extract ingredient lines from the interleaved ingredient+instruction text.
    Julia Child places ingredient(s) on the left, then the instruction step
    on the right. Ingredients typically start with a number or fraction.
    """
    ingredients = []
    seen = set()

    # Fraction and number chars that start ingredient lines
    NUM_START = re.compile(r"^[\d¼½¾⅓⅔⅛⅜⅝⅞]")
    # Common measurement units
    UNIT_RE = re.compile(
        r"^([\d¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s+to\s+[\d¼½¾⅓⅔⅛⅜⅝⅞]+)?)\s+"
        r"(Tb|Tbs|tbsp?|tsp|cup|lb\.?|oz\.?|qt|pt|quart|pint|pound|ounce|"
        r"clove|head|sprig|pinch|slice|inch|package|can|bunch|handful|"
        r"piece|strip|sheet|square|envelope|jar|bottle|drop)s?\.?\s+"
        r"(.+)$",
        re.IGNORECASE
    )
    # Unit-first lines: "cup granulated sugar", "Tb water" (quantity omitted = 1)
    UNIT_FIRST_RE = re.compile(
        r"^(Tb|Tbs|tbsp?|tsp|cups?|lb\.?|oz\.?|qt|pt|quarts?|pints?|pounds?|ounces?|"
        r"cloves?|heads?|sprigs?|pinch|slices?|inch(es)?|packages?|cans?|bunches?|handfuls?|"
        r"pieces?|strips?|sheets?|squares?|envelopes?|jars?|bottles?|drops?)\.?\s+"
        r"(.+)$",
        re.IGNORECASE
    )
    # Also catch "A pinch of …", "A few …", etc.
    A_UNIT_RE = re.compile(
        r"^(A|An)\s+(pinch|handful|few|bunch|sprig|slice|piece|strip|round|clove|head)s?\s+(?:of\s+)?(.+)$",
        re.IGNORECASE
    )

    for raw in text.split("\n"):
        line = raw.strip()
        if not line or len(line) > 100:
            continue

        m = UNIT_RE.match(line)
        if m:
            qty, unit, name = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
            measure = f"{qty} {unit}"
        else:
            m2 = A_UNIT_RE.match(line)
            if m2:
                qty, unit, name = m2.group(1), m2.group(2), m2.group(3).strip()
                measure = f"{qty} {unit}"
            else:
                m3 = UNIT_FIRST_RE.match(line)
                if m3:
                    unit, name = m3.group(1).strip(), m3.group(3).strip()
                    # Skip if name looks like an instruction fragment
                    if re.match(r"^(of |or |and |then |about |to |until |with )", name, re.IGNORECASE):
                        continue
                    measure = unit
                else:
                    continue

        # Clean trailing notes from ingredient name
        name = re.sub(
            r",\s*(peeled|sliced|diced|minced|chopped|crushed|grated|softened|"
            r"melted|sifted|beaten|separated|halved|quartered|roughly|finely|"
            r"thinly|thickly|cooked|drained|washed|trimmed|shredded|julienned|"
            r"trimmed and|cut into|at room|chilled)[^,;]*$",
            "", name, flags=re.IGNORECASE
        ).strip()
        name = re.sub(r"\s+", " ", name)

        if len(name) < 2 or len(name) > 60:
            continue
        # Skip lines that look like instructions not ingredients
        if re.search(r"\b(minutes?|hours?|seconds?|degrees?|oven|heat|cook|bake|stir|pour|add|beat|simmer)\b", name, re.IGNORECASE):
            continue

        key = name.lower()
        if key not in seen:
            seen.add(key)
            ingredients.append({"display_name": name, "measure": measure})

    return ingredients


def main():
    print(f"Opening: {PDF_PATH.name}")

    with pdfplumber.open(PDF_PATH) as pdf:
        total = len(pdf.pages)
        print(f"Total pages: {total}")

        # --- Pass 1: extract all text with chapter tracking ---
        print("Extracting text…")
        page_data = []   # (page_num_1indexed, text, chapter)
        current_chapter = "Soups"

        for i, page in enumerate(pdf.pages):
            if i % 200 == 0:
                print(f"  {i+1}/{total}…")
            text = page_text_from_words(page)
            upper = text.upper()
            # Only redetect chapter on pages that contain the word CHAPTER
            if "CHAPTER" in upper:
                for pattern, chapter_name in CHAPTER_PATTERNS:
                    if re.search(pattern, upper, re.MULTILINE):
                        current_chapter = chapter_name
                        break
            page_data.append((i + 1, text, current_chapter))

        # --- Pass 2: build flat line list from RECIPE_START_PAGE onward ---
        print("Building line list…")
        lines = []  # (page_num, stripped_line, chapter)
        for page_num, text, chapter in page_data:
            if page_num < RECIPE_START_PAGE:
                continue
            for raw in text.split("\n"):
                lines.append((page_num, raw.rstrip(), chapter))

        # --- Pass 3: find recipes by [translation] signal ---
        print("Parsing recipes…")
        recipes = []
        seen_slugs: set[str] = set()

        i = 0
        while i < len(lines):
            page_num, line, chapter = lines[i]
            stripped = line.strip()

            # Check if THIS line is a [translation] line
            tm = TRANSLATION_RE.match(stripped)
            if tm and i > 0:
                translation = tm.group(1).strip()

                # The line immediately before is the recipe name
                _, prev_line, _ = lines[i - 1]
                recipe_name = prev_line.strip()

                # Skip if the "name" is empty or obviously not a recipe name
                if not recipe_name or len(recipe_name) < 3:
                    i += 1
                    continue
                # Skip if it looks like a page header/footer number
                if re.match(r"^\d+$", recipe_name):
                    i += 1
                    continue

                # Collect body until the next [translation] line (or end)
                body_lines = []
                j = i + 1
                while j < len(lines):
                    _, bline, _ = lines[j]
                    bstripped = bline.strip()
                    # Stop at next translation marker (next recipe starts one line earlier)
                    if TRANSLATION_RE.match(bstripped):
                        break
                    body_lines.append(bline)
                    j += 1

                body_text = "\n".join(body_lines).strip()

                # Skip very short bodies (likely sub-headings without content)
                if len(body_text) < 80:
                    i += 1
                    continue

                # Build display name
                # If French name is in ALL CAPS, use "English (French)" format
                fr_words = re.findall(r"[a-zA-ZÀ-ÿ]{2,}", recipe_name)
                is_french = fr_words and all(w.isupper() for w in fr_words)
                if is_french:
                    display_name = f"{translation} ({recipe_name.title()})"
                else:
                    # Mixed-case variation name — just use the English translation
                    display_name = translation

                # Unique slug / ID
                base_slug = slugify(translation)
                slug = base_slug
                ctr = 1
                while slug in seen_slugs:
                    slug = f"{base_slug}-{ctr}"
                    ctr += 1
                seen_slugs.add(slug)

                recipe_id = f"jc-{slug}"
                ingredients = parse_ingredients(body_text)

                recipes.append({
                    "id": recipe_id,
                    "name": display_name,
                    "name_fr": recipe_name if is_french else None,
                    "name_en": translation,
                    "category": chapter,
                    "area": "French",
                    "instructions": body_text,
                    "thumbnail": None,
                    "youtube_url": None,
                    "tags": ["Julia Child", "French", "Mastering the Art of French Cooking", chapter],
                    "source_url": None,
                    "ingredients": ingredients,
                    "page": page_num,
                })

                i = j  # jump past the body we consumed
            else:
                i += 1

    print(f"\nExtracted {len(recipes)} recipes")
    if recipes:
        # Chapter breakdown
        from collections import Counter
        cats = Counter(r["category"] for r in recipes)
        for cat, cnt in sorted(cats.items(), key=lambda x: -x[1]):
            print(f"  {cat:20} {cnt}")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
    print(f"\nSaved → {OUTPUT_PATH}")

    # Sample
    print("\n--- First 10 extracted ---")
    for r in recipes[:10]:
        print(f"  [{r['page']:4}] {r['name']!r}  ({r['category']})  {len(r['ingredients'])} ingr")
        for ing in r["ingredients"][:3]:
            print(f"         {ing['measure']:20} {ing['display_name']}")


if __name__ == "__main__":
    main()
