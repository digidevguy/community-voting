<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { Input } from '$lib/components/ui/input/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { getLocalTimeZone } from '@internationalized/date';
	import type { CalendarDate } from '@internationalized/date';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover/index.js';

	let { data, form }: PageProps = $props();

	let selectValue: 'videoGame' | 'boardGame' | 'mixed' | undefined = $state(undefined);
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; title: string; type: string }>>([]);
	let selectedGames = $state<Array<{ id: string; title: string }>>([]);

	const id = $props.id();

	let open = $state(false);
	let value = $state<CalendarDate | undefined>();

	$effect(() => {
		if (form?.games) {
			searchResults = form.games;
		}
	});

	function addGame(game: { id: string; title: string }) {
		if (!selectedGames.find((g) => g.id === game.id)) {
			selectedGames = [...selectedGames, game];
		}
		searchQuery = '';
		searchResults = [];
	}

	function removeGame(gameId: string) {
		selectedGames = selectedGames.filter((g) => g.id === gameId);
	}

	$inspect(searchQuery);
	$inspect(searchResults);
	$inspect(selectedGames);
	$inspect(form);
</script>

<section class="space-y-2">
	<h1 class="text-3xl font-semibold">Create a voting session</h1>
	<form action="?/create" method="POST" use:enhance class="space-y-2">
		<div>
			<Label for="title">Event title</Label>
			<Input id="title" name="title" />
		</div>
		<div>
			<Label for="description">Description</Label>
			<Textarea id="description" name="description" placeholder="Add your description here." />
		</div>
		<div>
			<Label for="type">Game Type</Label>
			<Select.Root type="single" bind:value={selectValue} name="type">
				<Select.Trigger>Select a game type</Select.Trigger>
				<Select.Content>
					<Select.Item value="videoGame">Video Games</Select.Item>
					<Select.Item value="boardGame">Board Games</Select.Item>
					<Select.Item value="mixed">Mixed</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
		<!-- Obtain voting start date here -->

		<!-- Game day date here -->

		{#each selectedGames as game}
			<input type="hidden" name="gameIds" value={game.id} />
		{/each}

		<Button type="submit">Create Session</Button>
	</form>

	<Separator />

	<div class="mt-6">
		<h2 class="mb-4 text-xl font-semibold">Add Games</h2>
		<form action="?/search" method="POST" use:enhance>
			<div class="flex gap-2">
				<Input
					id="search"
					name="query"
					placeholder="Search for games..."
					bind:value={searchQuery}
				/>
				<Button type="submit">Search</Button>
			</div>
		</form>

		{#if searchResults.length > 0}
			<div class="mt-4 space-y-2">
				{#each searchResults as game}
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<Card.Title class="text-base">{game.title}</Card.Title>
								<Button size="sm" onclick={() => addGame(game)}>Add</Button>
							</div>
						</Card.Header>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<p>No results yet...</p>
		{/if}

		{#if selectedGames.length > 0}
			<div class="mt-6">
				<h3 class="mb-2 font-semibold">Selected Games ({selectedGames.length})</h3>
				<ul class="space-y-2">
					{#each selectedGames as game}
						<li class="flex items-center justify-between rounded border p-2">
							<span>{game.title}</span>
							<Button size="sm" variant="destructive" onclick={() => removeGame(game.id)}>
								Remove
							</Button>
						</li>
					{/each}
				</ul>
			</div>
		{:else}
			<p>No selection</p>
		{/if}
	</div>
</section>
