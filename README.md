# Manara

A map of live streams from around the world, with the densest coverage over the
Muslim world and the CIS. Inspired by [worldwatcher.live](https://worldwatcher.live/),
not a copy of it.

_Manara_ (منارة) is a lighthouse, and a minaret: from the root ن-و-ر, light. It
stands high and looks out at the world, which is what this does. The name says
nothing about which part of the world, so the map stays global.

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

| Layer          | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Front end      | Angular 22, NgRx 22 (Store, Effects, Entity), Leaflet |
| Back end       | NestJS 12, PostgreSQL, Prisma                         |
| CI/CD          | GitLab CI                                             |
| Infrastructure | Docker, docker compose                                |

## Layout

```
apps/web         Angular application
apps/api         NestJS API
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

The app comes up on `http://localhost:4200`. It reads the static catalogue from
`public/`, so the API is not needed to see the map.

`packages/shared` compiles to `dist/`, so it has to be built before the app runs
and rebuilt after any change to the shared types:

```bash
npm run build:shared
```

It emits twice, ESM and CommonJS, because Angular and the Node scripts import it
while NestJS requires it.

### The API

Copy `apps/api/.env.example` to `apps/api/.env`, then bring up PostgreSQL and
create the schema:

```bash
npm run db:up
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run start:api
```

The API comes up on `http://localhost:3000/api`. `GET /api/health` reports on the
database as well as on the process, so a server answering with an unreachable
database still reads as degraded.

`GET /api/streams` returns the whole catalogue as `{ items, total }`, the same
shape the static file already has. It accepts `categories`, `regions`,
`countries`, `statuses`, `search` and `bounds`, each comma separated:

```
/api/streams?regions=cis,muslim-world&categories=mosque&search=med
```

There is no pagination, on purpose. The front end holds every point in NgRx and
filters in selectors, so toggling a category touches no network. If the
catalogue ever outgrows a single response, `bounds` is the way to cut it down.

## Commands

| Command                     | What it does                                               |
| --------------------------- | ---------------------------------------------------------- |
| `npm run start:web`         | Angular dev server on port 4200                            |
| `npm run start:api`         | NestJS in watch mode on port 3000                          |
| `npm run build`             | Build every package                                        |
| `npm run db:up` / `db:down` | PostgreSQL in Docker                                       |
| `npm run db:migrate`        | Apply migrations and regenerate the Prisma client          |
| `npm run db:seed`           | Load `data/streams.seed.json` into the database            |
| `npm run build:catalogue`   | Rebuild the static catalogue from `data/streams.seed.json` |
| `npm run lint`              | ESLint and Prettier across all workspaces                  |
| `npm run lint:fix`          | The same, with auto-fixes applied                          |
| `npm run test`              | Unit tests (Vitest)                                        |

## The catalogue

Streams live in [`data/streams.seed.json`](data/streams.seed.json). Every entry
carries the camera coordinates rather than the city centre, a category, a
country code and the source channel.

`npm run build:catalogue` turns that file into `apps/web/public/streams.json`,
deriving regions from the country code and rejecting unknown categories and
duplicate video ids. The generated file is not committed.

`apps/api/prisma/seed.ts` reads the same file into PostgreSQL, matching on the
YouTube video id so that re-running it updates rather than duplicates. Both
readers stay for now: the front end is still pointed at the static file, and
switching it over is a one-line change in `environment.ts`.

Only official broadcasters are used where they exist. Small channels tend to
restream someone else's feed, and those are the first to go dark.

## Conventions

- Interfaces carry an `I` prefix (`IStream`, `IStreamsState`), enforced by
  `@typescript-eslint/naming-convention` in both eslint configs.
- Search matches a **prefix** per field: title, city, country code and each tag
  separately. "med" finds Medina and must not find "Ahmed". The rule is
  implemented twice, in the NgRx selectors and in `StreamsService`, and the two
  have to agree.
- Prettier owns formatting. ESLint stylistic rules that fight it are turned off.
- Colour has three separate roles that never mix: one amber accent for
  interaction, category hues purely as data encoding, red reserved for live
  status.
- The map is the page. Everything else floats over it and gets out of the way:
  the search bar is pinned at the top, and the results panel exists only while
  there is a query.
