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

	let { data, form }: PageProps = $props();
	const votingSessionDetails = $derived(data.session.votingSessionDetails);
	const options = $derived(data.session.options);

	const userVote = $derived(data.userVote?.votingOptionId);
	const totalVote = $derived(options.reduce((sum, o) => sum + o.voteCount, 0) || 1);
	let submittingOptionId = $state<string | undefined>();
	let expandedCardId = $state<string | undefined>();

	const isVotingOpen = $derived(votingSessionDetails.status === 'active');
	const isEnded = $derived(
		votingSessionDetails.status === 'voting_ended' || votingSessionDetails.status === 'completed'
	);
	const winnerOptionId = $derived(votingSessionDetails.selectedOptionId);
	const winnerOption = $derived(options.find((o) => o.id === winnerOptionId));
	const isCreator = $derived(data.user?.id === votingSessionDetails.createdBy);

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

<section class="flex flex-col gap-2">
	<nav>
		<Button href="/community/{votingSessionDetails.communityId}" variant="outline">
			<CircleChevronLeft></CircleChevronLeft>Back
		</Button>
		{#if isVotingOpen}
			<Button href="/voting/{votingSessionDetails.id}/edit" variant="outline">
				<Pencil />Edit
			</Button>
		{/if}
	</nav>
	<div class="flex flex-row justify-between">
		<h1 class="text-3xl font-semibold">{votingSessionDetails.title}</h1>
		<Badge variant="secondary" class="h-5 min-w-5 rounded-md px-2 font-mono tabular-nums">
			{votingSessionDetails.status.toLocaleUpperCase()}</Badge
		>
	</div>

	<p class="whitespace-pre-wrap">{votingSessionDetails.description}</p>
	<div class="flex flex-row justify-around">
		<div class="flex flex-col">
			<label for="start-date">Voting Start Date</label>
			<time datetime={votingSessionDetails.startDate?.toISOString()}>{formattedStartDate}</time>
		</div>
		<div class="flex flex-col">
			<label for="game-day-date">Game day</label>
			<time datetime={votingSessionDetails.gameDayDate?.toISOString()}>{formattedGameDate}</time>
		</div>
	</div>
</section>

{#if isEnded}
	<div
		class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
	>
		{#if votingSessionDetails.status === 'completed' && winnerOption}
			<div class="flex items-center gap-2">
				<Trophy class="h-5 w-5 shrink-0 text-amber-500" />
				<span class="font-semibold">Winner: {winnerOption.game?.title ?? 'Unknown game'}</span>
			</div>
		{:else}
			<p class="font-semibold">Voting has ended. The winner has not been selected yet.</p>
			{#if isCreator}
				<form
					action="?/endSession"
					method="POST"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								toast.success('Session finalized and winner selected!');
							} else if (result.type === 'failure') {
								const d = result.data as { errors?: string };
								toast.error(d?.errors ?? 'Failed to finalize session');
							}
						};
					}}
				>
					<Button type="submit" class="mt-2" variant="default">
						<Trophy class="mr-1 h-4 w-4" />Select Winner & Finalize
					</Button>
				</form>
			{/if}
		{/if}
	</div>
{/if}

<Separator class="my-4" />
<section class="mb-4 gap-2">
	{#each options as option (option.id)}
		<div class="mb-2 space-y-1 last:mb-0" animate:flip={{ duration: 300 }}>
			<div class="flex justify-between text-sm">
				<span class="flex items-center gap-1">
					{#if option.id === winnerOptionId}
						<Trophy class="h-4 w-4 text-amber-500" />
					{/if}
					{option?.game?.title}
				</span>
				<span>{option.voteCount}</span>
			</div>
			<div class="h-2 overflow-hidden rounded-xs">
				<div
					class="h-full transition-all duration-300 ease-in-out {option.id === winnerOptionId
						? 'bg-amber-500'
						: 'bg-sky-700'}"
					style="width: {(option.voteCount / totalVote) * 100}%"
				></div>
			</div>
		</div>
	{/each}
</section>
<section class="space-y-4">
	{#if isVotingOpen && userVote}
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
							class="aspect=[460-215] w-full object-cover"
						/>
					{:else}
						<div
							class="flex aspect-[460/215] w-full items-center justify-center bg-gray-200 p-4 dark:bg-gray-800"
						>
							<p class="text-center text-sm text-gray-600 dark:text-gray-400">
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
							<Button variant="link" class="text-slate-200">Learn More</Button>
							<form
								action="?/vote"
								method="POST"
								use:enhance={() => {
									submittingOptionId = option.id;
									return async ({ result, update }) => {
										await update();
										submittingOptionId = undefined;
										if (result.type === 'success') {
											const data = result.data as { success: boolean; errors?: string | object };
											if (data?.success) {
												toast.success('Vote cast successfully!');
											} else {
												const message =
													typeof data?.errors === 'string' ? data.errors : 'Failed to cast vote';
												toast.error(message);
											}
										}
									};
								}}
							>
								<input type="hidden" name="votingSessionId" value={votingSessionDetails.id ?? ''} />
								<input type="hidden" name="votingOptionId" value={option.id ?? ''} />
								{#if form?.errors && Array.isArray(form.errors)}
									<div class="text-red-600">
										<!-- Todo: address form type to address error -->
										{#each form.errors as error}
											<p>{error}</p>
										{/each}
									</div>
								{/if}
								<Button type="submit" disabled={submittingOptionId === option.id} class="min-w-24">
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
