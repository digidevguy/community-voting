<script lang="ts">
	import { ExternalLink, CircleChevronLeft } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	{#if data.game}
		<title>{data.game.title} — Community Voting</title>
		<meta
			name="description"
			content={data.game.description
				? data.game.description.slice(0, 160)
				: `${data.game.title} on Community Voting.`}
		/>
		<meta property="og:title" content="{data.game.title} — Community Voting" />
		<meta
			property="og:description"
			content={data.game.description
				? data.game.description.slice(0, 160)
				: `${data.game.title} on Community Voting.`}
		/>
		<meta property="og:type" content="website" />
		{#if data.game.image}
			<meta property="og:image" content={data.game.image} />
			<meta name="twitter:card" content="summary_large_image" />
		{/if}
	{:else}
		<title>Game Not Found — Community Voting</title>
	{/if}
</svelte:head>

<div class="flex flex-col gap-6">
	<nav>
		<Button onclick={() => history.back()} variant="outline">
			<CircleChevronLeft />Back
		</Button>
	</nav>

	{#if data.game}
		<div class="flex flex-col gap-6 sm:flex-row sm:gap-8">
			{#if data.game.image}
				<img
					src={data.game.image}
					alt={data.game.title}
					width="460"
					height="215"
					decoding="async"
					class="w-full rounded-lg object-cover sm:w-48 sm:self-start"
				/>
			{/if}
			<div class="flex flex-1 flex-col gap-4">
				<div>
					<h1 class="mb-1 text-2xl font-semibold">{data.game.title}</h1>
					{#if data.game.genres}
						<ul class="flex flex-wrap gap-2">
							{#each data.game.genres as genre (genre)}
								<li><Badge variant="secondary">{genre}</Badge></li>
							{/each}
						</ul>
					{/if}
				</div>

				{#if data.game.description}
					<p class="text-sm text-muted-foreground">{data.game.description}</p>
				{/if}

				<Card.Root>
					<Card.Content class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
						{#if data.game.developer}
							<div>
								<p class="text-xs text-muted-foreground">Developer</p>
								<p class="font-medium">{data.game.developer}</p>
							</div>
						{/if}
						{#if data.game.publisher}
							<div>
								<p class="text-xs text-muted-foreground">Publisher</p>
								<p class="font-medium">{data.game.publisher}</p>
							</div>
						{/if}
						{#if data.game.releaseDate}
							<div>
								<p class="text-xs text-muted-foreground">Release Date</p>
								<p class="font-medium">{format(data.game.releaseDate, 'MMM do, yyyy')}</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				{#if data.game.steamAppId}
					<div>
						<Button
							href="https://store.steampowered.com/app/{data.game.steamAppId}"
							target="_blank"
							variant="outline"
						>
							Steam Page <ExternalLink />
						</Button>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">Game not found.</p>
	{/if}
</div>
