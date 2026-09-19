import 'dotenv/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const token = process.env.BOT_TOKEN?.trim();
const botUsername = process.env.MAX_BOT_USERNAME?.trim().replace(/^@/, '');
const miniAppUrl = process.env.MINI_APP_URL?.trim();

if (!token || token === 'your_max_bot_token') {
  throw new Error('BOT_TOKEN is not configured. Copy .env.example to bot/.env and add the MAX bot token.');
}

if (!miniAppUrl || miniAppUrl === 'https://your-mini-app.example.com') {
  throw new Error('MINI_APP_URL is not configured. Add the public HTTPS Mini App URL to bot/.env.');
}

if (!botUsername || botUsername === 'your_bot_username') {
  throw new Error('MAX_BOT_USERNAME is not configured. Add the bot username to bot/.env.');
}

const parsedMiniAppUrl = new URL(miniAppUrl);

if (parsedMiniAppUrl.protocol !== 'https:') {
  throw new Error('MINI_APP_URL must use HTTPS, as required by MAX.');
}

const bot = new Bot(token);

const miniAppKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.openApp('Открыть ClassPulse', botUsername)],
]);

const welcomeText = 'ClassPulse готов к тестовому запуску. Откройте мини-приложение кнопкой ниже.';

bot.on('bot_started', (ctx) =>
  ctx.reply(welcomeText, {
    attachments: [miniAppKeyboard],
  }),
);

bot.command('start', (ctx) =>
  ctx.reply(welcomeText, {
    attachments: [miniAppKeyboard],
  }),
);

bot.catch((error) => {
  console.error('MAX bot error:', error);
});

await bot.api.setMyCommands([
  {
    name: 'start',
    description: 'Открыть ClassPulse',
  },
]);

bot.start();
console.log('ClassPulse MAX bot started via long polling.');
