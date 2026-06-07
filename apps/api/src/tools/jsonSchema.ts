import { z } from "zod";

/**
 * 最小限の Zod → JSON Schema 変換 (引き継ぎドキュメント §9.2)。
 *
 * Tool の inputSchema を LLM に渡す ToolDefinition 形式へ変換する。
 * 本リポジトリの Tool が使う範囲 (object / string / number / boolean /
 * array / enum / optional / default) のみを対象にした学習用の最小実装。
 * zod v3 には標準の toJSONSchema が無いため自前で持つ。
 */
export type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  // optional / default は内側の型をたどり、required 判定は呼び出し側で行う。
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) {
    return zodToJsonSchema(schema._def.innerType as z.ZodTypeAny);
  }
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: [...(schema._def.values as string[])] };
  }
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToJsonSchema(schema._def.type as z.ZodTypeAny) };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape() as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      const optional =
        value instanceof z.ZodOptional || value instanceof z.ZodDefault;
      if (!optional) required.push(key);
    }
    const out: JsonSchema = { type: "object", properties };
    if (required.length > 0) out.required = required;
    return out;
  }
  // 未対応の型は緩く any として扱う (学習用)。
  return {};
}
