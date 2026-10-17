# Media Toy Lab

A static catalog website for a collection of media toys and media technologies.
Plain HTML/CSS/JS, no build step.

## View it

Open `index.html` in a browser, or run a local server:

```sh
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Updating the collection

The catalog is generated from the collection spreadsheet (`Media Objects Collection.xlsx`).
After editing the spreadsheet, put it in the repo root and run:

```sh
python3 scripts/import_spreadsheet.py "Media Objects Collection.xlsx"
```

This rewrites `data/collection.js` and extracts the photos embedded in the "Image" column into `images/`
(resized to 1200px on macOS). It reads these sheets:

- **Collection Objects** — the main catalog
- **Collection Media Video Games**, **VHS Tapes**, **16mm Films**

The "Blank or Stock Media" and "Tools" sheets are lab inventory and are not published.

Only public fields are exported: accession number, name, type, date, maker, model, origin, materials, size,
parts, related media, donor credit and the **Description for Website** column. Room, cabinet location,
serial number, owner, purchaser, provenance and "Additional description" stay private.

The spreadsheet itself is in `.gitignore` so it is never pushed to GitHub.

### Categories

Categories are assigned in `categorize()` in `scripts/import_spreadsheet.py`, in this order:
Toys, Video Games, Film & Photography, Recordings, Devices & Instruments. Anything with Item Type
"Toy" or "Educational Toy" is a toy; `EXTRA_TOY_WORDS` adds a few untagged toys by name.

## Pages

- `index.html` — catalog: Toys shelf first, then the other categories; filters, search, Grid / Index (A–Z) views
- `item.html?id=...` — one page per object, with previous / next links
- `about.html` — about the collection

## Publish

Push to GitHub, then in the repo go to **Settings → Pages**, choose the `main` branch and `/ (root)`.
