import { escapeHtml } from "./escape-html";

const ALLOWED_TAGS = new Set([
  "p", "br", "b", "i", "u", "em", "strong", "a",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code", "img", "figure", "figcaption",
  "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
  "span", "div", "hr", "sub", "sup",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height"]),
  table: new Set(["style"]),
  col: new Set(["style", "width"]),
  td: new Set(["colspan", "rowspan", "colwidth", "style"]),
  th: new Set(["colspan", "rowspan", "colwidth", "style"]),
  div: new Set(["data-pdf-src", "data-pdf-name"]),
  pre: new Set(["class"]),
  code: new Set(["class"]),
  "*": new Set(["class", "id"]),
};

const SAFE_URL_PATTERN = /^(?:https?:\/\/|\/[\w])/i;

export function sanitizeHtml(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag, attrs) => {
      const lower = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(lower)) return "";

      const cleanAttrs = sanitizeAttributes(lower, attrs);
      const isClosing = match.startsWith("</");
      if (isClosing) return `</${lower}>`;
      const selfClosing = match.endsWith("/>");
      return `<${lower}${cleanAttrs}${selfClosing ? " /" : ""}>`;
    });
}

function sanitizeAttributes(tag: string, attrString: string): string {
  const allowedForTag = ALLOWED_ATTRS[tag] ?? new Set();
  const allowedGlobal = ALLOWED_ATTRS["*"] ?? new Set();
  const result: string[] = [];

  const attrRegex = /([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";

    if (name.startsWith("on")) continue;
    if (!allowedForTag.has(name) && !allowedGlobal.has(name)) continue;
    if ((name === "href" || name === "src") && !SAFE_URL_PATTERN.test(value)) {
      continue;
    }

    result.push(` ${name}="${escapeHtml(value)}"`);
  }

  return result.join("");
}

export function stripHtmlToExcerpt(html: string, maxLen = 200): string {
  const text = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "\u2026" : text;
}
