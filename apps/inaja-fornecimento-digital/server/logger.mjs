const MAX_STRING_LENGTH = 500;
const MAX_ERROR_STACK_LENGTH = 2_000;
const SENSITIVE_KEY = /senha|password|token|secret|api[_-]?key|authorization|cookie|base64|content/i;
const LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40 };

export function sanitize(value, key = "", seen = new WeakSet()) {
  if (SENSITIVE_KEY.test(key)) return typeof value === "string" ? `[redacted ${value.length} chars]` : "[redacted]";
  if (value instanceof Error) {
    const error = { name: value.name, message: value.message, code: value.code };
    if (value.statusCode != null) error.statusCode = value.statusCode;
    if (process.env.LOG_STACK !== "0" && value.stack) error.stack = value.stack.slice(0, MAX_ERROR_STACK_LENGTH);
    return error;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return { type: "Buffer", bytes: value.length };
  if (typeof value === "string") return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}… [truncated]` : value;
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return String(value);
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitize(item, "", seen));
  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey, seen)]));
  }
  return String(value);
}

function enabled(level) {
  const configured = String(process.env.LOG_LEVEL || "info").toLowerCase();
  const minimum = LEVEL_RANK[configured] || LEVEL_RANK.info;
  return LEVEL_RANK[level] >= minimum;
}

function write(level, event, context) {
  if (!enabled(level)) return;
  const safeContext = sanitize(context);
  const record = JSON.stringify({ ...safeContext, timestamp: new Date().toISOString(), level, event });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(record);
}

export function createLogger(context = {}) {
  return {
    child(extra = {}) { return createLogger({ ...context, ...extra }); },
    debug(event, extra = {}) { write("debug", event, { ...context, ...extra }); },
    info(event, extra = {}) { write("info", event, { ...context, ...extra }); },
    warn(event, extra = {}) { write("warn", event, { ...context, ...extra }); },
    error(event, extra = {}) { write("error", event, { ...context, ...extra }); },
  };
}

export const logger = createLogger({ service: "inaja", processId: process.pid });
