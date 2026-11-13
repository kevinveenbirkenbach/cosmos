# Cosmos

## Description

[Cosmos](https://github.com/kevinveenbirkenbach/cosmos) is the live sky over the viewer as a calm page background: sun, moon, stars and twilight at the viewer's place and time, drawn by two dependency-free Web Components, `<cosmos-sky>` and `<cosmos-globe>`, in one native ES module.

## Overview

This custom role publishes the library on the shared CDN, from where every designed app loads it same-origin, and serves a full-screen cosmos page on its own domain from the same files.
The contract for apps and pages that embed the library is [Embedding.md](https://github.com/kevinveenbirkenbach/cosmos/blob/main/Embedding.md).

## Features

- **Real sky:** Sun, moon with its phase, and the catalogue stars to magnitude 4.5 stand where they stand for the viewer right now.
- **Prompt-free place:** The timezone gives the place without asking; precise GPS is used silently when the browser already allows it, else on a click, and never leaves the browser.
- **Phone orientation:** On a phone the sky turns with the device and shows the direction it points at.
- **Corporate colors:** `--cosmos-*` custom properties hand the sky colors and a text color with at least 4.5:1 against the upper sky to every design.
- **Keyboard and menus:** `Alt+Shift+C` opens the settings; apps hook them into their own menus through `<cosmos-globe>`, `data-cosmos-open`, `window.cosmos` and `#cosmos`.
- **Shared off switch:** Mode and orientation hold across all apps of a deployment through one cookie on the parent domain.
- **Light and strict:** One file, no build step, no inline script or style, one repaint a minute, nothing drawn inside frames.

## Further resources

- [Cosmos repository](https://github.com/kevinveenbirkenbach/cosmos), licensed under the [MIT License](https://github.com/kevinveenbirkenbach/cosmos/blob/main/LICENSE)
- [Third-party data](https://github.com/kevinveenbirkenbach/cosmos/blob/main/NOTICE.md)
