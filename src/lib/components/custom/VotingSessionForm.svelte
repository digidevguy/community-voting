<script
	lang="ts"
	generics="TForm extends { message?: string | null; success?: boolean; errors?: Record<string, string[]> | null } | null | undefined"
>
	import { enhance, applyAction } from '$app/forms';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import XIcon from '@lucide/svelte/icons/x';

	interface InitialData {
		id?: string;
		title?: string;
		description?: string;
		votingSessionType?: 'video_game' | 'board_game' | 'mixed';
		startDate?: Date | string | null;
		gameDayDate?: Date | string | null;
		selectedGameIds?: string[];
		status?: 'draft' | 'active' | 'voting_ended' | 'completed' | 'archived' | 'cancelled';
	}

	interface CollectionEntry {
		game: {
			id: string;
			title: string;
			type: string;
		};
	}

	interface UserCollectionGame {
		id: string;
		title: string;
		type: string;
	}

	let {
		initialData,
		collection,
		userCollection = [],
		action,
		form
	}: {
		initialData?: InitialData;
		collection: CollectionEntry[];
		userCollection?: UserCollectionGame[];
		action: string;
		form: TForm;
	} = $props();

	const DURATION_OPTIONS = [
		{ label: '1 hour', minutes: 60 },
		{ label: '2 hours', minutes: 120 },
		{ label: '4 hours', minutes: 240 },
		{ label: '8 hours', minutes: 480 },
		{ label: '1 day', minutes: 1440 },
		{ label: '2 days', minutes: 2880 },
		{ label: '3 days', minutes: 4320 },
		{ label: '1 week', minutes: 10080 }
	] as const;

	function toCalendarDate(date: Date | string | null | undefined): CalendarDate | undefined {
		if (!date) return undefined;
		const d = typeof date === 'string' ? new Date(date) : date;
		return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
	}

	function formatHHMM(h: number, m: number): string {
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
	}

	function toTimeString(date: Date | string | null | undefined): string {
		if (!date) return '10:30:00';
		const d = typeof date === 'string' ? new Date(date) : date;
		return formatHHMM(d.getHours(), d.getMinutes());
	}

	function currentTimeString(): string {
		const nowMs = Math.ceil(Date.now() / 60_000) * 60_000;
		const d = new Date(nowMs);
		return formatHHMM(d.getHours(), d.getMinutes());
	}

	// Combine a CalendarDate + "HH:MM:SS" into an ISO string without mutating a Date instance
	function calDateTimeToISO(calDate: CalendarDate, timeStr: string): string {
		const base = calDate.toDate(getLocalTimeZone());
		const [h, m, s] = timeStr.split(':').map(Number);
		return new Date(
			base.getFullYear(),
			base.getMonth(),
			base.getDate(),
			h,
			m,
			s || 0
		).toISOString();
	}

	let searchQuery = $state('');
	const availableGames = $derived.by(() => {
		const combined = [...collection.map((i) => i.game), ...userCollection];
		return Array.from(new Map(combined.map((g) => [g.id, g])).values());
	});
	let selectedGames = $state<Array<{ id: string; title: string }>>(
		untrack(() => {
			if (!initialData?.selectedGameIds) {
				return [];
			}

			const availableById = new Map(availableGames.map((game) => [game.id, game]));
			return initialData.selectedGameIds
				.map((id) => availableById.get(id))
				.filter((game): game is { id: string; title: string; type: string } => Boolean(game))
				.map((g) => ({ id: g.id, title: g.title }));
		})
	);

	// Start date — defaults to today's CalendarDate for new sessions
	let startDate = $state<CalendarDate | undefined>(
		untrack(() => toCalendarDate(initialData?.startDate) ?? today(getLocalTimeZone()))
	);
	let startTime = $state(
		untrack(() =>
			initialData?.startDate ? toTimeString(initialData.startDate) : currentTimeString()
		)
	);

	// Game night date/time — shared between create (custom picker) and edit modes
	let gameDayDate = $state<CalendarDate | undefined>(
		untrack(() => toCalendarDate(initialData?.gameDayDate))
	);
	let gameDayTime = $state(
		untrack(() => (initialData?.gameDayDate ? toTimeString(initialData.gameDayDate) : '18:00:00'))
	);

	// Duration selector (create mode default)
	let selectedDurationStr = $state('1440'); // 1 day
	let useCustomGameDay = $state(false);

	// Popover open states
	let startDateOpen = $state(false);
	let gameDayOpen = $state(false);

	// UI state
	let submittingAction = $state<'draft' | 'publish' | 'edit-save' | null>(null);
	let isPublishing = $state(false);
	let dateValidationMessage = $state<string | null>(null);

	let isEditMode = $derived(!!initialData);
	let isDraft = $derived(initialData?.status === 'draft');

	let searchResults = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		const selectedIds = new Set(selectedGames.map((game) => game.id));

		const searchableGames = availableGames.filter((game) => !selectedIds.has(game.id));

		const matches = query
			? searchableGames.filter((game) => game.title.toLowerCase().includes(query))
			: searchableGames;

		return matches
			.slice(0, 10)
			.map((game) => ({ id: game.id, title: game.title, type: game.type }));
	});

	let startISOString = $derived.by(() => {
		if (!startDate || !startTime) return undefined;
		return calDateTimeToISO(startDate, startTime);
	});

	let gameDayISOString = $derived.by(() => {
		if (isEditMode || useCustomGameDay) {
			if (!gameDayDate || !gameDayTime) return undefined;
			return calDateTimeToISO(gameDayDate, gameDayTime);
		}
		// Duration mode: startISO + offset
		if (!startISOString) return undefined;
		return new Date(
			new Date(startISOString).getTime() + Number(selectedDurationStr) * 60_000
		).toISOString();
	});

	let gameDayPreview = $derived.by(() => {
		if (!gameDayISOString || isEditMode || useCustomGameDay) return null;
		return new Date(gameDayISOString).toLocaleString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	});

	let hasPastStartDateTime = $derived.by(() => {
		if (!startISOString) return false;
		return new Date(startISOString).getTime() < Date.now();
	});

	let hasPastGameDayDateTime = $derived.by(() => {
		if (!gameDayISOString) return false;
		return new Date(gameDayISOString).getTime() < Date.now();
	});

	let isGameDayBeforeStartDateTime = $derived.by(() => {
		if (!startISOString || !gameDayISOString) return false;
		return new Date(gameDayISOString).getTime() < new Date(startISOString).getTime();
	});

	// min attribute for time inputs — only meaningful when the selected date is today or same as start
	let minStartTime = $derived.by(() => {
		if (!startDate) return undefined;
		return startDate.compare(today(getLocalTimeZone())) === 0 ? currentTimeString() : undefined;
	});

	let minGameDayTime = $derived.by(() => {
		if (!gameDayDate || !startDate || (!isEditMode && !useCustomGameDay)) return undefined;
		return gameDayDate.compare(startDate) === 0 ? startTime : undefined;
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

<form
	{action}
	method="POST"
	use:enhance={({ cancel, submitter }) => {
		dateValidationMessage = null;

		if (!isEditMode && hasPastStartDateTime) {
			dateValidationMessage = 'Voting start date/time cannot be in the past.';
			cancel();
			return;
		}

		if (!isEditMode && hasPastGameDayDateTime) {
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

		if (isEditMode) {
			submittingAction = 'edit-save';
		} else {
			submittingAction = submitter?.getAttribute('formaction')?.includes('createAndPublish')
				? 'publish'
				: 'draft';
		}
		return async ({ result, update }) => {
			const action = submittingAction;
			submittingAction = null;
			if (result.type === 'redirect') {
				// create / createAndPublish actions
				const message =
					action === 'publish' ? 'Session published successfully!' : 'Session saved as draft.';
				toast.success(message);
				await applyAction(result);
			} else if (result.type === 'success') {
				// edit action returns success with votingSessionId
				const target = result.data?.votingSessionId
					? `/voting/${result.data.votingSessionId}`
					: null;
				toast.success('Voting session updated!');
				if (target) {
					selectedGames = [];
					window.location.assign(target);
				}
			} else if (result.type === 'failure') {
				toast.error((result.data?.message as string) || 'An error occurred.');
				await update();
			}
		};
	}}
	class="space-y-6"
>
	{#if initialData?.id}
		<input type="hidden" name="votingSessionId" value={initialData.id} />
	{/if}
	{#if form?.success === false && form?.message}
		<div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
			<p class="text-sm font-medium text-red-800 dark:text-red-200">
				{form.message}
			</p>
		</div>
	{/if}
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

	<input type="hidden" name="votingSessionType" value="video_game" />
	<input type="hidden" name="startDate" value={startISOString} />
	<input type="hidden" name="gameDayDate" value={gameDayISOString} />

	<!-- Date configuration -->
	<div class="rounded-lg border p-4">
		<h2 class="mb-4 text-base font-semibold">Schedule</h2>
		<div class="flex flex-wrap gap-8">
			<!-- Voting opens -->
			<div class="flex flex-col gap-3">
				<p class="text-sm font-medium">Voting opens</p>
				<div class="flex gap-4">
					<div class="flex flex-col gap-2">
						<Label class="px-1">Date</Label>
						<Popover.Root bind:open={startDateOpen}>
							<Popover.Trigger>
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
									minValue={today(getLocalTimeZone())}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
					<div class="flex flex-col gap-2">
						<Label class="px-1">Time</Label>
						<Input
							class="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
							step="60"
							min={minStartTime}
							bind:value={startTime}
							type="time"
						/>
					</div>
				</div>
			</div>

			<!-- Game night -->
			<div class="flex flex-col gap-3">
				<p class="text-sm font-medium">Game night</p>
				{#if isEditMode}
					<div class="flex gap-4">
						<div class="flex flex-col gap-3">
							<Label class="px-1">Date</Label>
							<Popover.Root bind:open={gameDayOpen}>
								<Popover.Trigger>
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
										minValue={today(getLocalTimeZone())}
									/>
								</Popover.Content>
							</Popover.Root>
						</div>
						<div class="flex flex-col gap-3">
							<Label class="px-1">Time</Label>
							<Input
								class="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
								step="60"
								min={minGameDayTime}
								bind:value={gameDayTime}
								type="time"
							/>
						</div>
					</div>
				{:else if !useCustomGameDay}
					<div class="flex flex-col gap-2">
						<Label for="durationSelect">Duration</Label>
						<Select.Root type="single" bind:value={selectedDurationStr}>
							<Select.Trigger id="durationSelect" class="w-36">
								{DURATION_OPTIONS.find((o) => String(o.minutes) === selectedDurationStr)?.label ??
									'Select duration'}
							</Select.Trigger>
							<Select.Content>
								{#each DURATION_OPTIONS as opt (opt.minutes)}
									<Select.Item value={String(opt.minutes)}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if gameDayPreview}
							<p class="text-sm text-muted-foreground">Game night: {gameDayPreview}</p>
						{/if}
					</div>
					<button
						type="button"
						class="mt-1 w-fit text-left text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
						onclick={() => {
							useCustomGameDay = true;
							gameDayDate = startDate;
						}}
					>
						Set a specific date & time instead
					</button>
				{:else}
					<div class="flex gap-4">
						<div class="flex flex-col gap-3">
							<Label class="px-1">Date</Label>
							<Popover.Root bind:open={gameDayOpen}>
								<Popover.Trigger>
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
										minValue={startDate ?? today(getLocalTimeZone())}
									/>
								</Popover.Content>
							</Popover.Root>
						</div>
						<div class="flex flex-col gap-3">
							<Label class="px-1">Time</Label>
							<Input
								class="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
								step="60"
								min={minGameDayTime}
								bind:value={gameDayTime}
								type="time"
							/>
						</div>
					</div>
					<button
						type="button"
						class="mt-1 w-fit text-left text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
						onclick={() => (useCustomGameDay = false)}
					>
						Use duration instead
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#each selectedGames as game (game.id)}
		<input type="hidden" name="gameIds" value={game.id} />
	{/each}

	<Separator class="my-6" />

	{#if isEditMode && initialData?.status === 'active'}
		<div class="mb-4 rounded-md bg-amber-50 p-4 dark:bg-amber-900/30">
			<p class="text-sm font-medium text-amber-800 dark:text-amber-200">
				<strong>Note:</strong> Once a voting session is active, the list of games/options is locked and
				cannot be changed.
			</p>
		</div>
	{/if}
	<div class="flex flex-col space-y-4">
		<h2 class="text-xl font-semibold">Add Games</h2>
		<Input
			id="search"
			placeholder="Search community collection or your synced library…"
			bind:value={searchQuery}
		/>

		{#if searchQuery.trim()}
			{#if searchResults.length > 0}
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each searchResults as game (game.id)}
						<div
							class="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
						>
							<div class="min-w-0 space-y-1">
								<p class="truncate font-medium">{game.title}</p>
								<Badge variant="secondary" class="mt-0.5 capitalize">
									{game.type.replace('_', ' ')}
								</Badge>
							</div>
							<Button size="sm" class="shrink-0" onclick={() => addGame(game)}>Add</Button>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					No matching games in your community collection or synced library.
				</p>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">
				Start typing to search the community collection and your synced library.
			</p>
		{/if}

		<div>
			<h3 class="mb-2 font-semibold">
				Selected Games {#if selectedGames.length > 0}({selectedGames.length}){/if}
			</h3>
			{#if selectedGames.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each selectedGames as game (game.id)}
						<span
							class="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
						>
							{game.title}
							<button
								type="button"
								class="rounded-full p-0.5 hover:bg-muted-foreground/20"
								aria-label="Remove {game.title}"
								onclick={() => removeGame(game.id)}
							>
								<XIcon class="size-3" />
							</button>
						</span>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No games selected yet.</p>
			{/if}
		</div>
	</div>

	<Separator class="my-6" />
	{#if isEditMode}
		<Button type="submit" disabled={submittingAction !== null}>
			{submittingAction === 'edit-save' ? 'Saving…' : 'Save Changes'}
		</Button>
	{:else}
		<div class="flex flex-wrap items-start gap-3">
			<Button type="submit" variant="outline" disabled={submittingAction !== null}>
				{submittingAction === 'draft' ? 'Saving…' : 'Save as Draft'}
			</Button>
			<div class="flex flex-col gap-1">
				<Button type="submit" formaction="?/createAndPublish" disabled={submittingAction !== null}>
					{submittingAction === 'publish' ? 'Publishing…' : 'Save & Publish'}
				</Button>
				<p class="text-xs text-muted-foreground">Immediately visible to community members</p>
			</div>
		</div>
	{/if}
</form>

{#if isDraft}
	<Separator class="my-6" />

	<div class="space-y-3">
		<div>
			<h2 class="text-xl font-semibold">Publish Session</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Publishing makes this session available for community members to vote on. This cannot be
				undone.
			</p>
		</div>
		<form
			action="?/publish"
			method="POST"
			use:enhance={() => {
				isPublishing = true;
				return async ({ result, update }) => {
					isPublishing = false;
					if (result.type === 'success') {
						toast.success('Session published!');
						window.location.assign(`/voting/${initialData?.id}`);
					} else if (result.type === 'failure') {
						toast.error((result.data?.message as string) || 'Failed to publish session.');
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="votingSessionId" value={initialData!.id} />
			{#each selectedGames as game (game.id)}
				<input type="hidden" name="gameIds" value={game.id} />
			{/each}
			<Button type="submit" disabled={isPublishing || selectedGames.length === 0}>
				{isPublishing ? 'Publishing…' : 'Publish Session'}
			</Button>
			{#if selectedGames.length === 0}
				<p class="mt-2 text-sm text-amber-600 dark:text-amber-400">
					Add at least one game before publishing.
				</p>
			{/if}
		</form>
	</div>
{/if}
