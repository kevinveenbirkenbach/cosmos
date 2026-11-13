# Cosmos

The live sky over the viewer as a calm page background: sun, moon, stars and twilight at the viewer's place and time, in one dependency-free ES module with two Web Components, `<cosmos-sky>` and `<cosmos-globe>`.

## Use

```html
<script type="module" src="https://cosmos.example.org/js/cosmos.js"></script>
<cosmos-sky></cosmos-sky>
```

`Alt+Shift+C` opens the settings. Attributes, CSS properties and menu hooks: [Embedding.md](./Embedding.md).

## Layout

- [ansible/roles/web-app-cst-cosmos/](./ansible/roles/web-app-cst-cosmos/): the Infinito.Nexus custom role; it deploys the cosmos page and publishes the library for every designed app. The library itself is [files/javascript/cosmos.js](./ansible/roles/web-app-cst-cosmos/files/javascript/cosmos.js).
- [docs/requirements/](./docs/requirements/): requirements.
- [tests/](./tests/): unit tests, `node --test tests/`.
- [tools/data.py](./tools/data.py): `python3 -I tools/data.py` rebuilds the `DATA` line of `cosmos.js` (stars, land mask, timezones) from pinned sources.

## License

[MIT](./LICENSE); third-party data: [NOTICE.md](./NOTICE.md).
