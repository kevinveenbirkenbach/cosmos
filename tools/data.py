import argparse
import base64
import hashlib
import json
import pathlib
import re
import urllib.request
from decimal import ROUND_HALF_UP, Decimal

STARS_URL = (
    "https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/"
    "abffb3b7223ae37e879b0a3ff5b49ad06aed5576/bsc5-orig.json"
)
STARS_SHA256 = "28cb835cbd2d72ced9ef9d20d9b5d92f05f649dfd39a509b1cf82dbd3c5f2fb9"
LAND_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_land.geojson"
)
LAND_SHA256 = "9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9"
MAGNITUDE_LIMIT = Decimal("4.5")
PEAK_ONLY = {868, 5958}
WIDTH = 180
HEIGHT = 90
DATA_LINE = re.compile(r"^export const DATA = .*;$", re.MULTILINE)


def fetch(url, sha256):
    with urllib.request.urlopen(url, timeout=60) as response:
        body = response.read()
    digest = hashlib.sha256(body).hexdigest()
    if digest != sha256:
        raise SystemExit(f"{url}: sha256 {digest}, expected {sha256}")
    return body


def rounded(value, step):
    return float(value.quantize(Decimal(step), rounding=ROUND_HALF_UP)) + 0.0


def sexagesimal(degrees, minutes, seconds):
    return Decimal(degrees) + Decimal(minutes) / 60 + Decimal(seconds) / 3600


def stars(catalogue):
    selected = []
    for star in catalogue:
        if "Vmag" not in star or Decimal(star["Vmag"]) > MAGNITUDE_LIMIT or int(star["HR"]) in PEAK_ONLY:
            continue
        ra = 15 * sexagesimal(star["RAh"], star["RAm"], star["RAs"])
        dec = sexagesimal(star["DEd"], star["DEm"], star["DEs"])
        if star["DE-"] == "-":
            dec = -dec
        selected.append((Decimal(star["Vmag"]), int(star["HR"]), ra, dec))
    selected.sort()
    return [
        [rounded(ra, "0.01") % 360, rounded(dec, "0.01"), rounded(vmag, "0.1")]
        for vmag, _, ra, dec in selected
    ]


def rings(geometry):
    polygons = geometry["coordinates"]
    if geometry["type"] == "Polygon":
        polygons = [polygons]
    for polygon in polygons:
        yield from polygon


def land(collection):
    edges = [
        (x1, y1, x2, y2)
        for feature in collection["features"]
        for ring in rings(feature["geometry"])
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1])
    ]
    mask = bytearray(WIDTH * HEIGHT // 8)
    for row in range(HEIGHT):
        lat = 89 - 2 * row
        crossings = [
            x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
            for x1, y1, x2, y2 in edges
            if (y1 > lat) != (y2 > lat)
        ]
        for column in range(WIDTH):
            lon = -179 + 2 * column
            if sum(x > lon for x in crossings) % 2:
                index = row * WIDTH + column
                mask[index >> 3] |= 0x80 >> (index & 7)
    return bytes(mask)


def angle(text, degree_digits):
    digits = text[1:]
    value = sexagesimal(
        digits[:degree_digits],
        digits[degree_digits : degree_digits + 2],
        digits[degree_digits + 2 :] or "0",
    )
    return -value if text[0] == "-" else value


def iso6709(text):
    split = max(text.rfind("+"), text.rfind("-"))
    return angle(text[:split], 2), angle(text[split:], 3)


def zones(zoneinfo):
    places = {}
    for table in ("zone1970.tab", "zone.tab"):
        for line in (zoneinfo / table).read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                fields = line.split("\t")
                places.setdefault(fields[2], iso6709(fields[1]))
    names = set(places)
    links = {}
    for line in (zoneinfo / "tzdata.zi").read_text(encoding="utf-8").splitlines():
        fields = line.split()
        if fields[:1] == ["Z"]:
            names.add(fields[1])
        elif fields[:1] == ["L"]:
            links[fields[2]] = fields[1]
            names.add(fields[2])
    table = {}
    for name in sorted(names):
        target, seen = name, set()
        while target not in places and target in links and target not in seen:
            seen.add(target)
            target = links[target]
        if target in places:
            lat, lon = places[target]
            table[name] = [rounded(lat, "0.1"), rounded(lon, "0.1")]
    return table


def main():
    parser = argparse.ArgumentParser(description="Rewrite the DATA line of cosmos.mjs: stars, land and zones.")
    parser.add_argument(
        "--zoneinfo",
        type=pathlib.Path,
        default=pathlib.Path("/usr/share/zoneinfo"),
        help="directory holding zone.tab, zone1970.tab and tzdata.zi",
    )
    parser.add_argument(
        "--library",
        type=pathlib.Path,
        default=pathlib.Path(__file__).resolve().parents[1]
        / "ansible"
        / "roles"
        / "web-app-cst-cosmos"
        / "files"
        / "javascript"
        / "cosmos.mjs",
        help="cosmos.mjs whose DATA line is rewritten",
    )
    args = parser.parse_args()
    mask = land(json.loads(fetch(LAND_URL, LAND_SHA256)))
    data = {
        "stars": stars(json.loads(fetch(STARS_URL, STARS_SHA256))),
        "land": base64.b64encode(mask).decode("ascii"),
        "zones": zones(args.zoneinfo),
    }
    line = f"export const DATA = {json.dumps(data, separators=(',', ':'))};"
    source, count = DATA_LINE.subn(lambda _match: line, args.library.read_text(encoding="utf-8"))
    if count != 1:
        raise SystemExit(f"{args.library}: {count} DATA lines, expected 1")
    args.library.write_text(source, encoding="utf-8")
    fraction = int.from_bytes(mask).bit_count() / (WIDTH * HEIGHT)
    print(
        f"{args.library}: {len(data['stars'])} stars, land fraction {fraction:.4f}, "
        f"{len(data['zones'])} zones, DATA line {len(line)} bytes"
    )


if __name__ == "__main__":
    main()
