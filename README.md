# ClassPulse MAX

Монорепозиторий с MAX-ботом и минимальным MAX Mini App

## Структура

```text
classpulse_max/
├── bot/       # TypeScript + официальный @maxhub/max-bot-api
├── miniapp/   # React + TypeScript + Vite + Supabase
├── supabase/  # SQL-схема MVP
└── package.json
```

## Требования

- Node.js 20.19+ (это минимальная версия для текущего официального MAX SDK)
- npm
- MAX bot token
- публичный HTTPS URL мини-приложения для запуска из MAX

## Установка и настройка

```powershell
npm install
Copy-Item .env.example bot/.env
Copy-Item miniapp/.env.example miniapp/.env
```

Откройте `bot/.env` и замените значения:

```env
MAX_API_URL=https://platform-api.max.ru
BOT_TOKEN=ваш_токен_бота_MAX
MINI_APP_ENABLED=true
MAX_BOT_USERNAME=имя_бота_без_знака_собачки
MINI_APP_URL=https://ваш-опубликованный-miniapp.example.com
```

`bot/.env` игнорируется Git и не попадёт в коммит.

В `miniapp/.env` укажите URL проекта Supabase и публичный publishable key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Перед первым запуском выполните [`supabase/schema.sql`](supabase/schema.sql) в Supabase SQL Editor.
Скрипт создаёт профили пользователей, check-in, связи учитель–ученик, обращения,
триггер регистрации и политики Row Level Security. Вход работает через Supabase Auth
по email и паролю; сессия восстанавливается автоматически.

## Локальный запуск

Мини-приложение:

```powershell
npm run dev:miniapp
```

Бот через long polling:

```powershell
npm run dev:bot
```

Оба процесса одновременно:

```powershell
npm run dev
```

Сборка и проверка типов:

```powershell
npm run typecheck
npm run build
```

После сборки production-версию бота можно запустить так:

```powershell
npm run start:bot
```

## Полезные ссылки

- [Документация MAX для разработчиков](https://dev.max.ru/)
- [Официальный TypeScript SDK](https://github.com/max-messenger/max-bot-api-client-ts)
- [Подключение мини-приложения](https://dev.max.ru/help/miniapps)
