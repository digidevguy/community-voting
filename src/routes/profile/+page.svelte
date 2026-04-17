<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();

	const steamLinked = $derived(!!data.steamId);
</script>

<svelte:head>
	<title>Profile — Community Voting</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1>Profile</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Account</Card.Title>
			<Card.Description>Your account details.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				{#if data.user?.image}
					<img src={data.user.image} alt={data.user.name} class="h-12 w-12 rounded-full" />
				{/if}
				<div>
					<p class="font-medium">{data.user?.name}</p>
					<p class="text-sm text-muted-foreground">{data.user?.email}</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Steam</Card.Title>
			<Card.Description>
				Link your Steam account to sync your game library with communities.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				{#if steamLinked}
					<Badge variant="default">Linked</Badge>
					<span class="font-mono text-sm text-muted-foreground">{data.steamId}</span>
				{:else}
					<Badge variant="secondary">Not linked</Badge>
				{/if}
			</div>
			{#if !steamLinked}
				<Button href="/api/steam/initiate">Link Steam Account</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
