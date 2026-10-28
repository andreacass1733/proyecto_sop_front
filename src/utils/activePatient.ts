/**
 * Gestor global de persistencia para el paciente activo en la suite clínica SOP.
 * Guarda en localStorage y sincroniza mediante eventos de ventana para evitar
 * que al cambiar de pestaña o pantalla se pierda la paciente seleccionada (ej. Rosa).
 */

const STORAGE_KEY = "sop_active_paciente_id";

export function getActivePatientId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setActivePatientId(id: string): void {
  if (!id) return;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== id) {
      localStorage.setItem(STORAGE_KEY, id);
      // Notificar a todos los componentes y pestañas en tiempo real
      window.dispatchEvent(
        new CustomEvent("sop_patient_changed", { detail: { pacienteId: id } })
      );
    }
  } catch (err) {
    console.warn("No se pudo persistir el paciente activo en localStorage:", err);
  }
}

export function clearActivePatientId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("sop_patient_changed", { detail: { pacienteId: null } })
    );
  } catch (err) {
    console.warn("Error al limpiar paciente activo:", err);
  }
}
