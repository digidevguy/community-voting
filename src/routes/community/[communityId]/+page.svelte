<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { CirclePlus, LayoutDashboard, Library } from '@lucide/svelte';

	let { data }: { data: PageServerData } = $props();
	$inspect(data);
</script>

<h1 class="mb-4 text-xl font-semibold">{data.community.title}</h1>

<nav aria-label="Community submenu" class="py-2">
	<ul class="flex justify-end gap-4">
		<li>
			<Button href="/community/{data.community.id}/" variant="outline"
				><LayoutDashboard></LayoutDashboard>Overview</Button
			>
		</li>
		<li>
			<Button href="/community/{data.community.id}/collection" variant="outline"
				><Library></Library>Manage collection</Button
			>
		</li>
		<li>
			<Button href="/voting/create/{data.community.id}" variant="outline"
				><CirclePlus></CirclePlus>Create new voting session</Button
			>
		</li>
	</ul>
</nav>

<ul class="flex flex-col gap-4">
	{#each data.sessions as session}
		<li>
			<!-- Todo: Add voting styling, tie styling to if user has voted in this session -->
			<Card.Root class="w-full">
				<Card.Header>
					<Card.Title>{session.title}</Card.Title>
					<Card.Description class="line-clamp-3">{session.description}</Card.Description>
				</Card.Header>
				<Card.Footer class="justify-end">
					<Button href="/voting/{session.id}">Learn more</Button>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>
