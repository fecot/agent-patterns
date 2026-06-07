import type { ToolDefinition } from "../llm/types";
import { zodToJsonSchema } from "./jsonSchema";
import type { BusinessTool } from "./types";

/**
 * Tool Registry (引き継ぎドキュメント §9.1)。
 * Assistant が使える Tool を一元管理し、LLM へ渡す ToolDefinition も供給する。
 */
export class ToolRegistry {
  private readonly tools = new Map<string, BusinessTool<any, any>>();

  register(tool: BusinessTool<any, any>): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" は既に登録されています`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): BusinessTool<any, any> | undefined {
    return this.tools.get(name);
  }

  list(): BusinessTool<any, any>[] {
    return [...this.tools.values()];
  }

  /** LLM Gateway へ渡す Tool 定義一覧。 */
  definitions(): ToolDefinition[] {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    }));
  }
}
