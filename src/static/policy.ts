import type { AllowedAttribute, StaticSanitizeOptions } from "tiptap-static";

const resizeDataAttributes = [
  "data-resize-handler",
  "data-resize-target",
  "data-resize-min-height",
  "data-resize-max-height",
  "data-resize-aspect-ratio",
  "data-resize-horizontal-align",
  "data-bubble-menu",
  "data-hide-bubble-menu",
];

const defaultTags = [
  "img",
  "math-inline",
  "math-display",
  "blockquote",
  "mark",
  "code",
  "details",
  "summary",
];

const defaultAttributes: Record<string, AllowedAttribute[]> = {
  "*": ["style", "class"],
  a: ["href", "name", "target", "rel", "download"],
  img: ["src", "srcset", "alt", "title", "width", "height", "loading", ...resizeDataAttributes],
  div: [
    "data-type",
    "data-columns",
    "data-pdf-src",
    "data-pdf-name",
    "data-pdf-id",
    "data-pdf-width",
    "data-pdf-label",
    "data-file-id",
    "data-file-src",
    "data-file-name",
    "data-file-size",
    "data-mbus-src",
    "data-mbus-width",
    "data-video-src",
    "data-video-width",
    "data-card-title",
    "data-card-background",
    "data-card-height",
    ...resizeDataAttributes,
  ],
  details: ["open", "data-type"],
  summary: ["data-level"],
  th: ["colwidth", "colspan", "rowspan"],
  td: ["colwidth", "colspan", "rowspan"],
  mark: ["style", "data-color"],
  code: ["class"],
  pre: ["class"],
};

const safeStyleValue =
  /^(?!.*\\)(?!.*(?:url\s*\(|expression\s*\(|@import\b|javascript:|data:))[\s\S]+$/i;
const defaultStyles: NonNullable<StaticSanitizeOptions["allowedStyles"]> = {
  "*": Object.fromEntries(
    [
      "background-color",
      "border",
      "border-color",
      "border-style",
      "border-width",
      "color",
      "display",
      "font-family",
      "font-size",
      "font-style",
      "font-weight",
      "height",
      "line-height",
      "list-style-position",
      "list-style-type",
      "margin",
      "margin-left",
      "margin-right",
      "max-height",
      "max-width",
      "min-height",
      "min-width",
      "overflow",
      "overflow-wrap",
      "padding",
      "text-align",
      "text-decoration",
      "text-indent",
      "vertical-align",
      "white-space",
      "width",
      "word-break",
    ].map((property) => [property, [safeStyleValue]]),
  ),
};

const safeStoredUrl = (value: string): boolean => {
  if (/^(?:\/|\.\/|\.\.\/)(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const defaultAttributeValidators: NonNullable<
  StaticSanitizeOptions["attributeValidators"]
> = {
  div: {
    "data-pdf-src": safeStoredUrl,
    "data-file-src": safeStoredUrl,
    "data-mbus-src": safeStoredUrl,
    "data-video-src": safeStoredUrl,
  },
};

function mergeAttributes(
  overrides: StaticSanitizeOptions["allowedAttributes"],
): StaticSanitizeOptions["allowedAttributes"] {
  if (overrides === false) return false;

  const result: Record<string, AllowedAttribute[]> = {};
  for (const [tag, attributes] of Object.entries({
    ...defaultAttributes,
    ...(overrides ?? {}),
  })) {
    const seen = new Set<string>();
    result[tag] = [
      ...(defaultAttributes[tag] ?? []),
      ...(overrides?.[tag] ?? attributes),
    ].filter((attribute) => {
      const name = typeof attribute === "string" ? attribute : attribute.name;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }
  return result;
}

export function createStaticSanitizePolicy(
  overrides: StaticSanitizeOptions = {},
): StaticSanitizeOptions {
  const allowedStyles: NonNullable<StaticSanitizeOptions["allowedStyles"]> = {};
  for (const source of [defaultStyles, overrides.allowedStyles ?? {}]) {
    for (const [tag, declarations] of Object.entries(source)) {
      allowedStyles[tag] = { ...(allowedStyles[tag] ?? {}), ...declarations };
    }
  }

  const attributeValidators: NonNullable<
    StaticSanitizeOptions["attributeValidators"]
  > = {};
  for (const source of [defaultAttributeValidators, overrides.attributeValidators ?? {}]) {
    for (const [tag, validators] of Object.entries(source)) {
      attributeValidators[tag] = {
        ...(attributeValidators[tag] ?? {}),
        ...validators,
      };
    }
  }

  return {
    ...overrides,
    allowedTags:
      overrides.allowedTags === false
        ? false
        : [...new Set([...defaultTags, ...(overrides.allowedTags ?? [])])],
    allowedAttributes: mergeAttributes(overrides.allowedAttributes),
    allowedStyles,
    attributeValidators,
    allowActiveContentTags: [...new Set(overrides.allowActiveContentTags ?? [])],
  };
}
