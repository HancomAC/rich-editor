import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("static package compatibility", () => {
  it("declares the Svelte version required by attachments", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
      peerDependencies: { svelte: string };
    };

    expect(manifest.peerDependencies.svelte).toBe("^5.29.0");
  });
});
