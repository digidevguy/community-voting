<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Leaderboard & Winner Tracking

The community leaderboard tracks game night outcomes over time, giving your group a running record of which games have been most popular and which players have the most wins.

## The Community Leaderboard

The leaderboard is accessible from the main community page by selecting **Leaderboard**. It contains three tabs:

| Tab         | What it shows                                                   |
| ----------- | --------------------------------------------------------------- |
| Top Games   | Games ranked by total wins in this community, most wins first   |
| Top Users   | Players ranked by total wins in this community, most wins first |
| Recent Wins | A chronological feed of the most recent game night outcomes     |

Each tab is paginated. Use the **Previous** and **Next** buttons to move through older results.

<DocsAlert type="tip">
	Win counts reflect logged game night outcomes only — sessions that have not yet had winners recorded will not appear in the leaderboard totals.
</DocsAlert>

## How Wins Are Recorded

A win is recorded when an admin or moderator logs the winner(s) for a completed voting session. The process is:

1. A voting session reaches the `completed` status with a winning game selected.
2. An admin or moderator logs which player(s) won that game night from the admin sessions view.
3. The win is saved and the leaderboard updates to reflect the new outcome.

Sessions can be completed before winners are logged. This allows the session lifecycle to close out on schedule even if the game night outcome is not immediately available.

### Shared Wins (Ties)

When multiple games or players tie for the most votes, the community can record a **shared win**. All tied outcomes receive a winner row, so every tied player's win count increases. No tie-breaker is required.

## Unresolved Sessions

A session is considered **unresolved** when it has been completed but no player winners have been logged yet. These sessions do not contribute to leaderboard totals.

Unresolved sessions are surfaced in two places:

- **Community page** — a notice appears near the sessions list when completed sessions are missing winner data.
- **Admin → Sessions** — an **Needs Action** section lists sessions flagged as unresolved, with a direct link to log winners for each one.

<DocsAlert type="warning">
	Leaderboard standings will not be fully accurate until all completed sessions have winners logged. Admins should resolve unresolved sessions promptly after each game night.
</DocsAlert>

## Logging Winners (Admins and Moderators)

To log winners for a completed session:

1. Go to **Admin → Sessions**.
2. Find the session in the **Needs Action** section, or locate it in the **Completed** tab.
3. Select **Log winners** next to the session.
4. Enter the player(s) who won that game night and confirm.

If a session was previously resolved and the outcome needs to be corrected, you can re-run the same flow. The existing winner records for that session will be replaced with the updated set.

<DocsAlert type="tip">
	You can also log winners from the session detail page directly by visiting the session and using the winner prompt shown to privileged users.
</DocsAlert>

## Reading the Leaderboard

### Top Games

Games are ranked by total win count, from most wins to fewest. Each row shows:

- **Rank** — position on the leaderboard for this community
- **Game** — title and thumbnail
- **Wins** — total times this game has won a community vote
- **Last Win** — the date of the most recent win

### Top Users

Players are ranked by total win count. Each row shows:

- **Rank** — position on the leaderboard for this community
- **Player** — display name and avatar
- **Wins** — total times this player has been logged as a winner
- **Last Win** — the date of the most recent win

Players who have been removed from the platform will appear as **Unknown User** but their historical win counts are preserved.

### Recent Wins

The Recent Wins tab shows a chronological list of outcomes across all sessions, with the most recent entries first. Each row shows the player, the game they won, and the date of the win.

## Frequently Asked Questions

**Does the leaderboard include wins from all sessions, including old ones?**
Yes. Historical sessions that were backfilled with winner data will appear in leaderboard totals alongside newer sessions.

**What happens to a player's wins if they leave the community?**
Their historical wins remain in the leaderboard. Past outcomes are not modified when membership changes.

**Can a player appear multiple times for the same session?**
No. Each session produces at most one win row per player, even in a shared win scenario.

**Can admins correct a win that was logged incorrectly?**
Yes. Re-logging winners for a session replaces the previous outcome entirely.
