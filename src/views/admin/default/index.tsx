import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdPeople, MdFormatListBulleted, MdCalendarMonth,
  MdCheckCircle, MdArrowForward, MdMedicalServices,
  MdImageSearch, MdAdd, MdRefresh, MdSearch,
} from "react-icons/md";
import {
  listarPacientes,
  listarConsultas,
  listarCitas,
  PacienteListItem,
  ConsultaOut,
  CitaOut,
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

const MainDashboard = () => {
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [consultas, setConsultas] = useState<ConsultaOut[]>([]);
  const [citas, setCitas] = useState<CitaOut[]>([]);
  const [cargando, setCargando] = useState(true);

  // Buscador de Pacientes en Tiempo Real (HU-005)
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<PacienteListItem[]>([]);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const cargarDatosDashboard = async () => {
    try {
      setCargando(true);
      const [listaPacientes, listaConsultas, listaCitas] = await Promise.all([
        listarPacientes(),
        listarConsultas(),
        listarCitas(),
      ]);
      setPacientes(listaPacientes);
      setConsultas(listaConsultas);
      setCitas(listaCitas);
    } catch (err) {
      console.error("Error al cargar datos del dashboard médico:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  // Búsqueda en tiempo real de pacientes (HU-005)
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
  const countCitas = useCounter(citas.length);

  // Citas del día / próximas
  const citasProgramadas = citas.filter((c) => c.estado === "programada");
  const countCitasProgramadas = useCounter(citasProgramadas.length);

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
                Centro Médico SOP
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-md">
                Atención Activa
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Panel Médico — Gestión de Pacientes y Diagnóstico SOP
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Resumen clínico de pacientes atendidas, consultas médicas y agenda de seguimiento de SOP.
            </p>
          </div>
          <button
            onClick={cargarDatosDashboard}
            className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-navy-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
          >
            <MdRefresh className="h-4 w-4" /> Actualizar Datos
          </button>
        </div>
      </div>

      {/* ── BUSCADOR DE PACIENTES EN TIEMPO REAL (HU-005) ── */}
      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center">
            <MdSearch size={22} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white tracking-tight">
              Búsqueda de Pacientes 
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Busque por nombre completo o número de Cédula de Identidad (CI) para acceder directamente al perfil.
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

        {/* Resultados en tiempo real (Criterio HU-005) */}
        {busquedaRealizada && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-700">
            {buscandoPaciente ? (
              <div className="py-4 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span>Buscando pacientes en la base de datos...</span>
              </div>
            ) : resultadosBusqueda.length === 0 ? (
              <div className="py-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                No se encontraron pacientes
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

      {/* ── MÉTRICAS CLÍNICAS PRINCIPALES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MedCard
          icon={<MdPeople size={24} />}
          label="Pacientes Registradas"
          value={cargando ? "—" : countPacientes.toString()}
          sub="Expedientes bajo control médico"
          colorClass="text-brand-500 dark:text-brand-400"
          bgClass="bg-brand-50 dark:bg-brand-900/20"
          onClick={() => navigate("/admin/pacientes")}
        />
        <MedCard
          icon={<MdFormatListBulleted size={24} />}
          label="Consultas Médicas"
          value={cargando ? "—" : countConsultas.toString()}
          sub="Evaluaciones clínicas registradas"
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
          onClick={() => navigate("/admin/consultas")}
        />
        <MedCard
          icon={<MdCalendarMonth size={24} />}
          label="Próximas Citas"
          value={cargando ? "—" : countCitasProgramadas.toString()}
          sub="Controles agendados pendientes"
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-50 dark:bg-amber-900/20"
          onClick={() => navigate("/admin/citas")}
        />
        <MedCard
          icon={<MdCheckCircle size={24} />}
          label="Total de Citas"
          value={cargando ? "—" : countCitas.toString()}
          sub="Historial completo de agenda"
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-50 dark:bg-emerald-900/20"
          onClick={() => navigate("/admin/citas")}
        />
      </div>

      {/* ── SECCIÓN DE ACCESOS RÁPIDOS Y CRITERIOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Criterios de Rotterdam (8 COLS) */}
        <div className="lg:col-span-8 bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <MdMedicalServices className="text-brand-500" size={22} />
            Evaluación Multidisciplinaria — Criterios de Rotterdam
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
            El diagnóstico clínico de Síndrome de Ovario Poliquístico requiere la presencia de al menos 2 de los 3 criterios evaluados en la consulta médica:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-navy-900/50 rounded-2xl p-5 border border-slate-200/60 dark:border-navy-700">
              <span className="bg-brand-100 text-brand-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">Criterio 1</span>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-3">Trastornos Menstruales</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Oligo/Anovulación, ciclos irregulares u amenorrea reportada en la historia clínica.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-navy-900/50 rounded-2xl p-5 border border-slate-200/60 dark:border-navy-700">
              <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">Criterio 2</span>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-3">Hiperandrogenismo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Signos clínicos (hirsutismo, acné) o bioquímicos (andrógenos e insulina en laboratorio).
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-navy-900/50 rounded-2xl p-5 border border-slate-200/60 dark:border-navy-700">
              <span className="bg-pink-100 text-pink-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">Criterio 3</span>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-3">Morfología Ecográfica</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Evaluación ecográfica ovárica y conteo de folículos antrales (≥ 12 por ovario).
              </p>
            </div>
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
                <p className="text-xs opacity-90 font-medium">Registrar atención clínica</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ver controles futuros</p>
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
                <p className="font-bold text-sm">Análisis Ecográfico</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Evaluar ecografía ovárica</p>
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