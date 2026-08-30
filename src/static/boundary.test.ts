import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("static package boundary", () => {
  it("keeps the default renderer independent from editor extensions", async () => {
    const [component, builtins] = await Promise.all([
      source("../components/StaticTipTap.svelte"),
      source("./builtin-nodes.ts"),
    ]);

    expect(component).not.toContain('from "../extensions/');
    expect(component).not.toContain("createStaticRenderer");
    expect(builtins).not.toContain("@tiptap/core");
    expect(builtins).not.toContain("@tiptap/pm");
  });
});
