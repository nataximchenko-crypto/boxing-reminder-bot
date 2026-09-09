const API_BASE = "https://api.telegram.org";

export function createTelegramClient(token) {
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN не задан");
  }

  const base = `${API_BASE}/bot${token}`;

  async function callApi(method, params = {}) {
    const response = await fetch(`${base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API (${method}): ${data.description ?? "неизвестная ошибка"}`);
    }
    return data.result;
  }

  return {
    getUpdates: (offset) => callApi("getUpdates", { offset, timeout: 30 }),
    sendMessage: (chatId, text) => callApi("sendMessage", { chat_id: chatId, text }),
  };
}
