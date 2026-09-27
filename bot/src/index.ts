import 'dotenv/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const readConfig = () => {
  const token = process.env.BOT_TOKEN?.trim();
  if (!token) {
    throw new Error('BOT_TOKEN не задан в bot/.env');
  }

  const miniAppEnabled = process.env.MINI_APP_ENABLED !== 'false';
  const botUsername = process.env.MAX_BOT_USERNAME?.trim().replace(/^@/, '');
  const miniAppUrl = process.env.MINI_APP_URL?.trim();

  if (miniAppEnabled && (!botUsername || !miniAppUrl?.startsWith('https://'))) {
    throw new Error('Для мини-приложения нужны MAX_BOT_USERNAME и MINI_APP_URL с https://');
  }

  return {
    token,
    apiUrl: process.env.MAX_API_URL || 'https://platform-api.max.ru',
    miniAppEnabled,
    botUsername,
  };
};

const config = readConfig();
const bot = new Bot(config.token, { clientOptions: { baseUrl: config.apiUrl } });

const appKeyboard = config.miniAppEnabled && config.botUsername
  ? [Keyboard.inlineKeyboard([[Keyboard.button.openApp('Открыть ClassPulse', config.botUsername)]])]
  : [];

const WELCOME = [
  'Привет! Я ClassPulse 👋',
  '',
  'Ученикам — отметить, как прошёл день, записаться к психологу или учителю и отправить анонимную жалобу.',
  'Учителям — увидеть состояние класса и короткую сводку дня от GigaChat.',
  '',
  'Нажмите кнопку ниже, чтобы открыть приложение.',
].join('\n');

const HELP = [
  'Что я умею:',
  '/start — открыть ClassPulse',
  '/help — эта подсказка',
  '',
  'Если нужна срочная помощь, позвоните на Детский телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно).',
].join('\n');

bot.on('bot_started', (ctx) => ctx.reply(WELCOME, { attachments: appKeyboard }));
bot.command('start', (ctx) => ctx.reply(WELCOME, { attachments: appKeyboard }));
bot.command('help', (ctx) => ctx.reply(HELP));

// Любое другое сообщение: мягко направляем в приложение.
bot.on('message_created', (ctx) =>
  ctx.reply('Всё самое важное — в приложении. Откройте его кнопкой ниже или напишите /help.', {
    attachments: appKeyboard,
  }),
);

bot.catch((error) => {
  console.error('Не удалось обработать событие MAX:', error);
});

await bot.api.setMyCommands([
  { name: 'start', description: 'Открыть ClassPulse' },
  { name: 'help', description: 'Что умеет бот' },
]);

const info = await bot.api.getMyInfo();
console.log(`Бот запущен: @${info.username}`);
await bot.start();
