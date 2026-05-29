<script lang="ts">
	import { enhance } from '$app/forms';
	import { flip } from 'svelte/animate';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index';
	import * as Dialog from '$lib/components/ui/dialog';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { PageProps } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Bell,
		BellOff,
		CalendarDays,
		Check,
		CircleChevronLeft,
		LoaderCircle,
		Pencil,
		Trophy,
		Users
	} from '@lucide/svelte';
	import ClearVoteButton from '$lib/components/custom/ClearVoteButton.svelte';
	import { toast } from 'svelte-sonner';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	let { data }: PageProps = $props();
	const votingSessionDetails = $derived(data.session.votingSessionDetails);
	const options = $derived(data.session.options);
	const participants = $derived(data.participants ?? []);
	const isSubscribed = $derived(data.isSubscribed ?? false);
	let subscribing = $state(false);

	const loggedWinners = $derived(data.winnerInfo);
	let winnerSelection = $state<string[]>([]);
	let winType = $derived.by(() => {
		if (winnerSelection.length === 0) {
			return null;
		} else if (winnerSelection.length === 1) {
			return 'single';
		} else {
			return 'shared_tie';
		}
	});
	let loadingWinnerform = $state(false);
	let winnerDialogOpen = $state(false);

	const userVote = $derived(data.userVote?.votingOptionId);
	const totalVoteCount = $derived(options.reduce((sum, o) => sum + o.voteCount, 0));
	const totalVote = $derived(totalVoteCount || 1);
	let submittingOptionId = $state<string | undefined>();
	let expandedCardId = $state<string | undefined>();

	const isVotingOpen = $derived(votingSessionDetails.status === 'active');
	const isDraft = $derived(votingSessionDetails.status === 'draft');
	const isEnded = $derived(
		votingSessionDetails.status === 'voting_ended' || votingSessionDetails.status === 'completed'
	);
	const winnerOptionId = $derived(votingSessionDetails.selectedOptionId);
	const winnerOption = $derived(options.find((o) => o.id === winnerOptionId));

	/** Session completed with no votes cast at all. */
	const isNoWinner = $derived(
		votingSessionDetails.status === 'completed' && !winnerOptionId && totalVoteCount === 0
	);
	/** Session completed but the top vote count was shared by multiple options. */
	const maxVoteCount = $derived(
		options.length > 0 ? Math.max(...options.map((o) => o.voteCount)) : 0
	);
	const isTie = $derived(
		votingSessionDetails.status === 'completed' && !winnerOptionId && totalVoteCount > 0
	);
	const tiedOptions = $derived(isTie ? options.filter((o) => o.voteCount === maxVoteCount) : []);
	const isCreator = $derived(data.user?.id === votingSessionDetails.createdBy);
	const canEdit = $derived(isCreator || data.userRole === 'moderator' || data.userRole === 'admin');
	const canDeclareWinner = $derived(
		votingSessionDetails.status === 'voting_ended' &&
			(isCreator || data.userRole === 'moderator' || data.userRole === 'admin')
	);
	const formattedStatus = $derived(
		votingSessionDetails.status
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	);

	const formattedGameDateTime = $derived(
		votingSessionDetails.gameDayDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'full',
					timeStyle: 'short'
				}).format(new Date(votingSessionDetails.gameDayDate))
			: 'Not set'
	);

	function toggleWinnerSelection(userId: string) {
		if (!winnerSelection.includes(userId)) {
			winnerSelection = [...winnerSelection, userId];
		} else {
			winnerSelection = winnerSelection.filter((id) => id !== userId);
		}
	}
</script>

<svelte:head>
	<title>{votingSessionDetails.title} — Community Voting</title>
	<meta name="description" content="Vote on {votingSessionDetails.title} with your community." />
	<meta property="og:title" content="{votingSessionDetails.title} — Community Voting" />
	<meta
		property="og:description"
		content="Vote on {votingSessionDetails.title} with your community."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<div class="flex flex-col gap-6">
	<section class="flex flex-col gap-2">
		<nav class="flex flex-wrap items-center gap-2">
			<Button href="/community/{votingSessionDetails.communityId}" variant="outline">
				<CircleChevronLeft></CircleChevronLeft>Back
			</Button>
			{#if (isVotingOpen || isDraft) && canEdit}
				<Button href="/voting/{votingSessionDetails.id}/edit" variant="outline">
					<Pencil />Edit
				</Button>
			{/if}
			{#if isVotingOpen}
				<form
					action={isSubscribed ? '?/unsubscribeFromSession' : '?/subscribeToSession'}
					method="POST"
					use:enhance={() => {
						subscribing = true;
						const wasSubscribed = isSubscribed;
						return async ({ result, update }) => {
							await update();
							subscribing = false;
							if (result.type === 'success') {
								toast.success(
									wasSubscribed
										? 'Unsubscribed from session notifications'
										: 'You will be notified when this session ends'
								);
							} else if (result.type === 'failure') {
								const d = result.data as { message?: string };
								toast.error(d?.message ?? 'Failed to update subscription');
							}
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={subscribing}>
						{#if subscribing}
							<LoaderCircle class="animate-spin" />
						{:else if isSubscribed}
							<BellOff />
						{:else}
							<Bell />
						{/if}
						{isSubscribed ? 'Unsubscribe' : 'Notify me'}
					</Button>
				</form>
			{/if}
		</nav>
		<div class="flex flex-col gap-4 rounded-2xl border bg-card/60 p-5 sm:p-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-2">
					<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
						{votingSessionDetails.title}
					</h1>
					{#if votingSessionDetails.description}
						<p
							class="max-w-3xl text-sm leading-6 whitespace-pre-wrap text-muted-foreground sm:text-base"
						>
							{votingSessionDetails.description}
						</p>
					{/if}
				</div>
				<Badge
					variant="secondary"
					class="h-6 w-fit rounded-md px-2.5 font-mono text-xs tabular-nums"
				>
					{formattedStatus}
				</Badge>
			</div>

			<div class="grid gap-3 sm:max-w-xl">
				<div class="rounded-xl border bg-background/80 p-4">
					<div
						class="mb-2 flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
					>
						<CalendarDays class="h-4 w-4" />
						<span>Event Date & Time</span>
					</div>
					<time
						class="block text-base font-semibold sm:text-lg"
						datetime={votingSessionDetails.gameDayDate?.toISOString()}
					>
						{formattedGameDateTime}
					</time>
					{#if votingSessionDetails.status === 'draft'}
						<p class="mt-1 text-sm text-muted-foreground">
							Voting opens immediately once the session is published.
						</p>
					{/if}
				</div>
			</div>
		</div>
	</section>

	{#if isEnded}
		{#if votingSessionDetails.status === 'completed' && winnerOption}
			<!-- Completed with a winner -->
			<div
				class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
			>
				<div class="flex items-center gap-2">
					<Trophy class="h-5 w-5 shrink-0 text-amber-500" />
					<span class="font-semibold">Winner: {winnerOption.game?.title ?? 'Unknown game'}</span>
				</div>
			</div>
		{:else if isTie}
			<!-- Completed but tied — multiple options share the top vote count -->
			<div
				class="rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
			>
				<p class="font-semibold">It's a tie! No winner was declared.</p>
				<p class="mt-1 text-sm">
					The following games were tied with {maxVoteCount}
					{maxVoteCount === 1 ? 'vote' : 'votes'} each:
				</p>
				<ul class="mt-2 flex flex-wrap gap-2">
					{#each tiedOptions as opt (opt.id)}
						<li>
							<Badge variant="secondary">{opt.game?.title ?? 'Unknown game'}</Badge>
						</li>
					{/each}
				</ul>
			</div>
		{:else if isNoWinner}
			<!-- Completed but no winner — session expired with no votes -->
			<div
				class="rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
			>
				<p class="font-semibold">No winner was found for this session.</p>
				<p class="mt-1 text-sm">The session expired without any votes being cast.</p>
			</div>
		{:else}
			<!-- voting_ended — waiting for winner to be declared -->
			<div
				class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
			>
				<p class="font-semibold">Voting has ended. The winner has not been declared yet.</p>
				{#if canDeclareWinner}
					<form
						action="?/endSession"
						method="POST"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === 'success') {
									toast.success('Session finalized and winner selected!');
								} else if (result.type === 'failure') {
									const d = result.data as { message?: string };
									toast.error(d?.message ?? 'Failed to finalize session');
								}
							};
						}}
					>
						<Button type="submit" class="mt-2" variant="default">
							<Trophy class="mr-1 h-4 w-4" />Declare Winner & Finalize
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	{/if}

	{#if loggedWinners.length > 0}
		<div
			class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
		>
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<Trophy class="h-5 w-5 shrink-0 text-amber-500" />
					<span class="font-semibold">Logged Winners</span>
				</div>
				{#if canEdit}
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							winnerSelection = [];
							winnerDialogOpen = true;
						}}
					>
						<Pencil class="h-3.5 w-3.5" />Change Winner Data
					</Button>
				{/if}
			</div>
			<ul class="mt-3 flex flex-wrap gap-3">
				{#each loggedWinners as winner (winner.id)}
					<li class="flex items-center gap-2">
						{#if winner.image}
							<img
								src={winner.image}
								alt={winner.name ?? 'Winner'}
								class="h-7 w-7 rounded-full object-cover"
							/>
						{/if}
						<span class="text-sm font-medium">{winner.name ?? 'Unknown'}</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
		>
			<p class="font-semibold">No winner user data has been logged yet.</p>
			<Button
				variant="default"
				class="mt-2"
				onclick={() => {
					winnerSelection = [];
					winnerDialogOpen = true;
				}}
			>
				<Trophy class="mr-1 h-4 w-4" />Log Winner Info
			</Button>
		</div>
	{/if}

	<Dialog.Root bind:open={winnerDialogOpen}>
		<Dialog.Content>
			<form
				action="?/logWinners"
				method="POST"
				use:enhance={() => {
					loadingWinnerform = true;
					return async ({ result, update }) => {
						loadingWinnerform = false;
						if (result.type === 'failure') {
							toast.error((result.data?.message as string) || 'An error occured.');
						} else {
							toast.success('Winner info logged successfully!');
							winnerDialogOpen = false;
							await update();
						}
					};
				}}
			>
				<Dialog.Header>
					<Dialog.Title>Declare winners</Dialog.Title>
					<Dialog.Description>
						Select the players who won this session. Multiple selections count as a shared win.
					</Dialog.Description>
				</Dialog.Header>

				{#if participants.length === 0}
					<div
						class="my-4 flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground"
					>
						<Users class="h-4 w-4 shrink-0" />
						No participants recorded for this session.
					</div>
				{:else}
					<ScrollArea class="my-4 h-48 w-full rounded-md border">
						<ul class="divide-y">
							{#each participants as participant (participant.id)}
								{@const selected = winnerSelection.includes(participant.id)}
								<li>
									<button
										type="button"
										onclick={() => toggleWinnerSelection(participant.id)}
										class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 {selected
											? 'bg-muted/40'
											: ''}"
									>
										<span
											class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border {selected
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-muted-foreground/40'}"
										>
											{#if selected}
												<Check class="h-3 w-3" />
											{/if}
										</span>
										{#if participant.image}
											<img
												src={participant.image}
												alt={participant.name ?? 'Participant'}
												class="h-6 w-6 rounded-full object-cover"
											/>
										{/if}
										<span class="flex-1 font-medium">{participant.name ?? 'Unknown'}</span>
									</button>
								</li>
							{/each}
						</ul>
					</ScrollArea>
				{/if}

				{#if winnerSelection.length > 0}
					<p class="mb-4 text-xs text-muted-foreground">
						{winnerSelection.length} player{winnerSelection.length === 1 ? '' : 's'} selected — will
						be recorded as a {winnerSelection.length === 1 ? 'single win' : 'shared win'}.
					</p>
				{/if}

				<input type="hidden" name="votingSessionId" value={votingSessionDetails.id} />
				<input type="hidden" name="votingOptionId" value={winnerOptionId} />
				<input type="hidden" name="gameId" value={winnerOption?.game?.id} />
				<input type="hidden" name="voteCount" value={winnerOption?.voteCount} />
				<input type="hidden" name="winType" value={winType} />
				{#each winnerSelection as winnerId (winnerId)}
					<input type="hidden" name="userIds" value={winnerId} />
				{/each}

				<Dialog.Footer class="gap-2">
					<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
						Cancel
					</Dialog.Close>
					<Button
						variant="default"
						type="submit"
						disabled={loadingWinnerform || winnerSelection.length === 0}
					>
						{#if loadingWinnerform}
							<LoaderCircle class="animate-spin" />
						{/if}
						Save Winners
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Separator />
	<div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)] xl:items-start">
		<section class="min-w-0 overflow-hidden rounded-2xl border bg-card/60 p-5 sm:p-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<h2 class="text-base font-semibold">Vote Breakdown</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Current totals across all session options.
					</p>
				</div>
				<span class="text-sm text-muted-foreground">
					{totalVoteCount}
					{totalVoteCount === 1 ? 'vote' : 'votes'} total
				</span>
			</div>
			<div class="mt-5 space-y-4">
				{#each options as option (option.id)}
					<div class="space-y-2" animate:flip={{ duration: 300 }}>
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="flex min-w-0 items-center gap-1.5 font-medium">
								{#if option.id === winnerOptionId}
									<Trophy class="h-4 w-4 shrink-0 text-amber-500" />
								{/if}
								<span class="truncate">{option?.game?.title}</span>
							</span>
							<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
								{option.voteCount} ({Math.round((option.voteCount / totalVote) * 100)}%)
							</span>
						</div>
						<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full transition-all duration-500 ease-in-out {option.id ===
								winnerOptionId
									? 'bg-amber-500'
									: 'bg-sky-600 dark:bg-sky-500'}"
								style="width: {(option.voteCount / totalVote) * 100}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="min-w-0 overflow-hidden rounded-2xl border bg-card/60 p-5 sm:p-6">
			<div class="flex items-baseline justify-between gap-2">
				<h2 class="text-base font-semibold">Participants</h2>
				<span class="text-sm text-muted-foreground">{participants.length}</span>
			</div>
			{#if participants.length > 0}
				<p class="mt-1 text-sm text-muted-foreground">
					Community members who have taken part in this session so far.
				</p>
				<ul class="mt-4 flex flex-wrap gap-2">
					{#each participants as participant (participant.id)}
						<li>
							<Badge
								variant="secondary"
								class="max-w-full rounded-full px-3 py-1 text-sm break-all"
							>
								{participant.name}
							</Badge>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-4 text-sm text-muted-foreground">No one has joined the voting yet.</p>
			{/if}
		</section>
	</div>

	<section class="rounded-2xl border bg-card/60 p-4 sm:p-6">
		<div class="space-y-1">
			<h2 class="text-base font-semibold">Session Options</h2>
			<p class="text-sm text-muted-foreground">
				Browse the games in this session{#if isVotingOpen}. Select a card to reveal voting actions{/if}.
			</p>
		</div>
		{#if isVotingOpen && userVote}
			<ClearVoteButton votingSessionId={votingSessionDetails.id}></ClearVoteButton>
		{/if}
		<ul class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
			{#each options as option (option.id)}
				<li class="w-full min-w-0">
					<Card.Root
						class="group relative flex w-full overflow-hidden py-0 transition-all duration-100 hover:-translate-y-1 hover:shadow-xl {userVote ===
						option.id
							? 'ring-2 ring-sky-500 ring-offset-2'
							: ''} {option.id === winnerOptionId ? 'ring-2 ring-amber-500 ring-offset-2' : ''}"
						onclick={() =>
							isVotingOpen
								? (expandedCardId = expandedCardId === option.id ? undefined : option.id)
								: null}
					>
						{#if option.game?.image}
							<img
								src={option.game.image}
								alt={option.game.title}
								width="460"
								height="215"
								loading="lazy"
								decoding="async"
								class="aspect-[460/215] w-full object-cover"
							/>
						{:else}
							<div class="flex aspect-[460/215] w-full items-center justify-center bg-muted p-4">
								<p class="text-center text-sm text-muted-foreground">
									{option.game?.title || 'No image available'}
								</p>
							</div>
						{/if}

						{#if option.id === winnerOptionId}
							<div
								class="pointer-events-none absolute inset-0 flex items-center justify-center bg-amber-500/20"
							>
								<Trophy class="h-12 w-12 text-amber-400 drop-shadow-lg" />
							</div>
						{/if}

						{#if isVotingOpen}
							<div
								class="absolute inset-0 bg-black/60 transition-opacity duration-300 {expandedCardId ===
								option.id
									? 'opacity-100'
									: 'opacity-0'}"
							></div>

							<div
								class="absolute inset-0 z-10 items-center justify-center gap-2 transition-all duration-500 ease-in-out {expandedCardId ===
								option.id
									? 'flex flex-col px-4 sm:flex-row'
									: 'hidden'}"
							>
								<Button variant="link" class="text-slate-200" href="/library/{option.gameId}"
									>Learn More</Button
								>
								<form
									action="?/vote"
									method="POST"
									use:enhance={() => {
										submittingOptionId = option.id;
										return async ({ result, update }) => {
											await update();
											submittingOptionId = undefined;
											if (result.type === 'success') {
												toast.success('Vote cast successfully!');
											} else if (result.type === 'failure') {
												const d = result.data as { message?: string };
												toast.error(d?.message ?? 'Failed to cast vote');
											}
										};
									}}
								>
									<input
										type="hidden"
										name="votingSessionId"
										value={votingSessionDetails.id ?? ''}
									/>
									<input type="hidden" name="votingOptionId" value={option.id ?? ''} />
									<Button
										type="submit"
										disabled={submittingOptionId === option.id}
										class="w-full min-w-24 sm:w-auto"
									>
										{submittingOptionId === option.id ? 'Voting...' : 'Vote'}
									</Button>
								</form>
							</div>
						{/if}
					</Card.Root>
				</li>
			{/each}
		</ul>
	</section>
</div>
