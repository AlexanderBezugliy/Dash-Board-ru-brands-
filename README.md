# Проверка сайтов

Панель читает домены из `data/sites.json` и последнюю проверку из `data/status.json`. Проверка запускается раз в сутки.

## Локально

```bash
npm install
npm run dev
```

Откройте адрес, который напечатает Vite.

Свою проверку можно запустить командой `npm run check`. Токены берутся из окружения или из файла `.env` в корне проекта. Этот файл не коммитится. Имена переменных лежат в `.env.example`.

## GitHub

Репозиторий создаёте сами и пушите этот проект в него. В GitHub откройте Settings → Secrets and variables → Actions и добавьте секреты:

- `GLOBALPING_TOKEN`
- `YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`
- `YANDEX_REFRESH_TOKEN`

Файл `.github/workflows/daily.yml` раз в сутки пишет `data/status.json` и коммитит его. Секреты в репозиторий не записываются.

Если нет `YANDEX_REFRESH_TOKEN`, в колонке Яндекса будет «нет доступа», а не выдуманное число страниц.

Telegram пока не подключён. Имена `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` оставлены в `.env.example` и в комментарии `scripts/check.mjs`.
