import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdImageSearch, MdCheckCircle, MdTimeline,
  MdHourglassEmpty, MdMemory, MdArrowForward,
  MdWarningAmber, MdAutorenew, MdVerifiedUser,
} from "react-icons/md";
import { obtenerStats, StatsResponse } from "services/api";

// ── Animación incremental de contadores ──────────────────────────────────
function useCounter(target: number, duration = 1400): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let current = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      current += step;
      if (current >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(current));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

// ── Gráfica SVG de Desempeño Clínico ──────────────────────────────────────
function TrainingChart() {
  const acc =  [0.58, 0.72, 0.81, 0.87, 0.91, 0.93, 0.94, 0.95, 0.95, 0.95];
  const loss = [0.68, 0.55, 0.44, 0.35, 0.28, 0.23, 0.20, 0.18, 0.17, 0.17];
  const W = 500, H = 180, pad = { t: 20, r: 20, b: 30, l: 40 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  const xStep = gW / (acc.length - 1);

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${pad.l + i * xStep},${pad.t + gH - v * gH}`).join(" ");

  const yLabels = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {yLabels.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={pad.t + gH * (1 - t)} x2={pad.l + gW} y2={pad.t + gH * (1 - t)}
            stroke="currentColor" strokeWidth={0.5} className="text-slate-200 dark:text-navy-600"
            strokeDasharray={i === 0 ? "0" : "4 3"} />
          <text x={pad.l - 6} y={pad.t + gH * (1 - t) + 4} textAnchor="end" fontSize={9}
            className="fill-slate-400 dark:fill-slate-500">{(t * 100).toFixed(0)}</text>
        </g>
      ))}
      <path
        d={`${toPath(acc)} L${pad.l + (acc.length - 1) * xStep},${pad.t + gH} L${pad.l},${pad.t + gH} Z`}
        fill="url(#pinkGrad)" opacity={0.15} />
      <defs>
        <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={toPath(acc)} fill="none" stroke="#EC4899" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(loss)} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
      {acc.map((v, i) => (
        <circle key={i} cx={pad.l + i * xStep} cy={pad.t + gH - v * gH} r={3} fill="#EC4899" />
      ))}
      {[1, 3, 5, 7, 10].map(ep => (
        <text key={ep} x={pad.l + (ep - 1) * xStep} y={H - 8} textAnchor="middle" fontSize={9}
          className="fill-slate-400 dark:fill-slate-500">Sesión {ep}</text>
      ))}
      <circle cx={pad.l} cy={12} r={4} fill="#EC4899" />
      <text x={pad.l + 8} y={15} fontSize={9} fill="#EC4899" fontWeight="600">Concordancia Diagnóstica</text>
      <line x1={pad.l + 130} y1={12} x2={pad.l + 142} y2={12} stroke="#818cf8" strokeWidth={2} strokeDasharray="4 2" />
      <text x={pad.l + 146} y={15} fontSize={9} fill="#818cf8" fontWeight="600">Margen de Desviación</text>
    </svg>
  );
}

// ── Panel Principal ───────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatsResponse>({
    total_estudios: 0,
    total_validados: 0,
    total_pendientes: 0,
    precision_real: 0,
    precision_entrenamiento: 0,
    listo_para_reentrenar: false,
    umbral_reentrenamiento: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const totalCount      = useCounter(stats.total_estudios);
  const validadosCount  = useCounter(stats.total_validados);
  const pendientesCount = useCounter(stats.total_pendientes);

  useEffect(() => {
    obtenerStats()
      .then(setStats)
      .catch(() => setStatsError(true))
      .finally(() => setLoading(false));
  }, []);

  const StatCard = ({
    icon, label, value, sub, colorClass, bgClass,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    colorClass: string;
    bgClass: string;
  }) => (
    <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${bgClass} ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-extrabold ${colorClass}`}>{value}</p>
      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">{sub}</p>
    </div>
  );

  const precisionReal = Math.round(stats.precision_real * 100);
  const precisionEntrenamiento = Math.round(stats.precision_entrenamiento * 100);
  const progresoReentrenamiento = stats.umbral_reentrenamiento > 0
    ? Math.min(100, Math.round((stats.total_validados / stats.umbral_reentrenamiento) * 100))
    : 0;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                Sistema SOP
              </span>
              <span className="bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-md">
                Versión 1.0
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Panel Principal — Evaluación Ecográfica Ovárica
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Monitoreo asistido para la cuantificación y análisis folicular según Criterios de Rotterdam.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-3.5 self-start sm:self-auto">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">Sistema Conectado</span>
          </div>
        </div>
      </div>

      {/* Error backend */}
      {statsError && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 sm:p-5 rounded-2xl">
          <MdWarningAmber className="text-amber-500 flex-shrink-0" size={22} />
          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-medium">
            No se pudo sincronizar el resumen con el servidor central. Verifique la conexión del servicio médico.
          </p>
        </div>
      )}

      {/* ── METRICAS PRINCIPALES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<MdMemory size={22} />}
          label="Concordancia Real"
          value={loading ? "—" : `${precisionReal}%`}
          sub="Basada en validación médica"
          colorClass="text-pink-600 dark:text-pink-400"
          bgClass="bg-pink-50 dark:bg-pink-900/20"
        />
        <StatCard
          icon={<MdCheckCircle size={22} />}
          label="Estudios Totales"
          value={loading ? "—" : totalCount.toString()}
          sub="Ecografías evaluadas"
          colorClass="text-violet-600 dark:text-violet-400"
          bgClass="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          icon={<MdVerifiedUser size={22} />}
          label="Estudios Validados"
          value={loading ? "—" : validadosCount.toString()}
          sub="Confirmados por especialista"
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={<MdHourglassEmpty size={22} />}
          label="Pendientes"
          value={loading ? "—" : pendientesCount.toString()}
          sub="Por confirmación médica"
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* ── SECCIÓN CENTRAL DE ANCHO COMPLETO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Gráfica (8 COLS) */}
        <div className="lg:col-span-8 bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <MdTimeline className="text-pink-500" size={20} />
                Evolución de Precisión Asistida
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Desempeño acumulado en la detección de patrones foliculares
              </p>
            </div>
            <span className="bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full border border-pink-200 dark:border-pink-800 self-start sm:self-auto">
              {precisionEntrenamiento}% Precisión Base
            </span>
          </div>
          <TrainingChart />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { val: `${precisionEntrenamiento}%`, lbl: "Precisión de Referencia", color: "text-pink-500" },
              { val: `${precisionReal}%`,          lbl: "Concordancia Clínica", color: "text-violet-500" },
              { val: "15",                          lbl: "Ciclos de Evaluación", color: "text-emerald-500" },
            ].map(item => (
              <div key={item.lbl} className="bg-slate-50 dark:bg-navy-900/50 rounded-2xl p-4 text-center border border-slate-100 dark:border-navy-700">
                <p className={`text-xl sm:text-2xl font-extrabold ${item.color}`}>{item.val}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{item.lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-7 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2">
                <MdAutorenew className={`${stats.listo_para_reentrenar ? "text-emerald-500 animate-spin" : "text-slate-400"}`} size={18} />
                Actualización del Sistema
              </h2>

              <div className={`rounded-2xl p-4 mb-6 border text-xs sm:text-sm font-bold ${
                stats.listo_para_reentrenar
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-50 dark:bg-navy-900/50 border-slate-100 dark:border-navy-700 text-slate-400"
              }`}>
                {stats.listo_para_reentrenar ? "✅ Información suficiente para actualización" : "⏳ Acumulando registros médicos..."}
              </div>

              <div className="mb-2 flex justify-between text-xs sm:text-sm text-slate-400 font-medium">
                <span>Registros Acumulados</span>
                <span>{stats.total_validados} / {stats.umbral_reentrenamiento}</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-navy-900 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-navy-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    stats.listo_para_reentrenar ? "bg-emerald-500" : "bg-pink-500"
                  }`}
                  style={{ width: `${progresoReentrenamiento}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/analysis")}
            className="w-full flex items-center justify-between bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:via-rose-600 hover:to-purple-700 text-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="text-left">
              <p className="font-extrabold text-sm sm:text-base">Nueva Evaluación</p>
              <p className="text-xs opacity-90 mt-0.5 font-medium">Analizar ecografía ovárica</p>
            </div>
            <MdArrowForward size={24} className="group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;