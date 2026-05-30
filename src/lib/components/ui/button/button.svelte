<script lang="ts" module>
	import { cn } from '$lib/utils.js';
	import {
		buttonVariants,
		type ButtonProps,
		type ButtonVariant,
		type ButtonSize
	} from './button.variants.js';
	export { buttonVariants, type ButtonVariant, type ButtonSize, type ButtonProps };
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href && !disabled}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{href}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
