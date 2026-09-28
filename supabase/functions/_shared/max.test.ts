// Запуск: npm test (Node test runner). Проверяет проверку подписи initData MAX.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { it } from "node:test";
import { validateInitData, validateNotification } from "./max.ts";

const TOKEN = "test-bot-token";

const sign = (pairs: Record<string, string>, token = TOKEN) => {
  const dataCheckString = Object.keys(pairs).sort().map((key) => `${key}=${pairs[key]}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return new URLSearchParams({ ...pairs, hash }).toString();
};

const fresh = () => ({
  auth_date: String(Math.floor(Date.now() / 1000)),
  query_id: "q1",
  user: JSON.stringify({ id: 42, first_name: "Маша" }),
});

it("принимает корректно подписанные данные", async () => {
  const user = await validateInitData(sign(fresh()), TOKEN);
  assert.equal(user?.id, 42);
});

it("отклоняет подпись другим токеном", async () => {
  assert.equal(await validateInitData(sign(fresh(), "other"), TOKEN), null);
});

it("отклоняет подменённого пользователя", async () => {
  const tampered = sign(fresh()).replace("42", "43");
  assert.equal(await validateInitData(tampered, TOKEN), null);
});

it("отклоняет устаревшие данные", async () => {
  const initData = sign(fresh());
  assert.equal(await validateInitData(initData, TOKEN, 60, Date.now() + 3_600_000), null);
});

it("отклоняет данные без hash", async () => {
  assert.equal(await validateInitData("auth_date=1&user=%7B%7D", TOKEN), null);
});

it("отклоняет дублированные параметры, включая hash", async () => {
  const data = sign(fresh());
  assert.equal(await validateInitData(data + "&hash=" + new URLSearchParams(data).get("hash"), TOKEN), null);
  assert.equal(await validateInitData(data + "&user=" + encodeURIComponent(fresh().user), TOKEN), null);
});

it("отклоняет подписанные даты из будущего и нечисловые даты", async () => {
  assert.equal(await validateInitData(sign({ ...fresh(), auth_date: String(Math.floor(Date.now() / 1000) + 3600) }), TOKEN), null);
  assert.equal(await validateInitData(sign({ ...fresh(), auth_date: "Infinity" }), TOKEN), null);
});

it("отклоняет отрицательный, дробный и небезопасный id MAX", async () => {
  for (const id of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(await validateInitData(sign({ ...fresh(), user: JSON.stringify({ id }) }), TOKEN), null);
  }
});

it("проверяет подпись уведомления и отклоняет подмену и чужой секрет", async () => {
  const payload = JSON.stringify({ event_id: "test", table: "reports" });
  const signature = createHmac("sha256", TOKEN).update(payload).digest("hex");
  assert.equal(await validateNotification(payload, signature, TOKEN), true);
  assert.equal(await validateNotification(payload + " ", signature, TOKEN), false);
  assert.equal(await validateNotification(payload, signature, "other"), false);
});
