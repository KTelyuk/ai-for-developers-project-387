# AGENTS.md

Сервис записи на звонок: владелец публикует типы встреч, гость бронирует свободный слот. Требования и правила — в [README.md](README.md).

## Команды

Окружение и задачи описаны в `mise.toml`. Все команды запускаются из корня.

- `mise install` — поставить Node.js и инструменты, затем `npm ci` (хук mise).
- `mise run install` — `npm ci` и установка git-хуков hk.
- `mise run dev` — бэкенд (:3000) и фронтенд (:5173) в фоне через mise daemons. Бэкенд стартует с флагом `--seed`: данные в памяти, поэтому после каждого перезапуска `node --watch` он заново создаёт типы встреч из `backend/src/dev-seed.ts`. Статус: `mise daemons status`, логи: `mise daemons logs backend`, остановка: `mise daemons stop`.
- `mise run check` — все проверки одной командой: сверка сгенерированного кода, линтеры, типы, тесты с покрытием и e2e в браузере против настоящего сервера. Её же вызывают CI и pre-push хук. Перед коммитом она должна проходить. Для e2e нужны браузеры: `npx playwright install chromium webkit`.
- `mise run lint` / `mise run format` — линтеры hk (Oxlint, oxfmt, jactionlint и др.) / автоисправление.
- `mise run typecheck`, `mise run test`, `mise run build`.
- `mise run e2e` — только e2e: собирает фронтенд, Playwright сам поднимает бэкенд. Входит в `check`.
- Один тест: `npm test -w backend -- test/health.test.ts`.
- `mise run generate` — после изменения `typespec/main.tsp`. `mise run check-generated` (входит в `check`) повторяет генерацию и падает, если результат отличается от закоммиченного.

## Устройство

npm workspaces: `typespec/`, `backend/`, `frontend/`.

- API начинается с контракта: `typespec/main.tsp` → `openapi/openapi.yaml` → SDK фронтенда в `frontend/src/api/` и типы бэкенда в `backend/src/api/`. Эти три пути — сгенерированные: вручную их не правят, а меняют контракт и запускают `mise run generate`.
- Бэкенд (Fastify) берёт маршруты и валидацию из `openapi/openapi.yaml` через `fastify-openapi-glue`. Обработчик — метод в `backend/src/handlers.ts` с именем, равным `operationId`. `buildApp()` в `backend/src/app.ts` используется и сервером, и тестами (`app.inject`).
- Бэкенд запускается Node.js напрямую из `.ts` (type stripping): только стираемый синтаксис, импорты с расширением `.ts`.
- Фронтенд: React + Vite + shadcn/ui, алиас `@/` → `frontend/src/`. Dev-сервер проксирует `/api` на бэкенд.
- TypeScript зафиксирован на 6.x: генератор SDK не работает с TypeScript 7.

## Правила

- Коммиты — [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`. Проверяет commit-msg хук hk.
- Коммит реализации заканчивает заголовок номером issue, который он закрывает: `feat: запись на свободный слот (#12)`. GitHub превращает номер в ссылку, и по истории видно, какой коммит какую задачу делал.
- Не изменять и не переименовывать `.github/workflows/hexlet-check.yml` — это проверка Хекслета.
- Агент в GitHub — `.github/workflows/claude.yml`: команда `@claude` в комментарии к issue или PR от доверенного участника. На один PR — не больше 3 запусков агента (задание `gate`), сбой или исчерпание бюджета задание `report` описывает комментарием. Воркфлоу агент не правит. При изменении воркфлоу агента обновлять раздел «Агент в GitHub» в `README.md`.
- Релизы ведёт release-please (`release-please-config.json`, `.release-please-manifest.json`): версию, `CHANGELOG.md` и манифест вручную не меняют — их обновляет release-PR.
- PR заполняют по шаблону `.github/pull_request_template.md`: ссылки на обращение, спецификацию, тикеты и согласование, проверки с SHA, риск и откат. Критерии ревью — `REVIEW.md`, их же получает авторевью `.github/workflows/review.yml`.
- PR, включая release-PR, сливают через squash (`gh pr merge --squash`): release-please читает `feat:` в теле merge-коммита как ещё один коммит, и пункт попадает в `CHANGELOG.md` дважды.
- Версии инструментов меняются только в `mise.toml` и `package.json`. Исключение — Claude Code CLI для авторевью: он закреплён в `.github/review/package.json` вне npm workspaces, чтобы `claude` из `node_modules/.bin` не подменял локальный Claude Code. Автообновления зависимостей в проекте нет: версию CLI поднимают вручную вместе с `package-lock.json` рядом.

## Agent skills

### Issue tracker

Тикеты — GitHub Issues этого репозитория (через `gh`), спецификация — `docs/spec.md`. Подробнее — `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные пять ролей (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — метки issues на GitHub. Подробнее — `docs/agents/triage-labels.md`.

### Domain docs

Один контекст: `GLOSSARY.md` и `docs/adr/` в корне. Подробнее — `docs/agents/domain.md`.
