import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MdMedicalServices, MdSearch, MdPerson,
  MdSave, MdCheckCircle, MdWarning,
  MdInfo, MdFemale, MdOutlineBiotech, MdFamilyRestroom, MdShield,
  MdOutlineAssignment, MdCheck, MdClose, MdRefresh,
  MdLock, MdLockOpen, MdMedication
} from "react-icons/md";
import {
  listarPacientes, obtenerPaciente, obtenerAntecedentes, guardarAntecedentes,
  PacienteListItem, PacienteOut
} from "services/api";
import { OPCIONES_ANTICONCEPTIVOS } from "views/admin/pacientes/DetallePaciente";

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

  // Estados de protección de datos biológicos (Sexarca irreversible y Menarquía fija)
  const [sexarcaPrevia, setSexarcaPrevia] = useState(false);
  const [menarquiaPrevia, setMenarquiaPrevia] = useState<number | null>(null);
  const [menarquiaDesbloqueada, setMenarquiaDesbloqueada] = useState(false);
  const [modalSexarcaAbierto, setModalSexarcaAbierto] = useState(false);
  const [modalMenarquiaAbierto, setModalMenarquiaAbierto] = useState(false);

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

  // Cargar paciente por ID
  const cargarPacienteId = useCallback(async (id: string) => {
    setLoadingPaciente(true);
    try {
      const datosP = await obtenerPaciente(id);
      setPacienteSeleccionado(datosP);

      try {
        const datosA = await obtenerAntecedentes(id);
        const sexActiva = Boolean(
          (datosA as any).iniciada_vida_sexual ?? (datosA.gestas > 0 || datosA.partos > 0)
        );
        setSexarcaPrevia(sexActiva);
        if (datosA.edad_menarquia !== null && datosA.edad_menarquia !== undefined) {
          setMenarquiaPrevia(Number(datosA.edad_menarquia));
        } else {
          setMenarquiaPrevia(null);
        }

        setForm({
          iniciada_vida_sexual: sexActiva,
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
          setSexarcaPrevia(false);
          setMenarquiaPrevia(null);
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
    if (sexarcaPrevia && !activa) {
      setModalSexarcaAbierto(true);
      return;
    }
    setForm(prev => ({
      ...prev,
      iniciada_vida_sexual: activa,
      ...(activa ? {} : {
        gestas: 0, partos: 0, cesareas: 0, abortos: 0, hijos_vivos: 0
      })
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
    setModalSexarcaAbierto(false);
    showToast("Modo corrección aplicado: Sexarca cambiada a 'No'", "ok");
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
    <div className="mt-3 flex h-full flex-col gap-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl ${
          toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {toast.tipo === "ok" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
          {toast.msg}
        </div>
      )}

      {/* ENCABEZADO DE PÁGINA */}
      <div className="rounded-2xl p-6 bg-white dark:bg-navy-800 border border-gray-100 dark:border-navy-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-500 text-white shadow-lg shadow-brand-500/30 dark:bg-brand-400 dark:text-navy-900">
            <MdMedicalServices size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-700 dark:text-white">Antecedentes Médicos y Datos Clínicos</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Evaluación clínica y factores de riesgo para el Síndrome de Ovario Poliquístico</p>
          </div>
        </div>

        {pacienteSeleccionado && (
          <button
            onClick={() => navigate(`/admin/pacientes/${pacienteSeleccionado.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-navy-700 dark:text-white bg-gray-50 hover:bg-gray-100 dark:bg-navy-700 dark:hover:bg-navy-600 border border-gray-200 dark:border-navy-600 transition"
          >
            Ver expediente completo
          </button>
        )}
      </div>

      {/* ── SELECTOR DE PACIENTE UNIFICADO (ESTILO EVALUACIÓN CLÍNICA / ROTTERDAM) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-navy-800 border border-slate-200/90 dark:border-navy-700 shadow-xs relative">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-black text-sm shrink-0">
            {pacienteSeleccionado
              ? `${pacienteSeleccionado.nombre.charAt(0)}${pacienteSeleccionado.primer_apellido.charAt(0)}`
              : "ANT"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Paciente en Antecedentes:
              </span>
              {loadingPaciente && (
                <span className="text-[10px] font-bold text-indigo-500 animate-pulse">
                  Cargando antecedentes...
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {pacienteSeleccionado
                ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.primer_apellido} ${pacienteSeleccionado.segundo_apellido || ""}`
                : "Ninguna paciente seleccionada"}
            </h2>
            {pacienteSeleccionado && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                CI: {pacienteSeleccionado.ci || "—"} • Edad: {calcularEdad(pacienteSeleccionado.fecha_nacimiento)}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownAbierto(!dropdownAbierto)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition border border-purple-200 shadow-sm whitespace-nowrap"
          >
            <MdPerson size={16} />
            <span>{pacienteSeleccionado ? "Cambiar Paciente" : "Seleccionar Paciente"}</span>
          </button>

          {dropdownAbierto && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-72 overflow-y-auto bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-fade-in-up">
              <div className="relative mb-1">
                <MdSearch className="absolute left-2.5 top-2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o CI..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-700 border border-slate-200 dark:border-navy-600 outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              {listaPacientes.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-3">No se encontraron pacientes</p>
              ) : (
                listaPacientes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      seleccionarPaciente(p);
                      setDropdownAbierto(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      pacienteSeleccionado?.id === p.id
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700"
                    }`}
                  >
                    <span className="truncate">{`${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">CI: {p.ci || "—"}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* SI NO HAY PACIENTE SELECCIONADO */}
      {!loadingPaciente && !pacienteSeleccionado && (
        <div className="bg-white dark:bg-navy-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-navy-700 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-navy-700 flex items-center justify-center mx-auto text-brand-500 dark:text-brand-400">
            <MdMedicalServices size={32} />
          </div>
          <h3 className="text-base font-bold text-navy-700 dark:text-white">Ningún paciente seleccionado</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Utilice el buscador superior para seleccionar un paciente o registre un nuevo paciente para completar sus antecedentes clínicos.
          </p>
          <button
            onClick={() => navigate("/admin/pacientes")}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900 shadow-md transition"
          >
            Ir a Gestión de Pacientes
          </button>
        </div>
      )}

      {/* LOADER */}
      {loadingPaciente && (
        <div className="bg-white dark:bg-navy-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-navy-700 shadow-sm text-xs font-bold text-navy-700 dark:text-white">
          Cargando expediente e historial del paciente...
        </div>
      )}

      {/* FORMULARIO COMPLETO DE ANTECEDENTES */}
      {!loadingPaciente && pacienteSeleccionado && (
        <div className="space-y-6">

          {/* TARJETA DE PACIENTE SELECCIONADO */}
          <div className="rounded-2xl p-6 bg-brand-500 dark:bg-navy-700 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-xl text-white border border-white/20">
                {pacienteSeleccionado.nombre.charAt(0)}{pacienteSeleccionado.primer_apellido.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{nombreCompleto}</h2>
                <p className="text-xs text-brand-100 dark:text-gray-300 mt-0.5 flex items-center gap-3 flex-wrap font-medium">
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

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 border border-white/30 text-white">
              Paciente Activo
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* SECCIÓN 1: SEXARCA Y VIDA SEXUAL */}
            <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 sm:p-7 border border-gray-100 dark:border-navy-700 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-navy-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-300 font-bold">
                    <MdFemale size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-700 dark:text-white text-sm">Sexarca / Inicio de Vida Sexual</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Condición clínica que habilita el registro de antecedentes obstétricos</p>
                  </div>
                </div>
                {sexarcaPrevia && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800/40">
                    <MdShield size={14} /> Dato biológico irreversible
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 dark:bg-navy-700 p-4 rounded-xl border border-gray-200 dark:border-navy-600">
                <div className="pl-3 sm:pl-4">
                  <span className="text-xs font-bold text-navy-700 dark:text-white block">
                    ¿La paciente ha iniciado vida sexual? (Sexarca Activa) *
                  </span>
                  {sexarcaPrevia ? (
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1 block">
                      Registrada previamente como activa. Requiere confirmación médica para revertir por corrección.
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
                      Al marcar "Sí", se habilitará la fórmula obstétrica (gestas, partos, cesáreas y abortos).
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSexarca(true)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      form.iniciada_vida_sexual
                        ? "bg-brand-500 text-white shadow-md dark:bg-brand-400 dark:text-navy-900"
                        : "bg-white text-navy-700 border border-gray-200 hover:bg-gray-100 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600"
                    }`}
                  >
                    <MdCheck size={16} /> Sí (Sexarca Activa)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSexarca(false)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      !form.iniciada_vida_sexual
                        ? "bg-navy-700 text-white shadow-md dark:bg-navy-600"
                        : "bg-white text-navy-700 border border-gray-200 hover:bg-gray-100 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600"
                    }`}
                  >
                    <MdClose size={16} /> No (Sin Sexarca)
                  </button>
                </div>
              </div>

              {!form.iniciada_vida_sexual && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs font-medium text-amber-900 dark:text-amber-300">
                  <MdInfo size={22} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Paciente sin inicio de vida sexual:</strong> Los antecedentes obstétricos (embarazos, partos, cesáreas y abortos) se omiten. El uso de anticonceptivos o terapia hormonal para regular el ciclo menstrual o acné en SOP se registra de manera independiente más abajo.
                  </span>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: HISTORIAL GINECOLÓGICO */}
            <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 sm:p-7 border border-gray-100 dark:border-navy-700 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-navy-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold">
                    <MdOutlineBiotech size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-700 dark:text-white text-sm">Historial Menstrual / Ginecológico</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Parámetros fundamentales para los Criterios Rotterdam SOP (Criterio 1: Disfunción Ovulatoria)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Edad Menarquía Protegida */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-navy-700 dark:text-white">
                      Edad Menarquia (Años)
                    </label>
                    {menarquiaPrevia !== null && (
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1">
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
                          ? "bg-gray-100 dark:bg-navy-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-navy-600 cursor-not-allowed"
                          : "bg-white dark:bg-navy-700 text-navy-700 dark:text-white border-gray-200 dark:border-navy-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      }`}
                    />
                    {menarquiaPrevia !== null && !menarquiaDesbloqueada && (
                      <button
                        type="button"
                        onClick={() => setModalMenarquiaAbierto(true)}
                        title="Desbloquear para corregir error de digitación"
                        className="px-3 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 border border-amber-300 dark:border-amber-700 rounded-xl flex items-center gap-1 whitespace-nowrap transition shadow-sm"
                      >
                        <MdLockOpen size={16} /> Corregir
                      </button>
                    )}
                  </div>
                  {menarquiaPrevia !== null && !menarquiaDesbloqueada && (
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      La menarquía no cambia con el tiempo. Desbloquea solo si hubo error de registro.
                    </p>
                  )}
                </div>

                {/* Tipo de Ciclo Menstrual (Editable) */}
                <div>
                  <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">
                    Patrón del Ciclo Menstrual *
                  </label>
                  <select
                    value={form.tipo_ciclo}
                    onChange={e => setForm(p => ({ ...p, tipo_ciclo: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-700 dark:text-white bg-white dark:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="regular">Regular (21-35 días)</option>
                    <option value="irregular">Irregular</option>
                    <option value="oligomenorrea">Oligomenorrea (&gt;35 días)</option>
                    <option value="amenorrea">Amenorrea (Ausente &gt;90 días)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    Puede variar con tratamientos o evolución del SOP.
                  </p>
                </div>

                {/* Duración Ciclo Habitual (Editable) */}
                <div>
                  <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">
                    Duración Sangrado / Ciclo (Días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.duracion_ciclo_habitual}
                    onChange={e => setForm(p => ({ ...p, duracion_ciclo_habitual: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="Ej: 5 o 28"
                    className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-700 dark:text-white bg-white dark:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Días habituales de sangrado (ej. 5) o longitud del ciclo (ej. 28)</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: OBSTÉTRICO (SOLO SI TIENE VIDA SEXUAL INICIADA) */}
            {form.iniciada_vida_sexual && (
              <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 sm:p-7 border border-gray-100 dark:border-navy-700 shadow-sm space-y-5 animate-fade-in-up">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-navy-700 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-300 font-bold">
                    <MdFamilyRestroom size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-700 dark:text-white text-sm">Historial Obstétrico (Fórmula GPCA)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Información clínica para pacientes con sexarca activa</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">Gestas</label>
                    <input type="number" min={0} value={form.gestas}
                      onChange={e => setForm(p => ({ ...p, gestas: Number(e.target.value) }))}
                      className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3 py-2 text-sm font-bold text-navy-700 dark:text-white bg-white dark:bg-navy-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">Partos</label>
                    <input type="number" min={0} value={form.partos}
                      onChange={e => setForm(p => ({ ...p, partos: Number(e.target.value) }))}
                      className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3 py-2 text-sm font-bold text-navy-700 dark:text-white bg-white dark:bg-navy-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">Cesáreas</label>
                    <input type="number" min={0} value={form.cesareas}
                      onChange={e => setForm(p => ({ ...p, cesareas: Number(e.target.value) }))}
                      className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3 py-2 text-sm font-bold text-navy-700 dark:text-white bg-white dark:bg-navy-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">Abortos</label>
                    <input type="number" min={0} value={form.abortos}
                      onChange={e => setForm(p => ({ ...p, abortos: Number(e.target.value) }))}
                      className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3 py-2 text-sm font-bold text-navy-700 dark:text-white bg-white dark:bg-navy-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">Hijos Vivos</label>
                    <input type="number" min={0} value={form.hijos_vivos}
                      onChange={e => setForm(p => ({ ...p, hijos_vivos: Number(e.target.value) }))}
                      className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3 py-2 text-sm font-bold text-navy-700 dark:text-white bg-white dark:bg-navy-700" />
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 4: ANTICONCEPCIÓN Y TERAPIA HORMONAL (ACCESIBLE PARA TODAS LAS PACIENTES) */}
            <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 sm:p-7 border border-gray-100 dark:border-navy-700 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-navy-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold">
                    <MdMedication size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-700 dark:text-white text-sm">Anticoncepción y Terapia Hormonal</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uso actual para control de fertilidad, regulación del ciclo menstrual o tratamiento de SOP</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 dark:bg-navy-700 p-4 rounded-xl border border-gray-200 dark:border-navy-600">
                <div>
                  <span className="text-xs font-bold text-navy-700 dark:text-white block">
                    ¿La paciente utiliza anticonceptivos o terapia hormonal actualmente?
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                    En pacientes con SOP, los anticonceptivos se usan frecuentemente como tratamiento para inducir la ciclicidad o frenar el acné/hirsutismo, aún sin inicio de vida sexual.
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
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      form.usa_anticonceptivos
                        ? "bg-teal-600 text-white shadow-md"
                        : "bg-white text-navy-700 border border-gray-200 hover:bg-gray-100 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600"
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
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      !form.usa_anticonceptivos
                        ? "bg-navy-700 text-white shadow-md dark:bg-navy-600"
                        : "bg-white text-navy-700 border border-gray-200 hover:bg-gray-100 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600"
                    }`}
                  >
                    <MdClose size={16} /> No (Sin Uso)
                  </button>
                </div>
              </div>

              {form.usa_anticonceptivos && (
                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-800/40 space-y-4 animate-fade-in-up">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">
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
                        className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-700 dark:text-white bg-white dark:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {OPCIONES_ANTICONCEPTIVOS.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-navy-700 dark:text-white mb-1">
                        Detalle / Principio Activo / Marca
                      </label>
                      <input
                        type="text"
                        value={form.tipo_anticonceptivo}
                        onChange={e => setForm(p => ({ ...p, tipo_anticonceptivo: e.target.value }))}
                        placeholder="Ej: Diane 35, Yaz, Levonorgestrel 52mg, Acetato de ciproterona..."
                        className="w-full border border-gray-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-700 dark:text-white bg-white dark:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: FACTORES DE RIESGO Y COMORBILIDADES */}
            <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 sm:p-7 border border-gray-100 dark:border-navy-700 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-navy-700 pb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold">
                  <MdShield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-navy-700 dark:text-white text-sm">Factores de Riesgo SOP y Endocrinopatías</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Antecedentes personales, metabólicos y hormonales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 cursor-pointer">
                  <span className="text-xs font-bold text-navy-700 dark:text-white">Familiar con SOP</span>
                  <input type="checkbox" checked={form.familiar_con_sop} onChange={e => setForm(p => ({ ...p, familiar_con_sop: e.target.checked }))} className="w-5 h-5 text-brand-500 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 cursor-pointer">
                  <span className="text-xs font-bold text-navy-700 dark:text-white">Familiar con Diabetes</span>
                  <input type="checkbox" checked={form.familiar_con_diabetes} onChange={e => setForm(p => ({ ...p, familiar_con_diabetes: e.target.checked }))} className="w-5 h-5 text-brand-500 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 cursor-pointer">
                  <span className="text-xs font-bold text-navy-700 dark:text-white">Diabetes Personal</span>
                  <input type="checkbox" checked={form.diabetes} onChange={e => setForm(p => ({ ...p, diabetes: e.target.checked }))} className="w-5 h-5 text-brand-500 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 cursor-pointer">
                  <span className="text-xs font-bold text-navy-700 dark:text-white">Hipotiroidismo</span>
                  <input type="checkbox" checked={form.hipotiroidismo} onChange={e => setForm(p => ({ ...p, hipotiroidismo: e.target.checked }))} className="w-5 h-5 text-brand-500 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 cursor-pointer">
                  <span className="text-xs font-bold text-navy-700 dark:text-white">Hiperprolactinemia</span>
                  <input type="checkbox" checked={form.hiperprolactinemia} onChange={e => setForm(p => ({ ...p, hiperprolactinemia: e.target.checked }))} className="w-5 h-5 text-brand-500 rounded" />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 cursor-pointer">
                  <span className="text-xs font-bold text-navy-700 dark:text-white">Resistencia a la Insulina</span>
                  <input type="checkbox" checked={form.resistencia_insulina} onChange={e => setForm(p => ({ ...p, resistencia_insulina: e.target.checked }))} className="w-5 h-5 text-brand-500 rounded" />
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: OBSERVACIONES */}
            <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 sm:p-7 border border-gray-100 dark:border-navy-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-navy-700 pb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-navy-700 flex items-center justify-center text-navy-700 dark:text-white font-bold">
                  <MdOutlineAssignment size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-navy-700 dark:text-white text-sm">Observaciones y Notas Clínicas</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Anotaciones médicas del profesional</p>
                </div>
              </div>

              <textarea rows={4} value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Escriba notas sobre los antecedentes clínicos..." className="w-full border border-gray-200 dark:border-navy-600 rounded-xl p-4 text-xs font-medium text-navy-700 dark:text-white bg-white dark:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            {/* BOTÓN GUARDAR ANTECEDENTES */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900 shadow-lg hover:shadow-xl transition disabled:opacity-50"
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

      {/* ── MODAL DE SEGURIDAD CLÍNICA: REVERSIÓN DE SEXARCA ── */}
      {modalSexarcaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-navy-800 p-6 shadow-2xl border border-rose-200 dark:border-rose-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center font-bold">
                <MdWarning size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-navy-700 dark:text-white">Dato Biológico Irreversible</h3>
                <p className="text-xs text-rose-600 font-semibold">Advertencia de Seguridad Clínica</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              La paciente ya tiene registrado el <strong>inicio de vida sexual (Sexarca Activa)</strong> en su expediente clínico. Biológicamente, la sexarca es una condición que no puede revertirse a "No".
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
              ⚠️ Si cambia a <strong>"No"</strong>, se reiniciarán a cero todos los antecedentes obstétricos asociados (gestas, partos, cesáreas y abortos).
            </div>

            <p className="text-xs text-navy-700 dark:text-white font-bold">
              ¿Desea continuar únicamente para corregir una equivocación inicial de registro?
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalSexarcaAbierto(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:hover:bg-navy-600 transition"
              >
                Cancelar (Mantener Sexarca)
              </button>
              <button
                type="button"
                onClick={confirmarReversionSexarca}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition"
              >
                Sí, Corregir Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE SEGURIDAD CLÍNICA: DESBLOQUEO DE EDAD DE MENARQUÍA ── */}
      {modalMenarquiaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-navy-800 p-6 shadow-2xl border border-purple-200 dark:border-purple-800 space-y-4">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-300">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center font-bold">
                <MdLock size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-navy-700 dark:text-white">Dato Histórico Fijo</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Edad de Primera Menstruación</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              La <strong>Edad de Menarquía ({menarquiaPrevia} años)</strong> es un antecedente biológico fijo que no cambia con el transcurso del tiempo ni con terapias.
            </p>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-300 font-medium">
              🔒 El campo se encuentra bloqueado para prevenir modificaciones accidentales.
            </div>

            <p className="text-xs text-navy-700 dark:text-white font-bold">
              ¿Desea desbloquear la casilla para corregir una equivocación de tipeo?
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMenarquiaAbierto(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:hover:bg-navy-600 transition"
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
