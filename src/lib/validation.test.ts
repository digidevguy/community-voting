import { describe, it, expect } from 'vitest';
import { validatePassword, validateEmail } from './validation';

describe('validatePassword', () => {
	it('accepts passwords in range', () => {
		expect(validatePassword('password')).toBe(true); // exact min (8)
		expect(validatePassword('p'.repeat(255))).toBe(true); // exact max (255)
	});

	it('rejects passwords that are too short', () => {
		expect(validatePassword('pass')).toBe(false);
		expect(validatePassword('1234567')).toBe(false); // 7 chars
	});

	it('rejects passwords that are too long', () => {
		expect(validatePassword('p'.repeat(256))).toBe(false);
	});

	it('rejects non-string values', () => {
		expect(validatePassword(null)).toBe(false);
	});
});

describe('validateEmail', () => {
	it('accepts valid email addresses', () => {
		expect(validateEmail('user@example.com')).toBe(true);
		expect(validateEmail('user+tag@sub.domain.com')).toBe(true);
	});

	it('rejects emails missing @', () => {
		expect(validateEmail('userexample.com')).toBe(false);
	});

	it('rejects emails missing domain', () => {
		expect(validateEmail('user@')).toBe(false);
	});

	it('rejects emails with spaces', () => {
		expect(validateEmail('user @example.com')).toBe(false);
	});

	it('rejects non-string values', () => {
		expect(validateEmail(null)).toBe(false);
		expect(validateEmail(undefined)).toBe(false);
	});
});
