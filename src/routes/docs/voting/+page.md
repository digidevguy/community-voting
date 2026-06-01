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

Open an active session from the community page or the [voting](/voting) area and select your preferred game from the session's option list. You may clear your vote at any time while the session is active.

## Subscribing to a Session

On any session page you can subscribe to receive a push notification when voting ends. Use the **Subscribe** button on the session detail page to opt in, and **Unsubscribe** to opt out.

## Add to Calendar

If the session has an event date set, an **Add to calendar** button appears on the session detail page. Click it to add to your calendar or download a calendar file for the game night.

## Creating a Session

Admins, moderators, and members (if permitted by community settings) can create a new voting session from the community page.

### Session Fields

| Field                        | Required | Notes                                                        |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| Title                        | Yes      | Short name for the session                                   |
| Description                  | No       | Additional context shown to voters                           |
| Duration / Event date & time | Yes      | Shown as "TBD" if not set                                    |
| Game options                 | Yes      | Selected from the community collection or your Steam library |

### Save as Draft vs. Publish Immediately

When creating a session you can either:

- **Save as draft** — the session is created but not yet visible to regular members. You can edit all fields, including the game list, before publishing.
- **Create and publish** — the session goes live immediately and members can start voting. Once a session is active, the game list is locked; only the title, description, and toggles can still be changed.

<DocsAlert type="tip">
        Use draft mode to prepare the session in advance and publish it at the right moment, especially if you want to double-check your game selection or event date.
</DocsAlert>

## Editing a Session

Session creators, moderators, and admins can edit a session from the session detail page or **Admin → Sessions**.

- **Draft sessions** — all fields are editable, including the game list.
- **Active sessions** — only the title, description, and event date can be changed. The game list is locked once voting is open.
- **Ended or completed sessions** — editing is disabled; the session can only be deleted.

## Renewing a Session

On a completed session's card in the community page, the session creator (and privileged roles) can click **Renew** to create a new draft session pre-populated with the same title and game options. This is useful for recurring game nights.

## Resolving a Tie

If voting ends with two or more options tied for the most votes, the session enters a tie state. Admins, moderators, and the session creator will see a **Resolve tie** prompt listing the tied options. Selecting one option declares it the winner and moves the session to `completed`.

<DocsAlert type="note">
        Sessions with an unresolved tie appear in the <strong>Needs Action</strong> tab of <strong>Admin → Sessions</strong> and on the community home page until resolved.
</DocsAlert>
