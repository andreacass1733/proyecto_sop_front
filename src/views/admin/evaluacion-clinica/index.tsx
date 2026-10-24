import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "components/card";
import {
  MdScience,
  MdFitnessCenter,
  MdAutoGraph,
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdSave,
  MdPlayArrow,
  MdPerson,
  MdInfoOutline,
  MdTrendingUp,
  MdSpeed,
  MdDone,
  MdShowChart,
} from "react-icons/md";
import ModalFerrimanGallwey from "./components/ModalFerrimanGallwey";
import ModalCurvaCTOG from "./components/ModalCurvaCTOG";
import ModalOrdenMedica from "./components/ModalOrdenMedica";
import { ModalMetricasXGBoostClinico } from "./components/ModalMetricasXGBoostClinico";
import {
  guardarDatosHormonales,
  obtenerUltimosDatosHormonalesPaciente,
  guardarDatosClinicos,
  obtenerUltimosDatosClinicosPaciente,
  obtenerAntecedentes,
  AntecedentesOut,
  evaluarXGBoost,
  listarPacientes,
  PacienteListItem,
  DatosHormonalesIn,
  DatosClinicosIn,
  EvaluacionXGBoostResponse,
} from "services/api";

// ── Tipos y Rangos de Referencia para Semáforos ─────────────────────────────
interface CampoHormonalConfig {
  key: keyof DatosHormonalesIn;
  label: string;
  unidad: string;
  min?: number;
  max?: number;
  tipoCheck?: "rango" | "menor" | "mayor";
  umbral?: number;
  descripcion: string;
  grupo: string;
}

const CAMPOS_HORMONALES: CampoHormonalConfig[] = [
  // Gonadotropinas y Eje Ovárico
  { key: "fsh", label: "FSH (Folículo Estimulante)", unidad: "mUI/mL", min: 3.5, max: 12.5, tipoCheck: "rango", descripcion: "Fase folicular: 3.5 - 12.5 mUI/mL", grupo: "Gonadotropinas y Eje Ovárico" },
  { key: "lh", label: "LH (Luteinizante)", unidad: "mUI/mL", min: 2.4, max: 12.6, tipoCheck: "rango", descripcion: "Fase folicular: 2.4 - 12.6 mUI/mL", grupo: "Gonadotropinas y Eje Ovárico" },
  { key: "tsh", label: "TSH (Tirotropina)", unidad: "µUI/mL", min: 0.4, max: 4.5, tipoCheck: "rango", descripcion: "Normal: 0.4 - 4.5 µUI/mL", grupo: "Gonadotropinas y Eje Ovárico" },
  { key: "amh", label: "AMH (Antimülleriana)", unidad: "ng/mL", tipoCheck: "menor", umbral: 4.0, descripcion: "Normal: ≤ 4.0 ng/mL (>4.0 alta en SOP)", grupo: "Gonadotropinas y Eje Ovárico" },
  
  // Andrógenos y Esteroides Suprarrenales
  { key: "testosterona_total", label: "Testosterona Total", unidad: "ng/dL", tipoCheck: "menor", umbral: 50.0, descripcion: "Normal: ≤ 50.0 ng/dL (>50 hiperandrogenismo)", grupo: "Andrógenos y Esteroides Suprarrenales" },
  { key: "dhea_s", label: "DHEA-S", unidad: "µg/dL", tipoCheck: "menor", umbral: 350.0, descripcion: "Normal: ≤ 350.0 µg/dL (>350 suprarrenal)", grupo: "Andrógenos y Esteroides Suprarrenales" },
  { key: "androstenediona", label: "Androstenediona", unidad: "ng/mL", tipoCheck: "menor", umbral: 2.7, descripcion: "Normal: ≤ 2.7 ng/mL (>2.7 elevada)", grupo: "Andrógenos y Esteroides Suprarrenales" },
  { key: "hidroxiprogesterona_17", label: "17-Hidroxiprogesterona", unidad: "ng/mL", tipoCheck: "menor", umbral: 2.0, descripcion: "Normal fase folicular: < 2.0 ng/mL", grupo: "Andrógenos y Esteroides Suprarrenales" },
  
  // Ovulación & Fase Lútea
  { key: "prolactina", label: "Prolactina", unidad: "ng/mL", tipoCheck: "menor", umbral: 23.3, descripcion: "Normal: ≤ 23.3 ng/mL", grupo: "Ovulación y Fase Lútea" },
  { key: "progesterona", label: "Progesterona", unidad: "ng/mL", tipoCheck: "mayor", umbral: 0.2, descripcion: "Fase folicular < 1.0; fase lútea > 5.0", grupo: "Ovulación y Fase Lútea" },
  
  // Metabolismo Glucémico
  { key: "insulina_basal", label: "Insulina Basal", unidad: "µUI/mL", min: 2.0, max: 20.0, tipoCheck: "rango", descripcion: "Ayunas: 2.0 - 20.0 µUI/mL (óptimo <12)", grupo: "Metabolismo Glucémico" },
  { key: "glucosa_basal", label: "Glucosa Basal", unidad: "mg/dL", min: 70.0, max: 99.0, tipoCheck: "rango", descripcion: "Ayunas: 70 - 99 mg/dL (≥100 alterada)", grupo: "Metabolismo Glucémico" },
  
  // Perfil Lipídico
  { key: "colesterol_total", label: "Colesterol Total", unidad: "mg/dL", tipoCheck: "menor", umbral: 200.0, descripcion: "Deseable: < 200 mg/dL", grupo: "Perfil Lipídico" },
  { key: "trigliceridos", label: "Triglicéridos", unidad: "mg/dL", tipoCheck: "menor", umbral: 150.0, descripcion: "Normal: < 150 mg/dL", grupo: "Perfil Lipídico" },
  { key: "ldl", label: "Colesterol LDL", unidad: "mg/dL", tipoCheck: "menor", umbral: 130.0, descripcion: "Óptimo: < 130 mg/dL", grupo: "Perfil Lipídico" },
  { key: "hdl", label: "Colesterol HDL", unidad: "mg/dL", tipoCheck: "mayor", umbral: 50.0, descripcion: "Protector en mujer: ≥ 50 mg/dL", grupo: "Perfil Lipídico" },
  { key: "vldl", label: "Colesterol VLDL", unidad: "mg/dL", min: 5.0, max: 30.0, tipoCheck: "rango", descripcion: "Normal: 5 - 30 mg/dL", grupo: "Perfil Lipídico" },
  
  // Hematología y Bioquímica General
  { key: "hemoglobina", label: "Hemoglobina", unidad: "g/dL", min: 12.0, max: 16.0, tipoCheck: "rango", descripcion: "Normal: 12.0 - 16.0 g/dL", grupo: "Hematología y Bioquímica General" },
  { key: "creatinina", label: "Creatinina Sérica", unidad: "mg/dL", min: 0.5, max: 1.1, tipoCheck: "rango", descripcion: "Normal: 0.5 - 1.1 mg/dL", grupo: "Hematología y Bioquímica General" },
  { key: "transaminasas", label: "Transaminasas (TGO/TGP)", unidad: "U/L", tipoCheck: "menor", umbral: 35.0, descripcion: "Normal: < 35 U/L", grupo: "Hematología y Bioquímica General" },
  { key: "dia_ciclo_toma", label: "Día del Ciclo de Toma", unidad: "día", min: 1, max: 35, tipoCheck: "rango", descripcion: "Día 2-5 (folicular) o 21 (lútea)", grupo: "Hematología y Bioquímica General" },
];

// Límites fisiológicos máximos plausibles para validación estricta de números
const LIMITES_HORMONALES_MAXIMOS: Partial<Record<keyof DatosHormonalesIn, number>> = {
  fsh: 200,
  lh: 200,
  tsh: 100,
  amh: 50,
  testosterona_total: 1000,
  dhea_s: 2000,
  androstenediona: 50,
  hidroxiprogesterona_17: 50,
  prolactina: 500,
  progesterona: 100,
  insulina_basal: 500,
  glucosa_basal: 700,
  glucosa_60: 700,
  glucosa_120: 700,
  insulina_60: 1000,
  insulina_120: 1000,
  colesterol_total: 800,
  trigliceridos: 2000,
  ldl: 500,
  hdl: 200,
  vldl: 200,
  hemoglobina: 25,
  creatinina: 20,
  transaminasas: 1500,
  dia_ciclo_toma: 365,
};

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function EvaluacionClinicaView() {
  const [searchParams] = useSearchParams();
  const [tabActiva, setTabActiva] = useState<"hormonales" | "clinicos" | "evaluacion">("hormonales");

  // Pacientes
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [pacienteId, setPacienteId] = useState<string>(searchParams.get("pacienteId") || "");
  const [busquedaPaciente, setBusquedaPaciente] = useState<string>("");
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState<boolean>(false);

  // Estados de Toast y Carga
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" | "info" } | null>(null);
  const [guardandoHormonales, setGuardandoHormonales] = useState(false);
  const [guardandoClinicos, setGuardandoClinicos] = useState(false);
  const [evaluandoXGBoost, setEvaluandoXGBoost] = useState(false);

  // Formulario de Parámetros Hormonales
  const [formHormonal, setFormHormonal] = useState<DatosHormonalesIn>({
    fsh: "",
    lh: "",
    tsh: "",
    amh: "",
    testosterona_total: "",
    dhea_s: "",
    androstenediona: "",
    hidroxiprogesterona_17: "",
    prolactina: "",
    progesterona: "",
    insulina_basal: "",
    glucosa_basal: "",
    colesterol_total: "",
    trigliceridos: "",
    ldl: "",
    hdl: "",
    vldl: "",
    hemoglobina: "",
    creatinina: "",
    transaminasas: "",
    dia_ciclo_toma: "",
    unidades_referencia: "",
  });

  // Formulario de Exploración Clínica y Antropometría
  const [formClinico, setFormClinico] = useState<DatosClinicosIn>({
    hirsutismo: false,
    score_ferriman_gallwey: "",
    fg_labio_superior: "",
    fg_menton: "",
    fg_pecho: "",
    fg_abdomen_superior: "",
    fg_abdomen_inferior: "",
    fg_brazos: "",
    fg_muslos: "",
    fg_espalda_superior: "",
    fg_espalda_lumbar: "",
    acne_gags_grado: "",
    alopecia_ludwig_grado: "",
    acne: false,
    alopecia_androgenica: false,
    acantosis_nigricans: false,
    ciclos_irregulares: false,
    duracion_ciclo_dias: "",
    amenorrea: false,
    oligomenorrea: false,
    peso_kg: "",
    talla_cm: "",
    circunferencia_abdominal_cm: "",
    cadera_cm: "",
    ganancia_peso: false,
    presion_sistolica: "",
    presion_diastolica: "",
    frecuencia_cardiaca: "",
    embarazada: false,
  });

  // Estados de Sincronización de Historial
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [historialCargado, setHistorialCargado] = useState(false);

  // Antecedentes Ginecológicos heredados
  const [antecedentesPaciente, setAntecedentesPaciente] = useState<AntecedentesOut | null>(null);

  const sincronizarDesdeAntecedentes = (ant?: AntecedentesOut | null) => {
    const fuente = ant || antecedentesPaciente;
    if (!fuente) return;
    setFormClinico((prev) => {
      const nuevo = { ...prev };
      if (fuente.duracion_ciclo_habitual) {
        nuevo.duracion_ciclo_dias = fuente.duracion_ciclo_habitual;
        if (fuente.duracion_ciclo_habitual > 35) {
          nuevo.oligomenorrea = true;
        }
      }
      if (fuente.tipo_ciclo) {
        const tc = fuente.tipo_ciclo.toLowerCase();
        if (tc.includes("irregular")) {
          nuevo.ciclos_irregulares = true;
        }
        if (tc.includes("amenorrea")) {
          nuevo.amenorrea = true;
        }
      }
      return nuevo;
    });
    showToast("Parámetros del ciclo menstrual sincronizados desde Antecedentes Ginecológicos", "ok");
  };

  // Modales Especializados (Ferriman-Gallwey, Curva CTOG, Métricas XGBoost y Órdenes Médicas)
  const [mostrarModalFerriman, setMostrarModalFerriman] = useState(false);
  const [mostrarModalCTOG, setMostrarModalCTOG] = useState(false);
  const [mostrarModalMetricas, setMostrarModalMetricas] = useState(false);
  const [mostrarModalOrden, setMostrarModalOrden] = useState(false);

  // Error de validación para Ferriman-Gallwey y Determinaciones Hormonales
  const [errorFerriman, setErrorFerriman] = useState<string | null>(null);
  const [erroresHormonales, setErroresHormonales] = useState<Partial<Record<keyof DatosHormonalesIn, string>>>({});

  // Manejador para guardar datos de la calculadora Ferriman-Gallwey
  const handleGuardarFerriman = (datos: {
    totalScore: number;
    hirsutismo: boolean;
    acne: boolean;
    alopecia: boolean;
    acneGags: number;
    alopeciaLudwig: number;
    detalleCuadrantes: any;
  }) => {
    setFormClinico((prev) => ({
      ...prev,
      score_ferriman_gallwey: datos.totalScore,
      hirsutismo: datos.hirsutismo,
      acne: datos.acne,
      alopecia_androgenica: datos.alopecia,
      fg_labio_superior: datos.detalleCuadrantes?.labioSuperior ?? 0,
      fg_menton: datos.detalleCuadrantes?.menton ?? 0,
      fg_pecho: datos.detalleCuadrantes?.pecho ?? 0,
      fg_abdomen_superior: datos.detalleCuadrantes?.abdomenSuperior ?? 0,
      fg_abdomen_inferior: datos.detalleCuadrantes?.abdomenInferior ?? 0,
      fg_brazos: datos.detalleCuadrantes?.brazos ?? 0,
      fg_muslos: datos.detalleCuadrantes?.muslos ?? 0,
      fg_espalda_superior: datos.detalleCuadrantes?.espaldaSuperior ?? 0,
      fg_espalda_lumbar: datos.detalleCuadrantes?.espaldaLumbar ?? 0,
      acne_gags_grado: datos.acneGags,
      alopecia_ludwig_grado: datos.alopeciaLudwig,
    }));
    setErrorFerriman(null);
    showToast(
      `Puntuación Ferriman-Gallwey (${datos.totalScore} pts) registrada con sus 9 cuadrantes en expediente. Hirsutismo: ${
        datos.hirsutismo ? "Positivo (≥ 8 pts)" : "Negativo (< 8 pts)"
      }`,
      "ok"
    );
  };

  // Manejador para guardar datos de la Curva CTOG e Insulina Dinámica
  const handleGuardarCTOG = (datos: {
    glucosa0: number;
    insulina0: number;
    glucosa60: number;
    insulina60: number;
    glucosa120: number;
    insulina120: number;
    homaIr: number;
    quicki: number;
    matsuda: number;
    dictamen: string;
  }) => {
    setFormHormonal((prev) => ({
      ...prev,
      glucosa_basal: datos.glucosa0,
      insulina_basal: datos.insulina0,
    }));
    showToast(
      `Curva CTOG sincronizada. HOMA-IR: ${datos.homaIr}, Matsuda: ${datos.matsuda}. ${datos.dictamen}`,
      "ok"
    );
  };

  // Resultado del Dictamen de Criterios Clínicos 1 y 2
  const [evaluacionResultado, setEvaluacionResultado] = useState<EvaluacionXGBoostResponse | null>(null);

  const showToast = (msg: string, tipo: "ok" | "error" | "info" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar lista de pacientes
  useEffect(() => {
    listarPacientes("", null, 1, 100)
      .then((data) => setPacientes(data))
      .catch((err) => console.error("Error al cargar pacientes:", err));
  }, []);

  // Sincronizar automáticamente datos clínicos y hormonales previos al seleccionar paciente
  useEffect(() => {
    if (!pacienteId) {
      setHistorialCargado(false);
      return;
    }
    let cancel = false;
    setCargandoHistorial(true);

    Promise.all([
      obtenerUltimosDatosHormonalesPaciente(pacienteId).catch(() => null),
      obtenerUltimosDatosClinicosPaciente(pacienteId).catch(() => null),
      obtenerAntecedentes(pacienteId).catch(() => null),
    ])
      .then(([dh, dc, ant]) => {
        if (cancel) return;
        let cargados = false;

        if (ant) {
          setAntecedentesPaciente(ant);
        } else {
          setAntecedentesPaciente(null);
        }

        if (dh) {
          setFormHormonal({
            fsh: dh.fsh ?? "",
            lh: dh.lh ?? "",
            tsh: dh.tsh ?? "",
            amh: dh.amh ?? "",
            testosterona_total: dh.testosterona_total ?? "",
            dhea_s: dh.dhea_s ?? "",
            androstenediona: dh.androstenediona ?? "",
            hidroxiprogesterona_17: dh.hidroxiprogesterona_17 ?? "",
            prolactina: dh.prolactina ?? "",
            progesterona: dh.progesterona ?? "",
            insulina_basal: dh.insulina_basal ?? "",
            glucosa_basal: dh.glucosa_basal ?? "",
            colesterol_total: dh.colesterol_total ?? "",
            trigliceridos: dh.trigliceridos ?? "",
            ldl: dh.ldl ?? "",
            hdl: dh.hdl ?? "",
            vldl: dh.vldl ?? "",
            hemoglobina: dh.hemoglobina ?? "",
            creatinina: dh.creatinina ?? "",
            transaminasas: dh.transaminasas ?? "",
            dia_ciclo_toma: dh.dia_ciclo_toma ?? "",
            unidades_referencia: dh.unidades_referencia ?? "",
          });
          cargados = true;
        }

        // Parámetros derivados de Antecedentes Ginecológicos
        const antDuracion = ant?.duracion_ciclo_habitual ?? "";
        const antIrregular = ant?.tipo_ciclo ? ant.tipo_ciclo.toLowerCase().includes("irregular") : false;
        const antAmenorrea = ant?.tipo_ciclo ? ant.tipo_ciclo.toLowerCase().includes("amenorrea") : false;
        const antOligomenorrea = ant?.duracion_ciclo_habitual ? ant.duracion_ciclo_habitual > 35 : false;

        if (dc) {
          setFormClinico({
            hirsutismo: Boolean(dc.hirsutismo),
            score_ferriman_gallwey: dc.score_ferriman_gallwey ?? "",
            fg_labio_superior: dc.fg_labio_superior ?? "",
            fg_menton: dc.fg_menton ?? "",
            fg_pecho: dc.fg_pecho ?? "",
            fg_abdomen_superior: dc.fg_abdomen_superior ?? "",
            fg_abdomen_inferior: dc.fg_abdomen_inferior ?? "",
            fg_brazos: dc.fg_brazos ?? "",
            fg_muslos: dc.fg_muslos ?? "",
            fg_espalda_superior: dc.fg_espalda_superior ?? "",
            fg_espalda_lumbar: dc.fg_espalda_lumbar ?? "",
            acne_gags_grado: dc.acne_gags_grado ?? "",
            alopecia_ludwig_grado: dc.alopecia_ludwig_grado ?? "",
            acne: Boolean(dc.acne),
            alopecia_androgenica: Boolean(dc.alopecia_androgenica),
            acantosis_nigricans: Boolean(dc.acantosis_nigricans),
            ciclos_irregulares: (dc.ciclos_irregulares !== undefined && dc.ciclos_irregulares !== null) ? Boolean(dc.ciclos_irregulares) : antIrregular,
            duracion_ciclo_dias: (dc.duracion_ciclo_dias !== undefined && dc.duracion_ciclo_dias !== null && dc.duracion_ciclo_dias !== "") ? dc.duracion_ciclo_dias : antDuracion,
            amenorrea: (dc.amenorrea !== undefined && dc.amenorrea !== null) ? Boolean(dc.amenorrea) : antAmenorrea,
            oligomenorrea: (dc.oligomenorrea !== undefined && dc.oligomenorrea !== null) ? Boolean(dc.oligomenorrea) : antOligomenorrea,
            peso_kg: dc.peso_kg ?? "",
            talla_cm: dc.talla_cm ?? "",
            circunferencia_abdominal_cm: dc.circunferencia_abdominal_cm ?? "",
            cadera_cm: dc.cadera_cm ?? "",
            ganancia_peso: Boolean(dc.ganancia_peso),
            presion_sistolica: dc.presion_sistolica ?? "",
            presion_diastolica: dc.presion_diastolica ?? "",
            frecuencia_cardiaca: dc.frecuencia_cardiaca ?? "",
            embarazada: Boolean(dc.embarazada),
          });
          cargados = true;
        } else if (ant) {
          setFormClinico((prev) => ({
            ...prev,
            duracion_ciclo_dias: antDuracion,
            ciclos_irregulares: antIrregular,
            amenorrea: antAmenorrea,
            oligomenorrea: antOligomenorrea,
          }));
          cargados = true;
        }
        setHistorialCargado(cargados);
      })
      .catch((err) => {
        console.warn("Aviso al consultar historial previo:", err);
      })
      .finally(() => {
        if (!cancel) setCargandoHistorial(false);
      });

    return () => {
      cancel = true;
    };
  }, [pacienteId]);

  // Paciente seleccionado
  const pacienteSeleccionado = useMemo(() => {
    return pacientes.find((p) => p.id === pacienteId) || null;
  }, [pacientes, pacienteId]);

  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente.trim()) return pacientes;
    const q = busquedaPaciente.toLowerCase();
    return pacientes.filter(
      (p) =>
        `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.toLowerCase().includes(q) ||
        (p.ci && p.ci.toLowerCase().includes(q))
    );
  }, [pacientes, busquedaPaciente]);

  // Cálculos Automáticos Hormonales en Vivo (HOMA-IR y LH/FSH)
  const homaIrCalculado = useMemo(() => {
    const g = parseFloat(String(formHormonal.glucosa_basal));
    const i = parseFloat(String(formHormonal.insulina_basal));
    if (!isNaN(g) && !isNaN(i) && g > 0 && i > 0) {
      return ((g * i) / 405.0).toFixed(2);
    }
    return null;
  }, [formHormonal.glucosa_basal, formHormonal.insulina_basal]);

  const lhFshCalculado = useMemo(() => {
    const l = parseFloat(String(formHormonal.lh));
    const f = parseFloat(String(formHormonal.fsh));
    if (!isNaN(l) && !isNaN(f) && f > 0) {
      return (l / f).toFixed(2);
    }
    return null;
  }, [formHormonal.lh, formHormonal.fsh]);

  // Cálculos Automáticos Clínicos en Vivo (IMC y Cintura/Cadera)
  const imcCalculado = useMemo(() => {
    const p = parseFloat(String(formClinico.peso_kg));
    const t = parseFloat(String(formClinico.talla_cm));
    if (!isNaN(p) && !isNaN(t) && p > 0 && t > 0) {
      const t_m = t > 3 ? t / 100.0 : t;
      const imc = p / (t_m * t_m);
      let cat = "Normal";
      let color = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400";
      if (imc < 18.5) {
        cat = "Bajo peso";
        color = "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400";
      } else if (imc >= 25 && imc < 30) {
        cat = "Sobrepeso";
        color = "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400";
      } else if (imc >= 30) {
        cat = "Obesidad";
        color = "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400";
      }
      return { valor: imc.toFixed(2), categoria: cat, colorClase: color };
    }
    return null;
  }, [formClinico.peso_kg, formClinico.talla_cm]);

  const relacionCinturaCaderaCalculada = useMemo(() => {
    const c = parseFloat(String(formClinico.circunferencia_abdominal_cm));
    const ca = parseFloat(String(formClinico.cadera_cm));
    if (!isNaN(c) && !isNaN(ca) && ca > 0) {
      return (c / ca).toFixed(2);
    }
    return null;
  }, [formClinico.circunferencia_abdominal_cm, formClinico.cadera_cm]);

  // Función para determinar el semáforo de un campo hormonal
  const getSemaforo = (config: CampoHormonalConfig, valorRaw: any): { estado: "normal" | "alterado" | "vacio"; label: string; color: string } => {
    if (valorRaw === "" || valorRaw === null || valorRaw === undefined) {
      return { estado: "vacio", label: "No ingresado", color: "bg-slate-200 text-slate-500 dark:bg-navy-700 dark:text-slate-400" };
    }
    const val = parseFloat(String(valorRaw));
    if (isNaN(val)) {
      return { estado: "vacio", label: "Inválido", color: "bg-slate-200 text-slate-500" };
    }

    let alterado = false;
    if (config.tipoCheck === "rango" && config.min !== undefined && config.max !== undefined) {
      alterado = val < config.min || val > config.max;
    } else if (config.tipoCheck === "menor" && config.umbral !== undefined) {
      alterado = val > config.umbral;
    } else if (config.tipoCheck === "mayor" && config.umbral !== undefined) {
      alterado = val < config.umbral;
    }

    if (alterado) {
      return { estado: "alterado", label: "Alterado", color: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900" };
    }
    return { estado: "normal", label: "Normal", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900" };
  };

  // Manejar cambio y validación de números en inputs hormonales
  const handleHormonalChange = (campo: keyof DatosHormonalesIn, valor: string) => {
    if (valor === "") {
      setErroresHormonales((prev) => {
        const copy = { ...prev };
        delete copy[campo];
        return copy;
      });
      setFormHormonal((prev) => ({
        ...prev,
        [campo]: "",
      }));
      return;
    }

    const num = Number(valor);
    if (isNaN(num)) {
      setErroresHormonales((prev) => ({
        ...prev,
        [campo]: "Solo se admiten valores numéricos.",
      }));
      return;
    }

    if (num < 0) {
      setErroresHormonales((prev) => ({
        ...prev,
        [campo]: "No se admiten valores negativos en determinaciones hormonales.",
      }));
      setFormHormonal((prev) => ({
        ...prev,
        [campo]: 0,
      }));
      return;
    }

    const maxPermitido = LIMITES_HORMONALES_MAXIMOS[campo];
    if (maxPermitido && num > maxPermitido) {
      setErroresHormonales((prev) => ({
        ...prev,
        [campo]: `Valor excede límite biológico fisiológico (máx: ${maxPermitido}).`,
      }));
    } else {
      setErroresHormonales((prev) => {
        const copy = { ...prev };
        delete copy[campo];
        return copy;
      });
    }

    setFormHormonal((prev) => ({
      ...prev,
      [campo]: num,
    }));
  };

  // Manejar cambio en inputs clínicos
  const handleClinicoChange = (campo: keyof DatosClinicosIn, valor: any) => {
    if (campo === "score_ferriman_gallwey") {
      if (valor === "") {
        setErrorFerriman(null);
        setFormClinico((prev) => ({ ...prev, [campo]: "" }));
        return;
      }
      const num = Number(valor);
      if (isNaN(num) || num < 0 || num > 36) {
        setErrorFerriman("Error: El score Ferriman-Gallwey debe aceptar únicamente valores entre 0 y 36.");
      } else {
        setErrorFerriman(null);
      }
      setFormClinico((prev) => ({ ...prev, [campo]: num }));
      return;
    }

    setFormClinico((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // Guardar Datos Hormonales en Historial Clínico
  const handleGuardarHormonales = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validar que no haya determinaciones hormonales negativas o fuera de rango
    const camposConError = Object.keys(erroresHormonales);
    if (camposConError.length > 0) {
      showToast(`Por favor corrija los parámetros con errores numéricos antes de guardar: ${camposConError.join(", ")}`, "error");
      return;
    }

    for (const [k, v] of Object.entries(formHormonal)) {
      if (typeof v === "number" && v < 0) {
        showToast(`El parámetro ${k} no puede tener un valor negativo (${v})`, "error");
        return;
      }
    }

    setGuardandoHormonales(true);
    try {
      const payload: DatosHormonalesIn = {
        ...formHormonal,
        paciente_id: pacienteId || undefined,
        homa_ir: homaIrCalculado ? Number(homaIrCalculado) : undefined,
        relacion_lh_fsh: lhFshCalculado ? Number(lhFshCalculado) : undefined,
      };

      await guardarDatosHormonales(payload);
      showToast("Datos hormonales registrados correctamente con cálculos automáticos", "ok");
    } catch (err: any) {
      showToast(err.message || "Error al guardar datos hormonales", "error");
    } finally {
      setGuardandoHormonales(false);
    }
  };

  // Guardar Datos Clínicos en Historial Clínico
  const handleGuardarClinicos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (errorFerriman) {
      showToast(errorFerriman, "error");
      return;
    }
    setGuardandoClinicos(true);
    try {
      const payload: DatosClinicosIn = {
        ...formClinico,
        paciente_id: pacienteId || undefined,
        imc: imcCalculado ? Number(imcCalculado.valor) : undefined,
        relacion_cintura_cadera: relacionCinturaCaderaCalculada ? Number(relacionCinturaCaderaCalculada) : undefined,
      };

      await guardarDatosClinicos(payload);
      showToast("Datos clínicos guardados exitosamente", "ok");
    } catch (err: any) {
      showToast(err.message || "Error al guardar datos clínicos", "error");
    } finally {
      setGuardandoClinicos(false);
    }
  };

  // Ejecutar Evaluación Clínica Multivariada Rotterdam (Guarda automáticamente y evalúa)
  const handleEjecutarEvaluacion = async () => {
    if (errorFerriman) {
      showToast("Por favor corrija el Score Ferriman-Gallwey antes de evaluar", "error");
      return;
    }
    const camposConError = Object.keys(erroresHormonales);
    if (camposConError.length > 0) {
      showToast(`Por favor corrija los parámetros con errores numéricos: ${camposConError.join(", ")}`, "error");
      return;
    }
    setEvaluandoXGBoost(true);
    try {
      let consultaIdActiva: string | undefined = undefined;

      // Guardar automáticamente en BD si hay paciente seleccionada
      if (pacienteId) {
        try {
          const payloadClinico: DatosClinicosIn = {
            ...formClinico,
            paciente_id: pacienteId,
            imc: imcCalculado ? Number(imcCalculado.valor) : undefined,
            relacion_cintura_cadera: relacionCinturaCaderaCalculada ? Number(relacionCinturaCaderaCalculada) : undefined,
          };
          const resClin = await guardarDatosClinicos(payloadClinico);
          if (resClin?.consulta_id) {
            consultaIdActiva = resClin.consulta_id;
          }

          const payloadHormonal: DatosHormonalesIn = {
            ...formHormonal,
            paciente_id: pacienteId,
            consulta_id: consultaIdActiva,
            homa_ir: homaIrCalculado ? Number(homaIrCalculado) : undefined,
            relacion_lh_fsh: lhFshCalculado ? Number(lhFshCalculado) : undefined,
          };
          await guardarDatosHormonales(payloadHormonal);
        } catch (eSave) {
          console.warn("Advertencia al guardar automáticamente datos en evaluación:", eSave);
        }
      }

      const reqPayload = {
        paciente_id: pacienteId || undefined,
        consulta_id: consultaIdActiva,
        datos_hormonales: {
          ...formHormonal,
          homa_ir: homaIrCalculado ? Number(homaIrCalculado) : undefined,
          relacion_lh_fsh: lhFshCalculado ? Number(lhFshCalculado) : undefined,
        },
        datos_clinicos: {
          ...formClinico,
          imc: imcCalculado ? Number(imcCalculado.valor) : undefined,
          relacion_cintura_cadera: relacionCinturaCaderaCalculada ? Number(relacionCinturaCaderaCalculada) : undefined,
        },
      };

      const resultado = await evaluarXGBoost(reqPayload);
      setEvaluacionResultado(resultado);
      setTabActiva("evaluacion");
      showToast("Datos clínicos y hormonales guardados. Evaluación de Rotterdam completada con éxito", "ok");
    } catch (err: any) {
      showToast(err.message || "Error al procesar la evaluación de criterios clínicos", "error");
    } finally {
      setEvaluandoXGBoost(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
            toast.tipo === "ok" ? "bg-emerald-600" : toast.tipo === "error" ? "bg-rose-600" : "bg-sky-600"
          }`}
        >
          {toast.tipo === "ok" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
          {toast.msg}
        </div>
      )}

      {/* ── ENCABEZADO MÉDICO UNIFICADO (CRITERIOS 1 Y 2) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {pacienteSeleccionado
              ? `${pacienteSeleccionado.nombre.charAt(0)}${pacienteSeleccionado.primer_apellido.charAt(0)}`
              : "CL"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Evaluación Clínica y Hormonal (Criterios 1-2)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Expediente: <strong className="text-slate-800">CI {pacienteSeleccionado?.ci || "Sin CI"}</strong>
              </span>
              {pacienteSeleccionado?.fecha_nacimiento && (
                <span className="text-xs text-slate-500 font-medium">
                  • Edad: <strong className="text-slate-800">{calcularEdad(pacienteSeleccionado.fecha_nacimiento)}</strong>
                </span>
              )}
              {historialCargado && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <MdCheckCircle size={12} /> Historial en BD
                </span>
              )}
              {cargandoHistorial && (
                <span className="text-[10px] font-bold text-indigo-500 animate-pulse">
                  Sincronizando expediente...
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {pacienteSeleccionado
                ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.primer_apellido} ${pacienteSeleccionado.segundo_apellido || ""}`
                : "Evaluación clínica libre / Sin paciente"}
            </h2>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownPacienteAbierto(!dropdownPacienteAbierto)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200 shadow-sm"
          >
            <MdPerson size={16} />
            <span>{pacienteSeleccionado ? "Cambiar Paciente" : "Seleccionar Paciente"}</span>
          </button>

          {dropdownPacienteAbierto && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 space-y-1 animate-fade-in-up">
              <input
                type="text"
                placeholder="Buscar por nombre o CI..."
                value={busquedaPaciente}
                onChange={(e) => setBusquedaPaciente(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-xs px-3 py-1.5 mb-1 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  setPacienteId("");
                  setDropdownPacienteAbierto(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                — Sin paciente (Evaluación libre) —
              </button>
              {pacientesFiltrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPacienteId(p.id);
                    setDropdownPacienteAbierto(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    pacienteId === p.id
                      ? "bg-purple-50 text-purple-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{`${p.nombre} ${p.primer_apellido}`}</span>
                  <span className="text-[10px] text-slate-400">CI: {p.ci || "—"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA DE CALCULADORAS CLÍNICAS Y ÓRDENES MÉDICAS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Tarjeta Calculadora Ferriman-Gallwey */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50/30 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-navy-800 border border-purple-200/90 dark:border-purple-800/60 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-purple-500/20 shrink-0">
              🔬
            </div>
            <div>
              <h4 className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                Escala Ferriman-Gallwey
              </h4>
              <p className="text-[11px] text-purple-700/90 dark:text-purple-300 font-medium">
                Puntuación 0 a 36, umbral ≥8 pts (Hirsutismo) y Alopecia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarModalFerriman(true)}
            className="w-full px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            Abrir Ferriman →
          </button>
        </div>

        {/* Tarjeta Curva CTOG e Insulina Dinámica */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-cyan-50/50 to-blue-50/30 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-navy-800 border border-blue-200/90 dark:border-blue-800/60 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 shrink-0">
              📈
            </div>
            <div>
              <h4 className="text-xs font-black text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                Curva CTOG e Insulina
              </h4>
              <p className="text-[11px] text-blue-700/90 dark:text-blue-300 font-medium">
                HOMA-IR, QUICKI, Matsuda y gráfico dinámico de doble curva
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarModalCTOG(true)}
            className="w-full px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            Abrir Curva CTOG →
          </button>
        </div>

        {/* Tarjeta Solicitud de Órdenes Médicas (Laboratorio & Ecografía) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-indigo-50/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-navy-800 border border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20 shrink-0">
              📋
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                  Órdenes Médicas
                </h4>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-md">
                  Rotterdam
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300 font-medium">
                Solicitud de análisis de sangre y ecografía según sexarca
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!pacienteId) {
                showToast("Por favor seleccione una paciente antes de emitir una orden médica", "error");
                return;
              }
              setMostrarModalOrden(true);
            }}
            className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            Emitir / Ver Órdenes →
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación (Tabs) */}
      <div className="flex border-b border-slate-200 dark:border-navy-700 gap-2">
        <button
          onClick={() => setTabActiva("hormonales")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
            tabActiva === "hormonales"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <MdScience size={18} />
          1. Perfil Hormonal
        </button>

        <button
          onClick={() => setTabActiva("clinicos")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
            tabActiva === "clinicos"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <MdFitnessCenter size={18} />
          2. Exploración Clínica y Antropometría
        </button>

        <button
          onClick={() => setTabActiva("evaluacion")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
            tabActiva === "evaluacion"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <MdAutoGraph size={18} />
          3. Evaluación Criterios 1 y 2 (Rotterdam)
        </button>
      </div>

      {/* ── SECCIÓN 1: PERFIL HORMONAL ── */}
      {tabActiva === "hormonales" && (
        <Card extra="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-navy-700">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <MdScience className="text-indigo-500" size={20} />
                Perfil de Laboratorio Hormonal por Consulta
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Todos los campos son opcionales. El semáforo clínico evalúa valores dentro (verde) o fuera (rojo) del rango de referencia.
              </p>
            </div>

            {/* Badges de Cálculos Automáticos en Tiempo Real */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Relación LH/FSH */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">LH/FSH Automático:</span>
                <span
                  className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                    lhFshCalculado
                      ? Number(lhFshCalculado) >= 2.0
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {lhFshCalculado ? `${lhFshCalculado} ${Number(lhFshCalculado) >= 2.0 ? "(≥2.0 Alterado)" : "(Normal)"}` : "—"}
                </span>
              </div>

              {/* HOMA-IR */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">HOMA-IR Automático:</span>
                <span
                  className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                    homaIrCalculado
                      ? Number(homaIrCalculado) >= 2.5
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {homaIrCalculado ? `${homaIrCalculado} ${Number(homaIrCalculado) >= 2.5 ? "(≥2.5 Resistencia Insulina)" : "(Normal)"}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Grupos de Campos Hormonales */}
          <div className="space-y-6">
            {Array.from(new Set(CAMPOS_HORMONALES.map((c) => c.grupo))).map((grupo) => {
              const camposGrupo = CAMPOS_HORMONALES.filter((c) => c.grupo === grupo);
              return (
                <div key={grupo} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-navy-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                        {grupo}
                      </h3>
                    </div>
                    {grupo === "Metabolismo Glucémico" && (
                      <button
                        type="button"
                        onClick={() => setMostrarModalCTOG(true)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 transition shadow-2xs"
                      >
                        <MdShowChart size={15} />
                        Curva CTOG e Insulina Dinámica (0 - 60 - 120 min)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {camposGrupo.map((cfg) => {
                      const val = formHormonal[cfg.key];
                      const sem = getSemaforo(cfg, val);
                      return (
                        <div
                          key={cfg.key}
                          className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-navy-900/40 border border-slate-200/80 dark:border-navy-700/80 flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                              {cfg.label}
                            </label>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sem.color}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sem.estado === "normal"
                                    ? "bg-emerald-500"
                                    : sem.estado === "alterado"
                                    ? "bg-rose-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              {sem.label}
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Ej. 0.0"
                              value={val !== undefined && val !== null ? val : ""}
                              onChange={(e) => handleHormonalChange(cfg.key, e.target.value)}
                              className={`w-full px-3 py-2 pr-16 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border outline-none text-slate-800 dark:text-white transition ${
                                erroresHormonales[cfg.key]
                                  ? "border-rose-400 focus:border-rose-500 ring-1 ring-rose-300"
                                  : "border-slate-200 dark:border-navy-700 focus:border-indigo-500"
                              }`}
                            />
                            <span className="absolute right-3 top-2.5 text-[10px] font-extrabold text-slate-400">
                              {cfg.unidad}
                            </span>
                          </div>

                          {erroresHormonales[cfg.key] ? (
                            <p className="text-[10px] font-bold text-rose-500 leading-tight">
                              ⚠️ {erroresHormonales[cfg.key]}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal truncate" title={cfg.descripcion}>
                              {cfg.descripcion}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botonera de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-navy-700">
            <span className="text-xs text-slate-400">
              * Los campos sin ingresar son tratados automáticamente como valores nulos.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGuardarHormonales}
                disabled={guardandoHormonales}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-slate-800 hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-sm"
              >
                <MdSave size={16} />
                {guardandoHormonales ? "Guardando..." : "Guardar Datos Hormonales"}
              </button>
              <button
                type="button"
                onClick={() => setTabActiva("clinicos")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-navy-700 dark:text-indigo-300 transition-all"
              >
                Siguiente: Datos Clínicos →
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECCIÓN 2: DATOS CLÍNICOS Y ANTROPOMETRÍA ── */}
      {tabActiva === "clinicos" && (
        <Card extra="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-navy-700">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <MdFitnessCenter className="text-indigo-500" size={20} />
                Signos Físicos, Antropometría y Presión Arterial
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Score Ferriman-Gallwey restringido a (0-36). El IMC y la relación cintura/cadera se calculan automáticamente.
              </p>
            </div>

            {/* Badges de Cálculos Clínicos */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">IMC Automático:</span>
                <span
                  className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                    imcCalculado ? imcCalculado.colorClase : "text-slate-400"
                  }`}
                >
                  {imcCalculado ? `${imcCalculado.valor} kg/m² (${imcCalculado.categoria})` : "—"}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">Cintura/Cadera:</span>
                <span
                  className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                    relacionCinturaCaderaCalculada
                      ? Number(relacionCinturaCaderaCalculada) >= 0.85
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {relacionCinturaCaderaCalculada
                    ? `${relacionCinturaCaderaCalculada} ${Number(relacionCinturaCaderaCalculada) >= 0.85 ? "(Riesgo Androide ≥0.85)" : "(Normal)"}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloque 1: Signos de Hiperandrogenismo */}
            <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-navy-900/40 border border-slate-200/80 dark:border-navy-700 space-y-4">
              <h3 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <MdScience size={16} />
                Signos de Hiperandrogenismo
              </h3>

              {/* Ferriman-Gallwey con Validación Estricta */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Score Ferriman-Gallwey (0 a 36) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarModalFerriman(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition shadow-2xs"
                  >
                    <MdAutoGraph size={14} />
                    Calculadora 9 Cuadrantes
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={formClinico.score_ferriman_gallwey !== undefined ? formClinico.score_ferriman_gallwey : ""}
                  onChange={(e) => handleClinicoChange("score_ferriman_gallwey", e.target.value)}
                  placeholder="Ingrese valor de 0 a 36..."
                  className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border outline-none ${
                    errorFerriman
                      ? "border-rose-500 focus:border-rose-600 bg-rose-50/30 text-rose-700"
                      : "border-slate-200 dark:border-navy-700 focus:border-indigo-500 text-slate-800 dark:text-white"
                  }`}
                />
                {errorFerriman && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                    <MdErrorOutline size={14} />
                    {errorFerriman}
                  </p>
                )}
              </div>

              {/* Switches Signos Físicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { key: "hirsutismo" as const, label: "Hirsutismo Clínico" },
                  { key: "acne" as const, label: "Acné Persistente / Severo" },
                  { key: "alopecia_androgenica" as const, label: "Alopecia Androgénica" },
                  { key: "acantosis_nigricans" as const, label: "Acantosis Nigricans" },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleClinicoChange(item.key, !formClinico[item.key])}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      formClinico[item.key]
                        ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700"
                        : "bg-white dark:bg-navy-800 border-slate-200 dark:border-navy-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        formClinico[item.key]
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-navy-700"
                      }`}
                    >
                      {formClinico[item.key] ? "SÍ" : "NO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloque 2: Ciclo Menstrual (Criterio 1) */}
            <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-navy-900/40 border border-slate-200/80 dark:border-navy-700 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <MdSpeed size={16} />
                  Ciclo Menstrual y Disfunción Ovulatoria (Criterio 1)
                </h3>
                {antecedentesPaciente && (
                  <button
                    type="button"
                    onClick={() => sincronizarDesdeAntecedentes()}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    title="Re-sincronizar valores desde el módulo de Antecedentes Ginecológicos"
                  >
                    ↺ Sincronizar de Antecedentes
                  </button>
                )}
              </div>

              {/* Banner de Sincronización con Antecedentes */}
              {antecedentesPaciente ? (
                <div className="p-3 rounded-xl bg-blue-50/90 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/80 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Heredado de Antecedentes Ginecológicos
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Auto-Cargado
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Menarquia:</span>
                      <strong className="text-slate-800 dark:text-white">{antecedentesPaciente.edad_menarquia ? `${antecedentesPaciente.edad_menarquia} años` : "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Patrón del Ciclo:</span>
                      <strong className="text-slate-800 dark:text-white capitalize">{antecedentesPaciente.tipo_ciclo || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Duración Habitual:</span>
                      <strong className="text-slate-800 dark:text-white">{antecedentesPaciente.duracion_ciclo_habitual ? `${antecedentesPaciente.duracion_ciclo_habitual} días` : "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Sexarca:</span>
                      <strong className="text-slate-800 dark:text-white">{antecedentesPaciente.iniciada_vida_sexual ? "Activa" : "No iniciada"}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-navy-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-navy-700">
                  ℹ️ Sin antecedentes previos cargados. El valor ingresado evaluará oligomenorrea (&gt;35 días) o amenorrea (&gt;90 días).
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Duración Habitual del Ciclo (Días)
                </label>
                <input
                  type="number"
                  placeholder="Ej. 28, 35, 45 días..."
                  value={formClinico.duracion_ciclo_dias !== undefined ? formClinico.duracion_ciclo_dias : ""}
                  onChange={(e) => handleClinicoChange("duracion_ciclo_dias", e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">
                  Ciclos fisiológicos: 21 a 35 días. Más de 35 días sugiere Oligomenorrea.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                {[
                  { key: "ciclos_irregulares" as const, label: "Ciclos Irregulares" },
                  { key: "oligomenorrea" as const, label: "Oligomenorrea (>35d)" },
                  { key: "amenorrea" as const, label: "Amenorrea (>90d)" },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleClinicoChange(item.key, !formClinico[item.key])}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      formClinico[item.key]
                        ? "bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
                        : "bg-white dark:bg-navy-800 border-slate-200 dark:border-navy-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        formClinico[item.key]
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-navy-700"
                      }`}
                    >
                      {formClinico[item.key] ? "SÍ" : "NO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bloque 3: Antropometría y Presión Arterial */}
          <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-navy-900/40 border border-slate-200/80 dark:border-navy-700 space-y-4">
            <h3 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <MdTrendingUp size={16} />
              Antropometría y Parámetros Cardiovasculares
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Peso (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 65.5"
                  value={formClinico.peso_kg !== undefined ? formClinico.peso_kg : ""}
                  onChange={(e) => handleClinicoChange("peso_kg", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Talla (cm) *</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ej. 162"
                  value={formClinico.talla_cm !== undefined ? formClinico.talla_cm : ""}
                  onChange={(e) => handleClinicoChange("talla_cm", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Frec. Cardíaca (lpm)</label>
                <input
                  type="number"
                  placeholder="Ej. 72"
                  value={formClinico.frecuencia_cardiaca !== undefined ? formClinico.frecuencia_cardiaca : ""}
                  onChange={(e) => handleClinicoChange("frecuencia_cardiaca", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">P. Sistólica (mmHg)</label>
                <input
                  type="number"
                  placeholder="Ej. 120"
                  value={formClinico.presion_sistolica !== undefined ? formClinico.presion_sistolica : ""}
                  onChange={(e) => handleClinicoChange("presion_sistolica", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">P. Diastólica (mmHg)</label>
                <input
                  type="number"
                  placeholder="Ej. 80"
                  value={formClinico.presion_diastolica !== undefined ? formClinico.presion_diastolica : ""}
                  onChange={(e) => handleClinicoChange("presion_diastolica", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Cintura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ej. 82"
                  value={formClinico.circunferencia_abdominal_cm !== undefined ? formClinico.circunferencia_abdominal_cm : ""}
                  onChange={(e) => handleClinicoChange("circunferencia_abdominal_cm", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Cadera (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ej. 98"
                  value={formClinico.cadera_cm !== undefined ? formClinico.cadera_cm : ""}
                  onChange={(e) => handleClinicoChange("cadera_cm", e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label
                onClick={() => handleClinicoChange("ganancia_peso", !formClinico.ganancia_peso)}
                className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={Boolean(formClinico.ganancia_peso)}
                  readOnly
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Ganancia de peso reciente difícil de controlar
              </label>

              <label
                onClick={() => handleClinicoChange("embarazada", !formClinico.embarazada)}
                className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={Boolean(formClinico.embarazada)}
                  readOnly
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Paciente cursando embarazo
              </label>
            </div>
          </div>

          {/* Botonera de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-navy-700">
            <span className="text-xs text-slate-400">
              * Datos clínicos confidenciales protegidos bajo normativas de seguridad y privacidad médica.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGuardarClinicos}
                disabled={guardandoClinicos}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-slate-800 hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-sm"
              >
                <MdSave size={16} />
                {guardandoClinicos ? "Guardando..." : "Guardar Datos Clínicos"}
              </button>
              <button
                type="button"
                onClick={handleEjecutarEvaluacion}
                disabled={evaluandoXGBoost}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md"
              >
                <MdPlayArrow size={18} />
                {evaluandoXGBoost ? "Procesando evaluación clínica..." : "Evaluar Criterios 1 y 2 de Rotterdam →"}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECCIÓN 3: EVALUACIÓN DE CRITERIOS ROTTERDAM ── */}
      {tabActiva === "evaluacion" && (
        <div className="space-y-6">
          {/* Botón de Lanzamiento / Reevaluación */}
          <Card extra="p-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                Criterios Diagnósticos Clínicos
              </span>
              <h2 className="text-lg font-black text-white mt-0.5">
                Evaluación Asistida de Criterios 1 y 2 de Rotterdam
              </h2>
              <p className="text-xs text-slate-300 max-w-xl mt-1">
                Evaluación clínica de disfunción ovulatoria e hiperandrogenismo con base en los parámetros hormonales y antropométricos registrados.
              </p>
            </div>

            <button
              type="button"
              onClick={handleEjecutarEvaluacion}
              disabled={evaluandoXGBoost}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black text-indigo-950 bg-white hover:bg-indigo-50 transition-all shadow-md flex-shrink-0"
            >
              <MdAutoGraph size={20} className="text-indigo-600" />
              {evaluandoXGBoost ? "Procesando en Servidor..." : "Ejecutar / Actualizar Evaluación"}
            </button>
          </Card>

          {/* Resultados de Criterio 1 y Criterio 2 */}
          {evaluacionResultado ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tarjeta Criterio 1: Disfunción Ovulatoria */}
              <Card extra="p-6 space-y-4 border-2 border-slate-100 dark:border-navy-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Escala de Rotterdam — Criterio 1
                    </span>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mt-0.5">
                      Disfunción Ovulatoria (Oligo/Anovulación)
                    </h3>
                  </div>

                  {/* Badge de Cumplimiento */}
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                      evaluacionResultado.criterio_1.cumple
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                    }`}
                  >
                    {evaluacionResultado.criterio_1.cumple ? <MdWarning size={16} /> : <MdDone size={16} />}
                    {evaluacionResultado.criterio_1.resultado}
                  </span>
                </div>

                {/* Barra de Probabilidad */}
                <div className="space-y-1.5 bg-slate-50 dark:bg-navy-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-navy-700">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-600 dark:text-slate-300">
                      Probabilidad Estimada del Criterio
                    </span>
                    <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {evaluacionResultado.criterio_1.probabilidad.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        evaluacionResultado.criterio_1.cumple
                          ? "bg-gradient-to-r from-rose-500 to-rose-600"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, evaluacionResultado.criterio_1.probabilidad))}%` }}
                    />
                  </div>
                </div>

                {/* Factores Determinantes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Factores Determinantes Detectados:
                  </h4>
                  <ul className="space-y-1.5">
                    {evaluacionResultado.criterio_1.factores_determinantes.map((f, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-navy-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-navy-700"
                      >
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-navy-700 leading-relaxed">
                  {evaluacionResultado.criterio_1.interpretacion_medica}
                </p>
              </Card>

              {/* Tarjeta Criterio 2: Hiperandrogenismo */}
              <Card extra="p-6 space-y-4 border-2 border-slate-100 dark:border-navy-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Escala de Rotterdam — Criterio 2
                    </span>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mt-0.5">
                      Hiperandrogenismo Clínico / Bioquímico
                    </h3>
                  </div>

                  {/* Badge de Cumplimiento */}
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                      evaluacionResultado.criterio_2.cumple
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                    }`}
                  >
                    {evaluacionResultado.criterio_2.cumple ? <MdWarning size={16} /> : <MdDone size={16} />}
                    {evaluacionResultado.criterio_2.resultado}
                  </span>
                </div>

                {/* Barra de Probabilidad */}
                <div className="space-y-1.5 bg-slate-50 dark:bg-navy-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-navy-700">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-600 dark:text-slate-300">
                      Probabilidad Clínica Estimada
                    </span>
                    <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {evaluacionResultado.criterio_2.probabilidad.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        evaluacionResultado.criterio_2.cumple
                          ? "bg-gradient-to-r from-rose-500 to-rose-600"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, evaluacionResultado.criterio_2.probabilidad))}%` }}
                    />
                  </div>
                </div>

                {/* Factores Determinantes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Factores Determinantes Detectados:
                  </h4>
                  <ul className="space-y-1.5">
                    {evaluacionResultado.criterio_2.factores_determinantes.map((f, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-navy-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-navy-700"
                      >
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-navy-700 leading-relaxed">
                  {evaluacionResultado.criterio_2.interpretacion_medica}
                </p>
              </Card>
            </div>
          ) : (
            <Card extra="p-12 text-center space-y-3 border-dashed border-2 border-slate-200 dark:border-navy-700">
              <MdAutoGraph className="mx-auto text-slate-300 dark:text-navy-500" size={48} />
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                Aún no se ha ejecutado la evaluación de Criterios 1 y 2
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Presione el botón "Ejecutar / Actualizar Evaluación" para calcular las probabilidades clínicas y los dictámenes según el Consenso de Rotterdam.
              </p>
            </Card>
          )}

          {/* Panel de Verificación de Datos Ingresados para el Especialista */}
          {evaluacionResultado && (
            <Card extra="p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <MdInfoOutline className="text-indigo-500" size={18} />
                Resumen de Datos Ingresados para Verificación Médica
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                El especialista puede verificar los parámetros clínicos registrados para la consulta:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Datos Hormonales Activos */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 border border-slate-200 dark:border-navy-700 space-y-2">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Parámetros de Laboratorio Registrados:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(evaluacionResultado.datos_ingresados.hormonales).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-slate-100 dark:border-navy-700">
                        <span className="text-slate-500 font-semibold capitalize">{k.replace(/_/g, " ")}:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-white">{String(v)}</span>
                      </div>
                    ))}
                    {Object.keys(evaluacionResultado.datos_ingresados.hormonales).length === 0 && (
                      <span className="text-slate-400 italic col-span-2">Sin valores hormonales directos (imputados con medianas de población).</span>
                    )}
                  </div>
                </div>

                {/* Datos Clínicos Activos */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 border border-slate-200 dark:border-navy-700 space-y-2">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Signos Clínicos y Antropometría Registrados:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(evaluacionResultado.datos_ingresados.clinicos).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-slate-100 dark:border-navy-700">
                        <span className="text-slate-500 font-semibold capitalize">{k.replace(/_/g, " ")}:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-white">
                          {typeof v === "boolean" ? (v ? "Sí" : "No") : String(v)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(evaluacionResultado.datos_ingresados.clinicos).length === 0 && (
                      <span className="text-slate-400 italic col-span-2">Sin valores clínicos directos (imputados).</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadatos del Modelo */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-navy-700 text-[11px] text-slate-400">
                <span>Método: Evaluación Multivariada Rotterdam</span>
                <span>Tratamiento de Parámetros: Imputación Clínica de Referencia</span>
                <span>Estado: {evaluacionResultado.modelo_info.status}</span>
                <span>Fecha de Evaluación: {evaluacionResultado.fecha_evaluacion}</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── MODAL EVALUACIÓN FERRIMAN-GALLWEY (9 CUADRANTES + GAGS + LUDWIG) ── */}
      <ModalFerrimanGallwey
        isOpen={mostrarModalFerriman}
        onClose={() => setMostrarModalFerriman(false)}
        pacienteNombre={pacienteSeleccionado ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.primer_apellido}` : "Paciente en evaluación"}
        pacienteCi={pacienteSeleccionado?.ci || ""}
        initialScore={formClinico.score_ferriman_gallwey ? Number(formClinico.score_ferriman_gallwey) : 0}
        initialCuadrantes={{
          labioSuperior: Number(formClinico.fg_labio_superior || 0),
          menton: Number(formClinico.fg_menton || 0),
          pecho: Number(formClinico.fg_pecho || 0),
          abdomenSuperior: Number(formClinico.fg_abdomen_superior || 0),
          abdomenInferior: Number(formClinico.fg_abdomen_inferior || 0),
          brazos: Number(formClinico.fg_brazos || 0),
          muslos: Number(formClinico.fg_muslos || 0),
          espaldaSuperior: Number(formClinico.fg_espalda_superior || 0),
          espaldaLumbar: Number(formClinico.fg_espalda_lumbar || 0),
          acneGags: Number(formClinico.acne_gags_grado || 0),
          alopeciaLudwig: Number(formClinico.alopecia_ludwig_grado || 0),
        }}
        initialAcne={Boolean(formClinico.acne)}
        initialAlopecia={Boolean(formClinico.alopecia_androgenica)}
        onGuardar={handleGuardarFerriman}
      />

      {/* ── MODAL CURVA CTOG E INSULINA DINÁMICA (0, 60, 120 MIN) ── */}
      <ModalCurvaCTOG
        isOpen={mostrarModalCTOG}
        onClose={() => setMostrarModalCTOG(false)}
        pacienteNombre={pacienteSeleccionado ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.primer_apellido}` : "Paciente en evaluación"}
        pacienteCi={pacienteSeleccionado?.ci || ""}
        initialGlucosa0={formHormonal.glucosa_basal}
        initialInsulina0={formHormonal.insulina_basal}
        onGuardar={handleGuardarCTOG}
      />

      {/* ── MODAL MÉTRICAS Y VALIDACIÓN CIENTÍFICA XGBOOST CLÍNICO (ÍTEMS 10 Y 11) ── */}
      <ModalMetricasXGBoostClinico
        isOpen={mostrarModalMetricas}
        onClose={() => setMostrarModalMetricas(false)}
      />

      {/* ── MODAL SOLICITUD DE ÓRDENES MÉDICAS (LABORATORIO & ECOGRAFÍA) ── */}
      <ModalOrdenMedica
        isOpen={mostrarModalOrden}
        onClose={() => setMostrarModalOrden(false)}
        pacienteId={pacienteId}
        pacienteNombre={pacienteSeleccionado ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.primer_apellido}` : "Paciente en evaluación"}
        pacienteCi={pacienteSeleccionado?.ci || ""}
        pacienteEdad={pacienteSeleccionado?.fecha_nacimiento ? calcularEdad(pacienteSeleccionado.fecha_nacimiento) : undefined}
        consultaId={undefined}
        iniciadaVidaSexual={antecedentesPaciente?.iniciada_vida_sexual ?? null}
        onOrdenEmitida={(orden) => {
          showToast(`Orden Médica #${orden.id.slice(0, 8).toUpperCase()} generada con éxito`, "ok");
        }}
      />
    </div>
  );
}
