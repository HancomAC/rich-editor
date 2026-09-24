<script lang="ts">
  import type { Attachment } from "svelte/attachments";
  import { createRawSnippet } from "svelte";
  import "katex/dist/katex.css";
  import { createHydrator } from "tiptap-static/hydrate";
  import { sanitizeTiptapHTML } from "tiptap-static";
  import { transformLegacyHtml } from "../utils/sanitize";
  import { createBuiltinStaticNodes } from "../static/builtin-nodes";
  import { planAsExtension } from "../static/plan-extension";
  import { createStaticSanitizePolicy } from "../static/policy";
  import { isTiptapHtmlEmpty } from "../static/empty";
  import type { StaticTipTapProps } from "../types";

  let {
    content = "",
    placeholder,
    onResolveFile,
    fileDownloadBaseUrl,
    extensions: extraExtensions = [],
    sanitize = {},
    loaded = $bindable(false),
    ref = $bindable(null),
    class: className = "",
    style,
  }: StaticTipTapProps = $props();

  let target = $state.raw<HTMLElement>();
  const captureTarget: Attachment<HTMLElement> = (element) => {
    target = element;
    return () => {
      if (target === element) target = undefined;
    };
  };

  const extensions = $derived.by(() => {
    return extraExtensions;
  });
  const nodes = $derived(createBuiltinStaticNodes({
    resolver: onResolveFile,
    downloadBaseUrl: fileDownloadBaseUrl,
  }));
  const policy = $derived(createStaticSanitizePolicy(sanitize));
  const source = $derived(transformLegacyHtml(content));
  const sanitizeExtensions = $derived.by(() => {
    const customNames = new Set(extensions.map((extension) => extension.name));
    return [
      ...nodes.filter((node) => !customNames.has(node.name)).map(planAsExtension),
      ...extensions,
    ];
  });
  const sanitized = $derived(
    sanitizeTiptapHTML(source, sanitizeExtensions, policy),
  );
  const sanitizedSnippet = $derived.by(() => {
    const html = sanitized;
    return createRawSnippet(() => ({ render: () => html }));
  });
  const showPlaceholder = $derived(Boolean(placeholder && isTiptapHtmlEmpty(sanitized)));

  $effect(() => {
    if (!target) return;
    const element = target;
    let active = true;
    let session: { destroy(): void } | undefined;
    loaded = false;
    ref = null;

    if (extensions.length > 0) {
      void import("../static/full").then(({ createFullStaticRenderer }) => {
        if (!active) return;
        session = createFullStaticRenderer(nodes, extensions, policy).mount(element, sanitized);
        ref = session;
        loaded = true;
      });
    } else {
      session = createHydrator({ nodes }).mount(element, sanitized);
      ref = session;
      loaded = true;
    }

    return () => {
      active = false;
      session?.destroy();
      ref = null;
      loaded = false;
    };
  });
</script>

<div class={`hce-static ${className}`} {style}>
  <div class="tiptap hce-static-content" {@attach captureTarget}>
    <!-- The renderer sanitizes this value before it reaches the raw snippet boundary. -->
    {@render sanitizedSnippet()}
  </div>
  {#if showPlaceholder}
    <p class="hce-static-placeholder" aria-hidden="true">{placeholder}</p>
  {/if}
</div>

<style>
  .hce-static {
    position: relative;
  }

  .hce-static-content > :global(*:first-child) {
    margin-top: 0;
  }

  .hce-static-content > :global(*:last-child) {
    margin-bottom: 0;
  }

  .hce-static-content :global(img),
  .hce-static-content :global(iframe),
  .hce-static-content :global(embed) {
    max-width: 100%;
  }

  .hce-static-content :global(input[type="checkbox"]) {
    pointer-events: none;
  }

  .hce-static-content :global(.hce-static-file) {
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 400px;
    margin: 8px 0;
    padding: 8px 14px;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 8px;
    background: var(--muted, #f7fafc);
  }

  .hce-static-content :global(.hce-static-file-icon) {
    flex-shrink: 0;
    font-size: 22px;
  }

  .hce-static-content :global(.hce-static-file-name) {
    min-width: 0;
    overflow: hidden;
    color: var(--primary, #4a7dac);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hce-static-content :global(.hce-static-file-size) {
    flex-shrink: 0;
    color: var(--muted-foreground, #718096);
    font-size: 12px;
  }

  .hce-static-content :global(.hce-static-media),
  .hce-static-content :global(.hce-static-pdf) {
    box-sizing: border-box;
    max-width: 100%;
    margin: 8px 0;
  }

  .hce-static-content :global(.hce-static-media-frame) {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    overflow: hidden;
    border-radius: 8px;
    background: #0b1020;
  }

  .hce-static-content :global(.hce-static-media-frame iframe) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .hce-static-content :global(.hce-static-pdf-toolbar) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--border, #e2e8f0);
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
  }

  .hce-static-content :global(.hce-static-pdf-toolbar a) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hce-static-content :global(.hce-static-pdf-toolbar button) {
    padding: 4px 8px;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    background: var(--background, #fff);
    cursor: pointer;
  }

  .hce-static-content :global(.hce-static-pdf-toolbar button:disabled) {
    cursor: default;
    opacity: 0.45;
  }

  .hce-static-content :global(.hce-static-pdf-page) {
    min-width: 3.5em;
    text-align: center;
  }

  .hce-static-content :global(.hce-static-pdf-frame) {
    overflow: auto;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0 0 8px 8px;
    background: var(--muted, #f7fafc);
    text-align: center;
  }

  .hce-static-content :global(.hce-static-pdf canvas) {
    display: block;
    width: 100%;
    height: auto;
    margin: 0 auto;
  }

  .hce-static-content :global(.hce-static-pdf-status) {
    margin: 0;
    padding: 32px 16px;
    color: var(--muted-foreground, #718096);
  }

  .hce-static-content :global(.hce-card-frame) {
    box-sizing: border-box;
    overflow: auto;
    border-radius: 12px;
  }

  .hce-static-content :global(.hce-card-content) {
    padding: 20px;
  }

  .hce-static-content :global(.math-source) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .hce-static-content :global(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }

  .hce-static-content :global(div[data-type="columns"]) {
    display: grid;
    grid-template-columns: repeat(var(--hce-columns, 2), minmax(0, 1fr));
    gap: 12px;
  }

  .hce-static-content :global(div[data-type="columns"][data-columns="3"]) {
    --hce-columns: 3;
  }

  .hce-static-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    color: var(--muted-foreground, #718096);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .hce-static-content :global(div[data-type="columns"]) {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
