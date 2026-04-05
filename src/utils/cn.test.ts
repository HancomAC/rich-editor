import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
	it('merges class names', () => {
		const result = cn('foo', 'bar');
		expect(result).toBe('foo bar');
	});

	it('handles conditional classes', () => {
		const result = cn('base', false && 'hidden', 'visible');
		expect(result).toBe('base visible');
	});

	it('handles undefined and null', () => {
		const result = cn('base', undefined, null, 'end');
		expect(result).toBe('base end');
	});

	it('merges tailwind classes correctly', () => {
		const result = cn('px-2 py-1', 'px-4');
		expect(result).toBe('py-1 px-4');
	});

	it('handles empty input', () => {
		const result = cn();
		expect(result).toBe('');
	});

	it('handles array input', () => {
		const result = cn(['foo', 'bar']);
		expect(result).toBe('foo bar');
	});
});
