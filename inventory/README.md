# Inventory

Top-level folder for the bar inventory list. Anything you put here becomes the **authoritative source of available ingredients** for both:

- the **Inventory** page in the app (`/api/inventory`), and
- the **GPT recipe generator** (`/api/recommendations`).

## What you can drop here

| File | Purpose |
| ---- | ------- |
| `velox_ingredients.json` | Curated pantry. Used as-is when present. |
| `*.xlsx` (e.g. `LT_Mock_Inventory.xlsx`, `Project_Velox_Menu_Based_Inventory.xlsx`) | Live inventory list. Parsed into a pantry dictionary at request time. Columns recognised: `Ingredient` / `Item Name`, `Category`, `Quantity`, `Unit Price`, etc. |
| `*.txt` | Simple inventory list. Parser supports header tables (`Ingredient,Category,Quantity`) and freeform lines (`Vodka x2`, `Lime Juice - 6`, `Tonic Water`). |

The folder is resolved in this order:

1. `*.txt` inventory files in `inventory/` (preferred for quick paste workflows)
2. `inventory/velox_ingredients.json` (curated)
3. xlsx inventory files in `inventory/` (live)
4. legacy `data/velox_ingredients.json` (fallback)
5. inventory files in `userUploads/` (legacy fallback)

## Effect on recipe generation

- **Mocktails** (`mocktail = 1`): always constrained to the pantry (existing behaviour).
- **Cocktails** (`mocktail = 0`): **also constrained to the pantry whenever this folder is non-empty.** The system prompt receives an "INVENTORY OVERRIDE" instruction so GPT must build every recipe from the ingredients you list here, including base spirits.

If the folder is empty (no JSON, no xlsx), the cocktail generator falls back to its prior behaviour of recommending any well-known cocktail.

## Override

Set `INVENTORY_DIR=/absolute/path/to/folder` in your `.env` to point the server at a different directory (useful for deploys).
