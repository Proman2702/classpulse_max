import 'dotenv/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const token = process.env.BOT_TOKEN?.trim();
const botUsername = process.env.MAX_BOT_USERNAME?.trim().replace(/^@/, '');
const miniAppUrl = process.env.MINI_APP_URL?.trim();

if (!token || token === 'your_max_bot_token') {
  throw new Error('BOT_TOKEN is not configured. Copy .env.example to bot/.env and add the MAX bot token.');
}

// Enable the Mini App only when explicitly requested after publishing it.
const miniAppEnabled = process.env.MINI_APP_ENABLED === 'true';
if (miniAppEnabled && (!botUsername || !miniAppUrl || new URL(miniAppUrl).protocol !== 'https:')) {
  throw new Error('Mini App requires MAX_BOT_USERNAME and an HTTPS MINI_APP_URL.');
}

const bot = new Bot(token, {
  clientOptions: { baseUrl: process.env.MAX_API_URL || 'https://platform-api2.max.ru' },
});

const attachments = miniAppEnabled && botUsername
  ? [Keyboard.inlineKeyboard([[Keyboard.button.openApp('Открыть ClassPulse', botUsername)]])]
  : [];

const welcomeText = miniAppEnabled
  ? 'ClassPulse готов! Откройте мини-приложение кнопкой ниже.'
  : 'свинья. Напиши /ping';

bot.on('bot_started', (ctx) =>
  ctx.reply(welcomeText, {
    attachments,
  }),
);

bot.command('start', (ctx) =>
  ctx.reply(welcomeText, {
    attachments,
  }),
);

bot.command('ping', (ctx) => ctx.reply('переплетение яиZzzZzzZZZ'));
bot.command('penis', (ctx) => ctx.reply('z'));
bot.on('message_created', (ctx) => ctx.reply('пиво'));

bot.catch(() => {
  console.error('Не удалось обработать событие MAX.');
});

await bot.api.setMyCommands([
  {
    name: 'start',
    description: 'Запустить ClassPulse',
  },
  { name: 'ping', description: 'Проверить работу бота' },
]);

const info = await bot.api.getMyInfo();
console.log(`MAX authenticated: @${info.username}`);
console.log('ClassPulse long polling starting (Mini App: ' + miniAppEnabled + ').');
await bot.start();
