import { test } from "node:test";
import assert from "node:assert/strict";
import { runEval } from "./runEval";

test("Eval は全ケース pass する（mock で決定的）", async () => {
  const report = await runEval();
  const failed = report.cases.filter((c) => !c.ok);
  assert.deepEqual(
    failed.map((c) => `${c.suite}/${c.name}: ${c.detail}`),
    [],
  );
  assert.equal(report.failed, 0);
  assert.ok(report.total >= 8);
});
