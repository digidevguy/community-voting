<script
	lang="ts"
	generics="TForm extends { message?: string | null; fieldErrors?: Record<string, unknown> | null; success?: boolean } | null | undefined"
>
	import { untrack } from 'svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { LoaderCircle, ImagePlus } from '@lucide/svelte';
	import { applyAction, enhance } from '$app/forms';

	interface InitialData {
		title?: string;
		description?: string;
		headerImage?: string;
	}

	let {
		initialData,
		action,
		form,
		submitLabel = 'Submit',
		communityId = undefined
	}: {
		initialData: InitialData;
		action: string;
		form: TForm;
		submitLabel?: string;
		communityId?: string;
	} = $props();

	let title = $state(untrack(() => initialData?.title ?? ''));
	let description = $state(untrack(() => initialData?.description ?? ''));
	let headerImageUrl = $state(untrack(() => initialData?.headerImage ?? ''));
	let imageUploading = $state(false);
	let imageError = $state<string | null>(null);
	let loading = $state(false);

	type FieldErrors = {
		errors: string[];
		properties?: Record<string, { errors: string[] }>;
	};

	function getFieldError(field: string): string | undefined {
		const errors = form?.fieldErrors as FieldErrors | undefined;
		return errors?.properties?.[field]?.errors?.[0];
	}

	async function handleImageChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		imageError = null;
		imageUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);
			if (communityId) formData.append('communityId', communityId);

			const res = await fetch('/api/images/upload', { method: 'POST', body: formData });

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.message ?? 'Upload failed');
			}

			const { url } = await res.json();
			headerImageUrl = url;
		} catch (err) {
			imageError = err instanceof Error ? err.message : 'Upload failed';
			toast.error(imageError);
		} finally {
			imageUploading = false;
		}
	}
</script>

<form
	{action}
	method="post"
	class="max-w-2xl space-y-6"
	use:enhance={() => {
		loading = true;
		return async ({ result, update }) => {
			loading = false;
			if (result.type === 'failure') {
				toast.error((result.data?.message as string) ?? 'Something went wrong');
				await update({ reset: false });
			} else if (result.type === 'redirect') {
				toast.success('Community created successfully!');
				applyAction(result);
			} else if (result.type === 'success') {
				toast.success('Community updated successfully!');
				await update({ reset: false });
			}
		};
	}}
>
	<div class="space-y-2">
		<Label for="title">Title</Label>
		<Input id="title" name="title" value={title} />
		{#if getFieldError('title')}
			<p class="text-sm text-destructive">{getFieldError('title')}</p>
		{/if}
	</div>
	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			name="description"
			placeholder="Add your description here..."
			value={description}
		/>
		{#if getFieldError('description')}
			<p class="text-sm text-destructive">{getFieldError('description')}</p>
		{/if}
	</div>
	<div class="space-y-2">
		<Label for="headerImage">Header Image</Label>
		<label
			for="headerImage"
			class="relative block cursor-pointer overflow-hidden rounded-md border border-input transition-colors hover:border-primary"
		>
			{#if imageUploading}
				<div class="flex h-36 items-center justify-center bg-muted">
					<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			{:else if headerImageUrl}
				<img src={headerImageUrl} alt="Community header preview" class="h-36 w-full object-cover" />
				<div
					class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
				>
					<span class="flex items-center gap-1.5 text-sm font-medium text-white">
						<ImagePlus class="h-4 w-4" />
						Change image
					</span>
				</div>
			{:else}
				<div
					class="flex h-36 flex-col items-center justify-center gap-2 bg-muted text-muted-foreground"
				>
					<ImagePlus class="h-6 w-6" />
					<span class="text-sm">Click to upload an image</span>
					<span class="text-xs">JPEG, PNG or WebP · Max 2MB</span>
				</div>
			{/if}
		</label>
		<input
			id="headerImage"
			type="file"
			accept="image/jpeg,image/png,image/webp"
			disabled={imageUploading}
			onchange={handleImageChange}
			class="sr-only"
		/>
		{#if imageError}
			<p class="text-sm text-destructive">{imageError}</p>
		{:else if getFieldError('headerImage')}
			<p class="text-sm text-destructive">{getFieldError('headerImage')}</p>
		{/if}
		<input type="hidden" name="headerImage" value={headerImageUrl} />
	</div>
	<Button type="submit" disabled={loading || imageUploading}>
		{#if loading}
			<LoaderCircle class="animate-spin" />
		{:else}
			{submitLabel}
		{/if}
	</Button>
</form>
