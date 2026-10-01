// @vitest-environment node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { build } from "vite";
const root = fileURLToPath(new URL("../../", import.meta.url));
describe("static package entry compatibility", () => {
    it("bundles the legacy public entry for SSR without Svelte or the editor runtime", async () => {
        const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
        const entry = manifest.exports["./static"].default;
        const sourceEntry = entry.replace(/^\.\/dist\//, "./src/").replace(/\.js$/, ".ts");
        const moduleIds = [];
        const result = await build({
            root,
            configFile: false,
            logLevel: "silent",
            ssr: { noExternal: true },
            build: {
                ssr: sourceEntry,
                write: false,
                minify: false,
                rollupOptions: { output: { format: "es", inlineDynamicImports: true } },
            },
            plugins: [{
                    name: "inspect-static-entry-dependencies",
                    generateBundle() {
                        moduleIds.push(...this.getModuleIds());
                    },
                }],
        });
        if (Array.isArray(result) || !("output" in result)) {
            throw new Error("Expected one in-memory SSR bundle");
        }
        const entryChunk = result.output.find((output) => output.type === "chunk" && output.isEntry);
        expect(entryChunk?.type).toBe("chunk");
        if (entryChunk?.type !== "chunk")
            throw new Error("Missing static entry chunk");
        expect(entryChunk.exports).toEqual(expect.arrayContaining([
            "renderStaticHtml",
            "sanitizeHtml",
            "transformLegacyHtml",
            "stripHtmlToExcerpt",
        ]));
        expect(moduleIds.length).toBeGreaterThan(1);
        expect(moduleIds.filter((id) => /\.svelte(?:[?]|$)|[/]svelte[/]|@tiptap[/]/.test(id))).toEqual([]);
    });
    it("exposes the Svelte component through a separate public entry", async () => {
        const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
        expect(manifest.peerDependencies.svelte).toBe("^5.29.0");
        const componentEntry = manifest.exports["./static/component"];
        expect(componentEntry.svelte).toBe(componentEntry.default);
        expect(componentEntry.default).not.toBe(manifest.exports["./static"].default);
        const sourceEntry = componentEntry.default
            .replace(/^\.\/dist\//, "./src/")
            .replace(/\.js$/, ".ts");
        const source = await readFile(new URL(`../../${sourceEntry}`, import.meta.url), "utf8");
        expect(source).toMatch(/export\s*\{\s*default as StaticTipTap\s*\}\s*from\s*["']\.\.\/components\/StaticTipTap\.svelte["']/);
    });
});
