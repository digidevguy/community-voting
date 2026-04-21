import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyAssertion, STEAM_ID_REGEX, formatSyncCooldownMessage } from './steam';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('STEAM_ID_REGEX', () => {
	it('matches a valid Steam OpenID URL and extracts the numeric ID', () => {
		const url = 'https://steamcommunity.com/openid/id/76561198000000000';
		const match = url.match(STEAM_ID_REGEX);
		expect(match).not.toBeNull();
		expect(match![1]).toBe('76561198000000000');
	});

	it('rejects a URL from a different domain', () => {
		const url = 'https://evil.com/openid/id/76561198000000000';
		expect(url.match(STEAM_ID_REGEX)).toBeNull();
	});

	it('rejects a claimed_id with a non-numeric ID segment', () => {
		const url = 'https://steamcommunity.com/openid/id/abc123';
		expect(url.match(STEAM_ID_REGEX)).toBeNull();
	});

	it('rejects a bare numeric Steam ID without the URL prefix', () => {
		expect('76561198000000000'.match(STEAM_ID_REGEX)).toBeNull();
	});

	it('rejects a URL with a mixed alphanumeric ID segment', () => {
		const url = 'https://steamcommunity.com/openid/id/7656119800000000a';
		expect(url.match(STEAM_ID_REGEX)).toBeNull();
	});
});

describe('verifyAssertion', () => {
	it('returns true when Steam responds with is_valid:true', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'
			})
		);

		const params = new URLSearchParams({ 'openid.mode': 'id_res' });
		await expect(verifyAssertion(params)).resolves.toBe(true);
	});

	it('returns false when Steam responds with is_valid:false', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => 'ns:http://specs.openid.net/auth/2.0\nis_valid:false\n'
			})
		);

		const params = new URLSearchParams({ 'openid.mode': 'id_res' });
		await expect(verifyAssertion(params)).resolves.toBe(false);
	});

	it('returns false when the Steam endpoint returns a non-OK response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				text: async () => ''
			})
		);

		const params = new URLSearchParams({ 'openid.mode': 'id_res' });
		await expect(verifyAssertion(params)).resolves.toBe(false);
	});

	it('sets openid.mode to check_authentication in the outbound request', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => 'is_valid:true'
		});
		vi.stubGlobal('fetch', mockFetch);

		const params = new URLSearchParams({
			'openid.mode': 'id_res',
			'openid.claimed_id': 'something'
		});
		await verifyAssertion(params);

		const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
		const body = new URLSearchParams(init.body as string);
		expect(body.get('openid.mode')).toBe('check_authentication');
	});

	it('does not mutate the original params', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => 'is_valid:true'
			})
		);

		const params = new URLSearchParams({ 'openid.mode': 'id_res' });
		await verifyAssertion(params);
		expect(params.get('openid.mode')).toBe('id_res');
	});
});

describe('formatSyncCooldownMessage', () => {
	it('uses singular "minute" when exactly 1 minute remains', () => {
		expect(formatSyncCooldownMessage(60_000)).toBe(
			'Library was synced recently. Try again in 1 minute.'
		);
	});

	it('uses plural "minutes" when more than 1 minute remains', () => {
		expect(formatSyncCooldownMessage(120_000)).toBe(
			'Library was synced recently. Try again in 2 minutes.'
		);
	});

	it('rounds a partial minute up to the next whole minute', () => {
		expect(formatSyncCooldownMessage(61_000)).toBe(
			'Library was synced recently. Try again in 2 minutes.'
		);
	});

	it('uses singular "minute" when sub-minute remainder rounds up to 1', () => {
		expect(formatSyncCooldownMessage(1)).toBe(
			'Library was synced recently. Try again in 1 minute.'
		);
	});
});
