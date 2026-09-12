import { describe, it, expect, afterEach } from 'vitest';
import { Editor, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
	createTranslator,
	defaultTranslator,
	getEditorTranslator,
	EditorI18n,
	ko,
	en,
	ja,
	es,
	zhHans,
	zhHant
} from './index';
import { TabsBlock, Tab } from '../extensions/TabsBlock';

describe('createTranslator — 기본(미주입) = ko', () => {
	it('로케일 없이 만들면 기존 하드코딩 문자열과 동일한 ko 를 돌려준다', () => {
		const t = createTranslator();
		expect(t('placeholder')).toBe("'/'를 눌러 명령어를 입력하세요...");
		expect(t('bold')).toBe('굵게');
		expect(t('tabAdd')).toBe('탭 추가');
		expect(t('pdfLoading')).toBe('PDF 로딩 중...');
		expect(t('imageUploadFailed')).toBe('이미지 업로드에 실패했습니다.');
	});

	it('defaultTranslator 도 같은 ko 값이다', () => {
		expect(defaultTranslator('cancel')).toBe('취소');
		expect(defaultTranslator('noResult')).toBe('결과 없음');
	});

	it('null·undefined·빈 문자열 입력도 전부 ko 다', () => {
		expect(createTranslator(null)('confirm')).toBe('확인');
		expect(createTranslator(undefined)('confirm')).toBe('확인');
		expect(createTranslator('')('confirm')).toBe('확인');
	});

	// i18n 이전부터 영어로 노출되던 문자열은 ko 에서도 그대로다 (픽셀 단위 하위호환)
	it('원래 영어였던 문자열은 ko 에서도 원문 그대로다', () => {
		const t = createTranslator();
		expect(t('fileSizeLoading')).toBe('loading...');
		expect(t('detailsExpand')).toBe('Expand details content');
	});
});

describe('createTranslator — 로케일 전환', () => {
	it('로케일 코드로 라벨이 바뀐다', () => {
		expect(createTranslator('en')('bold')).toBe('Bold');
		expect(createTranslator('ja')('bold')).toBe('太字');
		expect(createTranslator('es')('bold')).toBe('Negrita');
		expect(createTranslator('zh-hans')('bold')).toBe('加粗');
		expect(createTranslator('zh-hant')('bold')).toBe('粗體');
	});

	it('지역 변형·표기 변형을 정규화한다', () => {
		expect(createTranslator('en-US')('cancel')).toBe('Cancel');
		expect(createTranslator('en-GB')('cancel')).toBe('Cancel');
		expect(createTranslator('ko-KR')('cancel')).toBe('취소');
		expect(createTranslator('ko_KR')('cancel')).toBe('취소');
		expect(createTranslator('ja-JP')('cancel')).toBe('キャンセル');
		expect(createTranslator('es-419')('cancel')).toBe('Cancelar');
	});

	it('중국어는 문자 체계로 이분한다 (TW·HK·MO·Hant → 번체)', () => {
		expect(createTranslator('zh')('table')).toBe('表格');
		expect(createTranslator('zh-CN')('close')).toBe('关闭');
		expect(createTranslator('zh-TW')('close')).toBe('關閉');
		expect(createTranslator('zh-HK')('close')).toBe('關閉');
		expect(createTranslator('zh-Hant')('close')).toBe('關閉');
		expect(createTranslator('zh-Hans')('close')).toBe('关闭');
	});

	it('해석할 수 없는 로케일은 ko 로 떨어진다 (하위호환 폴백)', () => {
		expect(createTranslator('fr')('bold')).toBe('굵게');
		expect(createTranslator('xx-YY')('bold')).toBe('굵게');
	});
});

describe('createTranslator — 오버라이드·미정의 키 폴백', () => {
	it('부분 오버라이드 객체는 준 키만 바꾸고 나머지는 ko 폴백', () => {
		const t = createTranslator({ bold: 'Fett' });
		expect(t('bold')).toBe('Fett');
		expect(t('italic')).toBe('기울임'); // 미정의 키 → ko
	});

	it('사전에 아예 없는 키는 키 이름 그대로 돌려준다 (조용히 죽지 않는다)', () => {
		const t = createTranslator('en');
		// 타입을 우회해 런타임 방어를 확인한다
		expect((t as (k: string) => string)('noSuchKey')).toBe('noSuchKey');
	});
});

describe('보간 — {name} 자리 채움', () => {
	it('params 로 자리를 채운다', () => {
		const t = createTranslator();
		expect(t('tabDefaultTitle', { n: 3 })).toBe('탭 3');
		expect(t('toggleHeading', { level: 2 })).toBe('토글 제목 2');
		expect(t('legacyNotice', { kind: '임베드' })).toBe('임베드 (옛 형식 · 편집 불가)');
		expect(t('characterCount', { chars: 10, words: 2 })).toBe('10 자 · 2 단어');
	});

	it('영어에서는 어순까지 바뀐다', () => {
		const t = createTranslator('en');
		expect(t('tabDelete', { title: 'Tab 1' })).toBe('Delete Tab 1');
	});

	it('params 가 없거나 이름이 빠지면 자리를 그대로 둔다', () => {
		const t = createTranslator();
		expect(t('tabDefaultTitle')).toBe('탭 {n}');
		expect(t('tabDefaultTitle', { x: 1 })).toBe('탭 {n}');
	});
});

describe('사전 완전성', () => {
	it('여섯 로케일의 키 집합이 ko 와 정확히 같다', () => {
		const keys = Object.keys(ko).sort();
		for (const dict of [en, ja, es, zhHans, zhHant]) {
			expect(Object.keys(dict).sort()).toEqual(keys);
		}
	});

	it('값이 빈 문자열인 키는 없다', () => {
		for (const dict of [ko, en, ja, es, zhHans, zhHant]) {
			for (const [key, value] of Object.entries(dict)) {
				expect(value, key).not.toBe('');
			}
		}
	});
});

describe('vanilla NodeView 접근 경로 — editor.storage.editorI18n', () => {
	let editor: Editor | null = null;
	let host: HTMLElement | null = null;

	const make = (extensions: AnyExtension[]) => {
		host = document.createElement('div');
		document.body.appendChild(host);
		editor = new Editor({
			element: host,
			extensions,
			content: '<p></p>',
			editable: true
		});
		return editor;
	};

	afterEach(() => {
		editor?.destroy();
		editor = null;
		host?.remove();
		host = null;
	});

	it('EditorI18n 이 없으면 getEditorTranslator 는 ko 기본 번역기다', () => {
		const e = make([StarterKit, TabsBlock, Tab]);
		expect(getEditorTranslator(e)('tabAdd')).toBe('탭 추가');
	});

	it('null·storage 없는 객체도 ko 기본 번역기로 폴백한다', () => {
		expect(getEditorTranslator(null)('tabAdd')).toBe('탭 추가');
		expect(getEditorTranslator(undefined)('delete')).toBe('삭제');
		expect(getEditorTranslator({})('delete')).toBe('삭제');
	});

	it('EditorI18n.configure({ locale }) 가 storage 로 번역기를 나른다', () => {
		const e = make([StarterKit, TabsBlock, Tab, EditorI18n.configure({ locale: 'en' })]);
		expect(getEditorTranslator(e)('tabAdd')).toBe('Add tab');
	});

	it('NodeView(탭 블록)가 storage 의 로케일로 그려진다 — 기본(미주입)=ko', () => {
		const e = make([StarterKit, TabsBlock, Tab]);
		e.commands.setTabs(2);
		const add = e.view.dom.querySelector('.hce-tabs-add');
		expect(add?.getAttribute('aria-label')).toBe('탭 추가');
		// 생성된 탭 기본 이름도 ko
		const titles: string[] = [];
		e.state.doc.descendants((node) => {
			if (node.type.name === 'tab') titles.push(String(node.attrs.title));
		});
		expect(titles).toEqual(['탭 1', '탭 2']);
	});

	it('NodeView(탭 블록)가 en 로케일로 그려진다', () => {
		const e = make([StarterKit, TabsBlock, Tab, EditorI18n.configure({ locale: 'en' })]);
		e.commands.setTabs(2);
		const add = e.view.dom.querySelector('.hce-tabs-add');
		expect(add?.getAttribute('aria-label')).toBe('Add tab');
		const titles: string[] = [];
		e.state.doc.descendants((node) => {
			if (node.type.name === 'tab') titles.push(String(node.attrs.title));
		});
		expect(titles).toEqual(['Tab 1', 'Tab 2']);
	});

	it('메시지 오버라이드 객체도 확장 옵션으로 그대로 통한다', () => {
		const e = make([
			StarterKit,
			TabsBlock,
			Tab,
			EditorI18n.configure({ locale: { tabAdd: '추가!' } })
		]);
		e.commands.setTabs(1);
		expect(e.view.dom.querySelector('.hce-tabs-add')?.getAttribute('aria-label')).toBe('추가!');
	});
});
