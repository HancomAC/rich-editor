<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
  import { common, createLowlight } from "lowlight";
  import cpp from "highlight.js/lib/languages/cpp";
  import python from "highlight.js/lib/languages/python";
  import Placeholder from "@tiptap/extension-placeholder";
  import Image from "@tiptap/extension-image";
  import Link from "@tiptap/extension-link";
  import Underline from "@tiptap/extension-underline";
  import TextAlign from "@tiptap/extension-text-align";
  import Color from "@tiptap/extension-color";
  import { TextStyle } from "@tiptap/extension-text-style";
  import HighlightExt from "@tiptap/extension-highlight";
  import TaskList from "@tiptap/extension-task-list";
  import TaskItem from "@tiptap/extension-task-item";
  import SubscriptExt from "@tiptap/extension-subscript";
  import SuperscriptExt from "@tiptap/extension-superscript";
  import Typography from "@tiptap/extension-typography";
  import CharacterCount from "@tiptap/extension-character-count";
  import { Table } from "@tiptap/extension-table";
  import { TableRow } from "@tiptap/extension-table-row";
  import { TableHeader } from "@tiptap/extension-table-header";
  import { TableCell } from "@tiptap/extension-table-cell";
  import { DetailsContent, DetailsSummary } from "@tiptap/extension-details";
  import { FixedDetails } from "../extensions/FixedDetails";
  import Youtube from "@tiptap/extension-youtube";
  import FileHandler from "@tiptap/extension-file-handler";
  import { Extension, type AnyExtension } from "@tiptap/core";
  import { TextSelection } from "@tiptap/pm/state";
  import { PdfBlock } from "../extensions/PdfBlock";
  import { Columns } from "../extensions/Columns";
  import { Column } from "../extensions/Column";
  import { transformLegacyHtml } from "../utils/sanitize";
  import { Indent } from "../extensions/Indent";
  import { FileAttachment } from "../extensions/FileAttachment";
  import { VideoBlock } from "../extensions/VideoBlock";
  import FixedToolbar from "./FixedToolbar.svelte";
  import BubbleToolbar from "./BubbleToolbar.svelte";
  import SlashCommandMenu from "./SlashCommandMenu.svelte";
  import TableBubbleMenu from "./TableBubbleMenu.svelte";
  import type { UploadHandler, ToolbarMode, ToolbarFeature } from "../types";
  import { resolveFeatures } from "../types";
  import type { FileResolver } from "../extensions/FileAttachment";

  const cellAttrs = {
    backgroundColor: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        element.style.backgroundColor || null,
      renderHTML: (attributes: Record<string, unknown>) => {
        const styles: string[] = [];
        if (attributes.backgroundColor)
          styles.push(`background-color: ${attributes.backgroundColor}`);
        if (attributes.lineHeight)
          styles.push(`line-height: ${attributes.lineHeight}`);
        return styles.length ? { style: styles.join("; ") } : {};
      },
    },
    lineHeight: {
      default: null,
      parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
      renderHTML: () => ({}),
    },
  };

  const CustomTableCell = TableCell.extend({
    addAttributes() {
      return { ...this.parent?.(), ...cellAttrs };
    },
  });

  const CustomTableHeader = TableHeader.extend({
    addAttributes() {
      return { ...this.parent?.(), ...cellAttrs };
    },
  });

  /**
   * 코드블록이 문서 맨 첫 노드일 때, 코드블록 맨 앞에서
   * ArrowUp을 누르면 위에 빈 paragraph를 삽입하고 커서 이동.
   */
  const CodeBlockTopEscape = Extension.create({
    name: "codeBlockTopEscape",
    addKeyboardShortcuts() {
      return {
        ArrowUp: () => {
          const { state, view } = this.editor;
          const { from } = state.selection;
          const firstNode = state.doc.firstChild;
          if (!firstNode) return false;
          if (firstNode.type.name !== "codeBlock") return false;
          const codeStart = 1;
          if (from !== codeStart) return false;
          const tr = state.tr.insert(0, state.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, 1));
          view.dispatch(tr);
          return true;
        },
      };
    },
  });

  const lowlight = createLowlight(common);
  lowlight.register("cpp", cpp);
  lowlight.register("python", python);

  let {
    content = "",
    onChange,
    placeholder = "'/'를 눌러 명령어를 입력하세요...",
    onUploadFile,
    onResolveFile,
    extensions: extraExtensions = [],
    editable = true,
    toolbar = 'full',
    features: featuresOverride,
  }: {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onUploadFile?: UploadHandler;
    onResolveFile?: FileResolver;
    extensions?: AnyExtension[];
    editable?: boolean;
    toolbar?: ToolbarMode;
    features?: ToolbarFeature[];
  } = $props();

  const features = $derived(resolveFeatures(toolbar, featuresOverride));

  let editorElement: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();
  let uploading = $state(false);
  let pdfInputEl: HTMLInputElement | undefined = $state();
  let fileInputEl: HTMLInputElement | undefined = $state();
  let videoInputEl: HTMLInputElement | undefined = $state();
  let lastEmittedHtml = content;  // onChange로 내보낸 마지막 HTML (외부→내부 변경만 감지용)
  let tableObserver: MutationObserver | undefined;

  // Slash command state
  let slashMenuOpen = $state(false);
  let slashMenuPos = $state({ top: 0, left: 0 });
  let slashQuery = $state("");
  let slashStartPos: number | null = null;
  const MENU_HEIGHT = 200;

  function updateSlashMenuPosition() {
    if (!editor || slashStartPos === null) return;
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);

    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-height",
      ) || "74",
    );
    const toolbarEl = editor.view.dom
      .closest(".hce-editor-wrapper")
      ?.querySelector(".sticky");
    const toolbarBottom = toolbarEl
      ? toolbarEl.getBoundingClientRect().bottom
      : headerHeight;
    const topSafe = Math.max(toolbarBottom, headerHeight) + 4;

    const bottomBar = document.querySelector(".sticky.bottom-0");
    const bottomBarHeight = bottomBar
      ? bottomBar.getBoundingClientRect().height
      : 0;
    const bottomSafe = window.innerHeight - bottomBarHeight - 4;

    const spaceBelow = bottomSafe - coords.bottom;
    const spaceAbove = coords.top - topSafe;
    const goUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;

    let top: number;
    if (goUp) {
      top = Math.max(topSafe, coords.top - MENU_HEIGHT);
    } else {
      top = Math.min(coords.bottom + 4, bottomSafe - MENU_HEIGHT);
    }

    slashMenuPos = { top, left: coords.left };
  }

  function deleteSlashText() {
    if (!editor || slashStartPos === null) return;
    const { from } = editor.state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: slashStartPos, to: from })
      .run();
  }

  function closeSlashMenu() {
    deleteSlashText();
    slashMenuOpen = false;
    slashStartPos = null;
    slashQuery = "";
  }

  function uploadPdf(file: File) {
    if (!editor || !onUploadFile) return;
    uploading = true;
    onUploadFile(file)
      .then((url) => {
        editor!
          .chain()
          .focus()
          .insertContent({
            type: "pdfBlock",
            attrs: { src: url, name: file.name },
          })
          .run();
      })
      .catch(() => {
        alert("PDF 업로드에 실패했습니다.");
      })
      .finally(() => {
        uploading = false;
      });
  }

  function uploadFile(file: File) {
    if (!editor || !onUploadFile) return;
    uploading = true;
    const size = file.size;
    onUploadFile(file)
      .then((result) => {
        const isFileId = result && !result.includes("/") && !result.includes(":");
        editor!
          .chain()
          .focus()
          .insertContent({
            type: "fileAttachment",
            attrs: {
              src: isFileId ? null : result,
              fileId: isFileId ? result : null,
              name: file.name,
              size,
            },
          })
          .run();
      })
      .catch(() => {
        alert("파일 업로드에 실패했습니다.");
      })
      .finally(() => {
        uploading = false;
      });
  }

  function uploadVideo(file: File) {
    if (!editor || !onUploadFile) return;
    uploading = true;
    onUploadFile(file)
      .then((url) => {
        editor!
          .chain()
          .focus()
          .insertContent({
            type: "videoBlock",
            attrs: { src: url, name: file.name },
          })
          .run();
      })
      .catch(() => {
        alert("영상 업로드에 실패했습니다.");
      })
      .finally(() => {
        uploading = false;
      });
  }

  // Slash command handlers (component-level for cleanup access)
  function handleUpdate() {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    const resolvedPos = state.doc.resolve(from);
    const lineStart = resolvedPos.start();
    const lineText = state.doc.textBetween(lineStart, from, "\n");

    if (lineText.startsWith("/")) {
      if (slashStartPos === null) {
        slashStartPos = lineStart;
      }
      slashQuery = lineText.slice(1);
      slashMenuOpen = true;
      updateSlashMenuPosition();
    } else {
      if (slashMenuOpen) {
        slashMenuOpen = false;
        slashStartPos = null;
        slashQuery = "";
      }
    }
  }

  function handleSelectionUpdate() {
    if (!editor || !slashMenuOpen) return;
    const { state } = editor;
    const { from } = state.selection;
    const resolvedPos = state.doc.resolve(from);
    const lineStart = resolvedPos.start();
    const lineText = state.doc.textBetween(lineStart, from, "\n");
    if (!lineText.startsWith("/")) {
      slashMenuOpen = false;
      slashStartPos = null;
      slashQuery = "";
    }
  }

  onMount(() => {
    if (!editorElement) return;

    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
        }),
        ...(extraExtensions.some((ext) => (ext as any).name === 'codeBlock')
          ? []
          : [CodeBlockLowlight.configure({
              lowlight,
              defaultLanguage: "cpp",
            })]),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "heading") {
              const level = node.attrs.level;
              if (level === 1) return "제목 1";
              if (level === 2) return "제목 2";
              if (level === 3) return "제목 3";
            }
            return placeholder;
          },
          showOnlyWhenEditable: true,
          showOnlyCurrent: true,
        }),
        Image.configure({ inline: false }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TextStyle,
        Color,
        HighlightExt.configure({ multicolor: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        SubscriptExt,
        SuperscriptExt,
        Typography,
        CharacterCount,
        Table.configure({ resizable: true, allowTableNodeSelection: true }),
        TableRow,
        CustomTableHeader,
        CustomTableCell,
        PdfBlock,
        FileAttachment,
        VideoBlock,
        Columns,
        Column,
        CodeBlockTopEscape,
        Indent,
        FixedDetails,
        DetailsContent,
        DetailsSummary,
        Youtube.configure({ inline: false, allowFullscreen: true }),
        ...extraExtensions,
        ...(onUploadFile
          ? [
              FileHandler.configure({
                allowedMimeTypes: [
                  "image/jpeg",
                  "image/png",
                  "image/gif",
                  "image/webp",
                  "application/pdf",
                  "video/mp4",
                  "video/webm",
                  "video/quicktime",
                ],
                onDrop: (_currentEditor, files, pos) => {
                  for (const file of files) {
                    if (file.type.startsWith("image/")) {
                      uploading = true;
                      onUploadFile!(file)
                        .then((url) => {
                          _currentEditor
                            .chain()
                            .focus()
                            .insertContentAt(pos, {
                              type: "image",
                              attrs: { src: url },
                            })
                            .run();
                        })
                        .catch(() =>
                          alert("이미지 업로드에 실패했습니다."),
                        )
                        .finally(() => (uploading = false));
                    } else if (file.type === "application/pdf") {
                      uploading = true;
                      onUploadFile!(file)
                        .then((url) => {
                          _currentEditor
                            .chain()
                            .focus()
                            .insertContentAt(pos, {
                              type: "pdfBlock",
                              attrs: { src: url, name: file.name },
                            })
                            .run();
                        })
                        .catch(() =>
                          alert("PDF 업로드에 실패했습니다."),
                        )
                        .finally(() => (uploading = false));
                    } else if (file.type.startsWith("video/")) {
                      uploading = true;
                      onUploadFile!(file)
                        .then((url) => {
                          _currentEditor
                            .chain()
                            .focus()
                            .insertContentAt(pos, {
                              type: "videoBlock",
                              attrs: { src: url, name: file.name },
                            })
                            .run();
                        })
                        .catch(() =>
                          alert("영상 업로드에 실패했습니다."),
                        )
                        .finally(() => (uploading = false));
                    }
                  }
                },
                onPaste: (_currentEditor, files) => {
                  for (const file of files) {
                    if (file.type.startsWith("image/")) {
                      uploading = true;
                      onUploadFile!(file)
                        .then((url) => {
                          _currentEditor
                            .chain()
                            .focus()
                            .setImage({ src: url })
                            .run();
                        })
                        .catch(() =>
                          alert("이미지 업로드에 실패했습니다."),
                        )
                        .finally(() => (uploading = false));
                    }
                  }
                },
              }),
            ]
          : []),
      ],
      content: transformLegacyHtml(content),
      editable,
      onUpdate: ({ editor: e }) => {
        const html = e
          .getHTML()
          .replace(/(<p><br\s*\/?><\/p>\s*)+$/, "")
          .replace(/<p><\/p>/g, "<p><br></p>");
        lastEmittedHtml = html;
        onChange(html);
      },
      editorProps: {
        attributes: {
          class: "tiptap outline-none p-4",
        },
        scrollThreshold: 100,
        scrollMargin: 100,
      },
      onTransaction: () => {
        // Force Svelte to re-render so toolbar active states update
        editor = editor;
      },
    });

    // File resolver를 storage에 등록
    if (onResolveFile) {
      editor.storage.fileAttachment = {
        ...editor.storage.fileAttachment,
        resolver: onResolveFile,
      };
    }

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleSelectionUpdate);

    // Table overflow fix
    const editorDom = editor.view.dom;
    tableObserver = new MutationObserver(() => {
      const wrapper = editorDom.closest(".hce-editor-wrapper");
      if (!wrapper) return;
      const maxW = wrapper.clientWidth - 32;
      wrapper.querySelectorAll("table").forEach((table) => {
        const cols = table.querySelectorAll("colgroup col");
        if (cols.length < 2) return;
        let total = 0;
        cols.forEach((col) => {
          total += parseInt((col as HTMLElement).style.width || "0", 10);
        });
        if (total > maxW) {
          const lastCol = cols[cols.length - 1] as HTMLElement;
          const lastW = parseInt(lastCol.style.width || "0", 10);
          const newW = lastW - (total - maxW);
          if (newW >= 40) lastCol.style.width = `${newW}px`;
        }
      });
    });
    tableObserver.observe(editorDom, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  });

  // Scroll handler for slash menu position
  $effect(() => {
    if (!slashMenuOpen) return;
    const onScroll = () => updateSlashMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  });

  // Sync content from parent (외부에서 content prop이 변경된 경우만)
  $effect(() => {
    if (!editor) return;
    // 에디터 자체 onChange에서 나온 값이면 무시 (무한 루프 방지)
    if (content === lastEmittedHtml) return;
    const transformed = transformLegacyHtml(content);
    editor.commands.setContent(transformed, { emitUpdate: false });
    lastEmittedHtml = content;
    editor.commands.fixTables();
  });

  onDestroy(() => {
    tableObserver?.disconnect();
    if (editor) {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.destroy();
    }
  });
</script>

<div
	class="hce-editor-wrapper relative{editable && features.has('fixed-toolbar') ? ' border border-border rounded-xl bg-background' : ''}"
	ondragover={(e) => e.preventDefault()}
	ondrop={(e) => { if (!onUploadFile) e.preventDefault(); }}
>
	{#if editor && editable && features.has('fixed-toolbar')}
		<FixedToolbar
			{editor}
			{features}
			onPdfClick={() => pdfInputEl?.click()}
			onFileClick={onUploadFile ? () => fileInputEl?.click() : undefined}
			onVideoClick={onUploadFile ? () => videoInputEl?.click() : undefined}
		/>
	{/if}

	<div bind:this={editorElement}></div>

	{#if editor && editable}
		{#if features.has('bubble-toolbar')}
			<BubbleToolbar {editor} {features} />
		{/if}

		{#if features.has('table-menu')}
			<TableBubbleMenu {editor} />
		{/if}

		{#if features.has('upload-overlay') && uploading}
			<div
				class="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl"
			>
				<p class="text-sm text-muted-foreground animate-pulse">
					업로드 중...
				</p>
			</div>
		{/if}

		{#if features.has('slash-menu') && slashMenuOpen}
			<div
				style="top: {slashMenuPos.top}px; left: {slashMenuPos.left}px"
				class="fixed z-50"
			>
				<SlashCommandMenu
					{editor}
					{features}
					query={slashQuery}
					onClose={closeSlashMenu}
					onPdfUpload={onUploadFile && features.has('pdf')
						? () => pdfInputEl?.click()
						: undefined}
					onFileUpload={onUploadFile && features.has('file')
						? () => fileInputEl?.click()
						: undefined}
					onVideoUpload={onUploadFile && features.has('video')
						? () => videoInputEl?.click()
						: undefined}
				/>
			</div>
		{/if}

		{#if features.has('character-count')}
			<div
				class="flex justify-end px-4 py-2 text-xs text-muted-foreground border-t border-border"
			>
				{editor.storage.characterCount.characters()} 자 ·
				{editor.storage.characterCount.words()} 단어
			</div>
		{/if}

		{#if features.has('pdf') || features.has('file') || features.has('video')}
			<input
				bind:this={pdfInputEl}
				type="file"
				accept="application/pdf"
				class="hidden"
				onchange={(e) => {
					const target = e.target as HTMLInputElement;
					const file = target.files?.[0];
					if (file) uploadPdf(file);
					target.value = "";
				}}
			/>
			<input
				bind:this={fileInputEl}
				type="file"
				class="hidden"
				onchange={(e) => {
					const target = e.target as HTMLInputElement;
					const file = target.files?.[0];
					if (file) uploadFile(file);
					target.value = "";
				}}
			/>
			<input
				bind:this={videoInputEl}
				type="file"
				accept="video/mp4,video/webm,video/quicktime"
				class="hidden"
				onchange={(e) => {
					const target = e.target as HTMLInputElement;
					const file = target.files?.[0];
					if (file) uploadVideo(file);
					target.value = "";
				}}
			/>
		{/if}
	{/if}
</div>
