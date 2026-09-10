# Handoff

State of the project as of 2026-09-10, written so work can resume from a cold
start.

## Where things are

- Repository: `https://gitlab.com/muhammadleziz/streamseeker`, private, branch `main`
- `npm install && npm run start:web` brings the app up on port 4200
- The API needs PostgreSQL; see "Running it" in the README

## What exists

An npm workspaces monorepo:

- `packages/shared` holds the domain model. `IStream`, `StreamCategory` and the
  region helpers are declared once and used by both sides. It emits twice, ESM
  and CommonJS, because Angular and the Node scripts import it while NestJS
  requires it.
- `apps/web` is the Angular 22 application: a full-bleed Leaflet map with the
  interface floating over it, all driven by NgRx (classic Store, Effects and
  Entity).
- `apps/api` is the NestJS 12 service: `GET /api/streams`, `GET /api/streams/:id`
  and `GET /api/health`, over Prisma 7 and PostgreSQL.
- `data/streams.seed.json` is the hand-curated catalogue. 122 entries, every one
  verified embeddable by `npm run check:catalogue`.
- `scripts/build-catalogue.mjs` turns that file into `apps/web/public/streams.json`;
  `apps/api/prisma/seed.ts` turns the same file into database rows.

## What does not exist yet

- **A first migration.** The machine this was written on has neither Docker nor
  PostgreSQL, so `prisma migrate dev` has never run and `apps/api/prisma/migrations`
  is empty. Everything else is verified: the API compiles, boots, maps its
  routes, and fails at startup with `ECONNREFUSED` exactly where it should. The
  first person with a database runs `npm run db:up && npm run db:migrate` and
  commits what Prisma writes.
- The front end still reads the static catalogue. `environment.ts` already
  carries `apiUrl`, and the API returns the same `{ items, total }` shape, so
  the swap is one line in `catalogueUrl`.
- The liveness cron that marks dead streams. The `status`, `lastCheckedAt` and
  `viewerCount` columns exist and are already returned; nothing writes them yet.
- `.gitlab-ci.yml`.
- The bulk of the catalogue. This is the longest task: finding permanent streams
  for Istanbul, Tashkent, Samarkand, Almaty, Baku, Bishkek and Kazan.

## Decisions worth not relitigating

- The map is worldwide. Coverage of the Muslim world and the CIS is denser than
  elsewhere, and that density is the point of difference, not exclusivity.
- The map is also the page. There is no sidebar; the search bar floats at the
  top and the results panel opens only while there is a query. Closing the panel
  clears the filters, because `panelOpen` is derived partly from them.
- Interfaces carry an `I` prefix. Enforced by ESLint on both sides.
- Search matches a prefix per field. Not a substring search. The rule is written
  twice, in the NgRx selectors and in `StreamsService.buildSearch`, and the two
  have to agree.
- Tags are rows in `StreamTag`, not a `String[]` column, so that prefix search
  over them can be expressed in Prisma instead of raw SQL.
- `regions` is derived from the country code at read time and never stored.
  Whether a country counts as CIS is a fact about the country, so storing it per
  row would mean rewriting every row of a country to correct one list.
- The player carries no `autoplay` and no `mute`. See the comment in
  `stream-player.ts` for why; reintroducing autoplay brings back a sound bug.

## Traps already paid for

- **Prisma 7 moved the connection URL** out of `schema.prisma`. It lives in
  `apps/api/prisma.config.ts`, Prisma no longer loads `.env` by itself, and the
  client now talks to PostgreSQL through `@prisma/adapter-pg`.
- **`prisma` on npm publishes an 8.0 release candidate under the `latest` tag.**
  Both `prisma` and `@prisma/client` are pinned to the stable 7.10 line.
- **The pg pool connects lazily**, so `$connect()` alone proves nothing: the
  server boots happily with no database behind it. `PrismaService` runs a
  `SELECT 1` to make the failure real.
- **Leaflet gives its own controls `z-index: 800`.** Floating panels have to
  clear that, which is what `--z-float` is for.
- **npm blocks install scripts by default here.** Prisma needs its own, so
  `npm install-scripts approve prisma @prisma/engines` is part of a fresh setup.

## Open items needing the account owner

- GitLab identity verification (phone or card) before shared runners will run
  pipelines. CI is blocked until then.
- A YouTube Data API key, needed only for viewer counts and exact live status.
  Basic liveness works through the keyless oEmbed endpoint.
- Docker Desktop, or any PostgreSQL, to generate the first migration.
- Renaming the GitLab project from `world-watcher` to `streamseeker`. The URL above
  already says `streamseeker`; until the rename happens it is aspirational. GitLab
  leaves a redirect from the old path, but `git remote set-url` still has to be
  run locally afterwards.
