<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { enhance } from '$app/forms';
	import { LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);

	const steamLinked = $derived(!!data.steamId);
</script>

<svelte:head>
	<title>Profile — Community Voting</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-0">
	<h1 class="text-2xl font-semibold tracking-tight">Profile</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Account</Card.Title>
			<Card.Description>Your account details.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-4">
				{#if data.user?.image}
					<img src={data.user.image} alt={data.user.name} class="h-14 w-14 shrink-0 rounded-full" />
				{/if}
				<div class="min-w-0">
					<p class="truncate font-medium">{data.user?.name}</p>
					<p class="truncate text-sm text-muted-foreground">{data.user?.email}</p>
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
		<Card.Content class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex min-w-0 items-center gap-2">
				{#if steamLinked}
					<Badge
						variant="outline"
						class="shrink-0 border-green-500 text-green-600 dark:text-green-400">Linked</Badge
					>
				{:else}
					<Badge variant="secondary">Not linked</Badge>
				{/if}
			</div>
			{#if !steamLinked}
				<Button href="/api/steam/initiate" class="w-full sm:w-auto">Link Steam Account</Button>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if steamLinked}
		<Card.Root>
			<Card.Header>
				<Card.Title>Steam Library</Card.Title>
				<Card.Description>
					Sync your collection so that it can be used by your communities. Your game list visibility
					<strong>must</strong> be set to public in your Steam privacy settings.
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<form
					action="?/syncLibrary"
					method="post"
					use:enhance={() => {
						loading = true;
						return async ({ result, update }) => {
							loading = false;
							if (result.type === 'failure') {
								toast.error((result.data?.message as string) ?? 'Unable to sync library');
							}
							if (result.type === 'success') {
								toast.success('Library synced successfully');
								await update();
							}
						};
					}}
				>
					<Button type="submit" disabled={loading} class="w-full sm:w-auto">
						{#if loading}
							<LoaderCircle class="animate-spin" />
							Syncing…
						{:else}
							Sync Library
						{/if}
					</Button>
				</form>
				{#if form?.synced !== undefined}
					<p class="text-sm text-muted-foreground">
						<span class="font-medium text-foreground">{form.synced}</span> games synced to your library.
					</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
