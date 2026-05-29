<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { House, RotateCcw } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Error {page.status} — Community Voting</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
	<div class="flex flex-col gap-2">
		<p class="text-sm font-medium tracking-widest text-muted-foreground uppercase">
			Error {page.status}
		</p>
		<h1 class="text-3xl font-bold tracking-tight">
			{#if page.status === 404}
				Page not found
			{:else if page.status === 403}
				Access denied
			{:else}
				Something went wrong
			{/if}
		</h1>
		{#if page.error?.message}
			<p class="mt-1 max-w-md text-sm text-muted-foreground">{page.error.message}</p>
		{/if}
	</div>

	<div class="flex flex-wrap items-center justify-center gap-3">
		<Button href="/" variant="default">
			<House class="mr-2 h-4 w-4" />
			Go home
		</Button>
		<Button onclick={() => history.back()} variant="outline">
			<RotateCcw class="mr-2 h-4 w-4" />
			Go back
		</Button>
	</div>
</div>
