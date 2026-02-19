<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Check, CirclePlus, LayoutDashboard, Library } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';

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
				><Library></Library>Manage collection<Badge
					class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
					variant="secondary"
				>
					{data.collectionCount}
				</Badge></Button
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
			<Card.Root>
				<!-- Add session image -->
				<div class="space-y-2 p-4">
					<div class="flex justify-between p-2">
						<div>
							<Card.Title>{session.title}</Card.Title>
							<p>{session.gameDayDate}</p>
						</div>
						<span
							class="flex place-items-center rounded-full bg-green-200 p-2 {session.hasVoted
								? 'block'
								: 'hidden'}"><Check class="text-green-600"></Check></span
						>
					</div>
					<Card.Description>{session.description}</Card.Description>
				</div>
				<Card.Footer class="justify-end">
					<Button href="/voting/{session.id}">View Details</Button>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>
