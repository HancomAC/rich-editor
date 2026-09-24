import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Slice, Fragment } from "@tiptap/pm/model";
import { toEmbedUrl, youTubeEmbedUrl, VideoEmbed } from "./VideoEmbed";

/*
 * 이 변환이 이 확장의 전부다. 틀리면 유튜브가 `X-Frame-Options` 로 거부해 **빈 칸**만
 * 남고, 화면에는 아무 단서도 안 나온다. 그래서 사람들이 실제로 붙여넣는 꼴을 모아 둔다.
 */
describe("toEmbedUrl", () => {
	it("watch?v= 주소를 임베드 주소로 바꾼다", () => {
		expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ"
		);
	});

	it("youtu.be 단축 주소도 받는다", () => {
		expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ"
		);
	});

	it("shorts·live 도 같은 임베드 주소가 된다", () => {
		expect(toEmbedUrl("https://www.youtube.com/shorts/abc12345678")).toBe(
			"https://www.youtube.com/embed/abc12345678"
		);
		expect(toEmbedUrl("https://www.youtube.com/live/abc12345678")).toBe(
			"https://www.youtube.com/embed/abc12345678"
		);
	});

	it("모바일·뮤직·nocookie 호스트도 알아본다", () => {
		expect(toEmbedUrl("https://m.youtube.com/watch?v=abc12345678")).toBe(
			"https://www.youtube.com/embed/abc12345678"
		);
		expect(toEmbedUrl("https://music.youtube.com/watch?v=abc12345678")).toBe(
			"https://www.youtube.com/embed/abc12345678"
		);
	});

	it("타임스탬프를 start 초로 옮긴다", () => {
		expect(toEmbedUrl("https://youtu.be/abc12345678?t=90")).toBe(
			"https://www.youtube.com/embed/abc12345678?start=90"
		);
		// `1m30s` 꼴도 같은 90초여야 한다
		expect(toEmbedUrl("https://www.youtube.com/watch?v=abc12345678&t=1m30s")).toBe(
			"https://www.youtube.com/embed/abc12345678?start=90"
		);
		expect(toEmbedUrl("https://youtu.be/abc12345678?t=1h2m3s")).toBe(
			"https://www.youtube.com/embed/abc12345678?start=3723"
		);
	});

	it("재생목록은 유지한다", () => {
		expect(
			toEmbedUrl("https://www.youtube.com/watch?v=abc12345678&list=PL123")
		).toBe("https://www.youtube.com/embed/abc12345678?list=PL123");
	});

	it("이미 임베드 주소면 그대로 둔다", () => {
		expect(toEmbedUrl("https://www.youtube.com/embed/abc12345678")).toBe(
			"https://www.youtube.com/embed/abc12345678"
		);
	});

	it("Vimeo 를 플레이어 주소로 바꾼다", () => {
		expect(toEmbedUrl("https://vimeo.com/123456789")).toBe(
			"https://player.vimeo.com/video/123456789"
		);
		expect(toEmbedUrl("https://vimeo.com/channels/staffpicks/123456789")).toBe(
			"https://player.vimeo.com/video/123456789"
		);
		// 이미 플레이어 주소면 손대지 않는다
		expect(toEmbedUrl("https://player.vimeo.com/video/123456789")).toBe(
			"https://player.vimeo.com/video/123456789"
		);
	});

	/*
	 * ⚠️ **모르는 주소는 손대지 않는다.** mbus 처럼 그 자체가 플레이어인 주소나 사내
	 * 플레이어를 쓰는 경우를 막지 않기 위해서다.
	 */
	it("아는 서비스가 아니면 그대로 돌려준다", () => {
		const mbus = "https://play.mbus.tv/v1/hls/abc?label=x&start=&volume=50";
		expect(toEmbedUrl(mbus)).toBe(mbus);
	});

	it("주소로 파싱되지 않는 입력도 떨어뜨리지 않는다", () => {
		expect(toEmbedUrl("그냥 글자")).toBe("그냥 글자");
		expect(toEmbedUrl("  ")).toBe("");
	});

	it("id 를 못 뽑으면 원본을 지킨다", () => {
		// `v` 가 없는 watch 주소 — 임의로 잘라내면 엉뚱한 곳을 가리키게 된다
		const weird = "https://www.youtube.com/watch?foo=bar";
		expect(toEmbedUrl(weird)).toBe(weird);
	});
});

describe("youTubeEmbedUrl", () => {
	it("유튜브 주소는 임베드 주소를 돌려준다", () => {
		expect(youTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ"
		);
		// 이미 임베드 꼴이어도 유튜브로 알아본다 — "변환됐는가" 어림이 안 되는 이유
		expect(youTubeEmbedUrl("https://www.youtube.com/embed/abc12345678")).toBe(
			"https://www.youtube.com/embed/abc12345678"
		);
	});

	it("유튜브가 아니면 null — vimeo·일반 링크는 자동 임베드 대상이 아니다", () => {
		expect(youTubeEmbedUrl("https://vimeo.com/123456789")).toBeNull();
		expect(youTubeEmbedUrl("https://example.com/watch?v=abc12345678")).toBeNull();
		expect(youTubeEmbedUrl("그냥 텍스트")).toBeNull();
		expect(youTubeEmbedUrl("")).toBeNull();
	});
});

describe("유튜브 주소 붙여넣기 → 즉시 임베드", () => {
	let editor: Editor;

	function createEditor(content = "<p></p>") {
		editor = new Editor({
			element: document.createElement("div"),
			extensions: [StarterKit, VideoEmbed],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	/** 슬라이스 하나를 실제 플러그인 사슬(someProp)로 붙여넣는다. */
	function paste(fragment: Fragment): boolean {
		const slice = new Slice(fragment, 0, 0);
		return (
			editor.view.someProp("handlePaste", (f) =>
				f(editor.view, new Event("paste") as ClipboardEvent, slice)
			) ?? false
		);
	}

	function pasteText(text: string): boolean {
		return paste(Fragment.from(editor.state.schema.text(text)));
	}

	function embeddedSrc(): string | null {
		let src: string | null = null;
		editor.state.doc.descendants((node) => {
			if (node.type.name === "videoEmbed") src = node.attrs.src as string;
			return src === null;
		});
		return src;
	}

	it("빈 문단에 유튜브 주소를 붙여넣으면 임베드가 된다", () => {
		createEditor();
		expect(pasteText("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
		expect(embeddedSrc()).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
	});

	it("유튜브가 아닌 주소는 건드리지 않는다", () => {
		createEditor();
		expect(pasteText("https://example.com/page")).toBe(false);
		expect(pasteText("https://vimeo.com/123456789")).toBe(false);
		expect(embeddedSrc()).toBeNull();
	});

	it("내용이 있는 문단에서는 끼어들지 않는다", () => {
		createEditor("<p>메모 </p>");
		// 초기 커서는 문단 안 — 내용이 있으므로 자동 임베드가 아니라 일반 붙여넣기로 가야 한다
		expect(pasteText("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
		expect(embeddedSrc()).toBeNull();
	});

	it("링크 마크의 href 에서도 유튜브를 찾는다", () => {
		createEditor();
		const { schema } = editor.state;
		const linked = schema.text("영상 보기", [
			schema.marks.link.create({ href: "https://youtu.be/dQw4w9WgXcQ" })
		]);
		expect(paste(Fragment.from(linked))).toBe(true);
		expect(embeddedSrc()).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
	});

	it("여러 블록이 담긴 붙여넣기는 대상이 아니다", () => {
		createEditor();
		const { schema } = editor.state;
		const frag = Fragment.fromArray([
			schema.nodes.paragraph.create(null, schema.text("설명")),
			schema.nodes.paragraph.create(null, schema.text("https://youtu.be/dQw4w9WgXcQ"))
		]);
		expect(paste(frag)).toBe(false);
		expect(embeddedSrc()).toBeNull();
	});
});

/*
 * 살균기의 URL 검사는 `href`·`src` 만 보므로, `data-video-src` 의 스킴은 여기(확장)가
 * 마지막 관문이다. 새로 만드는 경로는 전부 임베드 변환기를 거쳐 안전하지만 저장본은
 * 출처를 믿을 수 없다.
 */
describe("data-video-src 스킴 관문", () => {
	let editor: Editor;

	function createEditor(content: string) {
		editor = new Editor({
			element: document.createElement("div"),
			extensions: [StarterKit, VideoEmbed],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	function embeddedCount(): number {
		let n = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === "videoEmbed") n += 1;
			return true;
		});
		return n;
	}

	it("javascript: 스킴 저장본은 영상 노드로 받지 않는다", () => {
		createEditor('<div data-video-src="javascript:alert(1)"></div>');
		expect(embeddedCount()).toBe(0);
		expect(editor.view.dom.querySelector("iframe")).toBeNull();
	});

	it("https 저장본은 그대로 통과한다", () => {
		createEditor('<div data-video-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>');
		expect(embeddedCount()).toBe(1);
	});

	it("parseHTML 을 안 거친 노드(JSON 삽입)도 iframe 을 만들지 않는다", () => {
		createEditor("<p></p>");
		editor.commands.insertContent({
			type: "videoEmbed",
			attrs: { src: "javascript:alert(1)" }
		});
		// 노드는 서 있어도 노드뷰의 이중 관문이 iframe 을 막는다
		expect(editor.view.dom.querySelector("iframe")).toBeNull();
	});
});
