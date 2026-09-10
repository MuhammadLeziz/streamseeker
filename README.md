# World Watcher

A map of live streams from around the world, with the densest coverage over the
Muslim world and the CIS. Inspired by [worldwatcher.live](https://worldwatcher.live/),
not a copy of it.

## What is different here

- Religious places are split into **mosques**, **madrasas** and **shrines**
  instead of sitting in one generic bucket.
- Two categories the original does not have: **bazaars** and **mountains**.
- Region filters for the **CIS** and the **Muslim world**. Regions overlap on
  purpose: Uzbekistan belongs to all of CIS, Central Asia and the Muslim world.
- Stream liveness is tracked, so dead videos drop off the map instead of
  quietly rotting into broken links.
- Busy locations carry a backup feed. If the primary stream dies, the map point
  survives on the spare.

## Stack

| Layer | Technology |
| --- | --- |
| Front end | Angular 22, NgRx 22 (Store, Effects, Entity), Leaflet |
| Back end | NestJS 12, PostgreSQL, Prisma |
| CI/CD | GitLab CI |
| Infrastructure | Docker, docker compose |

## Layout

```
apps/web         Angular application
apps/api         NestJS API (not built yet)
packages/shared  Domain model shared by both sides
data             Curated stream catalogue
scripts          Build helpers
```

An npm workspaces monorepo. `IStream` and `StreamCategory` are declared once in
`packages/shared` and used by both the front end and the API, so the two cannot
drift apart.

## Running it

```bash
npm install
```

```bash
npm run start:web
```

The app comes up on `http://localhost:4200`.

`packages/shared` compiles to `dist/`, so it has to be built before the app runs
and rebuilt after any change to the shared types:

```bash
npm run build:shared
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run start:web` | Angular dev server on port 4200 |
| `npm run build` | Build every package |
| `npm run build:catalogue` | Rebuild the static catalogue from `data/streams.seed.json` |
| `npm run lint` | ESLint and Prettier across all workspaces |
| `npm run lint:fix` | The same, with auto-fixes applied |
| `npm run test` | Unit tests (Vitest) |

## The catalogue

Streams live in [`data/streams.seed.json`](data/streams.seed.json). Every entry
carries the camera coordinates rather than the city centre, a category, a
country code and the source channel.

`npm run build:catalogue` turns that file into `apps/web/public/streams.json`,
deriving regions from the country code and rejecting unknown categories and
duplicate video ids. The generated file is not committed. Once the API exists,
this step becomes the Prisma seeder and the response shape stays as it is.

Only official broadcasters are used where they exist. Small channels tend to
restream someone else's feed, and those are the first to go dark.

## Conventions

- Interfaces carry an `I` prefix (`IStream`, `IStreamsState`), enforced by
  `@typescript-eslint/naming-convention` in `apps/web/eslint.config.js`.
- Prettier owns formatting. ESLint stylistic rules that fight it are turned off.
- Colour has three separate roles that never mix: one amber accent for
  interaction, category hues purely as data encoding, red reserved for live
  status.
