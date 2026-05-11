import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  Zap, Target, Flame, Dumbbell, ArrowRight, ArrowLeft, Check,
  Scale, ChevronRight, Trophy, Sparkles, Heart
} from 'lucide-react';

const STEPS = ['welcome', 'goal', 'gender_age', 'body', 'activity', 'experience', 'diet', 'summary'];

const GOALS = [
  { id: 'lose_fat', label: 'Perder grasa', desc: 'Definirme y reducir % grasa corporal', icon: Flame, color: '#ef4444' },
  { id: 'gain_muscle', label: 'Ganar músculo', desc: 'Aumentar masa muscular y fuerza', icon: Dumbbell, color: '#3b82f6' },
  { id: 'recomp', label: 'Recomposición', desc: 'Ganar músculo y perder grasa a la vez', icon: Target, color: '#FFD600' },
  { id: 'endurance', label: 'Resistencia', desc: 'Mejorar capacidad cardio y aguante', icon: Heart, color: '#22c55e' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentario', desc: 'Trabajo de oficina, sin deporte', mult: 1.2 },
  { id: 'light', label: 'Ligero', desc: '1-2 días/semana de actividad', mult: 1.375 },
  { id: 'moderate', label: 'Moderado', desc: '3-4 días/semana de actividad', mult: 1.55 },
  { id: 'active', label: 'Activo', desc: '5-6 días/semana de actividad', mult: 1.725 },
  { id: 'very_active', label: 'Muy activo', desc: 'Entreno 2x/día o trabajo físico', mult: 1.9 },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Principiante', desc: 'Menos de 1 año entrenando', emoji: '🌱', color: '#22c55e' },
  { id: 'intermediate', label: 'Intermedio', desc: '1-3 años de experiencia', emoji: '⚡', color: '#FFD600' },
  { id: 'advanced', label: 'Avanzado', desc: 'Más de 3 años, buen control técnico', emoji: '🔥', color: '#ef4444' },
];

const DIET_TYPES = [
  { id: 'standard', label: 'Estándar', desc: 'Como de todo' },
  { id: 'vegetarian', label: 'Vegetariano', desc: 'Sin carne ni pescado' },
  { id: 'vegan', label: 'Vegano', desc: 'Sin productos animales' },
  { id: 'keto', label: 'Keto', desc: 'Bajo en carbohidratos' },
  { id: 'mediterranean', label: 'Mediterránea', desc: 'Dieta mediterránea' },
];

function calcMacros(weight, height, age, gender, activityMult, goal) {
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  let calories = Math.round(bmr * activityMult);
  if (goal === 'lose_fat') calories -= 400;
  if (goal === 'gain_muscle') calories += 250;
  const protein = Math.round(weight * 2.0);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
}

function ProgressBar({ step }) {
  const idx = STEPS.indexOf(step);
  const pct = (idx / (STEPS.length - 1)) * 100;
  return (
    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-8">
      <motion.div className="h-full rounded-full bg-[#FFD600]"
        animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
    </div>
  );
}

function SliderInput({ value, onChange, min, max, step = 1, unit, label }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-black text-[#71717A] uppercase tracking-wide">{label}</span>
        <span className="text-3xl font-black text-[#F4F4F5]">{value}<span className="text-lg text-[#71717A] ml-1">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#FFD600] h-2 cursor-pointer" />
      <div className="flex justify-between text-[10px] text-[#71717A] font-bold">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function NavButtons({ onBack, onNext, canNext }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onBack}
        className="w-12 h-12 rounded-xl bg-[#111113] flex items-center justify-center border-none cursor-pointer text-[#71717A] hover:text-white transition-colors flex-shrink-0">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onNext} disabled={!canNext}
        className="flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 border-none cursor-pointer transition-all"
        style={{
          background: canNext ? 'linear-gradient(135deg, #FFD600, #FFA500)' : 'rgba(255,255,255,0.05)',
          color: canNext ? '#000' : '#71717A',
          boxShadow: canNext ? '0 4px 20px rgba(255,214,0,0.2)' : 'none',
        }}>
        Continuar <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}

export default function OnboardingWizard({ userId, userName, onComplete }) {
  const [step, setStep] = useState('welcome');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    goal: '', gender: 'male', age: 25, weight: 75.0, height: 175,
    activity: '', trainingDays: 4, experience: '', diet: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const next = () => { const i = STEPS.indexOf(step); if (i < STEPS.length - 1) setStep(STEPS[i + 1]); };
  const back = () => { const i = STEPS.indexOf(step); if (i > 0) setStep(STEPS[i - 1]); };

  const canNext = () => {
    if (step === 'goal') return !!form.goal;
    if (step === 'activity') return !!form.activity;
    if (step === 'experience') return !!form.experience;
    if (step === 'diet') return !!form.diet;
    return true;
  };

  const actMult = ACTIVITY_LEVELS.find(a => a.id === form.activity)?.mult || 1.55;
  const macros = calcMacros(form.weight, form.height, form.age, form.gender, actMult, form.goal);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('user_profiles').upsert({
        id: userId,
        full_name: userName || '',
        goal: form.goal,
        gender: form.gender,
        age: form.age,
        weight_kg: form.weight,
        height_cm: form.height,
        activity_level: form.activity,
        training_days_per_week: form.trainingDays,
        training_experience: form.experience,
        diet_type: form.diet,
        challenge_kind: '90d',
        boost_challenge_start: now,
        boost_challenge_active: true,
        onboarding_completed: true,
      });
      if (error) throw error;

      const { data: challenge } = await supabase
        .from('community_challenges')
        .select('id')
        .eq('slug', 'boost-90d')
        .maybeSingle();
      if (challenge) {
        await supabase.from('challenge_participants').upsert(
          { challenge_id: challenge.id, user_id: userId, joined_at: now, current_value: 0 },
          { onConflict: 'challenge_id,user_id' }
        );
      }

      onComplete({
        full_name: userName || '',
        goal: form.goal,
        gender: form.gender,
        age: form.age,
        weight_kg: form.weight,
        height_cm: form.height,
        activity_level: form.activity,
        training_days_per_week: form.trainingDays,
        training_experience: form.experience,
        diet_type: form.diet,
        challenge_kind: '90d',
        boost_challenge_start: now,
        boost_challenge_active: true,
        onboarding_completed: true,
      });
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {step === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
              className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)', boxShadow: '0 0 60px rgba(255,214,0,0.4)' }}>
                  <Zap className="w-12 h-12 text-black" fill="black" />
                </div>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center bg-[#FFD600]">
                  <Sparkles className="w-3 h-3 text-black" />
                </motion.div>
              </div>
              <div>
                <h1 className="text-4xl font-black text-[#F4F4F5] mb-2">
                  Hola, {userName?.split(' ')[0] || 'Campeón'}
                </h1>
                <p className="text-[#71717A] text-lg leading-relaxed">
                  Bienvenido al <span className="text-[#FFD600] font-bold">Reto Boost 3 Meses</span>.
                  Tu transformación empieza ahora.
                </p>
              </div>
              <div className="w-full glass-effect rounded-2xl p-5 text-left flex flex-col gap-3"
                style={{ border: '1px solid rgba(255,214,0,0.2)' }}>
                <p className="text-sm font-black text-[#FFD600] uppercase tracking-widest">¿Qué vas a conseguir?</p>
                {[
                  { icon: '🎯', text: 'Plan de entrenamiento 100% personalizado' },
                  { icon: '🥗', text: 'Nutrición ajustada a tus métricas reales' },
                  { icon: '📈', text: 'Seguimiento semana a semana' },
                  { icon: '🏆', text: 'Transformación física en 90 días' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-sm text-[#D4D4D8] font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={next}
                className="w-full py-4 rounded-2xl font-black text-black text-lg flex items-center justify-center gap-2 border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)', boxShadow: '0 8px 32px rgba(255,214,0,0.3)' }}>
                Empezar el reto <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {step === 'goal' && (
            <motion.div key="goal" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-2">Paso 1 de 6</p>
                <h2 className="text-3xl font-black text-[#F4F4F5]">¿Cuál es tu objetivo?</h2>
                <p className="text-[#71717A] mt-1">Todo tu plan se construirá alrededor de esto.</p>
              </div>
              <div className="flex flex-col gap-3">
                {GOALS.map(g => (
                  <motion.button key={g.id} whileTap={{ scale: 0.98 }} onClick={() => set('goal', g.id)}
                    className="w-full p-4 rounded-2xl text-left flex items-center gap-4 border-none cursor-pointer transition-all"
                    style={{
                      background: form.goal === g.id ? `${g.color}10` : '#111113',
                      border: `2px solid ${form.goal === g.id ? g.color : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${g.color}15` }}>
                      <g.icon className="w-6 h-6" style={{ color: g.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[#F4F4F5]">{g.label}</p>
                      <p className="text-xs text-[#71717A] mt-0.5">{g.desc}</p>
                    </div>
                    {form.goal === g.id && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: g.color }}>
                        <Check className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              <NavButtons onBack={back} onNext={next} canNext={canNext()} />
            </motion.div>
          )}

          {step === 'gender_age' && (
            <motion.div key="gender_age" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-2">Paso 2 de 6</p>
                <h2 className="text-3xl font-black text-[#F4F4F5]">Cuéntanos sobre ti</h2>
                <p className="text-[#71717A] mt-1">Para calcular tu metabolismo basal.</p>
              </div>
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-sm font-bold text-[#71717A] uppercase tracking-wide mb-3">Sexo biológico</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ id: 'male', label: 'Hombre', icon: '♂' }, { id: 'female', label: 'Mujer', icon: '♀' }, { id: 'other', label: 'Otro', icon: '⚧' }].map(g => (
                      <button key={g.id} onClick={() => set('gender', g.id)}
                        className="py-4 rounded-2xl flex flex-col items-center gap-2 border-none cursor-pointer transition-all"
                        style={{
                          background: form.gender === g.id ? 'rgba(255,214,0,0.1)' : '#111113',
                          border: `2px solid ${form.gender === g.id ? '#FFD600' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                        <span className="text-2xl">{g.icon}</span>
                        <span className="text-xs font-bold" style={{ color: form.gender === g.id ? '#FFD600' : '#71717A' }}>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <SliderInput label="Edad" value={form.age} onChange={v => set('age', v)} min={13} max={80} unit="años" />
              </div>
              <NavButtons onBack={back} onNext={next} canNext={canNext()} />
            </motion.div>
          )}

          {step === 'body' && (
            <motion.div key="body" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-2">Paso 3 de 6</p>
                <h2 className="text-3xl font-black text-[#F4F4F5]">Tus medidas</h2>
                <p className="text-[#71717A] mt-1">Punto de partida del reto. Sin juicios.</p>
              </div>
              <div className="flex flex-col gap-6">
                <SliderInput label="Peso actual" value={form.weight} onChange={v => set('weight', v)} min={40} max={180} step={0.5} unit="kg" />
                <SliderInput label="Altura" value={form.height} onChange={v => set('height', v)} min={140} max={220} unit="cm" />
                <div className="glass-effect rounded-2xl p-4 flex items-center gap-3"
                  style={{ border: '1px solid rgba(255,214,0,0.15)' }}>
                  <div className="w-10 h-10 rounded-xl bg-[rgba(255,214,0,0.1)] flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-[#FFD600]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#F4F4F5]">IMC: {(form.weight / Math.pow(form.height / 100, 2)).toFixed(1)}</p>
                    <p className="text-xs text-[#71717A]">Índice de masa corporal</p>
                  </div>
                </div>
                <div className="glass-effect rounded-2xl p-4">
                  <p className="text-sm font-bold text-[#71717A] uppercase tracking-wide mb-3">Días de entrenamiento / semana</p>
                  <div className="flex gap-2 justify-between">
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
              </div>
              <NavButtons onBack={back} onNext={next} canNext={canNext()} />
            </motion.div>
          )}

          {step === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-2">Paso 4 de 6</p>
                <h2 className="text-3xl font-black text-[#F4F4F5]">Nivel de actividad</h2>
                <p className="text-[#71717A] mt-1">Fuera de los entrenos del plan.</p>
              </div>
              <div className="flex flex-col gap-3">
                {ACTIVITY_LEVELS.map(a => (
                  <motion.button key={a.id} whileTap={{ scale: 0.98 }} onClick={() => set('activity', a.id)}
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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFD600]">
                        <Check className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              <NavButtons onBack={back} onNext={next} canNext={canNext()} />
            </motion.div>
          )}

          {step === 'experience' && (
            <motion.div key="experience" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-2">Paso 5 de 6</p>
                <h2 className="text-3xl font-black text-[#F4F4F5]">Experiencia en el gym</h2>
                <p className="text-[#71717A] mt-1">Ajustamos la intensidad y los ejercicios.</p>
              </div>
              <div className="flex flex-col gap-4">
                {EXPERIENCE_LEVELS.map(e => (
                  <motion.button key={e.id} whileTap={{ scale: 0.98 }} onClick={() => set('experience', e.id)}
                    className="w-full p-5 rounded-2xl text-left flex items-center gap-4 border-none cursor-pointer transition-all"
                    style={{
                      background: form.experience === e.id ? `${e.color}10` : '#111113',
                      border: `2px solid ${form.experience === e.id ? e.color : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ background: `${e.color}15` }}>
                      {e.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[#F4F4F5] text-lg">{e.label}</p>
                      <p className="text-sm text-[#71717A] mt-0.5">{e.desc}</p>
                    </div>
                    {form.experience === e.id && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: e.color }}>
                        <Check className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              <NavButtons onBack={back} onNext={next} canNext={canNext()} />
            </motion.div>
          )}

          {step === 'diet' && (
            <motion.div key="diet" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-2">Paso 6 de 6</p>
                <h2 className="text-3xl font-black text-[#F4F4F5]">Tu alimentación</h2>
                <p className="text-[#71717A] mt-1">Personalizamos tus recetas y macros.</p>
              </div>
              <div className="flex flex-col gap-3">
                {DIET_TYPES.map(d => (
                  <motion.button key={d.id} whileTap={{ scale: 0.98 }} onClick={() => set('diet', d.id)}
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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFD600]">
                        <Check className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              <NavButtons onBack={back} onNext={next} canNext={canNext()} />
            </motion.div>
          )}

          {step === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex flex-col gap-6">
              <ProgressBar step={step} />
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)', boxShadow: '0 0 40px rgba(255,214,0,0.35)' }}>
                  <Trophy className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-3xl font-black text-[#F4F4F5]">Tu plan está listo</h2>
                <p className="text-[#71717A] mt-1">Calculado a medida para ti.</p>
              </div>

              <div className="glass-effect rounded-2xl p-5 flex flex-col gap-4"
                style={{ border: '1px solid rgba(255,214,0,0.2)' }}>
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest">Resumen personal</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Objetivo', value: GOALS.find(g => g.id === form.goal)?.label },
                    { label: 'Experiencia', value: EXPERIENCE_LEVELS.find(e => e.id === form.experience)?.label },
                    { label: 'Peso', value: `${form.weight} kg` },
                    { label: 'Altura', value: `${form.height} cm` },
                    { label: 'Días/semana', value: `${form.trainingDays} días` },
                    { label: 'Dieta', value: DIET_TYPES.find(d => d.id === form.diet)?.label },
                  ].map(item => (
                    <div key={item.label} className="bg-[#111113] rounded-xl p-3">
                      <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wide mb-1">{item.label}</p>
                      <p className="font-black text-[#F4F4F5] text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-effect rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest">Tus macros diarios</p>
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
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(macros.protein * 4 / macros.calories) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }} className="bg-[#3b82f6] rounded-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(macros.carbs * 4 / macros.calories) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }} className="bg-[#FFD600] rounded-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(macros.fat * 9 / macros.calories) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }} className="bg-[#ef4444] rounded-full" />
                </div>
              </div>

              <div className="glass-effect rounded-2xl p-4 flex items-center gap-3"
                style={{ border: '1px solid rgba(255,214,0,0.2)', background: 'rgba(255,214,0,0.03)' }}>
                <div className="text-2xl">🏆</div>
                <div>
                  <p className="font-black text-[#F4F4F5] text-sm">Reto Boost · 3 Meses</p>
                  <p className="text-xs text-[#71717A]">El contador empieza hoy. ¡Sin excusas!</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-black text-[#FFD600] text-sm">0 / 90</p>
                  <p className="text-[10px] text-[#71717A]">días</p>
                </div>
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleFinish} disabled={saving}
                className="w-full py-4 rounded-2xl font-black text-black text-lg flex items-center justify-center gap-2 border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)', boxShadow: '0 8px 32px rgba(255,214,0,0.3)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : <><Zap className="w-5 h-5" /> Comenzar mi reto</>}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
