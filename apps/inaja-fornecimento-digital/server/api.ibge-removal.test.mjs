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
  migrate(db);
  server = createServer(async (req, res) => {
    const handled = await handleApi(req, res, db);
    if (!handled) {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("remoção da integração própria do IBGE", () => {
  it("retorna 404 para as rotas IBGE removidas", async () => {
    const municipios = await fetch(new URL("/api/ibge/municipios?codigo=4110300", origin));
    const estados = await fetch(new URL("/api/ibge/estados", origin));

    assert.equal(municipios.status, 404);
    assert.equal(estados.status, 404);
  });
});
