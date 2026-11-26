# PWA, навигация и offline lifecycle

Контракт обслуживания Масляницы. Эталон архитектурных принципов — [RSLive PWA](https://github.com/Antiokh/rslive.ru/blob/main/astro/docs/PWA.md), [layout](https://github.com/Antiokh/rslive.ru/blob/main/astro/docs/components/layout.md) и [MapEmbed](https://github.com/Antiokh/rslive.ru/blob/main/astro/docs/components/map-embed.md). Здесь собственный статический Astro runtime, не Workbox. Контракт фиксирует реализацию на основе HEAD `897d4fe` и требования к будущим изменениям.

## Владение состоянием

| Файл | Ответственность |
|---|---|
| `astro.config.mjs`, `src/components/AppHead.astro` | Static output, ClientRouter, prefetch |
| `public/app.js` | Единственный runtime: регистрация SW, команды, согласие, предпочтение, daily orchestration, состояние и события |
| `public/pwa-daily-state.mjs` | Чистый resolver, локальный календарный день |
| `public/pwa-presentation.mjs` | Только presentation, DOM lifecycle и оценка storage |
| `src/components/PwaStatus.astro`, `Header.astro`, `src/pages/offline.astro` | DOM и controls, не собственная логика загрузки |
| `scripts/build-offline.mjs` | Манифест, версии, SHA-256 и генерация SW из dist |
| `scripts/sw-template.js` | Маршрутизация запросов, транзакционная подготовка, Range, активация и удаление |
| `public/external-embeds.mjs` | Жизненный цикл внешних видеоблоков |

## Продуктовые состояния

Установка приложения принадлежит браузеру/ОС. Не записывать постоянное installed=true. Реальный standalone launch фиксирует только день запуска. Full pack — отдельное решение, не часть install SW.

Ключи localStorage: `masljanica-storage-notice-ack-v1`, `masljanica-pwa-last-standalone-date-v1`, `masljanica-pwa-daily-offer-v1`, `masljanica-pwa-offline-preference-v1`. Последний — unset (нет значения), enabled или disabled. Отсутствие разрешения не считать согласием. До подтверждения хранения автоматическая полная подготовка и продуктовые предложения заблокированы. Отсутствие controller capability также блокирует предложение, которое невозможно выполнить.

Readiness: unknown до ответа актуального контроллера, ready при подтверждённой usable копии, unavailable при её отсутствии. Ready и stale могут одновременно быть истинными. Disabled не означает unavailable. Connectivity (navigator.onLine), readiness, progress и deleting — разные поля. При controllerchange capability сбрасывается.

Daily resolver выдаёт одно из blocked / none / install / offline-download / offline-update / offline-update-automatic. Не более одного продуктового предложения за локальный день, запись только при фактическом показе. Первый автоматический оффер полной копии относится к достигнутой стадии приложения (standalone сегодня); явная команда из меню может выполняться в обычном браузере. Enabled разрешает и обновление старой, и создание отсутствующей копии, без расходования daily offer. Disabled прекращает автоматическое обслуживание, но не удаляет готовую копию. Скачивание вручную и переключатель — разные действия. Подтверждение первого daily download включает enabled; удаление отключает auto.

Команды worker: OFFLINE_STATUS, OFFLINE_DOWNLOAD, OFFLINE_DELETE. Ответы OFFLINE_STATUS (capability: 2, ready, version, bytes, count, build, progress, staging, deleting), OFFLINE_PROGRESS, OFFLINE_COMPLETE, OFFLINE_ERROR, OFFLINE_DELETE_ERROR. UI должен следовать подтверждённому состоянию worker. Не считать отправку сообщения завершением действия. Удаление и подготовка взаимоисключающие операции, в том числе между вкладками.

## Версии и хранение

Сборка генерирует из фактического dist:
- `/offline-version.json`: schema, version, bytes, count;
- `/offline-manifest.json`: те же поля + entries(url, bytes, revision SHA-256);
- `/sw.js`: BUILD и CURRENT_REVISIONS + шаблон.

Canonical index.html заменяется slash URL, сегменты кодируются. Manifest не включает собственные служебные файлы, SW, Cloudflare routing/headers и 404. Локальные аудио, HTML, поиск и ресурсы сборки входят в pack. Внешние видео/изображения не обещать как доступные offline. Контрольные URL обходят cache; Cloudflare no-cache для SW, version и manifest.

| Cache | Назначение |
|---|---|
| masljanica-meta-v2 | Активный указатель /__offline_active__ |
| masljanica-pack-v2-* | Ранее активированные копии |
| masljanica-staging-v2-VERSION | Возобновляемый target; после активации может остаться под тем же именем |
| masljanica-runtime-v2-BUILD | Обычный cache навигации текущей сборки |
| masljanica-<16 hex> | Совместимый legacy fallback |

Наличие staging cache не доказывает readiness. Активный указатель, cache и /__offline_manifest__ должны быть согласованы. Не удалять активный staging по одному только префиксу имени. При несовместимом изменении schema/version документировать migration и сохранение пользовательских данных.

## Транзакционная подготовка

1. Получить свежий manifest по сети и проверить schema, URL (same origin), уникальность, SHA-256, размеры и число записей.
2. Если версия уже активна — завершить без повторного скачивания.
3. Открыть детерминированный staging по версии; повторно проверить сохранённые staging bytes/hash. Переиспользовать совпадающие ревизии из активной копии; остальные получить по сети и проверить HTTP 200, origin, bytes и SHA-256.
4. Первичный проход ограничен тремя workers. Временные ошибки допускают bounded retries (три попытки, backoff 1/3 с), затем deferred queue. Постоянный HTTP failure не маскировать как успех. После primary pass выполнить последовательный deferred pass. При потере сети остановить работу с сохранением staging.
5. Прогресс — успешно сохранённые записи / manifest.count, а не число запросов и не байты. Повторная попытка не должна засчитываться дважды. Проверить count, bytes и наличие каждого URL в staging.
6. Сохранить manifest, переключить активный указатель только после полной проверки; затем best-effort очистить устаревшие pack/staging/legacy. Ошибка до переключения оставляет предыдущую копию и staging.
7. Явное подтверждённое удаление удаляет active pointer, pack, staging и legacy; обычный runtime cache остаётся. Disabled само по себе ничего не удаляет.

Установка worker лёгкая; полная подготовка отдельно. Текущая реализация использует прямой network-only fetch внутри SW, а не глобальную подмену window.fetch, как RSLive. Не переносить её retry wrapper поверх текущего протокола без необходимости. RSLive exact-asset API и regional map caches не реализованы; global readiness не является доказательством наличия произвольного URL.

## Навигация: критический путь

Astro ClientRouter сохраняет window; обработчики привязывать один раз к document/window, текущий DOM получать заново на astro:page-load, освобождать media/popover на astro:before-swap. Не добавлять дублирующиеся listeners или блокирующие PWA проверки на каждом переходе.

Cache path:
- текущая активная копия или точная SHA-256 ревизия из старой копии — сразу ответ;
- runtime текущей сборки — сразу ответ;
- cache miss online — сеть; cache.put через waitUntil, не задерживает выдачу ответа;
- известный offline — local fallback без network timeout; при деградации сети возможен ограниченный fallback latch;
- runtime ограничен путями манифеста, MP3 туда автоматически не загружаются; не вызывать cache.keys() в обычном hot path.

Старый полный pack сохраняется между deploy, но несовпадающие ревизии online запрашиваются заново. На слабой сети или при saveData не прогревать маршруты. Основные HTML-разделы прогреваются последовательно после первого отображения, не скачивая аудио. Prefetch по намерению, без искусственной анимации View Transitions. Проверка версии не чаще установленного cooldown при обычных событиях; не блокирует переход.

Локальные MP3 поддерживают Range (206 + Content-Range, 416 для недопустимого диапазона), в offline берутся из pack. Не заменять Range полным 200 или внешним fallback в песеннике.

Performance diagnostics: `performance.getEntriesByName('masljanica-nav-swap')` измеряет preparation → DOM swap, а не полную загрузку. Изменение timing считать доказанным только после замеров.

## Внешние эмбеды

SSR содержит data-embed-src, но не внешний iframe src. Root data-online-only изначально hidden. Manual (песенник) создаёт iframe по клику; auto (отдельная песня/игра) — после online decision, loading=lazy. Допустимый provider для iframe — HTTPS youtube-nocookie с корректным ID.

| Событие | Видео |
|---|---|
| Cold offline | Не создаётся iframe, скрыты блок, заголовок, ссылки и пометки |
| Hot offline | Удалить iframe, скрыть блок; текст и MP3 не трогать |
| Reconnect | Вернуть блок; manual снова ждёт клика, auto восстанавливается |
| SPA / pageshow / visibility | Пересчитать состояние без дублирования listeners |

Загруженный video iframe не гарантирует доступности потока; поэтому, в отличие от карт RSLive, сохранять его при offline не требуется. Не подменять видео фиктивной offline-картинкой и не делать внешние запросы при известном отсутствии сети. navigator.onLine — сигнал браузера, не гарантия доступности провайдера.

## Полнотекстовый поиск

Сохраняем сгенерированный Pagefind index и API, а не только фильтр названий. Build проверяет наличие pagefind.js и pagefind-entry.json в манифесте. Pagefind добавляет cache-busting query к pagefind-entry.json; SW обслуживает этот конкретный URL по canonical path и ревизии сборки. Исключение не распространяется на произвольные JSON или API. Готовая копия должна поддерживать первый холодный поиск без сети. Runtime не зависит от DOMContentLoaded: SSR поле ввода + единый делегированный контроллер. Проверять реальный результат на desktop/mobile до и после SPA, отсутствие результатов, Escape и cold offline после reload. См. [layout](LAYOUT.md).

## Telegram Mini App

Среда определяется одним runtime adapter; SDK не владеет Cache Storage или PWA state machine. Telegram не получает install offer и не записывает lastStandaloneDate. При доступных Service Worker и Cache Storage применяется тот же протокол capability:2, manifest, staging, Range, consent и auto update. Факт доступности API не считается доказательством сохранённой копии: readiness сообщает только действующий SW. На /offline/ есть диагностика Telegram, SDK, API, режима темы, входной темы Telegram, источника и фактически применённой темы, а также наличия копии после предыдущего документного запуска; сравнение опирается на ранее сохранённую отметку готовности и подтверждённый SW status, при отсутствии отметки выводится «Нет данных». Кэш не обещает запуск без сети: Telegram контролирует создание WebView, а клиенты могут очищать данные. SDK и WebView не заменяют обычную PWA. Не переносить initData в localStorage, не добавлять отдельное хранилище настроек без согласованной миграции.

Native BackButton и system Back в Telegram управляются одним адаптером `telegram-back.mjs`, с одним history guard и Astro replace navigation; детали и приоритеты в [layout](LAYOUT.md#telegram-back-navigation). Service Worker и транзакции не участвуют в Back.

## Проверки и границы подтверждения

Node 22.12+. Выполнять:
```sh
npm install
npm test
npm run build
npm install --no-save playwright
npx playwright install --with-deps chromium
node scripts/smoke-offline.mjs
```

CI `.github/workflows/ci.yml` запускает эту цепочку на push main и PR. Smoke сам стартует production preview (порт 4321). Dev не доказывает offline readiness.

| Проверка | Где |
|---|---|
| Data validation | scripts/validate-data.mjs |
| Daily gate, offer priority, automatic rebuild | scripts/test-pwa-daily.mjs |
| Не ждать cache write, reuse exact revisions, no cache scans в hot path | scripts/test-navigation-cache.mjs |
| Временная 503, deferred tail, сохранение старой копии, resume и удаление | scripts/test-offline-transaction.mjs |
| SPA, фильтры, темы, меню, pack download, reload offline, Range, видео и фактическое аудио | scripts/smoke-offline.mjs |

Дополнительно проверять в реальных браузерах: чистый профиль, отсутствие разрешения, standalone, offline без копии/с копией/со stale копией, переходы back/forward, прерванная загрузка и повторная попытка, переключение enabled/disabled, удаление в idle и запрет в busy, одновременные вкладки, обновление SW во время работы, недостаток места/eviction, клавиатура, обе темы, viewport 320/390/768/1440 px. Проверять cold offline после полного закрытия и повторного запуска PWA, а не только setOffline в открытой вкладке.

Наличие теста не означает успешное прохождение; реальные iOS/Android, геометрия интерфейса и production deployment требуют отдельной проверки. Документ не является отчётом о прохождении CI.
