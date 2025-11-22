ALTER TABLE "voting_session" ADD COLUMN "game_day_date" timestamp with time zone;

ALTER TABLE voting_session
ADD COLUMN game_day_date TIMESTAMP WITH TIME ZONE;


CREATE OR REPLACE FUNCTION set_default_game_day_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.game_day_date IS NULL AND NEW.start_date IS NOT NULL THEN
    NEW.game_day_date := NEW.start_date + INTERVAL '5 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_set_game_day_date
BEFORE INSERT ON voting_session
FOR EACH ROW
EXECUTE FUNCTION set_default_game_day_date();