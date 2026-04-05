import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
	it('escapes ampersand', () => {
		expect(escapeHtml('a & b')).toBe('a &amp; b');
	});

	it('escapes less-than', () => {
		expect(escapeHtml('a < b')).toBe('a &lt; b');
	});

	it('escapes greater-than', () => {
		expect(escapeHtml('a > b')).toBe('a &gt; b');
	});

	it('escapes double quotes', () => {
		expect(escapeHtml('a "b" c')).toBe('a &quot;b&quot; c');
	});

	it('escapes all entities together', () => {
		expect(escapeHtml('<div class="x">&</div>')).toBe(
			'&lt;div class=&quot;x&quot;&gt;&amp;&lt;/div&gt;'
		);
	});

	it('handles empty string', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('passes through plain text unchanged', () => {
		expect(escapeHtml('Hello world')).toBe('Hello world');
	});
});
