<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const votingSessionDetails = $derived(data.session.votingSessionDetails);
	const options = $derived(data.session.options);
	let submittingOptionId = $state<string | undefined>();

	const formattedStartDate = $derived(
		votingSessionDetails.startDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'long'
				}).format(new Date(votingSessionDetails.startDate))
			: 'Not set'
	);
	const formattedGameDate = $derived(
		votingSessionDetails.gameDayDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'long'
				}).format(new Date(votingSessionDetails.gameDayDate))
			: 'Not set'
	);
</script>

<section class="max-w-2xl">
	<div>
		<h1>{votingSessionDetails.title}</h1>
		<p>{votingSessionDetails.status}</p>
	</div>
	<p class="whitespace-pre-wrap">{votingSessionDetails.description}</p>
	<div>
		<label for="start-date">Voting Start Date</label>
		<time datetime={votingSessionDetails.startDate?.toISOString()}>{formattedStartDate}</time>
	</div>
	<div>
		<label for="game-day-date">Game day</label>
		<time datetime={votingSessionDetails.gameDayDate?.toISOString()}>{formattedGameDate}</time>
	</div>
</section>
<Separator class="my-4" />
<section>
	<ul
		class="grid grid-cols-[repeat(auto-fit,minmax(theme(spacing.64),1fr))] place-items-center gap-4"
	>
		{#each options as option}
			<li>
				<Card.Root class=" overflow-hidden py-0 pb-6">
					{#if option.game?.image}
						<img src={option.game.image} alt={option.game.title} />
					{/if}

					<Card.Footer class="justify-between gap-2">
						{option.voteCount === 1 ? '1 vote' : `${option.voteCount} votes`}
						<div class="flex gap-2">
							<Button variant="link">Learn More</Button>
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
								<Button type="submit" disabled={submittingOptionId === option.id}>
									{submittingOptionId === option.id ? 'Voting...' : 'Vote'}
								</Button>
								{#if form?.success && submittingOptionId === option.id}
									<p class="text-green-700">Vote successful: {form.voteId}</p>
								{/if}
							</form>
						</div>
					</Card.Footer>
				</Card.Root>
			</li>
		{/each}
	</ul>
</section>
