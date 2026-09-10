// Ручная отправка напоминания одному клиенту.
// Запуск: npm run remind -- "Имя клиента" "день" "время"
// Пример: npm run remind -- "Иван" "суббота" "18:00"
import { createTelegramClient } from "./telegram.mjs";
import { buildReminderMessage } from "./template.mjs";
import { findClientChatId } from "./clients.mjs";

const [, , name, day, time] = process.argv;

if (!name || !day || !time) {
  console.error('Использование: npm run remind -- "Имя клиента" "день" "время"');
  console.error('Пример: npm run remind -- "Иван" "суббота" "18:00"');
  process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Не задан TELEGRAM_BOT_TOKEN. Добавьте его в .env (см. .env.example).");
  process.exit(1);
}

const chatId = findClientChatId(name);
if (!chatId) {
  console.error(
    `Клиент «${name}» не найден. Клиент должен сначала сам написать что-нибудь боту в Telegram (см. README).`,
  );
  process.exit(1);
}

const telegram = createTelegramClient(token);
const text = buildReminderMessage(name, day, time);

try {
  await telegram.sendMessage(chatId, text);
  console.log(`Напоминание отправлено клиенту «${name}».`);
} catch (error) {
  console.error(`Не удалось отправить сообщение: ${error.message}`);
  process.exit(1);
}
