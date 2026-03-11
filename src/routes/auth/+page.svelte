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

<article>
	<div>
		<h1>Auth</h1>
		<p>Sign in or register to start voting with your friends!</p>
	</div>
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List>
			<Tabs.Trigger value="login">Log in</Tabs.Trigger>
			<Tabs.Trigger value="register">Register</Tabs.Trigger>
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
							<Input id="username" name="username" type="text" placeholder="BossMan2025" />
						</div>
						<div class="grid gap-2">
							<Label for="password">Password</Label>
							<Input id="password" name="password" type="password" placeholder="Your password" />
						</div>
						<Button type="submit">Submit</Button>
						<p style="color: red">{form?.message ?? ''}</p>
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
							<Label for="username">Username</Label>
							<Input id="username" name="username" type="text" placeholder="BossMan2025" />
						</div>
						<div class="grid gap-2">
							<Label for="displayName">Display Name</Label>
							<Input id="displayName" name="displayName" type="text" placeholder="Boss Man 2025" />
						</div>
						<div class="grid gap-2">
							<Label for="password">Password</Label>
							<Input id="password" name="password" type="password" placeholder="Your password" />
						</div>
						<div class="grid gap-2">
							<Label for="confirmPassword">Password</Label>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								placeholder="Confirm your password"
							/>
						</div>
						<Button type="submit">Submit</Button>
						<p style="color: red">{form?.message ?? ''}</p>
					</form>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</article>
