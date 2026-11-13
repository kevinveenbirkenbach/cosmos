# Embedding

## Load

Infinito.Nexus apps load the library same-origin from the CDN path every vhost serves, so no Content Security Policy changes:

```html
<script type="module"
        src="/_infinito/cdn/roles/web-app-cst-cosmos/latest/js/cosmos.js?v=<version>"
        data-cosmos='{"zone": "Europe/Berlin", "cookieDomain": "example.org"}'></script>
```

- The script tag goes into `<head>`; never put `<cosmos-sky>` there, the module mounts it into `<body>` itself and mounts it again after a page replaces its body.
- `?v=` busts caches after a release; the module loads nothing else.
- `data-cosmos` keys, all optional:
  - `zone`: the IANA timezone of the deployment (core passes `HOST_TIMEZONE`); its place is the deployment default, used only when the browser's timezone hides the place (`UTC`, `Etc/*`, as Tor Browser reports).
  - `latitude`, `longitude`: exact coordinates for that default; they win over `zone`.
  - `cookieDomain`: the parent domain all apps share, so switching cosmos off once holds everywhere; without it the setting holds for this host only.
  - `hotkey`: replaces `alt+shift+c`, for example `ctrl+alt+k`.

Other pages load the public build, which every origin may fetch, and place the elements themselves:

```html
<script type="module" src="https://cosmos.infinito.nexus/js/cosmos.js"></script>
<cosmos-sky></cosmos-sky>
```

## Elements

| Element | Attributes |
| --- | --- |
| `<cosmos-sky>` | `latitude`, `longitude` (pin the place), `time` (an ISO instant that freezes the sky), `mode` (`full`, `colors`, `off`; the user's choice wins), `hotkey`, `cookie-domain` |
| `<cosmos-globe>` | `size` in px, at most 48; a menu icon that opens the settings |

Inside a frame, such as an app opened in the dashboard, the sky runs `colors` only and draws nothing.

## Properties

Set on `:root`, updated at least once a minute; the three colors are registered with `@property`, so they transition:

| Property | Value |
| --- | --- |
| `--cosmos-sky-top`, `--cosmos-sky-bottom` | The two gradient colors of the sky |
| `--cosmos-text` | Text color with at least 4.5:1 against `--cosmos-sky-top`, and against `--cosmos-sky-bottom` too while `data-cosmos-legible` is `all` |
| `--cosmos-scheme` | `light` or `dark`, matching `--cosmos-text` |
| `--cosmos-stage` | `night`, `astronomical`, `nautical`, `civil`, `golden` or `day` |
| `--cosmos-sun-altitude` | The sun altitude in degrees |

`<html>` also carries `data-cosmos-mode`, `data-cosmos-stage`, `data-cosmos-scheme` and `data-cosmos-legible`. `data-cosmos-legible` is `all` while one text color holds 4.5:1 against both gradient colors, and `top` around sunrise and sunset (sun altitude between about -2° and +4.5°), when a bright horizon under a dark upper sky leaves no such color: text that reaches the lower part of the page then needs its own surface, for example under `html[data-cosmos-legible="top"]`. Cosmos never writes `--design-*`, `color-scheme` or `data-design-theme`.

## Showing the sky behind an app

`<cosmos-sky>` is a fixed layer at `z-index: -1`. A page background does not reliably hide it: CSS paints the `html` background, and the `body` background when `html` has none, on the canvas beneath every layer. So cosmos checks the page itself and draws stars only while both `html` and `body` have a transparent background color and no background image; otherwise it keeps to the colors, sets `data-covered` on itself and says so in its panel. An app opts in by clearing both while cosmos runs:

```css
html[data-cosmos-mode="full"],
html[data-cosmos-mode="full"] body {
  background: transparent;
}
```

Cosmos checks on every `refresh()`, at the latest once a minute; an app that clears its background later calls `window.cosmos.refresh()` at once.

## Menus

- Any element with `data-cosmos-open` opens the settings on click.
- `<cosmos-globe>` opens them on click, Enter or Space.
- `window.cosmos.open()`, `close()`, `toggle()`, `refresh()`; `window.cosmos.settings` reads `{mode, orientation, place, open}` and takes `{mode, orientation}`.
- `cosmos:open`, `cosmos:close` and `cosmos:change` fire on `document`.
- A page opened with `#cosmos` shows the settings.
