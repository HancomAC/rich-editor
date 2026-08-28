<script module lang="ts">
  import { Table, TableView } from "@tiptap/extension-table";
  import { TableHeader } from "@tiptap/extension-table-header";
  import { TableCell } from "@tiptap/extension-table-cell";
  import { Extension } from "@tiptap/core";
  import { TextSelection } from "@tiptap/pm/state";
  import { lowlight } from "../utils/lowlight";

  /*
   * 읽기 전용용 표 확장도 **한 벌만** 만든다.
   *
   * 읽기(비편집) 모드에서도 표 가로 스크롤 래퍼(`.tableWrapper`)가 필요하다. 편집 모드는
   * columnResizing 플러그인의 TableView 가 래퍼를 만들어 주지만, 비편집 에디터에는 그
   * 플러그인이 없어 표가 맨 `<table>` 로 렌더돼 카드를 넘친다. 그래서 비편집 인스턴스에만
   * 같은 TableView 를 `addNodeView` 로 달아 준다.
   * (편집 인스턴스에 달면 columnResizing 의 plugin nodeView 를 섀도잉해 리사이즈가 깨진다.)
   *
   * `extend()` 는 확장 클래스를 새로 찍어내는 일이라, 예전처럼 `onMount` 안에 두면 읽기
   * 인스턴스마다 반복된다. 결과물이 인스턴스와 무관하므로 모듈에 한 번만 둔다.
   */
  const ReadOnlyTable = Table.extend({
    addNodeView() {
      return ({ node }: any) => new TableView(node, this.options.cellMinWidth);
    },
  });

  /*
   * 표 셀 속성 확장과 코드블록 키맵도 **모듈에 한 벌**이다.
   *
   * `extend()`·`create()` 는 확장 클래스를 새로 찍어내는 일이고, 결과물은 인스턴스와
   * 무관하다. 인스턴스 스크립트에 두면 에디터를 세울 때마다 같은 클래스를 다시 만든다 —
   * 한 화면에 26~27개가 서는 화면에서는 그 반복이 그대로 비용이다.
   */
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
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
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
  import { TableRow } from "@tiptap/extension-table-row";
  import { DetailsContent } from "@tiptap/extension-details";
  import { FixedDetails } from "../extensions/FixedDetails";
  import {
    NotionBlockquote,
    LeveledDetailsSummary,
    NotionToggleInputRule,
  } from "../extensions/NotionInputRules";
  import FileHandler from "@tiptap/extension-file-handler";
  import type { AnyExtension } from "@tiptap/core";
  import { PdfBlock } from "../extensions/PdfBlock";
  import { Columns } from "../extensions/Columns";
  import { Column } from "../extensions/Column";
  import { transformLegacyHtml } from "../utils/sanitize";
  import { Indent } from "../extensions/Indent";
  import { FileAttachment } from "../extensions/FileAttachment";
  import { MbusVideo } from "../extensions/MbusVideo";
  import { VideoEmbed } from "../extensions/VideoEmbed";
  import { CardBlock } from "../extensions/CardBlock";
  import { MathInline, MathDisplay, type MathPrompt } from "../extensions/Math";
  import FixedToolbar from "./FixedToolbar.svelte";
  import BubbleToolbar from "./BubbleToolbar.svelte";
  import SlashCommandMenu from "./SlashCommandMenu.svelte";
  import TableBubbleMenu from "./TableBubbleMenu.svelte";
  import MathModal from "./MathModal.svelte";
  import MediaPickerModal from "./MediaPickerModal.svelte";
  import InputModal from "./InputModal.svelte";
  import type { UploadHandler, PromptHandler, ToolbarMode, ToolbarFeature } from "../types";
  import { resolveFeatures } from "../types";
  import type { FileResolver } from "../extensions/FileAttachment";

  let {
    content = "",
    onChange,
    placeholder = "'/'를 눌러 명령어를 입력하세요...",
    onUploadFile,
    onResolveFile,
    fileDownloadBaseUrl,
    onPromptLink,
    onPromptImage,
    onPromptMbus,
    onPromptVideo,
    onPromptCardBackground,
    onPromptMath,
    toolbarEnd,
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
    fileDownloadBaseUrl?: string;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /** 영상(유튜브·Vimeo 등) URL 프롬프트. 미제공 시 내장 InputModal 폴백 */
    onPromptVideo?: PromptHandler;
    /** 카드 배경 고르기. 미제공 시 window.prompt 폴백 */
    onPromptCardBackground?: PromptHandler;
    /** LaTeX 수식 편집. 미제공 시 내장 MathModal(실시간 미리보기) 폴백 */
    onPromptMath?: MathPrompt;
    /** 고정 툴바 오른쪽 끝에 끼워 넣을 조각 */
    toolbarEnd?: Snippet;
    extensions?: AnyExtension[];
    editable?: boolean;
    toolbar?: ToolbarMode;
    features?: ToolbarFeature[];
  } = $props();

  const features = $derived(resolveFeatures(toolbar, featuresOverride));

  let editorElement: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();

  /*
   * 글자수는 `editor.storage` 에서 읽는데 그건 `$state` 가 아니라, 그냥 부르면 첫 값에
   * 굳어 **타이핑해도 숫자가 안 바뀐다**(사용자 지적). 트랜잭션마다 카운터를 올리고
   * 그 카운터를 함께 읽어 Svelte 에 의존성을 알린다 — 툴바 활성 표시와 같은 방식이다.
   */
  let editorTick = $state(0);
  const counts = $derived.by(() => {
    editorTick;
    const cc = editor?.storage?.characterCount;
    return { chars: cc?.characters?.() ?? 0, words: cc?.words?.() ?? 0 };
  });
  /*
   * 수식 프롬프트 다리.
   *
   * 확장(vanilla NodeView·입력 규칙)은 Svelte 를 모르므로 **약속된 함수 하나**만 받는다.
   * 그 함수가 여기서 `MathModal` 을 띄우고 사용자가 확인/취소할 때 resolve 한다.
   * 링크·이미지가 `InputModal` 로 하는 것과 같은 구조인데, 저쪽은 툴바가 열고 이쪽은
   * 본문 클릭·입력 규칙·슬래시가 열기 때문에 상태를 에디터 최상단에 둬야 한다.
   *
   * ⚠️ 이 함수는 확장을 만들 때 한 번만 캡처된다. 그래서 `onPromptMath` 를 직접 넘기지 않고
   *    호출 시점에 읽는다 — 호스트가 나중에 핸들러를 붙여도 따라간다.
   */
  let mathPrompt = $state<{
    latex: string;
    displayMode: boolean;
    resolve: (value: string | null) => void;
  } | null>(null);

  const promptMath: MathPrompt = (latex, displayMode) => {
    if (onPromptMath) return onPromptMath(latex, displayMode);
    return new Promise<string | null>((resolve) => {
      mathPrompt = { latex, displayMode, resolve };
    });
  };

  function closeMathPrompt(value: string | null) {
    const pending = mathPrompt;
    mathPrompt = null;
    pending?.resolve(value);
  }

  let uploading = $state(false);
  let pdfInputEl: HTMLInputElement | undefined = $state();
  let fileInputEl: HTMLInputElement | undefined = $state();

  /*
   * ── 이미지·파일 고르기 모달 ──────────────────────────────────────────────
   * **에디터가 갖는다.** 툴바에서도 슬래시 메뉴에서도 같은 것이 열려야 하고, 실제로 넣는 데
   * 필요한 것(`onUploadFile`, 노드 만드는 법)이 전부 여기 있기 때문이다. 툴바에 두면
   * 슬래시 메뉴가 자기 것을 또 만들어야 한다.
   *
   * ⚠️ **업로드 함수를 준 호스트에게만 연다.** 못 올리는 곳에서 `업로드` 탭을 보여 주면
   * 눌러도 아무 일이 없다. 그런 곳은 예전처럼 URL 입력만 받는다(아래 `pickImage`).
   */
  let mediaPicker = $state<"image" | "file" | null>(null);

  /** URL 에서 파일 이름을 뽑는다. 링크로 첨부할 때 표시할 이름이 필요하다. */
  function fileNameFromUrl(raw: string): string {
    try {
      const path = new URL(raw, "http://x").pathname;
      const last = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      return last || "파일";
    } catch {
      return "파일";
    }
  }

  function pickImage() {
    if (onUploadFile) {
      mediaPicker = "image";
      return;
    }
    // 못 올리는 호스트 — 예전 경로(호스트 프롬프트 → 없으면 내장 입력창) 그대로.
    if (onPromptImage) {
      onPromptImage("").then((url) => {
        if (url) editor?.chain().focus().setImage({ src: url }).run();
      });
      return;
    }
    imageUrlPrompt = true;
  }

  function pickFile() {
    if (!onUploadFile) return;
    mediaPicker = "file";
  }

  /** 업로드 없이 URL 만 받던 시절의 내장 입력창. 위 폴백에서만 쓴다. */
  let imageUrlPrompt = $state(false);

  /*
   * 모달이 돌려주는 네 가지 결말. 모달을 닫는 것도 여기서 한다 —
   * 모달은 "무엇을 골랐는지"만 알리고 그 뒤는 모른다.
   *
   * ⚠️ 업로드는 **실패해도 모달을 닫는다.** 열어 둔 채로 두면 `업로드 중...` 오버레이가
   * 모달 뒤에 깔려 무슨 일이 일어나는지 안 보인다. 실패는 아래 `catch` 가 알린다.
   */
  function insertImageFile(file: File) {
    mediaPicker = null;
    if (!editor || !onUploadFile) return;
    uploading = true;
    onUploadFile(file)
      .then((url) => {
        editor!.chain().focus().setImage({ src: url }).run();
      })
      .catch(() => {
        alert("이미지 업로드에 실패했습니다.");
      })
      .finally(() => {
        uploading = false;
      });
  }

  function insertImageUrl(url: string) {
    mediaPicker = null;
    editor?.chain().focus().setImage({ src: url }).run();
  }

  function insertFileUpload(file: File) {
    mediaPicker = null;
    uploadFile(file);
  }

  function insertFileUrl(url: string) {
    mediaPicker = null;
    editor
      ?.chain()
      .focus()
      .setFileAttachment({ src: url, name: fileNameFromUrl(url) })
      .run();
  }
  let lastEmittedHtml = content;  // onChange로 내보낸 마지막 HTML (외부→내부 변경만 감지용)
  let tableObserver: MutationObserver | undefined;

  // Slash command state
  let slashMenuOpen = $state(false);
  let slashMenuPos = $state({ top: 0, left: 0 });
  let slashQuery = $state("");
  let slashStartPos: number | null = null;
  const MENU_HEIGHT = 320;

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

  // Slash command handlers (component-level for cleanup access)
  function handleUpdate() {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    const resolvedPos = state.doc.resolve(from);
    // 코드블록/inline code 안에서는 슬래시 메뉴를 띄우지 않는다.
    // C++ 주석(`//`)·파이썬 path 등 코드의 정상 문자가 슬래시 트리거가 되는 걸 방지.
    const parentType = resolvedPos.parent?.type?.name;
    if (parentType === "codeBlock") {
      if (slashMenuOpen) {
        slashMenuOpen = false;
        slashStartPos = null;
        slashQuery = "";
      }
      return;
    }
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

    // 읽기 전용 표 확장의 경위는 모듈 블록의 `ReadOnlyTable` 주석 참고.
    const TableExt = editable ? Table : ReadOnlyTable;

    editor = new Editor({
      element: editorElement,
      extensions: [
        /*
         * `link`·`underline` 을 끄는 것은 **v3 이전의 뒷정리**다.
         *
         * ⚠️ StarterKit v2 에는 이 둘이 없어서 아래에 `Link`·`Underline` 을 따로 달았다.
         * v3(3.22.x)부터 StarterKit 이 그것을 품으면서 같은 이름이 두 번 등록되고
         * `Duplicate extension names found: ['link', 'underline']` 경고가 뜬다.
         *
         * 지금은 나중에 등록한 아래 `Link.configure` 가 이긴다 — 실측으로 `target=_blank`
         * 와 `rel=noopener noreferrer` 가 붙는 것을 확인했다. 하지만 **그 우선순위는 계약이
         * 아니다.** TipTap 의 해결 순서가 바뀌면 `openOnClick: false` 와 rel/target 이
         * 조용히 빠진다. 읽기 전용 인스턴스가 한 화면에 26~27 개 서는 곳도 있어서(아래
         * 안내문 주석 참고) 중복 등록과 경고가 그만큼 쌓인다.
         *
         * `codeBlock: false` 와 같은 꼴 — **StarterKit 에서는 끄고 자기 것을 단다** — 로 맞춘다.
         */
        /*
         * `blockquote: false` 인 이유는 위 셋과 같다 — **끄고 자기 것을 단다.**
         * StarterKit 의 인용문은 `> ` 로 만들어지는데, 노션에 맞춰 `> ` 는 토글에 내주고
         * 인용문은 `" ` 로 옮겼다(`NotionBlockquote`). 입력 규칙은 `configure` 로 바꿀 수
         * 없어서 확장을 갈아 끼우는 것 말고는 방법이 없다.
         *
         * ⚠️ 두 규칙이 같은 `> ` 를 노리게 두면 안 된다. 어느 쪽이 이길지는 확장 등록
         * 순서에 달리게 되어, 같은 키를 쳤는데 인용문이 나올 때와 토글이 나올 때가 갈린다.
         */
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
          blockquote: false,
          link: false,
          underline: false,
        }),
        NotionBlockquote,
        ...(extraExtensions.some((ext) => (ext as any).name === 'codeBlock')
          ? []
          : [CodeBlockLowlight.configure({
              lowlight,
              defaultLanguage: "cpp",
            })]),
        /*
         * 안내문은 **쓸 수 있을 때만** 단다. `showOnlyWhenEditable` 로 이미 화면에는 안
         * 나왔지만, 확장 자체는 그대로 실려 문서가 바뀔 때마다 도는 데코레이션 플러그인을
         * 하나 더 얹고 있었다. 읽기 전용 인스턴스가 한 화면에 26~27개 서는 곳(정올 기출
         * 퀴즈)에서는 그런 "화면엔 안 보이지만 실려는 있는" 것들이 그대로 비용이 된다.
         */
        ...(editable
          ? [
              Placeholder.configure({
                placeholder: ({ node }) => {
                  // 코드블록·인용·목록 등 컨테이너/의미 있는 노드에는 placeholder 안 띄움
                  if (node.type.name === "codeBlock") return "";
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
            ]
          : []),
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
        /*
         * 둘 다 스키마에 관여하지 않으므로, 필요 없을 때 빼도 **렌더 결과가 같다**
         * (노드·마크 확장은 빼면 결과가 달라지니 그대로 둔다).
         *
         * `Typography` 는 입력 규칙(`--` → `—`)이라 치는 동안에만 쓸모가 있다.
         * `CharacterCount` 는 **`editable` 이 아니라 기능 스위치를 따른다** — 글자 수 칸은
         * `features.has('character-count')` 로 그려지므로, 읽기 전용이면서 그 칸을 켠 호스트가
         * 있으면 확장을 빼는 순간 0 자로 굳는다.
         */
        ...(editable ? [Typography] : []),
        ...(editable || features.has("character-count") ? [CharacterCount] : []),
        TableExt.configure({ resizable: true, allowTableNodeSelection: true }),
        TableRow,
        CustomTableHeader,
        CustomTableCell,
        PdfBlock,
        FileAttachment.configure({
          resolver: onResolveFile ?? null,
          ...(fileDownloadBaseUrl ? { downloadBaseUrl: fileDownloadBaseUrl } : {}),
        }),
        MbusVideo,
        VideoEmbed,
        CardBlock.configure({ promptBackground: onPromptCardBackground ?? null }),
        /*
         * ⚠️ **수학은 여기서 등록한다.** 예전엔 `MathInline`/`MathDisplay` 를 내보내기만 하고
         * 등록은 호스트에 맡겼는데, 그러면 앱마다 기억해서 `extensions` 로 넘겨야 한다 —
         * 정올이 실제로 빠뜨려서 `\le` 같은 수식이 문제 본문에 **원문 그대로** 떴다.
         * 두 앱 다 필요한 것이면 패키지가 갖고 있는 게 맞다.
         *
         * 호스트가 이미 넘겼으면 비켜선다(같은 이름 확장을 두 번 등록하면 TipTap 이 죽는다).
         * `codeBlock` 이 쓰는 방식과 같다.
         */
        ...(extraExtensions.some((ext) => (ext as any).name === "math_inline")
          ? []
          : [MathInline.configure({ promptMath })]),
        ...(extraExtensions.some((ext) => (ext as any).name === "math_display")
          ? []
          : [MathDisplay.configure({ promptMath })]),
        Columns,
        Column,
        CodeBlockTopEscape,
        Indent,
        FixedDetails,
        DetailsContent,
        /* 토글 제목(`# > `)을 위해 `level` 을 붙인 판본. 옛 문서는 level 0 으로 읽힌다. */
        LeveledDetailsSummary,
        NotionToggleInputRule,
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
      // 저장된 HTML의 블록 선두 일반 공백(U+0020)이 재파싱 시 collapse되지 않도록 보존.
      // true = 공백 보존, 블록 사이 개행은 여전히 collapse (선두 공백 버그 표적 수정).
      parseOptions: { preserveWhitespace: true },
      editable,
      onUpdate: ({ editor: e }) => {
        // 빈 paragraph는 <p></p>로 저장 (ProseMirror가 편집기 DOM에 넣는 trailing <br>는 출력에서 제거).
        const html = e
          .getHTML()
          .replace(/<p><br\s*\/?><\/p>/g, "<p></p>")
          .replace(/(<p><\/p>\s*)+$/, "");
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
      /*
       * ⚠️ 예전엔 여기서 `editor = editor` 로 Svelte 를 밀었다. 그건 Svelte 4 관용구고
       * rune 에서는 **같은 참조 재대입이라 아무 일도 일어나지 않는다** — 툴바 활성 표시가
       * 영영 갱신되지 않았다. 툴바는 이제 `transaction` 을 직접 구독하고, 이 컴포넌트가
       * 그리는 글자수는 아래 카운터로 다시 읽는다.
       */
      onTransaction: () => {
        editorTick++;
      },
    });

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
    editor.commands.setContent(transformed, {
      emitUpdate: false,
      // 외부 sync 경로에서도 블록 선두 공백 보존 (편집 재로드 경로와 동일하게)
      parseOptions: { preserveWhitespace: true }
    });
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
			{onPromptLink}
			{onPromptMbus}
			{onPromptVideo}
			{toolbarEnd}
			onPdfClick={() => pdfInputEl?.click()}
			onImageClick={pickImage}
			onFileClick={onUploadFile ? pickFile : undefined}
		/>
	{/if}

	<!--
		본문이 들어가는 자리. **이름을 준다** — 호스트가 상자 높이를 정해 놓고 이 안을
		채우게 하려면 이 요소를 지목할 수 있어야 한다. 이름이 없으면 남는 높이가 아무에게도
		배분되지 않아 글자수 표시가 상자 중간에 떠 버린다.
	-->
	<div class="hce-editor-body" bind:this={editorElement}></div>

	{#if editor && editable}
		{#if features.has('bubble-toolbar')}
			<BubbleToolbar {editor} {features} {onPromptLink} />
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
					{onPromptLink}
					{onPromptMbus}
					{onPromptVideo}
					query={slashQuery}
					onClose={closeSlashMenu}
					onImagePick={pickImage}
					onPdfUpload={onUploadFile && features.has('pdf')
						? () => pdfInputEl?.click()
						: undefined}
					onFileUpload={onUploadFile && features.has('file')
						? pickFile
						: undefined}
				/>
			</div>
		{/if}

		<!--
			수식 프롬프트. `onPromptMath` 를 준 호스트에겐 열리지 않는다(그쪽이 직접 띄운다).
			`features` 로 막지 않는다 — `$…$` 입력 규칙과 붙여넣기 변환은 feature 와 무관하게
			항상 살아 있어서, 그렇게 만든 수식을 고치려면 이 모달이 필요하다.
		-->
		<!--
			이미지·파일 고르기. 둘이 **같은 모달**을 쓰고 문구만 다르다
			(`MediaPickerModal` 주석 참고).
		-->
		{#if mediaPicker === 'image'}
			<MediaPickerModal
				title="이미지 추가"
				accept="image/*"
				uploadLabel="파일 업로드"
				linkPlaceholder="이미지 링크 붙여넣기"
				linkConfirmLabel="이미지 임베드"
				linkHint="웹에 있는 모든 이미지와 호환됨"
				onUpload={insertImageFile}
				onLink={insertImageUrl}
				onCancel={() => (mediaPicker = null)}
			/>
		{/if}
		{#if mediaPicker === 'file'}
			<MediaPickerModal
				title="파일 추가"
				uploadLabel="파일을 선택하세요"
				linkPlaceholder="파일 링크 붙여넣기"
				linkConfirmLabel="파일 임베드"
				onUpload={insertFileUpload}
				onLink={insertFileUrl}
				onCancel={() => (mediaPicker = null)}
			/>
		{/if}

		<!-- 업로드를 못 하는 호스트용 폴백(URL 만 받는다). 위 `pickImage` 참고. -->
		{#if imageUrlPrompt}
			<InputModal
				title="이미지 URL 입력"
				placeholder="https://example.com/image.png"
				onConfirm={(url) => {
					imageUrlPrompt = false;
					editor?.chain().focus().setImage({ src: url }).run();
				}}
				onCancel={() => (imageUrlPrompt = false)}
			/>
		{/if}

		{#if mathPrompt}
			<MathModal
				latex={mathPrompt.latex}
				displayMode={mathPrompt.displayMode}
				onConfirm={(value) => closeMathPrompt(value)}
				onCancel={() => closeMathPrompt(null)}
			/>
		{/if}

		{#if features.has('character-count')}
			<div
				class="flex justify-end px-4 py-2 text-xs text-muted-foreground border-t border-border"
			>
				{counts.chars} 자 · {counts.words} 단어
			</div>
		{/if}

		{#if features.has('pdf') || features.has('file')}
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
		{/if}
	{/if}
</div>
