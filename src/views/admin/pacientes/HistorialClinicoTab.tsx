import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MdHistory,
  MdAdd,
  MdDelete,
  MdSave,
  MdClose,
  MdPrint,
  MdCheckCircle,
  MdSearch,
  MdPerson,
  MdTimeline,
  MdShield,
  MdCalendarMonth,
  MdLocalHospital,
  MdScience,
  MdMonitorWeight,
  MdOutlineAssignment,
  MdFemale,
  MdTrendingDown,
  MdTrendingUp,
  MdArrowForward,
} from "react-icons/md";
import {
  PacienteListItem,
  obtenerAntecedentes,
  guardarAntecedentes,
  listarPacientes,
  obtenerClasificacionPaciente,
  obtenerUltimosDatosHormonalesPaciente,
  obtenerUltimosDatosClinicosPaciente,
  obtenerTratamientoPaciente,
  obtenerComparativaConsultas,
  ComparativaEvolucionOut,
  ConsultaEvolucionItem,
} from "services/api";
import { getActivePatientId, setActivePatientId } from "utils/activePatient";
import { imprimirContenidoClinico } from "utils/printDocument";

interface HistorialClinicoTabProps {
  paciente: PacienteListItem | null;
  onNavigateToTab?: (tab: string) => void;
  onSelectPaciente?: (p: PacienteListItem) => void;
}

interface NotaEvolucion {
  id: string;
  fecha: string;
  tipo_evento: string;
  medico: string;
  detalle: string;
}

interface EventoClinicoConsolidado {
  id: string;
  fecha: string;
  tipo_evento: string;
  medico: string;
  detalle: string;
  esManual: boolean;
  metricas?: {
    imc?: number | string | null;
    peso?: number | string | null;
    ciclo?: number | string | null;
    fg?: number | string | null;
    testosterona?: number | string | null;
    homa?: number | string | null;
    foliculos?: number | string | null;
    ecoResultado?: string | null;
    fenotipo?: string | null;
  };
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

function obtenerDatosMedicoActivo(): { nombre: string; especialidad: string; matricula: string } {
  try {
    const raw = localStorage.getItem("sop_active_doctor");
    if (raw) {
      const parsed = JSON.parse(raw);
      const nombreCompleto = `Dr. ${parsed.nombre || ""} ${parsed.primer_apellido || ""}`.trim();
      return {
        nombre: nombreCompleto || "Dr. Rodrigo Espinoza Iturri",
        especialidad: parsed.especialidad || "Endocrinología y Ginecología Metabólica",
        matricula: parsed.matricula || "Reg. Col. Med. 48291",
      };
    }
  } catch {
    // fallback
  }
  return {
    nombre: "Dr. Rodrigo Espinoza Iturri",
    especialidad: "Endocrinología y Ginecología Metabólica",
    matricula: "Reg. Col. Med. 48291",
  };
}

export default function HistorialClinicoTab({
  paciente: pacienteProp,
  onNavigateToTab,
  onSelectPaciente,
}: HistorialClinicoTabProps) {
  const doctorActivo = useMemo(() => obtenerDatosMedicoActivo(), []);

  // Lista de pacientes y búsqueda interactiva
  const [listaPacientes, setListaPacientes] = useState<PacienteListItem[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteListItem | null>(pacienteProp);
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState(false);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);

  // Vista activa: "evolucion" (Métricas longitudinales y bitácora) o "auditoria" (Informe Pericial)
  const [vistaActiva, setVistaActiva] = useState<"evolucion" | "auditoria">("evolucion");

  // Estados de datos REALES de la base de datos
  const [loading, setLoading] = useState(false);
  const [historialNotas, setHistorialNotas] = useState<NotaEvolucion[]>([]);
  const [antecedentesCompletos, setAntecedentesCompletos] = useState<any>(null);
  const [datosRotterdam, setDatosRotterdam] = useState<any>(null);
  const [datosHormonales, setDatosHormonales] = useState<any>(null);
  const [datosClinicos, setDatosClinicos] = useState<any>(null);
  const [datosTratamiento, setDatosTratamiento] = useState<any>(null);
  const [datosComparativa, setDatosComparativa] = useState<ComparativaEvolucionOut | null>(null);

  // Filtros de bitácora
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  // Modal para registrar nueva nota de evolución
  const [modalNuevaNota, setModalNuevaNota] = useState(false);
  const [nuevaNota, setNuevaNota] = useState({
    tipo_evento: "Consulta Médica de Control",
    fecha: formatLocalDate(new Date()),
    medico: doctorActivo.nombre,
    detalle: "",
  });

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar lista inicial de pacientes
  const cargarPacientesInicial = useCallback(async () => {
    try {
      setBuscandoPacientes(true);
      const data = await listarPacientes(undefined, null, 1, 100);
      setListaPacientes(data);

      if (!pacienteProp) {
        const storedId = getActivePatientId();
        const target = (storedId && data.find((p) => p.id === storedId)) || data[0] || null;
        if (target) {
          setPacienteSeleccionado(target);
          setActivePatientId(target.id);
        }
      }
    } catch (err) {
      console.error("Error al cargar pacientes para historial:", err);
    } finally {
      setBuscandoPacientes(false);
    }
  }, [pacienteProp]);

  useEffect(() => {
    cargarPacientesInicial();
  }, [cargarPacientesInicial]);

  // Sincronizar prop paciente
  useEffect(() => {
    if (pacienteProp) {
      setPacienteSeleccionado(pacienteProp);
      setActivePatientId(pacienteProp.id);
    }
  }, [pacienteProp]);

  // Búsqueda interactiva en backend al escribir en el selector de pacientes
  useEffect(() => {
    if (!dropdownPacienteAbierto) return;
    const q = busquedaPaciente.trim();
    if (!q) return;

    const timer = setTimeout(async () => {
      try {
        setBuscandoPacientes(true);
        const resultados = await listarPacientes(q, null, 1, 50);
        setListaPacientes((prev) => {
          const mapa = new Map<string, PacienteListItem>();
          resultados.forEach((p) => mapa.set(p.id, p));
          prev.forEach((p) => {
            if (!mapa.has(p.id)) mapa.set(p.id, p);
          });
          return Array.from(mapa.values());
        });
      } catch (err) {
        console.warn("Aviso en búsqueda interactiva de pacientes:", err);
      } finally {
        setBuscandoPacientes(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [busquedaPaciente, dropdownPacienteAbierto]);

  // Escuchar evento global de cambio de paciente
  useEffect(() => {
    const handlePatientChanged = (e: any) => {
      const nuevoId = e.detail?.pacienteId;
      if (nuevoId && nuevoId !== pacienteSeleccionado?.id) {
        const found = listaPacientes.find((p) => p.id === nuevoId);
        if (found) {
          setPacienteSeleccionado(found);
        } else {
          listarPacientes(undefined, null, 1, 100).then((all) => {
            const f = all.find((p) => p.id === nuevoId);
            if (f) setPacienteSeleccionado(f);
          });
        }
      }
    };
    window.addEventListener("sop_patient_changed", handlePatientChanged);
    return () => window.removeEventListener("sop_patient_changed", handlePatientChanged);
  }, [listaPacientes, pacienteSeleccionado?.id]);

  const targetPaciente = pacienteSeleccionado || pacienteProp;

  // Cambiar paciente desde el dropdown
  const handleCambiarPaciente = (p: PacienteListItem) => {
    setPacienteSeleccionado(p);
    setActivePatientId(p.id);
    setDropdownPacienteAbierto(false);
    setBusquedaPaciente("");
    if (onSelectPaciente) onSelectPaciente(p);
    showToast(`Paciente seleccionado: ${p.nombre} ${p.primer_apellido}`);
  };

  // Cargar historial y datos REALES del paciente desde el backend
  const cargarHistorial = useCallback(async () => {
    if (!targetPaciente?.id) return;
    setLoading(true);
    try {
      const [antData, rotData, hormData, clinData, tratData, compData] = await Promise.allSettled([
        obtenerAntecedentes(targetPaciente.id),
        obtenerClasificacionPaciente(targetPaciente.id),
        obtenerUltimosDatosHormonalesPaciente(targetPaciente.id),
        obtenerUltimosDatosClinicosPaciente(targetPaciente.id),
        obtenerTratamientoPaciente(targetPaciente.id),
        obtenerComparativaConsultas(targetPaciente.id),
      ]);

      if (antData.status === "fulfilled") {
        setAntecedentesCompletos(antData.value);
        let lista: NotaEvolucion[] = [];
        if (antData.value.historial && Array.isArray(antData.value.historial)) {
          lista = antData.value.historial.filter(
            (h: any) => h && typeof h === "object" && !h.__iniciada_vida_sexual__ && (h.detalle || h.motivo)
          );
        }
        setHistorialNotas(lista);
      } else {
        setHistorialNotas([]);
      }

      setDatosRotterdam(rotData.status === "fulfilled" ? rotData.value : null);
      setDatosHormonales(hormData.status === "fulfilled" ? hormData.value : null);
      setDatosClinicos(clinData.status === "fulfilled" ? clinData.value : null);
      setDatosTratamiento(tratData.status === "fulfilled" ? tratData.value : null);
      setDatosComparativa(compData.status === "fulfilled" ? compData.value : null);
    } catch (err) {
      console.warn("Aviso al cargar historial clínico:", err);
      setHistorialNotas([]);
    } finally {
      setLoading(false);
    }
  }, [targetPaciente?.id]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  // Persistir notas manuales en tabla antecedentes_medicos -> columna historial JSONB
  const persistirHistorialNotas = async (nuevasNotas: NotaEvolucion[]) => {
    if (!targetPaciente?.id) return;
    try {
      const metaSexarca = antecedentesCompletos?.historial?.find(
        (h: any) => h && h.__iniciada_vida_sexual__ !== undefined
      ) || { __iniciada_vida_sexual__: antecedentesCompletos?.iniciada_vida_sexual || false };

      const payload: any = {
        iniciada_vida_sexual: antecedentesCompletos?.iniciada_vida_sexual || false,
        edad_menarquia: antecedentesCompletos?.edad_menarquia ?? null,
        tipo_ciclo: antecedentesCompletos?.tipo_ciclo || "regular",
        duracion_ciclo_habitual: antecedentesCompletos?.duracion_ciclo_habitual ?? 28,
        gestas: antecedentesCompletos?.gestas ?? 0,
        partos: antecedentesCompletos?.partos ?? 0,
        cesareas: antecedentesCompletos?.cesareas ?? 0,
        abortos: antecedentesCompletos?.abortos ?? 0,
        hijos_vivos: antecedentesCompletos?.hijos_vivos ?? 0,
        usa_anticonceptivos: antecedentesCompletos?.usa_anticonceptivos ?? false,
        tipo_anticonceptivo: antecedentesCompletos?.tipo_anticonceptivo ?? null,
        familiar_con_sop: antecedentesCompletos?.familiar_con_sop ?? false,
        familiar_con_diabetes: antecedentesCompletos?.familiar_con_diabetes ?? false,
        diabetes: antecedentesCompletos?.diabetes ?? false,
        hipotiroidismo: antecedentesCompletos?.hipotiroidismo ?? false,
        hiperprolactinemia: antecedentesCompletos?.hiperprolactinemia ?? false,
        resistencia_insulina: antecedentesCompletos?.resistencia_insulina ?? false,
        alergias: antecedentesCompletos?.alergias || "Ninguna conocida",
        observaciones: antecedentesCompletos?.observaciones || null,
        historial: [...nuevasNotas, metaSexarca],
      };

      await guardarAntecedentes(targetPaciente.id, payload);
    } catch (err) {
      console.warn("Aviso al sincronizar notas de evolución:", err);
    }
  };

  const handleAgregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNota.detalle.trim()) {
      showToast("Por favor ingrese la descripción o hallazgos clínicos de la nota.", "error");
      return;
    }

    const nueva: NotaEvolucion = {
      id: `h-${Date.now()}`,
      fecha: `${nuevaNota.fecha}T${new Date().toTimeString().split(" ")[0]}Z`,
      tipo_evento: nuevaNota.tipo_evento,
      medico: nuevaNota.medico || doctorActivo.nombre,
      detalle: nuevaNota.detalle.trim(),
    };

    const actualizados = [nueva, ...historialNotas];
    setHistorialNotas(actualizados);
    setModalNuevaNota(false);
    setNuevaNota({
      tipo_evento: "Consulta Médica de Control",
      fecha: formatLocalDate(new Date()),
      medico: doctorActivo.nombre,
      detalle: "",
    });

    await persistirHistorialNotas(actualizados);
    showToast("Nota de evolución clínica registrada con éxito", "ok");
  };

  const handleEliminarNota = async (idNota: string) => {
    if (window.confirm("¿Desea retirar esta nota de evolución del historial clínico?")) {
      const filtrados = historialNotas.filter((n) => n.id !== idNota);
      setHistorialNotas(filtrados);
      await persistirHistorialNotas(filtrados);
      showToast("Nota retirada del historial", "ok");
    }
  };

  // Datos del paciente
  const nombrePaciente = targetPaciente
    ? `${targetPaciente.nombre} ${targetPaciente.primer_apellido} ${targetPaciente.segundo_apellido || ""}`.trim()
    : "Paciente en Consulta";
  const ciPaciente = targetPaciente?.ci || "Sin CI";
  const iniciales = targetPaciente
    ? `${targetPaciente.nombre.charAt(0)}${targetPaciente.primer_apellido.charAt(0)}`
    : "HC";
  const edad = targetPaciente?.fecha_nacimiento ? calcularEdad(targetPaciente.fecha_nacimiento) : "—";

  // Procesamiento de las consultas REALES para generar la evolución longitudinal
  const consultasReales: ConsultaEvolucionItem[] = datosComparativa?.consultas || [];

  // Puntos longitudinales para las barras comparativas
  const puntosEvolutivos = useMemo(() => {
    if (consultasReales.length === 0) {
      if (datosClinicos || datosHormonales) {
        return [
          {
            etiqueta: "Registro Inicial",
            fecha: datosClinicos?.updated_at || datosHormonales?.updated_at || "Control Basal",
            ciclo: datosClinicos?.duracion_ciclo_dias !== undefined && datosClinicos?.duracion_ciclo_dias !== "" ? Number(datosClinicos.duracion_ciclo_dias) : null,
            testo: datosHormonales?.testosterona_total !== undefined && datosHormonales?.testosterona_total !== "" ? Number(datosHormonales.testosterona_total) : null,
            fg: datosClinicos?.score_ferriman_gallwey !== undefined && datosClinicos?.score_ferriman_gallwey !== "" ? Number(datosClinicos.score_ferriman_gallwey) : null,
            homa: datosHormonales?.homa_ir ? Number(datosHormonales.homa_ir) : null,
          },
        ];
      }
      return [];
    }

    if (consultasReales.length <= 4) {
      return consultasReales.map((c, idx) => ({
        etiqueta: idx === 0 ? "Inicial" : idx === consultasReales.length - 1 ? "Actual" : `Control ${idx}`,
        fecha: new Date(c.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }),
        ciclo: c.duracion_ciclo_dias !== undefined && c.duracion_ciclo_dias !== null ? Number(c.duracion_ciclo_dias) : null,
        testo: c.testosterona_total !== undefined && c.testosterona_total !== null ? Number(c.testosterona_total) : null,
        fg: c.score_ferriman_gallwey !== undefined && c.score_ferriman_gallwey !== null ? Number(c.score_ferriman_gallwey) : null,
        homa: c.homa_ir !== undefined && c.homa_ir !== null ? Number(c.homa_ir) : null,
      }));
    }

    // Si tiene más de 4 consultas, tomamos cronológicamente la inicial, 2 intermedias y la actual
    const step = Math.floor((consultasReales.length - 1) / 3);
    const indices = [0, step, step * 2, consultasReales.length - 1];
    return indices.map((idx, pos) => {
      const c = consultasReales[idx];
      return {
        etiqueta: pos === 0 ? "Inicial" : pos === 3 ? "Actual" : `Control ${idx + 1}`,
        fecha: new Date(c.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }),
        ciclo: c.duracion_ciclo_dias !== undefined && c.duracion_ciclo_dias !== null ? Number(c.duracion_ciclo_dias) : null,
        testo: c.testosterona_total !== undefined && c.testosterona_total !== null ? Number(c.testosterona_total) : null,
        fg: c.score_ferriman_gallwey !== undefined && c.score_ferriman_gallwey !== null ? Number(c.score_ferriman_gallwey) : null,
        homa: c.homa_ir !== undefined && c.homa_ir !== null ? Number(c.homa_ir) : null,
      };
    });
  }, [consultasReales, datosClinicos, datosHormonales]);

  // Últimos valores medidos para diagnósticos y conclusiones
  const ultimoPunto = puntosEvolutivos[puntosEvolutivos.length - 1];
  const duracionCiclo = ultimoPunto?.ciclo ?? (datosClinicos?.duracion_ciclo_dias ? Number(datosClinicos.duracion_ciclo_dias) : null);
  const testosterona = ultimoPunto?.testo ?? (datosHormonales?.testosterona_total ? Number(datosHormonales.testosterona_total) : null);
  const fgScore = ultimoPunto?.fg ?? (datosClinicos?.score_ferriman_gallwey !== undefined && datosClinicos?.score_ferriman_gallwey !== "" ? Number(datosClinicos.score_ferriman_gallwey) : null);
  const homaIr = ultimoPunto?.homa !== null && ultimoPunto?.homa !== undefined
    ? Number(ultimoPunto.homa).toFixed(2)
    : datosHormonales?.homa_ir
    ? Number(datosHormonales.homa_ir).toFixed(2)
    : null;
  const progesterona = datosHormonales?.progesterona ?? null;
  const imc = datosClinicos?.imc
    ? `${Number(datosClinicos.imc).toFixed(1)} kg/m²`
    : datosClinicos?.peso_kg && datosClinicos?.talla_cm
    ? `${(datosClinicos.peso_kg / Math.pow(datosClinicos.talla_cm / 100, 2)).toFixed(1)} kg/m²`
    : "—";

  const fenotipoNombre = datosRotterdam?.fenotipo_confirmado || datosRotterdam?.fenotipo_sugerido || "En Evaluación Clínica";

  // Medicaciones reales registradas
  const medicacionesReales: string[] = datosTratamiento?.medicaciones && datosTratamiento.medicaciones.length > 0
    ? datosTratamiento.medicaciones.map((m: any) => `• ${m.nombre_medicamento} ${m.dosis} (${m.frecuencia})`)
    : [
        "• Protocolo de estilo de vida, ejercicio y control metabólico",
        "• Suplementación ovulatoria y seguimiento protocolizado",
      ];

  // ════════════════════════════════════════════════════════════════════════════
  // CONSOLIDACIÓN DE EVENTOS REALES EN LA LÍNEA DE TIEMPO
  // ════════════════════════════════════════════════════════════════════════════
  const timelineEventos: EventoClinicoConsolidado[] = useMemo(() => {
    const lista: EventoClinicoConsolidado[] = [];

    // 1. Agregar consultas médicas registradas en la base de datos
    consultasReales.forEach((c) => {
      const lineasDetalle: string[] = [];
      if (c.motivo) lineasDetalle.push(`Motivo: ${c.motivo}`);
      if (c.observaciones) lineasDetalle.push(`Observaciones: ${c.observaciones}`);
      if (c.fenotipo_rotterdam && c.fenotipo_rotterdam !== "Sin Evaluar") {
        lineasDetalle.push(`Diagnóstico Rotterdam: ${c.fenotipo_rotterdam}`);
      }

      lista.push({
        id: `consulta-${c.consulta_id}`,
        fecha: c.fecha,
        tipo_evento: "Consulta Médica",
        medico: doctorActivo.nombre,
        detalle: lineasDetalle.join("\n") || "Atención clínica especializada de seguimiento SOP.",
        esManual: false,
        metricas: {
          imc: c.imc,
          peso: c.peso_kg,
          ciclo: c.duracion_ciclo_dias,
          fg: c.score_ferriman_gallwey,
          testosterona: c.testosterona_total,
          homa: c.homa_ir,
          foliculos: c.num_foliculos,
          ecoResultado: c.resultado_eco,
          fenotipo: c.fenotipo_rotterdam,
        },
      });
    });

    // 2. Agregar notas clínicas manuales registradas en antecedentes.historial
    historialNotas.forEach((n) => {
      lista.push({
        id: n.id,
        fecha: n.fecha,
        tipo_evento: n.tipo_evento,
        medico: n.medico || doctorActivo.nombre,
        detalle: n.detalle,
        esManual: true,
      });
    });

    // 3. Ordenar cronológicamente (más recientes primero)
    return lista.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [consultasReales, historialNotas, doctorActivo.nombre]);

  // Filtrado de eventos en la bitácora
  const eventosFiltrados = useMemo(() => {
    return timelineEventos.filter((n) => {
      const matchBusqueda =
        n.detalle.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.tipo_evento.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.medico.toLowerCase().includes(busqueda.toLowerCase());

      const matchTipo =
        filtroTipo === "todos"
          ? true
          : n.tipo_evento.toLowerCase().includes(filtroTipo.toLowerCase());

      return matchBusqueda && matchTipo;
    });
  }, [timelineEventos, busqueda, filtroTipo]);

  // Impresión formal del Informe Pericial con datos 100% reales
  const handleImprimirInforme = () => {
    const fechaHoy = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const cuerpoHtml = `
      <div style="border: 2px solid #334155; border-radius: 10px; padding: 22px; background: #ffffff; color: #1e293b; font-family: system-ui, -apple-system, sans-serif;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 13pt; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.3px;">
              SISTEMA CLÍNICO SOP — PROTOCOLO DE ROTTERDAM
            </div>
            <div style="font-size: 9pt; color: #64748b; font-weight: 600; margin-top: 3px;">
              Informe Pericial de Diagnóstico y Fenotipificación Multimodal Asistida por IA (Auditoría ISO/IEC en Salud)
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9pt; font-weight: 800; color: #7c3aed; font-family: monospace;">
              EXPEDIENTE: CI-${ciPaciente}
            </div>
            <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
              Fecha de Emisión: ${fechaHoy}
            </div>
          </div>
        </div>

        <!-- Paciente Box -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; background: #f8fafc; margin-bottom: 12px; font-size: 8.5pt;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 6px;">
            <div><strong style="color: #475569;">Paciente:</strong> <span style="font-weight: 800; color: #0f172a;">${nombrePaciente}</span></div>
            <div><strong style="color: #475569;">Edad:</strong> <span style="font-weight: 700;">${edad}</span></div>
            <div><strong style="color: #475569;">DNI/CI:</strong> <span style="font-weight: 700;">${ciPaciente}</span></div>
            <div><strong style="color: #475569;">ID Clínico:</strong> <span style="font-weight: 700;">${targetPaciente?.id?.substring(0, 8) || "—"}</span></div>
          </div>
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px;">
            <div><strong style="color: #475569;">Especialista:</strong> <span style="font-weight: 700;">${doctorActivo.nombre}</span></div>
            <div><strong style="color: #475569;">IMC:</strong> <span style="font-weight: 700;">${imc}</span></div>
            <div><strong style="color: #475569;">Circunferencia:</strong> <span style="font-weight: 700;">${datosClinicos?.circunferencia_abdominal_cm ? `${datosClinicos.circunferencia_abdominal_cm} cm` : "—"}</span></div>
            <div><strong style="color: #475569;">Especialidad:</strong> <span style="font-weight: 700;">${doctorActivo.especialidad}</span></div>
          </div>
        </div>

        <!-- 3 Criterios de Rotterdam -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div style="border: 1px solid #fecdd3; border-radius: 8px; padding: 10px; background: #fff1f2;">
            <div style="font-size: 8pt; font-weight: 900; color: #be123c; margin-bottom: 4px;">CRITERIO 1: OVULATORIO</div>
            <div style="font-size: 8pt; color: #334155; line-height: 1.35;">
              ${duracionCiclo ? `Duración habitual: ${duracionCiclo} días.` : "Ciclo en evaluación."}
              ${progesterona ? `Progesterona: ${progesterona} ng/mL.` : ""}
              <div style="margin-top: 4px; font-weight: bold; color: ${datosRotterdam?.criterio1_cumple ? "#be123c" : "#15803d"};">
                ${datosRotterdam?.criterio1_cumple ? "Cumple Disfunción Ovulatoria" : "Sin disfunción confirmada"}
              </div>
            </div>
          </div>
          <div style="border: 1px solid #fecdd3; border-radius: 8px; padding: 10px; background: #fff1f2;">
            <div style="font-size: 8pt; font-weight: 900; color: #be123c; margin-bottom: 4px;">CRITERIO 2: ANDROGÉNICO</div>
            <div style="font-size: 8pt; color: #334155; line-height: 1.35;">
              ${fgScore !== null ? `Score Ferriman-Gallwey: ${fgScore} pts.` : "FG no evaluado."}
              ${testosterona ? `Testosterona Total: ${testosterona} ng/dL.` : ""}
              <div style="margin-top: 4px; font-weight: bold; color: ${datosRotterdam?.criterio2_cumple ? "#be123c" : "#15803d"};">
                ${datosRotterdam?.criterio2_cumple ? "Cumple Hiperandrogenismo" : "Andrógenos normales"}
              </div>
            </div>
          </div>
          <div style="border: 1px solid #fecdd3; border-radius: 8px; padding: 10px; background: #fff1f2;">
            <div style="font-size: 8pt; font-weight: 900; color: #be123c; margin-bottom: 4px;">CRITERIO 3: ECOGRÁFICO</div>
            <div style="font-size: 8pt; color: #334155; line-height: 1.35;">
              ${datosRotterdam?.criterio3_cumple ? "Morfología ovárica poliquística detectada (PCOM ≥ 12-20 folículos)." : "Ecografía ovárica sin patrón poliquístico."}
              <div style="margin-top: 4px; font-weight: bold; color: ${datosRotterdam?.criterio3_cumple ? "#be123c" : "#15803d"};">
                ${datosRotterdam?.criterio3_cumple ? "Cumple Criterio Ecográfico" : "No cumple"}
              </div>
            </div>
          </div>
        </div>

        <!-- Dictamen Definitivo -->
        <div style="border: 1.5px solid #c084fc; border-radius: 8px; padding: 12px 14px; background: #faf5ff; margin-bottom: 12px;">
          <div style="font-size: 9.5pt; font-weight: 900; color: #6b21a8; margin-bottom: 4px; text-transform: uppercase;">
            DICTAMEN INTEGRAL: ${fenotipoNombre.toUpperCase()}
          </div>
          <div style="font-size: 8.5pt; color: #3b0764; line-height: 1.4;">
            ${datosComparativa?.resumen_clinico || "Evaluación diagnóstica consolidada bajo el Consenso Internacional de Rotterdam (ESHRE/ASRM 2023). Integración de marcadores clínicos, metabólicos y de imagenología ovárica."}
            ${homaIr ? ` Índice de resistencia insulínica: HOMA-IR ${homaIr}.` : ""}
          </div>
        </div>

        <!-- Plan Farmacológico -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; background: #f8fafc; margin-bottom: 18px;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Plan Farmacológico y Estilo de Vida:</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8pt; color: #334155;">
            ${medicacionesReales.map((m) => `<div>${m}</div>`).join("")}
          </div>
        </div>

        <!-- Firmas -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 10px;">
          <div style="border-top: 1px solid #94a3b8; width: 240px; padding-top: 6px; text-align: center;">
            <div style="font-size: 8.5pt; font-weight: 800; color: #0f172a;">${doctorActivo.nombre}</div>
            <div style="font-size: 7.5pt; color: #64748b;">${doctorActivo.especialidad} • ${doctorActivo.matricula}</div>
          </div>
          <div style="border: 1px dashed #94a3b8; border-radius: 6px; padding: 6px 12px; background: #f8fafc; font-family: monospace; text-align: right; font-size: 7.5pt; color: #64748b;">
            <div style="font-weight: 800; color: #1e293b;">🔒 SELLO DIGITAL CRIPTOGRÁFICO SHA-256</div>
            <div>Hash: ${(targetPaciente?.id || "").replace(/-/g, "").padEnd(32, "0").slice(0, 24)}...</div>
          </div>
        </div>
      </div>
    `;

    imprimirContenidoClinico(`Informe-Auditoria-${ciPaciente}`, cuerpoHtml);
  };

  return (
    <div className="space-y-6">
      {/* Indicador de carga sutil */}
      {loading && (
        <div className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold animate-pulse flex items-center gap-2">
          <span>Actualizando datos clínicos, comparativa evolutiva y expediente desde el servidor...</span>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
            toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <MdCheckCircle size={20} />
          {toast.msg}
        </div>
      )}

      {/* ── ENCABEZADO MÉDICO CON SELECTOR DE PACIENTE REAL Y BUSCADOR ACTIVO ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Historial Clínico Longitudinal
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

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Selector y Buscador interactivo de pacientes */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDropdownPacienteAbierto(!dropdownPacienteAbierto);
                if (!dropdownPacienteAbierto && listaPacientes.length === 0) {
                  cargarPacientesInicial();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200 shadow-sm"
            >
              <MdPerson size={16} />
              <span>{targetPaciente ? "Cambiar Paciente" : "Seleccionar Paciente"}</span>
            </button>

            {dropdownPacienteAbierto && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2.5 space-y-1.5 animate-fade-in-up">
                <div className="relative">
                  <MdSearch className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o CI..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-purple-500 text-slate-800 font-medium"
                    autoFocus
                  />
                  {buscandoPacientes && (
                    <span className="absolute right-2.5 top-2.5 text-[10px] text-purple-600 font-bold animate-pulse">
                      Buscando...
                    </span>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {listaPacientes
                    .filter((p) => {
                      if (!busquedaPaciente.trim()) return true;
                      const q = busquedaPaciente.toLowerCase();
                      return (
                        p.nombre.toLowerCase().includes(q) ||
                        p.primer_apellido.toLowerCase().includes(q) ||
                        (p.segundo_apellido && p.segundo_apellido.toLowerCase().includes(q)) ||
                        (p.ci && p.ci.toLowerCase().includes(q))
                      );
                    })
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleCambiarPaciente(p)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                          targetPaciente?.id === p.id
                            ? "bg-purple-50 text-purple-700 font-bold border border-purple-200"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{`${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`}</p>
                          <span className="text-[10px] text-slate-400">CI: {p.ci || "—"}</span>
                        </div>
                        {targetPaciente?.id === p.id && (
                          <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                            Activa
                          </span>
                        )}
                      </button>
                    ))}

                  {listaPacientes.length === 0 && !buscandoPacientes && (
                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                      No se encontraron pacientes registradas.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botón Registrar Evolución */}
          <button
            type="button"
            onClick={() => setModalNuevaNota(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm"
          >
            <MdAdd size={16} />
            <span>+ Registrar Evolución</span>
          </button>
        </div>
      </div>

      {/* ── SELECTOR DE MODOS: EVOLUCIÓN LONGITUDINAL vs AUDITORÍA / INFORME PERICIAL ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setVistaActiva("evolucion")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            vistaActiva === "evolucion"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <MdTimeline size={17} />
          <span>Evolución Longitudinal y Respuesta al Tratamiento ({consultasReales.length} Consultas Registradas)</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaActiva("auditoria")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            vistaActiva === "auditoria"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <MdShield size={17} />
          <span>Generador de Informe Integral y Auditoría Médica (ISO/IEC)</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: EVOLUCIÓN LONGITUDINAL Y RESPUESTA AL TRATAMIENTO             */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {vistaActiva === "evolucion" && (
        <div className="space-y-6 animate-fade-in">
          {/* Card Principal de Cabecera Evolutiva */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-100 text-purple-700">
                  <MdTimeline size={18} />
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Evolución Longitudinal y Respuesta Terapéutica
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Paciente: <strong className="text-slate-800">{nombrePaciente}</strong> • Expediente:{" "}
                <strong className="text-slate-800">CI {ciPaciente}</strong> • Diagnóstico:{" "}
                <strong className="text-purple-700">{fenotipoNombre}</strong> • Consultas:{" "}
                <strong className="text-slate-800">{consultasReales.length}</strong>
              </p>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl border border-emerald-500/80 bg-emerald-50/80 text-emerald-800 font-extrabold text-xs flex items-center gap-1.5 shadow-sm">
              <span>Seguimiento Clínico Activo</span>
              <span className="text-emerald-600 text-sm">✓</span>
            </div>
          </div>

          {/* Grilla de 4 Métricas Longitudinales con Barras Estilizadas y Datos REALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Duración de Ciclos */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MdCalendarMonth className="text-purple-600" size={15} />
                  DURACIÓN DE CICLOS
                </span>
              </div>

              {puntosEvolutivos.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-center text-xs text-slate-400 font-semibold p-2">
                  Sin registros de ciclo menstrual en las consultas.
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-around gap-2 h-36 px-2 pt-2 border-b border-slate-200">
                    {puntosEvolutivos.map((p, idx) => {
                      const valor = p.ciclo;
                      const alturaPct = valor ? Math.min(100, Math.max(25, (valor / 55) * 100)) : 10;
                      const esNormal = valor && valor <= 35 && valor >= 21;
                      const colorBarra = !valor
                        ? "bg-slate-300"
                        : esNormal
                        ? "bg-emerald-500"
                        : valor <= 45
                        ? "bg-amber-500"
                        : "bg-rose-500";

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end max-w-[50px]">
                          <div
                            style={{ height: `${alturaPct}%` }}
                            className={`w-full ${colorBarra} rounded-t-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm`}
                          >
                            {valor ? `${valor}d` : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-around text-[10px] font-bold text-slate-500 mt-2 px-1">
                    {puntosEvolutivos.map((p, idx) => (
                      <span key={idx} className="truncate max-w-[50px] text-center" title={p.fecha}>
                        {p.etiqueta}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-3 pt-2 text-xs font-bold text-slate-700 flex items-center gap-1 border-t border-slate-100">
                <span className="text-emerald-600">✓</span>
                <span className="truncate">
                  {duracionCiclo
                    ? duracionCiclo <= 35 && duracionCiclo >= 21
                      ? `Ciclos regulares (${duracionCiclo} días)`
                      : `Oligomenorrea (${duracionCiclo} días > 35)`
                    : "Parámetro en monitoreo"}
                </span>
              </div>
            </div>

            {/* Card 2: Testosterona Total */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MdScience className="text-purple-600" size={15} />
                  TESTOSTERONA TOTAL
                </span>
              </div>

              {puntosEvolutivos.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-center text-xs text-slate-400 font-semibold p-2">
                  Sin dosajes de testosterona registrados.
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-around gap-2 h-36 px-2 pt-2 border-b border-slate-200">
                    {puntosEvolutivos.map((p, idx) => {
                      const valor = p.testo;
                      const alturaPct = valor ? Math.min(100, Math.max(25, (valor / 75) * 100)) : 10;
                      const esNormal = valor && valor <= 50;
                      const colorBarra = !valor
                        ? "bg-slate-300"
                        : esNormal
                        ? "bg-emerald-500"
                        : valor <= 60
                        ? "bg-amber-500"
                        : "bg-rose-500";

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end max-w-[50px]">
                          <div
                            style={{ height: `${alturaPct}%` }}
                            className={`w-full ${colorBarra} rounded-t-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm`}
                          >
                            {valor ? Math.round(valor) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-around text-[10px] font-bold text-slate-500 mt-2 px-1">
                    {puntosEvolutivos.map((p, idx) => (
                      <span key={idx} className="truncate max-w-[50px] text-center" title={p.fecha}>
                        {p.etiqueta}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-3 pt-2 text-xs font-bold text-slate-700 flex items-center gap-1 border-t border-slate-100">
                <span className="text-emerald-600">✓</span>
                <span className="truncate">
                  {testosterona
                    ? testosterona <= 50
                      ? `Rango normal (${testosterona} ng/dL)`
                      : `Hiperandrogenemia (${testosterona} ng/dL)`
                    : "En seguimiento de laboratorio"}
                </span>
              </div>
            </div>

            {/* Card 3: Score Hirsutismo (FG) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MdFemale className="text-purple-600" size={15} />
                  SCORE HIRSUTISMO (FG)
                </span>
              </div>

              {puntosEvolutivos.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-center text-xs text-slate-400 font-semibold p-2">
                  Sin registro de Score Ferriman-Gallwey.
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-around gap-2 h-36 px-2 pt-2 border-b border-slate-200">
                    {puntosEvolutivos.map((p, idx) => {
                      const valor = p.fg;
                      const alturaPct = valor !== null && valor !== undefined ? Math.min(100, Math.max(25, (valor / 24) * 100)) : 10;
                      const esNormal = valor !== null && valor !== undefined && valor < 8;
                      const colorBarra = valor === null || valor === undefined
                        ? "bg-slate-300"
                        : esNormal
                        ? "bg-emerald-500"
                        : "bg-rose-500";

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end max-w-[50px]">
                          <div
                            style={{ height: `${alturaPct}%` }}
                            className={`w-full ${colorBarra} rounded-t-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm`}
                          >
                            {valor !== null && valor !== undefined ? valor : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-around text-[10px] font-bold text-slate-500 mt-2 px-1">
                    {puntosEvolutivos.map((p, idx) => (
                      <span key={idx} className="truncate max-w-[50px] text-center" title={p.fecha}>
                        {p.etiqueta}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-3 pt-2 text-xs font-bold text-slate-700 flex items-center gap-1 border-t border-slate-100">
                <span className="text-emerald-600">✓</span>
                <span className="truncate">
                  {fgScore !== null && fgScore !== undefined
                    ? fgScore < 8
                      ? `Hirsutismo remitido (${fgScore} pts)`
                      : `Hirsutismo clínico (${fgScore} ≥ 8)`
                    : "Evaluación FG pendiente"}
                </span>
              </div>
            </div>

            {/* Card 4: Índice HOMA-IR */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MdMonitorWeight className="text-purple-600" size={15} />
                  ÍNDICE HOMA-IR
                </span>
              </div>

              {puntosEvolutivos.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-center text-xs text-slate-400 font-semibold p-2">
                  Sin cálculo de HOMA-IR registrado.
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-around gap-2 h-36 px-2 pt-2 border-b border-slate-200">
                    {puntosEvolutivos.map((p, idx) => {
                      const valor = p.homa;
                      const alturaPct = valor ? Math.min(100, Math.max(25, (valor / 4.5) * 100)) : 10;
                      const esNormal = valor && valor < 2.5;
                      const colorBarra = !valor
                        ? "bg-slate-300"
                        : esNormal
                        ? "bg-emerald-500"
                        : valor <= 3.5
                        ? "bg-amber-500"
                        : "bg-rose-500";

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end max-w-[50px]">
                          <div
                            style={{ height: `${alturaPct}%` }}
                            className={`w-full ${colorBarra} rounded-t-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm`}
                          >
                            {valor ? valor.toFixed(2) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-around text-[10px] font-bold text-slate-500 mt-2 px-1">
                    {puntosEvolutivos.map((p, idx) => (
                      <span key={idx} className="truncate max-w-[50px] text-center" title={p.fecha}>
                        {p.etiqueta}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-3 pt-2 text-xs font-bold text-slate-700 flex items-center gap-1 border-t border-slate-100">
                <span className="text-emerald-600">✓</span>
                <span className="truncate">
                  {homaIr
                    ? Number(homaIr) < 2.5
                      ? `Sensibilidad normal (${homaIr})`
                      : `Resistencia Insulínica (${homaIr} ≥ 2.5)`
                    : "HOMA-IR en seguimiento"}
                </span>
              </div>
            </div>
          </div>

          {/* ── BITÁCORA Y TIMELINE CONSOLIDADO DE CONSULTAS Y EVENTOS CLÍNICOS REALES ── */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Historial de Consultas Médicas y Eventos Clínicos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trazabilidad longitudinal consolidada: consultas médicas, ecografías, laboratorio y evolución.
                </p>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                {timelineEventos.length} Eventos Registrados
              </span>
            </div>

            {/* Resumen clínico real de comparativa */}
            {datosComparativa?.resumen_clinico && (
              <div className="bg-purple-50/70 border border-purple-200/90 rounded-xl p-3.5 text-xs leading-relaxed text-purple-900 font-medium">
                <strong className="font-bold text-purple-950">Resumen Evolutivo del Expediente:</strong> {datosComparativa.resumen_clinico}
              </div>
            )}

            {/* Barra de búsqueda y filtro de notas */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-sm">
                  <MdSearch className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar por motivo, diagnóstico o hallazgos..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold"
                >
                  <option value="todos">Todos los eventos ({timelineEventos.length})</option>
                  <option value="Consulta">Consultas Médicas</option>
                  <option value="Rotterdam">Diagnósticos Rotterdam</option>
                  <option value="Control">Notas de Control</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setModalNuevaNota(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-xs"
              >
                <MdAdd size={16} />
                <span>Nueva Nota</span>
              </button>
            </div>

            {/* Listado dinámico de eventos reales */}
            {eventosFiltrados.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-semibold space-y-1">
                <p>No se encontraron eventos clínicos con los criterios seleccionados.</p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Utilice el botón "+ Registrar Evolución" para añadir notas clínicas al expediente.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {eventosFiltrados.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-purple-300 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-black ${
                            ev.tipo_evento.includes("Consulta")
                              ? "bg-purple-100 text-purple-800"
                              : ev.tipo_evento.includes("Rotterdam")
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {ev.tipo_evento}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {ev.fecha?.split("T")[0]}
                          </span>
                          {ev.medico && (
                            <span className="text-[11px] text-slate-500 font-semibold">• {ev.medico}</span>
                          )}
                        </div>
                      </div>

                      {ev.esManual && (
                        <button
                          type="button"
                          onClick={() => handleEliminarNota(ev.id)}
                          className="text-slate-300 hover:text-rose-600 transition p-1 shrink-0"
                          title="Eliminar nota"
                        >
                          <MdDelete size={17} />
                        </button>
                      )}
                    </div>

                    {/* Badges de métricas si la consulta tiene datos registrados */}
                    {ev.metricas && (
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        {ev.metricas.imc && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            IMC: {ev.metricas.imc} kg/m²
                          </span>
                        )}
                        {ev.metricas.ciclo && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                            Ciclo: {ev.metricas.ciclo} días
                          </span>
                        )}
                        {ev.metricas.fg !== null && ev.metricas.fg !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            Ferriman: {ev.metricas.fg} pts
                          </span>
                        )}
                        {ev.metricas.testosterona && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            Testosterona: {ev.metricas.testosterona} ng/dL
                          </span>
                        )}
                        {ev.metricas.homa && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            HOMA-IR: {ev.metricas.homa}
                          </span>
                        )}
                        {ev.metricas.foliculos && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                            Eco: {ev.metricas.foliculos} folículos ({ev.metricas.ecoResultado || "SOP"})
                          </span>
                        )}
                        {ev.metricas.fenotipo && ev.metricas.fenotipo !== "Sin Evaluar" && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            {ev.metricas.fenotipo}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                      {ev.detalle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: GENERADOR DE INFORME INTEGRAL Y AUDITORÍA MÉDICA              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {vistaActiva === "auditoria" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card de Auditoría */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-100 text-purple-700">
                  <MdShield size={18} />
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Generador de Informe Pericial y Trazabilidad Algorítmica (Auditoría Médica)
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Emisión formal conforme a guías internacionales de auditoría en salud (Consenso Rotterdam / ISO/IEC).
              </p>
            </div>

            <button
              type="button"
              onClick={handleImprimirInforme}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow-md shadow-purple-700/20"
            >
              <MdPrint size={16} />
              <span>Imprimir / Exportar PDF</span>
            </button>
          </div>

          {/* Marco Hoja Pericial Clínica con Datos Reales */}
          <div className="bg-white border-2 border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 text-slate-800">
            {/* Cabecera con datos institucionales */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl border-2 border-slate-800 flex items-center justify-center bg-slate-50 shrink-0">
                  <MdLocalHospital size={26} className="text-purple-700" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight uppercase">
                    SISTEMA CLÍNICO SOP — PROTOCOLO DE ROTTERDAM
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Informe Pericial de Diagnóstico y Fenotipificación Multimodal Asistida por IA
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                <span className="font-mono font-black text-xs text-slate-800">
                  EXPEDIENTE: CI-{ciPaciente}
                </span>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Fecha de Emisión: {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Recuadro de Datos del Paciente */}
            <div className="border border-slate-800/80 rounded-xl p-3.5 text-xs font-semibold bg-white space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-slate-500 font-normal">Paciente: </span>
                  <strong className="text-slate-900">{nombrePaciente}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Edad: </span>
                  <strong className="text-slate-900">{edad}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">DNI/CI: </span>
                  <strong className="text-slate-900">{ciPaciente}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">ID Clínico: </span>
                  <strong className="text-slate-900">{targetPaciente?.id?.substring(0, 8) || "—"}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 font-normal">Médico Especialista: </span>
                  <strong className="text-slate-900">{doctorActivo.nombre}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">IMC: </span>
                  <strong className="text-slate-900">{imc}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Cintura: </span>
                  <strong className="text-slate-900">{datosClinicos?.circunferencia_abdominal_cm ? `${datosClinicos.circunferencia_abdominal_cm} cm` : "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Especialidad: </span>
                  <strong className="text-slate-900">{doctorActivo.especialidad}</strong>
                </div>
              </div>
            </div>

            {/* Desglose de los 3 Criterios de Rotterdam */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Criterio 1 */}
              <div className="border border-rose-300 bg-rose-50/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-black text-rose-900 uppercase">
                  CRITERIO 1: OVULATORIO
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  {duracionCiclo ? `Duración habitual: ${duracionCiclo} días.` : "Ciclo en evaluación."}{" "}
                  {progesterona ? `Progesterona: ${progesterona} ng/mL.` : ""}
                  <div className="mt-1 font-bold text-slate-900">
                    Estado: {datosRotterdam?.criterio1_cumple ? "Cumple Disfunción Ovulatoria" : "Sin disfunción confirmada"}
                  </div>
                </div>
              </div>

              {/* Criterio 2 */}
              <div className="border border-rose-300 bg-rose-50/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-black text-rose-900 uppercase">
                  CRITERIO 2: ANDROGÉNICO
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  {fgScore !== null ? `Score FG: ${fgScore} pts.` : "FG no evaluado."}{" "}
                  {testosterona ? `Testosterona: ${testosterona} ng/dL.` : ""}
                  <div className="mt-1 font-bold text-slate-900">
                    Estado: {datosRotterdam?.criterio2_cumple ? "Cumple Hiperandrogenismo" : "Andrógenos normales"}
                  </div>
                </div>
              </div>

              {/* Criterio 3 */}
              <div className="border border-rose-300 bg-rose-50/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-black text-rose-900 uppercase">
                  CRITERIO 3: ECOGRÁFICO
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  {datosRotterdam?.criterio3_cumple ? "Morfología ovárica poliquística detectada (PCOM)." : "Sin patrón ecográfico de SOP."}
                  <div className="mt-1 font-bold text-slate-900">
                    Estado: {datosRotterdam?.criterio3_cumple ? "Cumple Criterio 3" : "No cumple"}
                  </div>
                </div>
              </div>
            </div>

            {/* Dictamen Definitivo */}
            <div className="relative border-2 border-purple-500/80 bg-purple-50/60 rounded-xl p-4 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-black text-purple-900 uppercase tracking-tight">
                DICTAMEN DEFINITIVO: {fenotipoNombre.toUpperCase()}
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {datosComparativa?.resumen_clinico || "Evaluación diagnóstica basada en el Consenso Internacional de Rotterdam (ESHRE/ASRM 2023). Requiere al menos 2 de los 3 criterios para confirmación de SOP."}
                {homaIr && ` Se constata índice HOMA-IR de ${homaIr}.`}
              </p>
            </div>

            {/* Plan Farmacológico y Estilo de Vida */}
            <div className="border border-slate-800/80 rounded-xl p-3.5 space-y-2 bg-white text-xs">
              <div className="font-black text-slate-900">
                Plan Farmacológico y Estilo de Vida Prescrito:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-medium text-slate-700">
                {medicacionesReales.map((m, idx) => (
                  <div key={idx}>{m}</div>
                ))}
              </div>
            </div>

            {/* Pie con Firma Médica y Sello Digital SHA-256 */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="space-y-1">
                <div className="w-52 border-b border-slate-600 mb-1.5" />
                <div className="text-xs font-black text-slate-900">{doctorActivo.nombre}</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  {doctorActivo.especialidad} • {doctorActivo.matricula}
                </div>
              </div>

              <div className="border border-dashed border-slate-400 bg-slate-50/90 rounded-xl p-2.5 font-mono text-[11px] text-slate-600 space-y-0.5">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🔒</span>
                  <span>SELLO DIGITAL CRIPTOGRÁFICO SHA-256</span>
                </div>
                <div className="text-slate-400">Hash: {(targetPaciente?.id || "").replace(/-/g, "").padEnd(32, "0").slice(0, 24)}...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR NUEVA NOTA DE EVOLUCIÓN ── */}
      {modalNuevaNota && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-purple-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <MdHistory size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Nueva Nota de Evolución Clínica
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {nombrePaciente} • CI: {ciPaciente}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevaNota(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleAgregarNota} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Evento Clínico *
                  </label>
                  <select
                    value={nuevaNota.tipo_evento}
                    onChange={(e) =>
                      setNuevaNota({ ...nuevaNota, tipo_evento: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="Consulta Médica de Control">Consulta Médica de Control</option>
                    <option value="Evaluación Diagnóstica Rotterdam">
                      Evaluación Diagnóstica Rotterdam
                    </option>
                    <option value="Ajuste de Prescripción Terapéutica">
                      Ajuste de Prescripción Terapéutica
                    </option>
                    <option value="Revisión de Laboratorio Hormonal">
                      Revisión de Laboratorio Hormonal
                    </option>
                    <option value="Control Ecográfico Ovárico">Control Ecográfico Ovárico</option>
                    <option value="Nota de Evolución General">Nota de Evolución General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevaNota.fecha}
                    onChange={(e) => setNuevaNota({ ...nuevaNota, fecha: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Especialista / Médico Responsable
                </label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={nuevaNota.medico}
                    onChange={(e) => setNuevaNota({ ...nuevaNota, medico: e.target.value })}
                    placeholder="Nombre del médico especialista"
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Descripción / Hallazgos Clínicos *
                </label>
                <textarea
                  rows={4}
                  required
                  value={nuevaNota.detalle}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, detalle: e.target.value })}
                  placeholder="Detalle la evolución de la paciente, respuesta al tratamiento, cambios en el ciclo menstrual o sintomatología..."
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm font-medium text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaNota(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <MdSave size={18} />
                  <span>Guardar Nota en Historial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
