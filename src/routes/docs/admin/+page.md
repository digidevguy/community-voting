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
| Settings    | —         | ✓     | ✓     |

## User Management

Admins can view all community members, their roles, join date, and session participation. Actions available:

- **Remove** a user from the community
- **Ban** a user
- **Elevate** a member to moderator (admin) or admin (owner only)

<DocsAlert type="warning">Moderators cannot change any user's role.</DocsAlert>

## Session Management

View all sessions grouped by status. Bulk actions allow archiving or deleting multiple sessions. Archived sessions can be cleared entirely.

## Community Settings

Available to admins and the community owner. Controls the community title, description, banner image, and whether new members can be invited.
