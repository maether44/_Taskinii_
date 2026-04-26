// src/utils/formatters.js
// Display formatting utilities used across BodyQ screens

export function fmtCalories(val) {
  return `${Math.round(val ?? 0)} kcal`;
}

export function fmtMacro(val, unit = "g") {
  return `${Math.round((val ?? 0) * 10) / 10}${unit}`;
}

export function fmtWeight(kg) {
  return `${Math.round((kg ?? 0) * 10) / 10} kg`;
}

export function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function fmtWater(ml) {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${ml}ml`;
}

export function fmtPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function greetingByTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
