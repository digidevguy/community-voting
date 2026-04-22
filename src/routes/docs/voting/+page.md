<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Voting

Voting sessions let your community decide which game to play next.

## Session Lifecycle

A voting session moves through the following statuses:

| Status         | Description                             |
| -------------- | --------------------------------------- |
| `draft`        | Created but not yet open for voting     |
| `active`       | Open — members can cast votes           |
| `voting_ended` | Voting window has closed                |
| `completed`    | A winner has been selected              |
| `archived`     | Session stored for historical reference |
| `cancelled`    | Session was cancelled before completion |

## Casting a Vote

Open an active session from the [voting](/voting) area and select your preferred game from the session's game list. You may clear your vote at any time while the session is active.

## Creating a Session

Admins and moderators can create a new session from **Admin → Sessions** or the main voting area. A session requires a title, start date, and a game day date.

<DocsAlert type="tip">
	Double-check your start date and game day date before activating a session, since those dates are used to calculate the remaining voting window shown in admin views.
</DocsAlert>
