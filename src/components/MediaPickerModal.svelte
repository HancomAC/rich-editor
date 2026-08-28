<script lang="ts">
  /**
   * 이미지·파일을 넣는 **한 개의 모달**. 탭 두 개(업로드 / 링크)를 갖는다.
   *
   * 예전에는 두 길이 완전히 갈려 있었다 — 툴바의 `이미지` 는 URL 입력창만 띄웠고
   * (그래서 내 컴퓨터의 그림을 넣을 수 없었다), `파일 첨부` 는 곧장 파일 선택창을 열었다
   * (그래서 이미 올라가 있는 파일의 주소로는 넣을 수 없었다). 넣으려는 것이 같은데
   * 어느 버튼을 눌렀느냐로 할 수 있는 일이 갈렸다(사용자 요청으로 통합).
   *
   * 이 컴포넌트는 **고르기만** 한다. 실제로 문서에 꽂는 일은 부모(`TipTapEditor`)가 한다 —
   * 업로드 함수도, 노드를 만드는 방법도 거기 있기 때문이다.
   */
  import { X } from "lucide-svelte";

  let {
    title,
    accept,
    uploadLabel,
    linkPlaceholder,
    linkConfirmLabel,
    linkHint,
    onUpload,
    onLink,
    onCancel,
  }: {
    title: string;
    /** 파일 선택창에서 거를 확장자. 파일 첨부처럼 아무거나 받는 곳은 비운다. */
    accept?: string;
    uploadLabel: string;
    linkPlaceholder: string;
    linkConfirmLabel: string;
    /** 링크 탭 아래 작은 안내문. 없으면 안 그린다. */
    linkHint?: string;
    /** 고른 파일을 부모가 올리고 문서에 꽂는다. 끝나면 모달을 닫는 것도 부모 몫. */
    onUpload: (file: File) => void;
    onLink: (url: string) => void;
    onCancel: () => void;
  } = $props();

  let tab: "upload" | "link" = $state("upload");
  let url = $state("");
  let fileInputEl: HTMLInputElement | undefined = $state();
  let urlInputEl: HTMLInputElement | undefined = $state();

  /* 링크 탭으로 옮기면 바로 붙여넣을 수 있게 커서를 넣어 준다. */
  $effect(() => {
    if (tab === "link") urlInputEl?.focus();
  });

  $effect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  function submitLink() {
    const trimmed = url.trim();
    if (trimmed) onLink(trimmed);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  onclick={onCancel}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="hce-picker-panel bg-background border border-border rounded-xl shadow-xl w-[420px] max-w-[90vw]"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between px-4 pt-3">
      <span class="text-sm font-semibold">{title}</span>
      <button
        type="button"
        class="p-1 rounded-md hover:bg-muted text-muted-foreground"
        onclick={onCancel}
        aria-label="닫기"
      >
        <X size={14} />
      </button>
    </div>

    <!--
      탭 줄. 고른 탭에 **밑줄**을 그어 표시한다 — 알약 버튼으로 하면 그 아래 내용과
      경계가 겹쳐 보여서, 눌린 것인지 내용의 일부인지 헷갈린다.
    -->
    <div class="hce-picker-tabs flex gap-1 px-3 pt-2 border-b border-border" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "upload"}
        class="hce-picker-tab px-2.5 py-1.5 text-sm transition-colors"
        class:hce-picker-tab-on={tab === "upload"}
        onclick={() => (tab = "upload")}
      >
        업로드
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "link"}
        class="hce-picker-tab px-2.5 py-1.5 text-sm transition-colors"
        class:hce-picker-tab-on={tab === "link"}
        onclick={() => (tab = "link")}
      >
        링크
      </button>
    </div>

    <div class="p-4">
      {#if tab === "upload"}
        <!--
          ⚠️ **강조 버튼이다.** 테두리만 두른 판은 다크에서 배경과 거의 같아 보여
          "누르는 것"으로 읽히지 않았다(사용자 지적: 버튼 같지가 않다).
          링크 탭의 `임베드` 와 **같은 위계** — 둘 다 그 탭에서 할 일이 하나뿐이다.
        -->
        <button
          type="button"
          class="w-full rounded-md px-3 py-2.5 text-sm hce-btn-primary hover:opacity-90 transition-opacity"
          onclick={() => fileInputEl?.click()}
        >
          {uploadLabel}
        </button>
        <input
          bind:this={fileInputEl}
          type="file"
          {accept}
          class="hidden"
          onchange={(e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            target.value = "";
            if (file) onUpload(file);
          }}
        />
      {:else}
        <input
          bind:this={urlInputEl}
          type="text"
          class="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          placeholder={linkPlaceholder}
          bind:value={url}
          onkeydown={(e) => {
            if (e.key === "Enter") submitLink();
          }}
        />
        <button
          type="button"
          class="w-full mt-3 px-3.5 py-2 text-sm rounded-md hce-btn-primary hover:opacity-90 transition-opacity"
          onclick={submitLink}
        >
          {linkConfirmLabel}
        </button>
        {#if linkHint}
          <p class="mt-2 text-center text-xs text-muted-foreground">{linkHint}</p>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
	/*
	 * `w-full` 은 `width: 100%` 일 뿐이라 `box-sizing` 이 `content-box` 면 좌우 패딩·테두리가
	 * 그대로 더해져 입력창이 판 밖으로 나간다. 이 패키지는 Tailwind preflight 를 끄고
	 * 배포하고 소비 앱에도 전역 리셋이 없다 — 수식 모달에서 실제로 터진 적이 있다.
	 */
	.hce-picker-panel,
	.hce-picker-panel input,
	.hce-picker-panel button {
		box-sizing: border-box;
	}

	/*
	 * 고르지 않은 탭은 흐리게, 고른 탭은 본문색 + 밑줄.
	 * ⚠️ 밑줄은 `border-bottom` 으로 그리고 **꺼진 탭에도 투명한 같은 두께**를 준다.
	 * 켜질 때만 테두리를 붙이면 그 2px 만큼 글자가 위로 밀려 탭이 덜컥거린다.
	 */
	.hce-picker-tab {
		background: transparent;
		border: 0;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		color: var(--muted-foreground);
		cursor: pointer;
		font: inherit;
	}

	.hce-picker-tab:hover {
		color: var(--foreground);
	}

	.hce-picker-tab-on {
		color: var(--foreground);
		border-bottom-color: var(--foreground);
		font-weight: 600;
	}
</style>
