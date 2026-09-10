# Handoff

State of the project as of 2026-09-10, written so work can resume from a cold
start.

## Where things are

- Repository: `https://gitlab.com/muhammadleziz/world-watcher`, private, branch `main`
- Everything committed and pushed; the working tree is clean
- `npm install && npm run start:web` brings the app up on port 4200

## What exists

An npm workspaces monorepo:

- `packages/shared` holds the domain model. `IStream`, `StreamCategory` and the
  region helpers are declared once and used by both sides.
- `apps/web` is the Angular 22 application: a Leaflet map, category filters, a
  stream list, prefix search and an embedded player, all driven by NgRx
  (classic Store, Effects and Entity).
- `data/streams.seed.json` is the hand-curated catalogue. Four entries so far.
- `scripts/build-catalogue.mjs` turns that file into `apps/web/public/streams.json`,
  deriving regions and rejecting bad categories and duplicate ids.

## What does not exist yet

- `apps/api`: NestJS 12 + Prisma + PostgreSQL, with `GET /api/streams` and a
  seeder replacing the build script. `environment.ts` already has an `apiUrl`
  and the static catalogue already matches the intended response shape, so the
  swap is a one-line change.
- The liveness cron that marks dead streams.
- `.gitlab-ci.yml`.
- The bulk of the catalogue. This is the longest task: finding permanent streams
  for Istanbul, Tashkent, Samarkand, Almaty, Baku, Bishkek and Kazan.

## Decisions worth not relitigating

- The map is worldwide. Coverage of the Muslim world and the CIS is denser than
  elsewhere, and that density is the point of difference, not exclusivity.
- Interfaces carry an `I` prefix. This is enforced by ESLint, inherited from the
  starter template.
- Search matches a prefix per field. Not a substring search.
- The player carries no `autoplay` and no `mute`. See the comment in
  `stream-player.ts` for why; reintroducing autoplay brings back a sound bug.

## Open items needing the account owner

- GitLab identity verification (phone or card) before shared runners will run
  pipelines. CI is blocked until then.
- A YouTube Data API key, needed only for viewer counts and exact live status.
  Basic liveness works through the keyless oEmbed endpoint.
- A design artifact the user linked could not be read and has not been applied.
