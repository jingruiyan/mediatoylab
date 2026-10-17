# Media History Lab

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

This rewrites `data/collection.js` and extracts the photos embedded in the "Image" column into `images/`.
**Only objects with a photo are published.** On macOS each photo is cut out onto a clean white 1500×1000
canvas by `scripts/cutout.swift` (Apple Vision foreground mask). Objects listed in `CUTOUT_WHOLE` in the import
script keep their whole photo instead, for cases where the cutout drops part of the object. If `swiftc` complains
that the SDK is not supported by the compiler, point it at an older SDK:

```sh
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk python3 scripts/import_spreadsheet.py "Media Objects Collection.xlsx"
```

It reads these sheets:

- **Collection Objects** — the main catalog
- **Collection Media Video Games**, **VHS Tapes**, **16mm Films**

The "Blank or Stock Media" and "Tools" sheets are lab inventory and are not published.

Only public fields are exported: accession number, name, type, date, maker, model, origin, materials, size,
parts, related media, donor credit and the **Description for Website** column. Room, cabinet location,
serial number, owner, purchaser, provenance and "Additional description" stay private.

The spreadsheet itself is in `.gitignore` so it is never pushed to GitHub.

### Categories

Categories are assigned in `categorize()` in `scripts/import_spreadsheet.py`, in this order:
Toys, Video Games, Film & Photography, Recordings, Devices & Instruments. Categories with no published
objects are left out of the site. Anything with Item Type
"Toy" or "Educational Toy" is a toy; `EXTRA_TOY_WORDS` adds a few untagged toys by name.

## Pages

- `index.html` — collection: Benjamin headline, then the Toys shelf first and the other categories; filters, search, Grid / Index (A–Z) views
- `item.html?id=...` — one page per object, with previous / next links
- `about.html` — project overview (adapted from the project writeup, `Media lab writeup.docx`, which is kept out of git):
  the toy telephones, research questions, method, digital humanities methodology, timeline, fellowship and PIs.
  Its figures are in `images/about/`.

## Design

Bauhaus / journal look in `css/style.css`: white page, black type and rules (Jost + IBM Plex Mono), and the
primary colors used only as category marks: red circle = Toys, blue square = Video Games, yellow triangle =
Film & Photography, black half-disc = Devices & Instruments.

## Publish

Push to GitHub, then in the repo go to **Settings → Pages**, choose the `main` branch and `/ (root)`.
