import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodToJsonSchema } from "./jsonSchema";

test("primitive 型を変換する", () => {
  assert.deepEqual(zodToJsonSchema(z.string()), { type: "string" });
  assert.deepEqual(zodToJsonSchema(z.number()), { type: "number" });
  assert.deepEqual(zodToJsonSchema(z.boolean()), { type: "boolean" });
});

test("enum を string + enum に変換する", () => {
  assert.deepEqual(zodToJsonSchema(z.enum(["a", "b"])), {
    type: "string",
    enum: ["a", "b"],
  });
});

test("object は required を optional/default 以外から組む", () => {
  const schema = z.object({
    query: z.string(),
    limit: z.number().default(5),
    status: z.string().optional(),
  });
  const json = zodToJsonSchema(schema);
  assert.equal(json.type, "object");
  assert.deepEqual(json.required, ["query"]);
  const props = json.properties as Record<string, unknown>;
  assert.deepEqual(props.query, { type: "string" });
  // default/optional は内側の型へ展開される。
  assert.deepEqual(props.limit, { type: "number" });
  assert.deepEqual(props.status, { type: "string" });
});

test("array の items を変換する", () => {
  assert.deepEqual(zodToJsonSchema(z.array(z.string())), {
    type: "array",
    items: { type: "string" },
  });
});
