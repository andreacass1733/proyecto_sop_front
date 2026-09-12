import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdPersonAdd, MdSearch, MdPerson, MdPhone, MdBadge,
  MdCalendarMonth, MdEdit, MdPersonOff, MdRefresh,
  MdClose, MdSave, MdWarning, MdCheckCircle, MdPeople,
  MdEmail, MdNavigateBefore, MdNavigateNext, MdUndo,
  MdMedicalServices
} from "react-icons/md";
import {
  listarPacientes, crearPaciente, actualizarPaciente,
  obtenerAntecedentes, guardarAntecedentes,
  PacienteListItem, PacienteCreate
} from "services/api";

// ── Calcular edad a partir de fecha ──────────────────────────────────────────
function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

// ── Modal Personalizado de Confirmación Desactivar/Reactivar ───────────
const ModalConfirmacion = ({
  paciente,
  onClose,
  onConfirm,
}: {
  paciente: PacienteListItem;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paciente.activo ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
            {paciente.activo ? <MdPersonOff size={24} /> : <MdUndo size={24} />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              {paciente.activo ? "Desactivar Paciente" : "Reactivar Paciente"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {paciente.nombre} {paciente.primer_apellido} {paciente.segundo_apellido || ""}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-medium">
          {paciente.activo
            ? "El paciente se conservará en el sistema como 'Inactivo' para preservar su historial clínico. Podrá consultar o reactivar su perfil en cualquier momento desde el filtro 'Inactivos'."
            : "El paciente volverá a estar activo para la toma de ecografías, consultas y registro de antecedentes."}
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
              paciente.activo
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
            }`}
          >
            {paciente.activo ? "Desactivar Paciente" : "Reactivar Paciente"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal de Antecedentes Médicos Directo ─────────────────────────────────────
const AntecedentesModal = ({
  paciente,
  onClose,
  onSaved,
}: {
  paciente: PacienteListItem;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    iniciada_vida_sexual: false,
    edad_menarquia: "" as number | "",
    tipo_ciclo: "regular",
    duracion_ciclo_habitual: 28 as number | "",
    gestas: 0,
    partos: 0,
    cesareas: 0,
    abortos: 0,
    hijos_vivos: 0,
    usa_anticonceptivos: false,
    tipo_anticonceptivo: "",
    familiar_con_sop: false,
    familiar_con_diabetes: false,
    diabetes: false,
    hipotiroidismo: false,
    hiperprolactinemia: false,
    resistencia_insulina: false,
    observaciones: "",
  });

  useEffect(() => {
    async function Cargar() {
      setLoading(true);
      try {
        const datos = await obtenerAntecedentes(paciente.id);
        setForm({
          iniciada_vida_sexual: (datos as any).iniciada_vida_sexual ?? (datos.gestas > 0 || datos.usa_anticonceptivos),
          edad_menarquia: datos.edad_menarquia ?? "",
          tipo_ciclo: datos.tipo_ciclo ?? "regular",
          duracion_ciclo_habitual: datos.duracion_ciclo_habitual ?? 28,
          gestas: datos.gestas ?? 0,
          partos: datos.partos ?? 0,
          cesareas: datos.cesareas ?? 0,
          abortos: datos.abortos ?? 0,
          hijos_vivos: datos.hijos_vivos ?? 0,
          usa_anticonceptivos: datos.usa_anticonceptivos ?? false,
          tipo_anticonceptivo: datos.tipo_anticonceptivo ?? "",
          familiar_con_sop: datos.familiar_con_sop ?? false,
          familiar_con_diabetes: datos.familiar_con_diabetes ?? false,
          diabetes: datos.diabetes ?? false,
          hipotiroidismo: datos.hipotiroidismo ?? false,
          hiperprolactinemia: (datos as any).hiperprolactinemia ?? false,
          resistencia_insulina: datos.resistencia_insulina ?? false,
          observaciones: datos.observaciones ?? "",
        });
      } catch (err: any) {
        if (err.message !== "SIN_ANTECEDENTES") {
          console.warn("No antecedents found", err);
        }
      } finally {
        setLoading(false);
      }
    }
    Cargar();
  }, [paciente.id]);

  const handleSexarca = (activa: boolean) => {
    setForm(prev => ({
      ...prev,
      iniciada_vida_sexual: activa,
      ...(activa ? {} : {
        gestas: 0, partos: 0, cesareas: 0, abortos: 0, hijos_vivos: 0,
        usa_anticonceptivos: false, tipo_anticonceptivo: ""
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        iniciada_vida_sexual: form.iniciada_vida_sexual,
        edad_menarquia: form.edad_menarquia === "" ? null : Number(form.edad_menarquia),
        tipo_ciclo: form.tipo_ciclo,
        duracion_ciclo_habitual: form.duracion_ciclo_habitual === "" ? null : Number(form.duracion_ciclo_habitual),
        gestas: form.iniciada_vida_sexual ? Number(form.gestas) : 0,
        partos: form.iniciada_vida_sexual ? Number(form.partos) : 0,
        cesareas: form.iniciada_vida_sexual ? Number(form.cesareas) : 0,
        abortos: form.iniciada_vida_sexual ? Number(form.abortos) : 0,
        hijos_vivos: form.iniciada_vida_sexual ? Number(form.hijos_vivos) : 0,
        usa_anticonceptivos: form.iniciada_vida_sexual ? form.usa_anticonceptivos : false,
        tipo_anticonceptivo: form.iniciada_vida_sexual && form.usa_anticonceptivos ? form.tipo_anticonceptivo : null,
        familiar_con_sop: form.familiar_con_sop,
        familiar_con_diabetes: form.familiar_con_diabetes,
        diabetes: form.diabetes,
        hipotiroidismo: form.hipotiroidismo,
        hiperprolactinemia: form.hiperprolactinemia,
        resistencia_insulina: form.resistencia_insulina,
        observaciones: form.observaciones || null,
      };

      await guardarAntecedentes(paciente.id, payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar antecedentes médicos");
    } finally {
      setSaving(false);
    }
  };

  const nombrePaciente = [paciente.nombre, paciente.primer_apellido, paciente.segundo_apellido].filter(Boolean).join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center text-white font-bold">
              <MdMedicalServices size={22} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800 text-base leading-none">Antecedentes Médicos</h2>
              <p className="text-xs text-rose-600 font-bold mt-1">{nombrePaciente} • CI: {paciente.ci || "Sin CI"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200">
            <MdClose size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-500">Cargando expediente...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
            
            {/* Sexarca */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-slate-800">¿Ha iniciado vida sexual? (Sexarca Activa) *</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleSexarca(true)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${form.iniciada_vida_sexual ? "bg-rose-600 text-white shadow" : "bg-slate-200 text-slate-800 border border-slate-300"}`}>
                    Sí (Sexarca Activa)
                  </button>
                  <button type="button" onClick={() => handleSexarca(false)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${!form.iniciada_vida_sexual ? "bg-slate-900 text-white shadow" : "bg-slate-200 text-slate-800 border border-slate-300"}`}>
                    No (Sin Sexarca)
                  </button>
                </div>
              </div>
              {!form.iniciada_vida_sexual && (
                <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  • Sin sexarca activa: Los datos obstétricos (gestas, partos, abortos) y métodos anticonceptivos se ocultan de la ficha clínica.
                </p>
              )}
            </div>

            {/* Ginecológico */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-purple-600 uppercase tracking-widest">Historial Ginecológico</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Edad Menarquia</label>
                  <input type="number" min={8} max={20} value={form.edad_menarquia}
                    onChange={e => setForm(p => ({ ...p, edad_menarquia: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 12" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patrón del Ciclo</label>
                  <select value={form.tipo_ciclo} onChange={e => setForm(p => ({ ...p, tipo_ciclo: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 bg-white">
                    <option value="regular">Regular (21-35 días)</option>
                    <option value="irregular">Irregular</option>
                    <option value="oligomenorrea">Oligomenorrea (&gt;35 días)</option>
                    <option value="amenorrea">Amenorrea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duración Días</label>
                  <input type="number" min={1} max={90} value={form.duracion_ciclo_habitual}
                    onChange={e => setForm(p => ({ ...p, duracion_ciclo_habitual: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 5 o 28" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 bg-white" />
                </div>
              </div>
            </div>

            {/* Obstétrico (OCULTO SI NO TIENE SEXARCA) */}
            {form.iniciada_vida_sexual && (
              <div className="space-y-3 animate-fade-in-up">
                <p className="text-xs font-extrabold text-rose-600 uppercase tracking-widest">Obstétrico y Anticoncepción (Solo Sexarca Activa)</p>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Gestas</label>
                    <input type="number" min={0} value={form.gestas} onChange={e => setForm(p => ({ ...p, gestas: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Partos</label>
                    <input type="number" min={0} value={form.partos} onChange={e => setForm(p => ({ ...p, partos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Cesáreas</label>
                    <input type="number" min={0} value={form.cesareas} onChange={e => setForm(p => ({ ...p, cesareas: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Abortos</label>
                    <input type="number" min={0} value={form.abortos} onChange={e => setForm(p => ({ ...p, abortos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Hijos Vivos</label>
                    <input type="number" min={0} value={form.hijos_vivos} onChange={e => setForm(p => ({ ...p, hijos_vivos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Factores de riesgo */}
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Factores de Riesgo / Patologías</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800">
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>Familiar con SOP</span>
                  <input type="checkbox" checked={form.familiar_con_sop} onChange={e => setForm(p => ({ ...p, familiar_con_sop: e.target.checked }))} className="w-4 h-4 text-rose-600" />
                </label>
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>Familiar con Diabetes</span>
                  <input type="checkbox" checked={form.familiar_con_diabetes} onChange={e => setForm(p => ({ ...p, familiar_con_diabetes: e.target.checked }))} className="w-4 h-4 text-rose-600" />
                </label>
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>Diabetes Personal</span>
                  <input type="checkbox" checked={form.diabetes} onChange={e => setForm(p => ({ ...p, diabetes: e.target.checked }))} className="w-4 h-4 text-rose-600" />
                </label>
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>Hipotiroidismo</span>
                  <input type="checkbox" checked={form.hipotiroidismo} onChange={e => setForm(p => ({ ...p, hipotiroidismo: e.target.checked }))} className="w-4 h-4 text-rose-600" />
                </label>
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>Hiperprolactinemia</span>
                  <input type="checkbox" checked={form.hiperprolactinemia} onChange={e => setForm(p => ({ ...p, hiperprolactinemia: e.target.checked }))} className="w-4 h-4 text-rose-600" />
                </label>
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>Resistencia a Insulina</span>
                  <input type="checkbox" checked={form.resistencia_insulina} onChange={e => setForm(p => ({ ...p, resistencia_insulina: e.target.checked }))} className="w-4 h-4 text-rose-600" />
                </label>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones Clínicas</label>
              <textarea rows={2} value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Anotaciones médicas..." className="w-full border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-900 bg-white" />
            </div>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">{error}</div>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-500 to-purple-600 shadow-md">
                {saving ? "Guardando..." : "Guardar Antecedentes"}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

// ── Modal Nuevo / Editar Paciente ────────────────────────────────────────────
const PacienteModal = ({
  onClose, onSaved, editando,
}: {
  onClose: () => void;
  onSaved: () => void;
  editando?: PacienteListItem | null;
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<PacienteCreate>({
    nombre:           editando?.nombre           ?? "",
    primer_apellido:  editando?.primer_apellido  ?? "",
    segundo_apellido: editando?.segundo_apellido ?? "",
    ci:               editando?.ci               ?? "",
    telefono:         editando?.telefono         ?? "",
    fecha_nacimiento: editando?.fecha_nacimiento ?? "",
    email:            editando?.email            ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: any = {};
    Object.entries(form).forEach(([k, v]) => { if (v !== "") payload[k] = v; });
    try {
      if (editando) {
        await actualizarPaciente(String(editando.id), payload);
        onSaved();
        onClose();
      } else {
        const nuevoP = await crearPaciente(payload);
        onClose();
        // Redireccionar directamente a la página dedicada de Antecedentes Médicos
        navigate(`/admin/antecedentes?pacienteId=${nuevoP.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-xl rounded-3xl shadow-2xl animate-fade-in-up overflow-hidden border border-slate-100"
        style={{ background: "#fff", maxHeight: "92vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)" }}>
              <MdPersonAdd size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800 text-base leading-none">
                {editando ? "Editar perfil del paciente" : "Registrar nuevo paciente"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Complete los datos de identificación y contacto</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-xl hover:bg-slate-200">
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div>
            <p className="text-xs font-extrabold text-rose-600 uppercase tracking-widest mb-3">
              Datos de identificación
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                <input name="nombre" type="text" value={form.nombre} onChange={set} required
                  placeholder="Ej: María"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primer apellido *</label>
                <input name="primer_apellido" type="text" value={form.primer_apellido} onChange={set} required
                  placeholder="Ej: García"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Segundo apellido <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input name="segundo_apellido" type="text" value={form.segundo_apellido ?? ""} onChange={set}
                  placeholder="Ej: López"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold text-purple-600 uppercase tracking-widest mb-3">
              Datos personales
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cédula / DNI</label>
                <input name="ci" type="text" value={form.ci ?? ""} onChange={set}
                  placeholder="Ej: 12345678"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de nacimiento</label>
                <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento ?? ""} onChange={set}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                <input name="telefono" type="tel" value={form.telefono ?? ""} onChange={set}
                  placeholder="+591 70000000"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico</label>
                <input name="email" type="email" value={form.email ?? ""} onChange={set}
                  placeholder="paciente@email.com"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-sm">
              <MdWarning className="text-rose-500 flex-shrink-0" size={18} />
              <span className="text-rose-700 font-medium">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)", boxShadow: "0 4px 16px rgba(244,63,94,0.35)" }}>
              {saving ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : <MdSave size={18} />}
              {saving ? "Guardando..." : editando ? "Actualizar datos" : "Registrar paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Vista Principal Pacientes ────────────────────────────────────────────────
const Pacientes = () => {
  const navigate = useNavigate();
  const [pacientes, setPacientes]       = useState<PacienteListItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [busqueda, setBusqueda]         = useState("");
  const [tabEstado, setTabEstado]       = useState<"activos" | "inactivos" | "todos">("activos");
  
  // Paginación
  const [pagina, setPagina]             = useState(1);
  const [porPagina, setPorPagina]       = useState(10);
  
  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando]         = useState<PacienteListItem | null>(null);
  const [confirmarPaciente, setConfirmarPaciente] = useState<PacienteListItem | null>(null);
  const [antecedentesPaciente, setAntecedentesPaciente] = useState<PacienteListItem | null>(null);
  
  const [errorApi, setErrorApi]         = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorApi(null);
    try {
      const activoFiltro = tabEstado === "activos" ? true : tabEstado === "inactivos" ? false : null;
      const datos = await listarPacientes(busqueda || undefined, activoFiltro, pagina, porPagina);
      setPacientes(datos);
    } catch {
      setErrorApi("No se pudo conectar con el servidor. Verifique que el backend esté activo.");
    } finally {
      setLoading(false);
    }
  }, [busqueda, tabEstado, pagina, porPagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleEstadoConfirmado = async () => {
    if (!confirmarPaciente) return;
    const nuevoEstado = !confirmarPaciente.activo;
    try {
      await actualizarPaciente(String(confirmarPaciente.id), { activo: nuevoEstado } as any);
      showToast(nuevoEstado ? "Paciente reactivado correctamente" : "Paciente desactivado correctamente");
      setConfirmarPaciente(null);
      cargar();
    } catch {
      showToast("Error al cambiar el estado del paciente", "error");
    }
  };

  const iniciales = (p: PacienteListItem) =>
    `${p.nombre.charAt(0)}${p.primer_apellido.charAt(0)}`.toUpperCase();

  const nombreCompleto = (p: PacienteListItem) =>
    [p.nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(" ");

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-5">

      {/* Toast Notificación */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
          toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {toast.tipo === "ok" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
          {toast.msg}
        </div>
      )}

      {/* ── ENCABEZADO Y ACCIÓN ── */}
      <div className="rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ background: "linear-gradient(135deg, #fce7f3, #ede9fe)" }}>
            <MdPeople size={28} style={{ color: "#7c3aed" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Gestión de Pacientes</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-700">
                {loading ? "Cargando..." : `${pacientes.length} mostrados`}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Dr. Rodrigo Espinoza — Sistema SOP Rotterdam</p>
          </div>
        </div>

        <button
          onClick={() => { setEditando(null); setModalAbierto(true); }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-sm text-white self-start sm:self-auto transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)" }}
        >
          <MdPersonAdd size={20} />
          Nuevo Paciente
        </button>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS TABS ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, CI o correo..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            className="w-full border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
          />
        </div>

        <div className="flex items-center bg-slate-200/60 p-1 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button onClick={() => { setTabEstado("activos"); setPagina(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${tabEstado === "activos" ? "bg-white text-rose-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            Activos
          </button>
          <button onClick={() => { setTabEstado("inactivos"); setPagina(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${tabEstado === "inactivos" ? "bg-white text-rose-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            Inactivos
          </button>
          <button onClick={() => { setTabEstado("todos"); setPagina(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${tabEstado === "todos" ? "bg-white text-rose-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            Todos
          </button>
        </div>

        <button onClick={cargar} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm">
          <MdRefresh size={18} className={loading ? "animate-spin text-rose-500" : "text-slate-400"} />
          Actualizar
        </button>
      </div>

      {errorApi && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-sm bg-amber-50 border border-amber-200">
          <MdWarning className="text-amber-600 flex-shrink-0" size={20} />
          <span className="text-amber-900 font-medium">{errorApi}</span>
        </div>
      )}

      {/* ── TABLA DE PACIENTES ── */}
      <div className="rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-12 gap-3 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
          <span className="col-span-4">Paciente</span>
          <span className="col-span-2 hidden sm:block">Cédula</span>
          <span className="col-span-2 hidden md:block">Contacto</span>
          <span className="col-span-1 hidden lg:block">Edad</span>
          <span className="col-span-1">Estado</span>
          <span className="col-span-2 text-right">Acciones</span>
        </div>

        {loading && (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse w-full" />
            ))}
          </div>
        )}

        {!loading && pacientes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 bg-slate-100 border border-slate-200">
              <MdPerson size={32} className="text-slate-400" />
            </div>
            <p className="font-extrabold text-slate-700 text-base">No se encontraron pacientes</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {busqueda ? `No hay resultados para "${busqueda}"` : "No hay pacientes registrados en este filtro."}
            </p>
          </div>
        )}

        {!loading && pacientes.map((p, i) => (
          <div
            key={String(p.id)}
            onClick={() => navigate(`/admin/pacientes/${p.id}`)}
            className="grid grid-cols-12 gap-3 px-6 py-4 items-center cursor-pointer transition-colors hover:bg-purple-50/40 border-b border-slate-100 last:border-0"
          >
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm select-none shadow-sm"
                style={{
                  background: i % 2 === 0
                    ? "linear-gradient(135deg, #fce7f3, #fda4af)"
                    : "linear-gradient(135deg, #ede9fe, #c4b5fd)",
                  color: i % 2 === 0 ? "#be185d" : "#6d28d9",
                }}>
                {iniciales(p)}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-sm leading-tight truncate">{nombreCompleto(p)}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1 font-medium">
                  <MdEmail size={13} className="text-slate-400 flex-shrink-0" />
                  <span>{p.email || "Sin correo registrado"}</span>
                </p>
              </div>
            </div>

            <div className="col-span-2 hidden sm:flex items-center gap-1.5 text-slate-700 font-mono text-xs font-semibold">
              <MdBadge size={16} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{p.ci ?? "—"}</span>
            </div>

            <div className="col-span-2 hidden md:flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
              <MdPhone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{p.telefono ?? "—"}</span>
            </div>

            <div className="col-span-1 hidden lg:flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
              <MdCalendarMonth size={16} className="text-slate-400 flex-shrink-0" />
              <span>{calcularEdad(p.fecha_nacimiento)}</span>
            </div>

            <div className="col-span-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                p.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? "bg-emerald-500" : "bg-amber-500"}`} />
                {p.activo ? "Activo" : "Inactivo"}
              </span>
            </div>

            {/* Acciones */}
            <div className="col-span-2 flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
              <button title="Editar paciente"
                onClick={e => { e.stopPropagation(); setEditando(p); setModalAbierto(true); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-100/60 transition-all">
                <MdEdit size={16} />
              </button>

              <button title={p.activo ? "Desactivar paciente" : "Reactivar paciente"}
                onClick={e => { e.stopPropagation(); setConfirmarPaciente(p); }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${p.activo ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" : "text-amber-600 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                {p.activo ? <MdPersonOff size={16} /> : <MdUndo size={16} />}
              </button>
            </div>
          </div>
        ))}

        {/* Paginación */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Mostrar</span>
            <select value={porPagina} onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
              className="border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 bg-white">
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
            <span>pacientes</span>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={pagina === 1 || loading} onClick={() => setPagina(p => Math.max(p - 1, 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 shadow-sm">
              <MdNavigateBefore size={18} /> Anterior
            </button>
            <span className="px-3 py-1 text-xs font-extrabold text-slate-800 bg-slate-200/70 rounded-xl">Página {pagina}</span>
            <button disabled={pacientes.length < porPagina || loading} onClick={() => setPagina(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 shadow-sm">
              Siguiente <MdNavigateNext size={18} />
            </button>
          </div>
        </div>

      </div>

      {/* Modal Paciente Editar/Crear */}
      {modalAbierto && (
        <PacienteModal
          onClose={() => { setModalAbierto(false); setEditando(null); }}
          onSaved={() => { cargar(); showToast(editando ? "Datos actualizados" : "Paciente registrado"); }}
          editando={editando}
        />
      )}

      {/* Modal Antecedentes Médicos Directo */}
      {antecedentesPaciente && (
        <AntecedentesModal
          paciente={antecedentesPaciente}
          onClose={() => setAntecedentesPaciente(null)}
          onSaved={() => showToast("Antecedentes médicos guardados correctamente")}
        />
      )}

      {/* Modal Confirmación Desactivar/Reactivar */}
      {confirmarPaciente && (
        <ModalConfirmacion
          paciente={confirmarPaciente}
          onClose={() => setConfirmarPaciente(null)}
          onConfirm={handleToggleEstadoConfirmado}
        />
      )}
    </div>
  );
};

export default Pacientes;
