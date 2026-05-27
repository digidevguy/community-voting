<script lang="ts">
	import { untrack } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Bell, CheckCheck } from '@lucide/svelte';
	import type { Notification } from '$lib/server/db/schema';
	import PushSubscribeButton from '$lib/components/custom/PushSubscribeButton.svelte';

	let {
		unreadCount,
		recentNotifications = []
	}: {
		unreadCount: number;
		recentNotifications?: Notification[];
	} = $props();

	// untrack: intentionally capturing initial prop value; $effect below keeps these in sync on navigation
	let localUnreadCount = $state<number>(untrack(() => unreadCount));
	let localNotifications = $state<Notification[]>(untrack(() => recentNotifications ?? []));

	$effect(() => {
		localUnreadCount = unreadCount;
		localNotifications = recentNotifications ?? [];
	});

	function getNotificationUrl(n: Notification): string | null {
		if (!n.relatedEntityType || !n.relatedEntityId) return null;
		switch (n.relatedEntityType) {
			case 'voting_session':
				return `/voting/${n.relatedEntityId}`;
			case 'game':
				return `/library/${n.relatedEntityId}`;
			case 'user':
				return '/profile';
			default:
				return null;
		}
	}

	async function markAllRead() {
		await fetch('/api/notifications/read', { method: 'PATCH' });
		localUnreadCount = 0;
		localNotifications = localNotifications.map((n) => ({ ...n, isRead: true }));
	}

	async function markOneRead(id: string) {
		const target = localNotifications.find((n) => n.id === id);
		if (!target || target.isRead) return;
		await fetch('/api/notifications/read', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		localNotifications = localNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
		localUnreadCount = Math.max(0, localUnreadCount - 1);
	}

	function formatTime(date: Date | string): string {
		const ms = Date.now() - new Date(date).getTime();
		const m = Math.floor(ms / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	}
</script>

<Popover.Root>
	<Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'icon' })}>
		<span class="relative inline-flex">
			<Bell class="h-4 w-4" />
			{#if localUnreadCount > 0}
				<span
					class="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
				>
					{localUnreadCount > 99 ? '99+' : localUnreadCount}
				</span>
			{/if}
		</span>
	</Popover.Trigger>

	<Popover.Content class="w-80 p-0" align="center">
		<div class="flex items-center justify-between border-b px-4 py-3">
			<span class="text-sm font-semibold">Notifications</span>
			{#if localUnreadCount > 0}
				<Button variant="ghost" size="sm" class="h-auto px-2 py-1 text-xs" onclick={markAllRead}>
					<CheckCheck class="mr-1 h-3 w-3" />Mark all read
				</Button>
			{/if}
		</div>

		<div class="max-h-80 overflow-y-auto">
			{#if localNotifications.length === 0}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
			{:else}
				{#each localNotifications as n (n.id)}
					{@const url = getNotificationUrl(n)}
					<div
						class="flex gap-3 border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
						class:bg-muted={!n.isRead}
					>
						<div class="mt-1.5 h-2 w-2 shrink-0 rounded-full {n.isRead ? '' : 'bg-blue-500'}"></div>
						<div class="min-w-0 flex-1">
							{#if url}
								<a
									href={url}
									class="block text-sm font-medium hover:underline"
									onclick={(e) => {
										e.stopPropagation();
										markOneRead(n.id);
									}}
								>
									{n.title}
								</a>
							{:else}
								<button
									class="cursor-default text-left text-sm font-medium"
									onclick={() => markOneRead(n.id)}
								>
									{n.title}
								</button>
							{/if}
							<p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
							<p class="mt-1 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<div class="flex flex-col gap-2 border-t px-4 py-3">
			<div class="flex items-center justify-between">
				<span class="text-xs text-muted-foreground">Push notifications</span>
				<PushSubscribeButton />
			</div>
			<a
				href="/notifications"
				class="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				View all notifications
			</a>
		</div>
	</Popover.Content>
</Popover.Root>
