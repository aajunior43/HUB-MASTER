import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createLogger, sanitize } from "./logger.mjs";

const originalLogLevel = process.env.LOG_LEVEL;

afterEach(() => {
  if (originalLogLevel == null) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLogLevel;
});

describe("logger estruturado", () => {
  it("redige dados sensíveis, limita texto e preserva erros úteis", () => {
    const circular = { password: "senha privada" };
    circular.self = circular;
    const error = new Error("falha controlada");
    error.code = "TEST_ERROR";
    const value = sanitize({ token: "token privado", description: "x".repeat(700), content: "conteúdo privado", circular, error });

    assert.equal(value.token, "[redacted 13 chars]");
    assert.match(value.description, /truncated/);
    assert.equal(value.circular.password, "[redacted 13 chars]");
    assert.equal(value.circular.self, "[circular]");
    assert.equal(value.error.code, "TEST_ERROR");
    assert.match(value.error.stack, /Error: falha controlada/);
  });

  it("respeita o nível configurado e emite JSON com contexto", () => {
    process.env.LOG_LEVEL = "warn";
    const lines = [];
    const oldLog = console.log;
    const oldWarn = console.warn;
    console.log = (line) => lines.push(line);
    console.warn = (line) => lines.push(line);
    try {
      const log = createLogger({ service: "test", requestId: "req-12345678" });
      log.info("ignored.event");
      log.warn("visible.event", { statusCode: 403 });
    } finally {
      console.log = oldLog;
      console.warn = oldWarn;
    }

    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.event, "visible.event");
    assert.equal(record.level, "warn");
    assert.equal(record.statusCode, 403);
    assert.equal(record.requestId, "req-12345678");
    assert.ok(record.timestamp);
  });
});
