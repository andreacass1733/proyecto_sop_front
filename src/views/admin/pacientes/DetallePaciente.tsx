import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArrowBack, MdBadge, MdPhone, MdEmail,
  MdCalendarMonth, MdMedicalServices, MdSave, MdCheckCircle,
  MdWarning, MdInfo, MdFemale, MdOutlineBiotech, MdFamilyRestroom,
  MdShield, MdOutlineAssignment, MdCheck, MdClose,
  MdLock, MdLockOpen, MdMedication, MdImageSearch
} from "react-icons/md";
import {
  obtenerPaciente, obtenerAntecedentes, guardarAntecedentes,
  PacienteOut
} from "services/api";

export const OPCIONES_ANTICONCEPTIVOS = [
  "Anticonceptivos Orales Combinados (ACO)",
  "Progestágenos solos (Minipíldora)",
  "DIU Hormonal (Levonorgestrel - Mirena / Kyleena)",
  "DIU de Cobre",
  "Implante Subdérmico (Jadelle / Implanon)",
  "Inyectable Mensual / Trimestral",
  "Anillo Vaginal",
  "Parche Transdérmico",
  "Preservativo / Método de Barrera",
  "Otro (Especificar)"
];

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function DetallePaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paciente, setPaciente]         = useState<PacienteOut | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [errorApi, setErrorApi]         = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  // Estados de protección de datos biológicos (Sexarca irreversible y Menarquía fija)
  const [sexarcaPrevia, setSexarcaPrevia] = useState(false);
  const [menarquiaPrevia, setMenarquiaPrevia] = useState<number | null>(null);
  const [menarquiaDesbloqueada, setMenarquiaDesbloqueada] = useState(false);
  const [modalSexarcaAbierto, setModalSexarcaAbierto] = useState(false);
  const [modalMenarquiaAbierto, setModalMenarquiaAbierto] = useState(false);

  // Formulario de Antecedentes Médicos
  const [form, setForm] = useState<{
    iniciada_vida_sexual: boolean;
    edad_menarquia: number | "";
    tipo_ciclo: string;
    duracion_ciclo_habitual: number | "";
    gestas: number;
    partos: number;
    cesareas: number;
    abortos: number;
    hijos_vivos: number;
    usa_anticonceptivos: boolean;
    tipo_anticonceptivo: string;
    familiar_con_sop: boolean;
    familiar_con_diabetes: boolean;
    diabetes: boolean;
    hipotiroidismo: boolean;
    hiperprolactinemia: boolean;
    resistencia_insulina: boolean;
    observaciones: string;
  }>({
    iniciada_vida_sexual: false,
    edad_menarquia: "",
    tipo_ciclo: "regular",
    duracion_ciclo_habitual: 28,
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

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorApi(null);
    try {
      // 1. Obtener datos del paciente
      const datosPaciente = await obtenerPaciente(id);
      setPaciente(datosPaciente);

      // 2. Obtener antecedentes del paciente (si ya existen)
      try {
        const datosAntecedentes = await obtenerAntecedentes(id);
        const tieneObstetricos = Boolean(
          Number(datosAntecedentes.gestas || 0) > 0 ||
          Number(datosAntecedentes.partos || 0) > 0 ||
          Number(datosAntecedentes.cesareas || 0) > 0 ||
          Number(datosAntecedentes.abortos || 0) > 0 ||
          Number(datosAntecedentes.hijos_vivos || 0) > 0
        );
        const sexActiva = Boolean(datosAntecedentes.iniciada_vida_sexual || tieneObstetricos);
        setSexarcaPrevia(sexActiva);
        if (datosAntecedentes.edad_menarquia !== null && datosAntecedentes.edad_menarquia !== undefined) {
          setMenarquiaPrevia(Number(datosAntecedentes.edad_menarquia));
        } else {
          setMenarquiaPrevia(null);
        }

        setForm({
          iniciada_vida_sexual: sexActiva,
          edad_menarquia: datosAntecedentes.edad_menarquia ?? "",
          tipo_ciclo: datosAntecedentes.tipo_ciclo ?? "regular",
          duracion_ciclo_habitual: datosAntecedentes.duracion_ciclo_habitual ?? 28,
          gestas: datosAntecedentes.gestas ?? 0,
          partos: datosAntecedentes.partos ?? 0,
          cesareas: datosAntecedentes.cesareas ?? 0,
          abortos: datosAntecedentes.abortos ?? 0,
          hijos_vivos: datosAntecedentes.hijos_vivos ?? 0,
          usa_anticonceptivos: datosAntecedentes.usa_anticonceptivos ?? false,
          tipo_anticonceptivo: datosAntecedentes.tipo_anticonceptivo ?? "",
          familiar_con_sop: datosAntecedentes.familiar_con_sop ?? false,
          familiar_con_diabetes: datosAntecedentes.familiar_con_diabetes ?? false,
          diabetes: datosAntecedentes.diabetes ?? false,
          hipotiroidismo: datosAntecedentes.hipotiroidismo ?? false,
          hiperprolactinemia: (datosAntecedentes as any).hiperprolactinemia ?? false,
          resistencia_insulina: datosAntecedentes.resistencia_insulina ?? false,
          observaciones: datosAntecedentes.observaciones ?? "",
        });
      } catch (err: any) {
        if (err.message === "SIN_ANTECEDENTES") {
          // Aún no registrado, se mantiene el formulario inicial vacío
          setSexarcaPrevia(false);
          setMenarquiaPrevia(null);
        } else {
          console.warn("No se cargaron antecedentes previos", err);
        }
      }
    } catch {
      setErrorApi("No se pudo cargar la información del paciente.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleSexarca = (activa: boolean) => {
    if (form.iniciada_vida_sexual && !activa) {
      setModalSexarcaAbierto(true);
      return;
    }
    setForm(prev => ({
      ...prev,
      iniciada_vida_sexual: true,
    }));
  };

  const confirmarReversionSexarca = () => {
    setForm(prev => ({
      ...prev,
      iniciada_vida_sexual: false,
      gestas: 0,
      partos: 0,
      cesareas: 0,
      abortos: 0,
      hijos_vivos: 0,
    }));
    setSexarcaPrevia(false);
    setModalSexarcaAbierto(false);
    showToast("Inicio de vida sexual cambiado a 'No' (Sin Sexarca)", "ok");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
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
        usa_anticonceptivos: form.usa_anticonceptivos,
        tipo_anticonceptivo: form.usa_anticonceptivos ? (form.tipo_anticonceptivo || null) : null,
        familiar_con_sop: form.familiar_con_sop,
        familiar_con_diabetes: form.familiar_con_diabetes,
        diabetes: form.diabetes,
        hipotiroidismo: form.hipotiroidismo,
        hiperprolactinemia: form.hiperprolactinemia,
        resistencia_insulina: form.resistencia_insulina,
        observaciones: form.observaciones || null,
      };

      await guardarAntecedentes(id, payload);
      showToast("Antecedentes médicos guardados correctamente");
      setTimeout(() => {
        navigate("/admin/pacientes");
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Error al guardar antecedentes médicos", "error");
    } finally {
      setSaving(false);
    }
  };

  const nombreCompleto = paciente
    ? [paciente.nombre, paciente.primer_apellido, paciente.segundo_apellido].filter(Boolean).join(" ")
    : "";

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
          toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {toast.tipo === "ok" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
          {toast.msg}
        </div>
      )}

      {/* Botón Volver */}
      <button
        onClick={() => navigate("/admin/pacientes")}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
      >
        <MdArrowBack size={18} />
        Volver a la lista de pacientes
      </button>

      {/* Error */}
      {errorApi && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-sm bg-rose-50 border border-rose-200 text-rose-800 font-bold">
          <MdWarning size={20} className="text-rose-600" />
          <span>{errorApi}</span>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-extrabold text-slate-600">Cargando expediente clínico del paciente...</p>
        </div>
      )}

      {!loading && paciente && (
        <div className="space-y-6">

          {/* ── FICHA DE IDENTIFICACIÓN DEL PACIENTE ── */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                {paciente.nombre.charAt(0)}{paciente.primer_apellido.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">{nombreCompleto}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    paciente.activo
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {paciente.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <MdBadge size={15} className="text-slate-400" />
                    CI: {paciente.ci || "Sin CI"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MdCalendarMonth size={15} className="text-slate-400" />
                    Edad: {calcularEdad(paciente.fecha_nacimiento)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MdPhone size={15} className="text-slate-400" />
                    {paciente.telefono || "Sin teléfono"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MdEmail size={15} className="text-slate-400" />
                    {paciente.email || "Sin correo"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/admin/analysis?pacienteId=${paciente.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black text-white shadow-md hover:shadow-lg transition-all"
                style={{
                  background: "linear-gradient(135deg, #f43f5e, #a855f7)",
                  boxShadow: "0 4px 15px rgba(244,63,94,0.25)",
                }}
              >
                <MdImageSearch size={18} />
                <span>Evaluar Ecografía Ovárica</span>
              </button>
            </div>
          </div>

          {/* ── FORMULARIO DE ANTECEDENTES MÉDICOS ── */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* SECCIÓN 1: SEXARCA Y VIDA SEXUAL */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                    <MdFemale size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Sexarca / Inicio de Vida Sexual</h3>
                    <p className="text-xs text-slate-500">Condición que habilita el registro de antecedentes obstétricos</p>
                  </div>
                </div>
                {sexarcaPrevia && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    <MdShield size={14} /> Dato biológico irreversible
                  </span>
                )}
              </div>

              {/* Selector Sexarca */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    ¿La paciente ha iniciado vida sexual? (Sexarca Activa) *
                  </span>
                  {sexarcaPrevia ? (
                    <span className="text-[11px] font-semibold text-rose-600 mt-1 block">
                      Registrada previamente como activa. Requiere confirmación médica para revertir por corrección.
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Al marcar "Sí", se habilitará la fórmula obstétrica (gestas, partos, cesáreas y abortos).
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleSexarca(true)}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      form.iniciada_vida_sexual
                        ? "bg-rose-600 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-600"
                        : "bg-slate-200 text-slate-800 font-extrabold hover:bg-slate-300 dark:bg-slate-700 dark:text-white border border-slate-400"
                    }`}
                  >
                    <MdCheck size={16} /> Sí (Sexarca Activa)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSexarca(false)}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      !form.iniciada_vida_sexual
                        ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900 dark:bg-slate-700"
                        : "bg-slate-200 text-slate-800 font-extrabold hover:bg-slate-300 dark:bg-slate-700 dark:text-white border border-slate-400"
                    }`}
                  >
                    <MdClose size={16} /> No (Sin Sexarca)
                  </button>
                </div>
              </div>

              {/* Mensaje si NO tiene Sexarca */}
              {!form.iniciada_vida_sexual && (
                <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs font-medium text-amber-900">
                  <MdInfo size={22} className="text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Paciente sin inicio de vida sexual:</strong> Los antecedentes obstétricos (embarazos, partos, cesáreas y abortos) se omiten automáticamente. El uso de anticonceptivos o terapia hormonal para regular el ciclo SOP se registra de manera independiente más abajo.
                  </span>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: HISTORIAL GINECOLÓGICO */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                    <MdOutlineBiotech size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Historial Menstrual / Ginecológico</h3>
                    <p className="text-xs text-slate-500">Parámetros clave para la evaluación del Criterio 1 de Rotterdam (Disfunción Ovulatoria)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Edad Menarquia Protegida */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Edad de Menarquia (Años)
                    </label>
                    {menarquiaPrevia !== null && (
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                        <MdLock size={12} /> Dato Histórico Fijo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={8}
                      max={20}
                      disabled={menarquiaPrevia !== null && !menarquiaDesbloqueada}
                      value={form.edad_menarquia}
                      onChange={e => setForm(p => ({ ...p, edad_menarquia: e.target.value === "" ? "" : Number(e.target.value) }))}
                      placeholder="Ej: 12"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold transition shadow-sm ${
                        menarquiaPrevia !== null && !menarquiaDesbloqueada
                          ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                      }`}
                    />
                    {menarquiaPrevia !== null && !menarquiaDesbloqueada && (
                      <button
                        type="button"
                        onClick={() => setModalMenarquiaAbierto(true)}
                        title="Desbloquear para corregir error de digitación"
                        className="px-3 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl flex items-center gap-1 whitespace-nowrap transition shadow-sm"
                      >
                        <MdLockOpen size={16} /> Corregir
                      </button>
                    )}
                  </div>
                  {menarquiaPrevia !== null && !menarquiaDesbloqueada && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      La menarquía no cambia con el tiempo. Desbloquea solo si hubo equivocación al registrar.
                    </p>
                  )}
                </div>

                {/* Tipo de Ciclo Menstrual (Editable) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patrón del Ciclo Menstrual *
                  </label>
                  <select
                    value={form.tipo_ciclo}
                    onChange={e => setForm(p => ({ ...p, tipo_ciclo: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
                  >
                    <option value="regular">Regular (21-35 días)</option>
                    <option value="irregular">Irregular</option>
                    <option value="oligomenorrea">Oligomenorrea (&gt;35 días)</option>
                    <option value="amenorrea">Amenorrea (Ausente &gt;90 días)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Puede variar con tratamientos o a lo largo del tiempo.
                  </p>
                </div>

                {/* Duración Ciclo Habitual (Editable) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duración Sangrado / Ciclo (Días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.duracion_ciclo_habitual}
                    onChange={e => setForm(p => ({ ...p, duracion_ciclo_habitual: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 5 (sangrado) o 28 (ciclo)"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Duración habitual de sangrado o longitud promedio del ciclo.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: ANTECEDENTES OBSTÉTRICOS (SOLO SI TIENE SEXARCA ACTIVA) */}
            {form.iniciada_vida_sexual && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5 animate-fade-in-up">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                    <MdFamilyRestroom size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Historial Obstétrico (Fórmula GPCA)</h3>
                    <p className="text-xs text-slate-500">Aplica para pacientes con inicio de vida sexual</p>
                  </div>
                </div>

                {/* Fórmula Obstétrica */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gestas</label>
                    <input
                      type="number"
                      min={0}
                      value={form.gestas}
                      onChange={e => setForm(p => ({ ...p, gestas: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Partos</label>
                    <input
                      type="number"
                      min={0}
                      value={form.partos}
                      onChange={e => setForm(p => ({ ...p, partos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cesáreas</label>
                    <input
                      type="number"
                      min={0}
                      value={form.cesareas}
                      onChange={e => setForm(p => ({ ...p, cesareas: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Abortos</label>
                    <input
                      type="number"
                      min={0}
                      value={form.abortos}
                      onChange={e => setForm(p => ({ ...p, abortos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hijos Vivos</label>
                    <input
                      type="number"
                      min={0}
                      value={form.hijos_vivos}
                      onChange={e => setForm(p => ({ ...p, hijos_vivos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 4: ANTICONCEPCIÓN Y TERAPIA HORMONAL (DISPONIBLE PARA TODAS LAS PACIENTES) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
                    <MdMedication size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Anticoncepción y Terapia Hormonal</h3>
                    <p className="text-xs text-slate-500">Uso actual para control de fertilidad, regulación del ciclo menstrual o tratamiento de SOP</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    ¿La paciente utiliza anticonceptivos o terapia hormonal actualmente?
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    En pacientes con SOP, los anticonceptivos se usan como tratamiento para regular el ciclo menstrual o frenar el hiperandrogenismo, aún sin inicio de vida sexual.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        usa_anticonceptivos: true,
                        tipo_anticonceptivo: p.tipo_anticonceptivo || OPCIONES_ANTICONCEPTIVOS[0]
                      }));
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      form.usa_anticonceptivos
                        ? "bg-teal-600 text-white shadow-md shadow-teal-500/30 ring-2 ring-teal-600"
                        : "bg-slate-200 text-slate-800 font-extrabold hover:bg-slate-300 dark:bg-slate-700 dark:text-white border border-slate-400"
                    }`}
                  >
                    <MdCheck size={16} /> Sí (En Uso)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        usa_anticonceptivos: false,
                        tipo_anticonceptivo: ""
                      }));
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      !form.usa_anticonceptivos
                        ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900 dark:bg-slate-700"
                        : "bg-slate-200 text-slate-800 font-extrabold hover:bg-slate-300 dark:bg-slate-700 dark:text-white border border-slate-400"
                    }`}
                  >
                    <MdClose size={16} /> No (Sin Uso)
                  </button>
                </div>
              </div>

              {/* Detalle si usa anticonceptivos */}
              {form.usa_anticonceptivos && (
                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-4 animate-fade-in-up">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Método / Anticonceptivo *
                      </label>
                      <select
                        value={
                          OPCIONES_ANTICONCEPTIVOS.includes(form.tipo_anticonceptivo)
                            ? form.tipo_anticonceptivo
                            : "Otro (Especificar)"
                        }
                        onChange={e => {
                          const val = e.target.value;
                          setForm(p => ({
                            ...p,
                            tipo_anticonceptivo: val === "Otro (Especificar)" ? "" : val
                          }));
                        }}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition shadow-sm"
                      >
                        {OPCIONES_ANTICONCEPTIVOS.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detalle / Principio Activo / Marca
                      </label>
                      <input
                        type="text"
                        value={form.tipo_anticonceptivo}
                        onChange={e => setForm(p => ({ ...p, tipo_anticonceptivo: e.target.value }))}
                        placeholder="Ej: Diane 35, Yaz, Levonorgestrel 52mg, Acetato de ciproterona..."
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: FACTORES DE RIESGO Y ANTECEDENTES PATOLÓGICOS / FAMILIARES */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                  <MdShield size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Factores de Riesgo SOP y Comorbilidades</h3>
                  <p className="text-xs text-slate-500">Antecedentes personales y heredo-familiares</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-bold text-slate-800">Familiar con SOP</span>
                  <input
                    type="checkbox"
                    checked={form.familiar_con_sop}
                    onChange={e => setForm(p => ({ ...p, familiar_con_sop: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-bold text-slate-800">Familiar con Diabetes</span>
                  <input
                    type="checkbox"
                    checked={form.familiar_con_diabetes}
                    onChange={e => setForm(p => ({ ...p, familiar_con_diabetes: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-bold text-slate-800">Diabetes Personal</span>
                  <input
                    type="checkbox"
                    checked={form.diabetes}
                    onChange={e => setForm(p => ({ ...p, diabetes: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-bold text-slate-800">Hipotiroidismo</span>
                  <input
                    type="checkbox"
                    checked={form.hipotiroidismo}
                    onChange={e => setForm(p => ({ ...p, hipotiroidismo: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-bold text-slate-800">Hiperprolactinemia</span>
                  <input
                    type="checkbox"
                    checked={form.hiperprolactinemia}
                    onChange={e => setForm(p => ({ ...p, hiperprolactinemia: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-bold text-slate-800">Resistencia a la Insulina</span>
                  <input
                    type="checkbox"
                    checked={form.resistencia_insulina}
                    onChange={e => setForm(p => ({ ...p, resistencia_insulina: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: OBSERVACIONES Y NOTAS CLÍNICAS */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                  <MdOutlineAssignment size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Observaciones y Notas Clínicas</h3>
                  <p className="text-xs text-slate-500">Anotaciones adicionales del Dr. Rodrigo Espinoza</p>
                </div>
              </div>

              <textarea
                rows={4}
                value={form.observaciones}
                onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Escriba notas sobre antecedentes familiares, síntomas hiperandrogénicos, tratamientos previos u observaciones ecográficas..."
                className="w-full border border-slate-300 rounded-2xl p-4 text-xs font-semibold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
              />
            </div>

            {/* BOTÓN GUARDAR ANTECEDENTES */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-extrabold text-sm text-white shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)", boxShadow: "0 4px 20px rgba(244,63,94,0.35)" }}
              >
                {saving ? (
                  <span>Guardando expediente...</span>
                ) : (
                  <>
                    <MdSave size={20} />
                    <span>Guardar Antecedentes Médicos</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ── MODAL DE SEGURIDAD CLÍNICA: REVERSIÓN DE SEXARCA ── */}
      {modalSexarcaAbierto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center font-bold">
                <MdWarning size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">¿Está seguro de cambiar a "No"?</h3>
                <p className="text-xs text-rose-600 font-semibold">Confirmación de Registro de Sexarca</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Al marcar <strong>"No (Sin Sexarca)"</strong>, se indicará que la paciente no ha iniciado vida sexual activa.
            </p>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-medium">
              ⚠️ <strong>Atención:</strong> Todos los antecedentes obstétricos registrados (gestas, partos, cesáreas y abortos) se restablecerán automáticamente a 0.
            </div>

            <p className="text-xs text-slate-700 font-bold">
              ¿Desea confirmar el cambio a "No"?
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalSexarcaAbierto(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancelar (Mantener Sí)
              </button>
              <button
                type="button"
                onClick={confirmarReversionSexarca}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition"
              >
                Sí, cambiar a "No"
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE SEGURIDAD CLÍNICA: DESBLOQUEO DE EDAD DE MENARQUÍA ── */}
      {modalMenarquiaAbierto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-purple-200 space-y-4">
            <div className="flex items-center gap-3 text-purple-600">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center font-bold">
                <MdLock size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Dato Histórico Fijo</h3>
                <p className="text-xs text-purple-600 font-semibold">Edad de Primera Menstruación</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              La <strong>Edad de Menarquía ({menarquiaPrevia} años)</strong> es un dato biológico constante que no cambia a lo largo de la vida de la paciente.
            </p>

            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-[11px] text-purple-900 font-medium">
              🔒 El campo se encuentra bloqueado para evitar modificaciones accidentales en consultas de seguimiento.
            </div>

            <p className="text-xs text-slate-700 font-bold">
              ¿Desea desbloquear la casilla para corregir una equivocación de tipeo?
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMenarquiaAbierto(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Mantener ({menarquiaPrevia} años)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenarquiaDesbloqueada(true);
                  setModalMenarquiaAbierto(false);
                  showToast("Casilla de menarquía desbloqueada para corrección", "ok");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 transition"
              >
                Desbloquear Campo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
