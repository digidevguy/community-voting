<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Users } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>My Communities</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<h1>Communities</h1>

	{#await data.communities}
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each [0, 1, 2] as i (i)}
				<li class="h-44 animate-pulse rounded-lg bg-muted"></li>
			{/each}
		</ul>
	{:then communities}
		{#if communities.length === 0}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center"
			>
				<Users class="h-10 w-10 text-muted-foreground" />
				<p class="text-sm font-medium">You're not in any communities yet.</p>
				<p class="text-xs text-muted-foreground">Ask a friend for an invite link to get started.</p>
			</div>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2">
				{#each communities as item (item.community.id)}
					<li>
						<Card.Root
							class="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
						>
							{#if item.community.header_image}
								<img
									src={item.community.header_image}
									alt="{item.community.title} banner"
									class="-mt-6 h-32 w-full object-cover"
								/>
							{/if}
							<Card.Header class="flex-1">
								<div class="flex items-start justify-between gap-2">
									<Card.Title class="text-base leading-snug">{item.community.title}</Card.Title>
									<Badge variant="secondary" class="shrink-0 capitalize">
										{item.community_user.role}
									</Badge>
								</div>
								<Card.Description class="line-clamp-3">
									{item.community.description || 'No description provided.'}
								</Card.Description>
							</Card.Header>
							<Card.Footer>
								<Button href="/community/{item.community.id}" class="w-full">View Community</Button>
							</Card.Footer>
						</Card.Root>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p class="text-sm text-destructive">Error loading communities: {error.message}</p>
	{/await}
</div>
