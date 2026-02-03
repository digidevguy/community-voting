<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageProps, PageServerData } from './$types';
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
	import { goto } from '$app/navigation';
	import { CircleChevronLeft } from '@lucide/svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let gameTypeValue: 'video_game' | 'board_game' | 'mixed' = $state('video_game');
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; title: string; type: string }>>([]);
	let selectedGames = $state<Array<{ id: string; title: string }>>([]);
	let startDate = $state<CalendarDate | undefined>();
	let gameDayDate = $state<CalendarDate | undefined>();
	let startTime = $state('10:30:00');
	let gameDayTime = $state('10:30:00');
	let isSubmitting = $state(false);

	let startDateOpen = $state(false);
	let gameDayOpen = $state(false);

	let gameTypeDisplay = $derived(
		gameTypeValue
			.replace(/_/g, ' ')
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	);

	let startDateTime = $derived.by(() => {
		if (!startDate || !startTime) return undefined;
		const date = startDate.toDate(getLocalTimeZone());
		const [hours, minutes, seconds] = startTime.split(':').map(Number);
		date.setHours(hours, minutes, seconds || 0);
		return date.toISOString();
	});
	let gameDayDateTime = $derived.by(() => {
		if (!gameDayDate || !gameDayTime) return undefined;
		const date = gameDayDate.toDate(getLocalTimeZone());
		const [hours, minutes, seconds] = gameDayTime.split(':').map(Number);
		date.setHours(hours, minutes, seconds || 0);
		return date.toISOString();
	});

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
		selectedGames = selectedGames.filter((g) => g.id !== gameId);
	}

	$inspect(startDateTime);
	$inspect(gameDayDateTime);
</script>

<h1 class="mb-4 text-xl font-semibold">Create a voting session</h1>
<Button href="/community/{data.communityId}" variant="outline"
	><CircleChevronLeft></CircleChevronLeft>Back</Button
>
<Separator class="my-4" />

{#if form && 'votingSessionId' in form && form.votingSessionId}
	<div class="rounded-md bg-green-50 p-4 dark:bg-green-950">
		<p class="text-sm font-medium text-green-800 dark:text-green-200">
			{form.message || 'Voting session created successfully!'}
		</p>
	</div>
{:else if form && 'message' in form && !form.votingSessionId}
	<div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
		<p class="text-sm font-medium text-red-800 dark:text-red-200">
			{form.message || 'An error occurred while creating the voting session.'}
		</p>
	</div>
{/if}

<form
	action="?/create"
	method="POST"
	use:enhance={() => {
		isSubmitting = true;
		return async ({ result, update }) => {
			isSubmitting = false;
			await update();
			const votingSessionId = result.type === 'success' ? result.data?.votingSessionId : undefined;
			if (votingSessionId) {
				selectedGames = [];
				setTimeout(() => {
					goto(`/voting/${votingSessionId}`);
				}, 1500);
			}
		};
	}}
	class="space-y-2"
>
	<div class="space-y-2">
		<Label for="title">Event title</Label>
		<Input id="title" name="title" />
	</div>
	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			name="description"
			placeholder="Add your description here."
			class=" bg-background"
		/>
	</div>
	<div class="space-y-2">
		<Label for="type">Game Type</Label>
		<Select.Root type="single" name="votingSessionType" bind:value={gameTypeValue}>
			<Select.Trigger class="w-full bg-background">
				{gameTypeDisplay}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="video_game">Video Games</Select.Item>
				<Select.Item value="board_game">Board Games</Select.Item>
				<Select.Item value="mixed">Mixed</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<input type="hidden" name="startDate" value={startDateTime} />
	<input type="hidden" name="gameDayDate" value={gameDayDateTime} />

	<!-- Obtain voting start date here -->
	<div class="flex justify-between">
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
						bind:value={startTime}
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
						bind:value={gameDayTime}
						type="time"
						id="gameDayDateTime"
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

<Separator class="my-4" />

<div class="flex flex-col space-y-4">
	<h2 class=" text-xl font-semibold">Add Games</h2>
	<form action="?/search" method="POST" use:enhance>
		<div class="flex gap-2">
			<Input id="search" name="query" placeholder="Search for games..." bind:value={searchQuery} />
			<Button type="submit">Search</Button>
		</div>
	</form>

	{#if searchResults.length > 0}
		<div class="space-y-2">
			{#each searchResults as game}
				<Card.Root class="py-2">
					<Card.Content>
						<div class="flex items-center justify-between">
							<Card.Title class="text-base">{game.title}</Card.Title>
							<Button size="sm" onclick={() => addGame(game)}>Add</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<p>No results yet...</p>
	{/if}

	{#if selectedGames.length > 0}
		<div>
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
	{/if}
</div>
