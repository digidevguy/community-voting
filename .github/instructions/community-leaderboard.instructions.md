# Plan for Winner Tracking and Leaderboards

## Goal

Introduce a reliable winner-tracking foundation that supports:

- Winner display on the related voting session page
- A dedicated community leaderboard page
- Optional user-profile leaderboard summaries

Image persistence remains out of scope for phase 1.

## Gaps in the Initial Draft

The original plan is directionally good, but several logic gaps should be resolved before implementation:

1. Winner definition is ambiguous
   - Is the winner the selected game, the user who added the winning option, or both?
   - The current schema already has `voting_session.selectedOptionId`; leaderboard data must align with that source of truth.
   - **Answer**: The winner(s) should be the user(s) that win that game night.

2. Tie handling is undefined
   - Multiple winners per session must be explicit (shared win, manual tie-break, or deterministic tie-break rule).
   - **Answer**: shared win, which should also handle the team win use case.

3. Write timing is missing
   - Define exactly when winner rows are written (status transition to `completed`, manual finalize action, or both).
   - **Answer**: Use Option B. Sessions may move to `completed` before winner users are logged, but completed sessions without winner users must be treated as unresolved and surfaced via explicit safeguards until winner rows are recorded.

4. Idempotency and correction path are missing
   - Re-running finalize or editing session outcomes must not duplicate wins.
   - **Answer**: Use replacement semantics per session. When winners are logged or corrected, delete existing `session_winner` rows for that session inside a transaction and insert the new winner set. This keeps writes idempotent and makes corrections straightforward.

5. Aggregation strategy is not separated from event facts
   - A single table can become hard to evolve if it mixes canonical outcome facts and precomputed rankings.
   - **Answer**: Keep `session_winner` as the canonical fact table, and derive leaderboard data from grouped queries in phase 1. Only add a persisted aggregate table later if query cost becomes measurable.

6. Deletion and nullability behavior is not specified
   - `user_id` may need to allow null for deleted users or system-selected winners.
   - **Answer**: `user_id` should be nullable

## Recommended Data Model

Use a two-layer approach:

1. Canonical outcome table (required)
2. Derived leaderboard query/stats (query-first, optional persisted stats later)

### 1) Canonical Outcome Table (Required)

Create a new table, e.g. `session_winner`, storing one row per winning option per session.

Suggested columns:

- `id`: uuid pk (or composite pk)
- `community_id`: uuid not null
- `voting_session_id`: uuid not null
- `voting_option_id`: uuid not null
- `game_id`: uuid not null
- `winner_user_id`: text nullable (user tied to the winning option when applicable)
- `win_type`: enum/text (`single`, `shared_tie`, `tie_break`)
- `vote_count`: integer nullable (snapshot for ranking/auditing)
- `resolved_by`: text nullable (admin/mod who finalized tie-break)
- `resolved_at`: timestamptz nullable
- `created_at`: timestamptz not null default now
- `updated_at`: timestamptz not null default now

Recommended uniqueness for shared wins:

- Unique: (`voting_session_id`, `voting_option_id`, `winner_user_id`)

This allows multiple winners for the same session and option while still preventing duplicate rows for the same winner.

Recommended constraints and indexes:

- Index: (`community_id`, `created_at desc`)
- Index: (`winner_user_id`, `created_at desc`) where `winner_user_id is not null`
- Foreign keys with predictable delete behavior:
  - Session: cascade
  - Option: cascade
  - Community: cascade
  - User: set null

### 2) Derived Leaderboard (Start with Query, Add Stats Table Later if Needed)

Phase 1: derive leaderboard via grouped queries on `session_winner`.

- Community game leaderboard: group by `game_id`, count wins
- Community user leaderboard: group by `winner_user_id`, count wins
- Profile leaderboard summary: group by `winner_user_id` scoped to user

Phase 2 (optional): add pre-aggregated table only if query cost becomes measurable.

## Write and Reconciliation Lifecycle

Use a single service entry point for outcome persistence, invoked when session outcomes are finalized.

Rules:

1. Allow the existing session lifecycle to complete even when winner users are still unknown.
2. Write winners when winner users are explicitly logged, which may happen during `voting_ended` or after the session is already `completed`.
3. Perform write in a transaction.
4. Ensure idempotency by replacing rows for the target session:
   - delete existing `session_winner` rows for `voting_session_id`
   - insert current winner set
5. If a session is reopened or outcome changes, re-run the same reconciliation flow.

This keeps winner history aligned with editable session outcomes and avoids drift.

## Unresolved Session Safeguard

Because Option B allows a session to be completed before winner users are recorded, the implementation must include an explicit safeguard for unresolved sessions.

Definition:

- A session is unresolved when `status='completed'` and there are zero non-null `winner_user_id` rows in `session_winner` for that session.

Required behavior:

- Surface unresolved status on the voting session page for privileged users.
- Surface unresolved counts on the community page.
- Surface unresolved flags and filters in the admin sessions view.
- Support an age-based query such as unresolved sessions older than 24 hours.

This safeguard is part of the feature, not an optional enhancement.

## Tie Strategy (Must Decide Before Build)

Pick one and encode it as policy:

1. Shared win: all top-vote options get a winner row.
2. Manual tie-break: privileged user selects one winner (store `resolved_by`, `resolved_at`, `win_type='tie_break'`).
3. Deterministic auto tie-break: fixed rule (e.g., earliest option creation).

Recommendation: start with shared wins for least friction, then add manual tie-break later if product requires single-winner semantics.

## API and Route Surfaces

### Voting session page

- Surface winner rows for the session.
- If no `session_winner` rows exist yet, fallback to `selectedOptionId` as temporary compatibility.
- If the session is `completed` and has no non-null winner rows, render an unresolved warning with a privileged action to log winners.

### Community leaderboard page

- Add route: `/community/[communityId]/leaderboard`
- Include tabs for:
  - Top Games
  - Top Users
  - Recent Wins
- Support pagination and deterministic sorting (wins desc, then latest win desc, then id asc).

### Optional profile integration

- Add summary card with:
  - total wins
  - communities won in
  - recent wins

### Community and admin safeguards

- Add unresolved completed-session count to `/community/[communityId]`
- Add unresolved session indicator/filter to `/community/[communityId]/admin/sessions`

## Migration and Backfill Plan

1. Create `session_winner` table and indexes.
2. Backfill from historical completed sessions:
   - include sessions where `status='completed'` and `selectedOptionId is not null`
   - map selected option to game and winner user when available
   - allow `winner_user_id` to remain null for historical rows where the winning player is unknown
3. Make backfill idempotent (upsert/replace strategy).
4. Add a verification query comparing completed sessions vs resolved winner rows to detect unresolved gaps.

## Observability and Safety

- Log finalize/reconcile operations with session id and row count.
- Add lightweight metric counters:
  - winner rows written
  - tie sessions processed
  - reconciliation rewrites

## Testing Requirements

1. Unit tests
   - single winner flow
   - multi-winner tie flow
   - idempotent rerun (no duplicates)
   - outcome change reconciliation

2. Integration tests
   - completed session may exist without winners and is marked unresolved
   - winner logging after completion clears unresolved state
   - leaderboard queries return expected rank ordering
   - deleted winner user produces null-safe display behavior

3. Route/page tests
   - session page winner rendering
   - unresolved session warning rendering
   - community leaderboard pagination and sorting
   - profile summary (if enabled)

## Implementation Blueprint

### Phase A - Schema and types

- Create `migrations/0008_session_winner.sql`
- Add `sessionWinner` to `src/lib/server/db/schema.ts`
- Export the corresponding inferred types

### Phase B - Winner reconciliation service

Create `src/lib/server/voting/winner-tracking.service.ts` with:

- `setSessionWinners(db, { votingSessionId, winnerUserIds, winType, resolvedBy })`
- `getSessionWinners(db, votingSessionId)`
- `getCommunityLeaderboard(db, communityId, { page, limit, range? })`
- `getUnresolvedCompletedSessions(db, communityId, { olderThanHours? })`

Implementation notes:

- `setSessionWinners` must use one transaction
- delete existing winner rows for the session before insert
- support shared/team wins by inserting one row per winner user
- preserve nullable `winner_user_id` for backfill and deleted-user cases

### Phase C - Validation and authorization

- Extend `src/lib/server/voting/voting-session.validation.ts` with a winner logging schema
- Require a non-empty winner list for the normal logging path
- Reuse `requireSessionWriteAccess` from `src/lib/server/authz/community.ts`

### Phase D - Session lifecycle integration

- Keep `finalizeExpiredSessions` and `endVotingSession` in `src/lib/server/voting/voting-session.service.ts` compatible with Option B
- Do not block transition to `completed` when winners are missing
- Continue using `selectedOptionId` and existing game-stat updates for game outcome tracking
- Add helper usage that exposes unresolved status after completion

### Phase E - Session route and UI wiring

Update `src/routes/voting/[votingSessionId]/+page.server.ts`:

- add `logWinners` action
- optionally add `editWinners` action using the same reconciliation flow
- extend load data with `sessionWinners` and `winnerResolutionState`

Update `src/routes/voting/[votingSessionId]/+page.svelte`:

- show unresolved warning for completed unresolved sessions
- show privileged winner entry UI for shared/team winners
- show resolved winner list for all members

### Phase F - Community safeguards and leaderboard page

Update `src/routes/community/[communityId]/+page.server.ts` and `src/routes/community/[communityId]/+page.svelte`:

- add unresolved completed-session count
- add a visible unresolved badge/notice near completed sessions

Update `src/routes/community/[communityId]/admin/sessions/+page.server.ts` and `src/routes/community/[communityId]/admin/sessions/+page.svelte`:

- add unresolved flag per session row
- add unresolved total and filtering support

Create:

- `src/routes/community/[communityId]/leaderboard/+page.server.ts`
- `src/routes/community/[communityId]/leaderboard/+page.svelte`

Leaderboard page requirements:

- Top Users
- Top Games
- Recent Wins
- deterministic sorting and pagination

### Phase G - Backfill and verification

- Backfill historical completed sessions with `selectedOptionId`
- create rows with null `winner_user_id` when player identity is unavailable
- verify completed sessions against resolved winner coverage

### Phase H - Tests and rollout checks

- Add `src/lib/server/voting/winner-tracking.service.test.ts`
- Extend `src/lib/server/voting/voting-session.validation.test.ts`
- Add route/action tests for permission and unresolved-state behavior
- Manually verify unresolved-to-resolved flow after winner logging

## Open Decisions

1. Should non-member historical winners remain visible after user leaves a community?
2. Do we need season/date-range filtering at launch?
3. What unresolved-session SLA should be used for admin reminders or stale reporting?
