export const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
export const OPENID_NS = 'http://specs.openid.net/auth/2.0';
export const OPENID_IDENTITY = 'http://specs.openid.net/auth/2.0/identifier_select';
export const STEAM_ID_REGEX = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;
import * as Sentry from '@sentry/sveltekit';

export async function verifyAssertion(params: URLSearchParams): Promise<boolean> {
	return Sentry.startSpan({ op: 'http.client', name: 'Steam OpenID Verify' }, async () => {
		const verifyParams = new URLSearchParams(params);
		verifyParams.set('openid.mode', 'check_authentication');

		const response = await fetch(STEAM_OPENID_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: verifyParams.toString()
		});

		if (!response.ok) return false;
		const text = await response.text();
		return text.includes('is_valid:true');
	});
}

export function formatSyncCooldownMessage(remainingMs: number): string {
	const remainingMins = Math.ceil(remainingMs / 60_000);
	return `Library was synced recently. Try again in ${remainingMins} minute${remainingMins === 1 ? '' : 's'}.`;
}
