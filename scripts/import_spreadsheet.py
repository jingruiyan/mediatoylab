"""Build data/collection.js and images/ from the collection spreadsheet.

Usage (from the repo root):
    python3 scripts/import_spreadsheet.py "Media Objects Collection.xlsx"

Uses only the Python standard library. Re-run it whenever the spreadsheet changes.
Only public-facing columns are exported; room, location, serial number, owner,
purchaser, provenance and internal notes stay in the spreadsheet.
The "Blank or Stock Media" and "Tools" sheets are lab inventory and are skipped.
"""
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
RID = "{%s}id" % NS["r"]
EMBED = "{%s}embed" % NS["r"]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGE_DIR = os.path.join(ROOT, "images")
OUT_FILE = os.path.join(ROOT, "data", "collection.js")
MAX_IMAGE_PX = 1200

# Display order; toys come first throughout the site.
CATEGORIES = [
    {"id": "toys", "name": "Toys"},
    {"id": "games", "name": "Video Games"},
    {"id": "film", "name": "Film & Photography"},
    {"id": "recordings", "name": "Recordings"},
    {"id": "devices", "name": "Devices & Instruments"},
]

# Objects the spreadsheet doesn't tag as "Toy" but that belong with the toys.
EXTRA_TOY_WORDS = ["play-n-learn", "pre-computer", "telegraph signal", "makey-makey"]
GAME_WORDS = ["atari", "vectrex", "joystick"]
FILM_WORDS = ["projector", "camera", "8mm", "16mm", "splicer", "magic lantern", "brownie", "handycam", "editor"]
RECORDING_WORDS = ["wax cylinder", "music roll"]


# ---------- xlsx reading ----------

def read_rels(z, path):
    d, b = posixpath.split(path)
    rp = posixpath.join(d, "_rels", b + ".rels")
    if rp not in z.namelist():
        return {}
    return {
        r.get("Id"): posixpath.normpath(posixpath.join(d, r.get("Target")))
        for r in ET.fromstring(z.read(rp)).findall("rel:Relationship", NS)
    }


def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_workbook(path):
    """Return (zipfile, {sheet name: {"rows": {row: {col: text}}, "images": {row: media path}}})."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb_rels = read_rels(z, "xl/workbook.xml")
    sheets = {}
    for s in ET.fromstring(z.read("xl/workbook.xml")).find("m:sheets", NS):
        spath = wb_rels[s.get(RID)]
        root = ET.fromstring(z.read(spath))
        rows = {}
        for row in root.iter("{%s}row" % NS["m"]):
            vals = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                if c.get("t") == "s" and v is not None:
                    val = shared[int(v.text)]
                elif c.get("t") == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                else:
                    val = v.text if v is not None else ""
                if val and val.strip():
                    vals[col_index(c.get("r"))] = val.strip()
            if vals:
                rows[int(row.get("r")) - 1] = vals
        images = {}
        sheet_rels = read_rels(z, spath)
        for d in root.findall("m:drawing", NS):
            dpath = sheet_rels[d.get(RID)]
            drawing_rels = read_rels(z, dpath)
            for anchor in ET.fromstring(z.read(dpath)):
                frm, blip = anchor.find("xdr:from", NS), anchor.find(".//a:blip", NS)
                if frm is not None and blip is not None:
                    images.setdefault(int(frm.find("xdr:row", NS).text), drawing_rels.get(blip.get(EMBED)))
        sheets[s.get("name")] = {"rows": rows, "images": images}
    return z, sheets


# ---------- cleaning ----------

def clean_year(v):
    if not v:
        return ""
    v = re.sub(r"^(\d{4})\.0$", r"\1", v.strip())
    if v.lower() in ("unknown", "n/a"):
        return ""
    v = re.sub(r"(?i)^unknown,\s*(\d0)s$", r"19\1s", v)
    return re.sub(r"\bOr\b", "or", v)


def clean_number(v):
    return re.sub(r"\.0$", "", v) if v else ""


def credit_line(donor):
    if not donor:
        return ""
    return donor if donor.lower().startswith("gift") else f"Gift of {donor}"


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", " and ")).strip("-")
    return s[:60].rstrip("-")


def categorize(title, item_type, related):
    t = title.lower()
    if item_type.lower() in ("toy", "educational toy") or any(w in t for w in EXTRA_TOY_WORDS):
        return "toys"
    if item_type.lower() == "optical device":
        return "devices"
    if any(w in t for w in GAME_WORDS):
        return "games"
    if any(w in t for w in RECORDING_WORDS):
        return "recordings"
    if item_type.lower() in ("projector", "camera", "video camera") or any(w in t for w in FILM_WORDS):
        return "film"
    return "devices"


# ---------- sheets -> objects ----------

def objects_sheet(sheet):
    out = []
    for r, v in sorted(sheet["rows"].items()):
        if r == 0 or not v.get(1):
            continue
        out.append({
            "_row": r,
            "accession": v.get(0, ""),
            "title": v[1],
            "category": categorize(v[1], v.get(18, ""), v.get(17, "")),
            "type": v.get(18, ""),
            "year": clean_year(v.get(8)),
            "maker": v.get(5, ""),
            "model": v.get(6, ""),
            "origin": v.get(16, ""),
            "materials": v.get(14, ""),
            "size": v.get(15, ""),
            "parts": clean_number(v.get(2, "")),
            "related": v.get(17, ""),
            "credit": credit_line(v.get(12, "")),
            "description": v.get(21, ""),
        })
    return out


def media_sheet(sheet, category, type_label):
    """Video games and VHS sheets share the same column layout."""
    out = []
    for r, v in sorted(sheet["rows"].items()):
        if r == 0 or not v.get(1):
            continue
        out.append({
            "_row": r,
            "accession": v.get(0, ""),
            "title": v[1],
            "category": category,
            "type": v.get(9, "") or type_label,
            "year": clean_year(v.get(4)),
            "maker": v.get(2, ""),
            "model": v.get(3, ""),
            "length": v.get(10, ""),
            "credit": credit_line(v.get(8, "")),
            "description": "",
        })
    return out


def films_sheet(sheet):
    out = []
    for r, v in sorted(sheet["rows"].items()):
        if r == 0 or not v.get(1):
            continue
        minutes = clean_number(v.get(7, ""))
        out.append({
            "_row": r,
            "accession": "",
            "title": v[1],
            "category": "recordings",
            "type": "16mm film",
            "year": clean_year(v.get(2)),
            "maker": v.get(4, ""),
            "director": v.get(3, ""),
            "length": f"{minutes} min" if minutes else "",
            "description": v.get(14, ""),
        })
    return out


def save_image(z, media_path, item_id):
    dest = os.path.join(IMAGE_DIR, item_id + os.path.splitext(media_path)[1].lower())
    with z.open(media_path) as src, open(dest, "wb") as out:
        shutil.copyfileobj(src, out)
    if shutil.which("sips"):  # macOS: shrink large photos for the web
        subprocess.run(["sips", "-s", "formatOptions", "normal", "-Z", str(MAX_IMAGE_PX), dest], capture_output=True)
    return "images/" + os.path.basename(dest)


def main(xlsx):
    z, sheets = read_workbook(xlsx)
    sources = [
        ("Collection Objects", objects_sheet),
        ("Collection Media Video Games", lambda s: media_sheet(s, "games", "Cartridge")),
        ("Collection Media VHS Tapes", lambda s: media_sheet(s, "recordings", "VHS")),
        ("Collection Media 16mm Films", films_sheet),
    ]
    os.makedirs(IMAGE_DIR, exist_ok=True)
    items, used_ids = [], set()
    for name, parse in sources:
        if name not in sheets:
            print(f"warning: sheet '{name}' not found", file=sys.stderr)
            continue
        for item in parse(sheets[name]):
            base = slugify(item["title"]) or "object"
            item_id, n = base, 2
            while item_id in used_ids:
                item_id, n = f"{base}-{n}", n + 1
            used_ids.add(item_id)
            media = sheets[name]["images"].get(item.pop("_row"))
            item = {"id": item_id, **{k: v for k, v in item.items() if v},
                    "image": save_image(z, media, item_id) if media else ""}
            items.append(item)

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/import_spreadsheet.py — edit the spreadsheet and re-run\n")
        f.write("// rather than editing this file by hand.\n\n")
        f.write("const CATEGORIES = " + json.dumps(CATEGORIES, indent=2, ensure_ascii=False) + ";\n\n")
        f.write("const TOYS = " + json.dumps(items, indent=2, ensure_ascii=False) + ";\n")

    counts = {c["id"]: sum(i["category"] == c["id"] for i in items) for c in CATEGORIES}
    print(f"{len(items)} objects, {sum(bool(i['image']) for i in items)} with photos: {counts}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "Media Objects Collection.xlsx"))
