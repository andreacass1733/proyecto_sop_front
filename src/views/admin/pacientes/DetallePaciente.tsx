import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArrowBack, MdBadge, MdPhone, MdEmail,
  MdCalendarMonth, MdMedicalServices, MdSave, MdCheckCircle,
  MdWarning, MdInfo, MdFemale, MdOutlineBiotech, MdFamilyRestroom,
  MdShield, MdOutlineAssignment, MdCheck, MdClose
} from "react-icons/md";
import {
  obtenerPaciente, obtenerAntecedentes, guardarAntecedentes,
  PacienteOut
} from "services/api";

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
        setForm({
          iniciada_vida_sexual: (datosAntecedentes as any).iniciada_vida_sexual ?? (datosAntecedentes.gestas > 0 || datosAntecedentes.usa_anticonceptivos),
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
    setForm(prev => ({
      ...prev,
      iniciada_vida_sexual: activa,
      // Si sexarca es No, reseteamos contadores obstétricos y anticonceptivos
      ...(activa ? {} : {
        gestas: 0,
        partos: 0,
        cesareas: 0,
        abortos: 0,
        hijos_vivos: 0,
        usa_anticonceptivos: false,
        tipo_anticonceptivo: "",
      })
    }));
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

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-purple-50/60 p-3 rounded-2xl border border-purple-100">
              <MdMedicalServices size={18} className="text-purple-600" />
              <span>Médico Tratante: Dr. Rodrigo Espinoza</span>
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
                    <p className="text-xs text-slate-500">Diferencia la aplicación de antecedentes obstétricos y anticoncepción</p>
                  </div>
                </div>
              </div>

              {/* Selector Sexarca */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-800">
                  ¿La paciente ha iniciado vida sexual? (Sexarca Activa) *
                </span>
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
                    <strong>Paciente sin inicio de vida sexual:</strong> Los datos obstétricos (Gestas, Partos, Cesáreas, Abortos, Hijos Vivos) y métodos anticonceptivos se ocultan de la ficha clínica.
                  </span>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: HISTORIAL GINECOLÓGICO */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                  <MdOutlineBiotech size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Historial Menstrual / Ginecológico</h3>
                  <p className="text-xs text-slate-500">Parámetros clave para la evaluación del SOP Rotterdam</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Edad Menarquia */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Edad de Menarquia (Años)
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={form.edad_menarquia}
                    onChange={e => setForm(p => ({ ...p, edad_menarquia: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 12"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
                  />
                </div>

                {/* Tipo de Ciclo */}
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
                    <option value="amenorrea">Amenorrea (Ausente)</option>
                  </select>
                </div>

                {/* Duración Ciclo Habitual */}
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
                    placeholder="Ej: 5 o 28"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: ANTECEDENTES OBSTÉTRICOS Y ANTICONCEPCIÓN (OCULTO SI NO TIENE SEXARCA) */}
            {form.iniciada_vida_sexual && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5 animate-fade-in-up">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                    <MdFamilyRestroom size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Historial Obstétrico y Anticoncepción</h3>
                    <p className="text-xs text-slate-500">Aplica para pacientes con vida sexual iniciada</p>
                  </div>
                </div>

                {/* Formula Obstétrica */}
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

                {/* Anticoncepción */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">¿Usa Anticonceptivos actualmente?</span>
                    <input
                      type="checkbox"
                      checked={form.usa_anticonceptivos}
                      onChange={e => setForm(p => ({ ...p, usa_anticonceptivos: e.target.checked }))}
                      className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
                    />
                  </div>

                  {form.usa_anticonceptivos && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Anticonceptivo</label>
                      <input
                        type="text"
                        value={form.tipo_anticonceptivo}
                        onChange={e => setForm(p => ({ ...p, tipo_anticonceptivo: e.target.value }))}
                        placeholder="Ej: ACO Combinados, DIU Levonorgestrel, Implante"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

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
    </div>
  );
}
