<script lang="ts">
	import { enhance } from '$app/forms';
	import { flip } from 'svelte/animate';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { PageProps } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { CircleChevronLeft } from '@lucide/svelte';

	let { data, form }: PageProps = $props();
	const votingSessionDetails = $derived(data.session.votingSessionDetails);
	const options = $derived(data.session.options);

	/**
	 * Todo: Use userVote to style option card with the user's current vote.
	 * */
	const userVote = $derived(data.userVote);
	const totalVote = $derived(options.reduce((sum, o) => sum + o.voteCount, 0) || 1);
	let submittingOptionId = $state<string | undefined>();
	let expandedCardId = $state<string | undefined>();

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
	<div class="flex flex-row justify-between">
		<h1 class="text-3xl font-semibold">{votingSessionDetails.title}</h1>
		<Badge variant="secondary" class="h-5 min-w-5 rounded-md px-2 font-mono tabular-nums">
			{votingSessionDetails.status.toLocaleUpperCase()}</Badge
		>
	</div>

	<Button href="/community/{votingSessionDetails.communityId}" variant="outline" class="max-w-22">
		<CircleChevronLeft></CircleChevronLeft>Back
	</Button>

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
<Separator class="my-4" />
<section class="mb-4 gap-2">
	{#each options as option (option.id)}
		<div class="mb-2 space-y-1 last:mb-0" animate:flip={{ duration: 300 }}>
			<div class="flex justify-between text-sm">
				<span>{option?.game?.title}</span>
				<span>{option.voteCount}</span>
			</div>
			<div class="h-2 overflow-hidden rounded-xs">
				<div
					class="h-full bg-sky-700 transition-all duration-300 ease-in-out"
					style="width: {(option.voteCount / totalVote) * 100}%"
				></div>
			</div>
		</div>
	{/each}
</section>
<section>
	<ul
		class="grid grid-cols-[repeat(auto-fit,minmax(theme(spacing.64),1fr))] place-items-center gap-4"
	>
		{#each options as option (option.id)}
			<li>
				<Card.Root
					class="group relative flex overflow-hidden py-0 transition-all duration-100 hover:-translate-y-1 hover:shadow-xl"
					onclick={() => (expandedCardId = expandedCardId === option.id ? undefined : option.id)}
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
								return async ({ update }) => {
									await update();
									submittingOptionId = undefined;
								};
							}}
						>
							<input type="hidden" name="votingSessionId" value={votingSessionDetails.id ?? ''} />
							<input type="hidden" name="votingOptionId" value={option.id ?? ''} />
							{#if form?.errors && Array.isArray(form.errors)}
								<div class="text-red-600">
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
				</Card.Root>
			</li>
		{/each}
	</ul>
</section>
