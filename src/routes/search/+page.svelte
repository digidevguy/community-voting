<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	$inspect(form);
</script>

<h1>Game Searches</h1>
<p>Search for games here.</p>
<div class="mt-2 rounded-sm border-2 border-indigo-600">
	<!-- Search form -->
	<form class="flex flex-col gap-2 p-4" method="POST" action="?/search" use:enhance>
		<input
			type="text"
			name="query"
			placeholder="Search for a game..."
			class="w-full rounded border border-gray-300 p-2"
		/>
		{#if form?.error}
			<p class="text-red-600">{form.error}</p>
		{/if}
		<button
			type="submit"
			class="mt-2 w-full rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700"
		>
			Search
		</button>
	</form>
	{#if form?.results?.length === 0}
		<p class="p-4">No results found.</p>
	{:else if form?.results && form?.results?.length > 0}
		<!-- Search results -->
		<ul class="border-t p-4">
			{#each form?.results as game}
				<li class="mb-2">
					<strong>{game.title}</strong>
				</li>
			{/each}
		</ul>
	{/if}
</div>
