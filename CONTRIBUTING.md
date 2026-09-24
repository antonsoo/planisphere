# Contributing

This started as a personal project, but issues and pull requests are welcome.

## Setup

```sh
git clone https://github.com/antonsoo/planisphere.git
cd planisphere
npm ci
```

## Workflow

- `npm run dev` — Vite dev server.
- `npm run test` — runs the Vitest suite (`vitest run`).
- `npm run lint` / `npm run lint:fix` — Biome.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — typechecks then builds the static site to `dist/`.

PRs should keep `npm run lint`, `npm run typecheck`, and `npm run test` green.

## Regenerating the star catalogue

The app reads `public/data/stars.json` and `public/data/constellations.json`,
which are generated, not hand-written. To rebuild them from the HYG database:

```sh
./scripts/fetch_hygdata.sh
python3 scripts/build_catalogue.py
python3 scripts/build_constellations.py
```

These are dev-time data-generation scripts; they are not part of the app's
build, lint, or test pipeline.

## License

MIT. Contributions are accepted under the same license.
