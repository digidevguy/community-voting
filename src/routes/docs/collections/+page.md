<script>
	import DocsAlert from '$lib/components/custom/DocsAlert.svelte';
</script>

# Collections

Each community maintains a shared game collection that feeds into voting sessions.

## Adding Games

Any member with sufficient permissions can add games to the community collection by searching the Steam library integration.

## Removing Games

Games can be soft-removed from the collection, hiding them from general view while preserving historical voting data. Soft-removed games remain visible to admins in **Admin → Collections**.

<DocsAlert type="warning">
	Use hard delete carefully in the admin collection view. Soft removal is safer when you may need to restore a title later.
</DocsAlert>

## Admin Collection View

The admin collection view shows all games including soft-removed titles, who removed them, and when. Admins can restore or permanently delete games from this view.
