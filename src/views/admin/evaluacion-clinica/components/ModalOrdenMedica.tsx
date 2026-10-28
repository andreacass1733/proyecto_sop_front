import React, { useState, useEffect, useCallback } from "react";

import { imprimirContenidoClinico } from "utils/printDocument";

import {

  MdClose,

  MdPrint,

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

} from "react-icons/md";

import {

  emitirOrdenMedica,

  obtenerOrdenesPorPaciente,

  OrdenMedicaCreate,

  OrdenMedicaOut,

  ExamenItem,

} from "services/api";



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

  { codigo: "DHEA_S", nombre: "DHEA-S (Sulfato de Dehidroepiandrosterona)", categoria: "hormonal", seleccionado: true },

  { codigo: "LH", nombre: "LH (Hormona Luteinizante)", categoria: "hormonal", seleccionado: true },

  { codigo: "FSH", nombre: "FSH (Hormona Folículo Estimulante)", categoria: "hormonal", seleccionado: true },

  { codigo: "REL_LH_FSH", nombre: "Índice / Relación LH/FSH", categoria: "hormonal", seleccionado: true },

  { codigo: "ANDRO", nombre: "Androstenediona sérica", categoria: "hormonal", seleccionado: false },

  { codigo: "AMH", nombre: "Hormona Antimülleriana (Reserva Ovárica - AMH)", categoria: "hormonal", seleccionado: false },

  { codigo: "ESTRADIOL", nombre: "Estradiol (E2) en fase folicular temprana", categoria: "hormonal", seleccionado: false },

  { codigo: "PROGESTERONA", nombre: "Progesterona lútea (Día 21)", categoria: "hormonal", seleccionado: false },



  // ── Diagnósticos Diferenciales Requeridos por Rotterdam ──

  { codigo: "TSH", nombre: "TSH Ultrasensible (Descarte de Hipotiroidismo)", categoria: "diferencial", seleccionado: true },

  { codigo: "PRL", nombre: "Prolactina sérica (Descarte de Hiperprolactinemia)", categoria: "diferencial", seleccionado: true },

  { codigo: "PROG_17_OH", nombre: "17-OH Progesterona (Descarte Hiperplasia Suprarrenal)", categoria: "diferencial", seleccionado: false },



  // ── Perfil Metabólico y Curvas de Insulina ──

  { codigo: "GLU_BASAL", nombre: "Glucosa basal en ayunas", categoria: "metabolico", seleccionado: true },

  { codigo: "INS_BASAL", nombre: "Insulina basal en ayunas (Cálculo HOMA-IR)", categoria: "metabolico", seleccionado: true },

  { codigo: "CTOG_120", nombre: "Curva de Tolerancia a la Glucosa e Insulina (CTOG 75g - 0, 60 y 120 min)", categoria: "metabolico", seleccionado: false },

  { codigo: "PERFIL_LIPIDICO", nombre: "Perfil Lipídico Completo (Colesterol, Triglicéridos, HDL, LDL, VLDL)", categoria: "metabolico", seleccionado: false },

  { codigo: "HBA1C", nombre: "Hemoglobina Glicosilada (HbA1c)", categoria: "metabolico", seleccionado: false },

  { codigo: "TRANSAMINASAS", nombre: "Perfil Hepático / Transaminasas (TGO, TGP)", categoria: "metabolico", seleccionado: false },



  // ── Pruebas de Orina y Descarte Ginecológico ──

  { codigo: "EGO", nombre: "Examen General de Orina (EGO / Uroanálisis completo)", categoria: "orina", seleccionado: true },

  { codigo: "HCG_ORINA", nombre: "Prueba de Embarazo en Orina (hCG cualitativa)", categoria: "orina", seleccionado: false },

  { codigo: "CORTISOL_24H", nombre: "Cortisol Libre en Orina de 24 horas (Descarte de Cushing)", categoria: "orina", seleccionado: false },

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

  const [observaciones, setObservaciones] = useState("");



  // Historial de órdenes

  const [historialOrdenes, setHistorialOrdenes] = useState<OrdenMedicaOut[]>([]);

  const [cargandoHistorial, setCargandoHistorial] = useState(false);



  // Estados de proceso

  const [guardando, setGuardando] = useState(false);

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

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



  // Inicializar recomendaciones contextuales según Sexarca de la paciente

  useEffect(() => {

    if (isOpen) {

      setMensajeExito(null);

      setOrdenActivaImprimir(null);



      // Si la paciente NO ha iniciado vida sexual (Sexarca = No)

      if (iniciadaVidaSexual === false) {

        setTipoEcografia("pelvica_abdominal");

        setIndicacionEcografia(

          "Ecografía pélvica/abdominal ginecológica con vejiga llena (repleción vesical). Paciente sin inicio de sexarca. Evaluación de volumen ovárico y morfología poliquística según Criterio 3 de Rotterdam."

        );

        setIndicacionesPreanaliticas(

          "1. Ayuno de 8 a 12 horas previo a la extracción de sangre.\n" +

          "2. Toma de muestra preferentemente entre el 2° y 5° día del ciclo menstrual (fase folicular temprana).\n" +

          "3. Para examen de orina (EGO / hCG): Recolectar la primera orina de la mañana (chorro medio) en frasco estéril.\n" +

          "4. Para la ecografía pélvica/abdominal: Tomar 4 a 6 vasos de agua sin gas (1 a 1.5 litros) 1 hora antes del examen y retener la orina para lograr una adecuada ventana acústica."

        );

      } else {

        // Paciente con vida sexual activa (Sexarca = Sí)

        setTipoEcografia("transvaginal");

        setIndicacionEcografia(

          "Ecografía transvaginal de alta resolución. Evaluación de Criterio 3 de Rotterdam: Conteo de folículos antrales (2 a 9 mm) y medición tridimensional de volumen ovárico en ambos ovarios."

        );

        setIndicacionesPreanaliticas(

          "1. Ayuno de 8 a 12 horas previo a la extracción de sangre.\n" +

          "2. Toma de muestra preferentemente entre el 2° y 5° día del ciclo menstrual (fase folicular temprana).\n" +

          "3. Para examen de orina (EGO / hCG): Recolectar la primera orina de la mañana (chorro medio) en frasco estéril.\n" +

          "4. Para la ecografía transvaginal: Se requiere vaciar la vejiga inmediatamente antes de ingresar al examen ecográfico."

        );

      }



      // Cargar historial de órdenes

      if (pacienteId) {

        cargarHistorial();

      }

    }

  }, [isOpen, iniciadaVidaSexual, pacienteId, cargarHistorial]);



  // Manejar selección de exámenes

  const toggleExamen = (codigo: string) => {

    setExamenes((prev) =>

      prev.map((e) => (e.codigo === codigo ? { ...e, seleccionado: !e.seleccionado } : e))

    );

  };



  // Aplicar Presets Rápidos

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



    if (tipo === "solo_eco") {

      if (tipoEcografia === "ninguna") {

        setTipoEcografia(iniciadaVidaSexual === false ? "pelvica_abdominal" : "transvaginal");

      }

    }

  };



  // Actualizar indicación según tipo de ecografía elegido manualmente

  const handleCambioTipoEcografia = (tipo: "transvaginal" | "pelvica_abdominal" | "doppler" | "ninguna") => {

    setTipoEcografia(tipo);

    if (tipo === "pelvica_abdominal") {

      setIndicacionEcografia(

        "Ecografía pélvica/abdominal ginecológica con vejiga llena (repleción vesical). Evaluación de volumen ovárico y conteo folicular según Criterio 3 de Rotterdam."

      );

    } else if (tipo === "transvaginal") {

      setIndicacionEcografia(

        "Ecografía transvaginal de alta resolución. Conteo de folículos antrales (2 a 9 mm) y volumen ovárico bilateral según Criterios de Rotterdam."

      );

    } else if (tipo === "doppler") {

      setIndicacionEcografia(

        "Ecografía Doppler ovárica transvaginal/pélvica para evaluación de vascularización estromal ovárica e índices de resistencia arterial."

      );

    } else {

      setIndicacionEcografia("");

    }

  };



  // Emitir la orden médica

  const handleGuardarOrden = async () => {

    if (!pacienteId) return;



    const examenesSeleccionados = examenes.filter((e) => e.seleccionado);

    if (examenesSeleccionados.length === 0 && tipoEcografia === "ninguna") {

      setMensajeExito(null); setErrorGuardado("Por favor seleccione al menos un análisis de laboratorio o un estudio ecográfico.");

      return;

    }



    setGuardando(true);

    setMensajeExito(null);



    try {

      const indEcoLimpia = indicacionEcografia.trim();

      const payload: OrdenMedicaCreate = {

        paciente_id: pacienteId,

        consulta_id: consultaId || undefined,

        tipo_ecografia: tipoEcografia,

        indicacion_ecografia: tipoEcografia !== "ninguna" ? (indEcoLimpia.length >= 3 ? indEcoLimpia : "Evaluación ecográfica ovárica bilateral según Criterios de Rotterdam.") : undefined,

        examenes_laboratorio: examenesSeleccionados,

        indicaciones_preanaliticas: indicacionesPreanaliticas?.trim() || undefined,

        diagnostico_presuntivo: diagnosticoPresuntivo?.trim() || undefined,

        prioridad: prioridad,

        observaciones: observaciones?.trim() || undefined,

      };



      const ordenEmitida = await emitirOrdenMedica(payload);

      setMensajeExito(`Orden Médica #${ordenEmitida.id.slice(0, 8).toUpperCase()} emitida y registrada con éxito en el expediente.`);

      setOrdenActivaImprimir(ordenEmitida);

      cargarHistorial();

      if (onOrdenEmitida) onOrdenEmitida(ordenEmitida);

      handleImprimir(ordenEmitida);

    } catch (err: any) {

      let msg = "Error al emitir la orden médica.";

      if (typeof err === "string") msg = err;

      else if (typeof err?.message === "string") msg = err.message;

      else if (err?.detail) {

        msg = typeof err.detail === "string" ? err.detail : (Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ") : JSON.stringify(err.detail));

      }

      setErrorGuardado(msg);

    } finally {

      setGuardando(false);

    }

  };



  // Función para imprimir la orden médica oficial de forma minimalista y limpia

  const handleImprimir = (orden: OrdenMedicaOut) => {

    setOrdenActivaImprimir(orden);

    const fechaFormateada = new Date(orden.fecha_emision).toLocaleDateString("es-ES", {

      day: "2-digit",

      month: "long",

      year: "numeric",

    });



    const examenesHtml = orden.examenes_laboratorio.length > 0 ? `

      <div class="section-box">

        <div class="section-title">Análisis de Laboratorio Solicitados (${orden.examenes_laboratorio.length})</div>

        <div class="grid-2">

          ${orden.examenes_laboratorio.map(e => `

            <div style="font-size: 9pt; display: flex; align-items: center; gap: 6px; padding: 2px 0;">

              <span style="color: #7c3aed; font-weight: bold;">☑</span>

              <span>${e.nombre}</span>

            </div>

          `).join("")}

        </div>

      </div>

    ` : "";



    const ecografiaHtml = orden.tipo_ecografia !== "ninguna" ? `

      <div class="section-box">

        <div class="section-title">Estudio de Imagenología Solicitado</div>

        <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a;">

          ${orden.tipo_ecografia === "transvaginal"

            ? "Ecografía Transvaginal de Alta Resolución (Gold Standard SOP)"

            : orden.tipo_ecografia === "pelvica_abdominal"

            ? "Ecografía Pélvica / Abdominal Ginecológica"

            : "Ecografía Doppler Ovárico Color"}

        </div>

        ${orden.indicacion_ecografia ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 4px;"><strong>Indicación clínica:</strong> ${orden.indicacion_ecografia}</div>` : ""}

      </div>

    ` : "";



    const indicacionesHtml = orden.indicaciones_preanaliticas ? `

      <div class="section-box" style="background: #fffbeb; border-color: #fde68a;">

        <div class="section-title" style="color: #92400e;">Indicaciones Pre-Analíticas de Preparación</div>

        <div style="font-size: 8.5pt; color: #78350f; white-space: pre-line;">${orden.indicaciones_preanaliticas}</div>

      </div>

    ` : "";



    const html = `

      <div class="header">

        <div>

          <h1 class="hospital-title">CENTRO MÉDICO DE ESPECIALIDADES ENDOCRINOLÓGICAS</h1>

          <div class="hospital-subtitle">Unidad Integral de Diagnóstico y Tratamiento del Síndrome de Ovario Poliquístico</div>

          <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Sistema Clínico Especializado SOP-Care • Consenso de Rotterdam</div>

        </div>

        <div class="doc-meta">

          <div class="doc-id">ORDEN #${orden.id.slice(0, 8).toUpperCase()}</div>

          <div>Fecha: ${fechaFormateada}</div>

          <div style="font-weight: 700; color: #dc2626; text-transform: uppercase;">Prioridad: ${orden.prioridad}</div>

        </div>

      </div>



      <div style="text-align: center; margin-bottom: 16px;">

        <h2 style="font-size: 13pt; font-weight: 900; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; color: #1e1b4b;">

          Solicitud de Exámenes de Laboratorio e Imagenología

        </h2>

      </div>



      <div class="section-box">

        <div class="section-title">Datos de Identificación del Paciente</div>

        <div class="grid-2">

          <div><span class="item-label">Paciente:</span> <div class="item-value">${orden.paciente_nombre}</div></div>

          <div><span class="item-label">Cédula de Identidad (CI):</span> <div class="item-value">${orden.paciente_ci || "—"}</div></div>

          <div><span class="item-label">Diagnóstico Orientativo:</span> <div class="item-value">${orden.diagnostico_presuntivo}</div></div>

          <div><span class="item-label">Prioridad Clínica:</span> <div class="item-value" style="text-transform: capitalize;">${orden.prioridad}</div></div>

        </div>

      </div>



      ${ecografiaHtml}

      ${examenesHtml}

      ${indicacionesHtml}



      <div class="footer-signatures">

        <div>

          <div class="seal-box">

            <div>DOCUMENTO MÉDICO AUTORIZADO</div>

            <div>Hash: ${orden.id.replace(/-/g, "").slice(0, 24)}...</div>

            <div>Firma digital validada en expediente clínico</div>

          </div>

        </div>

        <div class="signature-block">

          <div style="font-weight: 800; font-size: 10pt; color: #0f172a;">${orden.medico_nombre}</div>

          <div>${orden.medico_especialidad}</div>

          <div style="font-family: monospace; font-size: 8pt;">${orden.medico_matricula}</div>

          <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 4px;">Firma y Sello del Especialista</div>

        </div>

      </div>

    `;



    imprimirContenidoClinico(`Orden_Medica_${orden.id.slice(0, 8)}`, html);

  };



  if (!isOpen) return null;



  const totalExamenesSel = examenes.filter((e) => e.seleccionado).length;



  return (

    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">

      {/* ── CONTENEDOR PRINCIPAL MODAL ── */}

      <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">

        {/* Encabezado */}

        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shadow-md shrink-0">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">

              📋

            </div>

            <div>

              <div className="flex items-center gap-2">

                <h3 className="text-base sm:text-lg font-black tracking-tight">

                  Solicitud / Orden Médica de Estudios SOP

                </h3>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">

                  Laboratorio & Eco

                </span>

              </div>

              <p className="text-xs text-indigo-100 font-medium">

                Prescripción clínica de perfiles hormonales, metabólicos y ecografía según Rotterdam

              </p>

            </div>

          </div>

          <button

            type="button"

            onClick={onClose}

            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"

          >

            <MdClose size={20} />

          </button>

        </div>



        {/* Ficha rápida de la Paciente y Alerta Contextual de Sexarca */}

        <div className="px-6 py-3 bg-indigo-50/70 dark:bg-navy-900/60 border-b border-indigo-100 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3 text-xs">

          <div className="flex items-center gap-4 flex-wrap">

            <div>

              <span className="text-slate-500 font-medium">Paciente: </span>

              <strong className="text-slate-800 dark:text-white font-bold">{pacienteNombre}</strong>

            </div>

            <div>

              <span className="text-slate-500 font-medium">CI: </span>

              <strong className="text-slate-800 dark:text-white font-bold">{pacienteCi || "S/CI"}</strong>

            </div>

            {pacienteEdad && (

              <div>

                <span className="text-slate-500 font-medium">Edad: </span>

                <strong className="text-slate-800 dark:text-white font-bold">{pacienteEdad} años</strong>

              </div>

            )}

          </div>



          {/* Badge y aviso de Sexarca para orientar la ecografía */}

          <div className="flex items-center gap-2">

            {iniciadaVidaSexual === true ? (

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">

                <MdCheckCircle size={14} className="text-emerald-600" />

                Sexarca Activa → Habilita Ecografía Transvaginal

              </span>

            ) : iniciadaVidaSexual === false ? (

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">

                <MdWaterDrop size={14} className="text-purple-600" />

                Sin Sexarca → Requiere Ecografía Abdominal a base de agua

              </span>

            ) : (

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">

                <MdInfoOutline size={14} />

                Sexarca no especificada en antecedentes

              </span>

            )}

          </div>

        </div>



        {/* Pestañas: Nueva Orden vs Historial */}

        <div className="flex border-b border-slate-200 dark:border-navy-700 px-6 bg-slate-50/50 dark:bg-navy-900/30">

          <button

            type="button"

            onClick={() => setTab("nueva")}

            className={`py-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${

              tab === "nueva"

                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"

                : "border-transparent text-slate-500 hover:text-slate-800"

            }`}

          >

            <MdAdd size={16} /> Confeccionar Nueva Orden

          </button>

          <button

            type="button"

            onClick={() => {

              setTab("historial");

              cargarHistorial();

            }}

            className={`py-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${

              tab === "historial"

                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"

                : "border-transparent text-slate-500 hover:text-slate-800"

            }`}

          >

            <MdHistory size={16} /> Historial de Órdenes ({historialOrdenes.length})

          </button>

        </div>



        {/* Mensaje de éxito al emitir */}

        {errorGuardado && (

          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center justify-between animate-fade-in">

            <span>{errorGuardado}</span>

            <button type="button" onClick={() => setErrorGuardado(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">×</button>

          </div>

        )}

        {mensajeExito && (

          <div className="m-4 mb-0 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">

            <span className="flex items-center gap-2">

              <MdCheckCircle size={18} className="text-emerald-600 shrink-0" />

              {mensajeExito}

            </span>

            {ordenActivaImprimir && (

              <button

                type="button"

                onClick={() => handleImprimir(ordenActivaImprimir)}

                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm"

              >

                <MdPrint size={15} /> Imprimir Volante

              </button>

            )}

          </div>

        )}



        {/* ── CUERPO DEL MODAL (SCROLLABLE) ── */}

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-200">

          {tab === "nueva" ? (

            <>

              {/* 1. SECCIÓN: ESTUDIO ECOGRÁFICO (CRITERIO 3 ROTTERDAM) */}

              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 space-y-3">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black">

                      1

                    </span>

                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">

                      Estudio de Imagenología / Ecografía Ovárica (Criterio 3)

                    </h4>

                  </div>

                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-md">

                    Protocolo Rotterdam

                  </span>

                </div>



                {/* Opciones de Ecografía */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">

                  {/* Opción Transvaginal */}

                  <label

                    className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition ${

                      tipoEcografia === "transvaginal"

                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"

                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-purple-300"

                    }`}

                  >

                    <div className="flex items-center justify-between mb-1">

                      <span className="font-black">Ecografía Transvaginal</span>

                      <input

                        type="radio"

                        name="tipo_eco"

                        checked={tipoEcografia === "transvaginal"}

                        onChange={() => handleCambioTipoEcografia("transvaginal")}

                        className="accent-purple-600"

                      />

                    </div>

                    <p className={`text-[11px] ${tipoEcografia === "transvaginal" ? "text-purple-100" : "text-slate-500"}`}>

                      Patrón de Oro Rotterdam. Alta resolución folicular en vida sexual activa.

                    </p>

                  </label>



                  {/* Opción Pélvica / Abdominal (Agua) */}

                  <label

                    className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition ${

                      tipoEcografia === "pelvica_abdominal"

                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"

                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-purple-300"

                    }`}

                  >

                    <div className="flex items-center justify-between mb-1">

                      <span className="font-black">Pélvica / Abdominal</span>

                      <input

                        type="radio"

                        name="tipo_eco"

                        checked={tipoEcografia === "pelvica_abdominal"}

                        onChange={() => handleCambioTipoEcografia("pelvica_abdominal")}

                        className="accent-purple-600"

                      />

                    </div>

                    <p className={`text-[11px] ${tipoEcografia === "pelvica_abdominal" ? "text-purple-100" : "text-slate-500"}`}>

                      A base de agua (vejiga llena). Indicada en pacientes sin sexarca / vírgenes.

                    </p>

                  </label>



                  {/* Opción Doppler */}

                  <label

                    className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition ${

                      tipoEcografia === "doppler"

                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"

                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-purple-300"

                    }`}

                  >

                    <div className="flex items-center justify-between mb-1">

                      <span className="font-black">Doppler Ovárico</span>

                      <input

                        type="radio"

                        name="tipo_eco"

                        checked={tipoEcografia === "doppler"}

                        onChange={() => handleCambioTipoEcografia("doppler")}

                        className="accent-purple-600"

                      />

                    </div>

                    <p className={`text-[11px] ${tipoEcografia === "doppler" ? "text-purple-100" : "text-slate-500"}`}>

                      Flujo estromal ovárico e índice de resistencia vascular.

                    </p>

                  </label>



                  {/* Opción Ninguna */}

                  <label

                    className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition ${

                      tipoEcografia === "ninguna"

                        ? "bg-slate-700 text-white border-slate-700 shadow-sm"

                        : "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 hover:border-slate-300"

                    }`}

                  >

                    <div className="flex items-center justify-between mb-1">

                      <span className="font-black">No solicitar ecografía</span>

                      <input

                        type="radio"

                        name="tipo_eco"

                        checked={tipoEcografia === "ninguna"}

                        onChange={() => handleCambioTipoEcografia("ninguna")}

                        className="accent-slate-700"

                      />

                    </div>

                    <p className={`text-[11px] ${tipoEcografia === "ninguna" ? "text-slate-200" : "text-slate-500"}`}>

                      Solo emitir orden para pruebas de sangre / laboratorio.

                    </p>

                  </label>

                </div>



                {/* Campo indicación ecográfica */}

                {tipoEcografia !== "ninguna" && (

                  <div>

                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">

                      Indicación médica para el ecografista:

                    </label>

                    <input

                      type="text"

                      value={indicacionEcografia}

                      onChange={(e) => setIndicacionEcografia(e.target.value)}

                      placeholder="Ej. Conteo folicular antral de 2 a 9 mm y volumen ovárico..."

                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-purple-500"

                    />

                  </div>

                )}

              </div>



              {/* 2. SECCIÓN: EXÁMENES DE LABORATORIO (CRITERIOS 1 Y 2) */}

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

                  <div className="flex items-center gap-2">

                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">

                      2

                    </span>

                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">

                      Análisis de Laboratorio Clínico Solicitados ({totalExamenesSel} seleccionados)

                    </h4>

                  </div>



                  {/* Barra de presets rápidos */}

                  <div className="flex items-center gap-1.5 flex-wrap">

                    <button

                      type="button"

                      onClick={() => aplicarPreset("rotterdam_basico")}

                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"

                    >

                      ⚡ Rotterdam Estándar

                    </button>

                    <button

                      type="button"

                      onClick={() => aplicarPreset("metabolico_completo")}

                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition"

                    >

                      ⚡ Curva Metabólica

                    </button>

                    <button

                      type="button"

                      onClick={() => aplicarPreset("diferencial")}

                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition"

                    >

                      ⚡ Descarte Diferencial

                    </button>

                    <button

                      type="button"

                      onClick={() => aplicarPreset("todos")}

                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-200 dark:bg-navy-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition"

                    >

                      Todos

                    </button>

                    <button

                      type="button"

                      onClick={() => aplicarPreset("ninguno")}

                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-200 dark:bg-navy-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition"

                    >

                      Limpiar

                    </button>

                  </div>

                </div>



                {/* Subgrupos de análisis */}

                <div className="space-y-3">

                  {/* Grupo Hormonal */}

                  <div>

                    <h5 className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1.5">

                      <MdFemale size={15} /> Perfil Hormonal Ginecológico (Criterios 1 y 2 de Rotterdam)

                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">

                      {examenes

                        .filter((e) => e.categoria === "hormonal")

                        .map((e) => (

                          <label

                            key={e.codigo}

                            className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${

                              e.seleccionado

                                ? "bg-white dark:bg-navy-900 border-purple-500 shadow-2xs font-bold text-purple-950 dark:text-purple-200"

                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"

                            }`}

                          >

                            <input

                              type="checkbox"

                              checked={Boolean(e.seleccionado)}

                              onChange={() => toggleExamen(e.codigo)}

                              className="mt-0.5 rounded accent-purple-600"

                            />

                            <span className="leading-tight">{e.nombre}</span>

                          </label>

                        ))}

                    </div>

                  </div>



                  {/* Grupo Metabólico e Insulínico */}

                  <div className="pt-2 border-t border-slate-200/80 dark:border-navy-700">

                    <h5 className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">

                      <MdBiotech size={15} /> Perfil Metabólico, Glucemia e Insulina Dinámica

                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">

                      {examenes

                        .filter((e) => e.categoria === "metabolico")

                        .map((e) => (

                          <label

                            key={e.codigo}

                            className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${

                              e.seleccionado

                                ? "bg-white dark:bg-navy-900 border-blue-500 shadow-2xs font-bold text-blue-950 dark:text-blue-200"

                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"

                            }`}

                          >

                            <input

                              type="checkbox"

                              checked={Boolean(e.seleccionado)}

                              onChange={() => toggleExamen(e.codigo)}

                              className="mt-0.5 rounded accent-blue-600"

                            />

                            <span className="leading-tight">{e.nombre}</span>

                          </label>

                        ))}

                    </div>

                  </div>



                  {/* Grupo Diagnósticos Diferenciales */}

                  <div className="pt-2 border-t border-slate-200/80 dark:border-navy-700">

                    <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">

                      <MdWarning size={15} /> Diagnósticos Diferenciales (Descarte Etiológico)

                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">

                      {examenes

                        .filter((e) => e.categoria === "diferencial")

                        .map((e) => (

                          <label

                            key={e.codigo}

                            className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${

                              e.seleccionado

                                ? "bg-white dark:bg-navy-900 border-amber-500 shadow-2xs font-bold text-amber-950 dark:text-amber-200"

                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"

                            }`}

                          >

                            <input

                              type="checkbox"

                              checked={Boolean(e.seleccionado)}

                              onChange={() => toggleExamen(e.codigo)}

                              className="mt-0.5 rounded accent-amber-600"

                            />

                            <span className="leading-tight">{e.nombre}</span>

                          </label>

                        ))}

                    </div>

                  </div>



                  {/* Grupo Pruebas de Orina y Descarte Ginecológico */}

                  <div className="pt-2 border-t border-slate-200/80 dark:border-navy-700">

                    <h5 className="text-[11px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">

                      <MdScience size={15} /> Pruebas de Orina y Descarte Ginecológico

                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">

                      {examenes

                        .filter((e) => e.categoria === "orina")

                        .map((e) => (

                          <label

                            key={e.codigo}

                            className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${

                              e.seleccionado

                                ? "bg-white dark:bg-navy-900 border-teal-500 shadow-2xs font-bold text-teal-950 dark:text-teal-200"

                                : "bg-white/60 dark:bg-navy-900/60 border-slate-200 dark:border-navy-700 text-slate-600 hover:border-slate-300"

                            }`}

                          >

                            <input

                              type="checkbox"

                              checked={Boolean(e.seleccionado)}

                              onChange={() => toggleExamen(e.codigo)}

                              className="mt-0.5 rounded accent-teal-600"

                            />

                            <span className="leading-tight">{e.nombre}</span>

                          </label>

                        ))}

                    </div>

                  </div>

                </div>

              </div>



              {/* 3. SECCIÓN: INDICACIONES PRE-ANALÍTICAS PARA LA PACIENTE */}

              <div className="space-y-3">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Diagnóstico Presuntivo */}

                  <div>

                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-200 mb-1">

                      Diagnóstico Orientativo / Presuntivo (CIE-10):

                    </label>

                    <input

                      type="text"

                      value={diagnosticoPresuntivo}

                      onChange={(e) => setDiagnosticoPresuntivo(e.target.value)}

                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-indigo-500 font-semibold"

                    />

                  </div>



                  {/* Prioridad */}

                  <div>

                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-200 mb-1">

                      Prioridad de Atención:

                    </label>

                    <select

                      value={prioridad}

                      onChange={(e: any) => setPrioridad(e.target.value)}

                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-indigo-500 font-bold"

                    >

                      <option value="normal">Normal (Estudios de rutina)</option>

                      <option value="preferente">Preferente (Próxima consulta programada)</option>

                      <option value="urgente">Urgente (Sintomatología aguda)</option>

                    </select>

                  </div>

                </div>



                {/* Indicaciones pre-analíticas */}

                <div>

                  <div className="flex items-center justify-between mb-1">

                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-200">

                      Indicaciones de Preparación para la Paciente:

                    </label>

                    <span className="text-[10px] text-slate-400">

                      Se incluirán en el volante impreso para el laboratorio

                    </span>

                  </div>

                  <textarea

                    rows={3}

                    value={indicacionesPreanaliticas}

                    onChange={(e) => setIndicacionesPreanaliticas(e.target.value)}

                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 outline-none focus:border-indigo-500 leading-relaxed font-medium"

                    placeholder="Ayuno, días del ciclo menstrual, preparación vejiga de agua..."

                  />

                </div>

              </div>

            </>

          ) : (

            /* ── PESTAÑA HISTORIAL DE ÓRDENES MÉDICAS ── */

            <div className="space-y-4">

              {cargandoHistorial ? (

                <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">

                  Cargando órdenes médicas previas...

                </div>

              ) : historialOrdenes.length === 0 ? (

                <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-2xl">

                  <span className="text-3xl">📋</span>

                  <p className="text-xs font-bold text-slate-500">

                    Aún no se han emitido órdenes médicas para esta paciente.

                  </p>

                  <button

                    type="button"

                    onClick={() => setTab("nueva")}

                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"

                  >

                    Crear primera orden médica

                  </button>

                </div>

              ) : (

                <div className="space-y-3">

                  {historialOrdenes.map((orden) => (

                    <div

                      key={orden.id}

                      className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-300 transition"

                    >

                      <div className="space-y-1">

                        <div className="flex items-center gap-2 flex-wrap">

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">

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

                          <span

                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${

                              orden.estado === "vigente"

                                ? "bg-emerald-100 text-emerald-800"

                                : "bg-rose-100 text-rose-800"

                            }`}

                          >

                            {orden.estado}

                          </span>

                        </div>



                        <div className="text-xs font-bold text-slate-800 dark:text-white">

                          Ecografía: <span className="font-semibold text-purple-700 dark:text-purple-400 capitalize">{orden.tipo_ecografia.replace("_", " ")}</span> •{" "}

                          Laboratorio: <span className="font-semibold text-indigo-700 dark:text-indigo-400">{orden.examenes_laboratorio.length} exámenes solicitados</span>

                        </div>



                        <p className="text-[11px] text-slate-500 line-clamp-1">

                          Dx: {orden.diagnostico_presuntivo}

                        </p>

                      </div>



                      <div className="flex items-center gap-2 shrink-0">

                        <button

                          type="button"

                          onClick={() => {
                            setOrdenActivaImprimir(orden);
                            handleImprimir(orden);
                          }}

                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm"

                        >

                          <MdPrint size={15} /> Imprimir Volante

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

        <div className="px-6 py-4 bg-slate-50 dark:bg-navy-900 border-t border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3 shrink-0">

          <button

            type="button"

            onClick={onClose}

            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-navy-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"

          >

            Cerrar

          </button>



          {tab === "nueva" && (

            <div className="flex items-center gap-2">

              <button

                type="button"

                onClick={handleGuardarOrden}

                disabled={guardando}

                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition disabled:opacity-50"

              >

                <MdAssignment size={16} />

                {guardando ? "Emitiendo Orden..." : "Emitir y Guardar Orden Médica"}

              </button>

            </div>

          )}

        </div>

      </div>



      {/* ── MODAL VISUALIZADOR DE ORDEN MÉDICA (MINIMALISTA Y COMPACTO) ── */}
      {ordenActivaImprimir && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-2xl max-h-[86vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Barra de herramientas superior compacta (Estilo Tratamiento) */}
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center text-xs font-black">
                  📄
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight">
                    Orden Médica Oficial (A4 / PDF)
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">
                    Orden #{ordenActivaImprimir.id.slice(0, 8).toUpperCase()} • Protocolo SOP
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleImprimir(ordenActivaImprimir)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-purple-700 bg-white hover:bg-purple-50 transition border border-purple-200 shadow-xs"
                >
                  <MdPrint size={14} />
                  <span>Imprimir / Guardar como PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrdenActivaImprimir(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Cerrar vista previa"
                >
                  <MdClose size={16} />
                </button>
              </div>
            </div>

            {/* Hoja Clínica A4 Minimalista en Pantalla */}
            <div className="p-3 sm:p-4 overflow-y-auto bg-slate-50/70 flex justify-center">
              <div id="hoja-orden-medica" className="bg-white w-full rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3 text-slate-800 font-sans text-xs">
                {/* Cabecera Institucional */}
                <div className="border-b border-slate-200 pb-2.5 flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                    <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-tight text-slate-900">
                      CENTRO MÉDICO DE ESPECIALIDADES ENDOCRINOLÓGICAS
                    </h1>
                    <div className="text-[10px] text-purple-700 font-bold mt-0.5">
                      Unidad de Endocrinología Especializada • Sistema SOP-Care
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                      Protocolo Oficial de Diagnóstico y Seguimiento — Consenso de Rotterdam
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-purple-700 font-mono text-[10px] font-bold">
                      ORDEN #{ordenActivaImprimir.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Fecha: {new Date(ordenActivaImprimir.fecha_emision).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                    <div className="mt-0.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                        ordenActivaImprimir.prioridad === "urgente"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : ordenActivaImprimir.prioridad === "alta"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        Prioridad: {ordenActivaImprimir.prioridad}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <h2 className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                    Solicitud de Exámenes de Laboratorio e Imagenología
                  </h2>
                </div>

                {/* Datos de la Paciente (Compacto estilo Tratamiento) */}
                <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/80 space-y-1">
                  <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Datos de Identificación del Paciente
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="col-span-2">
                      <strong className="text-slate-600">Paciente: </strong>
                      <span className="font-bold text-slate-900">{ordenActivaImprimir.paciente_nombre}</span>
                    </div>
                    <div>
                      <strong className="text-slate-600">CI: </strong>
                      <span className="font-semibold text-slate-800">{ordenActivaImprimir.paciente_ci || "—"}</span>
                    </div>
                    <div>
                      <strong className="text-slate-600">Prioridad: </strong>
                      <span className="font-semibold uppercase text-slate-800">{ordenActivaImprimir.prioridad}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-4 text-[10px] text-slate-600 border-t border-slate-200/60 pt-1 mt-0.5">
                      <strong className="text-slate-700">Diagnóstico Presuntivo: </strong>
                      <span>{ordenActivaImprimir.diagnostico_presuntivo}</span>
                    </div>
                  </div>
                </div>

                {/* 1. Estudio de Imagenología */}
                {ordenActivaImprimir.tipo_ecografia !== "ninguna" && (
                  <div className="border border-indigo-100 bg-indigo-50/20 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="text-[9px] font-extrabold uppercase text-indigo-700 tracking-wider">
                      1. Estudio Ecográfico Ovárico (Criterio 3 de Rotterdam)
                    </div>
                    <div className="font-bold text-slate-900 text-[11px]">
                      {ordenActivaImprimir.tipo_ecografia === "transvaginal"
                        ? "Ecografía Transvaginal de Alta Resolución (Gold Standard SOP)"
                        : ordenActivaImprimir.tipo_ecografia === "pelvica_abdominal"
                        ? "Ecografía Pélvica / Abdominal Ginecológica"
                        : "Ecografía Doppler Ovárico Color"}
                    </div>
                    {ordenActivaImprimir.indicacion_ecografia && (
                      <div className="text-slate-600 text-[10px] italic bg-white/70 p-1.5 rounded border border-indigo-100/60 leading-relaxed">
                        <strong className="text-slate-700">Indicación médica: </strong>
                        {ordenActivaImprimir.indicacion_ecografia}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Análisis de Laboratorio Solicitados */}
                {ordenActivaImprimir.examenes_laboratorio.length > 0 && (
                  <div className="border border-purple-100 bg-purple-50/20 rounded-lg p-2.5 text-xs space-y-1.5">
                    <div className="text-[9px] font-extrabold uppercase text-purple-700 tracking-wider flex items-center justify-between">
                      <span>2. Análisis de Laboratorio Solicitados</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 text-purple-700 font-bold">
                        {ordenActivaImprimir.examenes_laboratorio.length} análisis
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      {ordenActivaImprimir.examenes_laboratorio.map((e, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 py-0.5">
                          <span className="text-purple-600 font-bold text-[10px]">✓</span>
                          <span className="text-slate-800 font-medium leading-tight">{e.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Indicaciones Pre-analíticas */}
                {ordenActivaImprimir.indicaciones_preanaliticas && (
                  <div className="border border-amber-200/80 bg-amber-50/40 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="text-[9px] font-extrabold uppercase text-amber-800 tracking-wider">
                      Indicaciones Pre-analíticas de Preparación
                    </div>
                    <p className="text-slate-700 whitespace-pre-line text-[10px] leading-relaxed">
                      {ordenActivaImprimir.indicaciones_preanaliticas}
                    </p>
                  </div>
                )}

                {/* Pie con Sello Digital y Firma Médica */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-2.5">
                  <div className="border border-dashed border-slate-300 bg-slate-50/80 rounded-md p-1.5 text-[9px] font-mono text-slate-500 space-y-0.5 max-w-xs">
                    <div className="font-bold text-slate-700">DOCUMENTO MÉDICO AUTORIZADO</div>
                    <div>Hash: {ordenActivaImprimir.id.replace(/-/g, "").slice(0, 16)}...</div>
                    <div className="text-[8px] text-slate-400">Firma digital validada en expediente clínico SOP</div>
                  </div>

                  <div className="text-center w-48 border-t border-slate-400 pt-1 text-[11px]">
                    <strong className="block text-slate-900 leading-tight">{ordenActivaImprimir.medico_nombre}</strong>
                    <div className="text-[10px] text-slate-600">Médico Especialista en Endocrinología</div>
                    <div className="font-mono text-[9px] text-slate-400">{ordenActivaImprimir.medico_matricula}</div>
                    <div className="text-[8px] text-slate-400 mt-0.5">Firma y Sello Oficial</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

</div>

  );

};



export default ModalOrdenMedica;

