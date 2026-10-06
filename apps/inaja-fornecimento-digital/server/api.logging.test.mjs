import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";

let db;
let server;
let origin;

beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("logs HTTP estruturados", () => {
  it("devolve e registra o requestId com severidade compatível com o status", async () => {
    const lines = [];
    const oldWarn = console.warn;
    const oldLog = console.log;
    const oldLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "info";
    console.warn = (line) => lines.push(line);
    console.log = (line) => lines.push(line);
    try {
      const response = await fetch(`${origin}/api/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Request-Id": "http-test-1234" },
        body: JSON.stringify({ fn: "admin_listar_usuarios", args: {} }),
      });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("x-request-id"), "http-test-1234");
    } finally {
      console.warn = oldWarn;
      console.log = oldLog;
      if (oldLevel == null) delete process.env.LOG_LEVEL;
      else process.env.LOG_LEVEL = oldLevel;
    }

    const record = lines.map((line) => JSON.parse(line)).find((item) => item.event === "api.request.completed");
    assert.ok(record);
    assert.equal(record.requestId, "http-test-1234");
    assert.equal(record.statusCode, 403);
    assert.equal(record.level, "warn");
    assert.equal(record.outcome, "client_error");
    assert.equal(record.rpc, "admin_listar_usuarios");
  });
});
