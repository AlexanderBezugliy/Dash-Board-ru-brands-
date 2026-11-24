# Handoff: Dash-Board (ru-brands)

Панель мониторинга 52 RU-брендов. Раз в сутки GitHub Action проверяет сайты и коммитит `data/status.json`. Фронт (Vite, React, TypeScript, Tailwind, shadcn, сворачиваемый sidebar) читает этот файл и `data/sites.json`. Репозиторий: https://github.com/AlexanderBezugliy/Dash-Board-ru-brands- (публичный). Локальный превью: http://127.0.0.1:5173/. Расписание: каждый день в 07:00 по Киеву (`.github/workflows/daily.yml` → `scripts/check.mjs`).

## Цель

Четыре колонки по каждому домену:

1. HTTP с сервера — прямой заход на главную без cookie, ожидается **503** (клоака закрыта).
2. Доступ из зоны RU — Globalping, страна RU: сначала `/?view=d7Fm2Kp9Qx4Nw8Rz`, снять cookie, затем главная с cookie, ожидается **200**.
3. Блокировка РКН — открытый дамп `https://rknweb.ru/api/v3/domains/` отвечает **504**, сервис закрыт. Сейчас у всех «реестр РКН не получен».
4. Страницы в индексе Яндекса — OAuth-приложение Webmaster `webmaster-setup`, refresh token. Список хостов работает, `.../hosts/{host-id}/summary` падает: сбой summary на стороне Яндекса с октября 2026.

## Домены (52)

casinotopru.com, cazrank.com, topkazik.com, obzorcaz.com, allkazino.com, cazlist.com, freshcaz.com, legalcaz.com, turbovyvod.com, realbablo.com, surecaz.com, rucazrank.com, slotvyvod.com, vyvodcasino.com, avtomatyru.com, topsloty.com, avtomatyrf.com, rfcazrank.com, nadengirf.com, igradengi.com, avtomaty777ru.com, topspinreel.com, popcasinoru.com, stelefona.com, slotplayru.com, topnadengi.com, casino100rub.com, nadengiru.com, slotzoneru.com, chestnocaz.com, casinoproverka.com, cashspinru.com, bezverif.com, topslotycash.com, rankcaz.com, casinorubli.com, bonuscazhub.com, slotvyvodru.com, topcasinorf.com, topcazrank.com, gidkaz.com, ruskaz.com, igrocaz.com, godnykazik.com, avtomatytop.com, ofickazik.com, kaz100.com, topslotru.com, bestslotru.com, rubkaz.com, casinotop10ru.com, casinotop5ru.com.

## Архитектура

- Секреты только в GitHub: Settings → Secrets and variables → Actions. Имена: `GLOBALPING_TOKEN`, `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REFRESH_TOKEN`. Значения GitHub не показывает, только перезапись. Локальный `.env` не нужен: проверка идёт в Action.
- Globalping: бесплатный тариф с токеном, 500 тестов/час. `POST/GET https://api.globalping.io/v1/measurements`, `locations: country RU`. В статус пишется `results[0].result.statusCode`.
- Клоака: query `/?view=d7Fm2Kp9Qx4Nw8Rz` уже закоммичен в `scripts/check.mjs` в публичной истории. Сделать репозиторий Private это из истории не уберёт.
- Telegram не подключали. Выкладка на свой сервер и Vercel отложены, пока ежедневная проверка не станет стабильной.

## Что уже сделано

- Панель собрана и запушена.
- Первый ежедневный прогон выполнен.
- HTTP 200 считается через cloak view; колонки разделены: сервер 503, RU 200.
- Sidebar переделан (сворачиваемый).
- РКН и Яндекс summary честно показывают «данные не получены», а не выдуманные цифры.

## Что осталось

- Новый источник реестра РКН (открытый дамп rknweb мёртв).
- Summary Яндекса заработает, когда Яндекс починит endpoint; код менять не из-за чего.
- Базовая защита репозитория: Settings → General → Danger zone → Private, затем Settings → Collaborators. Ссылкой публичный репозиторий и так открывается у любого; «поделиться» = дать ссылку или добавить collaborator.
- По желанию позже: свой сервер или Vercel, Telegram.

## Как продолжить локально

```
git fetch
git checkout main
git pull
```

Дальше править локально и пушить в ту же ветку, с которой работает Action. Секреты в код и в чат не копировать.
