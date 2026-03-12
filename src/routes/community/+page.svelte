<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data }: { data: PageData } = $props();
</script>

<h1>Communities</h1>
{#await data.communities}
	<p></p>
{:then communities}
	{#each communities as item (item.community.id)}
		<div>
			<h2>{item.community.title}</h2>
			<p>{item.community.description || 'No description'}</p>
			<Button href="/community/{item.community.id}">View</Button>
		</div>
	{/each}
{:catch error}
	<p>Error loading communities: {error.message}</p>
{/await}
