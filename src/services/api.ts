const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE TOKEN JWT Y PETICIONES AUTENTICADAS
// ════════════════════════════════════════════════════════════════════════════

export const getStoredToken = (): string | null => {
  return localStorage.getItem("sop_auth_token");
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem("sop_auth_token", token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem("sop_auth_token");
};

/**
 * Cliente HTTP para peticiones públicas sin token con tolerancia de puertos (8000 / 8080).
 */
export const publicFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const primaryUrl = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    return await fetch(primaryUrl, options);
  } catch (err) {
    if (!endpoint.startsWith("http")) {
      const altBase = BASE_URL.includes("8000")
        ? BASE_URL.replace("8000", "8080")
        : BASE_URL.replace("8080", "8000");
      const altUrl = `${altBase}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
      try {
        return await fetch(altUrl, options);
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

/**
 * Cliente HTTP autenticado con inyección automática del token JWT de Supabase Auth
 * en los encabezados HTTP (Authorization: Bearer <token>) y tolerancia de puertos.
 */
export const authFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const primaryUrl = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(primaryUrl, {
      ...options,
      headers,
    });
  } catch (err) {
    if (!endpoint.startsWith("http")) {
      const altBase = BASE_URL.includes("8000")
        ? BASE_URL.replace("8000", "8080")
        : BASE_URL.replace("8080", "8000");
      const altUrl = `${altBase}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
      try {
        response = await fetch(altUrl, {
          ...options,
          headers,
        });
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
  }

  // Si el token expiró o fue revocado en Supabase Auth
  if (response.status === 401) {
    removeStoredToken();
    localStorage.removeItem("sop_active_doctor");
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/auth/sign-in")
    ) {
      window.location.href = "/auth/sign-in";
    }
  }

  return response;
};


// ════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN (HU-001 & HU-002)
// ════════════════════════════════════════════════════════════════════════════

export interface LoginPayload {
  email: string;
  password: string;
  require_2fa?: boolean;
}

export interface InitialLoginResponse {
  requires_2fa: boolean;
  session_id?: string;
  email_masked?: string;
  telefono_masked?: string;
  codigo_demo?: string;
  mensaje: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string;
  email?: string;
  medico?: MedicoData;
}

export interface Verify2FAPayload {
  session_id: string;
  code: string;
}

export interface MedicoData {
  id: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  especialidad?: string;
  telefono?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  medico: MedicoData;
}

export interface LogoutResponse {
  mensaje: string;
}

/**
 * HU-001 Paso 1: Valida credenciales y emite código de Doble Factor (2FA).
 */
export const iniciarSesion = async (
  credentials: LoginPayload
): Promise<InitialLoginResponse> => {
  const response = await publicFetch(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || "Correo o contraseña incorrectos";
    throw new Error(message);
  }

  return response.json();
};

/**
 * HU-001 Paso 2: Verifica el código de Doble Factor (2FA) y obtiene el token JWT.
 */
export const verificar2FaApi = async (
  payload: Verify2FAPayload
): Promise<LoginResponse> => {
  const response = await publicFetch(`/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || "Código de verificación incorrecto";
    throw new Error(message);
  }

  const data: LoginResponse = await response.json();
  if (data.access_token) {
    setStoredToken(data.access_token);
  }
  return data;
};

/**
 * Reenvía un nuevo código 2FA para la sesión actual.
 */
export const reenviar2FaApi = async (
  session_id: string
): Promise<{ session_id: string; codigo_demo?: string; mensaje: string }> => {
  const response = await publicFetch(`/auth/resend-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al reenviar código");
  }

  return response.json();
};

/**
 * Solicita código de recuperación de contraseña enviado al correo.
 */
export const solicitarRecuperacionApi = async (
  email: string
): Promise<{ session_id: string; email_masked: string; mensaje: string }> => {
  const response = await publicFetch(`/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al solicitar recuperación");
  }

  return response.json();
};

/**
 * Restablece y cambia la contraseña del especialista en Supabase Auth.
 */
export const restablecerContrasenaApi = async (payload: {
  email: string;
  new_password: string;
  code: string;
  session_id?: string;
}): Promise<{ mensaje: string }> => {
  const response = await publicFetch(`/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al restablecer la contraseña");
  }

  return response.json();
};

/**
 * HU-002: Cierre de sesión e invalidación del token JWT en la base de datos.
 */
export const cerrarSesionApi = async (): Promise<void> => {
  try {
    await authFetch(`/auth/logout`, {
      method: "POST",
    });
  } catch (err) {
    console.warn("Aviso al cerrar sesión en el servidor:", err);
  } finally {
    removeStoredToken();
    localStorage.removeItem("sop_active_doctor");
  }
};

/**
 * Obtiene el perfil del usuario autenticado actualmente.
 */
export const obtenerUsuarioActualApi = async (): Promise<any> => {
  const response = await authFetch(`/auth/me`);
  if (!response.ok) {
    throw new Error("Sesión inválida o expirada");
  }
  return response.json();
};


// ════════════════════════════════════════════════════════════════════════════
// CRITERIO 3 — ECOGRAFÍA IA
// ════════════════════════════════════════════════════════════════════════════

export interface PrediccionResponse {
  id: string;
  consulta_id: string;
  imagen_url: string;
  imagen_nombre: string;
  prob_sop: number;
  prob_normal: number;
  prob_sop_porcentaje: number;
  prob_normal_porcentaje: number;
  resultado: string;                   // "Cumple criterio" | "No cumple criterio"
  num_foliculos: number;               // total (antrales + dominante)
  foliculos_antrales_pequenos?: number; // 2-9 mm (definitorios SOP)
  foliculos_dominante?: number;         // 18-24 mm (ausente en SOP)
  patron_folicular?: string;            // "collar_de_perlas" | "fisiologico"
  descripcion_folicular?: string;       // descripción clínica del patrón
  mapa_calor_url: string | null;
  version_modelo: string;
  created_at: string;
  lado_ovario?: string;
}

export interface StatsResponse {
  total_estudios: number;
  total_validados: number;
  total_pendientes: number;
  precision_real: number;            // 0.0 – 1.0
  precision_entrenamiento: number;   // 0.0 – 1.0
  listo_para_reentrenar: boolean;
  umbral_reentrenamiento: number;
}

export interface ValidacionResponse {
  id: string;
  etiqueta_real: string;
  validado: boolean;
}

export const predecirImagen = async (
  file: File,
  paciente_id?: string,
  consulta_id?: string,
  lado_ovario = "izquierdo"
): Promise<PrediccionResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  if (paciente_id) formData.append("paciente_id", paciente_id);
  if (consulta_id) formData.append("consulta_id", consulta_id);
  formData.append("lado_ovario", lado_ovario);

  const response = await authFetch(`/criterio3/predecir`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      try {
        const detail = await response.text();
        if (detail) errorDetail = detail;
      } catch {
        // fallback
      }
    }
    throw new Error(errorDetail);
  }
  return response.json();
};

export const validarImagen = async (
  id: string,
  etiqueta: "SOP" | "Normal",
  datosEvaluacion?: Record<string, any>
): Promise<ValidacionResponse> => {
  const payload = {
    etiqueta_real: etiqueta,
    ...datosEvaluacion,
  };
  const response = await authFetch(`/criterio3/validar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      try {
        const detail = await response.text();
        if (detail) errorDetail = detail;
      } catch {
        // fallback
      }
    }
    throw new Error(errorDetail);
  }
  return response.json();
};

export const obtenerStats = async (): Promise<StatsResponse> => {
  const response = await authFetch(`/criterio3/stats`);
  if (!response.ok) throw new Error("Error al obtener estadísticas");
  return response.json();
};

export interface EstudioEcograficoItem {
  id: string;
  paciente_id?: string;
  consulta_id?: string;
  imagen_url: string;
  imagen_nombre?: string;
  mapa_calor_url?: string;
  prob_sop: number;
  prob_normal: number;
  resultado: string;
  num_foliculos: number;
  lado_ovario?: string;
  etiqueta_real?: string;
  validado: boolean;
  observacion_medico?: string;
  created_at: string;
}

export const listarEstudiosEcograficos = async (
  pacienteId?: string
): Promise<EstudioEcograficoItem[]> => {
  const url = pacienteId
    ? `/criterio3/estudios?paciente_id=${pacienteId}`
    : `/criterio3/estudios`;
  const response = await authFetch(url);
  if (!response.ok) throw new Error("Error al listar estudios ecográficos");
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
  historial?: any[];
  created_at: string;
  updated_at: string;
}

export const listarPacientes = async (
  busqueda?: string,
  activo?: boolean | null,
  pagina = 1,
  porPagina = 10
): Promise<PacienteListItem[]> => {
  const params = new URLSearchParams({
    pagina: String(pagina),
    por_pagina: String(porPagina),
  });
  if (busqueda) params.set("busqueda", busqueda);
  if (activo !== undefined && activo !== null) {
    params.set("activo", String(activo));
  }
  const res = await authFetch(`/pacientes?${params}`);
  if (!res.ok) throw new Error("Error al listar pacientes");
  return res.json();
};

export const obtenerPaciente = async (id: string): Promise<PacienteOut> => {
  const res = await authFetch(`/pacientes/${id}`);
  if (!res.ok) throw new Error("Paciente no encontrado");
  return res.json();
};

export const crearPaciente = async (datos: PacienteCreate): Promise<PacienteOut> => {
  const res = await authFetch(`/pacientes`, {
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

export const actualizarPaciente = async (
  id: string,
  datos: Partial<PacienteCreate> & { activo?: boolean }
): Promise<PacienteOut> => {
  const res = await authFetch(`/pacientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al actualizar paciente");
  return res.json();
};

export const obtenerAntecedentes = async (pacienteId: string): Promise<AntecedentesOut> => {
  const res = await authFetch(`/antecedentes/${pacienteId}`);
  if (res.status === 404) throw new Error("SIN_ANTECEDENTES");
  if (!res.ok) throw new Error("Error al obtener antecedentes");
  return res.json();
};

export const guardarAntecedentes = async (
  pacienteId: string,
  datos: Omit<AntecedentesOut, "id" | "paciente_id" | "created_at" | "updated_at">
): Promise<AntecedentesOut> => {
  const res = await authFetch(`/antecedentes/guardar`, {
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

export const listarCitas = async (pacienteId?: string): Promise<CitaOut[]> => {
  const url = pacienteId ? `/citas?paciente_id=${pacienteId}` : `/citas`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Error al obtener citas");
  return res.json();
};

export const crearCita = async (datos: CitaCreate): Promise<CitaOut> => {
  const res = await authFetch(`/citas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al crear cita");
  return res.json();
};

export const actualizarCita = async (id: string, datos: Partial<CitaCreate>): Promise<CitaOut> => {
  const res = await authFetch(`/citas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al actualizar cita");
  return res.json();
};

export const listarConsultas = async (pacienteId?: string): Promise<ConsultaOut[]> => {
  const url = pacienteId ? `/consultas?paciente_id=${pacienteId}` : `/consultas`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Error al obtener consultas");
  return res.json();
};

export const crearConsulta = async (datos: ConsultaCreate): Promise<ConsultaOut> => {
  const res = await authFetch(`/consultas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al crear consulta");
  return res.json();
};

export const actualizarConsulta = async (id: string, datos: Partial<ConsultaCreate>): Promise<ConsultaOut> => {
  const res = await authFetch(`/consultas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al actualizar consulta");
  return res.json();
};

// ════════════════════════════════════════════════════════════════════════════
// DATOS HORMONALES (HU-009), CLÍNICOS (HU-010) Y EVALUACIÓN XGBOOST (HU-013)
// ════════════════════════════════════════════════════════════════════════════

export interface SemaforoItem {
  valor: number | null;
  estado: "normal" | "alterado" | "no_ingresado";
  rango_referencia: string;
  unidad: string;
  interpretacion: string;
}

export interface DatosHormonalesIn {
  consulta_id?: string;
  paciente_id?: string;
  fsh?: number | "";
  lh?: number | "";
  tsh?: number | "";
  amh?: number | "";
  testosterona_total?: number | "";
  dhea_s?: number | "";
  androstenediona?: number | "";
  hidroxiprogesterona_17?: number | "";
  prolactina?: number | "";
  progesterona?: number | "";
  insulina_basal?: number | "";
  glucosa_basal?: number | "";
  homa_ir?: number | "";
  relacion_lh_fsh?: number | "";
  colesterol_total?: number | "";
  trigliceridos?: number | "";
  ldl?: number | "";
  hdl?: number | "";
  vldl?: number | "";
  hemoglobina?: number | "";
  creatinina?: number | "";
  transaminasas?: number | "";
  dia_ciclo_toma?: number | "";
  glucosa_60?: number | "";
  glucosa_120?: number | "";
  insulina_60?: number | "";
  insulina_120?: number | "";
  indice_quicki?: number | "";
  indice_matsuda?: number | "";
  unidades_referencia?: string;
}

export interface DatosHormonalesOut extends DatosHormonalesIn {
  id?: string;
  created_at?: string;
  updated_at?: string;
  semaforo?: Record<string, SemaforoItem>;
}

export interface DatosClinicosIn {
  consulta_id?: string;
  paciente_id?: string;
  hirsutismo?: boolean;
  score_ferriman_gallwey?: number | "";
  // Desglose anatómico de los 9 cuadrantes de Ferriman-Gallwey (0-4 pts c/u)
  fg_labio_superior?: number | "";
  fg_menton?: number | "";
  fg_pecho?: number | "";
  fg_abdomen_superior?: number | "";
  fg_abdomen_inferior?: number | "";
  fg_brazos?: number | "";
  fg_muslos?: number | "";
  fg_espalda_superior?: number | "";
  fg_espalda_lumbar?: number | "";
  acne_gags_grado?: number | "";
  alopecia_ludwig_grado?: number | "";
  acne?: boolean;
  alopecia_androgenica?: boolean;
  perdida_cabello?: boolean;
  acantosis_nigricans?: boolean;
  oscurecimiento_piel?: boolean;
  ciclos_irregulares?: boolean;
  duracion_ciclo_dias?: number | "";
  amenorrea?: boolean;
  oligomenorrea?: boolean;
  peso_kg?: number | "";
  talla_cm?: number | "";
  imc?: number | "";
  circunferencia_abdominal_cm?: number | "";
  cadera_cm?: number | "";
  relacion_cintura_cadera?: number | "";
  ganancia_peso?: boolean;
  presion_sistolica?: number | "";
  presion_diastolica?: number | "";
  frecuencia_cardiaca?: number | "";
  embarazada?: boolean;
}

export interface DatosClinicosOut extends DatosClinicosIn {
  id?: string;
  created_at?: string;
  updated_at?: string;
  mensaje_confirmacion?: string;
}

export interface DetalleCriterioEvaluacion {
  nombre: string;
  cumple: boolean;
  resultado: string;
  probabilidad: number;
  indicador_color: string;
  factores_determinantes: string[];
  interpretacion_medica: string;
}

export interface EvaluacionXGBoostResponse {
  consulta_id?: string;
  paciente_id?: string;
  fecha_evaluacion: string;
  criterio_1: DetalleCriterioEvaluacion;
  criterio_2: DetalleCriterioEvaluacion;
  datos_ingresados: {
    hormonales: Record<string, any>;
    clinicos: Record<string, any>;
  };
  modelo_info: {
    algoritmo?: string;
    arboles?: number;
    profundidad_maxima?: number;
    regularizacion?: string;
    imputacion?: string;
    estandarizacion?: string;
    status: string;
    detalle?: string;
  };
  error: boolean;
  mensaje?: string;
}

export interface EvaluacionXGBoostRequest {
  consulta_id?: string;
  paciente_id?: string;
  datos_hormonales?: DatosHormonalesIn;
  datos_clinicos?: DatosClinicosIn;
}

// ── Servicios Datos Hormonales (HU-009) ───────────────────────────────────────
const limpiarPayloadClinico = (datos: any): any => {
  if (!datos || typeof datos !== "object") return datos;
  const limpio: Record<string, any> = {};
  for (const [k, v] of Object.entries(datos)) {
    if (v !== "" && v !== null && v !== undefined) {
      if (typeof v === "number" && isNaN(v)) continue;
      limpio[k] = v;
    }
  }
  return limpio;
};

export const guardarDatosHormonales = async (datos: DatosHormonalesIn): Promise<DatosHormonalesOut> => {
  const payloadLimpio = limpiarPayloadClinico(datos);
  const res = await authFetch(`/hormonales/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadLimpio),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al guardar datos hormonales");
  }
  return res.json();
};

export const obtenerDatosHormonales = async (consultaId: string): Promise<DatosHormonalesOut> => {
  const res = await authFetch(`/hormonales/${consultaId}`);
  if (!res.ok) throw new Error("No se encontraron datos hormonales para la consulta");
  return res.json();
};

export const obtenerUltimosDatosHormonalesPaciente = async (
  pacienteId: string
): Promise<DatosHormonalesOut | null> => {
  try {
    const res = await authFetch(`/hormonales/paciente/${pacienteId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const previewSemaforoHormonal = async (datos: DatosHormonalesIn): Promise<{ datos: any; semaforo: Record<string, SemaforoItem> }> => {
  const res = await authFetch(`/hormonales/semaforo-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("Error al calcular semáforos de laboratorio");
  return res.json();
};

// ── Servicios Datos Clínicos (HU-010) ──────────────────────────────────────────
export const guardarDatosClinicos = async (datos: DatosClinicosIn): Promise<DatosClinicosOut> => {
  const payloadLimpio = limpiarPayloadClinico(datos);
  const res = await authFetch(`/clinicos/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadLimpio),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al guardar datos clínicos");
  }
  return res.json();
};

export const obtenerDatosClinicos = async (consultaId: string): Promise<DatosClinicosOut> => {
  const res = await authFetch(`/clinicos/${consultaId}`);
  if (!res.ok) throw new Error("No se encontraron datos clínicos para la consulta");
  return res.json();
};

export const obtenerUltimosDatosClinicosPaciente = async (
  pacienteId: string
): Promise<DatosClinicosOut | null> => {
  try {
    const res = await authFetch(`/clinicos/paciente/${pacienteId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const previewMetricasClinicas = async (datos: DatosClinicosIn): Promise<any> => {
  const res = await authFetch(`/clinicos/metricas-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al calcular métricas antropométricas");
  }
  return res.json();
};

// ── Servicios Evaluación XGBoost (HU-013) ─────────────────────────────────────
export const evaluarXGBoost = async (datos: EvaluacionXGBoostRequest): Promise<EvaluacionXGBoostResponse> => {
  const res = await authFetch(`/evaluacion/xgboost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al evaluar criterios 1 y 2 con XGBoost");
  }
  return res.json();
};

export const evaluarConsultaXGBoost = async (consultaId: string): Promise<EvaluacionXGBoostResponse> => {
  const res = await authFetch(`/evaluacion/consulta/${consultaId}`);
  if (!res.ok) throw new Error("Error al evaluar consulta con XGBoost");
  return res.json();
};

// ════════════════════════════════════════════════════════════════════════════
// TRATAMIENTO Y FARMACOLOGÍA
// ════════════════════════════════════════════════════════════════════════════

export interface MedicacionItem {
  id?: string;
  tratamiento_id?: string;
  nombre_medicamento: string;
  dosis: string;
  frecuencia: string;
  via_administracion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  duracion_meses?: number;
  duracion_semanas?: number;
  activo?: boolean;
  indicaciones_especiales?: string;
  categoria?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanTratamientoOut {
  id?: string;
  paciente_id: string;
  tipo?: string;
  descripcion?: string;
  objetivo?: string;
  duracion_semanas?: number;
  observaciones?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  medicaciones: MedicacionItem[];
}

export interface PlanTratamientoIn {
  paciente_id: string;
  tipo?: string;
  descripcion?: string;
  objetivo?: string;
  duracion_semanas?: number;
  observaciones?: string;
  activo?: boolean;
  medicaciones: MedicacionItem[];
}

export const obtenerTratamientoPaciente = async (
  pacienteId: string
): Promise<PlanTratamientoOut> => {
  const res = await authFetch(`/tratamiento/paciente/${pacienteId}`);
  if (!res.ok) throw new Error("Error al obtener el plan de tratamiento");
  return res.json();
};

export const guardarPlanTratamiento = async (
  payload: PlanTratamientoIn
): Promise<PlanTratamientoOut> => {
  const res = await authFetch(`/tratamiento/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error al guardar el plan de tratamiento");
  return res.json();
};

// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍA MÉDICA, SEGURIDAD Y TRAZABILIDAD DE IA (AUDIT LOGS)
// ════════════════════════════════════════════════════════════════════════════

export interface AuditLogItem {
  id: string;
  timestamp: string;
  usuario: string;
  rol: string;
  ip: string;
  estacion: string;
  modulo: string;
  evento: string;
  paciente_id?: string | null;
  paciente_nombre?: string | null;
  detalle: string;
  hash_sha256: string;
  estado: "AUDIT_OK" | "AI_EXEC" | "LOCKED" | "AUTH_OK" | "ALERT_WARN" | string;
  payload_json: Record<string, any>;
}

export interface AuditoriaMetricas {
  eventos_totales_hoy: number;
  trazabilidad_activa_pct: number;
  inferencias_ia_registradas: number;
  inferencias_subtitulo: string;
  validaciones_medicas: number;
  validaciones_subtitulo: string;
  alertas_seguridad: number;
  alertas_subtitulo: string;
}

export interface AuditoriaListResponse {
  total: number;
  metricas: AuditoriaMetricas;
  logs: AuditLogItem[];
}

export const listarAuditoriaLogs = async (params?: {
  q?: string;
  modulo?: string;
  nivel?: string;
  fecha?: string;
  limite?: number;
}): Promise<AuditoriaListResponse> => {
  const qParams = new URLSearchParams();
  if (params?.q) qParams.append("q", params.q);
  if (params?.modulo) qParams.append("modulo", params.modulo);
  if (params?.nivel) qParams.append("nivel", params.nivel);
  if (params?.fecha) qParams.append("fecha", params.fecha);
  if (params?.limite) qParams.append("limite", params.limite.toString());

  const queryString = qParams.toString() ? `?${qParams.toString()}` : "";
  const res = await authFetch(`/auditoria/logs${queryString}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al obtener logs de auditoría");
  }
  return res.json();
};

export const obtenerMetricasAuditoria = async (): Promise<AuditoriaMetricas> => {
  const res = await authFetch(`/auditoria/metricas`);
  if (!res.ok) throw new Error("Error al consultar métricas de auditoría");
  return res.json();
};

// ── Servicios Órdenes Médicas (Laboratorio y Ecografía Rotterdam) ──────────────
export interface ExamenItem {
  codigo: string;
  nombre: string;
  categoria?: "hormonal" | "metabolico" | "diferencial" | "orina" | string;
  seleccionado?: boolean;
}

export interface OrdenMedicaCreate {
  paciente_id: string;
  consulta_id?: string;
  medico_id?: string;
  tipo_ecografia: "transvaginal" | "pelvica_abdominal" | "doppler" | "ninguna" | string;
  indicacion_ecografia?: string;
  examenes_laboratorio: ExamenItem[];
  indicaciones_preanaliticas?: string;
  diagnostico_presuntivo?: string;
  prioridad?: "normal" | "preferente" | "urgente" | string;
  observaciones?: string;
}

export interface OrdenMedicaOut {
  id: string;
  paciente_id: string;
  paciente_nombre?: string;
  paciente_ci?: string;
  consulta_id?: string;
  medico_id?: string;
  medico_nombre?: string;
  medico_especialidad?: string;
  medico_matricula?: string;
  fecha_emision: string;
  tipo_ecografia: string;
  indicacion_ecografia?: string;
  examenes_laboratorio: ExamenItem[];
  indicaciones_preanaliticas?: string;
  diagnostico_presuntivo?: string;
  estado: string;
  prioridad: string;
  observaciones?: string;
  created_at?: string;
}

export const emitirOrdenMedica = async (orden: OrdenMedicaCreate): Promise<OrdenMedicaOut> => {
  const res = await authFetch("/ordenes-medicas/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orden),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const detail = errorData.detail;
    const msg = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
      ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
      : typeof detail === "object" && detail !== null
      ? JSON.stringify(detail)
      : "Error al emitir orden médica";
    throw new Error(msg);
  }
  return res.json();
};

export const obtenerOrdenesPorPaciente = async (pacienteId: string): Promise<OrdenMedicaOut[]> => {
  const res = await authFetch(`/ordenes-medicas/paciente/${pacienteId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al consultar órdenes de la paciente");
  }
  return res.json();
};

export const cancelarOrdenMedica = async (ordenId: string): Promise<void> => {
  const res = await authFetch(`/ordenes-medicas/${ordenId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al cancelar orden médica");
  }
};

// ── Servicios Rotterdam & Evolución Comparativa (HU-014, HU-015, HU-019) ───────
export interface ClasificacionRotterdamOut {
  tiene_sop: boolean;
  fenotipo: string;
  descripcion: string;
  total_criterios_cumplidos: number;
  desglose_criterios: Record<string, { cumple: boolean; nombre: string; probabilidad?: number; evaluado?: boolean; estado?: string }>;
  recomendacion_terapeutica?: string;
  nivel_confianza?: string;
}

export interface ConfirmarClasificacionIn {
  paciente_id: string;
  consulta_id?: string;
  fenotipo_sugerido: string;
  fenotipo_confirmado: string;
  criterio1_cumple: boolean;
  criterio2_cumple: boolean;
  criterio3_cumple: boolean;
  es_modificado: boolean;
  justificacion_medica?: string;
  conducta_terapeutica?: string;
  medico_nombre?: string;
}

export interface ConfirmacionRotterdamOut {
  exito: boolean;
  mensaje: string;
  fecha: string;
  paciente_id: string;
  fenotipo_final: string;
  es_modificado: boolean;
  auditoria_registrada: boolean;
}

export const obtenerClasificacionPaciente = async (
  pacienteId: string
): Promise<ClasificacionRotterdamOut> => {
  const res = await authFetch(`/clasificacion/paciente/${pacienteId}`);
  if (!res.ok) throw new Error("Error al consultar clasificación Rotterdam del paciente");
  return res.json();
};

export const confirmarClasificacionRotterdam = async (
  payload: ConfirmarClasificacionIn
): Promise<ConfirmacionRotterdamOut> => {
  const res = await authFetch(`/clasificacion/confirmar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error al confirmar diagnóstico de Rotterdam");
  }
  return res.json();
};

export interface DeltaComparativa {
  inicial: number;
  actual: number;
  diferencia: number;
  unidad: string;
  tendencia: "mejoria" | "alerta" | "estable";
  color: string;
  icono: string;
}

export interface ConsultaEvolucionItem {
  consulta_id: string;
  fecha: string;
  motivo: string;
  estado: string;
  observaciones?: string;
  peso_kg?: number;
  talla_cm?: number;
  imc?: number;
  circunferencia_abdominal_cm?: number;
  duracion_ciclo_dias?: number;
  score_ferriman_gallwey?: number;
  acne_gags_grado?: string;
  alopecia_ludwig_grado?: string;
  lh?: number;
  fsh?: number;
  relacion_lh_fsh?: number;
  testosterona_total?: number;
  dhea_s?: number;
  insulina_basal?: number;
  glucosa_basal?: number;
  homa_ir?: number;
  progesterona?: number;
  amh?: number;
  num_foliculos?: number;
  resultado_eco?: string;
  prob_sop?: number;
  imagen_url?: string;
  fenotipo_rotterdam?: string;
  criterios?: {
    criterio1: boolean;
    criterio2: boolean;
    criterio3: boolean;
  };
}

export interface ComparativaEvolucionOut {
  habilitada: boolean;
  total_consultas: number;
  mensaje: string;
  consultas: ConsultaEvolucionItem[];
  deltas: Record<string, DeltaComparativa>;
  resumen_clinico: string;
}

export const obtenerComparativaConsultas = async (
  pacienteId: string
): Promise<ComparativaEvolucionOut> => {
  const res = await authFetch(`/consultas/paciente/${pacienteId}/comparativa`);
  if (!res.ok) throw new Error("Error al consultar comparativa evolutiva de la paciente");
  return res.json();
};

export interface FenotipoItem {
  nombre: string;
  criterios: string;
  descripcion: string;
  total: number;
  porcentaje: number;
  color: string;
}

export interface CriterioCumplimientoItem {
  nombre: string;
  subtitulo: string;
  total: number;
  porcentaje: number;
}

export interface MetricasIAItem {
  ecografias_analizadas: number;
  ecografias_validadas: number;
  concordancia_ia_especialista: number;
  promedio_foliculos_sop: number;
  promedio_foliculos_normal: number;
}

export interface EvaluacionRecienteDashboard {
  consulta_id: string;
  paciente_id: string;
  paciente_nombre: string;
  paciente_ci: string;
  fenotipo: string;
  tiene_sop: boolean;
  total_criterios: number;
  fecha: string;
}

export interface DashboardStatsResponse {
  total_pacientes: number;
  total_consultas: number;
  total_citas: number;
  citas_programadas: number;
  citas_atendidas: number;
  fenotipo_predominante: string;
  fenotipos: {
    fenotipo_a: FenotipoItem;
    fenotipo_b: FenotipoItem;
    fenotipo_c: FenotipoItem;
    fenotipo_d: FenotipoItem;
    sin_sop: FenotipoItem;
  };
  criterios_cumplimiento: {
    criterio1: CriterioCumplimientoItem;
    criterio2: CriterioCumplimientoItem;
    criterio3: CriterioCumplimientoItem;
  };
  metricas_ia: MetricasIAItem;
  ultimas_evaluaciones: EvaluacionRecienteDashboard[];
}

export const obtenerEstadisticasDashboard = async (): Promise<DashboardStatsResponse> => {
  const res = await authFetch("/clasificacion/estadisticas-dashboard");
  if (!res.ok) throw new Error("Error al obtener estadísticas del dashboard clínico");
  return res.json();
};


