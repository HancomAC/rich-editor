import { describe, expect, it } from "vitest";
import { sanitizeTiptapHTML } from "tiptap-static";
import { createStaticSanitizePolicy } from "./policy";

describe("createStaticSanitizePolicy", () => {
  it("preserves editor data attributes and safe formatting", () => {
    const html = sanitizeTiptapHTML(
      '<div data-file-src="/files/a.pdf" data-file-name="a.pdf"></div><p style="color: red; position: fixed">safe</p>',
      [],
      createStaticSanitizePolicy(),
    );

    expect(html).toContain('data-file-src="/files/a.pdf"');
    expect(html).toContain("color:red");
    expect(html).not.toContain("position");
  });

  it("does not enable active content unless the caller opts in", () => {
    const html = sanitizeTiptapHTML(
      '<iframe src="https://evil.example/frame"></iframe>',
      [],
      createStaticSanitizePolicy(),
    );

    expect(html).toBe("");
  });

  it("merges caller attributes with the package defaults", () => {
    const html = sanitizeTiptapHTML(
      '<div data-file-name="a.pdf" data-custom="yes"></div>',
      [],
      createStaticSanitizePolicy({ allowedAttributes: { div: ["data-custom"] } }),
    );

    expect(html).toContain('data-file-name="a.pdf"');
    expect(html).toContain('data-custom="yes"');
  });

  it("rejects executable URLs stored in custom data attributes", () => {
    const html = sanitizeTiptapHTML(
      '<div data-video-src="javascript:alert(1)"></div>',
      [],
      createStaticSanitizePolicy(),
    );

    expect(html).not.toContain("javascript:");
  });

  it("preserves read-only task list state", () => {
    const html = sanitizeTiptapHTML(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>done</p></div></li></ul>',
      [],
      createStaticSanitizePolicy(),
    );

    expect(html).toContain('<ul data-type="taskList">');
    expect(html).toContain('<li data-type="taskItem" data-checked="true">');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked="checked"');
    expect(html).toContain('disabled="disabled"');

    const target = document.createElement("div");
    target.innerHTML = html;
    const checkbox = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
    target.querySelector("label")?.click();
    expect(checkbox?.checked).toBe(true);
  });

  it("composes a caller input transform before enforcing read-only checkboxes", () => {
    const html = sanitizeTiptapHTML(
      '<input type="checkbox" data-custom="yes">',
      [],
      createStaticSanitizePolicy({
        allowedAttributes: { input: ["data-custom"] },
        transformTags: {
          input: (tagName, attributes) => ({
            tagName,
            attribs: { ...attributes, "data-custom": "transformed" },
          }),
        },
      }),
    );

    expect(html).toContain('data-custom="transformed"');
    expect(html).toContain('disabled="disabled"');
  });
});
