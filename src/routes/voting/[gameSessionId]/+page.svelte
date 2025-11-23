<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const options = $derived(data.options);

	const formmattedStartDate = $derived(
		data.session.startDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'long'
				}).format(new Date(data.session.startDate))
			: 'Not set'
	);
	const formmattedGameDate = $derived(
		data.session.gameDayDate
			? new Intl.DateTimeFormat('en-US', {
					dateStyle: 'long'
				}).format(new Date(data.session.gameDayDate))
			: 'Not set'
	);

	$inspect(options);
</script>

<section class="max-w-2xl">
	<h1>{data.session.title}</h1>
	<p>{data.session.description}</p>
	<div>
		<label for="start-date">Voting Start Date</label>
		<time datetime="${data.session.startDate}">{formmattedStartDate}</time>
	</div>
	<div>
		<label for="game-day-date">Game day</label>
		<time datetime="${data.session.gameDayDate}">{formmattedGameDate}</time>
	</div>
</section>
<section>
	<ul>
		{#each options as option}
			<li>
				<strong>{option.game?.title} - {option.game?.steamAppId}</strong>
				{#if option.game?.image}
					<img src={option.game.image} alt={option.game.title} />
				{/if}
			</li>
		{/each}
	</ul>
</section>
