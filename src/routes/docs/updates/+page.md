# Recent Updates

## Leaderboard and Winner Tracking

Communities now have a dedicated leaderboard and a formal winner-tracking system for game nights.

### Community Leaderboard

A new **Leaderboard** page is available from the community home. It shows three views:

- **Top Games** — games ranked by total wins in the community
- **Top Users** — players ranked by total wins in the community
- **Recent Wins** — a chronological feed of the most recent game night outcomes

All three views are paginated, and win counts are derived directly from logged game night outcomes.

### Winner Logging

Admins and moderators can now log which player(s) won each game night directly from **Admin → Sessions**. Wins are associated with a completed voting session, the winning game, and one or more players.

**Shared wins are supported.** When a game night results in a tie or a team win, multiple players can be recorded as winners for the same session. Each player's win count will increase accordingly.

### Unresolved Sessions

Sessions that have been completed but have not had winners logged are tracked as **unresolved**. The community home page and the admin sessions view both surface these sessions so nothing falls through the cracks. Admins can log winners directly from either location.

Leaderboard totals only reflect sessions that have been fully resolved.

See [Leaderboard & Winner Tracking](/docs/leaderboard) for the full reference.

---

This release adds the first pass of Steam integration, makes ownership in community collections more visible, and starts building out the docs area.

## SteamID and Library Integration

You can now link your Steam account from your profile and sync your Steam library into the app.

- Steam linking is now part of the profile flow.
- After linking, you can sync your Steam library so the app knows which games you own.
- Your Steam game list must be public for syncing to work correctly.

This gives communities a better starting point when building shared collections and reduces the amount of manual game entry needed from members.

## Smarter Community Collections

Community collections now surface ownership information directly on game cards.

- Members can see which people in the community already own a game.
- Ownership badges make it easier to spot strong candidates for group sessions.
- If your Steam library is synced, the collection page can also suggest games you own that have not been added to the community collection yet.

The result is a collection view that is more useful for planning, voting, and deciding what the group can realistically play.

## Docs Area Is Live

The documentation section has started rolling out with core guides for:

- getting started
- communities
- voting
- collections
- admin workflows

This is the beginning of a broader docs effort. The current goal is to make the main flows easier to understand while creating a place for release notes, setup help, and future reference material.

## Why This Matters

These changes are aimed at making the app more practical for real communities:

- less manual work when adding games
- better visibility into what the group already owns
- clearer guidance for new and returning users

More polish is still coming, but this update lays the groundwork for tighter Steam-aware collection management and a more complete self-serve docs experience.
