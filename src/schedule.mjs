import fs from "fs";
import path from "path";

const SCHEDULE_FILE = path.join(process.cwd(), "schedule.csv");
const SENT_FILE = path.join(process.cwd(), "sent-reminders.json");

// Напоминание уходит за этот интервал до тренировки.
const REMINDER_BEFORE_MS = 2 * 60 * 60 * 1000;

function parseDateTime(dateStr, timeStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

// Строка данных: "Имя, ДД.ММ.ГГГГ, ЧЧ:ММ". Заголовок (если он есть)
// под этот формат не подходит и просто пропускается — можно вести файл
// как с заголовком, так и без него.
const ROW_PATTERN = /^(.+?),\s*(\d{1,2}\.\d{1,2}\.\d{4}),\s*(\d{1,2}:\d{2})$/;

function decodeScheduleFile(buffer) {
  const utf8Text = buffer.toString("utf-8");
  if (!utf8Text.includes("�")) {
    return utf8Text;
  }
  // Файл сохранён не в UTF-8 (например, Notepad по умолчанию в ANSI) —
  // большинство таких файлов на русской Windows на самом деле в Windows-1251.
  return new TextDecoder("windows-1251").decode(buffer);
}

function readScheduleRows() {
  if (!fs.existsSync(SCHEDULE_FILE)) {
    return [];
  }
  const text = decodeScheduleFile(fs.readFileSync(SCHEDULE_FILE));
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    const match = line.match(ROW_PATTERN);
    if (!match) {
      continue;
    }
    const [, name, date, time] = match;
    rows.push({ name: name.trim(), date, time });
  }
  return rows;
}

function readSent() {
  if (!fs.existsSync(SENT_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(SENT_FILE, "utf-8"));
}

export function markReminderSent(key) {
  const sent = readSent();
  sent[key] = true;
  fs.writeFileSync(SENT_FILE, JSON.stringify(sent, null, 2));
}

function formatDayText(date) {
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
  const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
  return `${weekday}, ${dayMonth}`;
}

// Возвращает напоминания, которые пора отправить прямо сейчас:
// до тренировки осталось не больше REMINDER_BEFORE_MS, тренировка ещё
// не прошла, и это напоминание ещё не отправлялось.
export function getDueReminders() {
  const rows = readScheduleRows();
  const sent = readSent();
  const now = new Date();
  const due = [];

  for (const row of rows) {
    if (!row.name || !row.date || !row.time) {
      continue;
    }

    const trainingAt = parseDateTime(row.date, row.time);
    const reminderAt = new Date(trainingAt.getTime() - REMINDER_BEFORE_MS);

    const key = `${row.name}|${row.date}|${row.time}`;
    if (sent[key]) continue;
    if (now < reminderAt) continue;
    if (now >= trainingAt) continue;

    due.push({
      key,
      name: row.name,
      dayText: formatDayText(trainingAt),
      timeText: row.time,
    });
  }

  return due;
}
