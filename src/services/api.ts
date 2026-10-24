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
    const detail = await response.text();
    throw new Error(`Error ${response.status}: ${detail}`);
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
    const detail = await response.text();
    throw new Error(`Error al registrar la evaluación: ${detail}`);
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