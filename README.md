# Vizaje-Nica — vz-next

Next.js-замена легаси-магазина (CodeIgniter PHP, `../../application`). Та же MySQL-база
(`drizzle/schema.ts` отражает её структуру), те же URL/slug для RU и RO — миграция делается
без потери SEO и ссылок.

## Запуск

```bash
npm install
cp .env.example .env   # заполнить DATABASE_URL и нужные интеграции
npm run dev
```

## Миграции БД

Миграции — обычные пронумерованные SQL-файлы в `drizzle/` (не `drizzle-kit migrate`).
Накатывать по порядку вручную при разворачивании на новом окружении:

```bash
for f in drizzle/*.sql; do mysql -h <host> -P <port> -u <user> -p <db> < "$f"; done
```

Актуальный список — `drizzle/000N_*.sql`. После добавления новой миграции — обновить
`drizzle/schema.ts` тем же изменением.

## Структура

- `src/app` — роуты (App Router), `ru/` и `ro/` — раздельные деревья для языков
  (у RO часть маршрутов собрана в catch-all `ro/[...slug]/page.tsx`).
- `src/app/admin` — админка (не индексируется, см. `src/app/robots.ts`).
- `src/lib` — доступ к данным и бизнес-логика (Drizzle-запросы).
- `src/components/site` — витрина, `src/components/admin` — админка.
- `drizzle/` — схема + миграции.
- `deploy/` — инструкции и конфиги для продакшен-сервера.

## Интеграции (фичефлаги в `.env`)

- `WORKAPP_ENABLED` — синхронизация с WorkApp/1C.
- `PAYNET_ENABLED` — онлайн-оплата картой. **Credentials нужно сгенерировать заново** —
  легаси-креды были закоммичены в открытый репозиторий, использовать их нельзя.
- `MEILISEARCH_URL` — опциональный поисковый провайдер, MySQL — автоматический fallback.

Все три по умолчанию выключены (`false`/пусто) и fail-closed — без настройки ничего
никуда не уходит.
