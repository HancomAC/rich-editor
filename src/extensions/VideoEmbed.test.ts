import { describe, it, expect } from "vitest";
import { toEmbedUrl } from "./VideoEmbed";

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
