import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MdMedicalServices, MdSearch, MdPerson, MdBadge, MdPhone,
  MdEmail, MdCalendarMonth, MdSave, MdCheckCircle, MdWarning,
  MdInfo, MdFemale, MdOutlineBiotech, MdFamilyRestroom, MdShield,
  MdOutlineAssignment, MdCheck, MdClose, MdRefresh
} from "react-icons/md";
import {
  listarPacientes, obtenerPaciente, obtenerAntecedentes, guardarAntecedentes,
  PacienteListItem, PacienteOut
} from "services/api";

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function AntecedentesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Búsqueda de pacientes
  const [busqueda, setBusqueda]           = useState("");
  const [listaPacientes, setListaPacientes] = useState<PacienteListItem[]>([]);
  const [buscando, setBuscando]           = useState(false);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  // Paciente seleccionado
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteOut | null>(null);
  const [loadingPaciente, setLoadingPaciente]           = useState(false);
  const [saving, setSaving]                             = useState(false);
  const [toast, setToast]                               = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  // Formulario Antecedentes
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

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar lista de pacientes al buscar
  const buscarPacientes = useCallback(async (query: string) => {
    setBuscando(true);
    try {
      const datos = await listarPacientes(query || undefined, true, 1, 15);
      setListaPacientes(datos);
    } catch {
      console.warn("Error al buscar pacientes");
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    buscarPacientes(busqueda);
  }, [busqueda, buscarPacientes]);

  // Cargar paciente por ID (ya sea seleccionado o por query param pacienteId)
  const cargarPacienteId = useCallback(async (id: string) => {
    setLoadingPaciente(true);
    try {
      const datosP = await obtenerPaciente(id);
      setPacienteSeleccionado(datosP);

      // Cargar antecedentes
      try {
        const datosA = await obtenerAntecedentes(id);
        setForm({
          iniciada_vida_sexual: (datosA as any).iniciada_vida_sexual ?? (datosA.gestas > 0 || datosA.usa_anticonceptivos),
          edad_menarquia: datosA.edad_menarquia ?? "",
          tipo_ciclo: datosA.tipo_ciclo ?? "regular",
          duracion_ciclo_habitual: datosA.duracion_ciclo_habitual ?? 28,
          gestas: datosA.gestas ?? 0,
          partos: datosA.partos ?? 0,
          cesareas: datosA.cesareas ?? 0,
          abortos: datosA.abortos ?? 0,
          hijos_vivos: datosA.hijos_vivos ?? 0,
          usa_anticonceptivos: datosA.usa_anticonceptivos ?? false,
          tipo_anticonceptivo: datosA.tipo_anticonceptivo ?? "",
          familiar_con_sop: datosA.familiar_con_sop ?? false,
          familiar_con_diabetes: datosA.familiar_con_diabetes ?? false,
          diabetes: datosA.diabetes ?? false,
          hipotiroidismo: datosA.hipotiroidismo ?? false,
          hiperprolactinemia: (datosA as any).hiperprolactinemia ?? false,
          resistencia_insulina: datosA.resistencia_insulina ?? false,
          observaciones: datosA.observaciones ?? "",
        });
      } catch (err: any) {
        if (err.message === "SIN_ANTECEDENTES") {
          // Reset a vacíos para primer registro
          setForm({
            iniciada_vida_sexual: false,
            edad_menarquia: "",
            tipo_ciclo: "regular",
            duracion_ciclo_habitual: 28,
            gestas: 0, partos: 0, cesareas: 0, abortos: 0, hijos_vivos: 0,
            usa_anticonceptivos: false, tipo_anticonceptivo: "",
            familiar_con_sop: false, familiar_con_diabetes: false,
            diabetes: false, hipotiroidismo: false, hiperprolactinemia: false, resistencia_insulina: false,
            observaciones: "",
          });
        }
      }
    } catch {
      showToast("No se pudo cargar la información del paciente", "error");
    } finally {
      setLoadingPaciente(false);
    }
  }, []);

  // Escuchar si hay pacienteId en la URL
  useEffect(() => {
    const pId = searchParams.get("pacienteId");
    if (pId) {
      cargarPacienteId(pId);
    }
  }, [searchParams, cargarPacienteId]);

  const seleccionarPaciente = (p: PacienteListItem) => {
    setSearchParams({ pacienteId: p.id });
    setDropdownAbierto(false);
    setBusqueda("");
  };

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
    if (!pacienteSeleccionado) return;
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

      await guardarAntecedentes(pacienteSeleccionado.id, payload);
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

  const nombreCompleto = pacienteSeleccionado
    ? [pacienteSeleccionado.nombre, pacienteSeleccionado.primer_apellido, pacienteSeleccionado.segundo_apellido].filter(Boolean).join(" ")
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

      {/* ENCABEZADO DE PÁGINA */}
      <div className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)" }}>
            <MdMedicalServices size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Antecedentes Médicos y Datos Clínicos</h1>
            <p className="text-xs text-slate-500 font-medium">Dr. Rodrigo Espinoza — Evaluación del Síndrome de Ovario Poliquístico</p>
          </div>
        </div>

        {pacienteSeleccionado && (
          <button
            onClick={() => navigate(`/admin/pacientes/${pacienteSeleccionado.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition"
          >
            Ver expediente completo
          </button>
        )}
      </div>

      {/* BUSCADOR DE PACIENTES */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 relative">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
          Seleccionar o Buscar Paciente *
        </label>
        <div className="relative">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Escriba el nombre, apellido, CI o correo de la paciente..."
            value={busqueda}
            onFocus={() => setDropdownAbierto(true)}
            onChange={e => { setBusqueda(e.target.value); setDropdownAbierto(true); }}
            className="w-full pl-11 pr-10 py-3 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm"
          />
          {buscando && (
            <MdRefresh className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 animate-spin" size={20} />
          )}
        </div>

        {/* Dropdown de Resultados */}
        {dropdownAbierto && listaPacientes.length > 0 && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownAbierto(false)} />
            <div className="absolute left-6 right-6 top-[88px] z-20 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              {listaPacientes.map((p) => (
                <div
                  key={p.id}
                  onClick={() => seleccionarPaciente(p)}
                  className="p-3.5 hover:bg-purple-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-xs">
                      {p.nombre.charAt(0)}{p.primer_apellido.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.nombre} {p.primer_apellido} {p.segundo_apellido || ""}</p>
                      <p className="text-[11px] text-slate-400">CI: {p.ci || "Sin CI"} • Edad: {calcularEdad(p.fecha_nacimiento)}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                    Seleccionar
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SI NO HAY PACIENTE SELECCIONADO */}
      {!loadingPaciente && !pacienteSeleccionado && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto text-purple-600">
            <MdMedicalServices size={32} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Ningún paciente seleccionado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Utilice el buscador superior para seleccionar un paciente o registre un nuevo paciente para completar sus antecedentes clínicos.
          </p>
          <button
            onClick={() => navigate("/admin/pacientes")}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-rose-500 to-purple-600 shadow-md"
          >
            Ir a Gestión de Pacientes
          </button>
        </div>
      )}

      {/* LOADER */}
      {loadingPaciente && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm text-xs font-extrabold text-slate-600">
          Cargando expediente e historial del paciente...
        </div>
      )}

      {/* FORMULARIO COMPLETO DE ANTECEDENTES */}
      {!loadingPaciente && pacienteSeleccionado && (
        <div className="space-y-6 animate-fade-in-up">

          {/* TARJETA DE PACIENTE SELECCIONADO */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-purple-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl text-rose-300 border border-white/20">
                {pacienteSeleccionado.nombre.charAt(0)}{pacienteSeleccionado.primer_apellido.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">{nombreCompleto}</h2>
                <p className="text-xs text-purple-200 mt-0.5 flex items-center gap-3 flex-wrap font-medium">
                  <span>CI: {pacienteSeleccionado.ci || "Sin CI"}</span>
                  <span>•</span>
                  <span>Edad: {calcularEdad(pacienteSeleccionado.fecha_nacimiento)}</span>
                  <span>•</span>
                  <span>Tel: {pacienteSeleccionado.telefono || "—"}</span>
                  <span>•</span>
                  <span>Correo: {pacienteSeleccionado.email || "—"}</span>
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
              Paciente Activo
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* SECCIÓN 1: SEXARCA Y VIDA SEXUAL */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                  <MdFemale size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Sexarca / Inicio de Vida Sexual</h3>
                  <p className="text-xs text-slate-500">Determina la aplicación de contadores obstétricos y anticoncepción</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-800">
                  ¿La paciente ha iniciado vida sexual? (Sexarca Activa) *
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSexarca(true)}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                      form.iniciada_vida_sexual
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                        : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <MdCheck size={16} /> Sí (Sexarca Activa)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSexarca(false)}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                      !form.iniciada_vida_sexual
                        ? "bg-slate-700 text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <MdClose size={16} /> No (Sin Sexarca)
                  </button>
                </div>
              </div>

              {!form.iniciada_vida_sexual && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-medium text-amber-900">
                  <MdInfo size={22} className="text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Paciente sin inicio de vida sexual:</strong> Los datos obstétricos (gestas, partos, abortos) y métodos anticonceptivos se ocultan de la ficha clínica.
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
                  <p className="text-xs text-slate-500">Parámetros fundamentales para los Criterios Rotterdam SOP</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Edad Menarquia (Años)</label>
                  <input type="number" min={8} max={20} value={form.edad_menarquia}
                    onChange={e => setForm(p => ({ ...p, edad_menarquia: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 12" className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patrón del Ciclo Menstrual *</label>
                  <select value={form.tipo_ciclo} onChange={e => setForm(p => ({ ...p, tipo_ciclo: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white">
                    <option value="regular">Regular (21-35 días)</option>
                    <option value="irregular">Irregular</option>
                    <option value="oligomenorrea">Oligomenorrea (&gt;35 días)</option>
                    <option value="amenorrea">Amenorrea (Ausente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duración Sangrado / Ciclo (Días)</label>
                  <input type="number" min={1} max={90} value={form.duracion_ciclo_habitual}
                    onChange={e => setForm(p => ({ ...p, duracion_ciclo_habitual: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 5 o 28" className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white" />
                  <p className="text-[11px] text-slate-400 mt-1">Días habituales de sangrado (ej. 5) o ciclo (ej. 28)</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: OBSTÉTRICO Y ANTICONCEPCIÓN (SOLO SI TIENE VIDA SEXUAL INICIADA) */}
            {form.iniciada_vida_sexual && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5 animate-fade-in-up">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                    <MdFamilyRestroom size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Historial Obstétrico y Anticoncepción</h3>
                    <p className="text-xs text-slate-500">Información clínica para pacientes con sexarca activa</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gestas</label>
                    <input type="number" min={0} value={form.gestas}
                      onChange={e => setForm(p => ({ ...p, gestas: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Partos</label>
                    <input type="number" min={0} value={form.partos}
                      onChange={e => setForm(p => ({ ...p, partos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cesáreas</label>
                    <input type="number" min={0} value={form.cesareas}
                      onChange={e => setForm(p => ({ ...p, cesareas: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Abortos</label>
                    <input type="number" min={0} value={form.abortos}
                      onChange={e => setForm(p => ({ ...p, abortos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hijos Vivos</label>
                    <input type="number" min={0} value={form.hijos_vivos}
                      onChange={e => setForm(p => ({ ...p, hijos_vivos: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">¿Usa Anticonceptivos actualmente?</span>
                    <input type="checkbox" checked={form.usa_anticonceptivos}
                      onChange={e => setForm(p => ({ ...p, usa_anticonceptivos: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                  </div>
                  {form.usa_anticonceptivos && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Anticonceptivo</label>
                      <input type="text" value={form.tipo_anticonceptivo}
                        onChange={e => setForm(p => ({ ...p, tipo_anticonceptivo: e.target.value }))}
                        placeholder="Ej: ACO Combinados, DIU Levonorgestrel, Implante" className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECCIÓN 4: FACTORES DE RIESGO Y COMORBILIDADES */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                  <MdShield size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Factores de Riesgo SOP y Endocrinopatías</h3>
                  <p className="text-xs text-slate-500">Antecedentes personales, metabólicos y hormonales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Familiar con SOP</span>
                  <input type="checkbox" checked={form.familiar_con_sop} onChange={e => setForm(p => ({ ...p, familiar_con_sop: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Familiar con Diabetes</span>
                  <input type="checkbox" checked={form.familiar_con_diabetes} onChange={e => setForm(p => ({ ...p, familiar_con_diabetes: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Diabetes Personal</span>
                  <input type="checkbox" checked={form.diabetes} onChange={e => setForm(p => ({ ...p, diabetes: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Hipotiroidismo</span>
                  <input type="checkbox" checked={form.hipotiroidismo} onChange={e => setForm(p => ({ ...p, hipotiroidismo: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Hiperprolactinemia</span>
                  <input type="checkbox" checked={form.hiperprolactinemia} onChange={e => setForm(p => ({ ...p, hiperprolactinemia: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Resistencia a la Insulina</span>
                  <input type="checkbox" checked={form.resistencia_insulina} onChange={e => setForm(p => ({ ...p, resistencia_insulina: e.target.checked }))} className="w-5 h-5 text-rose-600 rounded" />
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: OBSERVACIONES */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                  <MdOutlineAssignment size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Observaciones y Notas Clínicas</h3>
                  <p className="text-xs text-slate-500">Anotaciones médicas del Dr. Rodrigo Espinoza</p>
                </div>
              </div>

              <textarea rows={4} value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Escriba notas sobre los antecedentes clínicos..." className="w-full border border-slate-300 rounded-2xl p-4 text-xs font-semibold text-slate-900 bg-white" />
            </div>

            {/* BOTÓN GUARDAR ANTECEDENTES */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-extrabold text-sm text-white shadow-xl hover:shadow-2xl transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)", boxShadow: "0 4px 20px rgba(244,63,94,0.35)" }}
              >
                {saving ? "Guardando expediente..." : (
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
