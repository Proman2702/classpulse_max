# ClassPulse MAX

Монорепозиторий с MAX-ботом и минимальным MAX Mini App. Бот служит точкой входа: команда `/start` показывает кнопку, ведущую в мини-приложение.

## Структура

```text
classpulse_max/
├── bot/       # TypeScript + официальный @maxhub/max-bot-api
├── miniapp/   # Vite + TypeScript
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
```

Откройте `bot/.env` и замените значения:

```env
BOT_TOKEN=ваш_токен_бота_MAX
MAX_BOT_USERNAME=имя_бота_без_знака_собачки
MINI_APP_URL=https://ваш-опубликованный-miniapp.example.com
```

`bot/.env` игнорируется Git и не попадёт в коммит.

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

## Подключение Mini App в MAX

1. Опубликуйте содержимое `miniapp/dist` на публичном HTTPS-домене.
2. Укажите этот URL в `bot/.env` как `MINI_APP_URL`, а публичное имя бота — как `MAX_BOT_USERNAME`.
3. На платформе MAX для партнёров откройте настройки нужного чат-бота и вставьте тот же HTTPS URL в поле ссылки мини-приложения.
4. Запустите бота и отправьте ему `/start`: inline-кнопка типа `open_app` откроет Mini App внутри MAX.

Для локальной разработки Vite использует обычный `http://localhost`. MAX принимает Mini App только по публичному HTTPS URL, поэтому локальный адрес нельзя зарегистрировать напрямую.

## Полезные ссылки

- [Документация MAX для разработчиков](https://dev.max.ru/)
- [Официальный TypeScript SDK](https://github.com/max-messenger/max-bot-api-client-ts)
- [Подключение мини-приложения](https://dev.max.ru/help/miniapps)
