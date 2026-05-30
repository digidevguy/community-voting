<script lang="ts">
	import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
	import { Button } from '$lib/components/ui/button';
	import { BellOff, Bell } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	function urlBase64ToUint8Array(base64String: string): Uint8Array {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64);
		return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
	}

	type PermissionState = 'default' | 'granted' | 'denied';

	let permission = $state<PermissionState>(
		typeof Notification !== 'undefined' ? (Notification.permission as PermissionState) : 'default'
	);
	let subscribed = $state(false);
	let loading = $state(false);

	async function checkSubscription() {
		if (!('serviceWorker' in navigator)) return;
		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.getSubscription();
		subscribed = !!sub;
	}

	$effect(() => {
		checkSubscription();
	});

	async function subscribe() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			toast.error('Push notifications are not supported in this browser.');
			return;
		}

		loading = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY).buffer as ArrayBuffer
			});

			permission = Notification.permission as PermissionState;

			const json = sub.toJSON();
			await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(json)
			});

			subscribed = true;
			toast.success('Push notifications enabled.');
		} catch {
			permission = Notification.permission as PermissionState;
			if (permission === 'denied') {
				toast.error('Notifications blocked. Please enable them in your browser settings.');
			} else {
				toast.error('Failed to enable push notifications.');
			}
		} finally {
			loading = false;
		}
	}

	async function unsubscribe() {
		loading = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await sub.unsubscribe();
				await fetch('/api/push/subscribe', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ endpoint: sub.endpoint })
				});
			}
			subscribed = false;
			toast.success('Push notifications disabled.');
		} catch {
			toast.error('Failed to disable push notifications.');
		} finally {
			loading = false;
		}
	}
</script>

{#if permission === 'denied'}
	<Button variant="ghost" size="sm" disabled title="Notifications blocked in browser settings">
		<BellOff class="h-4 w-4" />
		<span class="sr-only">Notifications blocked</span>
	</Button>
{:else if subscribed}
	<Button
		variant="ghost"
		size="sm"
		onclick={unsubscribe}
		disabled={loading}
		title="Disable push notifications"
	>
		<Bell class="h-4 w-4" />
		<span class="sr-only">Disable notifications</span>
	</Button>
{:else}
	<Button
		variant="ghost"
		size="sm"
		onclick={subscribe}
		disabled={loading}
		title="Enable push notifications"
	>
		<BellOff class="h-4 w-4" />
		<span class="sr-only">Enable notifications</span>
	</Button>
{/if}
