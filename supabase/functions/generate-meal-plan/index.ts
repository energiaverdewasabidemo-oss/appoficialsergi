import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

interface UserProfile {
  weight_kg?: number;
  height_cm?: number;
  age?: number;
  gender?: string;
  goal?: string;
  activity_level?: string;
  training_experience?: string;
  dietary_restrictions?: string;
}

interface MealItem {
  time: string;
  name: string;
  foods: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystemPrompt(): string {
  return `Eres un nutricionista deportivo experto especializado en planes de nutrición personalizados para atletas y personas activas.
Tu objetivo es crear planes de comida detallados, específicos y equilibrados basados en el perfil del usuario.
Responde SIEMPRE con un JSON válido. No incluyas markdown, explicaciones ni texto adicional fuera del JSON.`;
}

function buildUserPrompt(profile: UserProfile, macros: { calories: number; protein: number; carbs: number; fat: number }): string {
  const goalLabels: Record<string, string> = {
    lose_fat: 'pérdida de grasa',
    gain_muscle: 'ganancia muscular',
    recomp: 'recomposición corporal',
    endurance: 'resistencia',
  };
  const activityLabels: Record<string, string> = {
    sedentary: 'sedentario',
    light: 'ligeramente activo',
    moderate: 'moderadamente activo',
    active: 'muy activo',
    very_active: 'extremadamente activo',
  };

  return `Crea un plan de comidas diario personalizado para este usuario:

- Peso: ${profile.weight_kg || 75} kg
- Altura: ${profile.height_cm || 175} cm
- Edad: ${profile.age || 25} años
- Género: ${profile.gender === 'female' ? 'mujer' : 'hombre'}
- Objetivo: ${goalLabels[profile.goal || 'gain_muscle']}
- Nivel de actividad: ${activityLabels[profile.activity_level || 'moderate']}
- Experiencia: ${profile.training_experience || 'intermediate'}
${profile.dietary_restrictions ? `- Restricciones dietéticas: ${profile.dietary_restrictions}` : ''}

Macros objetivo: ${macros.calories} kcal | ${macros.protein}g proteína | ${macros.carbs}g carbohidratos | ${macros.fat}g grasas

Responde EXACTAMENTE con este formato JSON (5 comidas, sin texto adicional):
{
  "meals": [
    {
      "time": "HH:MM",
      "name": "Nombre de la comida",
      "foods": ["Alimento 1 con cantidad", "Alimento 2 con cantidad"],
      "kcal": 000,
      "protein": 00,
      "carbs": 00,
      "fat": 00
    }
  ]
}`;
}

function calcMacros(profile: UserProfile): { calories: number; protein: number; carbs: number; fat: number } {
  const w = profile.weight_kg || 75;
  const h = profile.height_cm || 175;
  const a = profile.age || 25;
  const g = profile.gender || 'male';
  const actMults: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const mult = actMults[profile.activity_level || 'moderate'];
  const bmr = g === 'female' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
  let calories = Math.round(bmr * mult);
  if (profile.goal === 'lose_fat') calories -= 400;
  if (profile.goal === 'gain_muscle') calories += 250;
  const protein = Math.round(w * 2.0);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('weight_kg, height_cm, age, gender, goal, activity_level, training_experience, dietary_restrictions')
    .eq('user_id', user.id)
    .single();

  const profile: UserProfile = profileData || {};
  const macros = calcMacros(profile);

  const { data: generationRow, error: insertError } = await supabase
    .from('ai_generations')
    .insert({ user_id: user.id, kind: 'meal_plan', model: MODEL, status: 'pending' })
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to create ai_generations row:', insertError);
  }

  const generationId = generationRow?.id;
  const startedAt = Date.now();

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    if (generationId) {
      await supabase.from('ai_generations').update({ status: 'error', error_message: 'ANTHROPIC_API_KEY not configured' }).eq('id', generationId);
    }
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: buildUserPrompt(profile, macros) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errBody}`);
    }

    const anthropicData = await anthropicRes.json();
    const latencyMs = Date.now() - startedAt;
    const rawContent = anthropicData.content?.[0]?.text ?? '{}';

    let meals: MealItem[] = [];
    try {
      const parsed = JSON.parse(rawContent);
      meals = parsed.meals ?? [];
    } catch {
      throw new Error('Invalid JSON from AI response');
    }

    if (generationId) {
      await supabase.from('ai_generations').update({
        status: 'success',
        latency_ms: latencyMs,
        input_tokens: anthropicData.usage?.input_tokens,
        output_tokens: anthropicData.usage?.output_tokens,
        updated_at: new Date().toISOString(),
      }).eq('id', generationId);
    }

    return new Response(JSON.stringify({ meals, macros, latency_ms: latencyMs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (generationId) {
      await supabase.from('ai_generations').update({
        status: 'error',
        latency_ms: latencyMs,
        error_message: message,
        updated_at: new Date().toISOString(),
      }).eq('id', generationId);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
