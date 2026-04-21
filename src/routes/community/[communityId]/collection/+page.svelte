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
	import * as Avatar from '$lib/components/ui/avatar/';
	import * as Tooltip from '$lib/components/ui/tooltip/';
	import * as Collapsible from '$lib/components/ui/collapsible/';
	import { ChevronDown } from '@lucide/svelte';

	const PAGE_SIZE = 25;
	const SEARCH_THRESHOLD = 10;

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let newGame = $state<string | null>(null);
	let addDialogOpen = $state(false);
	let removeDialogOpen = $state<Record<string, boolean>>({});
	let loadedImages = $state<Record<string, boolean>>({});
	let ownersByGame = $derived(data.ownersByGame);

	let suggestedGames = $state(untrack(() => data.suggestedGames));
	let suggestionsOpen = $state(false);
	let searchQuery = $state('');
	let visibleCount = $state(PAGE_SIZE);
	let searching = $state(false);

	let selectedGame = $derived(form?.games?.find((g) => g.id === newGame) ?? null);

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
	<Button href="/community/{data.community.id}" variant="ghost" class="-ml-2 text-muted-foreground"
		><CircleChevronLeft />Back</Button
	>
	<Dialog.Root
		bind:open={addDialogOpen}
		onOpenChange={(open) => {
			if (!open) newGame = null;
		}}
	>
		<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
			><CirclePlus />Add new</Dialog.Trigger
		>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Add new game</Dialog.Title>
				<Dialog.Description>Search the game catalog and select a title to add.</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-3">
				<form
					method="POST"
					action="?/search"
					use:enhance={() => {
						searching = true;
						newGame = null;
						return async ({ update }) => {
							await update();
							searching = false;
						};
					}}
				>
					<Label for="searchTerm" class="mb-2">Game name</Label>
					<div class="flex gap-2">
						<Input id="searchTerm" name="searchTerm" placeholder="Search…" class="flex-1" />
						<Button type="submit" disabled={searching}>
							{#if searching}
								<LoaderCircle class="h-4 w-4 animate-spin" />
							{:else}
								Search
							{/if}
						</Button>
					</div>
				</form>
				{#if form?.message && !form?.games}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				{#if form?.games !== undefined}
					{#if form.games.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No games found.</p>
					{:else}
						<ul class="max-h-52 divide-y divide-border overflow-y-auto rounded-md border">
							{#each form.games as game (game.id)}
								<li>
									<button
										type="button"
										class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent {newGame ===
										game.id
											? 'bg-accent'
											: ''}"
										onclick={() => (newGame = newGame === game.id ? null : game.id)}
									>
										<span class="min-w-0 flex-1 truncate text-left">{game.title}</span>
										{#if newGame === game.id}
											<Check class="h-4 w-4 flex-shrink-0 text-primary" />
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
			<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:items-center">
				{#if selectedGame}
					<p class="flex-1 truncate text-xs text-muted-foreground sm:text-left">
						Adding: <span class="font-medium text-foreground">{selectedGame.title}</span>
					</p>
				{/if}
				<div class="flex justify-end gap-2">
					<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
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
						<Button type="submit" variant="default" disabled={!newGame}>Add to collection</Button>
					</form>
				</div>
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
				<Card.Footer class="my-2 flex flex-col gap-2">
					{@const owners = ownersByGame[item.game.id] ?? []}
					{#if owners.length}
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger class="self-start">
									<div class="flex items-center -space-x-2">
										{#each owners.slice(0, 3) as owner (owner.userId)}
											<Avatar.Root class="h-6 w-6 ring-2 ring-background">
												<Avatar.Image src={owner.image} alt={owner.name} />
												<Avatar.Fallback>{owner.name[0]}</Avatar.Fallback>
											</Avatar.Root>
										{/each}
										{#if owners.length > 3}
											<span class="pl-3 text-xs text-muted-foreground">
												+{owners.length - 3}
											</span>
										{/if}
									</div>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<ul class="space-y-0.5 text-xs">
										{#each owners as owner (owner.userId)}
											<li>{owner.name}</li>
										{/each}
									</ul>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}
					<div class="flex w-full items-center justify-between">
						<Button href="/library/{item.game.id}" variant="link" class="-ml-3"
							>View game details</Button
						>
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
									</form>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>

{#if suggestedGames.length > 0}
	<Separator class="my-6" />
	<Collapsible.Root bind:open={suggestionsOpen}>
		<Collapsible.Trigger
			class="flex w-full cursor-pointer items-center gap-2 text-sm font-medium select-none"
		>
			<ChevronDown
				class="h-4 w-4 text-muted-foreground transition-transform duration-200 {suggestionsOpen
					? 'rotate-180'
					: ''}"
			/>
			Suggestions from your library
			<Badge variant="secondary">{suggestedGames.length}</Badge>
		</Collapsible.Trigger>
		<Collapsible.Content class="mt-3 flex flex-col gap-3">
			<p class="text-xs text-muted-foreground">
				Games from your Steam library not yet in the community collection. Some titles may have
				limited details until their data has been enriched.
			</p>
			{#if suggestedGames.length > SEARCH_THRESHOLD}
				<div class="relative">
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
										submitting.delete(game.id);
										suggestedGames = suggestedGames.filter((g) => g.id !== game.id);
										toast.success(`${game.title} added to the collection!`);
										await update({ reset: false });
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
				<p class="text-center text-sm text-muted-foreground">No games match your search.</p>
			{/if}
			{#if visibleCount < filteredSuggestions.length}
				<div class="text-center">
					<Button variant="ghost" size="sm" onclick={() => (visibleCount += PAGE_SIZE)}>
						Show more ({filteredSuggestions.length - visibleCount} remaining)
					</Button>
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>
{/if}
