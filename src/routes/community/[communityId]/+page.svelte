<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageServerData } = $props();
	$inspect(data);
</script>

<h1 class="my-4">{data.community.title}</h1>

<ul class="flex flex-col gap-4">
	{#each data.sessions as session}
		<li>
			<Card.Root class="w-full max-w-sm">
				<Card.Header>
					<Card.Title>{session.title}</Card.Title>
					<Card.Description class="line-clamp-3">{session.description}</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/voting/{session.id}">Learn more</Button>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>
