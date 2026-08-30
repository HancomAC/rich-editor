const emptyRootTextBlock = /<(p|h[1-6])(?:\s[^>]*)?>[\t\n\f\r ]*<\/\1>/gi;

export function isTiptapHtmlEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(emptyRootTextBlock, "").trim().length === 0;
}
