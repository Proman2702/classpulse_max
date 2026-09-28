import assert from "node:assert/strict";
import { it } from "node:test";
import { plural } from "./labels";

it("plural склоняет по правилам русского языка", () => {
  const forms: [string, string, string] = ["ученик", "ученика", "учеников"];
  const cases: Array<[number, string]> = [
    [0, "учеников"], [1, "ученик"], [2, "ученика"], [5, "учеников"], [11, "учеников"],
    [12, "учеников"], [21, "ученик"], [22, "ученика"], [111, "учеников"], [101, "ученик"],
  ];
  for (const [count, expected] of cases) assert.equal(plural(count, forms), expected, String(count));
});
