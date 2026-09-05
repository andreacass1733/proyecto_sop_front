import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdImageSearch, MdCheckCircle, MdTimeline,
  MdHourglassEmpty, MdMemory, MdArrowForward,
  MdWarningAmber, MdAutorenew, MdVerifiedUser,
} from "react-icons/md";
import { obtenerStats, StatsResponse } from "services/api";

// ── Hooks ─────────────────────────────────────────────────────────────────
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

// ── Gráfica SVG de entrenamiento ──────────────────────────────────────────
function TrainingChart() {
  const acc =  [0.58, 0.72, 0.81, 0.87, 0.91, 0.93, 0.94, 0.95, 0.95, 0.95];
  const loss = [0.68, 0.55, 0.44, 0.35, 0.28, 0.23, 0.20, 0.18, 0.17, 0.17];
  const W = 420, H = 160, pad = { t: 20, r: 20, b: 30, l: 40 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  const xStep = gW / (acc.length - 1);

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${pad.l + i * xStep},${pad.t + gH - v * gH}`).join(" ");

  const yLabels = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {yLabels.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={pad.t + gH * (1 - t)} x2={pad.l + gW} y2={pad.t + gH * (1 - t)}
            stroke="currentColor" strokeWidth={0.5} className="text-gray-200 dark:text-navy-600"
            strokeDasharray={i === 0 ? "0" : "4 3"} />
          <text x={pad.l - 6} y={pad.t + gH * (1 - t) + 4} textAnchor="end" fontSize={8}
            className="fill-gray-400 dark:fill-gray-600">{(t * 100).toFixed(0)}</text>
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
      <path d={toPath(acc)} fill="none" stroke="#EC4899" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(loss)} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
      {acc.map((v, i) => (
        <circle key={i} cx={pad.l + i * xStep} cy={pad.t + gH - v * gH} r={2.5} fill="#EC4899" />
      ))}
      {[1, 3, 5, 7, 10].map(ep => (
        <text key={ep} x={pad.l + (ep - 1) * xStep} y={H - 8} textAnchor="middle" fontSize={8}
          className="fill-gray-400 dark:fill-gray-600">E{ep}</text>
      ))}
      <circle cx={pad.l} cy={12} r={4} fill="#EC4899" />
      <text x={pad.l + 8} y={15} fontSize={8} fill="#EC4899" fontWeight="600">Accuracy</text>
      <line x1={pad.l + 65} y1={12} x2={pad.l + 77} y2={12} stroke="#818cf8" strokeWidth={2} strokeDasharray="4 2" />
      <text x={pad.l + 81} y={15} fontSize={8} fill="#818cf8" fontWeight="600">Loss</text>
    </svg>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────
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

  const totalCount     = useCounter(stats.total_estudios);
  const validadosCount = useCounter(stats.total_validados);
  const pendientesCount = useCounter(stats.total_pendientes);

  useEffect(() => {
    obtenerStats()
      .then(setStats)
      .catch(() => setStatsError(true))
      .finally(() => setLoading(false));
  }, []);

  // ── Subcomponente tarjeta ─────────────────────────────────────────────
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
    <div className="bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
    </div>
  );

  const precisionReal = Math.round(stats.precision_real * 100);
  const precisionEntrenamiento = Math.round(stats.precision_entrenamiento * 100);
  const umbralPct = Math.round(stats.umbral_reentrenamiento * 100);
  const progresoReentrenamiento = stats.umbral_reentrenamiento > 0
    ? Math.min(100, Math.round((stats.total_validados / (stats.umbral_reentrenamiento)) * 100))
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                SOP AI System
              </span>
              <span className="bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400 text-xs font-semibold px-2 py-0.5 rounded-md">
                v1.0
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Panel de Control — Criterio Ecográfico
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detección de morfología poliquística ovárica mediante EfficientNetB0
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-600 dark:text-green-400">Modelo activo</span>
          </div>
        </div>
      </div>

      {/* ── ERROR de stats ── */}
      {statsError && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3">
          <MdWarningAmber className="text-amber-500 flex-shrink-0" size={18} />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            No se pudo cargar las estadísticas del servidor. Verifica que el backend esté activo.
          </p>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MdMemory size={18} />}
          label="Precisión real"
          value={loading ? "—" : `${precisionReal}%`}
          sub="Sobre casos validados"
          colorClass="text-pink-500 dark:text-pink-400"
          bgClass="bg-pink-50 dark:bg-pink-900/20"
        />
        <StatCard
          icon={<MdCheckCircle size={18} />}
          label="Total estudios"
          value={loading ? "—" : totalCount.toString()}
          sub="Ecografías analizadas"
          colorClass="text-violet-500 dark:text-violet-400"
          bgClass="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          icon={<MdVerifiedUser size={18} />}
          label="Validados"
          value={loading ? "—" : validadosCount.toString()}
          sub="Con etiqueta médica"
          colorClass="text-green-500 dark:text-green-400"
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<MdHourglassEmpty size={18} />}
          label="Pendientes"
          value={loading ? "—" : pendientesCount.toString()}
          sub="Sin validar"
          colorClass="text-amber-500 dark:text-amber-400"
          bgClass="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* ── GRID PRINCIPAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfica de entrenamiento — 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <MdTimeline className="text-pink-500" size={18} />
                Rendimiento del entrenamiento
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Accuracy & Loss · EfficientNetB0 · 15 épocas
              </p>
            </div>
            <span className="bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-400 text-xs font-bold px-3 py-1 rounded-full border border-pink-100 dark:border-pink-800">
              {precisionEntrenamiento}% entrenamiento
            </span>
          </div>
          <TrainingChart />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { val: `${precisionEntrenamiento}%`, lbl: "Accuracy entrenamiento", color: "text-pink-500" },
              { val: `${precisionReal}%`,          lbl: "Precisión real (validada)", color: "text-violet-500" },
              { val: "15",                          lbl: "Épocas totales", color: "text-green-500" },
            ].map(item => (
              <div key={item.lbl} className="bg-gray-50 dark:bg-navy-900/50 rounded-xl p-3 text-center border border-gray-100 dark:border-navy-700">
                <p className={`text-lg font-black ${item.color}`}>{item.val}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel reentrenamiento + acceso rápido */}
        <div className="flex flex-col gap-4">

          {/* Progreso de reentrenamiento */}
          <div className="bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 p-5 shadow-sm flex-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
              <MdAutorenew className={`${stats.listo_para_reentrenar ? "text-green-500 animate-spin" : "text-gray-400"}`} size={16} />
              Reentrenamiento
            </h2>

            {/* Badge listo / pendiente */}
            <div className={`rounded-xl px-3 py-2 mb-4 border text-xs font-bold ${
              stats.listo_para_reentrenar
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400"
                : "bg-gray-50 dark:bg-navy-900/50 border-gray-100 dark:border-navy-700 text-gray-400 dark:text-gray-500"
            }`}>
              {stats.listo_para_reentrenar ? "✅ Listo para reentrenar" : "⏳ Acumulando casos validados…"}
            </div>

            {/* Barra de progreso */}
            <div className="mb-1 flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>Progreso</span>
              <span>{stats.total_validados} / {stats.umbral_reentrenamiento} val.</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-navy-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stats.listo_para_reentrenar ? "bg-green-400" : "bg-pink-400"
                }`}
                style={{ width: `${progresoReentrenamiento}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
              Umbral: {umbralPct > 0 ? `${stats.umbral_reentrenamiento} casos validados` : "—"}
            </p>
          </div>

          {/* Botón acceso rápido */}
          <button
            onClick={() => navigate("/admin/analysis")}
            className="w-full flex items-center justify-between bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="text-left">
              <p className="font-bold text-sm">Nueva ecografía</p>
              <p className="text-xs opacity-80 mt-0.5">Ir al módulo de análisis</p>
            </div>
            <MdArrowForward size={22} className="opacity-80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── INFO CRITERIO + DISCLAIMER ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Criterio evaluado
          </h2>
          <div className="space-y-2">
            {[
              { num: "C1", label: "Oligo/anovulación", active: false },
              { num: "C2", label: "Hiperandrogenismo clínico/bioquímico", active: false },
              { num: "C3", label: "Morfología ovárica poliquística (ecografía)", active: true },
            ].map(c => (
              <div key={c.num} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${c.active
                ? "bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800"
                : "bg-gray-50 dark:bg-navy-900/40 border border-transparent opacity-50"
              }`}>
                <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                  c.active ? "bg-pink-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-white"
                }`}>{c.num}</span>
                <span className={`text-xs font-medium ${
                  c.active ? "text-pink-700 dark:text-pink-300" : "text-gray-500 dark:text-gray-500"
                }`}>{c.label}</span>
                {c.active && <span className="ml-auto text-xs text-pink-500 font-bold">Activo</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-5 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <MdWarningAmber className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">Aviso clínico importante</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                Este sistema es una herramienta de <strong>apoyo diagnóstico</strong>. Los resultados no reemplazan
                la evaluación de un profesional médico especializado en ginecología y endocrinología reproductiva.
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-500 dark:text-amber-600 mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/50">
            SOP AI System · EfficientNetB0 Deep Learning · v1.0
          </p>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;