<script lang="ts">
  import type { Attachment } from "svelte/attachments";
  import { createRawSnippet } from "svelte";
  import type { AnyExtension } from "@tiptap/core";
  import { createStaticRenderer } from "tiptap-static";
  import { FileAttachment, type FileResolver } from "../extensions/FileAttachment";
  import { PdfBlock } from "../extensions/PdfBlock";
  import { MbusVideo } from "../extensions/MbusVideo";
  import { VideoEmbed } from "../extensions/VideoEmbed";
  import { CardBlock } from "../extensions/CardBlock";
  import { MathInline, MathDisplay } from "../extensions/Math";
  import { transformLegacyHtml } from "../utils/sanitize";
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
    const defaults: AnyExtension[] = [
      PdfBlock,
      FileAttachment.configure({
        resolver: (onResolveFile as FileResolver | undefined) ?? null,
        ...(fileDownloadBaseUrl ? { downloadBaseUrl: fileDownloadBaseUrl } : {}),
      }),
      MbusVideo,
      VideoEmbed,
      CardBlock,
      MathInline,
      MathDisplay,
    ];
    const customNames = new Set(extraExtensions.map((extension) => extension.name));
    return [...defaults.filter((extension) => !customNames.has(extension.name)), ...extraExtensions];
  });
  const policy = $derived(createStaticSanitizePolicy(sanitize));
  const source = $derived(transformLegacyHtml(content));
  const renderer = $derived(
    createStaticRenderer({ extensions, rawNodeViews: true, sanitize: policy }),
  );
  const sanitized = $derived(renderer.sanitize(source));
  const sanitizedSnippet = $derived.by(() => {
    const html = sanitized;
    return createRawSnippet(() => ({ render: () => html }));
  });
  const showPlaceholder = $derived(Boolean(placeholder && isTiptapHtmlEmpty(sanitized)));

  $effect(() => {
    if (!target) return;
    const session = renderer.mount(target, source);
    ref = session;
    loaded = true;
    return () => {
      session.destroy();
      if (ref === session) ref = null;
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
