// Слушает сообщения в Telegram (регистрирует новых клиентов) и параллельно
// проверяет schedule.csv — если для какой-то тренировки пора слать
// напоминание, отправляет его автоматически.
// Запуск: npm run bot (должен работать постоянно, иначе автонапоминания
// и регистрация новых клиентов не будут работать).
import { createTelegramClient } from "./telegram.mjs";
import { registerClient, isChatRegistered, findClientChatId } from "./clients.mjs";
import { buildReminderMessage } from "./template.mjs";
import { getDueReminders, markReminderSent, getMissedReminders, markReminderMissed } from "./schedule.mjs";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Не задан TELEGRAM_BOT_TOKEN. Добавьте его в .env (см. .env.example).");
  process.exit(1);
}

const telegram = createTelegramClient(token);

async function sendDueReminders() {
  for (const reminder of getDueReminders()) {
    const chatId = findClientChatId(reminder.name);
    if (!chatId) {
      console.error(
        `В schedule.csv есть тренировка для «${reminder.name}», но такого клиента нет среди зарегистрированных — напоминание не отправлено.`,
      );
      continue;
    }

    try {
      const text = buildReminderMessage(reminder.name, reminder.dayText, reminder.timeText);
      await telegram.sendMessage(chatId, text);
      markReminderSent(reminder.key);
      console.log(`Автонапоминание отправлено: ${reminder.name} (${reminder.dayText}, ${reminder.timeText}).`);
    } catch (error) {
      console.error(`Не удалось отправить автонапоминание для «${reminder.name}»:`, error.message);
    }
  }
}

// Тренировка уже прошла, а напоминание не ушло (бот не работал, была
// ошибка сети и т.п.) — слать его сейчас поздно и бессмысленно, но
// нужно громко сообщить об этом, а не тихо потерять.
function reportMissedReminders() {
  for (const missed of getMissedReminders()) {
    console.error(
      `ПРОПУЩЕНО автонапоминание: «${missed.name}», тренировка была ${missed.date} в ${missed.time} — напоминание не отправлено (например, бот не был запущен или пропала сеть).`,
    );
    markReminderMissed(missed.key);
  }
}

console.log("Бот запущен, жду сообщения от новых клиентов и слежу за schedule.csv...");

let offset = 0;

while (true) {
  await sendDueReminders();
  reportMissedReminders();

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
