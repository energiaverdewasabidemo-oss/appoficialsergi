/*
  # Tabla ai_generations — registro de llamadas a la IA

  Almacena cada llamada realizada a modelos de IA (Anthropic Claude) con
  métricas de latencia, coste y estado. Permite auditoría, atribución de
  coste por usuario y observabilidad de rendimiento.
*/

CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('meal_plan', 'workout_plan', 'recipe_suggestion', 'photo_food_analysis')),
  model text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  error_message text,
  stream_started_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_kind ON ai_generations(kind, created_at DESC);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propias generaciones"
  ON ai_generations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Insertar generaciones propias"
  ON ai_generations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Actualizar generaciones propias"
  ON ai_generations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
