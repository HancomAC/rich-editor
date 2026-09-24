/**
 * `emojis-list`·`emojis-keywords` 는 타입 선언이 없는 순수 데이터 패키지다
 * (main 은 `@ts-ignore` 로 넘겼다 — strict 에서는 선언을 세우는 쪽이 맞다).
 * 두 배열은 **같은 인덱스가 짝**이다(`emojis[i]` ↔ `keywords[i]`).
 * 길이는 다르다(emojis 3075, keywords 2477) — 키워드 없는 꼬리는 검색에서 자연히 빠진다.
 */
declare module 'emojis-list' {
	const emojis: string[];
	export default emojis;
}

declare module 'emojis-keywords' {
	const keywords: string[];
	export default keywords;
}
