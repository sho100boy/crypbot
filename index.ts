import { RestClientV5 } from 'bybit-api';
import { Telegraf } from 'telegraf';
import winston from 'winston';
import dotenv from 'dotenv';
import { Context } from 'telegraf';

// Загрузка переменных из .env
dotenv.config();

// Проверка наличия всех переменных
const requiredEnvVars = ['BYBIT_API_KEY', 'BYBIT_API_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_USER_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Ошибка: Переменная окружения ${envVar} не задана в .env`);
  }
}

// Инициализация Bybit API (Testnet)
const bybit = new RestClientV5({
  key: process.env.BYBIT_API_KEY!,
  secret: process.env.BYBIT_API_SECRET!,
  testnet: true,
});

// Инициализация Telegram бота
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const allowedUserId = process.env.TELEGRAM_USER_ID!;

// Инициализация логгера
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'logs.txt' }),
    new winston.transports.Console(),
  ],
});

// Проверка авторизации пользователя
const restrictAccess = (ctx: Context, next: () => void) => {
  if (ctx.from?.id.toString() === allowedUserId) {
    next();
  } else {
    ctx.reply('Доступ запрещён. Вы не авторизованы.');
    logger.warn(`Неавторизованный доступ: ID ${ctx.from?.id}`);
  }
};

// Получение текущей цены
async function getPrice(symbol: string): Promise<number> {
  try {
    const response = await bybit.getTickers({ category: 'linear', symbol });
    const price = parseFloat(response.result.list[0].lastPrice);
    logger.info(`Получена цена для ${symbol}: ${price}`);
    return price;
  } catch (error) {
    logger.error(`Ошибка при получении цены для ${symbol}: ${error}`);
    throw error;
  }
}

// Проверка баланса
async function getBalance(): Promise<string> {
  try {
    const response = await bybit.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
    const balance = response.result.list[0]?.coin.find((c: any) => c.coin === 'USDT')?.walletBalance;
    logger.info(`Баланс USDT: ${balance}`);
    return balance || '0';
  } catch (error) {
    logger.error(`Ошибка при проверке баланса: ${error}`);
    throw error;
  }
}

// Открытие позиции
async function openPosition(side: 'Buy' | 'Sell', symbol: string, qty: string) {
  try {
    const price = await getPrice(symbol);
    const order = await bybit.submitOrder({
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty,
      takeProfit: side === 'Buy' ? (price + 20).toString() : (price - 20).toString(),
      stopLoss: side === 'Buy' ? (price - 10).toString() : (price + 10).toString(),
    });
    logger.info(`Открыта позиция: ${side} ${symbol} на ${qty} по цене ${price}`);
    return order;
  } catch (error) {
    logger.error(`Ошибка при открытии позиции ${side} ${symbol}: ${error}`);
    throw error;
  }
}

// Закрытие позиции
async function closePosition(symbol: string) {
  try {
    const positions = await bybit.getPositionInfo({ category: 'linear', symbol });
    const position = positions.result.list[0];
    if (!position || position.size === '0') {
      logger.info(`Нет открытых позиций для ${symbol}`);
      return 'Нет открытых позиций';
    }
    const side = position.side === 'Buy' ? 'Sell' : 'Buy';
    const order = await bybit.submitOrder({
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty: position.size,
      reduceOnly: true,
    });
    logger.info(`Закрыта позиция: ${symbol}, сторона: ${position.side}, объём: ${position.size}`);
    return order;
  } catch (error) {
    logger.error(`Ошибка при закрытии позиции ${symbol}: ${error}`);
    throw error;
  }
}

// Telegram-команды
bot.use(restrictAccess);

bot.command('price', async (ctx) => {
  try {
    const price = await getPrice('BTCUSDT');
    ctx.reply(`Текущая цена BTCUSDT: ${price}`);
  } catch (error) {
    ctx.reply('Ошибка при получении цены.');
  }
});

bot.command('balance', async (ctx) => {
  try {
    const balance = await getBalance();
    ctx.reply(`Баланс USDT: ${balance}`);
  } catch (error) {
    ctx.reply('Ошибка при проверке баланса.');
  }
});

bot.command('buy', async (ctx) => {
  try {
    const order = await openPosition('Buy', 'BTCUSDT', '0.01');
    ctx.reply(`Открыт Long на BTCUSDT: ${JSON.stringify(order.result)}`);
  } catch (error) {
    ctx.reply('Ошибка при открытии Long.');
  }
});

bot.command('sell', async (ctx) => {
  try {
    const order = await openPosition('Sell', 'BTCUSDT', '0.01');
    ctx.reply(`Открыт Short на BTCUSDT: ${JSON.stringify(order.result)}`);
  } catch (error) {
    ctx.reply('Ошибка при открытии Short.');
  }
});

bot.command('close', async (ctx) => {
  try {
    const result = await closePosition('BTCUSDT');
    ctx.reply(`Результат закрытия: ${JSON.stringify(result)}`);
  } catch (error) {
    ctx.reply('Ошибка при закрытии позиции.');
  }
});

bot.command('test', async (ctx) => {
  try {
    const price = await getPrice('BTCUSDT');
    ctx.reply(`Тест: Цена BTCUSDT = ${price}`);
    logger.info('Тестовая команда выполнена');
  } catch (error) {
    ctx.reply('Ошибка при тесте.');
  }
});

bot.command('log', async (ctx) => {
  try {
    const fs = require('fs');
    const logs = fs.readFileSync('logs.txt', 'utf8').split('\n').slice(-10).join('\n');
    ctx.reply(`Последние логи:\n${logs}`);
  } catch (error) {
    ctx.reply('Ошибка при чтении логов.');
    logger.error(`Ошибка чтения логов: ${error}`);
  }
});

// Запуск бота
bot.launch().then(() => {
  logger.info('Бот запущен');
  console.log('Бот запущен');
});

// Обработка остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));