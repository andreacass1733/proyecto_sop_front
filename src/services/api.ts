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
  consulta_id: string
): Promise<PrediccionResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("consulta_id", consulta_id);

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