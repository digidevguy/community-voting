<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Check, CirclePlus, LayoutDashboard, Library } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import ClearVoteButton from '$lib/components/custom/ClearVoteButton.svelte';

	let { data }: { data: PageData } = $props();
	type Session = PageData['sessions'][number];
	type SessionList = PageData['sessions'];
	type SessionTabStatus = 'active' | 'completed' | 'archived';

	const activeSessions: SessionList = $derived(
		data.sessions.filter((session: Session) => session.status === 'active')
	);
	const completedSessions: SessionList = $derived(
		data.sessions.filter((session: Session) => session.status === 'completed')
	);
	const archivedSessions: SessionList = $derived(
		data.sessions.filter((session: Session) => session.status === 'archived')
	);
	$inspect(activeSessions);
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

{#snippet tab(sessionType: SessionTabStatus, filteredSessions: SessionList)}
	<Tabs.Content value={sessionType}>
		<ul class="flex flex-col gap-4">
			{#each filteredSessions as session}
				<li>
					<Card.Root>
						<!-- Add session image -->
						<div class="space-y-2 px-6 py-4">
							<div class="flex justify-between">
								<div class="space-y-2">
									<Card.Title>{session.title}</Card.Title>
									<p>{format(session.gameDayDate, 'EEE, MMM do h:mm a')}</p>
								</div>
								<span
									class="flex place-items-center rounded-full bg-green-200 p-4 {session.hasVoted
										? 'block'
										: 'hidden'}"><Check class="text-green-600"></Check></span
								>
							</div>
							<Card.Description>{session.description}</Card.Description>
						</div>
						<Card.Footer class="justify-end gap-4">
							<!-- Todo: Add this to a dialog -->
							{#if session.hasVoted}
								<ClearVoteButton votingSessionId={session.id}></ClearVoteButton>
							{/if}
							<Button href="/voting/{session.id}">View Details</Button>
						</Card.Footer>
					</Card.Root>
				</li>
			{/each}
		</ul>
	</Tabs.Content>
{/snippet}

<Tabs.Root value="active">
	<Tabs.List>
		<Tabs.Trigger value="active">Active</Tabs.Trigger>
		<Tabs.Trigger value="completed">Completed</Tabs.Trigger>
		<Tabs.Trigger value="archived">Archived</Tabs.Trigger>
	</Tabs.List>
	{@render tab('active', activeSessions)}
	{@render tab('completed', completedSessions)}
	{@render tab('archived', archivedSessions)}
</Tabs.Root>
