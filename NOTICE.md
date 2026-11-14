# Notice

cosmos is released under the MIT licence (see `LICENSE`). It embeds data from
the third-party sources below; its icons are its own. `tools/data.py`
regenerates the `DATA` line of
`ansible/roles/web-app-cst-cosmos/files/javascript/cosmos.mjs` from them; it
pins each download to a commit and a SHA-256.

## Bright stars: Yale Bright Star Catalogue

- **Name**: The Bright Star Catalogue, 5th Revised Ed. (Preliminary Version),
  Hoffleit D., Warren Jr W.H., Astronomical Data Center, NSSDC/ADC (1991),
  CDS catalogue V/50; JSON conversion `bsc5-orig.json` by Bretton Wade.
- **Version**: `brettonw/YaleBrightStarCatalog` commit
  `abffb3b7223ae37e879b0a3ff5b49ad06aed5576`, file `bsc5-orig.json`
  (SHA-256 `28cb835cbd2d72ced9ef9d20d9b5d92f05f649dfd39a509b1cf82dbd3c5f2fb9`).
- **URL**: <https://github.com/brettonw/YaleBrightStarCatalog>
- **Licence**: MIT
- **Licence URL**:
  <https://github.com/brettonw/YaleBrightStarCatalog/blob/abffb3b7223ae37e879b0a3ff5b49ad06aed5576/LICENSE>
- **Upstream terms**: the catalogue's own ReadMe (V/50, shipped as
  `bsc5.readme.txt` in the same commit) states no copyright. HEASARC, which
  distributes the catalogue for NASA, states: "HEASARC materials are all
  available freely for your use."
  (<https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html>)
- **Extracted**: `DATA.stars`: the J2000 right ascension and
  declination (fields `RAh` to `DEs`, in degrees, rounded to 0.01) and `Vmag`
  (rounded to 0.1) of the 902 entries with `Vmag` <= 4.50, brightest first.
  890 of them are Johnson V; 12 carry the original HR magnitude
  (`n_Vmag` = `H`). Left out: the Mira R Hor (HR 868) and the recurrent nova
  T CrB (HR 5958), which the catalogue lists at their peak brightness.

```text
MIT License

Copyright (c) 2016 Bretton Wade

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Land mask: Natural Earth

- **Name**: Natural Earth 1:110m physical vectors, Land (`ne_110m_land`)
- **Version**: `nvkelso/natural-earth-vector` commit
  `ca96624a56bd078437bca8184e78163e5039ad19` (`VERSION` file: `5.2.0-pre`),
  file `geojson/ne_110m_land.geojson`
  (SHA-256 `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`).
- **URL**: <https://www.naturalearthdata.com/>,
  <https://github.com/nvkelso/natural-earth-vector>
- **Licence**: public domain: "All versions of Natural Earth raster + vector
  map data found on this website are in the public domain."
- **Licence URL**: <https://www.naturalearthdata.com/about/terms-of-use/>
  (repeated in `LICENSE.md` of the same commit)
- **Extracted**: `DATA.land`: a 180 x 90 equirectangular land
  mask of 2 degree pixels (row 0 covers 90N to 88N, column 0 covers 180W to
  178W), each pixel centre tested even-odd against every polygon ring, packed
  MSB-first and row-major, base64-encoded. Made with Natural Earth.

## Time zones: IANA tz database

- **Name**: IANA Time Zone Database (tzdata)
- **Version**: 2026e, as installed in `/usr/share/zoneinfo` (`zone.tab`,
  `zone1970.tab`, `tzdata.zi`)
- **URL**: <https://www.iana.org/time-zones>, <https://github.com/eggert/tz>
- **Licence**: public domain: "Unless specified below, all files in the tz
  code and data (including this LICENSE file) are in the public domain."
  (`tzdata.zi` itself: "This zic input file is in the public domain.")
- **Licence URL**: <https://github.com/eggert/tz/blob/2026e/LICENSE>
- **Extracted**: `DATA.zones`: the ISO 6709 coordinates of
  every zone in `zone1970.tab` and `zone.tab`, rounded to 0.1 degree, plus
  every `L` link alias of `tzdata.zi` resolved transitively to a name with
  coordinates. Names without coordinates (`UTC`, `GMT`, `Etc/*`, `Factory`,
  `CST6CDT`, `EST5EDT`, `MST7MDT`, `PST8PDT`) are left out.
