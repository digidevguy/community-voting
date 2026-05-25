---
status:
  - planned
created-date: 2026-05-18
completed_date:
tags:
  - service-worker
priority:
  - medium
---

# Build a push notification system

**Created:** 2026-05-18

## Summary

_The application needs a solution to allow users to receive notifications of changes in the app when subscribed._

## User Story

- As a **user** I want **to know when a new voting session has been created** so that **I can see if I want to RSVP to the event**.
- As a user I want to know **when an app update is published** so that I can **see what's changed**.
- As a user I want to know **what voting sessions end that day** so that I can **RSVP before the deadline**.
- As a user, I want to **have a central location for notifications** so that I can **dismiss an alert or look at the source of the notification**.

## Acceptance Criteria

- [ ] A central location on the primary nav that will display the number of notifications, and will display a list of recent notifications when clicked and has an option to direct the user to a location to view all notifications.
- [ ] A location to display all notifications for a user, with the ability to manage said notifications.
- [ ] A section in the user profile page that allows the user to opt-in for app notifications related to updates, changelogs, etc.
- [ ] A location in a community area for configuring push notifications settings for the specific community.
- [ ] An option for a user to subscribe to updates for a voting session.

## Tasks

### Phase 1 — DB & Backend Foundation

- [ ] **Schema additions** (`src/lib/server/db/schema.ts`):
  - Extend `notificationType` enum: add `'app_update'`
  - Add `notifyVoteStarted`, `notifyVoteEnded`, `notifyVoteReminder` boolean columns (default `false`) to `communityUser`
  - New `push_subscription` table: `id (uuid PK)`, `userId (FK → user, cascade)`, `endpoint (text, unique)`, `p256dhKey (text)`, `authKey (text)`, `createdAt`
  - New `user_notification_preference` table: `userId (text PK, FK → user, cascade)`, `notifyAppUpdates (boolean, default false)`
  - New `voting_session_subscription` table: composite PK `(userId, votingSessionId)`, both FKs with cascade, `createdAt`
- [ ] Run `npm run db:generate && npm run db:migrate`
- [ ] Install `web-push` and `@types/web-push`
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys` → add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` to `.env` (server-only) and `PUBLIC_VAPID_PUBLIC_KEY` (client-safe, prefixed)
- [ ] Create `src/lib/server/notifications/notifications.service.ts`: `createNotification`, `createNotificationsForUsers`, `getUnreadCount`, `getRecentNotifications`, `getAllNotifications`, `markAsRead`, `markAllAsRead`
- [ ] Create `src/lib/server/notifications/push.service.ts`: `sendPushToUser` (handles 410 Gone by deleting stale subs), `sendPushToUsers`
- [ ] Create `POST /api/push/subscribe` and `DELETE /api/push/subscribe` (auth-gated; upsert/delete `push_subscription` by endpoint)
- [ ] Create `PATCH /api/notifications/read` (mark single or all; return updated count)
- [ ] Add `vote_started` push + notification dispatch to `publishVotingSession()` in `voting-session.service.ts` (query `communityUser` where `notifyVoteStarted = true`)
- [ ] Add `vote_ended` dispatch to `finalizeExpiredSessions()` (query `communityUser.notifyVoteEnded` + `voting_session_subscription`)
- [ ] Create `src/routes/api/cron/send-vote-reminders/+server.ts` — same bearer-token guard as `finalize-sessions`; query active sessions with today's `gameDayDate`; notify users where `notifyVoteReminder = true`
- [ ] Add cron entry to `vercel.json`: `{ "path": "/api/cron/send-vote-reminders", "schedule": "0 9 * * *" }`

### Phase 2 — Service Worker & Client Push

- [ ] Create `static/sw.js` with `push` and `notificationclick` event handlers (see Notes)
- [ ] Register SW + subscribe to push in `src/routes/+layout.svelte` (see Notes)
- [ ] Create `src/lib/components/custom/PushSubscribeButton.svelte` — shows browser permission state, subscribe/unsubscribe toggle

### Phase 3 — In-App Notification Center

- [ ] Add `getUnreadCount` + `getRecentNotifications(5)` to `src/routes/+layout.server.ts` load (parallel, only if `locals.user`)
- [ ] Create `src/lib/components/custom/NotificationBell.svelte` — Bell icon with badge, bits-ui Popover dropdown, "Mark all read", "View all" link
- [ ] Add `NotificationBell` to desktop nav and mobile Sheet in `+layout.svelte` (only if `data.user`)

### Phase 4 — Notifications Page

- [ ] Create `src/routes/notifications/+page.server.ts` + `+page.svelte` — full paginated list, mark-as-read, link to related entity by type

### Phase 5 — Preference Surfaces

- [ ] Add "Notifications" card to `src/routes/profile/+page.svelte` and `+page.server.ts` — `notifyAppUpdates` toggle + `PushSubscribeButton`
- [ ] Create `src/routes/community/[communityId]/notifications/+page.server.ts` + `+page.svelte` — per-community toggles (`notifyVoteStarted`, `notifyVoteEnded`, `notifyVoteReminder`)
- [ ] Add session subscription toggle to `src/routes/voting/[votingSessionId]/+page.svelte` + `+page.server.ts` actions (`subscribeToSession` / `unsubscribeFromSession`)

## Notes / Decisions

### Service Worker (`static/sw.js`)

Use a plain file in `static/` rather than SvelteKit's built-in `src/service-worker.ts`. SvelteKit's built-in SW injects precache manifests and is designed for offline-first; for push-only notifications a standalone file is simpler and avoids vite processing.

```js
// static/sw.js
self.addEventListener('push', (event) => {
	const { title, body, url } = event.data?.json() ?? {};
	event.waitUntil(
		self.registration.showNotification(title ?? 'Community Voting', {
			body,
			icon: '/favicon.svg',
			data: { url }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
			const target = event.notification.data?.url ?? '/';
			const existing = list.find((c) => c.url === target);
			return existing ? existing.focus() : clients.openWindow(target);
		})
	);
});
```

### SW Registration (in `+layout.svelte` `$effect`)

```ts
if ('serviceWorker' in navigator) {
	const reg = await navigator.serviceWorker.register('/sw.js');
	if (data.user) {
		let sub = await reg.pushManager.getSubscription();
		if (!sub) {
			// only subscribe after explicit user opt-in (PushSubscribeButton handles this)
		}
	}
}
```

The actual push subscription (`pushManager.subscribe(...)`) must be triggered by a user gesture or from `PushSubscribeButton` — browsers block autosubscription without permission.

### VAPID key exposure

- Server-only: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — used by `web-push` in `push.service.ts`
- Client-safe: `PUBLIC_VAPID_PUBLIC_KEY` — imported via `$env/static/public` in `PushSubscribeButton.svelte`
- The `applicationServerKey` passed to `pushManager.subscribe()` must be converted with a `urlBase64ToUint8Array` helper

### Notification routing by type

| `relatedEntityType` | URL pattern                   |
| ------------------- | ----------------------------- |
| `voting_session`    | `/voting/${relatedEntityId}`  |
| `game`              | `/library/${relatedEntityId}` |
| `user`              | `/profile`                    |

### `app_update` notifications

The `updated` state from `$app/state` is already used in `+layout.svelte` to show a toast. The `app_update` notification type in DB is reserved for future server-triggered announcements (e.g. changelogs); manual trigger deferred.

### Community vs. global prefs

- **Per-community** preferences live as columns on `community_user` (no separate table needed since they're 1:1 with membership)
- **Global** preferences live in `user_notification_preference` (separate table to avoid polluting the `user` table with optional opt-in fields)

### Push subscription lifecycle

- One row per browser/device per user in `push_subscription` (endpoint is unique)
- On 410 Gone from `web-push`, delete the stale subscription row immediately
- `DELETE /api/push/subscribe` allows client to clean up on unsubscribe
