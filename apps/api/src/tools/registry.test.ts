import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ToolRegistry } from "./registry";
import type { BusinessTool } from "./types";

function fakeTool(name: string): BusinessTool {
  return {
    name,
    description: `${name} の説明`,
    inputSchema: z.object({ query: z.string(), limit: z.number().default(5) }),
    riskLevel: "low",
    async execute() {
      return { ok: true, data: {} };
    },
  };
}

test("register / get / list が動く", () => {
  const reg = new ToolRegistry().register(fakeTool("a")).register(fakeTool("b"));
  assert.equal(reg.list().length, 2);
  assert.equal(reg.get("a")?.name, "a");
  assert.equal(reg.get("missing"), undefined);
});

test("同名 Tool の二重登録は例外", () => {
  const reg = new ToolRegistry().register(fakeTool("a"));
  assert.throws(() => reg.register(fakeTool("a")), /既に登録/);
});

test("definitions は name/description/inputSchema を返す", () => {
  const reg = new ToolRegistry().register(fakeTool("a"));
  const defs = reg.definitions();
  assert.equal(defs.length, 1);
  assert.equal(defs[0]!.name, "a");
  const schema = defs[0]!.inputSchema as { type: string; required: string[] };
  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["query"]);
});
