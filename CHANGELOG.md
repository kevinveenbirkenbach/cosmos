# Changelog

## [0.2.2] - 2026-11-17

Fixed:

- Tests: the granted-location test skips targets served over plain HTTP

Contributors:

- [Kevin Veen-Birkenbach](https://veen.world): onion test compatibility

## [0.2.1] - 2026-11-14

Fixed:

- Role: library source is *cosmos.mjs* for the core lint; CDN path unchanged

Contributors:

- [Kevin Veen-Birkenbach](https://veen.world): production lint compatibility

## [0.2.0] - 2026-11-14

Breaking:

- Role: *web-app-cst-cosmos* loads its stack through *svc-stack* of core

Added:

- Logout: the role declares its own back-channel logout row; SSO stays off

Upgrade notes:

- Core: pin *v0.2.0* only on the IAM line; core main keeps *v0.1.0*

Contributors:

- [Kevin Veen-Birkenbach](https://veen.world): stack migration, logout row

## [0.1.0] - 2026-11-13

Added:

- Sky: *cosmos-sky* paints sun, moon, bright stars and twilight live
- Location: browser position kept on the device, time zone as fallback
- Phone: the sky follows the device orientation once motion is allowed
- Theme: CSS custom properties with the *--cosmos-* prefix on the page root
- Contrast: text keeps 4.5:1 against the upper sky at every hour
- Menu: *cosmos-globe* shows the live day and night line of the Earth
- Settings: *Alt+Shift+C* opens the panel; *window.cosmos* drives it
- Pages: a page with its own background keeps it; the stars stay hidden
- Role: *web-app-cst-cosmos* serves cosmos on the Infinito.Nexus CDN
- Public: any site can load <https://cosmos.infinito.nexus/js/cosmos.js>
- Data: *tools/data.py* rebuilds star, land and zone data from pinned sources

Contributors:

- [Kevin Veen-Birkenbach](https://veen.world): sky library, role, data
