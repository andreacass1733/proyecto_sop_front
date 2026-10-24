import React, { useState, useEffect, useCallback } from "react";
import {
  MdCheckCircle,
  MdWarning,
  MdInfo,
  MdArrowForward,
  MdMedication,
  MdScience,
  MdDone,
  MdClose,
  MdVerified,
  MdEditNote,
  MdRefresh,
  MdHistoryEdu,
} from "react-icons/md";
import {
  PacienteListItem,
  obtenerClasificacionPaciente,
  confirmarClasificacionRotterdam,
  ConfirmacionRotterdamOut,
} from "services/api";

interface RotterdamTabProps {
  paciente: PacienteListItem | null;
  onNavigateToTab: (tab: string) => void;
}

export const FENOTIPOS_ROTTERDAM = {
  A: {
    nombre: "Fenotipo A (O + H + PCOM)",
    titulo: "Forma Clásica Completa",
    color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    badgeBg: "bg-purple-600",
    criterios: ["Oligo/Anovulación", "Hiperandrogenismo Clínico/Bioquímico", "Morfología Ovárica Poliquística (PCOM)"],
    descripcion: "Presenta los tres criterios diagnósticos de Rotterdam. Es el subtipo más severo, con mayor prevalencia de resistencia a la insulina, hiperinsulinemia compensatoria, dislipidemia y riesgo cardiovascular.",
    severidad: "Alta",
    criteriosCumplidos: [true, true, true],
  },
  B: {
    nombre: "Fenotipo B (O + H)",
    titulo: "Clásico No Ecográfico",
    color: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800",
    badgeBg: "bg-pink-600",
    criterios: ["Oligo/Anovulación", "Hiperandrogenismo Clínico/Bioquímico"],
    descripcion: "Presenta disfunción ovulatoria e hiperandrogenismo, pero con ecografía ovárica normal (volumen <10 mL y <20 folículos). Requiere vigilancia metabólica estrecha similar al Fenotipo A.",
    severidad: "Moderada a Alta",
    criteriosCumplidos: [true, true, false],
  },
  C: {
    nombre: "Fenotipo C (H + PCOM)",
    titulo: "Ovulatorio",
    color: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    badgeBg: "bg-sky-600",
    criterios: ["Hiperandrogenismo Clínico/Bioquímico", "Morfología Ovárica Poliquística (PCOM)"],
    descripcion: "Presenta hiperandrogenismo y morfología ecográfica alterada, manteniendo ciclos menstruales ovulatorios regulares. Menor tasa de riesgo metabólico severo, pero con manifestaciones androgénicas cutáneas evidentes.",
    severidad: "Moderada",
    criteriosCumplidos: [false, true, true],
  },
  D: {
    nombre: "Fenotipo D (O + PCOM)",
    titulo: "Normoandrogénico",
    color: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
    badgeBg: "bg-teal-600",
    criterios: ["Oligo/Anovulación", "Morfología Ovárica Poliquística (PCOM)"],
    descripcion: "Presenta disfunción ovulatoria y alteración ecográfica sin estigmas clínicos ni bioquímicos de hiperandrogenismo. Es el fenotipo de mejor perfil metabólico; se debe vigilar la protección endometrial por anovulación.",
    severidad: "Leve a Moderada",
    criteriosCumplidos: [true, false, true],
  },
};

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function RotterdamTab({ paciente, onNavigateToTab }: RotterdamTabProps) {
  // Estados de los 3 criterios de Rotterdam para el paciente
  const [criterio1, setCriterio1] = useState<boolean>(true); // Oligo/Anovulación
  const [criterio2, setCriterio2] = useState<boolean>(true); // Hiperandrogenismo
  const [criterio3, setCriterio3] = useState<boolean>(true); // Morfología Ovárica (PCOM)

  const [loading, setLoading] = useState<boolean>(false);
  const [confirmando, setConfirmando] = useState<boolean>(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  // Estados de confirmación y rectificación médica (HU-014 / HU-015)
  const [modalRectificarAbierto, setModalRectificarAbierto] = useState<boolean>(false);
  const [fenotipoRectificado, setFenotipoRectificado] = useState<string>("Fenotipo A");
  const [justificacionMedica, setJustificacionMedica] = useState<string>("");
  const [conductaTerapeutica, setConductaTerapeutica] = useState<string>("");
  const [diagnosticoOficial, setDiagnosticoOficial] = useState<ConfirmacionRotterdamOut | null>(null);

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar evaluación real consolidada del paciente desde backend
  const cargarEvaluacionPaciente = useCallback(async () => {
    if (!paciente?.id) return;
    setLoading(true);
    try {
      const res = await obtenerClasificacionPaciente(paciente.id);
      const desglose = res.desglose_criterios || {};
      setCriterio1(Boolean(desglose.criterio_1_disfuncion_ovulatoria?.cumple));
      setCriterio2(Boolean(desglose.criterio_2_hiperandrogenismo?.cumple));
      setCriterio3(Boolean(desglose.criterio_3_ecografico?.cumple));
      if (res.recomendacion_terapeutica) {
        setConductaTerapeutica(res.recomendacion_terapeutica);
      }
    } catch (err) {
      console.warn("No se pudo cargar clasificación consolidada automática:", err);
    } finally {
      setLoading(false);
    }
  }, [paciente?.id]);

  useEffect(() => {
    cargarEvaluacionPaciente();
  }, [cargarEvaluacionPaciente]);

  // Determinar fenotipo actual según la combinación activa
  const obtenerFenotipo = () => {
    if (criterio1 && criterio2 && criterio3) return "A";
    if (criterio1 && criterio2 && !criterio3) return "B";
    if (!criterio1 && criterio2 && criterio3) return "C";
    if (criterio1 && !criterio2 && criterio3) return "D";
    return null; // Menos de 2 criterios
  };

  const fenotipoKey = obtenerFenotipo();
  const fenotipoActual = fenotipoKey ? FENOTIPOS_ROTTERDAM[fenotipoKey] : null;
  const fenotipoSugeridoNombre = fenotipoActual ? `Fenotipo ${fenotipoKey}` : "Sin SOP";
  const numCriteriosCumplidos = [criterio1, criterio2, criterio3].filter(Boolean).length;
  const diagnosticoPositivo = numCriteriosCumplidos >= 2;

  // Confirmar diagnóstico sugerido con 1 clic (HU-014)
  const handleConfirmarSugerido = async () => {
    if (!paciente?.id) return;
    setConfirmando(true);
    try {
      const res = await confirmarClasificacionRotterdam({
        paciente_id: paciente.id,
        fenotipo_sugerido: fenotipoSugeridoNombre,
        fenotipo_confirmado: fenotipoSugeridoNombre,
        criterio1_cumple: criterio1,
        criterio2_cumple: criterio2,
        criterio3_cumple: criterio3,
        es_modificado: false,
        justificacion_medica: "Diagnóstico ratificado por el médico tratante según consenso de Rotterdam.",
        conducta_terapeutica: conductaTerapeutica || "Seguimiento protocolizado y ajuste de estilo de vida.",
        medico_nombre: "Dr. Rodrigo Espinoza",
      });
      setDiagnosticoOficial(res);
      showToast(`¡Diagnóstico ${fenotipoSugeridoNombre} validado y rubricado oficialmente!`, "ok");
    } catch (err: any) {
      showToast(err.message || "Error al confirmar diagnóstico", "error");
    } finally {
      setConfirmando(false);
    }
  };

  // Rectificar diagnóstico con justificación médica obligatoria (HU-015)
  const handleGuardarRectificado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente?.id) return;
    if (!justificacionMedica.trim()) {
      alert("Debe ingresar la justificación clínica obligatoria para rectificar el fenotipo.");
      return;
    }

    setConfirmando(true);
    try {
      const res = await confirmarClasificacionRotterdam({
        paciente_id: paciente.id,
        fenotipo_sugerido: fenotipoSugeridoNombre,
        fenotipo_confirmado: fenotipoRectificado,
        criterio1_cumple: criterio1,
        criterio2_cumple: criterio2,
        criterio3_cumple: criterio3,
        es_modificado: true,
        justificacion_medica: justificacionMedica.trim(),
        conducta_terapeutica: conductaTerapeutica.trim() || "Tratamiento individualizado según criterio del especialista.",
        medico_nombre: "Dr. Rodrigo Espinoza",
      });
      setDiagnosticoOficial(res);
      setModalRectificarAbierto(false);
      showToast(`Dictamen rectificado oficialmente como: ${fenotipoRectificado}`, "ok");
    } catch (err: any) {
      showToast(err.message || "Error al rectificar diagnóstico", "error");
    } finally {
      setConfirmando(false);
    }
  };

  const nombrePaciente = paciente
    ? `${paciente.nombre} ${paciente.primer_apellido} ${paciente.segundo_apellido || ""}`
    : "Paciente en Consulta";
  const iniciales = paciente
    ? `${paciente.nombre.charAt(0)}${paciente.primer_apellido.charAt(0)}`
    : "RT";
  const edad = paciente?.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : null;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
            toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.tipo === "ok" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
          {toast.msg}
        </div>
      )}

      {/* ── ENCABEZADO MÉDICO UNIFICADO (EVALUACIÓN ROTTERDAM) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Consenso de Rotterdam (Guía 2023)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Expediente: <strong className="text-slate-800">CI {paciente?.ci || "—"}</strong>
              </span>
              {edad && (
                <span className="text-xs text-slate-500 font-medium">
                  • Edad: <strong className="text-slate-800">{edad}</strong>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {nombrePaciente}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={cargarEvaluacionPaciente}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm disabled:opacity-50"
            title="Recargar datos clínicos consolidados"
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            <span>Sincronizar Criterios</span>
          </button>

          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm ${
              diagnosticoPositivo
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {diagnosticoPositivo ? <MdWarning size={16} className="text-rose-600" /> : <MdCheckCircle size={16} className="text-emerald-600" />}
            <span>{diagnosticoPositivo ? "DIAGNÓSTICO POSITIVO SOP" : "NO CUMPLE CRITERIOS DE SOP"}</span>
            <span className="text-[11px] font-bold text-slate-500 ml-1">({numCriteriosCumplidos}/3)</span>
          </span>

          <button
            type="button"
            onClick={() => onNavigateToTab("tratamiento")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm"
          >
            <span>Plan Terapéutico</span>
            <MdArrowForward size={14} />
          </button>
        </div>
      </div>

      {/* ── PANEL DE CONFIRMACIÓN / OVERRIDE MÉDICO OFICIAL (HU-014 Y HU-015) ── */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-200 border border-purple-300/30">
                HU-014 / HU-015: Rubricación Médica Oficial
              </span>
              {diagnosticoOficial && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                  <MdVerified size={13} />
                  Rubricado en Auditoría
                </span>
              )}
            </div>
            <h3 className="text-lg font-black tracking-wide">
              Validación y Dictamen Definitivo del Especialista
            </h3>
            <p className="text-xs text-purple-200/80 max-w-2xl leading-relaxed">
              Consolide el diagnóstico de Síndrome de Ovario Poliquístico integrando los criterios 1, 2 y 3. Como médico tratante, usted puede ratificar el fenotipo sugerido por la IA o rectificarlo bajo su propio criterio clínico.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleConfirmarSugerido}
              disabled={confirmando || !paciente?.id}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              <MdVerified size={18} />
              <span>{confirmando ? "Registrando..." : `Confirmar Dictamen: ${fenotipoSugeridoNombre}`}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFenotipoRectificado(fenotipoSugeridoNombre);
                setModalRectificarAbierto(true);
              }}
              disabled={confirmando || !paciente?.id}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-purple-200 border border-white/20 transition-all shadow-md disabled:opacity-50"
            >
              <MdEditNote size={18} />
              <span>Rectificar Criterio Médico</span>
            </button>
          </div>
        </div>

        {diagnosticoOficial && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <MdCheckCircle className="text-emerald-400 flex-shrink-0" size={24} />
              <div>
                <p className="font-extrabold text-emerald-200">
                  {diagnosticoOficial.mensaje}
                </p>
                <p className="text-emerald-300/80 text-[11px] mt-0.5">
                  Fecha de firma: {new Date(diagnosticoOficial.fecha).toLocaleString()} • Trazabilidad Forense SHA-256 Activa
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab("historial")}
              className="text-emerald-300 hover:text-white underline font-bold shrink-0"
            >
              Ver en Historial →
            </button>
          </div>
        )}
      </div>

      {/* ── MATRIZ DE LOS 3 CRITERIOS DE ROTTERDAM ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CRITERIO 1 */}
        <div
          className={`p-5 rounded-3xl border-2 transition-all space-y-3 bg-white ${
            criterio1
              ? "border-rose-300 shadow-md shadow-rose-100"
              : "border-slate-200 opacity-80"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
                1
              </span>
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Disfunción Ovulatoria
              </h3>
            </div>
            <button
              onClick={() => setCriterio1(!criterio1)}
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                criterio1 ? "bg-rose-600 text-white shadow-sm" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title="Cambiar estado del criterio para evaluación"
            >
              {criterio1 ? <MdDone size={16} /> : <MdClose size={16} />}
            </button>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">Oligo / Anovulación (O)</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ciclos menstruales &gt; 35 días, amenorrea &gt; 90 días o progesterona sérica &lt; 3.0 ng/mL en fase lútea media.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                criterio1 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {criterio1 ? "Criterio Presente" : "No Presente"}
            </span>
            <button
              onClick={() => onNavigateToTab("xgboost")}
              className="text-[11px] font-extrabold text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Evaluar en Criterios 1-2 →
            </button>
          </div>
        </div>

        {/* CRITERIO 2 */}
        <div
          className={`p-5 rounded-3xl border-2 transition-all space-y-3 bg-white ${
            criterio2
              ? "border-rose-300 shadow-md shadow-rose-100"
              : "border-slate-200 opacity-80"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
                2
              </span>
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Hiperandrogenismo
              </h3>
            </div>
            <button
              onClick={() => setCriterio2(!criterio2)}
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                criterio2 ? "bg-rose-600 text-white shadow-sm" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title="Cambiar estado del criterio para evaluación"
            >
              {criterio2 ? <MdDone size={16} /> : <MdClose size={16} />}
            </button>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">Clínico y/o Bioquímico (H)</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ferriman-Gallwey ≥ 8, acné persistente, alopecia androgénica o testosterona &gt; 50 ng/dL, DHEA-S &gt; 350 µg/dL.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                criterio2 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {criterio2 ? "Criterio Presente" : "No Presente"}
            </span>
            <button
              onClick={() => onNavigateToTab("xgboost")}
              className="text-[11px] font-extrabold text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Evaluar en Criterios 1-2 →
            </button>
          </div>
        </div>

        {/* CRITERIO 3 */}
        <div
          className={`p-5 rounded-3xl border-2 transition-all space-y-3 bg-white ${
            criterio3
              ? "border-rose-300 shadow-md shadow-rose-100"
              : "border-slate-200 opacity-80"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
                3
              </span>
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Morfología Ovárica
              </h3>
            </div>
            <button
              onClick={() => setCriterio3(!criterio3)}
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                criterio3 ? "bg-rose-600 text-white shadow-sm" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title="Cambiar estado del criterio para evaluación"
            >
              {criterio3 ? <MdDone size={16} /> : <MdClose size={16} />}
            </button>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">Ecografía Ovárica (PCOM)</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ≥ 20 folículos por ovario de 2 a 9 mm o volumen ovárico ≥ 10 mL (o AMH sérica &gt; 4.0 ng/mL en adultas).
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                criterio3 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {criterio3 ? "Criterio Presente" : "No Presente"}
            </span>
            <button
              onClick={() => onNavigateToTab("ecografia")}
              className="text-[11px] font-extrabold text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Ver Análisis Ecográfico →
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD DETALLADA DEL FENOTIPO ASIGNADO ── */}
      {fenotipoActual ? (
        <div className={`p-6 sm:p-7 rounded-3xl border-2 shadow-sm ${fenotipoActual.color} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-3.5 h-3.5 rounded-full ${fenotipoActual.badgeBg} animate-pulse`} />
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Clasificación Fenotípica Rotterdam
                </span>
                <h3 className="text-lg font-black text-slate-900">{fenotipoActual.nombre}</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Severidad clínica:</span>
              <span className="text-xs font-black px-3 py-1 rounded-xl bg-white/80 border border-slate-300 shadow-sm text-slate-900">
                {fenotipoActual.severidad}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{fenotipoActual.descripcion}</p>

          <div className="pt-3 border-t border-slate-300/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span>Criterios confirmados:</span>
              {fenotipoActual.criterios.map((c, i) => (
                <span key={i} className="px-2.5 py-0.5 rounded-lg bg-white/90 text-slate-800 text-[11px] font-extrabold border border-slate-200">
                  {c}
                </span>
              ))}
            </div>

            <button
              onClick={() => onNavigateToTab("tratamiento")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm"
            >
              <MdMedication size={16} />
              <span>Ver Plan Terapéutico y Tratamiento →</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 text-slate-600 space-y-2">
          <MdInfo className="mx-auto text-slate-400" size={36} />
          <h4 className="text-sm font-extrabold text-slate-800">Menos de 2 Criterios Presentes</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Según el Consenso de Rotterdam, se requiere la presencia simultánea de al menos 2 de los 3 criterios para catalogar el cuadro como Síndrome de Ovario Poliquístico.
          </p>
        </div>
      )}

      {/* ── CUADRO DE LOS 4 FENOTIPOS DE REFERENCIA ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <MdScience className="text-purple-600" size={18} />
          Matriz de Clasificación Fenotípica Internacional (Consenso Rotterdam / ESHRE 2023)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {Object.entries(FENOTIPOS_ROTTERDAM).map(([key, f]) => {
            const esActivo = fenotipoKey === key;
            return (
              <div
                key={key}
                onClick={() => {
                  setCriterio1(f.criteriosCumplidos[0]);
                  setCriterio2(f.criteriosCumplidos[1]);
                  setCriterio3(f.criteriosCumplidos[2]);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  esActivo
                    ? "border-purple-600 bg-purple-50/70 shadow-md scale-[1.02]"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-slate-900 text-sm">Fenotipo {key}</span>
                  {esActivo && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-600 text-white">
                      Activo
                    </span>
                  )}
                </div>
                <p className="font-bold text-[11px] text-purple-700 mb-1">{f.titulo}</p>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className={f.criteriosCumplidos[0] ? "text-emerald-600 font-bold" : "text-slate-300"}>
                      {f.criteriosCumplidos[0] ? "✓" : "✗"}
                    </span>
                    <span>Oligo/Anovulación</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={f.criteriosCumplidos[1] ? "text-emerald-600 font-bold" : "text-slate-300"}>
                      {f.criteriosCumplidos[1] ? "✓" : "✗"}
                    </span>
                    <span>Hiperandrogenismo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={f.criteriosCumplidos[2] ? "text-emerald-600 font-bold" : "text-slate-300"}>
                      {f.criteriosCumplidos[2] ? "✓" : "✗"}
                    </span>
                    <span>Morfología Ovárica (PCOM)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL RECTIFICAR FENOTIPO POR CRITERIO MÉDICO (HU-015) ── */}
      {modalRectificarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <MdHistoryEdu size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Rectificación Médica del Diagnóstico
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modificación justificada de la clasificación según criterio del especialista (HU-015)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRectificarAbierto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <MdClose size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarRectificado} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fenotipo Asignado Definitivo *
                </label>
                <select
                  value={fenotipoRectificado}
                  onChange={(e) => setFenotipoRectificado(e.target.value)}
                  className="w-full border border-slate-300 rounded-2xl p-3 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="Fenotipo A">Fenotipo A — Clásico Completo (O + H + PCOM)</option>
                  <option value="Fenotipo B">Fenotipo B — Clásico No Ecográfico (O + H)</option>
                  <option value="Fenotipo C">Fenotipo C — Ovulatorio (H + PCOM)</option>
                  <option value="Fenotipo D">Fenotipo D — Normoandrogénico (O + PCOM)</option>
                  <option value="Sin SOP">Sin SOP — No cumple criterios diagnósticos mínimos</option>
                  <option value="SOP Atípico">SOP Atípico / Sospecha diagnóstica diferencial</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Justificación Clínica Obligatoria *
                </label>
                <textarea
                  rows={3}
                  required
                  value={justificacionMedica}
                  onChange={(e) => setJustificacionMedica(e.target.value)}
                  placeholder="Explique el fundamento médico del cambio de fenotipo (ej: Hiperandrogenismo clínico subclínico con ecografía ovárica de alta sospecha, descartando hiperplasia suprarrenal congénita...)"
                  className="w-full border border-slate-300 rounded-2xl p-3 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Conducta Terapéutica o Plan Inicial
                </label>
                <textarea
                  rows={2}
                  value={conductaTerapeutica}
                  onChange={(e) => setConductaTerapeutica(e.target.value)}
                  placeholder="Ej: Iniciar anticonceptivos orales con ciproterona, metformina 850 mg y control en 3 meses..."
                  className="w-full border border-slate-300 rounded-2xl p-3 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalRectificarAbierto(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirmando}
                  className="px-5 py-2.5 rounded-xl font-black text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-600/30 flex items-center gap-1.5"
                >
                  <MdVerified size={16} />
                  <span>{confirmando ? "Guardando..." : "Rubricar Rectificación Oficial"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
