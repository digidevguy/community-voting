INSERT INTO session_winner (id, community_id, voting_session_id, voting_option_id, game_id, winner_user_id, win_type, resolved_at, created_at, updated_at)
SELECT gen_random_uuid(), vs.community_id, vs.id, vs.selected_option_id, vo.game_id, null, null, vs.created_at, now(), now()
FROM voting_session vs
JOIN voting_option vo ON vo.id = vs.selected_option_id
WHERE vs.status = 'completed'
  AND vs.selected_option_id IS NOT NULL
ON CONFLICT DO NOTHING;