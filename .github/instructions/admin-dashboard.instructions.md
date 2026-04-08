---
description: 'Context for building the community admin dashboard - roles, route structure, authz patterns, and section requirements.'
applyTo: 'src/routes/community/[communityId]/admin/**, src/lib/server/**'
---

# Building the Admin Dashboard

## Description

I want an admin dashboard that's accessible to both admins and moderators. The dashboard should have different views and actions available conditioned on the user's role (moderator/admin). The dashboard should consist of the following areas:

- **Admin only** - Edit community details (community title, description, header_image)
- User management section
- Session management section (include archived session)
- Collection management (include soft removed games)

## User Management

This page should be a location to display the list of users tied to a community. The main purpose is general user management; a privileged user should be able to view:

- A user's name
- The user's role (`communityUser: role`)
- The user's join date (`communityUser: joinedAt`)
- Number of sessions that a user has participated in (requires a join of vote -> votingSession, no pre-aggregated column)

This area should allow privileged users to remove or ban users from the community, as well as elevate users to increase permissions along the following guidelines:

- Moderators are unable to elevate user permissions
- Admins can elevated users to moderator permissions
- The community owner can elevate users to admin permissions

### Schema gaps

There are gaps in the schema that will need to be address to support some of these points:

- There is not an "owner" role currently, this will need to be added to align the auth checks along a unified pattern
- There is nothing in the schema definition to support banning users from a community, will need to either add a "banned" boolean in the communityUser table or a new communityBan table to support this feature

## Session Management

This section is for general management of voting sessions, rendering a list of all sessions in a tabbed table that filters based on the status of the session (Includes all available statuses). Each row should display the session title, the created date, the creator, and a calculated column showing the remaining time in the voting window (in days and remaining hours).

> [!note]
> The current implementation would be a calculation between the startDate and the gameDayDate since there is currently not an endDate or votingDeadline column. This may be altered at a later date, but this will remain the current implementation.

The area allows for authorized users to perform CRUD operations for session management such as editing, or deleting/archiving multiple sessions at once, or clearing archived sessions entirely.

### Schema references

- Session status: `votingSessionStatus: draft | active | voting_ended | completed | archived | cancelled`

## Collection Management

This section allows for management of the community collection for authorized users, with the main difference between this section and the normal collections page being that the admin collection area will include all games, including items that were soft-removed by other users (and lists who removed the title). This area allows for a hard removal option for collection items.

### Schema references

- Soft-removed collection items: `communityCollections: isActive, removedBy, removedAt`

## Community Settings

This section is an **admin-only** area devoted to making community-level changes, such as:

- Community title
- Community description
- Community banner image (`header_image`)
- Toggle ability to invite/add new community members

### Schema gaps

This area will need schema changes to support the ability to toggle the invite ability. Specifically, this will require the addition of a `allowInvites` or similar column in the community table to handle this and will require a migration.

## Route structure

- admin/+layout.server.ts ← privileged guard (mod + admin)
- admin/+layout.svelte
- admin/+page.svelte ← overview
- admin/settings/ ← secondary admin-only guard
- admin/users/
- admin/sessions/
- admin/collection/

## Authz pattern

- When accessing the admin dashboard, the `+layout.server.ts` runs isPrivilegedRole() once to check for authorization, then forwards `userRole` and `community` to all children.
- `settings/+page.server.ts` will need a secondary check: `if (userRole !== 'admin') return error(403, {message: 'Unauthorized'});`
- Current implementation — Owner checks use `community.createdBy === locals.user.id`

## UI Conventions

The following patterns are established across the codebase and must be followed in the admin dashboard.

**Back-link**

- Use `CircleChevronLeft` icon from `@lucide/svelte` inside a `variant="ghost"` `Button`
- Classes: `-ml-2 text-muted-foreground`

**Tab navigation**

- Active item: `border-b-2 border-primary text-foreground rounded-none`
- Inactive items: `border-b-2 border-transparent text-muted-foreground rounded-none`
- Container: `<nav>` with `border-b`, inner `<ul>` with `flex overflow-x-auto` for mobile scrollability
- Use `page` from `$app/state` for active detection — `page.url.pathname === href` for exact matches, `page.url.pathname.startsWith(href)` for section roots

**Role-gated nav items**

- Build nav as a `$derived` array in `<script>`, not with `{#if}` in the template
- Use a conditional spread for role-gated entries: `...(isAdmin ? [{ href: ..., label: ... }] : [])`

**Component imports**

- Prefer `import { Button } from '$lib/components/ui/button'` over the direct `.svelte` file import
- For `buttonVariants`, import from `'$lib/components/ui/button/button.svelte'`
