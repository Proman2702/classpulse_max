import 'dotenv/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const token = process.env.BOT_TOKEN?.trim();
const botUsername = process.env.MAX_BOT_USERNAME?.trim().replace(/^@/, '');
const miniAppUrl = process.env.MINI_APP_URL?.trim();

// проверка на наличие токена
if (!token || token === '') {
  throw new Error('BOT_TOKEN не определен в конфигурационном файле');
}

// проверка на запуск миниаппа
const miniAppEnabled = process.env.MINI_APP_ENABLED === 'true';
if (miniAppEnabled && (!botUsername || !miniAppUrl || new URL(miniAppUrl).protocol !== 'https:')) {
  throw new Error('Mini App requires MAX_BOT_USERNAME and an HTTPS MINI_APP_URL.');
}

//создание бота
const bot = new Bot(token, {
  clientOptions: { baseUrl: process.env.MAX_API_URL || 'https://platform-api2.max.ru' },
});

//кнопка вызова аппки
const attachments = miniAppEnabled && botUsername
  ? [Keyboard.inlineKeyboard([[Keyboard.button.openApp('Открыть ClassPulse', botUsername)]])]
  : [];

//приветствие
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

//команды
bot.command('ping', (ctx) => ctx.reply('переплетение яиZzzZzzZZZ'));
bot.on('message_created', (ctx) => ctx.reply('пиво'));

//ошибки
bot.catch((e) => {
  console.error(`Не удалось обработать событие MAX. ${e}`);
});

//установка команд
await bot.api.setMyCommands([
  {
    name: 'start',
    description: 'Запустить ClassPulse',
  },
  { name: 'ping', description: 'Проверить работу бота' },
]);

//информация о боте
const info = await bot.api.getMyInfo();
console.log(`MAX авторизован: @${info.username}`);
await bot.start();
