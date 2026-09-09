// Слушает сообщения в Telegram и регистрирует новых клиентов:
// первый, кто напишет боту, сохраняется по тексту своего сообщения как имя.
// Запуск: npm run bot (должен работать постоянно, пока клиенты могут писать боту).
import { createTelegramClient } from "./telegram.mjs";
import { registerClient, isChatRegistered } from "./clients.mjs";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Не задан TELEGRAM_BOT_TOKEN. Добавьте его в .env (см. .env.example).");
  process.exit(1);
}

const telegram = createTelegramClient(token);

console.log("Бот запущен, жду сообщения от новых клиентов...");

let offset = 0;

while (true) {
  let updates;
  try {
    updates = await telegram.getUpdates(offset);
  } catch (error) {
    console.error("Ошибка при получении обновлений от Telegram:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    continue;
  }

  for (const update of updates) {
    offset = update.update_id + 1;

    const message = update.message;
    if (!message?.text || !message.chat?.id) {
      continue;
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (isChatRegistered(chatId)) {
      await telegram.sendMessage(
        chatId,
        "Вы уже записаны. Тренер пришлёт сюда напоминание перед тренировкой.",
      );
      continue;
    }

    if (text === "/start") {
      await telegram.sendMessage(
        chatId,
        "Здравствуйте! Напишите, пожалуйста, ваше имя, чтобы тренер мог присылать сюда напоминания перед тренировкой.",
      );
      continue;
    }

    registerClient(text, chatId);
    await telegram.sendMessage(
      chatId,
      `Записал вас как «${text}». Перед тренировкой сюда придёт напоминание от тренера Виктора.`,
    );
    console.log(`Новый клиент зарегистрирован: ${text} (chatId ${chatId})`);
  }
}
