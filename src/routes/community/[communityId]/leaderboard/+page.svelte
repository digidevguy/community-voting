<script lang="ts">
	import type { PageServerData } from './$types';
	import { page } from '$app/state';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import * as Avatar from '$lib/components/ui/avatar';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatDate } from '$lib/utils';
	import { ChevronLeft, ChevronRight, CircleChevronLeft } from '@lucide/svelte';

	let { data }: { data: PageServerData } = $props();

	let activeTab = $state('topGames');

	const gamesPage = $derived(Math.max(1, Number(page.url.searchParams.get('gamesPage') ?? '1')));
	const usersPage = $derived(Math.max(1, Number(page.url.searchParams.get('usersPage') ?? '1')));
	const recentPage = $derived(Math.max(1, Number(page.url.searchParams.get('recentPage') ?? '1')));

	function pageUrl(key: string, value: number) {
		const entries: Record<string, string> = Object.fromEntries(page.url.searchParams);
		entries[key] = String(value);
		const qs = Object.entries(entries)
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
			.join('&');
		return `?${qs}`;
	}

	function initials(name: string | null) {
		if (!name) return '?';
		return name
			.split(' ')
			.map((n) => n[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}
</script>

<Button
	href="/community/{data.communityId}"
	variant="outline"
	class="mb-1 -ml-2 text-muted-foreground"
>
	<CircleChevronLeft />Back
</Button>

<h1 class="mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl">Community Leaderboard</h1>

<Tabs.Root bind:value={activeTab}>
	<Tabs.List class="w-max min-w-full">
		<Tabs.Trigger value="topGames">Top Games</Tabs.Trigger>
		<Tabs.Trigger value="topUsers">Top Users</Tabs.Trigger>
		<Tabs.Trigger value="recentWins">Recent Wins</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="topGames" class="mt-4">
		{#if data.topGames.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No games have won yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">#</Table.Head>
							<Table.Head>Game</Table.Head>
							<Table.Head class="text-right">Wins</Table.Head>
							<Table.Head class="text-right">Last Win</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.topGames as g, i (g.gameId)}
							<Table.Row>
								<Table.Cell class="text-muted-foreground">
									{(gamesPage - 1) * data.limit + i + 1}
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-3">
										{#if g.image}
											<img
												src={g.image}
												alt={g.title ?? 'Game'}
												class="h-8 w-8 rounded object-cover"
											/>
										{:else}
											<div class="h-8 w-8 rounded bg-muted"></div>
										{/if}
										<span>{g.title ?? 'Unknown Game'}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right font-medium">{g.winCount}</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">
									{g.lastWin ? formatDate(g.lastWin) : '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<div class="mt-4 flex items-center justify-between">
				<Button
					variant="outline"
					size="sm"
					href={pageUrl('gamesPage', gamesPage - 1)}
					disabled={gamesPage <= 1}
				>
					<ChevronLeft />Previous
				</Button>
				<span class="text-sm text-muted-foreground">Page {gamesPage}</span>
				<Button
					variant="outline"
					size="sm"
					href={pageUrl('gamesPage', gamesPage + 1)}
					disabled={data.topGames.length < data.limit}
				>
					Next<ChevronRight />
				</Button>
			</div>
		{/if}
	</Tabs.Content>

	<Tabs.Content value="topUsers" class="mt-4">
		{#if data.topUsers.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No winners recorded yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">#</Table.Head>
							<Table.Head>Player</Table.Head>
							<Table.Head class="text-right">Wins</Table.Head>
							<Table.Head class="text-right">Last Win</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.topUsers as u, i (u.userId)}
							<Table.Row>
								<Table.Cell class="text-muted-foreground">
									{(usersPage - 1) * data.limit + i + 1}
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<Avatar.Root>
											<Avatar.Image src={u.image ?? undefined} alt={u.name ?? 'User'} />
											<Avatar.Fallback>{initials(u.name)}</Avatar.Fallback>
										</Avatar.Root>
										<span>{u.name ?? 'Unknown User'}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right font-medium">{u.winCount}</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">
									{u.lastWin ? formatDate(u.lastWin) : '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<div class="mt-4 flex items-center justify-between">
				<Button
					variant="outline"
					size="sm"
					href={pageUrl('usersPage', usersPage - 1)}
					disabled={usersPage <= 1}
				>
					<ChevronLeft />Previous
				</Button>
				<span class="text-sm text-muted-foreground">Page {usersPage}</span>
				<Button
					variant="outline"
					size="sm"
					href={pageUrl('usersPage', usersPage + 1)}
					disabled={data.topUsers.length < data.limit}
				>
					Next<ChevronRight />
				</Button>
			</div>
		{/if}
	</Tabs.Content>

	<Tabs.Content value="recentWins" class="mt-4">
		{#if data.recentWins.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No wins recorded yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Player</Table.Head>
							<Table.Head>Game</Table.Head>
							<Table.Head class="text-right">Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.recentWins as win, i ((win.winnerUserId ?? '') + (win.gameId ?? '') + i)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<Avatar.Root>
											<Avatar.Image src={win.userImage ?? undefined} alt={win.userName ?? 'User'} />
											<Avatar.Fallback>{initials(win.userName)}</Avatar.Fallback>
										</Avatar.Root>
										<span>{win.userName ?? 'Unknown User'}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-3">
										{#if win.gameImage}
											<img
												src={win.gameImage}
												alt={win.gameTitle ?? 'Game'}
												class="h-8 w-8 rounded object-cover"
											/>
										{:else}
											<div class="h-8 w-8 rounded bg-muted"></div>
										{/if}
										<span>{win.gameTitle ?? 'Unknown Game'}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">
									{win.resolvedAt ? formatDate(win.resolvedAt) : '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<div class="mt-4 flex items-center justify-between">
				<Button
					variant="outline"
					size="sm"
					href={pageUrl('recentPage', recentPage - 1)}
					disabled={recentPage <= 1}
				>
					<ChevronLeft />Previous
				</Button>
				<span class="text-sm text-muted-foreground">Page {recentPage}</span>
				<Button
					variant="outline"
					size="sm"
					href={pageUrl('recentPage', recentPage + 1)}
					disabled={data.recentWins.length < data.limit}
				>
					Next<ChevronRight />
				</Button>
			</div>
		{/if}
	</Tabs.Content>
</Tabs.Root>
