<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import {
		Check,
		CirclePlus,
		Send,
		Library,
		CalendarDays,
		Trophy,
		Users,
		LayoutDashboard,
		TriangleAlert,
		Vote,
		Bell,
		Clock
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import ClearVoteButton from '$lib/components/custom/ClearVoteButton.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();
	type Session = PageData['sessions'][number];
	type SessionList = PageData['sessions'];

	const isProd = import.meta.env.PROD;
	type SessionTabStatus = 'active' | 'completed' | 'archived' | 'draft';
	type UserRole = PageData['userRole'];

	const role: UserRole = $derived(data.userRole);
	const draftSessions: SessionList = $derived(
		data.sessions.filter((session: Session) => session.status === 'draft')
	);
	const activeSessions: SessionList = $derived(
		data.sessions.filter((session: Session) => session.status === 'active')
	);
	const completedSessions: SessionList = $derived(
		data.sessions.filter(
			(session: Session) => session.status === 'completed' || session.status === 'voting_ended'
		)
	);
	const archivedSessions: SessionList = $derived(
		data.sessions.filter((session: Session) => session.status === 'archived')
	);

	const membershipExpiresAt = $derived(
		data.membershipExpiresAt ? new Date(data.membershipExpiresAt) : null
	);

	function formatMembershipExpiry(expiresAt: Date): string {
		const now = new Date();
		const msRemaining = expiresAt.getTime() - now.getTime();
		if (msRemaining <= 0) return 'expired';
		const totalHours = Math.floor(msRemaining / (1000 * 60 * 60));
		const days = Math.floor(totalHours / 24);
		const hours = totalHours % 24;
		if (days > 0) return `${days} day${days === 1 ? '' : 's'}${hours > 0 ? ` ${hours}h` : ''}`;
		return `${hours} hour${hours === 1 ? '' : 's'}`;
	}
</script>

<svelte:head>
	<title>{data.community.title} — Community Voting</title>
	<meta
		name="description"
		content={data.community.description || `${data.community.title} on Community Voting.`}
	/>
	<meta property="og:title" content="{data.community.title} — Community Voting" />
	<meta
		property="og:description"
		content={data.community.description || `${data.community.title} on Community Voting.`}
	/>
	<meta property="og:type" content="website" />
	{#if data.community.header_image}
		<meta property="og:image" content={data.community.header_image} />
		<meta name="twitter:card" content="summary_large_image" />
	{/if}
</svelte:head>

{#if data.community.header_image}
	{@const encodedSrc = encodeURIComponent(data.community.header_image)}
	<div class="-mx-4 -mt-4 mb-6 overflow-hidden sm:-mx-6 md:-mx-8 lg:rounded-sm">
		<img
			src={data.community.header_image}
			srcset={isProd
				? `/_vercel/image?url=${encodedSrc}&w=640&q=75 640w, /_vercel/image?url=${encodedSrc}&w=1080&q=75 1080w, /_vercel/image?url=${encodedSrc}&w=1920&q=75 1920w`
				: undefined}
			sizes={isProd ? '100vw' : undefined}
			alt="{data.community.title} banner"
			class="h-40 w-full object-cover md:h-56"
			fetchpriority="high"
			width="1920"
			height="224"
		/>
	</div>
{/if}
<h1 class="mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl">{data.community.title}</h1>
<p class="mb-4 text-sm text-muted-foreground">{data.community.description}</p>

{#if membershipExpiresAt}
	<div
		class="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400"
	>
		<Clock class="mt-0.5 h-4 w-4 shrink-0" />
		<span>
			Your membership is temporary. You have
			<strong>{formatMembershipExpiry(membershipExpiresAt)}</strong> remaining (expires
			{format(membershipExpiresAt, 'MMM d, yyyy')}).
		</span>
	</div>
{/if}

<nav aria-label="Community submenu" class="py-2">
	{#if role === 'admin' || role === 'moderator'}
		<div class="mb-2 flex justify-end">
			<Button
				size="sm"
				href="/community/{data.community.id}/admin"
				variant="ghost"
				class="gap-1.5 text-muted-foreground"
				aria-label="Admin dashboard"
			>
				<LayoutDashboard />
				<span>Admin Dashboard</span>
			</Button>
		</div>
	{/if}
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<ul class="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-2">
			<li>
				<Button
					size="sm"
					class="w-full sm:w-auto"
					href="/community/{data.community.id}/invites"
					variant="outline"><Send /><span>Invites</span></Button
				>
			</li>
			<li>
				<Button
					size="sm"
					class="w-full sm:w-auto"
					href="/community/{data.community.id}/collection"
					variant="outline"
					><Library /><span>Collection</span><Badge
						class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
						variant="secondary">{data.collectionCount}</Badge
					></Button
				>
			</li>
			<li>
				<Button
					size="sm"
					class="w-full sm:w-auto"
					href="/community/{data.community.id}/leaderboard"
					variant="outline"><Vote />Leaderboard</Button
				>
			</li>
			<li>
				<Button
					size="sm"
					class="w-full sm:w-auto"
					href="/community/{data.community.id}/notifications"
					variant="outline"
					><Bell /><span>Notifications</span>{#if data.communityUnreadCount > 0}<Badge
							class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
							variant="default">{data.communityUnreadCount}</Badge
						>{/if}</Button
				>
			</li>
		</ul>
		{#if data.canCreateSession}
			<Button class="w-full sm:w-auto" href="/voting/create/{data.community.id}">
				<CirclePlus /><span>New voting session</span>
			</Button>
		{/if}
	</div>
</nav>

{#snippet tab(sessionType: SessionTabStatus, filteredSessions: SessionList)}
	<Tabs.Content value={sessionType}>
		{#if filteredSessions && filteredSessions.length > 0}
			<ul class="flex flex-col gap-4">
				{#each filteredSessions as session (session.id)}
					<li>
						<Card.Root class="transition-shadow hover:shadow-md">
							<Card.Header>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0 flex-1 space-y-1">
										<Card.Title class="truncate text-base">{session.title}</Card.Title>
										<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
											<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
												<CalendarDays size={14} />
												{session.gameDayDate
													? format(session.gameDayDate, 'EEE, MMM do h:mm a')
													: 'TBD'}
											</p>
											<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
												<Users size={14} />
												{session.totalVotes}
												{session.totalVotes === 1 ? 'vote' : 'votes'}
											</p>
										</div>
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
								{#if session.selectedOptionId}
									<div
										class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
									>
										<div class="flex items-center gap-2">
											<Trophy class="h-5 w-5 shrink-0 text-amber-500" />
											<span class="font-semibold">Winner: {session.selectedGameTitle}</span>
										</div>
									</div>
								{/if}
							</Card.Content>
							<Card.Footer
								class="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4"
							>
								{#if sessionType === 'draft'}
									<Button class="w-full sm:w-auto" href="/voting/{session.id}/edit"
										>Edit Draft</Button
									>
								{:else}
									{#if session.hasVoted && !session.selectedOptionId}
										<ClearVoteButton votingSessionId={session.id}></ClearVoteButton>
									{:else if session.selectedOptionId}
										<form
											action="?/renew"
											method="post"
											use:enhance={() => {
												return async ({ result, update }) => {
													if (result.type === 'failure') {
														const message =
															typeof result.data?.message === 'string'
																? result.data.message
																: 'Unable to renew session, please try again.';
														toast.error(message);
													}
													if (result.type === 'redirect') {
														toast.success('Voting session renewed!');
													}
													update();
												};
											}}
										>
											<input type="hidden" value={session.id} name="votingSessionId" />
											<Button class="w-full sm:w-auto" variant="ghost" type="submit"
												>Renew session</Button
											>
										</form>
									{/if}
									<Button class="w-full sm:w-auto" href="/voting/{session.id}">View Details</Button>
								{/if}
							</Card.Footer>
						</Card.Root>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
				There are no {sessionType} sessions available.
			</p>
		{/if}
	</Tabs.Content>
{/snippet}

{#if data.sessionsNeedingAction.length > 0}
	<div
		class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
	>
		<div
			class="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200"
		>
			<TriangleAlert class="h-4 w-4 shrink-0" />
			{data.sessionsNeedingAction.length === 1
				? '1 session needs'
				: `${data.sessionsNeedingAction.length} sessions need`} attention
		</div>
		<ul class="divide-y divide-amber-200 dark:divide-amber-800">
			{#each data.sessionsNeedingAction as item (item.id)}
				<li class="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-amber-900 dark:text-amber-100">
							{item.title}
						</p>
						<p class="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
							{item.reason === 'tie'
								? 'Tie — winning game must be selected'
								: 'Completed — player winner data not yet logged'}
						</p>
					</div>
					<Button
						href="/voting/{item.id}"
						size="sm"
						variant="outline"
						class="shrink-0 border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900"
					>
						{item.reason === 'tie' ? 'Resolve tie' : 'Log winners'}
					</Button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<Tabs.Root value="active">
	<div class="overflow-x-auto">
		<Tabs.List class="w-max min-w-full">
			<Tabs.Trigger value="active">Active</Tabs.Trigger>
			<Tabs.Trigger value="completed">Completed</Tabs.Trigger>
			{#if role === 'moderator' || role === 'admin'}
				<Tabs.Trigger value="archived">Archived</Tabs.Trigger>
			{/if}
			{#if draftSessions.length > 0}
				<Tabs.Trigger value="draft"
					>Drafts <Badge
						class="ml-1 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
						variant="secondary">{draftSessions.length}</Badge
					></Tabs.Trigger
				>
			{/if}
		</Tabs.List>
	</div>
	{@render tab('active', activeSessions)}
	{@render tab('completed', completedSessions)}
	{@render tab('archived', archivedSessions)}
	{@render tab('draft', draftSessions)}
</Tabs.Root>
