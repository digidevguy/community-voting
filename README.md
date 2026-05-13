# Community Voting

A web app for friend groups to organize and vote on which game to play next.
Members sync their Steam libraries, build a shared collection, and run timed
voting sessions — with a leaderboard tracking who picks the winning game.

> Built as a personal learning project to explore SvelteKit, server-side
> auth, and full-stack TypeScript patterns.

**[Live Demo](https://community-voting-gamma.vercel.app)**

---

## Features

- **Discord login** — sign in with Discord, no separate registration
- **Steam library sync** — link your Steam account to import your game library
- **Community collections** — build a shared pool of games from members' libraries
- **Voting sessions** — timed votes with real-time or hidden results, tie-break support
- **Leaderboard** — tracks winners across sessions and ranks members by game night wins
- **Role-based access** — owner, admin, moderator, and member roles per community
- **In-app documentation** — `/docs` covers all features for end users

## Tech Stack

| Layer        | Tech                                                          |
| ------------ | ------------------------------------------------------------- |
| Framework    | [SvelteKit](https://svelte.dev)                               |
| Language     | TypeScript                                                    |
| Database     | PostgreSQL via [Neon](https://neon.tech)                      |
| ORM          | [Drizzle ORM](https://orm.drizzle.team)                       |
| Auth         | [Better Auth](https://www.better-auth.com) + Discord OAuth    |
| File Storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)    |
| Deployment   | [Vercel](https://vercel.com)                                  |
| UI           | [shadcn-svelte](https://www.shadcn-svelte.com) + Tailwind CSS |

## Local Development

**Prerequisites:** Node.js 20+, Docker

```bash
# 1. Clone and install
git clone https://github.com/digidevguy/community-voting.git
cd community-voting
npm install

# 2. Set up environment
cp .env.example .env
# Fill in .env — see comments in the file for where to get each value

# 3. Start the database
npm run db:start

# 4. Run migrations
npm run db:migrate

# 5. Start the dev server
npm run dev
```

### External services needed

| Service           | Purpose           | Docs                                                                    |
| ----------------- | ----------------- | ----------------------------------------------------------------------- |
| Discord OAuth app | Authentication    | [Discord Developer Portal](https://discord.com/developers/applications) |
| Steam API key     | Game library sync | [Steam API Key](https://steamcommunity.com/dev/apikey)                  |
| Vercel Blob token | Image uploads     | [Vercel Blob docs](https://vercel.com/docs/storage/vercel-blob)         |

### Available scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit + e2e tests
npm run test:unit    # Unit tests only (Vitest)
npm run test:e2e     # E2e tests only (Playwright)
npm run db:studio    # Open Drizzle Studio (DB browser)
npm run db:generate  # Generate a new migration
npm run db:migrate   # Apply migrations
```

## License

[MIT](LICENSE)
