-- Add NOT NULL constraint to ai_generations.user_id
-- Pre-condition: all rows with user_id IS NULL were deleted (BOO-37)
ALTER TABLE ai_generations ALTER COLUMN user_id SET NOT NULL;
