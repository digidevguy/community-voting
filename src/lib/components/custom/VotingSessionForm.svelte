<script lang="ts" generics="TForm extends { votingSessionId?: string | null; message?: string | null; success?: boolean } | null | undefined">
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input/index.js';	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { CalendarDate, getLocalTimeZone } from '@internationalized/date';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	interface InitialData {
		title?: string;
		description?: string;
		votingSessionType?: 'video_game' | 'board_game' | 'mixed';
		startDate?: Date | string | null;
		gameDayDate?: Date | string | null;
		selectedGameIds?: string[];
	}

	let {
		initialData,
		collection,
		action,
		form
	}: {
		initialData?: InitialData;
		collection: Array<{ game: { id: string; title: string; type: string } }>;
		action: string;
		form: TForm;
	} = $props();

	function toCalendarDate(date: Date | string | null | undefined): CalendarDate | undefined {
		if (!date) return undefined;
		const d = typeof date === 'string' ? new Date(date) : date;
		return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
	}

	function toTimeString(date: Date | string | null | undefined): string {
		if (!date) return '10:30:00';
		const d = typeof date === 'string' ? new Date(date) : date;
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
	}

	// Form data - initialized from initialData if provided (untrack captures initial-only snapshot)
	let gameTypeValue: 'video_game' | 'board_game' | 'mixed' = $state(
		untrack(() => initialData?.votingSessionType ?? 'video_game')
	);
	let searchQuery = $state('');
	let selectedGames = $state<Array<{ id: string; title: string }>>(
		untrack(() =>
			initialData?.selectedGameIds
				? collection
						.map((e) => e.game)
						.filter((g) => initialData!.selectedGameIds!.includes(g.id))
						.map((g) => ({ id: g.id, title: g.title }))
				: []
		)
	);
	let startDate = $state<CalendarDate | undefined>(
		untrack(() => toCalendarDate(initialData?.startDate))
	);
	let gameDayDate = $state<CalendarDate | undefined>(
		untrack(() => toCalendarDate(initialData?.gameDayDate))
	);
	let startTime = $state(untrack(() => toTimeString(initialData?.startDate)));
	let gameDayTime = $state(untrack(() => toTimeString(initialData?.gameDayDate)));

	// UI state
	let isSubmitting = $state(false);
	let dateValidationMessage = $state<string | null>(null);
	let startDateOpen = $state(false);
	let gameDayOpen = $state(false);
	let redirectTo = $state<string | null>(null);

	$effect(() => {
		if (!redirectTo) return;
		const target = redirectTo;
		const timer = setTimeout(() => window.location.assign(target), 2000);
		return () => clearTimeout(timer);
	});

	let isEditMode = $derived(!!initialData);
	let submitLabel = $derived(isEditMode ? 'Save Changes' : 'Create Session');

	let gameTypeDisplay = $derived(
		gameTypeValue
			.replace(/_/g, ' ')
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	);

	let searchResults = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		const selectedIds = new Set(selectedGames.map((game) => game.id));

		const collectionGames = collection
			.map((entry) => entry.game)
			.filter((game) => !selectedIds.has(game.id));

		const matches = query
			? collectionGames.filter((game) => game.title.toLowerCase().includes(query))
			: collectionGames;

		return matches
			.slice(0, 10)
			.map((game) => ({ id: game.id, title: game.title, type: game.type }));
	});

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

	let hasPastStartDateTime = $derived.by(() => {
		if (!startDateTime) return false;
		return new Date(startDateTime).getTime() < Date.now();
	});

	let hasPastGameDayDateTime = $derived.by(() => {
		if (!gameDayDateTime) return false;
		return new Date(gameDayDateTime).getTime() < Date.now();
	});

	let isGameDayBeforeStartDateTime = $derived.by(() => {
		if (!startDateTime || !gameDayDateTime) return false;
		return new Date(gameDayDateTime).getTime() < new Date(startDateTime).getTime();
	});

	function addGame(game: { id: string; title: string }) {
		if (!selectedGames.find((g) => g.id === game.id)) {
			selectedGames = [...selectedGames, game];
		}
		searchQuery = '';
	}

	function removeGame(gameId: string) {
		selectedGames = selectedGames.filter((g) => g.id !== gameId);
	}
</script>

{#if form && 'message' in form && !form.votingSessionId}
	<div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
		<p class="text-sm font-medium text-red-800 dark:text-red-200">
			{form.message || 'An error occurred.'}
		</p>
	</div>
{/if}

<form
	{action}
	method="POST"
	use:enhance={({ cancel }) => {
		dateValidationMessage = null;

		if (hasPastStartDateTime) {
			dateValidationMessage = 'Voting start date/time cannot be in the past.';
			cancel();
			return;
		}

		if (hasPastGameDayDateTime) {
			dateValidationMessage = 'Game day date/time cannot be in the past.';
			cancel();
			return;
		}

		if (isGameDayBeforeStartDateTime) {
			dateValidationMessage =
				'Game day date/time must be the same as or after voting start date/time.';
			cancel();
			return;
		}

		isSubmitting = true;
		return async ({ result, update }) => {
			isSubmitting = false;
			await update();
			const votingSessionId = result.type === 'success' ? result.data?.votingSessionId : undefined;
			if (votingSessionId) {
				toast.success(isEditMode ? 'Voting session updated!' : 'Voting session created!');
				selectedGames = [];
				redirectTo = `/voting/${votingSessionId}`;
			}
		};
	}}
	class="space-y-2"
>
	{#if dateValidationMessage}
		<div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
			<p class="text-sm font-medium text-red-800 dark:text-red-200">
				{dateValidationMessage}
			</p>
		</div>
	{/if}

	<div class="space-y-2">
		<Label for="title">Event title</Label>
		<Input id="title" name="title" value={initialData?.title ?? ''} />
	</div>
	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			name="description"
			placeholder="Add your description here."
			class="bg-background"
			value={initialData?.description ?? ''}
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

	<!-- Voting start date -->
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

		<!-- Game day date -->
		<div class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold">Game day date</h2>
			<div class="flex gap-4">
				<div class="flex flex-col gap-3">
					<Label for="gameDaydate" class="px-1">Date</Label>
					<Popover.Root bind:open={gameDayOpen}>
						<Popover.Trigger id="gameDayDate">
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

	<Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
</form>

<Separator class="my-4" />

<div class="flex flex-col space-y-4">
	<h2 class="text-xl font-semibold">Add Games</h2>
	<div class="flex gap-2">
		<Input id="search" name="query" placeholder="Search for games..." bind:value={searchQuery} />
	</div>

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
		<p>No matching games in this community collection.</p>
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
