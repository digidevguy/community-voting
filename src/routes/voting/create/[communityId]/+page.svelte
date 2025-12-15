<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { Input } from '$lib/components/ui/input/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { getLocalTimeZone } from '@internationalized/date';
	import { CalendarDate } from '@internationalized/date';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';

	let { data, form }: PageProps = $props();

	let selectValue: 'videoGame' | 'boardGame' | 'mixed' | undefined = $state(undefined);
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; title: string; type: string }>>([]);
	let selectedGames = $state<Array<{ id: string; title: string }>>([]);
	let startDate = $state<CalendarDate | undefined>();
	let gameDayDate = $state<CalendarDate | undefined>();

	let startDateOpen = $state(false);
	let gameDayOpen = $state(false);

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
		<div class="flex justify-center gap-6">
			<div class="flex flex-col gap-2">
				<h2 class="text-lg font-semibold">Voting start date</h2>
				<div class="flex gap-4">
					<div class="flex flex-col gap-3">
						<Label for="startDate-date" class="px-1">Date</Label>
						<Popover.Root bind:open={startDateOpen}>
							<Popover.Trigger id="startDate">
								{#snippet child({ props })}
									<Button {...props} class="w-32 justify-between font-normal" variant="outline">
										{startDate
											? startDate.toDate(getLocalTimeZone()).toLocaleDateString()
											: 'Select date'}
										<ChevronDownIcon />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto overflow-hidden p-0" align="start">
								<Calendar
									type="single"
									bind:value={startDate}
									onValueChange={() => (startDateOpen = false)}
									captionLayout="dropdown"
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
					<div class="flex flex-col gap-3">
						<Label class="px-1" id="startDateTime">Time</Label>
						<Input
							class="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
							step="1"
							value="10:30:00"
							type="time"
							id="startDateTime"
						/>
					</div>
				</div>
			</div>

			<!-- Game day date here -->
			<div class="flex flex-col gap-2">
				<h2 class="text-lg font-semibold">Game day date</h2>
				<div class="flex gap-4">
					<div class="flex flex-col gap-3">
						<Label for="gameDaydate" class="px-1">Date</Label>
						<Popover.Root bind:open={gameDayOpen}>
							<Popover.Trigger id="startDate">
								{#snippet child({ props })}
									<Button {...props} class="w-32 justify-between font-normal" variant="outline">
										{gameDayDate
											? gameDayDate.toDate(getLocalTimeZone()).toLocaleDateString()
											: 'Select date'}
										<ChevronDownIcon />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto overflow-hidden p-0" align="start">
								<Calendar
									type="single"
									bind:value={gameDayDate}
									onValueChange={() => (gameDayOpen = false)}
									captionLayout="dropdown"
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
					<div class="flex flex-col gap-3">
						<Label class="px-1" id="gameDayDateTime">Time</Label>
						<Input
							class="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
							step="1"
							value="10:30:00"
							type="time"
							id="startDateTime"
						/>
					</div>
				</div>
			</div>
		</div>

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
