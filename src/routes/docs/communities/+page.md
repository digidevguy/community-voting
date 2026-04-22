<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Communities

Communities are the core organizational unit of Community Voting. Each community has its own collection of games, voting sessions, and member roster.

## Creating a Community

Navigate to [Communities](/community) and click **Create Community**. You will become the owner of the new community.

## Roles

| Role      | Description                                       |
| --------- | ------------------------------------------------- |
| Owner     | Full control — can manage admins and all settings |
| Admin     | Can manage members, sessions, and collections     |
| Moderator | Can manage sessions and collections               |
| Member    | Can vote and view community content               |

## Managing Members

Community owners and admins can invite, remove, or update the role of members from the admin dashboard.

<DocsAlert type="important">
	Role changes are permission-gated: moderators cannot elevate members, admins can promote to moderator, and only owners can promote to admin.
</DocsAlert>

## Settings

Admins can update the community title, description, and banner image from **Admin → Settings**.
