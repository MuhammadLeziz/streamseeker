# World Watcher

Карта прямых трансляций со всего мира. Своя версия идеи
[worldwatcher.live](https://worldwatcher.live/) с упором на исламские страны и СНГ.

## Чем отличается от оригинала

- Религиозные места разбиты на **мечети**, **медресе** и **зияраты** вместо одной общей категории.
- Добавлены **базары** и **горы**.
- Быстрые фильтры по регионам: **СНГ** и **мусульманский мир**.
- Статус эфира отслеживается автоматически, мёртвые трансляции не показываются.

## Стек

| Слой | Технологии |
| --- | --- |
| Фронтенд | Angular 22, NgRx 22 (Store / Effects / Entity), Leaflet |
| Бэкенд | NestJS 12, PostgreSQL, Prisma |
| CI/CD | GitLab CI |
| Инфраструктура | Docker, docker-compose |

## Структура

```
apps/web        Angular-приложение
apps/api        NestJS API (в работе)
packages/shared Общие типы и доменная логика
```

Монорепо на npm workspaces. Типы `IStream` и `StreamCategory` описаны один раз
в `packages/shared` и используются и фронтом, и бэком.

## Запуск

```bash
npm install
npm run build:shared
npm run start:web
```

`packages/shared` собирается в `dist/`, поэтому его нужно собрать до первого
запуска приложения и пересобирать после правок в общих типах:

```bash
npm run build:shared
```

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run start:web` | Дев-сервер Angular на `http://localhost:4200` |
| `npm run build` | Сборка всех пакетов |
| `npm run lint` | ESLint + Prettier по всем воркспейсам |
| `npm run lint:fix` | То же с автоисправлением |
| `npm run test` | Юнит-тесты (Vitest) |

## Соглашения

- Интерфейсы пишутся с префиксом `I` (`IStream`, `IStreamsState`) — это правило
  `@typescript-eslint/naming-convention` в `apps/web/eslint.config.js`.
- Форматированием владеет Prettier, стилистические правила ESLint с ним не спорят.
