import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

interface UserProfile {
  weight_kg?: number;
  age?: number;
  gender?: string;
  goal?: string;
  training_experience?: string;
  training_days_per_week?: number;
  available_equipment?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildPrompt(profile: UserProfile) {
  const goalLabels: Record<string, string> = {
    lose_fat: 'pérdida de grasa', gain_muscle: 'ganancia muscular',
    recomp: 'recomposición', endurance: 'resistencia',
  };
  const expLabels: Record<string, string> = {
    beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzado',
  };
  const days = profile.training_days_per_week || 4;
  return {
    system: `Eres un entrenador personal experto especializado en programas de fuerza e hipertrofia.
Crea planes de entrenamiento semanales detallados, progresivos y personalizados.
Usa este formato para cada día:
📅 DÍA [N] — [Nombre del día] (Ej: Push A, Pull A, Legs, Descanso)
[Músculos trabajados]
• Ejercicio 1: X series × X–X reps | descanso Xs
• Ejercicio 2: X series × X–X reps | descanso Xs
[línea en blanco entre días]`,
    user: `Crea mi plan de entrenamiento semanal personalizado:
- Objetivo: ${goalLabels[profile.goal || 'gain_muscle']}
- Nivel: ${expLabels[profile.training_experience || 'intermediate']}
- Días por semana: ${days}
- Edad: ${profile.age || 25} | Género: ${profile.gender === 'female' ? 'mujer' : 'hombre'}
${profile.available_equipment ? `- Equipamiento: ${profile.available_equipment}` : '- Equipamiento: gym completo'}
Incluye todos los ${days} días de entrenamiento más los días de descanso. Sé específico con series, reps y descansos.`,
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
    .select('age, gender, goal, training_experience, training_days_per_week, available_equipment, weight_kg')
    .eq('user_id', user.id)
    .single();

  const profile: UserProfile = profileData || {};
  const { system, user: userPrompt } = buildPrompt(profile);

  const { data: genRow } = await supabase
    .from('ai_generations')
    .insert({ user_id: user.id, kind: 'workout_plan', model: MODEL, status: 'pending' })
    .select('id').single();

  const genId = genRow?.id;
  const startedAt = Date.now();

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, stream: true, system, messages: [{ role: 'user', content: userPrompt }] }),
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
              } catch { /* ignore parse errors */ }
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
