<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Admin Guide

The admin dashboard is accessible to community admins and moderators. Some areas are restricted to admins or the community owner only.

## Dashboard Areas

| Section     | Moderator | Admin | Owner |
| ----------- | --------- | ----- | ----- |
| Sessions    | ✓         | ✓     | ✓     |
| Collections | ✓         | ✓     | ✓     |
| Users       | View only | ✓     | ✓     |
| Invites     | ✓         | ✓     | ✓     |
| Settings    | —         | ✓     | ✓     |

## User Management

Admins can view all community members, their roles, join date, and session participation. Actions available:

- **Remove** a user from the community
- **Ban** a user
- **Elevate** a member to moderator (admin) or admin (owner only)
- **Make permanent** — converts a temporary member to a permanent one, removing the expiry date

<DocsAlert type="warning">Moderators cannot change any user's role.</DocsAlert>

### Temporary Members

A member shown with a clock icon joined via a time-limited invite. Their membership expires automatically. Hover over the clock to see the expiry date. Admins and owners can select **Make permanent** to remove the expiry and grant full membership.

## Session Management

View all sessions grouped by status. You can **edit**, **end voting**, or **delete** any session from the actions menu on each row.

### Needs Action

The **Needs Action** tab surfaces sessions that require attention:

- **Tied sessions** — voting has ended with no clear winner. Select the session and use the **Resolve tie** option to pick the winning option manually.
- **Missing winner data** — the session is completed but no player winner has been logged yet. Select **Log winners** to record who won that game night.

<DocsAlert type="tip">
        Keep the Needs Action list clear after each game night so leaderboard standings stay accurate.
</DocsAlert>

## Invite Management

The **Invites** section lets admins and moderators create and manage shareable invite links. When creating an invite you can set a label, expiry, use limit, the role new members receive, and an optional membership duration for temporary access. Existing invites can be edited or revoked. Use **Clear inactive** to bulk-remove expired, revoked, and exhausted invite links.

See [Communities → Invite Links](/docs/communities#invite-links) for a full description of each option.

## Community Settings

Available to admins and the community owner. Controls the community title, description, and banner image.

## Member Permissions

The **Member Permissions** card in Settings lets admins toggle two community-wide rules:

| Permission                              | Default | Effect when off                                    |
| --------------------------------------- | ------- | -------------------------------------------------- |
| Allow members to create voting sessions | On      | Only moderators and admins can create sessions     |
| Allow members to manage the collection  | On      | Only moderators and admins can add or remove games |

<DocsAlert type="note">
        These settings apply to regular permanent members only. Moderators and admins are always unrestricted. Temporary members are always restricted regardless of these toggles.
</DocsAlert>
