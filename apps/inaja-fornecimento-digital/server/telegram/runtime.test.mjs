import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getTelegramRuntimeStatus, startTelegramBot, stopTelegramBot } from "./index.mjs";
import { checkRateLimit, getTelegramRateLimitSize, resetTelegramRateLimits } from "./session.mjs";
import { createConfirmation, consumeConfirmation, telegramInteractions } from "./interactions.mjs";

function configuredDb() {
  return {
    prepare: () => ({ get: (key) => ({ valor: key === "telegram_bot_enabled" ? "1" : "test-token" }) }),
  };
}

function createClient() {
  let activePollers = 0;
  let peakPollers = 0;
  const client = {
    getMe: async () => ({ username: "runtime_test_bot" }),
    getUpdates: ({ signal }) => new Promise((resolve, reject) => {
      activePollers += 1;
      peakPollers = Math.max(peakPollers, activePollers);
      signal.addEventListener("abort", () => {
        activePollers -= 1;
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      }, { once: true });
    }),
  };
  return { client, peakPollers: () => peakPollers, activePollers: () => activePollers };
}

describe("telegram runtime lifecycle", () => {
  let lockDir;

  beforeEach(() => {
    resetTelegramRateLimits();
    for (const map of Object.values(telegramInteractions.maps)) map.clear();
  });

  afterEach(async () => {
    await stopTelegramBot();
    for (const map of Object.values(telegramInteractions.maps)) map.clear();
    if (lockDir) await rm(lockDir, { recursive: true, force: true });
  });

  it("awaits the stopped poller before a rapid restart acquires one new lock", async () => {
    lockDir = await mkdtemp(join(tmpdir(), "inaja-telegram-runtime-"));
    const fake = createClient();

    const first = await startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    assert.equal(first.ok, true);
    await new Promise((resolve) => setImmediate(resolve));
    const stopping = stopTelegramBot();
    const restarting = startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    await stopping;
    const second = await restarting;
    assert.equal(second.ok, true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fake.peakPollers(), 1);
    assert.equal(getTelegramRuntimeStatus().running, true);
  });

  it("reaps stale locks but never takes a live lock", async () => {
    lockDir = await mkdtemp(join(tmpdir(), "inaja-telegram-runtime-"));
    const fake = createClient();
    await writeFile(join(lockDir, "telegram-bot.lock"), "invalid-pid");
    const stale = await startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    assert.equal(stale.ok, true);
    await stopTelegramBot();

    await writeFile(join(lockDir, "telegram-bot.lock"), String(process.pid));
    const live = await startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    assert.deepEqual(live, { ok: false, reason: "already_running" });
  });

  it("does not remove a lock file replaced by another owner", async () => {
    lockDir = await mkdtemp(join(tmpdir(), "inaja-telegram-runtime-"));
    const fake = createClient();
    const lockPath = join(lockDir, "telegram-bot.lock");
    await startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    const replacement = JSON.stringify({ pid: process.pid, token: "replacement-owner" });
    await writeFile(lockPath, replacement);
    await stopTelegramBot();
    assert.equal(await readFile(lockPath, "utf8"), replacement);
  });

  it("bounds and expires rate-limit entries", () => {
    checkRateLimit("expired", 1_000);
    checkRateLimit("fresh", 61_001);
    assert.equal(getTelegramRateLimitSize(), 1);
    for (let index = 0; index < 2_000; index += 1) checkRateLimit(`chat-${index}`, 61_002);
    assert.ok(getTelegramRateLimitSize() <= 1_000);
  });

  it("invalidates confirmations created before an in-process restart", async () => {
    lockDir = await mkdtemp(join(tmpdir(), "inaja-telegram-runtime-"));
    const fake = createClient();
    await startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    const ctx = { chatId: "chat", fromId: "actor", user: { usuarioId: "user" } };
    const confirmation = createConfirmation(telegramInteractions, ctx, { action: "backup" });
    await stopTelegramBot();
    await startTelegramBot({ db: configuredDb(), client: fake.client, lockDir });
    assert.equal(consumeConfirmation(telegramInteractions, ctx, confirmation.confirm).ok, false);
  });
});
