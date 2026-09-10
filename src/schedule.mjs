import fs from "fs";
import path from "path";

const SCHEDULE_FILE = path.join(process.cwd(), "schedule.csv");
const SENT_FILE = path.join(process.cwd(), "sent-reminders.json");

// Напоминание уходит накануне вечером, в 20:00.
const REMINDER_HOUR_BEFORE = 20;

function parseDateTime(dateStr, timeStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function readScheduleRows() {
  if (!fs.existsSync(SCHEDULE_FILE)) {
    return [];
  }
  const lines = fs
    .readFileSync(SCHEDULE_FILE, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(1).map((line) => {
    const [name, date, time] = line.split(",").map((part) => part.trim());
    return { name, date, time };
  });
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
// время накануне (20:00) уже наступило, тренировка ещё не прошла,
// и это напоминание ещё не отправлялось.
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
    const reminderAt = new Date(trainingAt);
    reminderAt.setDate(reminderAt.getDate() - 1);
    reminderAt.setHours(REMINDER_HOUR_BEFORE, 0, 0, 0);

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
