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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calcMacros(p: UserProfile) {
  const w = p.weight_kg || 75;
  const h = p.height_cm || 175;
  const a = p.age || 25;
  const actMults: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const mult = actMults[p.activity_level || 'moderate'];
  const bmr = p.gender === 'female' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
  let calories = Math.round(bmr * mult);
  if (p.goal === 'lose_fat') calories -= 400;
  if (p.goal === 'gain_muscle') calories += 250;
  const protein = Math.round(w * 2.0);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
}

function buildPrompt(profile: UserProfile) {
  const macros = calcMacros(profile);
  const goalLabels: Record<string, string> = {
    lose_fat: 'pérdida de grasa', gain_muscle: 'ganancia muscular',
    recomp: 'recomposición', endurance: 'resistencia',
  };
  return {
    system: `Eres un nutricionista deportivo experto. Crea planes de comida personalizados, detallados y equilibrados.
Responde en texto amigable y directo, sin markdown pesado. Usa este formato para cada comida:
🕗 HH:MM — Nombre (XXX kcal | PXXg · CXXg · GXXg)
• Alimento 1 con cantidad
• Alimento 2 con cantidad
[línea en blanco entre comidas]`,
    user: `Crea mi plan de comidas diario personalizado:
- Peso: ${profile.weight_kg || 75}kg | Altura: ${profile.height_cm || 175}cm | Edad: ${profile.age || 25}
- Género: ${profile.gender === 'female' ? 'mujer' : 'hombre'} | Objetivo: ${goalLabels[profile.goal || 'gain_muscle']}
- Actividad: ${profile.activity_level || 'moderate'} | Experiencia: ${profile.training_experience || 'intermediate'}
${profile.dietary_restrictions ? `- Sin: ${profile.dietary_restrictions}` : ''}
Macros objetivo: ${macros.calories} kcal | P${macros.protein}g · C${macros.carbs}g · G${macros.fat}g
Incluye 5 comidas (desayuno, media mañana, comida, merienda/pre-entreno, cena). Sé específico con cantidades.`,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('weight_kg, height_cm, age, gender, goal, activity_level, training_experience, dietary_restrictions')
    .eq('user_id', user.id)
    .single();

  const profile: UserProfile = profileData || {};
  const { system, user: userPrompt } = buildPrompt(profile);

  const { data: genRow } = await supabase
    .from('ai_generations')
    .insert({ user_id: user.id, kind: 'meal_plan', model: MODEL, status: 'pending' })
    .select('id').single();

  const genId = genRow?.id;
  const startedAt = Date.now();

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, stream: true, system, messages: [{ role: 'user', content: userPrompt }] }),
    });

    if (!anthropicRes.ok) throw new Error(`Anthropic ${anthropicRes.status}`);

    if (genId) {
      await supabase.from('ai_generations').update({
        stream_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', genId);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]' || !raw) continue;
              try {
                const evt = JSON.parse(raw);
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: evt.delta.text })}\n\n`));
                } else if (evt.type === 'message_delta' && evt.usage) {
                  outputTokens = evt.usage.output_tokens ?? 0;
                } else if (evt.type === 'message_start' && evt.message?.usage) {
                  inputTokens = evt.message.usage.input_tokens ?? 0;
                }
              } catch { /* ignore parse errors on individual events */ }
            }
          }
        } finally {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();

          const latencyMs = Date.now() - startedAt;
          if (genId) {
            await supabase.from('ai_generations').update({
              status: 'success',
              latency_ms: latencyMs,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              updated_at: new Date().toISOString(),
            }).eq('id', genId);
          }
        }
      },
      cancel() {
        if (genId) {
          supabase.from('ai_generations').update({
            status: 'error', error_message: 'Client disconnected',
            latency_ms: Date.now() - startedAt,
            updated_at: new Date().toISOString(),
          }).eq('id', genId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (genId) {
      await supabase.from('ai_generations').update({
        status: 'error', latency_ms: Date.now() - startedAt,
        error_message: message, updated_at: new Date().toISOString(),
      }).eq('id', genId);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
