/**
 * 미디어 블록(영상·이미지)의 크기·정렬 속성 정규화.
 *
 * main 정올 `plugin/resize/index.ts` 의 `normalize*` 무리를 필요한 만큼만 떼어 재작성했다.
 * 원칙은 이미지 폭(`ResizableImage`)과 같다 — **파싱은 관대하게, 쓰기는 좁게.**
 * 읽을 때는 `420`·`420px`·`16:9`·`16/9`·`1.78` 을 다 받고, 저장은 언제나 한 가지 꼴이다:
 * 높이는 단위 없는 px 정수, 비율은 `W:H` 문자열, 정렬은 `left|center|right`.
 *
 * ⚠️ **인라인 `style` 로 저장하지 않는 이유**(사고 이력): 살균기가 `img` 의 `style` 을
 * 지워서 정적 렌더와 에디터의 크기가 어긋난다. 크기·정렬은 전부 **속성**으로 간다.
 */

export type MediaAlign = "left" | "center" | "right";

const ALIGN_VALUES: readonly MediaAlign[] = ["left", "center", "right"];

/** `left`·`center`·`right` 만 통과. 대소문자·여백은 눈감아 준다. */
export function normalizeMediaAlign(value: unknown): MediaAlign | null {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toLowerCase();
	return (ALIGN_VALUES as readonly string[]).includes(normalized)
		? (normalized as MediaAlign)
		: null;
}

/**
 * 어떤 꼴로 들어오든 단위 없는 px 정수 높이로 만든다. 못 읽으면 `null`.
 * `%`·`auto` 는 버린다 — 높이를 %로 저장하면 기준이 없어 어디서나 다르게 풀린다.
 */
export function normalizeMediaHeight(value: unknown): number | null {
	if (value == null) return null;
	if (typeof value === "number") {
		return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
	}
	const raw = String(value).trim();
	if (!raw) return null;
	const m = /^(\d+(?:\.\d+)?)(px)?$/i.exec(raw);
	if (!m) return null;
	const n = Number.parseFloat(m[1]);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.round(n);
}

/**
 * 비율을 정준형 `W:H` 문자열로 만든다. `16:9`·`16/9`·`1.78` 을 받고, 숫자 하나면
 * `W:1` 꼴로 세운다. 못 읽으면 `null`.
 */
export function normalizeMediaRatio(value: unknown): string | null {
	if (typeof value === "number") {
		if (!Number.isFinite(value) || value <= 0) return null;
		return `${trimDecimal(value)}:1`;
	}
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const pair = /^([0-9]+(?:\.[0-9]+)?)\s*[:/]\s*([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
	if (pair) {
		const w = Number.parseFloat(pair[1]);
		const h = Number.parseFloat(pair[2]);
		if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
		return `${trimDecimal(w)}:${trimDecimal(h)}`;
	}
	const single = Number.parseFloat(trimmed);
	if (!Number.isFinite(single) || single <= 0) return null;
	return `${trimDecimal(single)}:1`;
}

/** `W:H` → 숫자 비율(W/H). CSS `aspect-ratio` 계산·비교용. */
export function mediaRatioValue(value: unknown): number | null {
	const canonical = normalizeMediaRatio(value);
	if (!canonical) return null;
	const [w, h] = canonical.split(":").map(Number.parseFloat);
	if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return null;
	return w / h;
}

/** `16:9` → `16 / 9` — CSS `aspect-ratio` 값 꼴. */
export function mediaRatioCss(value: unknown): string | null {
	const canonical = normalizeMediaRatio(value);
	if (!canonical) return null;
	return canonical.replace(":", " / ");
}

function trimDecimal(value: number): string {
	return String(Number(value.toFixed(4)));
}
