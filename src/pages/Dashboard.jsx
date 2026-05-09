import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Hop as Home, Users, Zap, ChartBar as BarChart2, ShoppingBag, Activity, Dumbbell, Apple, ArrowRight, Trophy, Calendar, Star, LogOut, Flame, ArrowLeft, Clock } from 'lucide-react';
import CommunityScreen from './CommunityScreen';
import BoostScreen from './BoostScreen';
import AnalyticsScreen from './AnalyticsScreen';
import StoreScreen from './StoreScreen';
import BoostChallengeModal from './BoostChallengeModal';

function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, stars = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    class Star {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.3 + 0.1;
      }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0; if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0; if (this.y < 0) this.y = canvas.height;
      }
      draw() {
        ctx.fillStyle = `rgba(255,214,0,${this.opacity})`;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    const init = () => { stars = []; const c = Math.min(window.innerWidth * 0.05, 50); for (let i = 0; i < c; i++) stars.push(new Star()); };
    const animate = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); stars.forEach(s => { s.update(); s.draw(); }); animId = requestAnimationFrame(animate); };
    window.addEventListener('resize', resize);
    resize(); init(); animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', Icon: Home },
  { id: 'community', label: 'Comunidad', Icon: Users },
  { id: 'boost', label: 'Boost', Icon: Zap },
  { id: 'analytics', label: 'Analíticas', Icon: BarChart2 },
  { id: 'store', label: 'Tienda', Icon: ShoppingBag },
];

function SideNavButton({ id, label, Icon, active, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, x: 4 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(id)}
      className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-2xl w-full h-20 border-none cursor-pointer transition-all duration-300 ${
        active
          ? 'text-[#FFD600] drop-shadow-[0_0_8px_rgba(255,214,0,0.6)]'
          : 'text-[#71717A] hover:text-[#F4F4F5]'
      }`}
      style={{ background: 'transparent', boxShadow: active ? 'var(--shadow-active)' : 'none' }}
    >
      <Icon className="w-6 h-6" />
      {active && (
        <motion.div
          layoutId="sidebar-pill"
          className="absolute right-0 h-8 w-1 bg-[#FFD600] rounded-l-full"
          style={{ boxShadow: '0 0 10px rgba(255,214,0,0.5)' }}
        />
      )}
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </motion.button>
  );
}

function BottomNavButton({ id, label, Icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl border-none cursor-pointer transition-all duration-300 ${
        active
          ? 'text-[#FFD600] -translate-y-3 bg-[#111113] border border-[rgba(255,214,0,0.2)]'
          : 'text-[#71717A]'
      }`}
      style={{ background: active ? '#111113' : 'transparent', boxShadow: active ? '0 10px 20px rgba(0,0,0,0.15)' : 'none' }}
    >
      <Icon
        className="w-6 h-6"
        style={{ filter: active ? 'drop-shadow(0 0 5px rgba(255,214,0,0.8))' : 'none' }}
      />
      {active && (
        <span className="absolute -bottom-5 text-[10px] font-bold text-[#FFD600] tracking-wide whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
}

function PerformanceWidget() {
  const score = 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="glass-effect rounded-2xl p-6 flex flex-col justify-between h-full">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2 text-[#F4F4F5]">
          <Activity className="w-5 h-5 text-[#FFD600]" /> Rendimiento
        </h3>
        <p className="text-[#71717A] text-sm mt-1">Tu estado diario.</p>
      </div>
      <div className="relative w-40 h-40 mx-auto my-6">
        <svg className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
          <circle
            cx="80" cy="80" r={radius}
            stroke="#FFD600" strokeWidth="10" fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-black text-[#F4F4F5] leading-none">{score}</p>
          <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">PUNTOS</p>
        </div>
      </div>
      <p className="text-center text-xs text-[#71717A]">Completa tu primer entreno para sumar puntos.</p>
    </div>
  );
}

function MuscleFocusWidget() {
  const muscles = [
    { name: 'Pecho', intensity: 0 },
    { name: 'Espalda', intensity: 0 },
    { name: 'Hombros', intensity: 0 },
    { name: 'Bíceps', intensity: 0 },
    { name: 'Tríceps', intensity: 0 },
    { name: 'Piernas', intensity: 0 },
  ];
  return (
    <div className="glass-effect rounded-2xl p-6">
      <h3 className="text-xl font-bold flex items-center gap-2 mb-1 text-[#F4F4F5]">
        <Activity className="w-5 h-5 text-[#FFD600]" /> Foco Muscular
      </h3>
      <p className="text-[#71717A] text-sm mb-6">Últimos 14 días.</p>
      <div className="flex flex-col gap-3">
        {muscles.map(m => (
          <div key={m.name}>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="uppercase tracking-wide text-[#F4F4F5]">{m.name}</span>
              <span className="text-[#71717A]">—</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <motion.div
                className="h-2 rounded-full bg-[#FFD600]"
                initial={{ width: 0 }}
                animate={{ width: `${m.intensity * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#71717A] text-center mt-4">Entrena para ver tu foco muscular aquí.</p>
    </div>
  );
}

function MilestoneWidget() {
  const prs = [
    { name: 'Press Banca', value: '—', date: 'Sin registro' },
    { name: 'Sentadilla', value: '—', date: 'Sin registro' },
    { name: 'Peso Muerto', value: '—', date: 'Sin registro' },
  ];
  return (
    <div className="glass-effect rounded-2xl p-6">
      <h3 className="text-xl font-bold flex items-center gap-2 mb-1 text-[#FFD600]">
        <Trophy className="w-5 h-5" /> Historial de Hitos
      </h3>
      <p className="text-[#71717A] text-sm mb-6">Tus mejores marcas y días legendarios.</p>
      <div className="flex flex-col gap-2">
        <div className="bg-[#111113] p-3 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(255,255,255,0.04)] rounded-lg">
              <Calendar className="w-5 h-5 text-[#71717A]" />
            </div>
            <div>
              <p className="text-[11px] text-[#71717A] font-bold uppercase">Mayor Volumen</p>
              <p className="text-sm font-bold text-[#71717A]">Aún no registrado</p>
              <p className="text-[10px] text-[#71717A]">Completa tu primer entreno</p>
            </div>
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase text-[#71717A] tracking-wider mt-2 mb-1">Récords Personales (PRs)</p>
        {prs.map(pr => (
          <div key={pr.name} className="flex justify-between items-center p-2 rounded-lg border-b border-white/5 hover:bg-[#111113] transition-colors">
            <div>
              <p className="text-sm font-bold text-[#F4F4F5]">{pr.name}</p>
              <p className="text-[10px] text-[#71717A]">{pr.date}</p>
            </div>
            <div className="flex items-center gap-1 bg-[#111113] px-2 py-1 rounded-lg border border-white/10">
              <Star className="w-3 h-3 text-[#71717A]" />
              <span className="text-xs font-black text-[#71717A]">{pr.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionsWidget({ onTrain, onFood }) {
  const actions = [
    { label: 'Entrenar', Icon: Dumbbell, onClick: onTrain },
    { label: 'Comida', Icon: Apple, onClick: onFood },
  ];
  return (
    <div className="glass-effect rounded-2xl p-6">
      <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-[#FFD600]">
        <Zap className="w-5 h-5" /> Acciones Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map(a => (
          <motion.button
            key={a.label}
            whileTap={{ scale: 0.95 }}
            onClick={a.onClick}
            className="p-4 rounded-xl bg-[#111113] border-none cursor-pointer flex flex-col items-center justify-center gap-2 text-[#F4F4F5] hover:text-[#FFD600] transition-colors"
            style={{ boxShadow: 'var(--shadow-light), var(--shadow-dark)' }}
          >
            <div className="w-10 h-10 rounded-full bg-[#0A0A0C] flex items-center justify-center" style={{ boxShadow: 'var(--shadow-active)' }}>
              <a.Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function NutritionCard({ macroTargets }) {
  const t = macroTargets || { calories: 2200, protein: 160, carbs: 240, fat: 65 };
  const macros = [
    { label: 'Proteínas', value: 0, target: t.protein, color: '#22d3ee', bg: 'rgba(34,211,238,0.08)' },
    { label: 'Carbos', value: 0, target: t.carbs, color: '#d946ef', bg: 'rgba(217,70,239,0.08)' },
    { label: 'Grasas', value: 0, target: t.fat, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  ];
  const kcal = 0, kcalTarget = t.calories;
  const kcalPct = 0;
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <div className="rounded-3xl border border-white/5 p-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1E1F22 0%, #121315 100%)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
      <div className="absolute -top-8 -right-8 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(255,214,0,0.04)', filter: 'blur(60px)' }} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md" style={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#9ca3af]">Energía Diaria</span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-5xl font-black text-white leading-none">{kcal}</span>
              <span className="text-sm font-bold text-[#6b7280]">/ {kcalTarget} kcal</span>
            </div>
          </div>
          <div className="w-16 h-16 relative flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
              <circle cx="32" cy="32" r={r}
                stroke="url(#kcal-g)" strokeWidth="6" fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (Math.min(kcalPct, 100) / 100) * circ}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <defs>
                <linearGradient id="kcal-g" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{Math.round(kcalPct)}%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {macros.map((m, i) => {
            const pct = Math.min((m.value / m.target) * 100, 100);
            return (
              <motion.div
                key={m.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl p-3 border border-white/5"
                style={{ background: m.bg }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center opacity-90" style={{ background: m.color }}>
                      <span className="text-[11px] font-black text-white">{m.label[0]}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#9ca3af]">{m.label}</p>
                      <p className="text-lg font-black text-white leading-none mt-0.5">
                        {Math.round(m.value)} <span className="text-[11px] text-[#6b7280] font-bold">/ {m.target}g</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: m.color }}>{Math.round(pct)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-1.5 rounded-full"
                    style={{ background: m.color, boxShadow: `0 0 10px ${m.color}40` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const GOAL_PROGRAM_MAP = {
  lose_fat: { name: 'Boost Cut', desc: 'Quema grasa y mantén tu músculo con intensidad progresiva.' },
  gain_muscle: { name: 'Boost Hypertrophy', desc: 'Construye músculo real con volumen y fuerza progresiva.' },
  recomp: { name: 'Boost Recomp', desc: 'Transforma tu composición. Músculo arriba, grasa abajo.' },
  endurance: { name: 'Boost Cardio', desc: 'Mejora tu capacidad cardiovascular y aguante.' },
};

function BoostChallengeActiveWidget({ profile, onGoToBoost }) {
  const start = profile?.boost_challenge_start ? new Date(profile.boost_challenge_start) : new Date();
  const daysElapsed = Math.max(0, Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)));
  const pct = Math.min((daysElapsed / 90) * 100, 100);
  const prog = GOAL_PROGRAM_MAP[profile?.goal] || { name: 'Boost Challenge', desc: 'Tu transformación de 90 días.' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full rounded-3xl overflow-hidden mb-6 md:mb-8"
      style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      <img
        src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800"
        alt="Reto Boost"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.4) 100%)' }} />
      <div className="relative z-10 p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: '#FFD600', boxShadow: '0 0 12px rgba(255,214,0,0.5)' }}>
            <Zap className="w-3 h-3 text-black" fill="black" />
            <span className="text-[10px] font-black text-black uppercase tracking-widest">Reto Activo</span>
          </div>
          <span className="text-[10px] font-bold text-white/50">Día {daysElapsed} de 90</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic leading-none mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {prog.name}
        </h2>
        <p className="text-white/60 text-xs sm:text-sm mb-4 max-w-sm">{prog.desc}</p>
        <div className="mb-4 max-w-sm">
          <div className="flex justify-between text-[10px] font-bold text-white/50 mb-1.5">
            <span>Progreso del reto</span>
            <span className="text-[#FFD600]">{Math.round(pct)}% · {90 - daysElapsed} días restantes</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #FFD600, #FFA500)' }}
              initial={{ width: 0 }} animate={{ width: `${Math.max(pct, daysElapsed > 0 ? 1.5 : 0)}%` }}
              transition={{ duration: 1 }} />
          </div>
        </div>
        <button onClick={onGoToBoost}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide border-none cursor-pointer">
          Continuar sesión <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ProgramBanner({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full h-48 sm:h-56 md:h-64 rounded-3xl overflow-hidden cursor-pointer mb-6 md:mb-8 group"
      style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
    >
      <img
        src="https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800"
        alt="Reto Boost"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.65) 55%, transparent 100%)' }} />
      <div className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-center items-start z-10">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-black text-[10px] font-black px-3 py-1 rounded-full mb-3 uppercase tracking-widest flex items-center gap-1.5"
          style={{ background: '#FFD600', boxShadow: '0 0 15px rgba(255,214,0,0.6)' }}>
          <Trophy className="w-3 h-3" /> Reto · 90 Días
        </motion.div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase leading-none mb-2 italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          Boost Challenge
        </h2>
        <p className="text-gray-300 max-w-xs text-xs sm:text-sm mb-5 font-medium">
          Transforma tu cuerpo en 3 meses. Personalizado para ti.
        </p>
        <button onClick={onStart}
          className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide border-none cursor-pointer"
          style={{ background: '#FFD600', color: '#000', boxShadow: '0 0 20px rgba(255,214,0,0.4)' }}>
          <Zap className="w-4 h-4" fill="black" /> Unirse al Reto
        </button>
      </div>
    </motion.div>
  );
}

function WeeklyCalendar({ onTodayClick }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const plan = ['Push', 'Pull', 'Legs', 'Hombros', 'Full', 'Cardio', 'Rest'];
  const currentWeekStart = 2;
  const todayDate = 4;
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const weekDates = days.map((_, i) => currentWeekStart + i + weekOffset * 7);
  const monthIdx = 2;
  const year = 2026;

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="glass-effect rounded-2xl p-5 sm:p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-xl font-bold text-[#FFD600]">Intermedio</h3>
          <p className="text-[11px] text-[#71717A] font-bold uppercase tracking-widest">
            {MONTHS[monthIdx]} {year} {weekOffset !== 0 && `· ${weekOffset > 0 ? '+' : ''}${weekOffset}sem`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-8 h-8 rounded-full bg-[#111113] border-none cursor-pointer flex items-center justify-center text-[#F4F4F5] hover:text-[#FFD600] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-8 h-8 rounded-full bg-[#111113] border-none cursor-pointer flex items-center justify-center text-[#F4F4F5] hover:text-[#FFD600] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2">
        {days.map((day, i) => {
          const date = weekDates[i];
          const isToday = isCurrentWeek && date === todayDate;
          const isRest = plan[i] === 'Rest';
          return (
            <motion.div
              key={day}
              whileTap={{ scale: 0.95 }}
              onClick={() => isToday && onTodayClick && onTodayClick()}
              className="flex-shrink-0 w-[72px] sm:w-20 h-24 sm:h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
              style={{
                background: isToday ? '#FFD600' : '#111113',
                color: isToday ? '#000' : isRest ? 'rgba(255,255,255,0.25)' : '#F4F4F5',
                boxShadow: isToday ? '0 0 15px rgba(255,214,0,0.4)' : 'var(--shadow-light), var(--shadow-dark)',
                transform: isToday ? 'scale(1.05)' : 'scale(1)',
                opacity: isRest ? 0.5 : 1,
              }}
            >
              <p className="text-[9px] font-black tracking-widest mb-1 opacity-70">{day}</p>
              <p className="text-2xl font-black mb-2">{date}</p>
              {isRest
                ? <Clock className="w-4 h-4" />
                : <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: isToday ? '#000' : 'rgba(255,255,255,0.3)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: isToday ? '#000' : 'currentColor' }} />
                  </div>
              }
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function calcProfileMacros(p) {
  if (!p?.weight_kg) return null;
  const actMults = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const mult = actMults[p.activity_level] || 1.55;
  const bmr = p.gender === 'female'
    ? 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age - 161
    : 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + 5;
  let calories = Math.round(bmr * mult);
  if (p.goal === 'lose_fat') calories -= 400;
  if (p.goal === 'gain_muscle') calories += 250;
  const protein = Math.round(p.weight_kg * 2.0);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
}

export default function Dashboard({ profile: initialProfile, onProfileUpdate }) {
  const [profile, setProfile] = useState(initialProfile || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('home');
  const [boostTab, setBoostTab] = useState('program');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  const challengeActive = !!profile?.boost_challenge_active;

  const goToBoost = (tab = 'today') => {
    setBoostTab(tab);
    setActiveNav('boost');
  };

  useEffect(() => {
    if (!sessionActive) { setSessionElapsed(0); return; }
    const t = setInterval(() => setSessionElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [sessionActive]);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { setUser(user); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleChallengeComplete = (updatedProfile) => {
    const merged = { ...profile, ...updatedProfile };
    setProfile(merged);
    if (onProfileUpdate) onProfileUpdate(merged);
    setShowChallengeModal(false);
    setActiveNav('boost');
    setBoostTab('program');
  };

  const handleSessionStart = async () => {
    if (!user) { setSessionActive(true); return; }
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: user.id, started_at: new Date().toISOString() })
      .select('id')
      .single();
    if (!error && data) setSessionId(data.id);
    setSessionActive(true);
  };

  const handleSessionFinish = async (sets) => {
    if (sessionId) {
      const durationMinutes = Math.round(sessionElapsed / 60) || 1;
      await supabase
        .from('workout_sessions')
        .update({ completed_at: new Date().toISOString(), duration_minutes: durationMinutes })
        .eq('id', sessionId);
    }
    setSessionId(null);
    setSessionActive(false);
    setSessionElapsed(0);
  };

  const handleSessionExit = () => {
    setSessionId(null);
    setSessionActive(false);
    setSessionElapsed(0);
  };

  const handleSignOut = async () => await supabase.auth.signOut();
  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Campeón';
  const macroTargets = calcProfileMacros(profile);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#FFD600] animate-spin mx-auto" />
          <p className="mt-4 text-[#71717A] text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)', color: 'var(--text-main)' }}>
      <StarField />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col items-center w-24 py-6 relative z-20 flex-shrink-0"
        style={{ background: 'var(--bg-base)', boxShadow: '5px 0 25px rgba(0,0,0,0.15)' }}>
        <a href="#" className="w-16 h-16 mb-10 flex items-center justify-center hover:scale-105 transition-transform duration-300">
          <img src="https://horizons-cdn.hostinger.com/44a945b0-0776-414c-b558-451207c76649/fb087dd1803a43139c7109f55ed3d3a5.png" alt="Logo" className="max-w-full max-h-full drop-shadow-[0_0_15px_rgba(255,214,0,0.3)]" />
        </a>
        <nav className="flex flex-col items-center gap-2 flex-1 w-full px-3">
          {NAV_ITEMS.map(item => (
            <SideNavButton key={item.id} {...item} active={activeNav === item.id} onClick={setActiveNav} />
          ))}
        </nav>
        <div className="flex flex-col items-center gap-4 w-full px-3 pb-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={handleSignOut}
            className="p-3 rounded-full border-none cursor-pointer text-[#71717A] hover:text-red-400 transition-colors"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-light), var(--shadow-dark)' }}
          >
            <LogOut className="w-6 h-6" />
          </motion.button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-lg cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)' }}>
            {firstName.charAt(0)}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/5"
          style={{ background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(20px)', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
          <a href="#" className="flex items-center">
            <div className="w-9 h-9">
              <img src="https://horizons-cdn.hostinger.com/44a945b0-0776-414c-b558-451207c76649/fb087dd1803a43139c7109f55ed3d3a5.png" alt="Logo" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,214,0,0.4)]" />
            </div>
          </a>
          <h1 className="text-sm font-black uppercase tracking-widest text-[#F4F4F5]">
            Sergi <span className="text-[#FFD600]">Constance</span>
          </h1>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-red-400 text-xs font-bold border border-red-500/30 cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              Salir
            </motion.button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-black font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #FFD600, #FFA500)' }}>
              {firstName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 md:p-6 lg:p-8 pb-nav-safe md:pb-8">
          <AnimatePresence mode="wait">
            {activeNav === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5] leading-tight">Hola, {firstName}</h2>
                    <p className="text-[#71717A] text-sm font-medium">
                      {challengeActive ? `Día ${Math.max(0, Math.floor((new Date() - new Date(profile.boost_challenge_start)) / 86400000))} del reto. ¡Sigue así!` : 'Vamos a por todas hoy.'}
                    </p>
                  </div>
                  <img
                    src={`https://ui-avatars.com/api/?name=${firstName}&background=FFD600&color=000000`}
                    alt="Avatar"
                    className="w-11 h-11 rounded-full ring-2 ring-[rgba(255,214,0,0.3)]"
                  />
                </div>
                {challengeActive
                  ? <BoostChallengeActiveWidget profile={profile} onGoToBoost={() => goToBoost('today')} />
                  : <ProgramBanner onStart={() => setShowChallengeModal(true)} />
                }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-5">
                    <WeeklyCalendar onTodayClick={() => goToBoost('today')} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <PerformanceWidget />
                      <MuscleFocusWidget />
                    </div>
                    <MilestoneWidget />
                  </div>
                  <div className="flex flex-col gap-5">
                    <QuickActionsWidget onTrain={() => goToBoost('today')} onFood={() => goToBoost('nutrition')} />
                    <NutritionCard macroTargets={macroTargets} />
                  </div>
                </div>
              </motion.div>
            )}
            {activeNav === 'community' && (
              <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <CommunityScreen />
              </motion.div>
            )}
            {activeNav === 'boost' && (
              <motion.div key="boost" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <BoostScreen
                  initialTab={boostTab}
                  sessionActive={sessionActive}
                  onSessionStart={handleSessionStart}
                  onSessionEnd={handleSessionFinish}
                  onSessionExit={handleSessionExit}
                  profile={profile}
                  challengeActive={challengeActive}
                  onStartChallenge={() => setShowChallengeModal(true)}
                />
              </motion.div>
            )}
            {activeNav === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AnalyticsScreen />
              </motion.div>
            )}
            {activeNav === 'store' && (
              <motion.div key="store" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <StoreScreen />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Active session banner */}
      <AnimatePresence>
        {sessionActive && activeNav !== 'boost' && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
            style={{
              background: 'linear-gradient(90deg, #1a1600, #0A0A0C)',
              borderBottom: '1px solid rgba(255,214,0,0.3)',
              paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#FFD600] animate-pulse" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wide">Entrenamiento en curso</p>
                <p className="text-[10px] text-[#71717A]">Push B · {fmtTime(sessionElapsed)}</p>
              </div>
            </div>
            <button
              onClick={() => goToBoost('today')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-black text-[10px] font-black uppercase tracking-wide border-none cursor-pointer"
              style={{ background: '#FFD600' }}
            >
              <Zap className="w-3 h-3" /> Volver
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      <motion.nav
        className="md:hidden fixed z-50"
        style={{
          bottom: '12px',
          left: '12px',
          right: '12px',
          background: 'rgba(9,9,11,0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="flex justify-around items-center p-2">
          {NAV_ITEMS.map(item => (
            <BottomNavButton
              key={item.id}
              {...item}
              active={activeNav === item.id}
              onClick={setActiveNav}
            />
          ))}
        </div>
      </motion.nav>

      <AnimatePresence>
        {showChallengeModal && user && (
          <BoostChallengeModal
            userId={user.id}
            existingProfile={profile}
            onClose={() => setShowChallengeModal(false)}
            onComplete={handleChallengeComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
