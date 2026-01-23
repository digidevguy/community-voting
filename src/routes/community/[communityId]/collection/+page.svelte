<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	let { data } = $props();

	$inspect(data);
</script>

<h1>Community Collection</h1>
<ul
	class="grid grid-cols-[repeat(auto-fit,minmax(theme(spacing.64),1fr))] place-items-center gap-4"
>
	{#each data.collection as item}
		<li>
			<Card.Root class="flex w-full max-w-sm place-items-center px-4">
				<h2>{item.game.title}</h2>
			</Card.Root>
		</li>
	{/each}
</ul>
