<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import { Bell, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { cn, formatDate } from '$lib/utils';

	let { data }: { data: PageServerData } = $props();

	const LIMIT = 20;

	// Optimistic read overrides: id → isRead value. SvelteMap triggers reactivity on .set()/.delete()
	const readOverrides = new SvelteMap<string, boolean>();
	let markingAllRead = $state(false);

	const localNotifications = $derived(
		data.notifications.map((n) => ({
			...n,
			isRead: readOverrides.has(n.id) ? readOverrides.get(n.id)! : n.isRead
		}))
	);

	const totalPages = $derived(Math.ceil(data.total / LIMIT));
	const hasUnread = $derived(localNotifications.some((n) => !n.isRead));

	const tabClass = (active: boolean) =>
		cn(
			'h-7 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]',
			active
				? 'bg-background text-foreground shadow-sm'
				: 'text-muted-foreground hover:text-foreground'
		);

	function pageUrl(p: number) {
		return resolve('/notifications') + `?filter=${data.filter}&page=${p}`;
	}

	async function markAsRead(id: string) {
		readOverrides.set(id, true);
		try {
			const res = await fetch('/api/notifications/read', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error();
		} catch {
			readOverrides.set(id, false);
		}
	}

	async function handleNoEntityClick(n: (typeof localNotifications)[0]) {
		if (!n.isRead) {
			await markAsRead(n.id);
			await invalidateAll();
		}
	}

	async function markAllRead() {
		const ids = localNotifications.filter((n) => !n.isRead).map((n) => n.id);
		for (const id of ids) readOverrides.set(id, true);
		markingAllRead = true;
		try {
			const res = await fetch('/api/notifications/read', { method: 'PATCH' });
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			for (const id of ids) readOverrides.delete(id);
		} finally {
			markingAllRead = false;
		}
	}
</script>

<h1 class="mb-4 text-xl font-semibold sm:text-2xl">Notifications</h1>

<div class="mb-4 flex items-center justify-between gap-4">
	<div class="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
		<Button
			href={resolve('/notifications?filter=unread&page=1')}
			variant="ghost"
			size="sm"
			class={tabClass(data.filter === 'unread')}
		>
			Unread
			{#if data.filter === 'unread' && data.total > 0}
				<Badge class="ml-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
					{data.total}
				</Badge>
			{/if}
		</Button>
		<Button
			href={resolve('/notifications?filter=all&page=1')}
			variant="ghost"
			size="sm"
			class={tabClass(data.filter === 'all')}
		>
			All
		</Button>
	</div>

	{#if data.filter === 'unread' && hasUnread}
		<Button variant="ghost" size="sm" onclick={markAllRead} disabled={markingAllRead}>
			Mark all as read
		</Button>
	{/if}
</div>

{#if localNotifications.length === 0}
	{#if data.filter === 'unread'}
		<div class="py-12 text-center">
			<Bell class="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
			<p class="text-sm text-muted-foreground">You're all caught up!</p>
			<Button
				href={resolve('/notifications?filter=all')}
				variant="link"
				class="mt-1 h-auto p-0 text-sm"
			>
				View all notifications
			</Button>
		</div>
	{:else}
		<div class="py-12 text-center">
			<Bell class="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
			<p class="text-sm text-muted-foreground">No notifications yet.</p>
		</div>
	{/if}
{:else}
	<ul class="flex flex-col gap-2">
		{#each localNotifications as n (n.id)}
			<li>
				{#if n.relatedEntityType === 'voting_session' && n.relatedEntityId}
					<Button
						href={resolve(`/voting/${n.relatedEntityId}`)}
						variant="ghost"
						class="block h-auto w-full rounded-lg p-0 font-normal"
						onclick={() => {
							if (!n.isRead) markAsRead(n.id);
						}}
					>
						{@render notificationCard(n)}
					</Button>
				{:else if n.relatedEntityType === 'game' && n.relatedEntityId}
					<Button
						href={resolve(`/library/${n.relatedEntityId}`)}
						variant="ghost"
						class="block h-auto w-full rounded-lg p-0 font-normal"
						onclick={() => {
							if (!n.isRead) markAsRead(n.id);
						}}
					>
						{@render notificationCard(n)}
					</Button>
				{:else if n.type === 'app_update'}
					<Button
						href={resolve('/docs/updates')}
						variant="ghost"
						class="block h-auto w-full rounded-lg p-0 font-normal"
						onclick={() => {
							if (!n.isRead) markAsRead(n.id);
						}}
					>
						{@render notificationCard(n)}
					</Button>
				{:else}
					<button
						class="w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						onclick={() => handleNoEntityClick(n)}
					>
						{@render notificationCard(n)}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

{#snippet notificationCard(n: (typeof localNotifications)[0])}
	<Card.Root
		class={cn('transition-colors hover:bg-muted/50', !n.isRead && 'border-l-2 border-l-primary')}
	>
		<Card.Header class="pt-3 pb-1">
			<div class="flex items-start justify-between gap-2">
				<Card.Title class="text-sm font-medium">{n.title}</Card.Title>
				{#if !n.isRead}
					<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread"></span>
				{/if}
			</div>
		</Card.Header>
		<Card.Content class="pt-0 pb-3">
			<p class="text-sm text-muted-foreground">{n.message}</p>
			<time
				class="mt-1 block text-xs text-muted-foreground/70"
				datetime={n.createdAt.toISOString()}
			>
				{formatDate(n.createdAt)}
			</time>
		</Card.Content>
	</Card.Root>
{/snippet}

{#if totalPages > 1}
	<div class="mt-6 flex items-center justify-center gap-3">
		<Button
			href={pageUrl(data.page - 1)}
			variant="outline"
			size="sm"
			disabled={data.page <= 1}
			aria-label="Previous page"
		>
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<span class="text-sm text-muted-foreground">Page {data.page} of {totalPages}</span>
		<Button
			href={pageUrl(data.page + 1)}
			variant="outline"
			size="sm"
			disabled={data.page >= totalPages}
			aria-label="Next page"
		>
			<ChevronRight class="h-4 w-4" />
		</Button>
	</div>
{/if}
