import React, { useState, useEffect, useMemo } from "react";
import {
  MdAdd,
  MdDelete,
  MdPrint,
  MdCheckCircle,
  MdArrowForward,
  MdArrowBack,
  MdClose,
  MdSave,
  MdCheck,
  MdMedicalServices,
  MdMedication,
  MdPerson,
  MdSearch,
} from "react-icons/md";
import {
  PacienteListItem,
  listarPacientes,
  obtenerTratamientoPaciente,
  guardarPlanTratamiento,
  guardarDatosClinicos,
  obtenerUltimosDatosClinicosPaciente,
  PlanTratamientoIn,
  MedicacionItem,
} from "services/api";

interface TratamientoTabProps {
  paciente: PacienteListItem | null;
  onNavigateToTab?: (tab: string) => void;
  onSelectPaciente?: (p: PacienteListItem) => void;
}

/**
 * Entidad correspondiente a la tabla `tratamiento`:
 * - id: uuid
 * - paciente_id: uuid (campo agregado en BD)
 * - cita_id: uuid
 * - descripcion: text
 * - tipo: text
 * - objetivo: text
 * - duracion_semanas: int4
 * - activo: bool
 * - observaciones: text
 */
interface TratamientoPlan {
  id?: string;
  paciente_id?: string;
  tipo: string;
  objetivo: string;
  duracion_semanas: number;
  descripcion: string;
  observaciones: string;
  activo: boolean;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Funciones clínicas auxiliares para cálculo automático de fin según meses prescritos
function calcularFechaFinPorMeses(fechaInicioStr: string, meses: number): string {
  try {
    const [año, mes, dia] = (fechaInicioStr || formatLocalDate(new Date()))
      .split("-")
      .map(Number);
    const fecha = new Date(año, mes - 1, dia);
    fecha.setMonth(fecha.getMonth() + (meses || 1));
    const a = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${a}-${m}-${d}`;
  } catch {
    const d = new Date();
    d.setMonth(d.getMonth() + (meses || 1));
    const a = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${a}-${m}-${day}`;
  }
}

function formatearFechaBonita(fechaStr: string): string {
  if (!fechaStr) return "";
  try {
    const [año, mes, dia] = fechaStr.split("-").map(Number);
    const d = new Date(año, mes - 1, dia);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fechaStr;
  }
}

// Clasificación semafórica de la OMS para el Índice de Masa Corporal
function obtenerEstiloImc(imc: number | null): {
  categoria: string;
  badgeClass: string;
  containerClass: string;
} {
  if (!imc || isNaN(imc) || imc <= 0) {
    return {
      categoria: "Sin calcular",
      badgeClass: "bg-slate-100 text-slate-600",
      containerClass: "bg-slate-50 border-slate-200/80",
    };
  }
  if (imc < 18.5) {
    return {
      categoria: "Bajo Peso (<18.5)",
      badgeClass: "bg-sky-100 text-sky-800 border border-sky-300",
      containerClass: "bg-sky-50/50 border-sky-300",
    };
  }
  if (imc < 25.0) {
    return {
      categoria: "Normopeso (18.5 - 24.9)",
      badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-300",
      containerClass: "bg-emerald-50/50 border-emerald-300",
    };
  }
  if (imc < 30.0) {
    return {
      categoria: "Sobrepeso (25 - 29.9)",
      badgeClass: "bg-amber-100 text-amber-800 border border-amber-300",
      containerClass: "bg-amber-50/50 border-amber-300",
    };
  }
  return {
    categoria: "Obesidad (≥30)",
    badgeClass: "bg-rose-100 text-rose-800 border border-rose-300",
    containerClass: "bg-rose-50/50 border-rose-300",
  };
}

// Vademécum de referencia clínica para autocompletado rápido
const VADEMECUM_SOP_PRESETS = [
  {
    nombre: "Etinilestradiol 30 mcg + Dienogest 2 mg (Comp. Recubiertos)",
    dosis: "1 comprimido (30 mcg / 2 mg)",
    frecuencia: "Cada 24 horas (en la noche), durante 21 días (descanso 7 días)",
    via_administracion: "Oral",
    duracion_meses: 6,
    duracion_semanas: 24,
    indicaciones_especiales:
      "Tomar a la misma hora en la noche. No suspender sin indicación médica.",
    categoria: "Anticonceptivo Antiandrogénico",
  },
  {
    nombre: "Metformina Clorhidrato LP 850 mg (Liberación Prolongada)",
    dosis: "1 comprimido (850 mg)",
    frecuencia: "1 comp/noche x 7 días, luego 1 comp c/12 horas",
    via_administracion: "Oral",
    duracion_meses: 3,
    duracion_semanas: 12,
    indicaciones_especiales:
      "Ingerir siempre junto con los alimentos principales para minimizar efectos gastrointestinales.",
    categoria: "Sensibilizador de Insulina",
  },
  {
    nombre: "Espironolactona 50 mg (Comp. Recubiertos)",
    dosis: "1 comprimido (50 mg)",
    frecuencia: "1 comprimido diario en el desayuno",
    via_administracion: "Oral",
    duracion_meses: 3,
    duracion_semanas: 12,
    indicaciones_especiales:
      "Bloqueador del receptor androgénico para reducción de hirsutismo y acné. Monitorear electrolitos.",
    categoria: "Antiandrógeno Periférico",
  },
  {
    nombre: "Mio-Inositol 2000 mg + D-Chiro-Inositol 50 mg (Ratio 40:1)",
    dosis: "1 sobre disuelto en agua",
    frecuencia: "Cada 12 horas (en ayunas y antes de la cena)",
    via_administracion: "Oral",
    duracion_meses: 6,
    duracion_semanas: 24,
    indicaciones_especiales:
      "Optimiza la calidad ovocitaria y la regularidad del ciclo menstrual mediante segunda mensajería.",
    categoria: "Nutracéutico Ovulatorio",
  },
  {
    nombre: "Letrozol 2.5 mg (Comp. Recubiertos)",
    dosis: "1 comprimido (2.5 mg)",
    frecuencia: "1 comprimido cada 24 horas del día 3 al día 7 del ciclo menstrual",
    via_administracion: "Oral",
    duracion_meses: 1,
    duracion_semanas: 4,
    indicaciones_especiales:
      "Inducción ovulatoria de primera línea en deseo reproductivo. Seguimiento folicular ecográfico día 11.",
    categoria: "Inductor de Ovulación",
  },
  {
    nombre: "Dydrogesterona 10 mg (Comp. Recubiertos)",
    dosis: "1 comprimido (10 mg)",
    frecuencia: "1 comprimido cada 12 horas del día 14 al día 25 del ciclo",
    via_administracion: "Oral",
    duracion_meses: 3,
    duracion_semanas: 12,
    indicaciones_especiales:
      "Protección endometrial y regularización del sangrado por privación.",
    categoria: "Progestágeno Cíclico",
  },
];

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function TratamientoTab({
  paciente,
  onNavigateToTab,
  onSelectPaciente,
}: TratamientoTabProps) {
  // Selector de pacientes
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [busquedaPaciente, setBusquedaPaciente] = useState<string>("");
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState<boolean>(false);
  const [pacienteActual, setPacienteActual] = useState<PacienteListItem | null>(paciente);

  useEffect(() => {
    if (paciente) {
      setPacienteActual(paciente);
    }
  }, [paciente]);

  useEffect(() => {
    listarPacientes(undefined, true, 1, 100)
      .then((data) => setPacientes(data))
      .catch((err) => console.error("Error al cargar pacientes en Tratamiento:", err));
  }, []);

  const targetPaciente = pacienteActual || paciente;

  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente.trim()) return pacientes;
    const q = busquedaPaciente.toLowerCase();
    return pacientes.filter((p) => {
      const nombreCompleto = `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.toLowerCase();
      const ci = (p.ci || "").toLowerCase();
      return nombreCompleto.includes(q) || ci.includes(q);
    });
  }, [pacientes, busquedaPaciente]);

  const handleElegirPaciente = (p: PacienteListItem) => {
    setPacienteActual(p);
    setDropdownPacienteAbierto(false);
    setBusquedaPaciente("");
    if (onSelectPaciente) {
      onSelectPaciente(p);
    }
  };
  const fechaHoy = formatLocalDate(new Date());
  const fechaFinSem24 = calcularFechaFinPorMeses(fechaHoy, 6);

  // Paso actual del flujo: 1 = Fármacos (Medicación), 2 = Plan General (Tratamiento)
  const [pasoActual, setPasoActual] = useState<1 | 2>(1);

  // Estados de carga y guardado del backend
  const [cargandoTratamiento, setCargandoTratamiento] = useState(false);
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  // ── ESTADO TABLA TRATAMIENTO ───────────────────────────────────────────────
  const [tratamientoPlan, setTratamientoPlan] = useState<TratamientoPlan>({
    paciente_id: targetPaciente?.id || "",
    tipo: "Combinado (Farmacológico y Estilo de Vida)",
    objetivo: "Regulación ovulatoria y control hiperandrogénico",
    duracion_semanas: 24,
    activo: true,
    descripcion:
      "Terapia combinada para SOP: regulación del ciclo menstrual, bloqueo de hiperandrogenismo clínico y optimización metabólica periférica.",
    observaciones:
      "Recomendación de actividad física aeróbica 150 min/semana y patrón dietético antiinflamatorio de bajo índice glucémico. Control analítico en 12 semanas.",
  });

  // ── ESTADO TABLA MEDICACION (CONECTADO AL BACKEND - SIN DATOS SIMULADOS FIJOS) ──
  const [medicaciones, setMedicaciones] = useState<MedicacionItem[]>([]);

  // ── ESTADO SIGNOS VITALES Y SOMATOMETRÍA POR CITA/CONSULTA ───────────────
  const [vitals, setVitals] = useState({
    peso_kg: "" as number | "",
    talla_cm: "" as number | "",
    frecuencia_cardiaca: "" as number | "",
    presion_sistolica: "" as number | "",
    presion_diastolica: "" as number | "",
  });
  const [signosGuardadosHoy, setSignosGuardadosHoy] = useState(false);

  // Cálculo de IMC automático en tiempo real
  const imcCalculado = useMemo(() => {
    const p = Number(vitals.peso_kg);
    const t = Number(vitals.talla_cm);
    if (p > 0 && t > 0) {
      const t_m = t / 100;
      return +(p / (t_m * t_m)).toFixed(2);
    }
    return null;
  }, [vitals.peso_kg, vitals.talla_cm]);

  const handleCambioVitals = (campo: string, valor: string) => {
    setVitals((prev) => ({
      ...prev,
      [campo]: valor === "" ? "" : Number(valor),
    }));
  };

  // Cargar plan, medicamentos y signos vitales reales desde Supabase
  useEffect(() => {
    if (!targetPaciente?.id) return;
    setCargandoTratamiento(true);

    // Cargar tratamiento y medicamentos
    obtenerTratamientoPaciente(targetPaciente.id)
      .then((data) => {
        if (data) {
          setTratamientoPlan({
            id: data.id,
            paciente_id: data.paciente_id,
            tipo: data.tipo || "Combinado (Farmacológico y Estilo de Vida)",
            objetivo: data.objetivo || "Regulación ovulatoria y control hiperandrogénico",
            duracion_semanas: data.duracion_semanas || 24,
            activo: data.activo !== false,
            descripcion: data.descripcion || "",
            observaciones: data.observaciones || "",
          });
          if (data.medicaciones && Array.isArray(data.medicaciones)) {
            setMedicaciones(data.medicaciones);
          } else {
            setMedicaciones([]);
          }
        } else {
          setMedicaciones([]);
        }
      })
      .catch((err) => {
        console.warn("No se pudo cargar el plan previo:", err);
      })
      .finally(() => {
        setCargandoTratamiento(false);
      });

    // Cargar últimos signos vitales registrados
    obtenerUltimosDatosClinicosPaciente(targetPaciente.id)
      .then((dc) => {
        if (dc) {
          setVitals({
            peso_kg: dc.peso_kg !== undefined && dc.peso_kg !== null ? dc.peso_kg : "",
            talla_cm: dc.talla_cm !== undefined && dc.talla_cm !== null ? dc.talla_cm : "",
            frecuencia_cardiaca:
              dc.frecuencia_cardiaca !== undefined && dc.frecuencia_cardiaca !== null
                ? dc.frecuencia_cardiaca
                : "",
            presion_sistolica:
              dc.presion_sistolica !== undefined && dc.presion_sistolica !== null
                ? dc.presion_sistolica
                : "",
            presion_diastolica:
              dc.presion_diastolica !== undefined && dc.presion_diastolica !== null
                ? dc.presion_diastolica
                : "",
          });
          setSignosGuardadosHoy(true);
        }
      })
      .catch((e) => console.warn("No se pudieron cargar signos vitales previos:", e));
  }, [targetPaciente?.id]);

  // Modal para prescribir nuevo medicamento (sin campos duplicados)
  const [modalNuevoMedicamento, setModalNuevoMedicamento] = useState(false);
  const [modoEntrada, setModoEntrada] = useState<"preset" | "personalizado">("preset");
  const [nuevoMed, setNuevoMed] = useState({
    nombre_medicamento: VADEMECUM_SOP_PRESETS[0].nombre,
    dosis: VADEMECUM_SOP_PRESETS[0].dosis,
    frecuencia: VADEMECUM_SOP_PRESETS[0].frecuencia,
    via_administracion: VADEMECUM_SOP_PRESETS[0].via_administracion,
    duracion_meses: VADEMECUM_SOP_PRESETS[0].duracion_meses || 6,
    duracion_semanas: VADEMECUM_SOP_PRESETS[0].duracion_semanas,
    fecha_inicio: fechaHoy,
    fecha_fin: fechaFinSem24,
    indicaciones_especiales: VADEMECUM_SOP_PRESETS[0].indicaciones_especiales,
    categoria: VADEMECUM_SOP_PRESETS[0].categoria,
  });

  // Modal de Receta Imprimible
  const [modalRecetaImprimir, setModalRecetaImprimir] = useState(false);
  const [toastExito, setToastExito] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToastExito({ msg, tipo });
    setTimeout(() => setToastExito(null), 3500);
  };

  // Cambio de duración en meses (calcula automáticamente fecha_fin)
  const handleCambiarDuracionMeses = (meses: number) => {
    const finCalculado = calcularFechaFinPorMeses(nuevoMed.fecha_inicio, meses);
    setNuevoMed((prev) => ({
      ...prev,
      duracion_meses: meses,
      fecha_fin: finCalculado,
    }));
  };

  // Cambio de fecha de inicio (recalcula automáticamente fecha_fin)
  const handleCambiarFechaInicio = (inicio: string) => {
    const finCalculado = calcularFechaFinPorMeses(inicio, nuevoMed.duracion_meses);
    setNuevoMed((prev) => ({
      ...prev,
      fecha_inicio: inicio,
      fecha_fin: finCalculado,
    }));
  };

  // Al seleccionar del menú del vademécum
  const handleSeleccionarPreset = (nombreSeleccionado: string) => {
    if (nombreSeleccionado === "otro") {
      setModoEntrada("personalizado");
      setNuevoMed((prev) => ({
        ...prev,
        nombre_medicamento: "",
        dosis: "",
        frecuencia: "",
        duracion_meses: 3,
        fecha_fin: calcularFechaFinPorMeses(prev.fecha_inicio, 3),
        indicaciones_especiales: "",
        categoria: "Fármaco Personalizado",
      }));
      return;
    }

    const encontrado = VADEMECUM_SOP_PRESETS.find((v) => v.nombre === nombreSeleccionado);
    if (encontrado) {
      const meses = encontrado.duracion_meses || 3;
      const fechaFinCalculada = calcularFechaFinPorMeses(fechaHoy, meses);

      setNuevoMed({
        nombre_medicamento: encontrado.nombre,
        dosis: encontrado.dosis,
        frecuencia: encontrado.frecuencia,
        via_administracion: encontrado.via_administracion,
        duracion_meses: meses,
        duracion_semanas: encontrado.duracion_semanas,
        fecha_inicio: fechaHoy,
        fecha_fin: fechaFinCalculada,
        indicaciones_especiales: encontrado.indicaciones_especiales,
        categoria: encontrado.categoria,
      });
    }
  };

  // Agregar fármaco a la lista de prescripciones
  const handleAgregarMedicamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMed.nombre_medicamento.trim()) {
      alert("Por favor ingrese o seleccione el nombre del medicamento");
      return;
    }

    const item: MedicacionItem = {
      id: `med-${Date.now()}`,
      nombre_medicamento: nuevoMed.nombre_medicamento,
      dosis: nuevoMed.dosis,
      frecuencia: nuevoMed.frecuencia,
      via_administracion: nuevoMed.via_administracion || "Oral",
      duracion_meses: nuevoMed.duracion_meses,
      fecha_inicio: nuevoMed.fecha_inicio,
      fecha_fin: nuevoMed.fecha_fin,
      indicaciones_especiales: nuevoMed.indicaciones_especiales,
      activo: true,
      categoria: nuevoMed.categoria,
    };

    setMedicaciones([...medicaciones, item]);
    setModalNuevoMedicamento(false);
    showToast("Medicamento incorporado a la prescripción de la paciente.");
  };

  const handleEliminarMedicamento = (idMed: string) => {
    setMedicaciones(medicaciones.filter((m) => m.id !== idMed));
    showToast("Fármaco retirado de la prescripción.");
  };

  const handleGuardarPlanCompleto = async () => {
    if (!targetPaciente?.id) {
      showToast("Seleccione un paciente para guardar el plan.", "error");
      return;
    }
    setGuardandoPlan(true);
    try {
      // 1. Guardar o actualizar signos vitales obligatorios de la consulta (peso, talla, imc, pulso, presión)
      const pNum = vitals.peso_kg !== "" ? Number(vitals.peso_kg) : undefined;
      const tNum = vitals.talla_cm !== "" ? Number(vitals.talla_cm) : undefined;
      const fcNum = vitals.frecuencia_cardiaca !== "" ? Number(vitals.frecuencia_cardiaca) : undefined;
      const psNum = vitals.presion_sistolica !== "" ? Number(vitals.presion_sistolica) : undefined;
      const pdNum = vitals.presion_diastolica !== "" ? Number(vitals.presion_diastolica) : undefined;

      if (pNum !== undefined || tNum !== undefined || fcNum !== undefined || psNum !== undefined) {
        try {
          await guardarDatosClinicos({
            paciente_id: targetPaciente.id,
            peso_kg: pNum,
            talla_cm: tNum,
            imc: imcCalculado !== null ? imcCalculado : undefined,
            frecuencia_cardiaca: fcNum,
            presion_sistolica: psNum,
            presion_diastolica: pdNum,
          });
          setSignosGuardadosHoy(true);
        } catch (errVitals) {
          console.warn("Aviso al sincronizar signos vitales:", errVitals);
        }
      }

      // 2. Guardar el Plan de Tratamiento y Prescripciones Farmacológicas (vinculando la cita médica)
      const payload: PlanTratamientoIn = {
        paciente_id: targetPaciente.id,
        tipo: tratamientoPlan.tipo,
        duracion_semanas: tratamientoPlan.duracion_semanas,
        objetivo: tratamientoPlan.objetivo,
        descripcion: tratamientoPlan.descripcion,
        observaciones: tratamientoPlan.observaciones,
        activo: tratamientoPlan.activo,
        medicaciones: medicaciones.map((m) => ({
          nombre_medicamento: m.nombre_medicamento,
          dosis: m.dosis,
          frecuencia: m.frecuencia,
          via_administracion: m.via_administracion || "Oral",
          fecha_inicio: m.fecha_inicio || undefined,
          fecha_fin: m.fecha_fin || undefined,
          activo: m.activo !== false,
          indicaciones_especiales: m.indicaciones_especiales || undefined,
        })),
      };

      const res = await guardarPlanTratamiento(payload);
      if (res) {
        if (res.id) {
          setTratamientoPlan((prev) => ({ ...prev, id: res.id }));
        }
        if (res.medicaciones && Array.isArray(res.medicaciones)) {
          setMedicaciones(res.medicaciones);
        }
      }
      showToast("Plan terapéutico, prescripciones y signos vitales guardados exitosamente.");
    } catch (err: any) {
      console.error("Error al guardar plan de tratamiento:", err);
      showToast("Error al guardar el plan de tratamiento en el servidor.", "error");
    } finally {
      setGuardandoPlan(false);
    }
  };

  const nombrePaciente = targetPaciente
    ? `${targetPaciente.nombre} ${targetPaciente.primer_apellido} ${targetPaciente.segundo_apellido || ""}`
    : "Paciente en Consulta";
  const ciPaciente = targetPaciente?.ci || "—";
  const iniciales = targetPaciente
    ? `${targetPaciente.nombre.charAt(0)}${targetPaciente.primer_apellido.charAt(0)}`
    : "TR";
  const edad = targetPaciente?.fecha_nacimiento ? calcularEdad(targetPaciente.fecha_nacimiento) : null;

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastExito && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
            toastExito.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <MdCheckCircle size={20} />
          {toastExito.msg}
        </div>
      )}

      {/* ── ENCABEZADO MÉDICO UNIFICADO (PLAN TERAPÉUTICO) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Plan Terapéutico y Farmacología
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Expediente: <strong className="text-slate-800">CI {ciPaciente}</strong>
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
          {/* Selector de Paciente */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownPacienteAbierto(!dropdownPacienteAbierto)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200 shadow-sm"
            >
              <MdPerson size={16} />
              <span>{targetPaciente ? "Cambiar Paciente" : "Seleccionar Paciente"}</span>
            </button>

            {dropdownPacienteAbierto && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-fade-in-up">
                <div className="relative mb-1">
                  <MdSearch className="absolute left-2.5 top-2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar paciente por nombre o CI..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-purple-500 text-slate-800"
                    autoFocus
                  />
                </div>

                {pacientesFiltrados.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                    No se encontraron pacientes
                  </div>
                ) : (
                  pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleElegirPaciente(p)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                        targetPaciente?.id === p.id
                          ? "bg-purple-50 text-purple-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{`${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">CI: {p.ci || "—"}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModalRecetaImprimir(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm"
          >
            <MdPrint size={16} />
            <span>Imprimir Receta Médica</span>
          </button>

          <button
            type="button"
            onClick={handleGuardarPlanCompleto}
            disabled={guardandoPlan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-600/20 disabled:opacity-50"
          >
            <MdSave size={16} />
            <span>{guardandoPlan ? "Guardando Plan..." : "Guardar Plan"}</span>
          </button>
        </div>
      </div>

      {/* ── BARRA STEPPER DE NAVEGACIÓN PASO A PASO ── */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/90 shadow-sm flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPasoActual(1)}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-sm font-black transition-all ${
            pasoActual === 1
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
              pasoActual === 1 ? "bg-white text-purple-700" : "bg-slate-200 text-slate-600"
            }`}
          >
            1
          </span>
          <span className="truncate">Paso 1: Prescripción de Fármacos ({medicaciones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setPasoActual(2)}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-sm font-black transition-all ${
            pasoActual === 2
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
              pasoActual === 2 ? "bg-white text-purple-700" : "bg-slate-200 text-slate-600"
            }`}
          >
            2
          </span>
          <span className="truncate">Paso 2: Plan Terapéutico General (Opcional)</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PASO 1: PARRILLA DE FÁRMACOS PRESCRITOS (TABLA MEDICACION)
         ═══════════════════════════════════════════════════════════════════════ */}
      {pasoActual === 1 && (
        <div className="space-y-4">
          {/* ── SECCIÓN DE SIGNOS VITALES Y SOMATOMETRÍA DE LA CONSULTA ── */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-black shadow-2xs">
                  🫀
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>Signos Vitales y Somatometría</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                      Requerido por Cita
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Control obligatorio de peso, talla, IMC en tiempo real, frecuencia cardíaca y tensión arterial
                  </p>
                </div>
              </div>

              {signosGuardadosHoy && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1 self-start sm:self-auto shadow-2xs">
                  <MdCheck size={15} /> Sincronizado en consulta
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
              {/* Peso */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 focus-within:border-purple-400 focus-within:bg-white transition">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Peso (kg) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Báscula</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    placeholder="Ej: 64.5"
                    value={vitals.peso_kg}
                    onChange={(e) => handleCambioVitals("peso_kg", e.target.value)}
                    className="w-full text-base font-black text-slate-900 bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">kg</span>
                </div>
              </div>

              {/* Talla */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 focus-within:border-purple-400 focus-within:bg-white transition">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Talla (cm) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Estatura</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="80"
                    max="230"
                    placeholder="Ej: 162"
                    value={vitals.talla_cm}
                    onChange={(e) => handleCambioVitals("talla_cm", e.target.value)}
                    className="w-full text-base font-black text-slate-900 bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">cm</span>
                </div>
              </div>

              {/* IMC Calculado en Tiempo Real */}
              <div className={`p-3.5 rounded-2xl border space-y-1.5 transition ${obtenerEstiloImc(imcCalculado).containerClass}`}>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>IMC Calculado</span>
                  <span className="text-[10px] font-bold text-purple-700">Auto</span>
                </label>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base font-black text-slate-900">
                    {imcCalculado ? `${imcCalculado} kg/m²` : "—"}
                  </span>
                  {imcCalculado && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${obtenerEstiloImc(imcCalculado).badgeClass}`}>
                      {obtenerEstiloImc(imcCalculado).categoria}
                    </span>
                  )}
                </div>
              </div>

              {/* Frecuencia Cardíaca */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 focus-within:border-emerald-400 focus-within:bg-white transition">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Frec. Cardíaca *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Pulso</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="30"
                    max="220"
                    placeholder="Ej: 74"
                    value={vitals.frecuencia_cardiaca}
                    onChange={(e) => handleCambioVitals("frecuencia_cardiaca", e.target.value)}
                    className="w-full text-base font-black text-slate-900 bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">lpm</span>
                </div>
                {vitals.frecuencia_cardiaca && (
                  <span className="text-[10px] font-bold text-slate-500 block truncate">
                    {Number(vitals.frecuencia_cardiaca) < 60
                      ? "⚠️ Bradicardia (<60)"
                      : Number(vitals.frecuencia_cardiaca) <= 100
                      ? "✓ Normal (60-100)"
                      : "⚠️ Taquicardia (>100)"}
                  </span>
                )}
              </div>

              {/* Presión Arterial */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 focus-within:border-purple-400 focus-within:bg-white transition">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Presión Arterial</span>
                  <span className="text-[10px] text-slate-400 font-normal">Sist / Diast</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="120"
                    min="50"
                    max="250"
                    value={vitals.presion_sistolica}
                    onChange={(e) => handleCambioVitals("presion_sistolica", e.target.value)}
                    className="w-12 text-sm font-black text-slate-900 bg-transparent outline-none text-center border-b border-slate-300"
                  />
                  <span className="font-bold text-slate-400">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    min="30"
                    max="150"
                    value={vitals.presion_diastolica}
                    onChange={(e) => handleCambioVitals("presion_diastolica", e.target.value)}
                    className="w-12 text-sm font-black text-slate-900 bg-transparent outline-none text-center border-b border-slate-300"
                  />
                  <span className="text-[11px] font-bold text-slate-400">mmHg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Parrilla de Medicación Activa
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Fármacos, posología, vía de administración y vigencia terapéutica
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalNuevoMedicamento(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-600/20 self-start sm:self-auto"
              >
                <MdAdd size={20} />
                <span>+ Añadir Medicación</span>
              </button>
            </div>

            {/* Listado de Medicamentos */}
            {cargandoTratamiento ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-600">
                  Cargando prescripciones médicas de la paciente...
                </p>
              </div>
            ) : medicaciones.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <MdMedication size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">
                    No hay medicamentos prescritos en este plan terapéutico.
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Haga clic en "+ Añadir Medicación" para prescribir fármacos del vademécum SOP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevoMedicamento(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200"
                >
                  Prescribir Primer Fármaco
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {medicaciones.map((med, idx) => (
                  <div
                    key={med.id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/90 transition shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-slate-900">
                            {med.nombre_medicamento}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Vía {med.via_administracion || "Oral"}
                          </span>
                        </div>
                        <p className="text-sm text-purple-900 font-extrabold pl-9">
                          Dosis: {med.dosis} • {med.frecuencia}
                        </p>
                      </div>

                      <button
                        type="button"
                        title="Quitar fármaco"
                        onClick={() => handleEliminarMedicamento(med.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition self-end sm:self-auto flex-shrink-0"
                      >
                        <MdDelete size={18} />
                      </button>
                    </div>

                    <div className="pl-9 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200/60 font-medium items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500">Duración:</span>
                        <span className="px-2.5 py-1 rounded-lg font-black text-purple-700 bg-purple-50 border border-purple-200 text-xs">
                          ⏱️ {med.duracion_meses || 3} {(med.duracion_meses || 3) === 1 ? "mes" : "meses"}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500">Vigencia:</span>{" "}
                        <span className="font-bold text-slate-800">
                          {formatearFechaBonita(med.fecha_inicio)} al {formatearFechaBonita(med.fecha_fin)}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500">Indicaciones:</span>{" "}
                        {med.indicaciones_especiales || "Sin indicaciones adicionales"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón para avanzar o saltar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs sm:text-sm text-slate-500 font-semibold">
              Puede saltar el paso 2 si solo requiere la prescripción farmacológica.
            </span>
            <button
              type="button"
              onClick={() => setPasoActual(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200 shadow-sm"
            >
              <span>Continuar a Plan Terapéutico General</span>
              <MdArrowForward size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PASO 2: PLAN TERAPÉUTICO GENERAL (TABLA TRATAMIENTO)
         ═══════════════════════════════════════════════════════════════════════ */}
      {pasoActual === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                Plan Terapéutico General (Tabla tratamiento)
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                Definición integral del objetivo clínico, duración y recomendaciones de estilo de vida
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Tipo de Plan Terapéutico (tipo):
                  </label>
                  <select
                    value={tratamientoPlan.tipo}
                    onChange={(e) =>
                      setTratamientoPlan({ ...tratamientoPlan, tipo: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  >
                    <option value="Combinado (Farmacológico y Estilo de Vida)">
                      Combinado (Farmacológico y Estilo de Vida)
                    </option>
                    <option value="Farmacológico Exclusivo">Farmacológico Exclusivo</option>
                    <option value="Terapia Nutricional y Estilo de Vida">
                      Terapia Nutricional y Estilo de Vida
                    </option>
                    <option value="Inducción Ovulatoria (Fertilidad)">
                      Inducción Ovulatoria (Fertilidad)
                    </option>
                    <option value="Terapia de Mantenimiento">Terapia de Mantenimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Objetivo Principal (objetivo):
                  </label>
                  <input
                    type="text"
                    value={tratamientoPlan.objetivo}
                    onChange={(e) =>
                      setTratamientoPlan({ ...tratamientoPlan, objetivo: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                    placeholder="Ej: Regulación ovulatoria y control hiperandrogénico"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Duración Estimada (duracion_semanas):
                  </label>
                  <select
                    value={tratamientoPlan.duracion_semanas}
                    onChange={(e) =>
                      setTratamientoPlan({
                        ...tratamientoPlan,
                        duracion_semanas: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  >
                    <option value={4}>4 Semanas (1 Mes)</option>
                    <option value={8}>8 Semanas (2 Meses)</option>
                    <option value={12}>12 Semanas (3 Meses)</option>
                    <option value={24}>24 Semanas (6 Meses)</option>
                    <option value={36}>36 Semanas (9 Meses)</option>
                    <option value={48}>48 Semanas (1 Año)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Descripción Clínica del Plan (descripcion):
                </label>
                <textarea
                  rows={3}
                  value={tratamientoPlan.descripcion}
                  onChange={(e) =>
                    setTratamientoPlan({ ...tratamientoPlan, descripcion: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm font-medium text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  placeholder="Detalle el enfoque terapéutico global para la paciente..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Observaciones, Estilo de Vida y Nutrición (observaciones):
                </label>
                <textarea
                  rows={3}
                  value={tratamientoPlan.observaciones}
                  onChange={(e) =>
                    setTratamientoPlan({ ...tratamientoPlan, observaciones: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm font-medium text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  placeholder="Recomendaciones dietéticas, ejercicio físico, signos de alarma o fecha del próximo control..."
                />
              </div>
            </div>
          </div>

          {/* Navegación y Guardado */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setPasoActual(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm"
            >
              <MdArrowBack size={18} />
              <span>Volver a Prescripción de Fármacos</span>
            </button>

            <button
              type="button"
              onClick={handleGuardarPlanCompleto}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-600/30"
            >
              <MdSave size={18} />
              <span>Guardar Plan Terapéutico Completo</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: AÑADIR NUEVO MEDICAMENTO (SIN CAMPOS REPETIDOS) ── */}
      {modalNuevoMedicamento && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-purple-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <MdMedicalServices size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Añadir Fármaco a la Prescripción
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {nombrePaciente} • CI: {ciPaciente}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoMedicamento(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleAgregarMedicamento} className="space-y-4">
              {/* Selector de Modo: Vademécum vs Personalizado */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setModoEntrada("preset");
                    handleSeleccionarPreset(VADEMECUM_SOP_PRESETS[0].nombre);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                    modoEntrada === "preset"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  💊 Medicación Frecuentes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoEntrada("personalizado");
                    setNuevoMed((prev) => ({
                      ...prev,
                      nombre_medicamento: "",
                      dosis: "",
                      frecuencia: "",
                      indicaciones_especiales: "",
                      categoria: "Fármaco Personalizado",
                    }));
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                    modoEntrada === "personalizado"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✍️ Escribir Fármaco Nuevo
                </button>
              </div>

              {/* Si es Preset: Dropdown con opción de escribir otro */}
              {modoEntrada === "preset" ? (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Seleccione el Medicamento:
                  </label>
                  <select
                    value={nuevoMed.nombre_medicamento}
                    onChange={(e) => handleSeleccionarPreset(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer shadow-sm"
                  >
                    <optgroup label="── Medicamentos de Referencia SOP ──">
                      {VADEMECUM_SOP_PRESETS.map((v, i) => (
                        <option key={i} value={v.nombre}>
                          {v.nombre}
                        </option>
                      ))}
                    </optgroup>
                    <option value="otro">✍️ Escribir otro medicamento personalizado...</option>
                  </select>
                </div>
              ) : (
                /* Si es Personalizado: Campo de texto libre para cualquier medicamento */
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Nombre del Medicamento:
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoMed.nombre_medicamento}
                    onChange={(e) =>
                      setNuevoMed({ ...nuevoMed, nombre_medicamento: e.target.value })
                    }
                    placeholder="Ej: Levotiroxina 50 mcg, Ciproterona + Etinilestradiol, etc."
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  />
                </div>
              )}

              {/* Dosis y Frecuencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Dosis:
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoMed.dosis}
                    onChange={(e) => setNuevoMed({ ...nuevoMed, dosis: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                    placeholder="Ej: 1 comprimido (850 mg)"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Frecuencia / Posología:
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoMed.frecuencia}
                    onChange={(e) =>
                      setNuevoMed({ ...nuevoMed, frecuencia: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                    placeholder="Ej: Cada 12 horas con las comidas"
                  />
                </div>
              </div>

              {/* Vía de Administración y Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Vía:
                  </label>
                  <select
                    value={nuevoMed.via_administracion}
                    onChange={(e) =>
                      setNuevoMed({ ...nuevoMed, via_administracion: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer shadow-sm"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Tópica">Tópica</option>
                    <option value="Transdérmica">Transdérmica</option>
                    <option value="Subcutánea">Subcutánea</option>
                    <option value="Vaginal">Vaginal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoMed.fecha_inicio}
                    onChange={(e) => handleCambiarFechaInicio(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  />
                  <span className="text-xs text-slate-400 font-medium block mt-1">
                    Inicio de la toma
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-purple-900 mb-1 flex items-center justify-between">
                    <span>Duración:</span>
                  </label>
                  <select
                    value={nuevoMed.duracion_meses}
                    onChange={(e) => handleCambiarDuracionMeses(Number(e.target.value))}
                    className="w-full border border-purple-300 bg-purple-50/70 rounded-xl px-3 py-2.5 text-sm font-black text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer shadow-sm"
                  >
                    <option value={1}>1 mes (4 semanas)</option>
                    <option value={2}>2 meses (8 semanas)</option>
                    <option value={3}>3 meses (12 semanas)</option>
                    <option value={6}>6 meses (24 semanas)</option>
                    <option value={9}>9 meses (36 semanas)</option>
                    <option value={12}>12 meses (1 año)</option>
                  </select>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-800 font-bold bg-purple-100/70 px-0.5 py-0.5 rounded-lg">
                    <span>📅 Término:</span>
                    <strong className="text-purple-950">{formatearFechaBonita(nuevoMed.fecha_fin)}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Indicaciones Especiales:
                </label>
                <textarea
                  rows={3}
                  value={nuevoMed.indicaciones_especiales}
                  onChange={(e) =>
                    setNuevoMed({ ...nuevoMed, indicaciones_especiales: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm font-medium text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                  placeholder="Instrucciones para la paciente respecto a la toma, horario o síntomas de alarma..."
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoMedicamento(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <MdCheck size={18} />
                  <span>Guardar e Incluir Fármaco</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VISTA DE IMPRESIÓN PROFESIONAL DE RECETA MÉDICA ── */}
      {modalRecetaImprimir && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Receta Médica y Prescripción Terapéutica
                </h3>
                <p className="text-sm text-slate-500 font-semibold">
                  Clínica de Endocrinología Ginecológica • Sistema SOP-Care
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRecetaImprimir(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <MdClose size={22} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400 font-bold block text-xs uppercase">Paciente:</span>
                <span className="font-extrabold text-slate-900">{nombrePaciente}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-xs uppercase">Cédula de Identidad:</span>
                <span className="font-extrabold text-slate-900">{ciPaciente}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-xs uppercase">Fecha de Emisión:</span>
                <span className="font-extrabold text-slate-900">
                  {new Date().toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-xs uppercase">Médico Tratante:</span>
                <span className="font-extrabold text-slate-900">Dr. Rodrigo Espinoza</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Prescripción Farmacológica (Rp/):
              </h4>
              <div className="space-y-2.5">
                {medicaciones.map((m, i) => (
                  <div
                    key={m.id || i}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white text-sm space-y-1.5"
                  >
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>
                        {i + 1}. {m.nombre_medicamento}
                      </span>
                      <span className="text-purple-700 font-bold text-xs">Vía {m.via_administracion || "Oral"}</span>
                    </div>
                    <div className="text-slate-700 font-medium text-xs sm:text-sm">
                      <strong>Posología:</strong> {m.dosis} — {m.frecuencia}
                    </div>
                    <div className="text-purple-900 font-bold text-xs flex items-center gap-2">
                      <span>⏱️ <strong>Duración:</strong> {m.duracion_meses || 3} {(m.duracion_meses || 3) === 1 ? "mes" : "meses"}</span>
                      <span>•</span>
                      <span>(Hasta el {formatearFechaBonita(m.fecha_fin)})</span>
                    </div>
                    {m.indicaciones_especiales && (
                      <div className="text-slate-500 text-xs">
                        <strong>Indicaciones:</strong> {m.indicaciones_especiales}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalRecetaImprimir(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-purple-600 hover:bg-purple-700 transition shadow-md"
              >
                <MdPrint size={18} />
                <span>Imprimir Receta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
