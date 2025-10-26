# Voting app prompt

I am building a web application for myself and my friends to voting on what game we want to play when choosing a board game or video game. 

## MVP Features

This will be expanded on later, but the initial features to build are:

1. Pull game data from the Steam API for a video game, or board game data from BoardGameGeek’s API based on user search to add to database (Basic CRUD operations).
2. User creates a voting session that contains a selection of games from the database, and shares a unique link to the other users to vote.
3. A page to view the current vote breakdown for a session (should be a dynamic route to handle session id

## Tech Stack Notes

I want to app this app to be performant and scalable, as I have future features planned. The tools I will be using:

- Language — TypeScript
- Frontend/backend — Svelte/SvelteKit
- Styling — Tailwind CSS
- Component Design - shadcn/svelte
- Database - PostgreSQL
- ORM - Drizzle
- Testing - vitest
- Authentication - Lucia Auth
- Validation - Zod

## Project structure notes

We will be following best practices for SvelteKit folder structure, remember at all times that all frontend logic will use the new Svelte 5 syntax. 

In the `src` folder there should be:

- A `lib` folder with the subfolders:
    - `server` folder to contain all server-only files
    - `components` folder for all component files
    - `assets` folder for files such as favicon
- A `params` folder containing my param matchers
- A `routes` folder for all routing
    - `auth` folder for handling login and register flows
    - `session` folder for voting session
        - `create` folder for creating a new voting session and adding games to selection
        - `slug` folder for handling share links for a specific voting session. Will handle both user voting and displaying current vote breakdown

## Data Schemas

### Game

```json
{
	"id": "string (UUID)",
	"title": "string",
	"type": "enum ['board_game', 'video_game']",
	"description": "string",
	"image": "string (URL)",
	"minPlayers": "integer",
	"maxPlayers": "integer",
	"playingTime": "integer (minutes)",
	"ageRating": "string",
	"publisher": "string",
	"developer": "string",
	"releaseDate": "date",
	"categories": "array of strings",
	"mechanics": "array of strings",
	"externalIds": {
	  "bggId": "integer (BoardGameGeek ID)",
	  "steamId": "integer (Steam App ID)",
	  "steamStoreUrl": "string"
	},
	"rating": "float (average rating)",
	"complexity": "float (1-5 scale)",
	"isActive": "boolean",
	"addedBy": "string (user ID)",
	"createdAt": "datetime",
	"updatedAt": "datetime"
},
```

## MVP #1 Notes

### Steam search for video game data

We will have a page that will contain:

- A form to handle user input for game titles
- A list component that shows the current search results
- A second list component to show the list of selected games

**Proposed user flow:** The user will navigate to the page, then use add a game title to the form. On submitting the form, the request goes to the server which validates the game title and runs a database search for a match: if a match is found and the `image` property is not `null` the game data is returned to the user, if no match or the `image` property is `null`, use the game’s `externalIds.steamId` to query the steam API for a match. The resulting data is returned to the user or, if no match or an error is thrown, the response is returned to the user. Once the match is confirmed by the user, the response data is transformed and saved into the database.

### BoardGameGeek search for board game data

To be added…