<script lang="ts">
	import { enhance } from '$app/forms';
	import { flip } from 'svelte/animate';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { PageProps } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { CircleChevronLeft, Pencil, Trophy } from '@lucide/svelte';
	import ClearVoteButton from '$lib/components/custom/ClearVoteButton.svelte';
	import { toast } from 'svelte-sonner';

	let { data }: PageProps = $props();
	const votingSessionDetails = $derived(data.session.votingSessionDetails);
	const options = $derived(data.session.options);
	const participants = $derived(data.participants ?? []);

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

	const formattedStartDate = $derived(
		votingSessionDetails.startDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'medium'
				}).format(new Date(votingSessionDetails.startDate))
			: 'Not set'
	);
	const formattedGameDate = $derived(
		votingSessionDetails.gameDayDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'medium'
				}).format(new Date(votingSessionDetails.gameDayDate))
			: 'Not set'
	);
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
		<nav>
			<Button href="/community/{votingSessionDetails.communityId}" variant="outline">
				<CircleChevronLeft></CircleChevronLeft>Back
			</Button>
			{#if (isVotingOpen || isDraft) && canEdit}
				<Button href="/voting/{votingSessionDetails.id}/edit" variant="outline">
					<Pencil />Edit
				</Button>
			{/if}
		</nav>
		<div class="flex flex-row items-center justify-between">
			<h1 class="text-3xl font-semibold">{votingSessionDetails.title}</h1>
			<Badge variant="secondary" class="h-5 min-w-5 rounded-md px-2 font-mono tabular-nums">
				{formattedStatus}</Badge
			>
		</div>

		<p class="whitespace-pre-wrap">{votingSessionDetails.description}</p>
		<div class="flex flex-row justify-around">
			<div class="flex flex-col">
				<span class="text-sm text-muted-foreground">Voting Start Date</span>
				<time datetime={votingSessionDetails.startDate?.toISOString()}>{formattedStartDate}</time>
			</div>
			<div class="flex flex-col">
				<span class="text-sm text-muted-foreground">Game Day</span>
				<time datetime={votingSessionDetails.gameDayDate?.toISOString()}>{formattedGameDate}</time>
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

	<Separator />
	<section class="flex flex-col gap-3">
		<div class="flex items-baseline justify-between">
			<h2 class="text-sm font-semibold">Vote Breakdown</h2>
			<span class="text-xs text-muted-foreground"
				>{totalVoteCount} {totalVoteCount === 1 ? 'vote' : 'votes'} total</span
			>
		</div>
		{#each options as option (option.id)}
			<div class="space-y-1.5" animate:flip={{ duration: 300 }}>
				<div class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-1.5 font-medium">
						{#if option.id === winnerOptionId}
							<Trophy class="h-4 w-4 shrink-0 text-amber-500" />
						{/if}
						{option?.game?.title}
					</span>
					<span class="text-xs text-muted-foreground tabular-nums">
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
	</section>
	{#if participants.length > 0}
		<section class="space-y-2">
			<h2 class="text-sm font-semibold text-muted-foreground">
				Participants ({participants.length})
			</h2>
			<ul class="flex flex-wrap gap-2">
				{#each participants as name (name)}
					<li>
						<Badge variant="secondary">{name}</Badge>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="space-y-4">
		{#if isVotingOpen && userVote}
			<!-- TODO: Add refactored clearVote UI -->
			<ClearVoteButton votingSessionId={votingSessionDetails.id}></ClearVoteButton>
		{/if}
		<ul
			class="grid grid-cols-[repeat(auto-fit,minmax(theme(spacing.64),1fr))] place-items-center gap-4"
		>
			{#each options as option (option.id)}
				<li>
					<Card.Root
						class="group relative flex overflow-hidden py-0 transition-all duration-100 hover:-translate-y-1 hover:shadow-xl {userVote ===
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
								class="absolute inset-0 z-10 flex-row items-center justify-center gap-2 transition-all duration-500 ease-in-out {expandedCardId ===
								option.id
									? 'flex'
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
										class="min-w-24"
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
