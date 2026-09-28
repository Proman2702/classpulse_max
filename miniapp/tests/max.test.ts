import assert from "node:assert/strict";
import { test } from "node:test";
import { max } from "../src/lib/max.ts";

test("CDN object outside MAX uses the normal browser link and skips haptics", () => {
  const calls: string[] = [];
  const testWindow = {
    WebApp: {
      platform: null,
      initData: "",
      openMaxLink: () => calls.push("bridge"),
      HapticFeedback: { impactOccurred: () => calls.push("haptic") },
    },
    open: (url: string) => calls.push(url),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: testWindow });
  max.open("https://max.ru/u/test");
  max.tap();
  assert.deepEqual(calls, ["https://max.ru/u/test"]);
});

test("MAX web client still uses Bridge and registers and removes its back button", () => {
  const calls: string[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    WebApp: {
      platform: "web", initData: "test-ui-context",
      openMaxLink: () => calls.push("bridge"),
      BackButton: {
        onClick: () => calls.push("on"), show: () => calls.push("show"),
        offClick: () => calls.push("off"), hide: () => calls.push("hide"),
      },
    },
  } });
  max.open("https://max.ru/u/test");
  const unsubscribe = max.onBack(() => undefined);
  unsubscribe();
  assert.deepEqual(calls, ["bridge", "on", "show", "off", "hide"]);
});

test("Rejected MAX vibration requests are handled", async () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    WebApp: {
      platform: "android", initData: "test-ui-context",
      HapticFeedback: { notificationOccurred: () => Promise.reject(new Error("offline")) },
    },
  } });
  const originalWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    max.success();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = originalWarn;
  }
});

test("Invitation sharing waits for MAX and propagates failures", async () => {
  const calls: unknown[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    WebApp: { platform: "web", initData: "context", shareMaxContent: async (data: unknown) => { calls.push(data); } },
  } });
  assert.equal(await max.share("Invite", max.appLink()), "shared");
  assert.deepEqual(calls, [{ text: "Invite", link: "https://max.ru/t98_hakaton_max_bot?startapp" }]);
  window.WebApp!.shareMaxContent = () => Promise.reject(new Error("offline"));
  await assert.rejects(() => max.share("Invite", max.appLink()), /offline/);
});
