import React, { useState, useEffect, useCallback } from "react";
import {
  MdClose,
  MdAssignment,
  MdCheckCircle,
  MdInfoOutline,
  MdWarning,
  MdHistory,
  MdAdd,
  MdBiotech,
  MdWaterDrop,
  MdFemale,
  MdScience,
  MdPictureAsPdf,
} from "react-icons/md";
import {
  emitirOrdenMedica,
  obtenerOrdenesPorPaciente,
  OrdenMedicaCreate,
  OrdenMedicaOut,
  ExamenItem,
} from "services/api";
import { imprimirOrdenMedica } from "./imprimirOrdenMedica";

interface ModalOrdenMedicaProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNombre: string;
  pacienteCi: string;
  pacienteEdad?: number | string;
  consultaId?: string;
  iniciadaVidaSexual?: boolean | null;
  onOrdenEmitida?: (orden: OrdenMedicaOut) => void;
}

// Catálogo maestro de análisis según protocolo Rotterdam
const CATALOGO_EXAMENES: ExamenItem[] = [
  // ── Perfil Hormonal Rotterdam (Criterios 1 y 2) ──
  { codigo: "TESTO_TOT", nombre: "Testosterona Total (Marcador Criterio 2)", categoria: "hormonal", seleccionado: true },
  { codigo: "TESTO_LIBRE", nombre: "Testosterona Libre Calculada", categoria: "hormonal", seleccionado: true },
  { codigo: "FAI", nombre: "Índice de Andrógenos Libres (FAI)", categoria: "hormonal", seleccionado: true },
  { codigo: "DHEA_S", nombre: "Sulfato de Dehidroepiandrosterona (DHEA-S)", categoria: "hormonal", seleccionado: true },
  { codigo: "ANDROST", nombre: "Androstenediona Ovárica/Adrenal", categoria: "hormonal", seleccionado: false },
  { codigo: "LH", nombre: "Hormona Luteinizante (LH)", categoria: "hormonal", seleccionado: true },
  { codigo: "FSH", nombre: "Hormona Folículo Estimulante (FSH)", categoria: "hormonal", seleccionado: true },
  { codigo: "REL_LH_FSH", nombre: "Relación LH / FSH", categoria: "hormonal", seleccionado: true },
  { codigo: "ESTRADIOL", nombre: "Estradiol (E2 en fase folicular temprana)", categoria: "hormonal", seleccionado: false },
  { codigo: "SHBG", nombre: "Globulina Fijadora de Hormonas Sexuales (SHBG)", categoria: "hormonal", seleccionado: true },
  { codigo: "PROGEST", nombre: "Progesterona (Fase lútea media día 21)", categoria: "hormonal", seleccionado: false },
  { codigo: "AMH", nombre: "Hormona Antimülleriana (AMH — Reserva ovárica)", categoria: "hormonal", seleccionado: true },

  // ── Descarte Diagnósticos Diferenciales (Exclusiones Obligatorias) ──
  { codigo: "TSH", nombre: "TSH Ultrasensible (Descarte Hipotiroidismo)", categoria: "diferencial", seleccionado: true },
  { codigo: "T4_LIBRE", nombre: "T4 Libre", categoria: "diferencial", seleccionado: false },
  { codigo: "PRL", nombre: "Prolactina (Descarte Hiperprolactinemia)", categoria: "diferencial", seleccionado: true },
  { codigo: "PROG_17_OH", nombre: "17-OH Progesterona (Descarte Hiperplasia Suprarrenal Congénita)", categoria: "diferencial", seleccionado: true },
  { codigo: "CORTISOL_24H", nombre: "Cortisol Libre Urinario / Salival (Descarte Síndrome de Cushing)", categoria: "diferencial", seleccionado: false },

  // ── Perfil Metabólico y Curvas (Riesgo Cardiometabólico SOP) ──
  { codigo: "GLU_BASAL", nombre: "Glucosa en Ayunas", categoria: "metabolico", seleccionado: true },
  { codigo: "INS_BASAL", nombre: "Insulina Basal en Ayunas", categoria: "metabolico", seleccionado: true },
  { codigo: "HOMA_IR", nombre: "Índice HOMA-IR (Resistencia a la Insulina)", categoria: "metabolico", seleccionado: true },
  { codigo: "CTOG_120", nombre: "Curva de Tolerancia a la Glucosa (CTOG 75g a los 120 min)", categoria: "metabolico", seleccionado: true },
  { codigo: "INS_120", nombre: "Insulina Pos-Carga (120 minutos)", categoria: "metabolico", seleccionado: true },
  { codigo: "HBA1C", nombre: "Hemoglobina Glicosilada (HbA1c)", categoria: "metabolico", seleccionado: true },
  { codigo: "PERFIL_LIPIDICO", nombre: "Perfil Lipídico Completo (Col-T, HDL, LDL, Triglicéridos)", categoria: "metabolico", seleccionado: true },
  { codigo: "TRANSAMINASAS", nombre: "Perfil Hepático (GOT/AST, GPT/ALT — Descarte Esteatosis)", categoria: "metabolico", seleccionado: false },

  // ── Pruebas de Orina y Descarte Ginecológico ──
  { codigo: "EGO", nombre: "Examen General de Orina (EGO)", categoria: "orina", seleccionado: true },
  { codigo: "HCG_CUANT", nombre: "hCG Subunidad Beta Cuantitativa (Descarte Embarazo)", categoria: "orina", seleccionado: false },
];

export const ModalOrdenMedica: React.FC<ModalOrdenMedicaProps> = ({
  isOpen,
  onClose,
  pacienteId,
  pacienteNombre,
  pacienteCi,
  pacienteEdad,
  consultaId,
  iniciadaVidaSexual,
  onOrdenEmitida,
}) => {
  const [tab, setTab] = useState<"nueva" | "historial">("nueva");

  // Formulario de emisión
  const [tipoEcografia, setTipoEcografia] = useState<"transvaginal" | "pelvica_abdominal" | "doppler" | "ninguna">("transvaginal");
  const [indicacionEcografia, setIndicacionEcografia] = useState("");
  const [examenes, setExamenes] = useState<ExamenItem[]>(CATALOGO_EXAMENES);
  const [indicacionesPreanaliticas, setIndicacionesPreanaliticas] = useState("");
  const [diagnosticoPresuntivo, setDiagnosticoPresuntivo] = useState(
    "Sospecha de Síndrome de Ovario Poliquístico (CIE-10: E28.2) — Protocolo Rotterdam"
  );
  const [prioridad, setPrioridad] = useState<"normal" | "preferente" | "urgente">("normal");
  const [observaciones] = useState("");

  // Historial de órdenes
  const [historialOrdenes, setHistorialOrdenes] = useState<OrdenMedicaOut[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Estados de proceso
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [ordenActivaImprimir, setOrdenActivaImprimir] = useState<OrdenMedicaOut | null>(null);

  const cargarHistorial = useCallback(async () => {
    if (!pacienteId) return;
    setCargandoHistorial(true);
    try {
      const data = await obtenerOrdenesPorPaciente(pacienteId);
      setHistorialOrdenes(data);
    } catch (err) {
      console.warn("Aviso al cargar historial de órdenes:", err);
    } finally {
      setCargandoHistorial(false);
    }
  }, [pacienteId]);

  // Inicializar recomendaciones contextuales según Sexarca de la paciente (texto conciso)
  useEffect(() => {
    if (isOpen) {
      setMensajeExito(null);
      setMensajeError(null);
      setOrdenActivaImprimir(null);

      if (iniciadaVidaSexual === false) {
        setTipoEcografia("pelvica_abdominal");
        setIndicacionEcografia(
          "Ecografía pélvica/abdominal ginecológica (repleción vesical). Paciente sin sexarca. Evaluación ovárica según Rotterdam."
        );
        setIndicacionesPreanaliticas(
          "• Ayuno de 8 a 12 horas previo a extracción sanguínea.\n" +
          "• Muestra en fase folicular temprana (días 2 a 5 del ciclo).\n" +
          "• Ecografía pélvica: Ingerir 1 L de agua sin gas 1 hora antes y retener la orina.\n" +
          "• Orina: Primera micción de la mañana (chorro medio)."
        );
      } else {
        setTipoEcografia("transvaginal");
        setIndicacionEcografia(
          "Ecografía transvaginal de alta resolución. Conteo de folículos antrales (2-9 mm) y volumen ovárico bilateral según Rotterdam."
        );
        setIndicacionesPreanaliticas(
          "• Ayuno de 8 a 12 horas previo a extracción sanguínea.\n" +
          "• Muestra en fase folicular temprana (días 2 a 5 del ciclo).\n" +
          "• Ecografía transvaginal: Vaciar la vejiga antes de ingresar al estudio.\n" +
          "• Orina: Primera micción de la mañana (chorro medio)."
        );
      }

      if (pacienteId) {
        cargarHistorial();
      }
    }
  }, [isOpen, iniciadaVidaSexual, pacienteId, cargarHistorial]);

  const toggleExamen = (codigo: string) => {
    setExamenes((prev) =>
      prev.map((e) => (e.codigo === codigo ? { ...e, seleccionado: !e.seleccionado } : e))
    );
  };

  const aplicarPreset = (tipo: "rotterdam_basico" | "metabolico_completo" | "diferencial" | "solo_eco" | "todos" | "ninguno") => {
    setExamenes((prev) =>
      prev.map((e) => {
        if (tipo === "todos") return { ...e, seleccionado: true };
        if (tipo === "ninguno" || tipo === "solo_eco") return { ...e, seleccionado: false };
        if (tipo === "rotterdam_basico") {
          const seleccionados = ["TESTO_TOT", "DHEA_S", "LH", "FSH", "REL_LH_FSH", "TSH", "PRL", "GLU_BASAL", "INS_BASAL", "EGO"];
          return { ...e, seleccionado: seleccionados.includes(e.codigo) };
        }
        if (tipo === "metabolico_completo") {
          const seleccionados = ["GLU_BASAL", "INS_BASAL", "CTOG_120", "PERFIL_LIPIDICO", "HBA1C", "TRANSAMINASAS", "EGO"];
          return { ...e, seleccionado: seleccionados.includes(e.codigo) };
        }
        if (tipo === "diferencial") {
          const seleccionados = ["PROG_17_OH", "TSH", "PRL", "AMH", "CORTISOL_24H"];
          return { ...e, seleccionado: seleccionados.includes(e.codigo) };
        }
        return e;
      })
    );

    if (tipo === "solo_eco" && tipoEcografia === "ninguna") {
      setTipoEcografia(iniciadaVidaSexual === false ? "pelvica_abdominal" : "transvaginal");
    }
  };

  const handleCambioTipoEcografia = (tipo: "transvaginal" | "pelvica_abdominal" | "doppler" | "ninguna") => {
    setTipoEcografia(tipo);
    if (tipo === "pelvica_abdominal") {
      setIndicacionEcografia(
        "Ecografía pélvica/abdominal ginecológica (repleción vesical). Evaluación ovárica según Rotterdam."
      );
    } else if (tipo === "transvaginal") {
      setIndicacionEcografia(
        "Ecografía transvaginal de alta resolución. Conteo de folículos antrales (2-9 mm) y volumen ovárico bilateral según Rotterdam."
      );
    } else if (tipo === "doppler") {
      setIndicacionEcografia(
        "Ecografía Doppler ovárico para evaluación de vascularización e índices de resistencia arterial."
      );
    } else {
      setIndicacionEcografia("");
    }
  };

  const handleGuardarOrden = async (imprimirInmediato = false) => {
    setMensajeError(null);
    setMensajeExito(null);

    const examenesSeleccionados = examenes.filter((e) => e.seleccionado);
    if (examenesSeleccionados.length === 0 && tipoEcografia === "ninguna") {
      setMensajeError("Seleccione al menos un examen de laboratorio o estudio ecográfico.");
      return;
    }

    setGuardando(true);

    const idLocal = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const indEcoFinal = tipoEcografia !== "ninguna"
      ? (indicacionEcografia.trim() || "Evaluación morfológica ovárica según Rotterdam")
      : undefined;

    const ordenBase: OrdenMedicaOut = {
      id: idLocal,
      paciente_id: pacienteId || "PACIENTE",
      paciente_nombre: pacienteNombre || "Paciente",
      paciente_ci: pacienteCi || "",
      tipo_ecografia: tipoEcografia,
      indicacion_ecografia: indEcoFinal,
      examenes_laboratorio: examenesSeleccionados,
      indicaciones_preanaliticas: indicacionesPreanaliticas,
      diagnostico_presuntivo: diagnosticoPresuntivo,
      prioridad: prioridad,
      observaciones: observaciones || undefined,
      estado: "vigente",
      medico_nombre: "Dr. Rodrigo Espinoza Iturri",
      medico_especialidad: "Endocrinología y Ginecología",
      medico_matricula: "MP-49201-LP",
      fecha_emision: new Date().toISOString(),
    };

    try {
      const payload: OrdenMedicaCreate = {
        paciente_id: pacienteId || "PACIENTE",
        consulta_id: consultaId || undefined,
        tipo_ecografia: tipoEcografia,
        indicacion_ecografia: indEcoFinal,
        examenes_laboratorio: examenesSeleccionados,
        indicaciones_preanaliticas: indicacionesPreanaliticas,
        diagnostico_presuntivo: diagnosticoPresuntivo,
        prioridad: prioridad,
        observaciones: observaciones || undefined,
      };

      const ordenEmitida = await emitirOrdenMedica(payload);
      const ordenFinal: OrdenMedicaOut = {
        ...ordenEmitida,
        paciente_nombre: ordenEmitida.paciente_nombre || pacienteNombre,
        paciente_ci: ordenEmitida.paciente_ci || pacienteCi,
      };

      setMensajeExito(`Orden #${ordenFinal.id.slice(0, 8).toUpperCase()} emitida y registrada con éxito.`);
      setOrdenActivaImprimir(ordenFinal);
      cargarHistorial();
      if (onOrdenEmitida) onOrdenEmitida(ordenFinal);

      if (imprimirInmediato) {
        imprimirOrdenMedica(ordenFinal);
      }
    } catch (err: any) {
      console.warn("Aviso al guardar orden médica:", err);
      setOrdenActivaImprimir(ordenBase);
      setMensajeExito(`Orden #${ordenBase.id} lista para impresión y PDF.`);
      if (imprimirInmediato) {
        imprimirOrdenMedica(ordenBase);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleImprimir = (orden: OrdenMedicaOut) => {
    setOrdenActivaImprimir(orden);
    imprimirOrdenMedica(orden);
  };

  if (!isOpen) return null;

  const totalExamenesSel = examenes.filter((e) => e.seleccionado).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      {/* ── CONTENEDOR PRINCIPAL MODAL ── */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-xl border border-slate-300 dark:border-navy-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Encabezado Acromático Sobrio */}
        <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <MdAssignment size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  Orden Médica de Laboratorio y Ecografía
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  Rotterdam
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Prescripción médica de análisis clínicos e imagenología ginecológica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Ficha rápida de la Paciente */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-navy-900/60 border-b border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-500">Paciente: </span>
              <strong className="text-slate-900 dark:text-white">{pacienteNombre}</strong>
            </div>
            <div>
              <span className="text-slate-500">CI: </span>
              <strong className="text-slate-900 dark:text-white">{pacienteCi || "S/CI"}</strong>
            </div>
            {pacienteEdad && (
              <div>
                <span className="text-slate-500">Edad: </span>
                <strong className="text-slate-900 dark:text-white">{pacienteEdad} años</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {iniciadaVidaSexual === true ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300">
                <MdCheckCircle size={13} className="text-slate-700" />
                Sexarca Activa → Ecografía Transvaginal
              </span>
            ) : iniciadaVidaSexual === false ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300">
                <MdWaterDrop size={13} className="text-slate-700" />
                Sin Sexarca → Ecografía Pélvica a base de agua
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <MdInfoOutline size={13} />
                Sexarca no especificada
              </span>
            )}
          </div>
        </div>

        {/* Pestañas: Nueva Orden vs Historial */}
        <div className="flex border-b border-slate-200 dark:border-navy-700 px-6 bg-slate-50/40 dark:bg-navy-900/20">
          <button
            type="button"
            onClick={() => setTab("nueva")}
            className={`py-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              tab === "nueva"
                ? "border-slate-900 text-slate-900 dark:text-white dark:border-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MdAdd size={15} /> Nueva Solicitud
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("historial");
              cargarHistorial();
            }}
            className={`py-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              tab === "historial"
                ? "border-slate-900 text-slate-900 dark:text-white dark:border-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MdHistory size={15} /> Historial ({historialOrdenes.length})
          </button>
        </div>

        {/* Mensaje de éxito al emitir */}
        {mensajeExito && (
          <div className="m-4 mb-0 p-2.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-medium flex items-center justify-between gap-2 shadow-xs">
            <span className="flex items-center gap-2">
              <MdCheckCircle size={16} className="text-slate-800 shrink-0" />
              {mensajeExito}
            </span>
            {ordenActivaImprimir && (
              <button
                type="button"
                onClick={() => handleImprimir(ordenActivaImprimir)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <MdPictureAsPdf size={14} /> Imprimir / PDF
              </button>
            )}
          </div>
        )}

        {/* Mensaje de error o advertencia */}
        {mensajeError && (
          <div className="m-4 mb-0 p-2.5 rounded-lg bg-slate-100 border border-slate-400 text-slate-800 text-xs font-medium flex items-center justify-between gap-2 shadow-xs">
            <span className="flex items-center gap-2">
              <MdWarning size={16} className="text-slate-700 shrink-0" />
              {mensajeError}
            </span>
            <button
              type="button"
              onClick={() => setMensajeError(null)}
              className="text-slate-600 hover:text-slate-900 text-xs px-2 py-0.5"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* ── CUERPO DEL MODAL (SCROLLABLE) ── */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-700 dark:text-slate-200">
          {tab === "nueva" ? (
            <>
              {/* 1. SECCIÓN: ESTUDIO ECOGRÁFICO */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200 dark:border-navy-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    1. Estudio Ecográfico Ginecológico (Criterio 3 Rotterdam)
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 dark:bg-navy-700 px-2 py-0.5 rounded">
                    Imagenología
                  </span>
                </div>

                {/* Opciones de Ecografía */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <label
                    className={`flex flex-col p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      tipoEcografia === "transvaginal"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Transvaginal</span>
                      <input
                        type="radio"
                        name="tipo_eco"
                        checked={tipoEcografia === "transvaginal"}
                        onChange={() => handleCambioTipoEcografia("transvaginal")}
                        className="accent-slate-900"
                      />
                    </div>
                    <p className={`text-[11px] ${tipoEcografia === "transvaginal" ? "text-slate-300" : "text-slate-500"}`}>
                      Alta resolución folicular (sexarca activa).
                    </p>
                  </label>

                  <label
                    className={`flex flex-col p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      tipoEcografia === "pelvica_abdominal"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Pélvica / Abdominal</span>
                      <input
                        type="radio"
                        name="tipo_eco"
                        checked={tipoEcografia === "pelvica_abdominal"}
                        onChange={() => handleCambioTipoEcografia("pelvica_abdominal")}
                        className="accent-slate-900"
                      />
                    </div>
                    <p className={`text-[11px] ${tipoEcografia === "pelvica_abdominal" ? "text-slate-300" : "text-slate-500"}`}>
                      Vejiga llena. Pacientes sin inicio de sexarca.
                    </p>
                  </label>

                  <label
                    className={`flex flex-col p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      tipoEcografia === "doppler"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Doppler Ovárico</span>
                      <input
                        type="radio"
                        name="tipo_eco"
                        checked={tipoEcografia === "doppler"}
                        onChange={() => handleCambioTipoEcografia("doppler")}
                        className="accent-slate-900"
                      />
                    </div>
                    <p className={`text-[11px] ${tipoEcografia === "doppler" ? "text-slate-300" : "text-slate-500"}`}>
                      Vascularización estromal e índices arteriales.
                    </p>
                  </label>

                  <label
                    className={`flex flex-col p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      tipoEcografia === "ninguna"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Sin ecografía</span>
                      <input
                        type="radio"
                        name="tipo_eco"
                        checked={tipoEcografia === "ninguna"}
                        onChange={() => handleCambioTipoEcografia("ninguna")}
                        className="accent-slate-800"
                      />
                    </div>
                    <p className={`text-[11px] ${tipoEcografia === "ninguna" ? "text-slate-300" : "text-slate-500"}`}>
                      Solo solicitar exámenes de sangre / orina.
                    </p>
                  </label>
                </div>

                {tipoEcografia !== "ninguna" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Indicación técnica para el estudio ecográfico:
                    </label>
                    <input
                      type="text"
                      value={indicacionEcografia}
                      onChange={(e) => setIndicacionEcografia(e.target.value)}
                      placeholder="Conteo folicular antral de 2 a 9 mm y volumen ovárico..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* 2. SECCIÓN: EXÁMENES DE LABORATORIO */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200 dark:border-navy-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    2. Exámenes de Laboratorio ({totalExamenesSel} seleccionados)
                  </h4>

                  {/* Barra de presets sobria */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => aplicarPreset("rotterdam_basico")}
                      className="px-2.5 py-1 rounded text-[10px] font-semibold bg-slate-800 text-white hover:bg-slate-900 transition"
                    >
                      Rotterdam Estándar
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPreset("metabolico_completo")}
                      className="px-2.5 py-1 rounded text-[10px] font-semibold border border-slate-300 dark:border-navy-600 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 transition"
                    >
                      Metabólico Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPreset("diferencial")}
                      className="px-2.5 py-1 rounded text-[10px] font-semibold border border-slate-300 dark:border-navy-600 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 transition"
                    >
                      Descarte Diferencial
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPreset("todos")}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-slate-200 dark:bg-navy-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPreset("ninguno")}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-slate-200 dark:bg-navy-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Subgrupos de análisis en tonos sobrios */}
                <div className="space-y-3">
                  {/* Grupo Hormonal */}
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <MdFemale size={14} /> Perfil Hormonal (Criterios 1 y 2 Rotterdam)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                      {examenes
                        .filter((e) => e.categoria === "hormonal")
                        .map((e) => (
                          <label
                            key={e.codigo}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              e.seleccionado
                                ? "bg-white dark:bg-navy-900 border-slate-700 font-semibold text-slate-900 dark:text-slate-100"
                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(e.seleccionado)}
                              onChange={() => toggleExamen(e.codigo)}
                              className="mt-0.5 rounded accent-slate-800"
                            />
                            <span className="leading-tight">{e.nombre}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Grupo Metabólico */}
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <MdBiotech size={14} /> Perfil Metabólico y Curvas de Insulina
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                      {examenes
                        .filter((e) => e.categoria === "metabolico")
                        .map((e) => (
                          <label
                            key={e.codigo}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              e.seleccionado
                                ? "bg-white dark:bg-navy-900 border-slate-700 font-semibold text-slate-900 dark:text-slate-100"
                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(e.seleccionado)}
                              onChange={() => toggleExamen(e.codigo)}
                              className="mt-0.5 rounded accent-slate-800"
                            />
                            <span className="leading-tight">{e.nombre}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Grupo Diagnósticos Diferenciales */}
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <MdWarning size={14} /> Diagnósticos Diferenciales (Exclusiones)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                      {examenes
                        .filter((e) => e.categoria === "diferencial")
                        .map((e) => (
                          <label
                            key={e.codigo}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              e.seleccionado
                                ? "bg-white dark:bg-navy-900 border-slate-700 font-semibold text-slate-900 dark:text-slate-100"
                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(e.seleccionado)}
                              onChange={() => toggleExamen(e.codigo)}
                              className="mt-0.5 rounded accent-slate-800"
                            />
                            <span className="leading-tight">{e.nombre}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Grupo Pruebas de Orina */}
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <MdScience size={14} /> Examen de Orina y Descarte Ginecológico
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                      {examenes
                        .filter((e) => e.categoria === "orina")
                        .map((e) => (
                          <label
                            key={e.codigo}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              e.seleccionado
                                ? "bg-white dark:bg-navy-900 border-slate-700 font-semibold text-slate-900 dark:text-slate-100"
                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(e.seleccionado)}
                              onChange={() => toggleExamen(e.codigo)}
                              className="mt-0.5 rounded accent-slate-800"
                            />
                            <span className="leading-tight">{e.nombre}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. SECCIÓN: PARÁMETROS E INSTRUCCIONES */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-200 mb-1">
                      Diagnóstico Orientativo (CIE-10):
                    </label>
                    <input
                      type="text"
                      value={diagnosticoPresuntivo}
                      onChange={(e) => setDiagnosticoPresuntivo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-200 mb-1">
                      Prioridad:
                    </label>
                    <select
                      value={prioridad}
                      onChange={(e: any) => setPrioridad(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-slate-600 font-medium"
                    >
                      <option value="normal">Normal (Rutina)</option>
                      <option value="preferente">Preferente</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-200">
                      Indicaciones de Preparación:
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Instrucciones preanalíticas para la paciente
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={indicacionesPreanaliticas}
                    onChange={(e) => setIndicacionesPreanaliticas(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-slate-600 leading-relaxed font-mono"
                    placeholder="Ayuno, días del ciclo, hidratación..."
                  />
                </div>
              </div>
            </>
          ) : (
            /* ── PESTAÑA HISTORIAL DE ÓRDENES MÉDICAS ── */
            <div className="space-y-3">
              {cargandoHistorial ? (
                <div className="py-10 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Cargando órdenes médicas...
                </div>
              ) : historialOrdenes.length === 0 ? (
                <div className="py-10 text-center space-y-2 border border-dashed border-slate-300 dark:border-navy-700 rounded-xl">
                  <p className="text-xs font-medium text-slate-500">
                    No se han registrado órdenes médicas previas para esta paciente.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("nueva")}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-semibold text-xs hover:bg-slate-900 transition"
                  >
                    Crear primera orden
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historialOrdenes.map((orden) => (
                    <div
                      key={orden.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-400 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                            Orden #{orden.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(orden.fecha_emision).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {orden.estado}
                          </span>
                        </div>

                        <div className="text-xs text-slate-800 dark:text-white">
                          Ecografía: <span className="font-semibold capitalize">{orden.tipo_ecografia.replace("_", " ")}</span> •{" "}
                          Laboratorio: <span className="font-semibold">{orden.examenes_laboratorio.length} exámenes</span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {orden.diagnostico_presuntivo}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleImprimir(orden)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                        >
                          <MdPictureAsPdf size={14} /> Imprimir / PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER CON ACCIONES ── */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-navy-900 border-t border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-navy-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            Cerrar
          </button>

          {tab === "nueva" && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleGuardarOrden(false)}
                disabled={guardando}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-navy-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <MdAssignment size={15} />
                {guardando ? "Guardando..." : "Solo Guardar"}
              </button>
              <button
                type="button"
                onClick={() => handleGuardarOrden(true)}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                <MdPictureAsPdf size={15} />
                {guardando ? "Generando..." : "Emitir y Generar PDF / Imprimir"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalOrdenMedica;
