<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index';
	import * as Card from '$lib/components/ui/card/index';
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from 'svelte-sonner';

	let { form }: { form: ActionData } = $props();

	let activeTab: 'login' | 'register' = $state('register');
	let loading = $state(false);

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				toast.success(activeTab === 'login' ? 'Logged in successfully!' : 'Account created!');
			}
			await update();
			loading = false;
		};
	};
</script>

<svelte:head>
	<title>Game Voting - Sign In</title>
	<meta name="description" content="Sign in to vote on games with your friends" />
</svelte:head>

<article class="flex flex-col items-center gap-6 py-8 sm:py-12">
	<div class="text-center">
		<h1 class="text-2xl font-semibold">Welcome</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Sign in or register to start voting with your friends!
		</p>
	</div>
	<div class="w-full max-w-sm">
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="w-full">
				<Tabs.Trigger value="login" class="flex-1">Log in</Tabs.Trigger>
				<Tabs.Trigger value="register" class="flex-1">Register</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="login">
				<Card.Root>
					<Card.Header>
						<Card.Title>Log in</Card.Title>
						<Card.Description>Welcome back! Please enter your details.</Card.Description>
					</Card.Header>
					<Card.Content>
						<form action="?/login" method="POST" use:enhance={handleSubmit} class="grid gap-4">
							<div class="grid gap-2">
								<Label for="username">Username</Label>
								<Input id="username" name="username" type="text" placeholder="bossman2025" />
							</div>
							<div class="grid gap-2">
								<Label for="password">Password</Label>
								<Input id="password" name="password" type="password" placeholder="Your password" />
							</div>
							<Button type="submit" disabled={loading}
								>{loading ? 'Submitting...' : 'Submit'}</Button
							>
							{#if form?.message}
								<p class="text-sm text-destructive">{form.message}</p>
							{/if}
						</form>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
			<Tabs.Content value="register">
				<Card.Root>
					<Card.Header>
						<Card.Title>Register</Card.Title>
						<Card.Description>Create an account to start voting.</Card.Description>
					</Card.Header>
					<Card.Content class="grid gap-6">
						<form action="?/register" method="POST" use:enhance={handleSubmit} class="grid gap-4">
							<div class="grid gap-2">
								<Label for="email">Email</Label>
								<Input id="email" name="email" type="email" placeholder="iami@email.com" />
							</div>
							<div class="grid gap-2">
								<Label for="newUsername">Username</Label>
								<Input id="newUsername" name="username" type="text" placeholder="bossman2025" />
								<p class="text-xs text-muted-foreground">
									Lowercase letters, numbers, hyphens, and underscores only.
								</p>
							</div>
							<div class="grid gap-2">
								<Label for="displayName">Display Name</Label>
								<Input
									id="displayName"
									name="displayName"
									type="text"
									placeholder="Boss Man 2025"
								/>
							</div>
							<div class="grid gap-2">
								<Label for="newPassword">Password</Label>
								<Input
									id="newPassword"
									name="password"
									type="password"
									placeholder="Your password"
								/>
							</div>
							<div class="grid gap-2">
								<Label for="confirmPassword">Confirm Password</Label>
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									placeholder="Confirm your password"
								/>
							</div>
							<Button type="submit" disabled={loading}
								>{loading ? 'Submitting...' : 'Submit'}</Button
							>
							{#if form?.message}
								<p class="text-sm text-destructive">{form.message}</p>
							{/if}
						</form>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</article>
