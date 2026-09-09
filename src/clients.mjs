import fs from "fs";
import path from "path";

const CLIENTS_FILE = path.join(process.cwd(), "clients.json");

function readClients() {
  if (!fs.existsSync(CLIENTS_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(CLIENTS_FILE, "utf-8"));
}

function writeClients(clients) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
}

export function findClientChatId(name) {
  const clients = readClients();
  const key = Object.keys(clients).find(
    (existingName) => existingName.toLowerCase() === name.toLowerCase(),
  );
  return key ? clients[key] : undefined;
}

export function registerClient(name, chatId) {
  const clients = readClients();
  clients[name] = chatId;
  writeClients(clients);
}

export function isChatRegistered(chatId) {
  const clients = readClients();
  return Object.values(clients).includes(chatId);
}
