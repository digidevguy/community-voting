<script lang="ts">
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import {
		Check,
		CircleChevronLeft,
		CirclePlus,
		Gamepad2,
		LoaderCircle,
		Plus,
		Search,
		Trash2
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	const PAGE_SIZE = 25;

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let newGame = $state<string | null>(null);
	let addDialogOpen = $state(false);
	let removeDialogOpen = $state<Record<string, boolean>>({});
	let loadedImages = $state<Record<string, boolean>>({});

	let suggestedGames = $state(untrack(() => data.suggestedGames));
	let searchQuery = $state('');
	let visibleCount = $state(PAGE_SIZE);

	let filteredSuggestions = $derived(
		searchQuery.trim().length === 0
			? suggestedGames
			: suggestedGames.filter((g) =>
					g.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
				)
	);
	let visibleSuggestions = $derived(filteredSuggestions.slice(0, visibleCount));
	let submitting = new SvelteSet<string>();

	function handleSearchInput(e: Event) {
		searchQuery = (e.currentTarget as HTMLInputElement).value;
		visibleCount = PAGE_SIZE;
	}
</script>

<svelte:head>
	<title>Collection — {data.community.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<h1 class="mb-4 text-xl font-semibold">Community Collection</h1>
<div class="flex items-center justify-between">
	<Button href="/community/{data.community.id}" variant="outline"
		><CircleChevronLeft></CircleChevronLeft>Back</Button
	>
	<Dialog.Root bind:open={addDialogOpen}>
		<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
			><CirclePlus />Add new</Dialog.Trigger
		>
		<Dialog.Content class="max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Add new game</Dialog.Title>
			</Dialog.Header>
			<div>
				<form method="POST" action="?/search" use:enhance>
					<Label for="searchTerm" class="mb-2">Game name</Label>
					<Input id="searchTerm" name="searchTerm" />
					<div class="my-2 text-right"><Button type="submit">Search</Button></div>
				</form>
				<ul>
					{#if form?.games}
						{#each form.games as game (game.id)}
							<li class="flex items-center justify-between">
								{game.title}
								<Button
									size="icon"
									variant="ghost"
									onclick={() => (newGame = newGame === game.id ? null : game.id)}
								>
									{#if newGame === game.id}
										<Check class="text-green-500" />
									{:else}
										<Plus />
									{/if}
								</Button>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
			<Dialog.Footer class="flex-row justify-end">
				<form
					method="POST"
					action="?/add"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								addDialogOpen = false;
								toast.success('Game added!');
							}

							await update();
						};
					}}
				>
					<input type="hidden" bind:value={newGame} name="gameId" />
					<Button type="submit" variant="default">Save</Button>
				</form>
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
<Separator class="my-4" />
<ul
	class="grid grid-cols-[repeat(auto-fit,minmax(theme(spacing.64),1fr))] place-items-center gap-2"
>
	{#each data.collection as item (item.game.id)}
		<li>
			<Card.Root class="max-w-sm gap-0 overflow-hidden py-0">
				<div class="relative aspect-[460/215] w-full overflow-hidden">
					{#if !loadedImages[item.game.id]}
						<Skeleton class="absolute inset-0 h-full w-full rounded-none" />
					{/if}
					<img
						src={item.game.image}
						alt={item.game.title}
						width="460"
						height="215"
						loading="lazy"
						decoding="async"
						class="aspect-[460/215] w-full object-cover transition-opacity duration-300 {loadedImages[
							item.game.id
						]
							? 'opacity-100'
							: 'opacity-0'}"
						onload={() => (loadedImages[item.game.id] = true)}
					/>
				</div>
				<Card.Footer class="my-2 flex justify-between">
					<Button href="/library/{item.game.id}" variant="link">View game details</Button>
					<Dialog.Root
						open={removeDialogOpen[item.game.id] ?? false}
						onOpenChange={(open) => {
							removeDialogOpen[item.game.id] = open;
						}}
					>
						<Dialog.Trigger><Trash2 class="text-red-500" /></Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Delete collection item?</Dialog.Title>
							<Dialog.Description>Are you sure you want to do this?</Dialog.Description>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
								<form
									method="POST"
									action="?/remove"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												removeDialogOpen[item.game.id] = false;
												toast.success('Game removed successfully!');
											}

											await update();
										};
									}}
								>
									<input type="hidden" value={item.game.id} name="gameId" />
									<Button aria-label="Remove" variant="destructive" type="submit">Delete</Button>
								</form></Dialog.Footer
							>
						</Dialog.Content>
					</Dialog.Root>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>

{#if suggestedGames.length > 0}
	<Separator class="my-6" />
	<details class="group">
		<summary
			class="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm font-medium select-none"
		>
			<CirclePlus class="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-45" />
			Suggestions from your library
			<Badge variant="secondary">{suggestedGames.length}</Badge>
		</summary>
		<p class="mb-3 text-xs text-muted-foreground">
			Games from your Steam library not yet in the community collection. Some titles may have
			limited details until their data has been enriched.
		</p>
		{#if suggestedGames.length >= PAGE_SIZE}
			<div class="relative mb-3">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Search your library…"
					value={searchQuery}
					oninput={handleSearchInput}
					class="pl-9"
				/>
			</div>
		{/if}
		<ul class="divide-y divide-border rounded-md border">
			{#each visibleSuggestions as game (game.id)}
				<li class="flex items-center gap-3 px-3 py-2">
					{#if game.image}
						<img
							src={game.image}
							alt={game.title}
							width="64"
							height="30"
							loading="lazy"
							decoding="async"
							class="aspect-[460/215] w-16 flex-shrink-0 rounded object-cover"
						/>
					{:else}
						<div
							class="flex h-[30px] w-16 flex-shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
						>
							<Gamepad2 class="h-4 w-4" />
						</div>
					{/if}
					<span class="min-w-0 flex-1 truncate text-sm">{game.title}</span>
					<form
						method="POST"
						action="?/add"
						use:enhance={() => {
							submitting.add(game.id);
							return async ({ result, update }) => {
								if (result.type === 'success') {
									suggestedGames = suggestedGames.filter((g) => g.id !== game.id);
									toast.success(`${game.title} added to the collection!`);
								} else {
									submitting.delete(game.id);
									await update();
								}
							};
						}}
					>
						<input type="hidden" value={game.id} name="gameId" />
						<Button size="sm" variant="outline" type="submit" disabled={submitting.has(game.id)}>
							{#if submitting.has(game.id)}
								<LoaderCircle class="h-3 w-3 animate-spin" />Adding…
							{:else}
								<Plus class="h-3 w-3" />Add
							{/if}
						</Button>
					</form>
				</li>
			{/each}
		</ul>
		{#if filteredSuggestions.length === 0 && searchQuery.trim().length > 0}
			<p class="mt-3 text-center text-sm text-muted-foreground">No games match your search.</p>
		{/if}
		{#if visibleCount < filteredSuggestions.length}
			<div class="mt-3 text-center">
				<Button variant="ghost" size="sm" onclick={() => (visibleCount += PAGE_SIZE)}>
					Show more ({filteredSuggestions.length - visibleCount} remaining)
				</Button>
			</div>
		{/if}
	</details>
{/if}
