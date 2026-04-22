<script lang="ts">
	type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

	let {
		type = 'note',
		title,
		children
	}: {
		type?: AlertType;
		title?: string;
		children?: import('svelte').Snippet;
	} = $props();

	const titleMap: Record<AlertType, string> = {
		note: 'Note',
		tip: 'Tip',
		important: 'Important',
		warning: 'Warning',
		caution: 'Caution'
	};

	const styleMap: Record<AlertType, string> = {
		note: 'border-blue-600/70 dark:border-blue-400/80',
		tip: 'border-green-600/70 dark:border-green-400/80',
		important: 'border-violet-600/70 dark:border-violet-400/80',
		warning: 'border-amber-600/80 dark:border-amber-400/90',
		caution: 'border-red-600/80 dark:border-red-400/90'
	};

	const label = $derived(title ?? titleMap[type]);
</script>

<aside class={`my-5 rounded-md border-l-4 bg-muted/40 px-4 py-3 ${styleMap[type]}`} role="note">
	<p class="!mt-0 !mb-2 text-sm font-semibold tracking-wide">{label}</p>
	<div class="text-sm">
		{@render children?.()}
	</div>
</aside>
