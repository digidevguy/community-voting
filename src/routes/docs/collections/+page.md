<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Collections

Each community maintains a shared game collection that feeds into voting sessions.

## Browsing the Collection

The collection page shows all active games available for voting. Each game card displays the game image, title, and stats (how many times it has been used in sessions and how many times it has won). Ownership badges indicate which community members own that game in their linked Steam library.

## Steam Library Suggestions

If you have linked your Steam account, the collection page surfaces a **Suggested games** section showing titles from your Steam library that are not yet in the community collection. You can add any suggested game directly from this view (if you have permission to manage the collection).

## Adding Games

Members with collection management permission can add games by opening the **Add new** dialog and searching the Steam catalog. Select a game from the results and confirm to add it.

<DocsAlert type="note">
        Whether regular members can add games is controlled by the community's <strong>Member Permissions</strong> setting. Temporary members cannot add games regardless of that setting. See <a href="/docs/admin#member-permissions">Admin → Member Permissions</a> for details.
</DocsAlert>

## Removing Games

Games can be soft-removed from the collection, hiding them from general view while preserving historical voting data. Soft-removed games remain visible to admins in **Admin → Collections**.

<DocsAlert type="warning">
        Use hard delete carefully in the admin collection view. Soft removal is safer when you may need to restore a title later.
</DocsAlert>

## Admin Collection View

The admin collection view shows all games including soft-removed titles, who removed them, and when. The view also shows how many times each game has been used in sessions and how many times it has won. Admins can restore or permanently delete games from this view.
