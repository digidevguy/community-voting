<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Communities

Communities are the core organizational unit of Community Voting. Each community has its own collection of games, voting sessions, and member roster.

## Creating a Community

Navigate to [Communities](/community) and click **Create Community**. You will become the owner of the new community.

## Joining a Community

Communities are invitation-only. To join, you need an invite link from a current member. Follow the link, sign in with Discord if you haven't already, and click **Join Community**.

If the invite was created with a membership duration, you will see a notice explaining when your temporary membership expires. A moderator or admin can convert your membership to permanent at any time.

## Roles

| Role      | Description                                       |
| --------- | ------------------------------------------------- |
| Owner     | Full control — can manage admins and all settings |
| Admin     | Can manage members, sessions, and collections     |
| Moderator | Can manage sessions and collections               |
| Member    | Can vote and view community content               |

<DocsAlert type="important">
        Role changes are permission-gated: moderators cannot elevate members, admins can promote to moderator, and only owners can promote to admin.
</DocsAlert>

## Invite Links

Members, moderators, and admins can create invite links from the **Invites** page inside the community. When creating an invite you can configure:

| Option | Description |
| ------ | ----------- |
| **Label** | An optional name for the link (e.g. "Game night guests") |
| **Expiry** | When the link stops working — 30 min, 1 h, 6 h, 12 h, 1 day, 7 days, or never |
| **Max uses** | How many times the link can be used before it deactivates |
| **Role** | Whether new members join as Member or Moderator |
| **Membership duration** | Optional — 7, 14, 30, or 90 days; after expiry the member is automatically removed |

Invite creators and privileged roles can **edit** an existing invite's label, expiry, and use limit, or **revoke** it at any time. Expired, revoked, and used-up links can be bulk-cleared with the **Clear inactive** action.

## Temporary Memberships

When someone joins through a time-limited invite, their access automatically expires after the set duration. Temporary members can vote but cannot create voting sessions or add/remove games from the collection. An admin or moderator can make the membership permanent from **Admin → Users** by selecting **Make permanent** next to the member.

## Managing Members

Community owners and admins can update member roles or remove members from **Admin → Users**. See the [Admin Guide](/docs/admin) for full details.

## Notifications

Each community has a notification bell accessible from the community page. It shows alerts for new sessions, vote reminders, and session results. Click the bell to view community-scoped notifications or manage your push notification settings.

## Settings

Admins can update the community title, description, and banner image from **Admin → Settings**. The Settings page also controls [member permissions](/docs/admin#member-permissions) for session creation and collection management.
