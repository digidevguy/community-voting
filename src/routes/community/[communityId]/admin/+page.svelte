<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Users, CalendarDays, Library, Activity } from '@lucide/svelte';
</script>

<div class="mb-4">
	<h2 class="text-lg font-semibold">Overview</h2>
	<p class="text-sm text-muted-foreground">
		Community stats and activity summary — full data coming soon.
	</p>
</div>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Members</Card.Title>
			<Users class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">— pending</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Active Sessions</Card.Title>
			<Activity class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">— pending</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Total Sessions</Card.Title>
			<CalendarDays class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">— pending</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Collection Size</Card.Title>
			<Library class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">— pending</p>
		</Card.Content>
	</Card.Root>
</div>
