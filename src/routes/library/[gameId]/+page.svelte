<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data }: { data: PageData } = $props();
</script>

{#if data.game}
	<img src={data.game.image} alt={data.game.title} class="mx-auto mb-4 rounded-sm" />
	<h1 class="text-2xl font-semibold">{data.game.title}</h1>
	<p>{data.game.description}</p>
	<div>
		<p>Developer: {data.game.developer}</p>
		<p>Pulisher: {data.game.publisher}</p>
		{#if data.game.releaseDate}
			<p>Release date: {format(data.game.releaseDate, 'MMM Mo, yyyy')}</p>
		{/if}
		{#if data.game.genres}
			<ul class="flex gap-2 p-2">
				{#each data.game.genres as genre}
					<li><Badge>{genre}</Badge></li>
				{/each}
			</ul>
		{/if}
	</div>
	<Button href="https://store.steampowered.com/app/{data.game.steamAppId}" target="_blank">
		Steam Page <ExternalLink />
	</Button>
{:else}
	<p>Game not found.</p>
{/if}
