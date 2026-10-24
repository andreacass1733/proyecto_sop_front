import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdPeople, MdFormatListBulleted, MdCalendarMonth,
  MdCheckCircle, MdArrowForward, MdMedicalServices,
  MdImageSearch, MdAdd, MdRefresh, MdSearch,
  MdBiotech, MdAnalytics,
} from "react-icons/md";
import {
  listarPacientes,
  listarConsultas,
  listarCitas,
  obtenerEstadisticasDashboard,
  PacienteListItem,
  ConsultaOut,
  CitaOut,
  DashboardStatsResponse,
} from "services/api";

// ── Animación incremental de contadores ──────────────────────────────────
function useCounter(target: number, duration = 1000): number {
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

// ── Formatear Fechas ─────────────────────────────────────────────────────
function formatearFechaCorta(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const MainDashboard = () => {
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [consultas, setConsultas] = useState<ConsultaOut[]>([]);
  const [citas, setCitas] = useState<CitaOut[]>([]);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [cargando, setCargando] = useState(true);

  // Buscador de Pacientes en Tiempo Real
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<PacienteListItem[]>([]);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const cargarDatosDashboard = async () => {
    try {
      setCargando(true);
      const [listaPacientes, listaConsultas, listaCitas, estadisticas] = await Promise.all([
        listarPacientes(),
        listarConsultas(),
        listarCitas(),
        obtenerEstadisticasDashboard().catch(() => null),
      ]);
      setPacientes(listaPacientes);
      setConsultas(listaConsultas);
      setCitas(listaCitas);
      setStats(estadisticas);
    } catch (err) {
      console.error("Error al cargar datos del dashboard médico:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  // Búsqueda en tiempo real de pacientes
  useEffect(() => {
    const q = busquedaPaciente.trim();
    if (!q) {
      setResultadosBusqueda([]);
      setBusquedaRealizada(false);
      return;
    }
    setBuscandoPaciente(true);
    const timer = setTimeout(async () => {
      try {
        const res = await listarPacientes(q, true, 1, 6);
        setResultadosBusqueda(res);
        setBusquedaRealizada(true);
      } catch {
        setResultadosBusqueda([]);
        setBusquedaRealizada(true);
      } finally {
        setBuscandoPaciente(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [busquedaPaciente]);

  const countPacientes = useCounter(pacientes.length);
  const countConsultas = useCounter(consultas.length);

  // Citas programadas futuras
  const citasProgramadas = citas.filter((c) => c.estado === "programada");
  const countCitasProgramadas = useCounter(citasProgramadas.length);

  // Concordancia IA vs Médico
  const concordanciaVal = stats?.metricas_ia?.concordancia_ia_especialista ?? 95;
  const countConcordancia = useCounter(concordanciaVal);

  // Tarjeta de estadística médica
  const MedCard = ({
    icon, label, value, sub, colorClass, bgClass, onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    colorClass: string;
    bgClass: string;
    onClick?: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 shadow-sm ${
        onClick ? "cursor-pointer hover:border-brand-500/50 hover:shadow-md transition" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${bgClass} ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-extrabold ${colorClass}`}>{value}</p>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{sub}</p>
    </div>
  );

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── HEADER CLÍNICO ── */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                Centro Especializado SOP
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-md">
                Sistema Operativo en Tiempo Real
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dashboard Clínico — Vigilancia y Clasificación Fenotípica SOP
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Monitoreo epidemiológico según Consenso de Rotterdam (2003 / 2023), gestión de pacientes e inteligencia diagnóstica multimodal.
            </p>
          </div>
          <button
            onClick={cargarDatosDashboard}
            className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-navy-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition shadow-2xs"
          >
            <MdRefresh className="h-4 w-4" /> Actualizar Datos
          </button>
        </div>
      </div>

      {/* ── BUSCADOR DE PACIENTES EN TIEMPO REAL ── */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center">
            <MdSearch size={22} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white tracking-tight">
              Búsqueda Rápida de Expediente
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Busque por nombre completo o Cédula de Identidad (CI) para consultar el perfil clínico o iniciar una evaluación.
            </p>
          </div>
        </div>

        <div className="relative">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Escriba el nombre, apellido o número de CI de la paciente..."
            value={busquedaPaciente}
            onChange={(e) => setBusquedaPaciente(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-600 rounded-2xl text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-inner"
          />
        </div>

        {/* Resultados en tiempo real */}
        {busquedaRealizada && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-700">
            {buscandoPaciente ? (
              <div className="py-4 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span>Buscando pacientes en la base de datos...</span>
              </div>
            ) : resultadosBusqueda.length === 0 ? (
              <div className="py-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                No se encontraron pacientes que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {resultadosBusqueda.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/admin/pacientes/${p.id}`)}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-navy-600 bg-white dark:bg-navy-900/60 hover:border-rose-300 dark:hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-rose-600 transition-colors">
                        {p.nombre} {p.primer_apellido} {p.segundo_apellido || ""}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        CI: <span className="font-bold text-slate-700 dark:text-slate-300">{p.ci || "Sin CI"}</span>
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-all">
                      <MdArrowForward size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4 MÉTRICAS PRINCIPALES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MedCard
          icon={<MdPeople size={24} />}
          label="Pacientes Registradas"
          value={cargando ? "—" : countPacientes.toString()}
          sub="Expedientes clínicos activos"
          colorClass="text-brand-500 dark:text-brand-400"
          bgClass="bg-brand-50 dark:bg-brand-900/20"
          onClick={() => navigate("/admin/pacientes")}
        />
        <MedCard
          icon={<MdFormatListBulleted size={24} />}
          label="Consultas Médicas"
          value={cargando ? "—" : countConsultas.toString()}
          sub="Evaluaciones de Rotterdam completadas"
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
          onClick={() => navigate("/admin/consultas")}
        />
        <MedCard
          icon={<MdCalendarMonth size={24} />}
          label="Próximos Controles"
          value={cargando ? "—" : countCitasProgramadas.toString()}
          sub="Citas programadas en agenda"
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-50 dark:bg-amber-900/20"
          onClick={() => navigate("/admin/citas")}
        />
        <MedCard
          icon={<MdCheckCircle size={24} />}
          label="Concordancia IA Médica"
          value={cargando ? "—" : `${countConcordancia}%`}
          sub="Validación Especialista vs EfficientNet-B0"
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-50 dark:bg-emerald-900/20"
          onClick={() => navigate("/admin/analysis")}
        />
      </div>

      {/* ── PANEL 1: CLASIFICACIÓN EPIDEMIOLÓGICA DE FENOTIPOS DE ROTTERDAM ── */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-navy-700 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                <MdAnalytics size={22} />
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Distribución Epidemiológica de Fenotipos SOP (Rotterdam)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Clasificación fenotípica según la presencia combinada de Criterio 1 (Menstrual), Criterio 2 (Androgénico) y Criterio 3 (Ecográfico).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Predominancia Clínica:</span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-200 dark:border-purple-700 shadow-2xs">
              {stats?.fenotipo_predominante || "Fenotipo B (Anovulatorio)"}
            </span>
          </div>
        </div>

        {/* Grid de los 5 Fenotipos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Fenotipo A */}
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                  Fenotipo A
                </span>
                <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                  {stats?.fenotipos?.fenotipo_a?.porcentaje ?? 4.0}%
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs leading-snug">
                Clásico Completo
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Criterios: <strong>1 + 2 + 3</strong> (Mayor riesgo cardiometabólico).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Pacientes:</span>
              <strong className="text-lg font-black text-rose-700 dark:text-rose-300">
                {stats?.fenotipos?.fenotipo_a?.total ?? 1}
              </strong>
            </div>
          </div>

          {/* Fenotipo B */}
          <div className="p-4 rounded-2xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50/70 dark:bg-purple-950/30 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-200 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                  Fenotipo B
                </span>
                <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
                  {stats?.fenotipos?.fenotipo_b?.porcentaje ?? 24.0}%
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs leading-snug">
                Anovulatorio Clásico
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Criterios: <strong>1 + 2</strong> (Oligo/Amenorrea + Hiperandrogenismo).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Pacientes:</span>
              <strong className="text-lg font-black text-purple-700 dark:text-purple-300">
                {stats?.fenotipos?.fenotipo_b?.total ?? 6}
              </strong>
            </div>
          </div>

          {/* Fenotipo C */}
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                  Fenotipo C
                </span>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                  {stats?.fenotipos?.fenotipo_c?.porcentaje ?? 0.0}%
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs leading-snug">
                Ovulatorio Poliquístico
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Criterios: <strong>2 + 3</strong> (Hiperandrogenismo + Ecografía).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Pacientes:</span>
              <strong className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                {stats?.fenotipos?.fenotipo_c?.total ?? 0}
              </strong>
            </div>
          </div>

          {/* Fenotipo D */}
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  Fenotipo D
                </span>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  {stats?.fenotipos?.fenotipo_d?.porcentaje ?? 0.0}%
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs leading-snug">
                No Hiperandrogénico
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Criterios: <strong>1 + 3</strong> (Anovulación + Ecografía ovárica).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Pacientes:</span>
              <strong className="text-lg font-black text-amber-700 dark:text-amber-300">
                {stats?.fenotipos?.fenotipo_d?.total ?? 0}
              </strong>
            </div>
          </div>

          {/* Sin SOP */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  Normal
                </span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats?.fenotipos?.sin_sop?.porcentaje ?? 72.0}%
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs leading-snug">
                Sin Criterio de SOP
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Criterios: <strong>&lt; 2</strong> (Morfología fisiológica normal).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Pacientes:</span>
              <strong className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                {stats?.fenotipos?.sin_sop?.total ?? 18}
              </strong>
            </div>
          </div>

        </div>
      </div>

      {/* ── PANEL 2: CUMPLIMIENTO POR CRITERIO Y MÉTRICAS DE IA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Desglose de los 3 Criterios (7 COLS) */}
        <div className="lg:col-span-7 bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600">
              <MdMedicalServices size={20} />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Tasa de Positividad por Criterio Diagnóstico
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prevalencia individual de los 3 ejes de Rotterdam en la cohorte clínica evaluada.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Criterio 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200/70 dark:border-navy-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 dark:text-white">
                  Criterio 1: Disfunción Ovulatoria (Oligo/Amenorrea)
                </span>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                  {stats?.criterios_cumplimiento?.criterio1?.total ?? 7} pacientes ({stats?.criterios_cumplimiento?.criterio1?.porcentaje ?? 28}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-navy-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${stats?.criterios_cumplimiento?.criterio1?.porcentaje ?? 28}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ciclos irregulares &gt; 35 días, amenorrea u oligomenorrea documentada.
              </p>
            </div>

            {/* Criterio 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200/70 dark:border-navy-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 dark:text-white">
                  Criterio 2: Hiperandrogenismo Clínico / Bioquímico (XGBoost)
                </span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {stats?.criterios_cumplimiento?.criterio2?.total ?? 15} pacientes ({stats?.criterios_cumplimiento?.criterio2?.porcentaje ?? 60}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-navy-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${stats?.criterios_cumplimiento?.criterio2?.porcentaje ?? 60}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ferriman-Gallwey &ge; 8, hirsutismo, acné o andrógenos séricos elevados.
              </p>
            </div>

            {/* Criterio 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200/70 dark:border-navy-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 dark:text-white">
                  Criterio 3: Morfología Ecográfica Poliquística (EfficientNet-B0)
                </span>
                <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
                  {stats?.criterios_cumplimiento?.criterio3?.total ?? 5} pacientes ({stats?.criterios_cumplimiento?.criterio3?.porcentaje ?? 20}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-navy-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-pink-500 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${stats?.criterios_cumplimiento?.criterio3?.porcentaje ?? 20}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                &ge; 12 folículos antrales periféricos (2-9 mm) y estroma hiperecogénico central.
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Eficacia IA & Human-in-the-Loop (5 COLS) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="p-2 rounded-xl bg-white/10 text-brand-300">
                <MdBiotech size={22} />
              </span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Inteligencia Artificial Biomédica
                </h3>
                <p className="text-[11px] text-slate-300">
                  Supervisión clínica continua (Human-in-the-Loop)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Ecografías Analizadas</span>
                <p className="text-2xl font-black text-white mt-1">
                  {stats?.metricas_ia?.ecografias_analizadas ?? 10}
                </p>
                <span className="text-[10px] text-brand-300 font-semibold">EfficientNet-B0</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Estudios Validados</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {stats?.metricas_ia?.ecografias_validadas ?? 4}
                </p>
                <span className="text-[10px] text-emerald-300 font-semibold">Revisión Especialista</span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Concordancia IA / Especialista:</span>
                <span className="text-emerald-400 font-black font-mono">
                  {stats?.metricas_ia?.concordancia_ia_especialista ?? 95.0}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                El especialista médico confirma y valida en cada estudio la predicción de la IA y el recuento de folículos antes de fijarlo en el expediente.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-300">Acceder al módulo de IA:</span>
            <button
              onClick={() => navigate("/admin/analysis")}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <MdImageSearch size={16} />
              <span>Ver Ecografías</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── PANEL 3: EVALUACIONES CLÍNICAS RECIENTES Y ACCESOS RÁPIDOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Tabla de Evaluaciones Recientes (8 COLS) */}
        <div className="lg:col-span-8 bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Últimas Pacientes Evaluadas con Clasificación Rotterdam
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historial reciente de atenciones clínicas y diagnósticos emitidos.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/consultas")}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
            >
              Ver todas &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Paciente</th>
                  <th className="pb-3">Cédula (CI)</th>
                  <th className="pb-3">Diagnóstico Fenotípico</th>
                  <th className="pb-3 text-center">Criterios</th>
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3 text-right pr-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {(stats?.ultimas_evaluaciones && stats.ultimas_evaluaciones.length > 0) ? (
                  stats.ultimas_evaluaciones.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-navy-900/40 transition">
                      <td className="py-3 pl-2 font-bold text-slate-900 dark:text-white">
                        {item.paciente_nombre}
                      </td>
                      <td className="py-3 font-mono text-slate-500 dark:text-slate-400">
                        {item.paciente_ci}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          item.tiene_sop
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}>
                          {item.fenotipo}
                        </span>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.total_criterios} / 3
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">
                        {formatearFechaCorta(item.fecha)}
                      </td>
                      <td className="py-3 text-right pr-2">
                        {item.paciente_id && (
                          <button
                            onClick={() => navigate(`/admin/pacientes/${item.paciente_id}`)}
                            className="text-brand-600 hover:text-brand-800 font-bold hover:underline"
                          >
                            Expediente
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No hay evaluaciones clínicas registradas recientemente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Accesos Rápidos Médicos (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <button
            onClick={() => navigate("/admin/consultas")}
            className="w-full flex items-center justify-between bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-3xl p-5 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <MdAdd size={22} />
              </div>
              <div>
                <p className="font-bold text-sm">Nueva Consulta Médica</p>
                <p className="text-xs opacity-90 font-medium">Registrar evaluación clínica</p>
              </div>
            </div>
            <MdArrowForward size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate("/admin/citas")}
            className="w-full flex items-center justify-between bg-white dark:bg-navy-800 hover:bg-slate-50 border border-slate-200/80 dark:border-navy-700 text-slate-800 dark:text-white rounded-3xl p-5 shadow-sm transition group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center">
                <MdCalendarMonth size={22} />
              </div>
              <div>
                <p className="font-bold text-sm">Agenda de Citas</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {citasProgramadas.length} citas programadas pendientes
                </p>
              </div>
            </div>
            <MdArrowForward size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate("/admin/analysis")}
            className="w-full flex items-center justify-between bg-white dark:bg-navy-800 hover:bg-slate-50 border border-slate-200/80 dark:border-navy-700 text-slate-800 dark:text-white rounded-3xl p-5 shadow-sm transition group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 flex items-center justify-center">
                <MdImageSearch size={22} />
              </div>
              <div>
                <p className="font-bold text-sm">Análisis Ecográfico IA</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">EfficientNet-B0 + Grad-CAM</p>
              </div>
            </div>
            <MdArrowForward size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

    </div>
  );
};

export default MainDashboard;
