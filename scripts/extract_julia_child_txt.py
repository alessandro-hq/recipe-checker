#!/usr/bin/env python3
"""
Extract recipes from Julia Child's "Mastering the Art of French Cooking Vol. 1"
using the plain-text (.txt) version of the book.

The txt format is much cleaner than PDF:
  - Ingredient quantities are always on the same line as the ingredient name
  - [English translation in brackets] on own line signals recipe start
  - Chapters are CHAPTER ONE / CHAPTER TWO / etc.
"""

import re
import json
from pathlib import Path

TXT_PATH = Path(
    "/Users/alessandrofazio/Calibre Library/Julia Child/"
    "Mastering the Art of French Cooking, Volume 1 (2)/"
    "Mastering the Art of French Cooking, Volum - Julia Child.txt"
)
OUTPUT_PATH = Path(__file__).parent / "julia_child_recipes.json"

# Actual recipe content starts at "CHAPTER ONE" (line ~1474)
CHAPTER_MAP = {
    "CHAPTER ONE":   "Soups",
    "CHAPTER TWO":   "Sauces",
    "CHAPTER THREE": "Eggs",
    "CHAPTER FOUR":  "Entrées",
    "CHAPTER FIVE":  "Fish",
    "CHAPTER SIX":   "Poultry",
    "CHAPTER SEVEN": "Meat",
    "CHAPTER EIGHT": "Vegetables",
    "CHAPTER NINE":  "Cold Buffet",
    "CHAPTER TEN":   "Desserts",
}

TRANSLATION_RE = re.compile(r"^\[([^\]]+)\]\s*$")

# Kitchen equipment keywords — lines starting with "A/An" + these are skipped
EQUIPMENT_RE = re.compile(
    r"^(A|An)\s+\S.*\b("
    r"saucepan|skillet|pan|pot|bowl|baking\s+dish|roasting\s+pan|gratin\s+dish|"
    r"casserole|thermometer|peeler|grater|whisk|spatula|mold|tin|rack|fork|spoon|"
    r"knife|colander|strainer|blender|processor|mixer|broiler|grill|skewer|"
    r"press|towel|cloth|cheesecloth|cheesecloth|parchment|wax\s+paper|plastic\s+wrap|"
    r"pastry\s+brush|pastry\s+bag|tube|sleeve|cutter|ring|frame|stand|trivet|"
    r"ladle|tongs|brush|mill|sieve|tamis|terrine|pâté|loaf\s+pan|"
    r"roaster|platter|plate|dish|tin|cup\s+measure|measuring|timer|oven"
    r")\b",
    re.IGNORECASE,
)

# Ingredient quantity patterns
NUM_START = re.compile(r"^[\d¼½¾⅓⅔⅛⅜⅝⅞]")
UNIT_RE = re.compile(
    r"^([\d¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s+to\s+[\d¼½¾⅓⅔⅛⅜⅝⅞]+)?(?:/[\d]+)?(?:\s*[\d¼½¾⅓⅔⅛⅜⅝⅞]+)?)\s+"
    r"(Tb|Tbs|tbsp?|tsp|cups?|lb\.?|oz\.?|qts?|pts?|quarts?|pints?|pounds?|ounces?|"
    r"cloves?|heads?|sprigs?|pinch(?:es)?|slices?|inches?|packages?|cans?|bunches?|"
    r"handfuls?|pieces?|strips?|strips?|sheets?|squares?|envelopes?|jars?|bottles?|"
    r"drops?|dashes?|stalks?|sticks?|links?|fillets?|legs?|thighs?|halves?|"
    r"pounds?\s+and\s+ounces?)s?\.?\s+"
    r"(.+)$",
    re.IGNORECASE,
)
A_UNIT_RE = re.compile(
    r"^(A|An)\s+(pinch|handful|few|bunch|sprig|slice|piece|strip|round|clove|"
    r"head|stick|cube|ball|layer|sheet|dash|drizzle|squeeze|knob|dollop)s?\b"
    r"(?:\s+(?:of|or))?\s+(.+)$",
    re.IGNORECASE,
)
# Lines like "3 to 4 cups or 1 lb. peeled potatoes"
COMPLEX_RE = re.compile(
    r"^([\d¼½¾⅓⅔⅛⅜⅝⅞]+\s+to\s+[\d¼½¾⅓⅔⅛⅜⅝⅞]+)\s+(cups?|lb\.?|oz\.?|Tb|tsp)\s+(.+)$",
    re.IGNORECASE,
)
# Lines like "Optional: ..." that are ingredient variants
OPTIONAL_RE = re.compile(r"^Optional:\s*(.+)$", re.IGNORECASE)

# Words that signal a line is an instruction, not an ingredient
INSTRUCTION_WORDS = re.compile(
    r"\b(simmer|sauté|sautée|cook|bake|roast|stir|beat|whisk|fold|pour|heat|"
    r"bring|reduce|season|taste|adjust|remove|transfer|place|set|let|allow|"
    r"until|minutes?|hours?|seconds?|degrees?|temperature|oven|preheat|"
    r"immediately|serve|garnish|decorate|refrigerate|chill|cool)\b",
    re.IGNORECASE,
)


def slugify(text: str) -> str:
    text = text.lower()
    for src, dst in [
        (r"[àáâãäå]", "a"), (r"[èéêë]", "e"), (r"[ìíîï]", "i"),
        (r"[òóôõö]", "o"), (r"[ùúûü]", "u"), (r"[ç]", "c"), (r"[ñ]", "n"),
    ]:
        text = re.sub(src, dst, text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:80]


def parse_ingredients(body: str) -> list[dict]:
    ingredients = []
    seen: set[str] = set()

    for raw in body.split("\n"):
        line = raw.strip()
        if not line or len(line) > 120:
            continue
        # Skip equipment lines
        if EQUIPMENT_RE.match(line):
            continue
        # Skip "For N people" yield lines
        if re.match(r"^For\s+\d", line, re.IGNORECASE):
            continue
        # Skip long instruction-like sentences
        if len(line) > 80 and INSTRUCTION_WORDS.search(line):
            continue

        qty = unit = name = None
        measure = None

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
                m3 = OPTIONAL_RE.match(line)
                if m3:
                    # Optional line — try to parse the inner part as ingredient
                    inner = m3.group(1).strip()
                    mi = UNIT_RE.match(inner) or A_UNIT_RE.match(inner)
                    if mi:
                        name = mi.group(3).strip()
                        measure = f"{mi.group(1)} {mi.group(2)}".strip()
                    else:
                        continue
                else:
                    continue

        if not name:
            continue

        # Trim trailing prep notes
        name = re.sub(
            r",\s*(peeled|sliced|diced|minced|chopped|crushed|grated|softened|"
            r"melted|sifted|beaten|separated|halved|quartered|roughly|finely|"
            r"thinly|thickly|cooked|drained|washed|trimmed|shredded|cut into|"
            r"at room|chilled|if possible|if desired|for garnish)[^,;]*$",
            "", name, flags=re.IGNORECASE,
        ).strip()
        name = re.sub(r"\s+", " ", name)

        if len(name) < 2 or len(name) > 70:
            continue
        # Skip instruction-looking names
        if INSTRUCTION_WORDS.search(name[:40]):
            continue

        key = name.lower()
        if key not in seen:
            seen.add(key)
            ingredients.append({"display_name": name, "measure": measure or ""})

    return ingredients


def main():
    print(f"Reading: {TXT_PATH.name}")
    text = TXT_PATH.read_text(encoding="utf-8")
    lines = text.split("\n")
    total = len(lines)
    print(f"Total lines: {total}")

    # Find the line index of CHAPTER ONE (start of actual recipes)
    start_idx = 0
    for i, line in enumerate(lines):
        if line.strip() == "CHAPTER ONE":
            start_idx = i
            break
    print(f"Recipes start at line {start_idx + 1}")

    # Build indexed line list from CHAPTER ONE onward, tracking chapter
    indexed: list[tuple[int, str, str]] = []  # (line_num_1idx, text, chapter)
    current_chapter = "Soups"
    for i, line in enumerate(lines):
        if i < start_idx:
            continue
        stripped = line.strip()
        if stripped in CHAPTER_MAP:
            current_chapter = CHAPTER_MAP[stripped]
        indexed.append((i + 1, line.rstrip(), current_chapter))

    print(f"Lines to process: {len(indexed)}")

    # Parse recipes using [translation] signal
    print("Parsing recipes…")
    recipes: list[dict] = []
    seen_slugs: set[str] = set()

    i = 0
    while i < len(indexed):
        line_num, line, chapter = indexed[i]
        stripped = line.strip()

        tm = TRANSLATION_RE.match(stripped)
        if tm and i > 0:
            translation = tm.group(1).strip()

            # Find recipe name: scan backward for last non-empty line
            recipe_name = ""
            for back in range(i - 1, max(i - 5, -1), -1):
                candidate = indexed[back][1].strip()
                if candidate:
                    recipe_name = candidate
                    break

            if not recipe_name or len(recipe_name) < 3:
                i += 1
                continue
            if re.match(r"^\d+$", recipe_name):
                i += 1
                continue
            # Skip if the "name" is a sentence (prose intro, not a recipe title)
            if len(recipe_name) > 120 or (". " in recipe_name and recipe_name[0].islower()):
                i += 1
                continue

            # Collect body until next [translation]
            body_lines = []
            j = i + 1
            while j < len(indexed):
                _, bline, _ = indexed[j]
                if TRANSLATION_RE.match(bline.strip()):
                    break
                body_lines.append(bline)
                j += 1

            body_text = "\n".join(body_lines).strip()
            if len(body_text) < 60:
                i += 1
                continue

            # Build display name
            fr_words = re.findall(r"[a-zA-ZÀ-ÿ]{2,}", recipe_name)
            is_french = fr_words and all(w.isupper() for w in fr_words)
            if is_french:
                display_name = f"{translation} ({recipe_name.title()})"
            else:
                display_name = translation

            # Unique slug
            base_slug = slugify(translation)
            slug = base_slug
            ctr = 1
            while slug in seen_slugs:
                slug = f"{base_slug}-{ctr}"
                ctr += 1
            seen_slugs.add(slug)

            recipe_id = f"jc-{slug}"
            ingredients = parse_ingredients(body_text)

            # Map chapter name → category slug
            cat_slug_map = {
                "Soups": "jc-soups",
                "Sauces": "jc-sauces",
                "Eggs": "jc-eggs",
                "Entrées": "jc-entrees",
                "Fish": "jc-fish",
                "Poultry": "jc-poultry",
                "Meat": "jc-meat",
                "Vegetables": "jc-vegetables",
                "Cold Buffet": "jc-cold-buffet",
                "Desserts": "jc-desserts",
            }

            recipes.append({
                "id": recipe_id,
                "name": display_name,
                "name_fr": recipe_name if is_french else None,
                "name_en": translation,
                "category": cat_slug_map.get(chapter, "jc-soups"),
                "area": "french",
                "instructions": body_text,
                "thumbnail": None,
                "youtube_url": None,
                "tags": ["Julia Child", "French", "Mastering the Art of French Cooking", chapter],
                "source_url": None,
                "ingredients": ingredients,
                "page": line_num,
            })

            i = j
        else:
            i += 1

    print(f"\nExtracted {len(recipes)} recipes")
    from collections import Counter
    cats = Counter(r["category"] for r in recipes)
    for cat, cnt in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:25} {cnt}")

    total_ingr = sum(len(r["ingredients"]) for r in recipes)
    print(f"\nTotal ingredients: {total_ingr}  avg: {total_ingr/len(recipes):.1f}")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
    print(f"\nSaved → {OUTPUT_PATH}")

    print("\n--- First 10 extracted ---")
    for r in recipes[:10]:
        print(f"  [L{r['page']:5}] {r['name']!r}  ({r['category']})  {len(r['ingredients'])} ingr")
        for ing in r["ingredients"][:4]:
            print(f"           {ing['measure']:25} {ing['display_name']}")


if __name__ == "__main__":
    main()
