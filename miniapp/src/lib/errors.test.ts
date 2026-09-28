import assert from "node:assert/strict";
import { it } from "node:test";
import { getErrorMessage } from "./errors";

it("переводит известные ошибки Supabase на понятный язык", () => {
  assert.equal(getErrorMessage(new Error("Invalid login credentials")), "Неверный email или пароль");
  assert.equal(getErrorMessage({ message: "TypeError: Failed to fetch" }), "Нет соединения. Проверьте интернет");
  assert.equal(getErrorMessage(null, "Запасной текст"), "Запасной текст");
  assert.equal(getErrorMessage(new Error("Ученик с таким ником не найден")), "Ученик с таким ником не найден");
});
