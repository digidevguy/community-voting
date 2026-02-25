<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { ExternalLink } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { format } from 'date-fns';

	let { data }: { data: PageData } = $props();
</script>

{#if data.game}
	<img src={data.game.image} alt={data.game.title} />
	<h1>{data.game.title}</h1>
	<p>{data.game.description}</p>
	<div>
		<p>{data.game.developer}</p>
		<p>{data.game.publisher}</p>
		{#if data.game.releaseDate}
			<p>{format(data.game.releaseDate, 'MMM Mo, yyyy')}</p>
		{/if}
		{#if data.game.genres}
			<ul>
				{#each data.game.genres as genre}
					<!-- Todo: convert to badges -->
					<li>{genre}</li>
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
