const BASE_URL = "http://localhost:8000";

// ── Respuesta del endpoint POST /criterio3/predecir ───────────────────────
export interface PrediccionResponse {
  id: string;                      // UUID
  consulta_id: string;             // UUID
  imagen_url: string;
  imagen_nombre: string;
  prob_sop: number;                // 0.0 – 1.0  (fracción)
  prob_normal: number;             // 0.0 – 1.0  (fracción)
  prob_sop_porcentaje: number;     // 0.0 – 100.0 ← usar en barras
  prob_normal_porcentaje: number;  // 0.0 – 100.0 ← usar en barras
  resultado: string;               // "Cumple criterio" | "No cumple criterio"
  num_foliculos: number;
  mapa_calor_url: string | null;
  version_modelo: string;
  created_at: string;
}

// ── Respuesta del endpoint GET /criterio3/stats ───────────────────────────
export interface StatsResponse {
  total_estudios: number;
  total_validados: number;
  total_pendientes: number;
  precision_real: number;            // 0.0 – 1.0
  precision_entrenamiento: number;   // 0.0 – 1.0
  listo_para_reentrenar: boolean;
  umbral_reentrenamiento: number;
}

// ── Respuesta del endpoint PUT /criterio3/validar/{id} ────────────────────
export interface ValidacionResponse {
  id: string;
  etiqueta_real: string;
  validado: boolean;
}

// ── Predecir: envía file + consulta_id como FormData ─────────────────────
export const predecirImagen = async (
  file: File,
  consulta_id: string,
  lado_ovario = "izquierdo"
): Promise<PrediccionResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("consulta_id", consulta_id);
  formData.append("lado_ovario", lado_ovario);

  const response = await fetch(`${BASE_URL}/criterio3/predecir`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Error ${response.status}: ${detail}`);
  }
  return response.json();
};

// ── Validar: el médico confirma o corrige el diagnóstico ─────────────────
export const validarImagen = async (
  id: string,
  etiqueta: "SOP" | "Normal"
): Promise<ValidacionResponse> => {
  const response = await fetch(`${BASE_URL}/criterio3/validar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ etiqueta_real: etiqueta }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Error al validar: ${detail}`);
  }
  return response.json();
};

// ── Estadísticas del dashboard ────────────────────────────────────────────
export const obtenerStats = async (): Promise<StatsResponse> => {
  const response = await fetch(`${BASE_URL}/criterio3/stats`);
  if (!response.ok) throw new Error("Error al obtener estadísticas");
  return response.json();
};


// ════════════════════════════════════════════════════════════════════════════
// PACIENTES
// ════════════════════════════════════════════════════════════════════════════

export interface PacienteListItem {
  id: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  ci: string | null;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  activo: boolean;
  medico_id: string | null;
  created_at: string;
}

export interface PacienteOut extends PacienteListItem {
  updated_at: string;
}

export interface PacienteCreate {
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  ci?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  email?: string;
  medico_id?: string;
}

export interface AntecedentesOut {
  id: string;
  paciente_id: string;
  iniciada_vida_sexual: boolean;
  edad_menarquia: number | null;
  tipo_ciclo: string | null;
  duracion_ciclo_habitual: number | null;
  gestas: number;
  partos: number;
  cesareas: number;
  abortos: number;
  hijos_vivos: number;
  usa_anticonceptivos: boolean;
  tipo_anticonceptivo: string | null;
  familiar_con_sop: boolean;
  familiar_con_diabetes: boolean;
  diabetes: boolean;
  hipotiroidismo: boolean;
  hiperprolactinemia: boolean;
  resistencia_insulina: boolean;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

// ── Listar pacientes (con búsqueda, filtro de estado y paginación) ────────
export const listarPacientes = async (
  busqueda?: string,
  activo?: boolean | null,
  pagina = 1,
  porPagina = 10,
): Promise<PacienteListItem[]> => {
  const params = new URLSearchParams({
    pagina: String(pagina),
    por_pagina: String(porPagina),
  });
  if (busqueda) params.set("busqueda", busqueda);
  if (activo !== undefined && activo !== null) {
    params.set("activo", String(activo));
  }
  const res = await fetch(`${BASE_URL}/pacientes?${params}`);
  if (!res.ok) throw new Error("Error al listar pacientes");
  return res.json();
};

// ── Obtener detalle de un paciente ────────────────────────────────────────
export const obtenerPaciente = async (id: string): Promise<PacienteOut> => {
  const res = await fetch(`${BASE_URL}/pacientes/${id}`);
  if (!res.ok) throw new Error("Paciente no encontrado");
  return res.json();
};

// ── Crear paciente ────────────────────────────────────────────────────────
export const crearPaciente = async (datos: PacienteCreate): Promise<PacienteOut> => {
  const res = await fetch(`${BASE_URL}/pacientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Error al crear paciente");
  }
  return res.json();
};

// ── Actualizar paciente ───────────────────────────────────────────────────
export const actualizarPaciente = async (
  id: string,
  datos: Partial<PacienteCreate> & { activo?: boolean }
): Promise<PacienteOut> => {
  const res = await fetch(`${BASE_URL}/pacientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al actualizar paciente");
  return res.json();
};

// ── Obtener antecedentes de un paciente ───────────────────────────────────
export const obtenerAntecedentes = async (pacienteId: string): Promise<AntecedentesOut> => {
  const res = await fetch(`${BASE_URL}/antecedentes/${pacienteId}`);
  if (res.status === 404) throw new Error("SIN_ANTECEDENTES");
  if (!res.ok) throw new Error("Error al obtener antecedentes");
  return res.json();
};

// ── Guardar antecedentes (crea o actualiza) ───────────────────────────────
export const guardarAntecedentes = async (
  pacienteId: string,
  datos: Omit<AntecedentesOut, "id" | "paciente_id" | "created_at" | "updated_at">
): Promise<AntecedentesOut> => {
  const res = await fetch(`${BASE_URL}/antecedentes/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...datos, paciente_id: pacienteId }),
  });
  if (!res.ok) throw new Error("Error al guardar antecedentes");
  return res.json();
};


// ════════════════════════════════════════════════════════════════════════════
// CITAS Y CONSULTAS
// ════════════════════════════════════════════════════════════════════════════

export interface CitaOut {
  id: string;
  paciente_id: string | null;
  medico_id: string | null;
  fecha_atencion: string | null;
  fecha_proxima_cita: string | null;
  motivo: string | null;
  observaciones: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface CitaCreate {
  paciente_id?: string;
  medico_id?: string;
  fecha_atencion?: string;
  fecha_proxima_cita?: string;
  motivo?: string;
  observaciones?: string;
  estado?: string;
}

export interface ConsultaOut {
  id: string;
  cita_id: string | null;
  paciente_id: string | null;
  medico_id: string | null;
  motivo: string | null;
  observaciones: string | null;
  estado: string;
  reentrenamiento_id: string | null;
  fecha_proxima_cita?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultaCreate {
  cita_id?: string;
  paciente_id?: string;
  medico_id?: string;
  motivo?: string;
  observaciones?: string;
  estado?: string;
  reentrenamiento_id?: string;
  fecha_proxima_cita?: string;
}

// ── CITAS ──
export const listarCitas = async (pacienteId?: string): Promise<CitaOut[]> => {
  const url = pacienteId ? `${BASE_URL}/citas?paciente_id=${pacienteId}` : `${BASE_URL}/citas`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al obtener citas");
  return res.json();
};

export const crearCita = async (datos: CitaCreate): Promise<CitaOut> => {
  const res = await fetch(`${BASE_URL}/citas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al crear cita");
  return res.json();
};

export const actualizarCita = async (id: string, datos: Partial<CitaCreate>): Promise<CitaOut> => {
  const res = await fetch(`${BASE_URL}/citas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al actualizar cita");
  return res.json();
};

// ── CONSULTAS ──
export const listarConsultas = async (pacienteId?: string): Promise<ConsultaOut[]> => {
  const url = pacienteId ? `${BASE_URL}/consultas?paciente_id=${pacienteId}` : `${BASE_URL}/consultas`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al obtener consultas");
  return res.json();
};

export const crearConsulta = async (datos: ConsultaCreate): Promise<ConsultaOut> => {
  const res = await fetch(`${BASE_URL}/consultas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al crear consulta");
  return res.json();
};

export const actualizarConsulta = async (id: string, datos: Partial<ConsultaCreate>): Promise<ConsultaOut> => {
  const res = await fetch(`${BASE_URL}/consultas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al actualizar consulta");
  return res.json();
};