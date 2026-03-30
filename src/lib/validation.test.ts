import { describe, it, expect } from 'vitest';
import {
	validateUsername,
	validatePassword,
	validateEmail,
	validateDisplayName
} from './validation';

describe('validateUsername', () => {
	it('accepts valid usernames', () => {
		expect(validateUsername('alice')).toBe(true);
		expect(validateUsername('alice_bob-99')).toBe(true);
		expect(validateUsername('abc')).toBe(true); // exact min (3)
		expect(validateUsername('a'.repeat(31))).toBe(true); // exact max (31)
	});

	it('rejects usernames that are too short', () => {
		expect(validateUsername('ab')).toBe(false);
	});

	it('rejects usernames that are too long', () => {
		expect(validateUsername('a'.repeat(32))).toBe(false);
	});

	it('rejects usernames with disallowed characters', () => {
		expect(validateUsername('Alice')).toBe(false); // uppercase
		expect(validateUsername('alice!')).toBe(false); // special character
		expect(validateUsername('ali ce')).toBe(false); // space
		expect(validateUsername('ali\x00ce')).toBe(false); // null byte
		expect(validateUsername('аlice')).toBe(false); // Cyrillic lookalike
	});

	it('rejects non-string values', () => {
		expect(validateUsername(null)).toBe(false);
		expect(validateUsername(42)).toBe(false);
		expect(validateUsername(undefined)).toBe(false);
	});
});

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

describe('validateDisplayName', () => {
	it('accepts valid display names', () => {
		expect(validateDisplayName('Al')).toBe(true); // exact min (2 trimmed)
		expect(validateDisplayName('A'.repeat(50))).toBe(true); // exact max
		expect(validateDisplayName('  Alice  ')).toBe(true); // whitespace trimmed before check
	});

	it('rejects names that are too short after trimming', () => {
		expect(validateDisplayName('a')).toBe(false);
		expect(validateDisplayName('  a  ')).toBe(false); // 1 char after trim
	});

	it('rejects names that are too long after trimming', () => {
		expect(validateDisplayName('A'.repeat(51))).toBe(false);
	});
});
