<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Check, CirclePlus, Send, Library, CalendarDays } from '@lucide/svelte';
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
</script>

<h1 class="mb-4 text-xl font-semibold">{data.community.title}</h1>

<nav aria-label="Community submenu" class="py-2">
	<ul class="flex justify-end gap-4">
		<li>
			<Button href="/community/{data.community.id}/invites" variant="outline"
				><Send></Send>Invites</Button
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
			{#each filteredSessions as session (session.id)}
				<li>
					<Card.Root class="transition-shadow hover:shadow-md">
						<Card.Header>
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1 space-y-1">
									<Card.Title class="truncate text-base">{session.title}</Card.Title>
									<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
										<CalendarDays size={14} />
										{format(session.gameDayDate, 'EEE, MMM do h:mm a')}
									</p>
								</div>
								{#if session.hasVoted}
									<span
										class="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
									>
										<Check size={12} />Voted
									</span>
								{/if}
							</div>
						</Card.Header>
						<Card.Content>
							<Card.Description class="line-clamp-3">{session.description}</Card.Description>
						</Card.Content>
						<Card.Footer class="justify-end gap-4">
							<!-- Todo: Add clearVote confirmation as a dialog -->
							{#if session.hasVoted && !session.selectedOptionId}
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
