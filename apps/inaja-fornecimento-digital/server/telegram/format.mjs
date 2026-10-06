export function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function bold(s) {
  return `<b>${escHtml(s)}</b>`;
}

export function code(s) {
  return `<code>${escHtml(s)}</code>`;
}

export function formatBytes(n) {
  const x = Number(n) || 0;
  if (x < 1024) return `${x} B`;
  if (x < 1024 * 1024) return `${(x / 1024).toFixed(1)} KB`;
  if (x < 1024 * 1024 * 1024) return `${(x / (1024 * 1024)).toFixed(1)} MB`;
  return `${(x / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function truncate(s, max = 3500) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max - 20) + "\n… (truncado)";
}

export function inlineKeyboard(rows) {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((b) => ({
        text: b.text,
        callback_data: b.data,
      })),
    ),
  };
}
