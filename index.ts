import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { BybitApi } from './bybit-api';

console.log("1. Начало загрузки бота...");

dotenv.config();

console.log("2. Переменные окружения загружены:");
console.log("TELEGRAM_BOT_TOKEN:", process.env.TELEGRAM_BOT_TOKEN ? "OK" : "NOT SET");
console.log("BYBIT_API_KEY:", process.env.BYBIT_API_KEY ? "OK" : "NOT SET");
console.log("BYBIT_API_SECRET:", process.env.BYBIT_API_SECRET ? "OK" : "NOT SET");
console.log("TELEGRAM_USER_ID:", process.env.TELEGRAM_USER_ID ? "OK" : "NOT SET");

console.log("3. Инициализация Telegram-бота...");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

console.log("4. Инициализация Bybit API...");
const bybitApi = new BybitApi(
  process.env.BYBIT_API_KEY!,
  process.env.BYBIT_API_SECRET!,
  true
);

console.log("5. Настройка команд бота...");
// (остальной код остаётся без изменений)
// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен');
  console.log('Бот запущен');
});

// Обработка остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));