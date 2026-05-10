import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Lock, CircleCheck as CheckCircle, Clock, ChevronRight, Dumbbell, Target, Star, ArrowRight, Apple, Flame, Droplets, Wheat, ArrowLeft, ChevronUp, ChevronDown, X, Trophy, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

function useAIStream(functionName) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef(null);

  const start = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText('');
    setError(null);
    setDone(false);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Debes iniciar sesión.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.text) setText(prev => prev + evt.text);
            if (evt.done) setDone(true);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error al generar. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, [functionName]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setText('');
    setError(null);
    setDone(false);
    setLoading(false);
  }, []);

  return { text, loading, error, done, start, reset };
}

function AIStreamDisplay({ text, loading, error, done, onRetry, onRegenerate, label, icon: Icon }) {
  const cursorVisible = loading && !done;
  return (
    <div className="glass-effect rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#FFD600]" />}
          <span className="text-sm font-bold text-[#F4F4F5]">{label}</span>
          {loading && (
            <span className="flex items-center gap-1 text-[10px] text-[#71717A]">
              <Sparkles className="w-3 h-3 text-[#FFD600] animate-pulse" /> Generando…
            </span>
          )}
          {done && <span className="text-[10px] text-[#22c55e]">✓ Listo</span>}
        </div>
        {(done || error) && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 text-[10px] text-[#71717A] hover:text-[#FFD600] transition-colors border-none cursor-pointer bg-transparent"
          >
            <RefreshCw className="w-3 h-3" /> Regenerar
          </button>
        )}
      </div>

      {error && (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-xs text-red-400 text-center">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer"
            style={{ background: 'rgba(255,214,0,0.1)', color: '#FFD600' }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {!error && (
        <div
          className="text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-wrap font-mono"
          style={{ minHeight: text ? 'auto' : '120px' }}
        >
          {text || (loading && <span className="text-[#71717A] text-xs animate-pulse">Conectando con IA…</span>)}
          {cursorVisible && <span className="inline-block w-0.5 h-4 bg-[#FFD600] ml-0.5 animate-pulse align-middle" />}
        </div>
      )}
    </div>
  );
}

const PROGRAMS = [
  {
    id: 1,
    name: 'Boost Principiante',
    weeks: 8,
    sessions: 3,
    level: 'Principiante',
    color: '#22d3ee',
    description: 'Bases sólidas de fuerza e hipertrofia para iniciarte con el método Sergi Constance.',
    image: 'https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg?auto=compress&cs=tinysrgb&w=600',
    locked: false,
    active: false,
  },
  {
    id: 2,
    name: 'Boost Intermedio',
    weeks: 10,
    sessions: 4,
    level: 'Intermedio',
    color: '#FFD600',
    description: 'Progresión avanzada con técnicas de intensidad y periodización para maximizar resultados.',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=600',
    locked: false,
    active: true,
  },
  {
    id: 3,
    name: 'Boost Avanzado',
    weeks: 12,
    sessions: 5,
    level: 'Avanzado',
    color: '#f97316',
    description: 'El programa elite de Sergi para atletas con experiencia real buscando el siguiente nivel.',
    image: 'https://images.pexels.com/photos/3837757/pexels-photo-3837757.jpeg?auto=compress&cs=tinysrgb&w=600',
    locked: true,
    active: false,
  },
];

const WEEK_PLAN = [
  { day: 'Lun', name: 'Push A', muscles: 'Pecho · Tríceps · Hombros', sets: 18, done: true },
  { day: 'Mar', name: 'Pull A', muscles: 'Espalda · Bíceps · Rear Delt', sets: 16, done: true },
  { day: 'Mié', name: 'Descanso', muscles: 'Recuperación activa', sets: 0, done: false, rest: true },
  { day: 'Jue', name: 'Legs A', muscles: 'Cuádriceps · Isquios · Gemelos', sets: 20, done: false },
  { day: 'Vie', name: 'Push B', muscles: 'Pecho · Tríceps · Hombros', sets: 16, done: false },
  { day: 'Sáb', name: 'Pull B', muscles: 'Espalda · Bíceps', sets: 14, done: false },
  { day: 'Dom', name: 'Descanso', muscles: 'Recuperación total', sets: 0, done: false, rest: true },
];

const EXERCISES = [
  { name: 'Press Banca Plano', sets: '4x8-10', rest: '2min', pr: '100kg', icon: '🏋️' },
  { name: 'Press Inclinado DB', sets: '3x10-12', rest: '90s', pr: '36kg', icon: '💪' },
  { name: 'Fondos Paralelas', sets: '3x12-15', rest: '60s', pr: 'Peso corporal', icon: '⬇️' },
  { name: 'Press Militar', sets: '4x8-10', rest: '2min', pr: '60kg', icon: '🎯' },
  { name: 'Elevaciones Laterales', sets: '4x15-20', rest: '45s', pr: '14kg', icon: '↔️' },
];

function ProgramCard({ program, onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{ boxShadow: program.active ? `0 0 25px ${program.color}25` : 'none' }}
      onClick={() => !program.locked && onStart(program)}
    >
      <div className="h-36 overflow-hidden">
        <img src={program.image} alt={program.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)' }} />
      </div>
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
            style={{ background: `${program.color}20`, color: program.color, border: `1px solid ${program.color}40` }}>
            {program.level}
          </span>
          {program.active && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFD600] text-black uppercase tracking-wide">
              Activo
            </span>
          )}
          {program.locked && (
            <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-[#71717A]" />
            </div>
          )}
        </div>
        <div>
          <h3 className="font-black text-lg text-white leading-tight mb-1">{program.name}</h3>
          <div className="flex items-center gap-3 text-xs text-[#D4D4D8]">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{program.weeks} sem</span>
            <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{program.sessions}x/sem</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const MEAL_PLAN = [
  {
    time: '08:00',
    name: 'Desayuno',
    foods: ['Avena 80g', 'Claras de huevo x4', 'Plátano'],
    kcal: 480,
    protein: 32,
    carbs: 68,
    fat: 8,
  },
  {
    time: '11:00',
    name: 'Media mañana',
    foods: ['Batido de proteína', 'Almendras 30g'],
    kcal: 310,
    protein: 28,
    carbs: 14,
    fat: 14,
  },
  {
    time: '14:00',
    name: 'Comida',
    foods: ['Pollo 200g', 'Arroz integral 150g', 'Brócoli'],
    kcal: 620,
    protein: 48,
    carbs: 72,
    fat: 10,
  },
  {
    time: '17:30',
    name: 'Pre-entreno',
    foods: ['Tostadas integrales x2', 'Mantequilla de cacahuete 20g'],
    kcal: 290,
    protein: 10,
    carbs: 38,
    fat: 12,
  },
  {
    time: '20:30',
    name: 'Cena',
    foods: ['Salmón 180g', 'Boniato 200g', 'Espinacas'],
    kcal: 540,
    protein: 42,
    carbs: 52,
    fat: 14,
  },
];

function WorkoutSession({ onFinish, onExit }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [sets, setSets] = useState(EXERCISES.map(() => []));
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const ex = EXERCISES[currentExercise];
  const completedSets = sets[currentExercise];
  const targetSets = parseInt(ex.sets.split('x')[0]);

  const logSet = () => {
    if (!weight) return;
    const newSets = sets.map((s, i) => i === currentExercise ? [...s, { reps, weight }] : s);
    setSets(newSets);
    setResting(true);
    const restTime = ex.rest.includes('2') ? 120 : ex.rest.includes('90') ? 90 : 60;
    setRestSeconds(restTime);
    const t = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) { clearInterval(t); setResting(false); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const totalCompleted = sets.reduce((acc, s) => acc + s.length, 0);
  const totalSets = EXERCISES.reduce((acc, e) => acc + parseInt(e.sets.split('x')[0]), 0);
  const progress = totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: '#1A1A1C', border: '1px solid rgba(255,214,0,0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,214,0,0.1)' }}>
                  <Zap className="w-5 h-5 text-[#FFD600]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Entrenamiento en curso</h3>
                  <p className="text-[11px] text-[#71717A]">Tiempo: {fmtTime(elapsed)}</p>
                </div>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Tu sesión <span className="font-bold text-white">Push B</span> todavía no está finalizada. Si sales ahora, el progreso no se guardará.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wide border-none cursor-pointer"
                  style={{ background: '#FFD600', color: '#000' }}
                >
                  Continuar entrenando
                </button>
                <button
                  onClick={() => { setShowExitModal(false); onExit(); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-[#71717A] border border-white/10 bg-transparent cursor-pointer hover:text-white transition-colors"
                >
                  Salir sin guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowExitModal(true)}
          className="flex items-center gap-2 text-[#71717A] hover:text-[#F4F4F5] transition-colors border-none bg-transparent cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold">Volver</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111113]">
          <Clock className="w-3.5 h-3.5 text-[#FFD600]" />
          <span className="text-sm font-black text-[#FFD600]">{fmtTime(elapsed)}</span>
        </div>
      </div>

      <div className="glass-effect rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-black text-white">Push B</h2>
            <p className="text-[11px] text-[#71717A]">Pecho · Tríceps · Hombros</p>
          </div>
          <span className="text-xs font-black text-[#FFD600]">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-2 rounded-full"
            style={{ background: 'linear-gradient(90deg, #FFD600, #FFA500)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-[11px] text-[#71717A] mt-2">{totalCompleted} / {totalSets} series completadas</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {EXERCISES.map((e, i) => {
          const done = sets[i].length >= parseInt(e.sets.split('x')[0]);
          return (
            <button
              key={e.name}
              onClick={() => setCurrentExercise(i)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border-none cursor-pointer transition-all"
              style={{
                background: i === currentExercise ? '#FFD600' : done ? 'rgba(34,197,94,0.15)' : '#111113',
                color: i === currentExercise ? '#000' : done ? '#22c55e' : '#71717A',
                border: done && i !== currentExercise ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
              }}
            >
              {i + 1}. {e.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div className="glass-effect rounded-2xl overflow-hidden">
        <div className="relative h-32">
          <img src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=600" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.92), rgba(0,0,0,0.5))' }} />
          <div className="absolute inset-0 p-5 flex flex-col justify-center">
            <span className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-1">Ejercicio {currentExercise + 1} de {EXERCISES.length}</span>
            <h3 className="text-xl font-black text-white leading-tight">{ex.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-300 flex items-center gap-1"><Dumbbell className="w-3 h-3" />{ex.sets}</span>
              <span className="text-xs text-gray-300 flex items-center gap-1"><Clock className="w-3 h-3" />{ex.rest} descanso</span>
              <span className="text-xs text-[#FFD600] font-bold">PR: {ex.pr}</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          {resting ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <p className="text-[11px] font-black text-[#71717A] uppercase tracking-widest">Descansando</p>
              <p className="text-5xl font-black text-[#FFD600]">{fmtTime(restSeconds)}</p>
              <button
                onClick={() => setResting(false)}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-[#71717A] border border-white/10 bg-transparent cursor-pointer hover:text-white transition-colors"
              >
                Saltar descanso
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wide mb-1.5">Repeticiones</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setReps(r => String(Math.max(1, parseInt(r) - 1)))} className="w-8 h-8 rounded-lg bg-[#111113] flex items-center justify-center border-none cursor-pointer text-white hover:text-[#FFD600] transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-black text-white w-8 text-center">{reps}</span>
                    <button onClick={() => setReps(r => String(parseInt(r) + 1))} className="w-8 h-8 rounded-lg bg-[#111113] flex items-center justify-center border-none cursor-pointer text-white hover:text-[#FFD600] transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wide mb-1.5">Peso (kg)</p>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2 text-lg font-black text-white text-center focus:outline-none focus:border-[#FFD600] transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {Array.from({ length: targetSets }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full transition-all"
                    style={{ background: i < completedSets.length ? '#FFD600' : 'rgba(255,255,255,0.1)' }}
                  />
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={logSet}
                disabled={!weight}
                className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wide border-none cursor-pointer transition-all"
                style={{
                  background: weight ? '#FFD600' : 'rgba(255,255,255,0.05)',
                  color: weight ? '#000' : '#71717A',
                  cursor: weight ? 'pointer' : 'not-allowed',
                }}
              >
                {completedSets.length < targetSets ? `Registrar serie ${completedSets.length + 1}/${targetSets}` : 'Serie extra'}
              </motion.button>

              {completedSets.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wide">Series registradas</p>
                  {completedSets.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-[#F4F4F5]">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      <span>Serie {i + 1}</span>
                      <span className="font-bold">{s.weight}kg × {s.reps} reps</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {currentExercise < EXERCISES.length - 1 && (
        <button
          onClick={() => setCurrentExercise(i => i + 1)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#71717A] border border-white/10 bg-transparent cursor-pointer hover:text-white transition-colors"
        >
          Siguiente ejercicio <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {progress >= 100 && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onFinish}
          className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wide border-none cursor-pointer flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', color: '#fff' }}
        >
          <Trophy className="w-4 h-4" /> Finalizar sesión
        </motion.button>
      )}
    </motion.div>
  );
}

const GOAL_NAMES = {
  lose_fat: 'Boost Cut', gain_muscle: 'Boost Hypertrophy',
  recomp: 'Boost Recomp', endurance: 'Boost Cardio',
};

export default function BoostScreen({ initialTab = 'program', sessionActive = false, onSessionStart, onSessionEnd, onSessionExit, profile, challengeActive, onStartChallenge }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDay, setSelectedDay] = useState(3);
  const [lockedToast, setLockedToast] = useState(false);

  const mealPlanStream = useAIStream('generate-meal-plan');
  const workoutPlanStream = useAIStream('generate-workout-plan');

  useEffect(() => {
    if (activeTab === 'nutrition' && !mealPlanStream.text && !mealPlanStream.loading) {
      mealPlanStream.start();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'today' && !workoutPlanStream.text && !workoutPlanStream.loading) {
      workoutPlanStream.start();
    }
  }, [activeTab]);

  const handleProgramStart = (program) => {
    if (program.locked) {
      setLockedToast(true);
      setTimeout(() => setLockedToast(false), 2500);
      return;
    }
    setActiveTab('today');
  };

  if (sessionActive) {
    return (
      <WorkoutSession
        onFinish={(sets) => onSessionEnd(sets)}
        onExit={onSessionExit || onSessionEnd}
      />
    );
  }

  const expLabels = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
  const totalWeeks = profile?.training_experience === 'beginner' ? 8 : profile?.training_experience === 'advanced' ? 12 : 10;
  const totalSessions = (profile?.training_days_per_week || 4) * totalWeeks;
  const challengeDays = challengeActive && profile?.boost_challenge_start
    ? Math.max(0, Math.floor((new Date() - new Date(profile.boost_challenge_start)) / 86400000))
    : 0;
  const programName = GOAL_NAMES[profile?.goal] || 'Boost Intermedio';

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5]">Boost</h2>
          <p className="text-[#71717A] text-sm">
            {challengeActive ? `${programName} · Día ${challengeDays}/90` : 'Tu plan de entrenamiento.'}
          </p>
        </div>
        {challengeActive ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,214,0,0.1)', border: '1px solid rgba(255,214,0,0.3)' }}>
            <Zap className="w-3 h-3 text-[#FFD600]" fill="#FFD600" />
            <span className="text-xs font-black text-[#FFD600] uppercase tracking-wide">Reto Activo</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide text-[#71717A]"
            style={{ background: '#111113' }}>
            Sem 1/{totalWeeks}
          </div>
        )}
      </div>

      {/* Progress bar overall */}
      <div className="glass-effect rounded-2xl p-4">
        <div className="flex justify-between text-xs font-bold mb-2">
          <span className="text-[#71717A]">{challengeActive ? 'Progreso del reto 90 días' : 'Progreso del programa'}</span>
          <span className={challengeActive ? 'text-[#FFD600]' : 'text-[#71717A]'}>
            {challengeActive ? `${Math.round((challengeDays / 90) * 100)}%` : '0%'}
          </span>
        </div>
        <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
          <motion.div
            className="h-2.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, #FFD600, #FFA500)' }}
            initial={{ width: 0 }}
            animate={{ width: challengeActive ? `${Math.max((challengeDays / 90) * 100, challengeDays > 0 ? 1 : 0)}%` : '0%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-[#71717A]">
          <span>0 sesiones completadas</span>
          <span>{challengeActive ? `${90 - challengeDays} días restantes` : `${totalSessions} sesiones en total`}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#111113] p-1 rounded-xl overflow-x-auto scrollbar-hide">
        {[
          { id: 'reto', label: 'Reto 90D' },
          { id: 'program', label: 'Programa' },
          { id: 'today', label: 'Entreno' },
          { id: 'nutrition', label: 'Nutrición' },
          { id: 'plans', label: 'Planes' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer border-none"
            style={{
              background: activeTab === t.id ? '#FFD600' : 'transparent',
              color: activeTab === t.id ? '#000' : '#71717A',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'program' && (
          <motion.div key="program" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Week plan */}
            <div className="glass-effect rounded-2xl p-5">
              <h3 className="font-bold text-[#F4F4F5] mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FFD600]" /> Semana 6
              </h3>
              <div className="flex flex-col gap-2">
                {WEEK_PLAN.map((d, i) => (
                  <motion.div
                    key={d.day}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDay(i)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: selectedDay === i ? 'rgba(255,214,0,0.08)' : '#111113',
                      border: selectedDay === i ? '1px solid rgba(255,214,0,0.3)' : '1px solid transparent',
                    }}
                  >
                    <div className="w-10 flex-shrink-0 text-center">
                      <p className="text-[9px] font-black text-[#71717A] uppercase tracking-wider">{d.day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${d.rest ? 'text-[#71717A]' : 'text-[#F4F4F5]'}`}>{d.name}</p>
                      <p className="text-[10px] text-[#71717A] truncate">{d.muscles}</p>
                    </div>
                    {d.done ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : d.rest ? (
                      <Clock className="w-5 h-5 text-[#71717A] flex-shrink-0" />
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#71717A] flex-shrink-0">
                        <span>{d.sets} series</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'today' && (
          <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Today session header */}
            <div className="relative rounded-2xl overflow-hidden h-40">
              <img src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=600" alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.9), rgba(0,0,0,0.5))' }} />
              <div className="absolute inset-0 p-5 flex flex-col justify-center">
                <span className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest mb-1">Sesión de hoy</span>
                <h3 className="text-2xl font-black text-white">Push B</h3>
                <p className="text-sm text-gray-300">Pecho · Tríceps · Hombros</p>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onSessionStart}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-black text-xs font-black uppercase cursor-pointer border-none"
                  style={{ background: '#FFD600' }}
                >
                  <Play className="w-3.5 h-3.5" fill="black" /> Iniciar
                </motion.button>
              </div>
            </div>
            {/* AI workout plan */}
            <AIStreamDisplay
              text={workoutPlanStream.text}
              loading={workoutPlanStream.loading}
              error={workoutPlanStream.error}
              done={workoutPlanStream.done}
              onRetry={workoutPlanStream.start}
              onRegenerate={() => { workoutPlanStream.reset(); workoutPlanStream.start(); }}
              label="Plan de entrenamiento personalizado"
              icon={Dumbbell}
            />
          </motion.div>
        )}

        {activeTab === 'nutrition' && (
          <motion.div key="nutrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {(() => {
              const w = profile?.weight_kg || 75;
              const h = profile?.height_cm || 175;
              const a = profile?.age || 25;
              const g = profile?.gender || 'male';
              const actMults = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
              const mult = actMults[profile?.activity_level] || 1.55;
              const bmr = g === 'female' ? 10*w + 6.25*h - 5*a - 161 : 10*w + 6.25*h - 5*a + 5;
              let cal = Math.round(bmr * mult);
              const goal = profile?.goal || 'gain_muscle';
              if (goal === 'lose_fat') cal -= 400;
              if (goal === 'gain_muscle') cal += 250;
              const prot = Math.round(w * 2.0);
              const fat = Math.round((cal * 0.25) / 9);
              const carbs = Math.round((cal - prot * 4 - fat * 9) / 4);
              const goalLabels = { lose_fat: 'pérdida de grasa', gain_muscle: 'hipertrofia', recomp: 'recomposición', endurance: 'resistencia' };
              const expLabelMap = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
              const expL = expLabelMap[profile?.training_experience] || 'Intermedio';
              return (
                <div className="glass-effect rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Apple className="w-4 h-4 text-[#FFD600]" />
                    <h3 className="font-bold text-[#F4F4F5]">Plan Nutricional · {expL}</h3>
                  </div>
                  <p className="text-[11px] text-[#71717A] mb-4">Calculado para tu objetivo de {goalLabels[goal] || 'entrenamiento'}.</p>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { label: 'Kcal', value: cal.toLocaleString(), color: '#FFD600', Icon: Flame },
                      { label: 'Proteína', value: `${prot}g`, color: '#22d3ee', Icon: Dumbbell },
                      { label: 'Carbos', value: `${carbs}g`, color: '#f59e0b', Icon: Wheat },
                      { label: 'Grasas', value: `${fat}g`, color: '#f97316', Icon: Droplets },
                    ].map(m => (
                      <div key={m.label} className="rounded-xl p-3 flex flex-col items-center gap-1" style={{ background: `${m.color}10`, border: `1px solid ${m.color}20` }}>
                        <m.Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                        <p className="text-sm font-black text-white">{m.value}</p>
                        <p className="text-[9px] font-bold text-[#71717A] uppercase tracking-wide">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <AIStreamDisplay
              text={mealPlanStream.text}
              loading={mealPlanStream.loading}
              error={mealPlanStream.error}
              done={mealPlanStream.done}
              onRetry={mealPlanStream.start}
              onRegenerate={() => { mealPlanStream.reset(); mealPlanStream.start(); }}
              label="Plan de comidas personalizado"
              icon={Apple}
            />
          </motion.div>
        )}

        {activeTab === 'plans' && (
          <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <p className="text-sm text-[#71717A]">Elige el programa que se adapte a tu nivel.</p>
            {PROGRAMS.map(p => (
              <ProgramCard key={p.id} program={p} onStart={handleProgramStart} />
            ))}
          </motion.div>
        )}

        {activeTab === 'reto' && (
          <motion.div key="reto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden h-52">
              <img
                src="https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Reto Boost"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.92) 100%)' }} />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-black uppercase tracking-widest" style={{ background: '#FFD600' }}>
                    Reto Oficial
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-white uppercase tracking-widest">
                    90 Dias
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white uppercase italic leading-none mb-1">
                  Boost Challenge
                </h2>
                <p className="text-sm text-[#D4D4D8]">Transforma tu cuerpo. Documenta el cambio. Gana.</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Participantes', value: '2.1k' },
                { label: 'Duración', value: '90 días' },
                { label: 'Semanas', value: '12 sem' },
              ].map(s => (
                <div key={s.label} className="glass-effect rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-[#FFD600]">{s.value}</p>
                  <p className="text-[10px] text-[#71717A] font-bold uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* What is it */}
            <div className="glass-effect rounded-2xl p-5">
              <h3 className="font-black text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFD600]" /> ¿En qué consiste?
              </h3>
              <p className="text-sm text-[#D4D4D8] leading-relaxed">
                El <span className="text-[#FFD600] font-bold">Boost Challenge</span> es un reto de transformación física de 90 días diseñado por Sergi Constance. Entrena con el programa oficial, registra tu progreso y documenta tu cambio físico semana a semana. Al finalizar, los participantes con mayor transformación compiten por premios exclusivos.
              </p>
            </div>

            {/* Phases */}
            <div className="glass-effect rounded-2xl p-5">
              <h3 className="font-black text-white mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FFD600]" /> Fases del Reto
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  {
                    phase: 'Fase 1',
                    weeks: 'Sem 1–4',
                    title: 'Activación',
                    desc: 'Adapta tu cuerpo al volumen. Consolida la técnica. Base sólida.',
                    color: '#22d3ee',
                  },
                  {
                    phase: 'Fase 2',
                    weeks: 'Sem 5–8',
                    title: 'Hipertrofia',
                    desc: 'Máximo volumen de entrenamiento. Progresión semana a semana.',
                    color: '#FFD600',
                  },
                  {
                    phase: 'Fase 3',
                    weeks: 'Sem 9–12',
                    title: 'Peak & Definición',
                    desc: 'Intensidad máxima. Afina la composición. Prepara el físico final.',
                    color: '#f97316',
                  },
                ].map((p, i) => (
                  <div key={p.phase} className="flex items-start gap-4 p-4 rounded-xl bg-[#111113]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black"
                      style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black" style={{ color: p.color }}>{p.weeks}</span>
                        <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wide">{p.phase}</span>
                      </div>
                      <p className="font-bold text-[#F4F4F5] text-sm">{p.title}</p>
                      <p className="text-xs text-[#71717A] mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="glass-effect rounded-2xl p-5">
              <h3 className="font-black text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#FFD600]" /> Reglas del Reto
              </h3>
              <div className="flex flex-col gap-2.5">
                {[
                  'Foto inicial obligatoria el Día 1 (frente, perfil, espalda)',
                  'Check-in semanal con foto de progreso cada lunes',
                  'Mínimo 3 entrenos semanales registrados en la app',
                  'Foto final en el Día 90 con las mismas poses',
                  'Dieta alineada al plan de nutrición del programa',
                  'Compartir al menos 2 posts semanales en la comunidad',
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(255,214,0,0.12)', border: '1px solid rgba(255,214,0,0.3)' }}>
                      <span className="text-[9px] font-black text-[#FFD600]">{i + 1}</span>
                    </div>
                    <p className="text-sm text-[#D4D4D8]">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prizes */}
            <div className="glass-effect rounded-2xl p-5">
              <h3 className="font-black text-white mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD600]" /> Premios
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  { pos: '1°', prize: 'Pack Suplementación Anual + Sesión con Sergi', badge: '🥇', color: '#FFD600' },
                  { pos: '2°', prize: 'Pack Suplementación 6 meses + Merchandising SC', badge: '🥈', color: '#D4D4D8' },
                  { pos: '3°', prize: 'Pack Suplementación 3 meses', badge: '🥉', color: '#f97316' },
                  { pos: 'Top 10', prize: 'Camiseta edición limitada Boost Challenge', badge: '🎽', color: '#71717A' },
                ].map(p => (
                  <div key={p.pos} className="flex items-center gap-3 p-3 rounded-xl bg-[#111113]">
                    <span className="text-xl">{p.badge}</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide" style={{ color: p.color }}>{p.pos}</p>
                      <p className="text-sm text-[#F4F4F5]">{p.prize}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {challengeActive ? (
              <div className="glass-effect rounded-2xl p-5 flex items-center gap-4"
                style={{ border: '1px solid rgba(255,214,0,0.25)', background: 'linear-gradient(135deg, rgba(255,214,0,0.05) 0%, transparent 100%)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,214,0,0.15)', border: '1px solid rgba(255,214,0,0.3)' }}>
                  <Zap className="w-6 h-6 text-[#FFD600]" fill="#FFD600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-[#FFD600] text-sm uppercase tracking-wide">Reto Boost Activo</p>
                  <p className="text-xs text-[#71717A] mt-0.5">Día {challengeDays} de 90 · {90 - challengeDays} días restantes</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setActiveTab('today')}
                  className="px-4 py-2 rounded-xl text-xs font-black text-black uppercase tracking-wide border-none cursor-pointer"
                  style={{ background: '#FFD600' }}>
                  Entrenar
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onStartChallenge}
                className="w-full py-4 rounded-2xl text-base font-black uppercase tracking-widest text-black border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)', boxShadow: '0 8px 24px rgba(255,214,0,0.35)' }}
              >
                <Zap className="w-5 h-5" fill="black" /> Activar mi Reto Boost
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lockedToast && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: '#1A1A1C', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <Lock className="w-4 h-4 text-[#71717A]" />
            <p className="text-sm font-bold text-[#F4F4F5] whitespace-nowrap">Completa el nivel anterior para desbloquear</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
