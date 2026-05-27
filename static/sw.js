/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

/**
 * @typedef {{ title?: string; body?: string; url?: string }} PushPayload
 */

sw.addEventListener('push', (/** @type {PushEvent} */ event) => {
	/** @type {PushPayload} */
	let payload = {};

	try {
		payload = event.data?.json() ?? {};
	} catch {
		console.error('[SW] Failed to parse push payload — ignoring event');
	}

	const { title, body, url } = payload;

	event.waitUntil(
		sw.registration.showNotification(title ?? 'Community Voting', {
			body,
			icon: '/favicon.svg',
			tag: 'community-voting',
			data: { url: url ?? '/' }
		})
	);
});

sw.addEventListener('notificationclick', (/** @type {NotificationEvent} */ event) => {
	event.notification.close();

	const rawUrl = /** @type {string} */ (event.notification.data?.url ?? '/');

	// Validate the URL is within the same origin to prevent open-redirect attacks
	/** @type {string} */
	let target;
	try {
		const parsed = new URL(rawUrl, sw.location.origin);
		target = parsed.origin === sw.location.origin ? parsed.href : '/';
	} catch {
		target = '/';
	}

	event.waitUntil(
		sw.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((/** @type {readonly WindowClient[]} */ list) => {
				const existing = list.find((c) => c.url === target);
				return existing ? existing.focus() : sw.clients.openWindow(target);
			})
	);
});