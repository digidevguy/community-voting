# Recent Updates

> Version headings use the format `## vX-Y-Z` (e.g. `## v1-2-0`) so that push notification links can anchor directly to a release. Each release entry in the `release` table should use a matching `version` value (e.g. `"1.2.0"`).

## v0-5-0

**Smarter Invites, Temporary Memberships & Community Permissions**

### A whole new invite experience

The invite system has been rebuilt from the ground up. Admins and moderators can now create invite links with much more control over how they work.

When creating an invite link you can now set:

- **A label** — give the link a name so you know what it's for (e.g. "Game night guests" or "Streamer promo").
- **Expiry** — choose from preset options (30 minutes, 1 hour, 6 hours, 12 hours, 1 day, 7 days, or never) instead of typing a date manually.
- **Max uses** — pick a limit from a simple list, or leave it unlimited.
- **Role** — decide whether the invited person joins as a regular member or as a moderator.
- **Membership duration** — optionally make the membership temporary (7, 14, 30, or 90 days). Once the time is up, the person is automatically removed from the community.


You can also **edit** an existing invite link after it has been created to update its label, expiry, or use limit.

### Temporary memberships

When someone joins through a time-limited invite, the join page will show them a clear notice explaining how long their membership lasts and that a moderator can make it permanent if needed.

Temporary members have limited access — they can participate in voting but cannot create new voting sessions or add games to the collection. A moderator can grant them a permanent role at any time, which removes the expiry.

### Control what members can do

A new **Member Permissions** section is available in **Admin → Settings**. Admins can now toggle two community-wide rules:

- **Allow members to create voting sessions** — turn this off to restrict session creation to moderators and admins only.
- **Allow members to manage the collection** — turn this off to restrict adding and removing games to moderators and admins only.

These settings do not affect moderators or admins, who are always unrestricted.

### Bug Fixes

- Fixed an issue where removing a game from the collection could fail for users with certain permission states.
- Fixed a missing permission check when adding games to a community collection during voting session creation.

---

## v0-4-0

**Notifications & Quality of Life Improvements**

### Never miss a game night

You can now receive push notifications so the app keeps you in the loop even when you're not actively using it. Click the **bell icon** in the navigation bar to subscribe. Once you're set up, you'll get notified when:

- A new voting session opens in your community
- A session ends and the winning game is decided
- It's the day of a scheduled game night and there's still a vote to cast
- A new version of the app is available

You can unsubscribe at any time from the same bell icon.

### Notification center

A new **Notifications** page collects all of your alerts in one place. Unread notifications are highlighted so you can see what's new at a glance, and you can mark them as read when you're caught up. The bell icon in the nav shows a badge with your current unread count.

### Community activity feed

Each community now has its own notifications tab, so you can quickly review recent activity for that specific group without wading through everything else.

### Notifications on your profile

Your profile page now includes a dedicated section showing your recent notifications.

### Follow individual sessions

You can now subscribe to a specific voting session to receive updates for just that session — useful if you only want to follow certain game nights closely.

### App refreshes itself after updates

When a new version of the app is released, the browser will now detect it and prompt you to reload. This means you'll always be on the latest version without having to manually clear your cache or hard-refresh.

### Support and project links

The navigation bar and footer now include a link to the **support Discord** and the **project repository**, making it easier to get help or follow development.

### Bug Fixes

- Fixed an error that could occasionally appear during sign-in.
- Fixed a rare issue where creating a new community could appear to succeed but fail silently.

---

## v0-3-0

**Leaderboard & Winner Tracking**

### Leaderboard and Winner Tracking

Communities now have a dedicated leaderboard and a formal winner-tracking system for game nights.

#### Community Leaderboard

A new **Leaderboard** page is available from the community home. It shows three views:

- **Top Games** — games ranked by total wins in the community
- **Top Users** — players ranked by total wins in the community
- **Recent Wins** — a chronological feed of the most recent game night outcomes

All three views are paginated, and win counts are derived directly from logged game night outcomes.

#### Winner Logging

Admins and moderators can now log which player(s) won each game night directly from **Admin → Sessions**. Wins are associated with a completed voting session, the winning game, and one or more players.

**Shared wins are supported.** When a game night results in a tie or a team win, multiple players can be recorded as winners for the same session. Each player's win count will increase accordingly.

#### Unresolved Sessions

Sessions that have been completed but have not had winners logged are tracked as **unresolved**. The community home page and the admin sessions view both surface these sessions so nothing falls through the cracks. Admins can log winners directly from either location.

Leaderboard totals only reflect sessions that have been fully resolved.

See [Leaderboard & Winner Tracking](/docs/leaderboard) for the full reference.

---

## v0-2-0

**Steam Integration, Smarter Collections & Docs**

This release adds the first pass of Steam integration, makes ownership in community collections more visible, and starts building out the docs area.

### SteamID and Library Integration

You can now link your Steam account from your profile and sync your Steam library into the app.

- Steam linking is now part of the profile flow.
- After linking, you can sync your Steam library so the app knows which games you own.
- Your Steam game list must be public for syncing to work correctly.

This gives communities a better starting point when building shared collections and reduces the amount of manual game entry needed from members.

### Smarter Community Collections

Community collections now surface ownership information directly on game cards.

- Members can see which people in the community already own a game.
- Ownership badges make it easier to spot strong candidates for group sessions.
- If your Steam library is synced, the collection page can also suggest games you own that have not been added to the community collection yet.

The result is a collection view that is more useful for planning, voting, and deciding what the group can realistically play.

### Docs Area Is Live

The documentation section has started rolling out with core guides for:

- getting started
- communities
- voting
- collections
- admin workflows

This is the beginning of a broader docs effort. The current goal is to make the main flows easier to understand while creating a place for release notes, setup help, and future reference material.

### Why This Matters

These changes are aimed at making the app more practical for real communities:

- less manual work when adding games
- better visibility into what the group already owns
- clearer guidance for new and returning users

More polish is still coming, but this update lays the groundwork for tighter Steam-aware collection management and a more complete self-serve docs experience.
