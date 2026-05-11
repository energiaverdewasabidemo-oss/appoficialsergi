import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  X, Zap, Trophy, ArrowLeft, ChevronRight, Check,
  Flame, Dumbbell, Heart, Target, Scale, Ruler
} from 'lucide-react';

const STEPS = ['goal', 'body', 'activity', 'diet', 'confirm'];

const GOALS = [
  { id: 'lose_fat', label: 'Perder grasa', desc: 'Definirme y bajar % grasa', icon: Flame, color: '#ef4444' },
  { id: 'gain_muscle', label: 'Ganar músculo', desc: 'Aumentar masa y fuerza', icon: Dumbbell, color: '#3b82f6' },
  { id: 'recomp', label: 'Recomposición', desc: 'Músculo arriba, grasa abajo', icon: Target, color: '#FFD600' },
  { id: 'endurance', label: 'Resistencia', desc: 'Cardio y aguante', icon: Heart, color: '#22c55e' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentario', desc: 'Trabajo de oficina, sin deporte' },
  { id: 'light', label: 'Ligero', desc: '1-2 días/sem de actividad' },
  { id: 'moderate', label: 'Moderado', desc: '3-4 días/sem de actividad' },
  { id: 'active', label: 'Activo', desc: '5-6 días/sem de actividad' },
  { id: 'very_active', label: 'Muy activo', desc: 'Entreno 2x/día o trabajo físico' },
];

const DIET_TYPES = [
  { id: 'standard', label: 'Estándar', desc: 'Como de todo' },
  { id: 'vegetarian', label: 'Vegetariano', desc: 'Sin carne ni pescado' },
  { id: 'vegan', label: 'Vegano', desc: 'Sin productos animales' },
  { id: 'keto', label: 'Keto', desc: 'Bajo en carbohidratos' },
  { id: 'mediterranean', label: 'Mediterránea', desc: 'Dieta mediterránea' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Principiante', desc: 'Menos de 1 año', emoji: '🌱' },
  { id: 'intermediate', label: 'Intermedio', desc: '1-3 años', emoji: '⚡' },
  { id: 'advanced', label: 'Avanzado', desc: 'Más de 3 años', emoji: '🔥' },
];

function calcMacros(weight, height, age, gender, activityLevel, goal) {
  const actMults = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const mult = actMults[activityLevel] || 1.55;
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  let calories = Math.round(bmr * mult);
  if (goal === 'lose_fat') calories -= 400;
  if (goal === 'gain_muscle') calories += 250;
  const protein = Math.round(weight * 2.0);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
}

function SliderInput({ value, onChange, min, max, step = 1, unit, label }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-black text-[#71717A] uppercase tracking-widest">{label}</span>
        <span className="text-3xl font-black text-[#F4F4F5]">{value}<span className="text-base text-[#71717A] ml-1">{unit}</span></span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#FFD600] h-2 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-[#52525B] font-bold">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function BoostChallengeModal({ userId, existingProfile, onClose, onComplete }) {
  const [step, setStep] = useState('goal');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    goal: existingProfile?.goal || '',
    gender: existingProfile?.gender || 'male',
    age: existingProfile?.age || 25,
    weight: existingProfile?.weight_kg || 75,
    height: existingProfile?.height_cm || 175,
    activity: existingProfile?.activity_level || '',
    trainingDays: existingProfile?.training_days_per_week || 4,
    experience: existingProfile?.training_experience || '',
    diet: existingProfile?.diet_type || '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const stepIdx = STEPS.indexOf(step);
  const pct = ((stepIdx) / (STEPS.length - 1)) * 100;

  const canNext = () => {
    if (step === 'goal') return !!form.goal;
    if (step === 'activity') return !!form.activity;
    if (step === 'diet') return !!form.diet;
    return true;
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
  };
  const back = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  };

  const macros = calcMacros(form.weight, form.height, form.age, form.gender, form.activity || 'moderate', form.goal);

  const handleStart = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('user_profiles').upsert({
        id: userId,
        goal: form.goal,
        gender: form.gender,
        age: form.age,
        weight_kg: form.weight,
        height_cm: form.height,
        activity_level: form.activity || 'moderate',
        training_days_per_week: form.trainingDays,
        training_experience: form.experience || 'intermediate',
        diet_type: form.diet,
        challenge_kind: form.kind,
        boost_challenge_start: now,
        boost_challenge_active: true,
        onboarding_completed: true,
      });
      if (error) throw error;

      const challengeSlug = form.kind === '21d' ? 'boost-21d' : 'boost-90d';
      const { data: challenge } = await supabase
        .from('community_challenges')
        .select('id')
        .eq('slug', challengeSlug)
        .maybeSingle();
      if (challenge) {
        await supabase.from('challenge_participants').upsert(
          { challenge_id: challenge.id, user_id: userId, joined_at: now, current_value: 0 },
          { onConflict: 'challenge_id,user_id' }
        );
      }

      onComplete({
        goal: form.goal,
        gender: form.gender,
        age: form.age,
        weight_kg: form.weight,
        height_cm: form.height,
        activity_level: form.activity || 'moderate',
        training_days_per_week: form.trainingDays,
        training_experience: form.experience || 'intermediate',
        diet_type: form.diet,
        challenge_kind: form.kind,
        boost_challenge_start: now,
        boost_challenge_active: true,
      });
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const STEP_LABELS = { goal: 'Objetivo', body: 'Medidas', activity: 'Actividad', diet: 'Nutrición', confirm: 'Confirmar' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ background: '#0A0A0C', border: '1px solid rgba(255,214,0,0.15)' }}>

        <div className="sticky top-0 z-10 p-5 pb-0" style={{ background: '#0A0A0C' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,214,0,0.1)', border: '1px solid rgba(255,214,0,0.2)' }}>
                <Zap className="w-4 h-4 text-[#FFD600]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest">Reto Boost · 3 Meses</p>
                <p className="text-xs font-bold text-[#71717A]">{STEP_LABELS[step]}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1A1A1C] flex items-center justify-center border-none cursor-pointer text-[#71717A] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-5">
            <motion.div className="h-full rounded-full bg-[#FFD600]"
              animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        <div className="flex-1 px-5 pb-6">
          <AnimatePresence mode="wait">

            {step === 'goal' && (
              <motion.div key="goal" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="flex flex-col gap-4">
                <div className="mb-2">
                  <h2 className="text-2xl font-black text-[#F4F4F5]">¿Cuál es tu objetivo?</h2>
                  <p className="text-sm text-[#71717A] mt-1">Define el foco de tu transformación.</p>
                </div>
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => set('goal', g.id)}
                    className="w-full p-4 rounded-2xl text-left flex items-center gap-4 border-none cursor-pointer transition-all"
                    style={{
                      background: form.goal === g.id ? `${g.color}10` : '#111113',
                      border: `2px solid ${form.goal === g.id ? g.color : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${g.color}15` }}>
                      <g.icon className="w-5 h-5" style={{ color: g.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[#F4F4F5]">{g.label}</p>
                      <p className="text-xs text-[#71717A] mt-0.5">{g.desc}</p>
                    </div>
                    {form.goal === g.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: g.color }}>
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                ))}
                <NavBtns onBack={onClose} backLabel="Cancelar" onNext={next} canNext={canNext()} />
              </motion.div>
            )}

            {step === 'body' && (
              <motion.div key="body" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="flex flex-col gap-5">
                <div className="mb-1">
                  <h2 className="text-2xl font-black text-[#F4F4F5]">Tus medidas</h2>
                  <p className="text-sm text-[#71717A] mt-1">Punto de partida del reto.</p>
                </div>

                <div>
                  <p className="text-xs font-black text-[#71717A] uppercase tracking-widest mb-3">Sexo biológico</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ id: 'male', label: 'Hombre', icon: '♂' }, { id: 'female', label: 'Mujer', icon: '♀' }, { id: 'other', label: 'Otro', icon: '⚧' }].map(g => (
                      <button key={g.id} onClick={() => set('gender', g.id)}
                        className="py-3 rounded-xl flex flex-col items-center gap-1 border-none cursor-pointer transition-all"
                        style={{
                          background: form.gender === g.id ? 'rgba(255,214,0,0.08)' : '#111113',
                          border: `2px solid ${form.gender === g.id ? '#FFD600' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                        <span className="text-xl">{g.icon}</span>
                        <span className="text-[10px] font-black" style={{ color: form.gender === g.id ? '#FFD600' : '#71717A' }}>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <SliderInput label="Edad" value={form.age} onChange={v => set('age', v)} min={13} max={80} unit="años" />
                <SliderInput label="Peso actual" value={form.weight} onChange={v => set('weight', v)} min={40} max={180} step={0.5} unit="kg" />
                <SliderInput label="Altura" value={form.height} onChange={v => set('height', v)} min={140} max={220} unit="cm" />

                <div className="bg-[#111113] rounded-xl p-3 flex items-center gap-3">
                  <Scale className="w-4 h-4 text-[#FFD600]" />
                  <div>
                    <p className="text-xs font-bold text-[#F4F4F5]">IMC: {(form.weight / Math.pow(form.height / 100, 2)).toFixed(1)}</p>
                    <p className="text-[10px] text-[#71717A]">Índice de masa corporal</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-[#71717A] uppercase tracking-widest mb-3">Días de entrenamiento / semana</p>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map(d => (
                      <button key={d} onClick={() => set('trainingDays', d)}
                        className="flex-1 py-3 rounded-xl font-black text-sm border-none cursor-pointer transition-all"
                        style={{
                          background: form.trainingDays === d ? '#FFD600' : '#111113',
                          color: form.trainingDays === d ? '#000' : '#71717A',
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-[#71717A] uppercase tracking-widest mb-3">Experiencia en el gym</p>
                  <div className="flex flex-col gap-2">
                    {EXPERIENCE_LEVELS.map(e => (
                      <button key={e.id} onClick={() => set('experience', e.id)}
                        className="w-full p-3 rounded-xl text-left flex items-center gap-3 border-none cursor-pointer transition-all"
                        style={{
                          background: form.experience === e.id ? 'rgba(255,214,0,0.08)' : '#111113',
                          border: `2px solid ${form.experience === e.id ? '#FFD600' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                        <span className="text-xl">{e.emoji}</span>
                        <div>
                          <p className="font-black text-[#F4F4F5] text-sm">{e.label}</p>
                          <p className="text-[10px] text-[#71717A]">{e.desc}</p>
                        </div>
                        {form.experience === e.id && <Check className="w-4 h-4 text-[#FFD600] ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                <NavBtns onBack={back} onNext={next} canNext={canNext()} />
              </motion.div>
            )}

            {step === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="flex flex-col gap-4">
                <div className="mb-1">
                  <h2 className="text-2xl font-black text-[#F4F4F5]">Nivel de actividad</h2>
                  <p className="text-sm text-[#71717A] mt-1">Fuera de los entrenos del plan.</p>
                </div>
                {ACTIVITY_LEVELS.map(a => (
                  <button key={a.id} onClick={() => set('activity', a.id)}
                    className="w-full p-4 rounded-2xl text-left flex items-center gap-3 border-none cursor-pointer transition-all"
                    style={{
                      background: form.activity === a.id ? 'rgba(255,214,0,0.08)' : '#111113',
                      border: `2px solid ${form.activity === a.id ? '#FFD600' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="flex-1">
                      <p className="font-black text-[#F4F4F5]">{a.label}</p>
                      <p className="text-xs text-[#71717A] mt-0.5">{a.desc}</p>
                    </div>
                    {form.activity === a.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFD600]">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                ))}
                <NavBtns onBack={back} onNext={next} canNext={canNext()} />
              </motion.div>
            )}

            {step === 'diet' && (
              <motion.div key="diet" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="flex flex-col gap-4">
                <div className="mb-1">
                  <h2 className="text-2xl font-black text-[#F4F4F5]">Tu alimentación</h2>
                  <p className="text-sm text-[#71717A] mt-1">Personalizamos tus macros y recetas.</p>
                </div>
                {DIET_TYPES.map(d => (
                  <button key={d.id} onClick={() => set('diet', d.id)}
                    className="w-full p-4 rounded-2xl text-left flex items-center gap-3 border-none cursor-pointer transition-all"
                    style={{
                      background: form.diet === d.id ? 'rgba(255,214,0,0.08)' : '#111113',
                      border: `2px solid ${form.diet === d.id ? '#FFD600' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="flex-1">
                      <p className="font-black text-[#F4F4F5]">{d.label}</p>
                      <p className="text-xs text-[#71717A] mt-0.5">{d.desc}</p>
                    </div>
                    {form.diet === d.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFD600]">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                ))}
                <NavBtns onBack={back} onNext={next} canNext={canNext()} />
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="flex flex-col gap-5">
                <div className="text-center mb-2">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)', boxShadow: '0 0 40px rgba(255,214,0,0.4)' }}>
                    <Trophy className="w-8 h-8 text-black" />
                  </div>
                  <h2 className="text-2xl font-black text-[#F4F4F5]">Todo listo</h2>
                  <p className="text-sm text-[#71717A] mt-1">Tu plan personalizado en 90 días.</p>
                </div>

                <div className="glass-effect rounded-2xl p-4 flex flex-col gap-3"
                  style={{ border: '1px solid rgba(255,214,0,0.15)' }}>
                  <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest">Tu perfil del reto</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Objetivo', value: GOALS.find(g => g.id === form.goal)?.label },
                      { label: 'Peso', value: `${form.weight} kg` },
                      { label: 'Altura', value: `${form.height} cm` },
                      { label: 'Días/sem', value: `${form.trainingDays} días` },
                      { label: 'Actividad', value: ACTIVITY_LEVELS.find(a => a.id === form.activity)?.label },
                      { label: 'Dieta', value: DIET_TYPES.find(d => d.id === form.diet)?.label },
                    ].map(item => (
                      <div key={item.label} className="bg-[#111113] rounded-xl p-3">
                        <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wide">{item.label}</p>
                        <p className="font-black text-[#F4F4F5] text-sm mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-effect rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest">Macros diarios calculados</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-3xl font-black text-[#F4F4F5]">{macros.calories}</p>
                      <p className="text-[10px] font-bold text-[#71717A] uppercase">kcal</p>
                    </div>
                    <div className="flex gap-4">
                      {[
                        { label: 'Prot.', value: macros.protein, color: '#3b82f6' },
                        { label: 'Carbs', value: macros.carbs, color: '#FFD600' },
                        { label: 'Grasas', value: macros.fat, color: '#ef4444' },
                      ].map(m => (
                        <div key={m.label} className="text-center">
                          <p className="text-xl font-black" style={{ color: m.color }}>{m.value}<span className="text-xs">g</span></p>
                          <p className="text-[10px] font-bold text-[#71717A]">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#3b82f6] rounded-full" style={{ width: `${(macros.protein * 4 / macros.calories) * 100}%` }} />
                    <div className="bg-[#FFD600] rounded-full" style={{ width: `${(macros.carbs * 4 / macros.calories) * 100}%` }} />
                    <div className="bg-[#ef4444] rounded-full" style={{ width: `${(macros.fat * 9 / macros.calories) * 100}%` }} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={back}
                    className="w-12 h-12 rounded-xl bg-[#111113] flex items-center justify-center border-none cursor-pointer text-[#71717A] hover:text-white transition-colors flex-shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleStart} disabled={saving}
                    className="flex-1 py-3 rounded-xl font-black text-black flex items-center justify-center gap-2 border-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #FFD600, #FFA500)',
                      boxShadow: '0 4px 20px rgba(255,214,0,0.3)',
                      opacity: saving ? 0.7 : 1,
                    }}>
                    {saving ? 'Activando...' : <><Zap className="w-5 h-5" /> Activar Reto Boost</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function NavBtns({ onBack, backLabel, onNext, canNext }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onBack}
        className="w-12 h-12 rounded-xl bg-[#111113] flex items-center justify-center border-none cursor-pointer text-[#71717A] hover:text-white transition-colors flex-shrink-0">
        {backLabel ? <span className="text-xs font-bold">{backLabel}</span> : <ArrowLeft className="w-5 h-5" />}
      </button>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onNext} disabled={!canNext}
        className="flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 border-none cursor-pointer transition-all"
        style={{
          background: canNext ? 'linear-gradient(135deg, #FFD600, #FFA500)' : 'rgba(255,255,255,0.05)',
          color: canNext ? '#000' : '#71717A',
          boxShadow: canNext ? '0 4px 16px rgba(255,214,0,0.2)' : 'none',
        }}>
        Continuar <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
