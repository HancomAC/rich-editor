import { describe, expect, it } from "vitest";
import { isTiptapHtmlEmpty } from "./empty";

describe("isTiptapHtmlEmpty", () => {
  it.each(["", "<p></p>", "<p> </p>", '<p class="empty"></p>', "<p></p><h2>\n</h2>"])(
    "recognizes empty root blocks: %s",
    (html) => expect(isTiptapHtmlEmpty(html)).toBe(true),
  );

  it.each(["<p><br></p>", "<p>&nbsp;</p>", "<p>text</p>", '<img src="image.png">'])(
    "retains explicit content: %s",
    (html) => expect(isTiptapHtmlEmpty(html)).toBe(false),
  );
});
