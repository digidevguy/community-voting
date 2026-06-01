# Changelog

All notable changes to this project are documented here.

Format: `[version] - date` — types: **Added**, **Changed**, **Fixed**, **Removed**, **Internal**

---

## [0.5.0] - 2026-05-31

### Added

#### Customized Invites

- `label`, `granted_role`, and `membership_duration_days` columns added to the `invitations` table (migration `0013`)
- `createCommunityInvite` — accepts optional `label`, `grantedRole`, and `membershipDurationDays` parameters
- `updateInvite` service function — allows patching `label`, `expiresAt`, and `maxUses` on an existing invite
- `update` form action on `/community/[communityId]/invites` — privilege-checked (creator or privileged role); validates via `updateInviteSchema`
- Invite creation UI redesigned as a modal dialog with preset dropdowns for expiry (30 m / 1 h / 6 h / 12 h / 1 d / 7 d / never), max uses, role, and membership duration
- Edit dialog on the invites list for modifying label, expiry, and max uses on existing links
- `getInvitesByCommunity` — now returns `label`, `grantedRole`, and `membershipDurationDays` fields

#### Temporary Memberships

- `membership_expires_at` column and index added to the `community_user` table (migration `0013`)
- `isTempMember(membershipExpiresAt)` — utility predicate exported from `communities.service`
- `redeemInvite` — computes and stores `membershipExpiresAt` when `membershipDurationDays` is set on the invite; grants the role specified by `grantedRole` instead of defaulting to `member`
- `updateCommunityUserRole` — now clears `membershipExpiresAt` when a role is explicitly assigned (promoting to permanent membership)
- `purgeExpiredMembers` service function — bulk-deletes `community_user` rows past their expiry
- `GET /api/cron/purge-temp-members` — bearer-token-secured cron endpoint; removes expired temporary members; wrapped in a Sentry monitor; registered in `vercel.json`
- Join page (`/community/[communityId]/join/[inviteId]`) — displays invite label and a temporary-membership notice when `membershipDurationDays` is set

#### Community Permissions

- `allow_members_create_sessions` and `allow_members_add_collection` boolean columns added to the `community` table (migration `0014`, both default `true`)
- `canCreateSession(community, role, membershipExpiresAt)` — returns `true` for privileged roles; `false` for temporary members; otherwise defers to the community flag
- `canAddToCollection(community, role, membershipExpiresAt)` — same logic for collection management
- `getUserCommunityMembership(db, userId, communityId)` — returns `{ role, membershipExpiresAt }` or `null`; replaces paired calls to `getUserCommunityRole` + separate expiry lookups
- `updateCommunityPermissions` service function + `updateCommunityPermissionsSchema` validator
- `updatePermissions` form action on `/community/[communityId]/admin/settings` — admin-only
- **Admin → Settings** UI — new _Member Permissions_ card with checkboxes for both flags

### Changed

- Community home (`/community/[communityId]`) — `canCreateSession` derived from `getUserCommunityMembership`; passed to the page for conditional rendering of the _Create Session_ button
- Collection page (`/community/[communityId]/collection`) — `canManageCollection` flag (via `canAddToCollection`) gates the _Add new_ dialog and all collection-mutation actions; migrated from `canAdd` to `canManage`
- Voting session create (`/voting/create/[communityId]`) — permission check added; returns 403 if user cannot add to the collection

### Fixed

- Collection remove action incorrectly used `canAdd` guard instead of `canManage`; now uses unified `canAddToCollection` check
- Missing permission check when adding games to the community collection during new voting session creation

---

## [0.4.0] - 2026-05-29

### Added

#### Push Notifications

- `web-push` package integrated for Web Push Protocol support
- New DB schema tables: `pushSubscription`, `userNotificationPreference` (migration `0008`)
- `push.service.ts` — service layer for sending push notifications to individual users and batches (`sendPushToUser`, `sendPushToUsers`)
- API route `POST /api/notifications/subscribe` — registers a browser push subscription endpoint
- API route `DELETE /api/notifications/subscribe` — removes a push subscription (unsubscribe)
- API route `POST /api/notifications/read` — marks one or all notifications as read
- `notifications.service.ts` — `createNotificationForUsers` helper for bulk in-app notification creation
- `sw.js` (static service worker) — handles `push` and `notificationclick` browser events
- `PushSubscribeButton` component — subscribe/unsubscribe toggle, migrated into `NotificationBell`
- `NotificationBell` component — nav bell with unread badge, wraps push subscription management; added to root layout navs

#### In-App Notifications

- `notification` DB table added for persisted in-app notifications (migration `0008`)
- `getAllNotifications(db, userId, isRead?)` — optional `isRead` filter param added
- `/notifications` route — full notification list UI with read/unread state and mark-as-read actions
- Community-scoped notifications view under `/community/[communityId]/notifications`
- Notification summary surfaced in root layout `load` function for nav badge hydration
- Profile page updated with a dedicated notifications section

#### Session Subscriptions

- `sessionSubscription` DB table tracks per-user session subscriptions (migration `0008`)
- `subscribeToSession` / `unsubscribeFromSession` service functions extracted into `session-subscriptions.service.ts`
- Subscribe/unsubscribe toggle added to session detail UI
- Voting session server route updated to handle subscription API calls

#### Notification Triggers

- `publishVotingSession` — dispatches push + in-app notifications to community members on session publish
- `finalizeExpiredSessions` — dispatches push + in-app notifications when sessions auto-expire
- `dispatchVoteEndedNotification` — extracted shared end-of-voting notification logic into a reusable service function, replacing duplicated inline dispatch in multiple routes

#### Cron Jobs

- `POST /api/cron/send-vote-reminders` — finds active sessions with `gameDayDate` matching today and sends vote-reminder push + in-app notifications to subscribed users; registered in `vercel.json`
- `POST /api/cron/send-app-updates` — checks the `release` table for rows with `notifiedAt IS NULL`, sends push + in-app app-update notifications to opted-in users, then stamps `notifiedAt`; registered in `vercel.json`
- `POST /api/cron/purge-notifications` — deletes read notifications older than a configurable TTL to keep the table lean; registered in `vercel.json` (migration `0011` adds `expiresAt` column to `notification`)

#### Observability (Sentry.io)

- Sentry SDK integrated via official SvelteKit wizard (`@sentry/sveltekit`)
- `instrumentation.server.ts` initialises Sentry on the server
- `hooks.client.ts` initialises Sentry on the client
- Environment-aware SDK configuration (dev vs. production DSN)
- `captureException` calls replace `console.error` across server routes
- Business-event `Sentry.logger.info` calls added for: user auth, voting session created/published, community created, cron completions
- Custom Sentry monitors wrap cron handlers via `Sentry.withMonitor`
- Performance spans and metric tracking added to key DB query paths

#### Branding & Navigation

- Custom SVG icon set created under `src/lib/assets/`
- Support Discord link and project repository link added to main nav and footer
- `GlobalNotice` component available for broadcasting site-wide notices to all users

#### Version Polling

- Root `+layout.svelte` now polls for a `version` header on each navigation and prompts users to hard-reload when a new deployment is detected
- `Cache-Control` headers tightened on API responses to prevent stale asset issues post-deploy

### Changed

- `dispatchVoteEndedNotification` extracted from inline logic in session end handlers — all callers updated to use the shared service function
- Session subscription management moved to dedicated service module; server route handlers updated accordingly
- SvelteKit and Svelte dependencies bumped for Sentry SDK compatibility

### Fixed

- **Auth false-positive** — a handled sign-in edge case was incorrectly being reported as an error to Sentry; suppressed at the error boundary
- **Community creation transaction** — `locals.db` was incorrectly passed instead of the active transaction object in the community creation rolling transaction, which could leave orphaned community records on failure

---

## [0.3.0] - 2026-05

### Added

- **Community Leaderboard** (`/community/[communityId]/leaderboard`) — three paginated views: Top Games (by wins), Top Players (by wins), Recent Wins (chronological feed)
- **Winner logging** — admins/moderators can record winner(s) for a completed session via **Admin → Sessions**; shared/tied wins supported (multiple players per session)
- **Unresolved sessions tracking** — sessions with no winners logged are flagged as unresolved on the community home and admin sessions view
- Manual migration `0009_backfill_session_winners.sql` for backfilling existing winner data
- Leaderboard reference documentation at `/docs/leaderboard`
- Nav button added to leaderboard page

### Changed

- Leaderboard context deferred for testing; vitest setup updated accordingly

---

## [0.2.0] - 2026-04

### Added

- **Steam account linking** — users can connect a Steam account from their profile and sync their public Steam library
- **Ownership badges** on community collection game cards — shows which members own each game
- **Steam-aware collection suggestions** — surfaces games from a user's synced Steam library that are not yet in the community collection
- **Docs area** (`/docs`) — initial guides for getting started, communities, voting, collections, and admin workflows
- `.env.example` and `README.md` added to the project root
- Auth check added to the game details API route

### Changed

- `docker-compose.yml` migrated to use environment variables instead of hard-coded values

---

## [0.1.0] - 2026-03

Initial release. Core voting, community management, and collection features.

### Added

- Community creation and membership management
- Voting sessions with configurable options, start/end dates, and game day scheduling
- Community game collection with add/remove support
- Role-based access control (owner, admin, moderator, member)
- Steam game search and metadata integration
- User profiles with Steam library sync
- SvelteKit full-stack app with Drizzle ORM + PostgreSQL
- Auth via Better Auth
