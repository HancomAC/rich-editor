import { describe, it, expect } from 'vitest';
import { transformLegacyHtml, sanitizeHtml, stripHtmlToExcerpt } from './sanitize';

describe('transformLegacyHtml', () => {
	it('returns empty string for empty input', () => {
		expect(transformLegacyHtml('')).toBe('');
	});

	it('returns null/undefined as-is', () => {
		// @ts-expect-error testing null
		expect(transformLegacyHtml(null)).toBe(null);
		// @ts-expect-error testing undefined
		expect(transformLegacyHtml(undefined)).toBe(undefined);
	});

	it('converts <tiptap-file id="X"> to <div data-file-id="X">', () => {
		const input = '<tiptap-file id="abc123">report.pdf</tiptap-file>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('data-file-id="abc123"');
		expect(result).toContain('data-file-name="report.pdf"');
		expect(result).not.toContain('tiptap-file');
	});

	it('converts <tiptap-file> with empty text to default name', () => {
		const input = '<tiptap-file id="abc123">  </tiptap-file>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('data-file-name="파일"');
	});

	it('converts <tiptap-midibus id="X"> to iframe', () => {
		const input = '<tiptap-midibus id="vid123"></tiptap-midibus>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('data-youtube-video');
		expect(result).toContain('https://play.mbus.tv/v1/hls/vid123');
		expect(result).toContain('iframe');
		expect(result).not.toContain('tiptap-midibus');
	});

	it('converts <tiptap-collapsable title="X"> to <details><summary>', () => {
		const input = '<tiptap-collapsable title="Click me">Hidden content</tiptap-collapsable>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('<details>');
		expect(result).toContain('<summary>Click me</summary>');
		expect(result).toContain('Hidden content');
		expect(result).not.toContain('tiptap-collapsable');
	});

	it('converts <lite-youtube videoid="X"> to YouTube iframe', () => {
		const input = '<lite-youtube videoid="dQw4w9WgXcQ" params=""></lite-youtube>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
		expect(result).toContain('data-youtube-video');
		expect(result).not.toContain('lite-youtube');
	});

	it('converts <embed type="application/pdf"> (src before type)', () => {
		const input = '<embed src="https://example.com/file.pdf" type="application/pdf" />';
		const result = transformLegacyHtml(input);
		expect(result).toContain('data-pdf-src="https://example.com/file.pdf"');
		expect(result).toContain('data-pdf-name="file.pdf"');
		expect(result).not.toContain('embed');
	});

	it('converts <embed type="application/pdf"> (type before src)', () => {
		const input = '<embed type="application/pdf" src="https://example.com/doc.pdf" />';
		const result = transformLegacyHtml(input);
		expect(result).toContain('data-pdf-src="https://example.com/doc.pdf"');
		expect(result).toContain('data-pdf-name="doc.pdf"');
	});

	it('converts <div class="tiptap-columns"> to <div data-type="columns">', () => {
		const input = '<div class="tiptap-columns"><div class="tiptap-column">A</div></div>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('data-type="columns"');
		expect(result).toContain('data-type="column"');
		expect(result).not.toContain('tiptap-columns');
		expect(result).not.toContain('tiptap-column');
	});

	it('removes <tiptap-upload-skeleton>', () => {
		const input = '<p>Before</p><tiptap-upload-skeleton data-id="x"></tiptap-upload-skeleton><p>After</p>';
		const result = transformLegacyHtml(input);
		expect(result).not.toContain('tiptap-upload-skeleton');
		expect(result).toContain('Before');
		expect(result).toContain('After');
	});

	it('removes iframe-wrapper divs after midibus conversion', () => {
		const input = '<tiptap-midibus id="vid"></tiptap-midibus><div class="iframe-wrapper"><iframe></iframe></div>';
		const result = transformLegacyHtml(input);
		expect(result).not.toContain('iframe-wrapper');
	});

	it('parses margin-left: 40px via Indent extension (not transformLegacyHtml itself)', () => {
		// transformLegacyHtml does NOT handle margin-left; the Indent extension does.
		// This just verifies the function passes through margin-left style unchanged.
		const input = '<p style="margin-left: 40px">Indented</p>';
		const result = transformLegacyHtml(input);
		expect(result).toContain('margin-left: 40px');
	});

	it('passes through normal HTML unchanged', () => {
		const input = '<p>Hello <strong>world</strong></p>';
		const result = transformLegacyHtml(input);
		expect(result).toBe(input);
	});
});

describe('sanitizeHtml', () => {
	it('strips script tags', () => {
		const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('script');
		expect(result).not.toContain('alert');
		expect(result).toContain('<p>Hello</p>');
		expect(result).toContain('<p>World</p>');
	});

	it('strips style tags', () => {
		const input = '<style>body{color:red}</style><p>Text</p>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('style');
		expect(result).toContain('<p>Text</p>');
	});

	it('keeps allowed tags', () => {
		const input = '<p>Hello <strong>world</strong> <em>!</em></p>';
		const result = sanitizeHtml(input);
		expect(result).toContain('<p>');
		expect(result).toContain('<strong>');
		expect(result).toContain('<em>');
	});

	it('removes disallowed tags but keeps content', () => {
		const input = '<p>Hello</p><form><input type="text"></form>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('form');
		expect(result).not.toContain('input');
		expect(result).toContain('<p>Hello</p>');
	});

	it('handles empty/null input', () => {
		expect(sanitizeHtml('')).toBe('');
		// @ts-expect-error testing null
		expect(sanitizeHtml(null)).toBe('');
		// @ts-expect-error testing undefined
		expect(sanitizeHtml(undefined)).toBe('');
	});

	it('strips on* event handlers', () => {
		const input = '<p onclick="alert(1)">Click</p>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('onclick');
		expect(result).toContain('<p>');
	});

	it('allows safe href attributes on links', () => {
		const input = '<a href="https://example.com" title="link">Link</a>';
		const result = sanitizeHtml(input);
		expect(result).toContain('href=');
		expect(result).toContain('title=');
	});

	it('strips javascript: URLs', () => {
		const input = '<a href="javascript:alert(1)">Bad</a>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('javascript:');
	});

	it('allows img with src', () => {
		const input = '<img src="https://example.com/img.png" alt="test">';
		const result = sanitizeHtml(input);
		expect(result).toContain('src=');
		expect(result).toContain('alt=');
	});

	it('preserves data-pdf-src on div', () => {
		const input = '<div data-pdf-src="https://example.com/file.pdf" data-pdf-name="file.pdf"></div>';
		const result = sanitizeHtml(input);
		expect(result).toContain('data-pdf-src=');
		expect(result).toContain('data-pdf-name=');
	});

	it('preserves table-related attributes', () => {
		const input = '<td colspan="2" rowspan="1">Cell</td>';
		const result = sanitizeHtml(input);
		expect(result).toContain('colspan=');
		expect(result).toContain('rowspan=');
	});
});

describe('stripHtmlToExcerpt', () => {
	it('strips all HTML tags', () => {
		const input = '<p>Hello <strong>world</strong></p>';
		const result = stripHtmlToExcerpt(input);
		expect(result).toBe('Hello world');
	});

	it('truncates to specified length', () => {
		const input = '<p>' + 'a'.repeat(300) + '</p>';
		const result = stripHtmlToExcerpt(input, 100);
		expect(result.length).toBe(101); // 100 chars + ellipsis
		expect(result.endsWith('\u2026')).toBe(true);
	});

	it('truncates to default 200 length', () => {
		const input = '<p>' + 'b'.repeat(300) + '</p>';
		const result = stripHtmlToExcerpt(input);
		expect(result.length).toBe(201); // 200 + ellipsis
	});

	it('does not truncate short text', () => {
		const input = '<p>Short</p>';
		const result = stripHtmlToExcerpt(input);
		expect(result).toBe('Short');
	});

	it('handles empty input', () => {
		expect(stripHtmlToExcerpt('')).toBe('');
		// @ts-expect-error testing null
		expect(stripHtmlToExcerpt(null)).toBe('');
	});

	it('decodes HTML entities', () => {
		const input = '&amp; &lt; &gt; &quot; &nbsp;';
		const result = stripHtmlToExcerpt(input);
		expect(result).toContain('&');
		expect(result).toContain('<');
		expect(result).toContain('>');
		expect(result).toContain('"');
	});

	it('collapses whitespace', () => {
		const input = '<p>Hello   \n\t  world</p>';
		const result = stripHtmlToExcerpt(input);
		expect(result).toBe('Hello world');
	});
});
