import React, { useState, useEffect, useCallback } from "react";
import {
  MdHistory,
  MdAdd,
  MdDelete,
  MdSave,
  MdClose,
  MdPrint,
  MdCheckCircle,
  MdSearch,
  MdEventNote,
  MdPerson,
  MdMedicalServices,
} from "react-icons/md";
import {
  PacienteListItem,
  obtenerAntecedentes,
  guardarAntecedentes,
  listarPacientes,
} from "services/api";

interface HistorialClinicoTabProps {
  paciente: PacienteListItem | null;
  onNavigateToTab?: (tab: string) => void;
  onSelectPaciente?: (p: PacienteListItem) => void;
}

interface NotaEvolucion {
  id: string;
  fecha: string;
  tipo_evento: string;
  medico: string;
  detalle: string;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function HistorialClinicoTab({ paciente, onSelectPaciente }: HistorialClinicoTabProps) {
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState<NotaEvolucion[]>([]);
  const [antecedentesCompletos, setAntecedentesCompletos] = useState<any>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  // Selector de pacientes
  const [listaPacientes, setListaPacientes] = useState<PacienteListItem[]>([]);
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState(false);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");

  useEffect(() => {
    listarPacientes("", null, 1, 100)
      .then((data) => setListaPacientes(data))
      .catch((err) => console.error("Error al cargar pacientes para historial:", err));
  }, []);

  // Modal para registrar nueva nota de evolución
  const [modalNuevaNota, setModalNuevaNota] = useState(false);
  const [nuevaNota, setNuevaNota] = useState({
    tipo_evento: "Consulta Médica de Control",
    fecha: formatLocalDate(new Date()),
    medico: "Dr. Rodrigo Espinoza",
    detalle: "",
  });

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarHistorial = useCallback(async () => {
    if (!paciente?.id) return;
    setLoading(true);
    try {
      const data = await obtenerAntecedentes(paciente.id);
      setAntecedentesCompletos(data);

      let lista: NotaEvolucion[] = [];
      if (data.historial && Array.isArray(data.historial)) {
        lista = data.historial.filter(
          (h: any) => h && typeof h === "object" && !h.__iniciada_vida_sexual__ && h.detalle
        );
      }

      // Solo notas reales registradas en la base de datos
      setHistorial(lista);
    } catch {
      // Si la paciente no tiene antecedentes o notas aún, lista vacía real
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  }, [paciente?.id]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  // Persistir en backend (tabla antecedentes_medicos -> columna historial JSONB)
  const persistirHistorial = async (nuevoHistorial: NotaEvolucion[]) => {
    if (!paciente?.id) return;
    try {
      const metaSexarca = antecedentesCompletos?.historial?.find(
        (h: any) => h && h.__iniciada_vida_sexual__ !== undefined
      ) || { __iniciada_vida_sexual__: antecedentesCompletos?.iniciada_vida_sexual || false };

      const payload: any = {
        iniciada_vida_sexual: antecedentesCompletos?.iniciada_vida_sexual || false,
        edad_menarquia: antecedentesCompletos?.edad_menarquia ?? null,
        tipo_ciclo: antecedentesCompletos?.tipo_ciclo || "regular",
        duracion_ciclo_habitual: antecedentesCompletos?.duracion_ciclo_habitual ?? 28,
        gestas: antecedentesCompletos?.gestas ?? 0,
        partos: antecedentesCompletos?.partos ?? 0,
        cesareas: antecedentesCompletos?.cesareas ?? 0,
        abortos: antecedentesCompletos?.abortos ?? 0,
        hijos_vivos: antecedentesCompletos?.hijos_vivos ?? 0,
        usa_anticonceptivos: antecedentesCompletos?.usa_anticonceptivos ?? false,
        tipo_anticonceptivo: antecedentesCompletos?.tipo_anticonceptivo ?? null,
        familiar_con_sop: antecedentesCompletos?.familiar_con_sop ?? false,
        familiar_con_diabetes: antecedentesCompletos?.familiar_con_diabetes ?? false,
        diabetes: antecedentesCompletos?.diabetes ?? false,
        hipotiroidismo: antecedentesCompletos?.hipotiroidismo ?? false,
        hiperprolactinemia: antecedentesCompletos?.hiperprolactinemia ?? false,
        resistencia_insulina: antecedentesCompletos?.resistencia_insulina ?? false,
        alergias: antecedentesCompletos?.alergias || "Ninguna conocida",
        observaciones: antecedentesCompletos?.observaciones || null,
        historial: [...nuevoHistorial, metaSexarca],
      };

      await guardarAntecedentes(paciente.id, payload);
    } catch (err) {
      console.warn("Aviso al sincronizar historial con base de datos:", err);
    }
  };

  const handleAgregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNota.detalle.trim()) {
      alert("Por favor ingrese la descripción o hallazgos clínicos de la nota.");
      return;
    }

    const nueva: NotaEvolucion = {
      id: `h-${Date.now()}`,
      fecha: `${nuevaNota.fecha}T${new Date().toTimeString().split(" ")[0]}Z`,
      tipo_evento: nuevaNota.tipo_evento,
      medico: nuevaNota.medico,
      detalle: nuevaNota.detalle.trim(),
    };

    const actualizados = [nueva, ...historial];
    setHistorial(actualizados);
    setModalNuevaNota(false);
    setNuevaNota({
      tipo_evento: "Consulta Médica de Control",
      fecha: formatLocalDate(new Date()),
      medico: "Dr. Rodrigo Espinoza",
      detalle: "",
    });

    await persistirHistorial(actualizados);
    showToast("Nota de evolución clínica registrada con éxito", "ok");
  };

  const handleEliminarNota = async (idNota: string) => {
    if (window.confirm("¿Desea retirar esta nota de evolución del historial clínico?")) {
      const filtrados = historial.filter((n) => n.id !== idNota);
      setHistorial(filtrados);
      await persistirHistorial(filtrados);
      showToast("Nota retirada del historial", "ok");
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  // Filtrado de notas
  const notasFiltradas = historial.filter((n) => {
    const matchBusqueda =
      n.detalle.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.tipo_evento.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.medico.toLowerCase().includes(busqueda.toLowerCase());

    const matchTipo =
      filtroTipo === "todos" ? true : n.tipo_evento.toLowerCase().includes(filtroTipo.toLowerCase());

    return matchBusqueda && matchTipo;
  });

  const nombrePaciente = paciente
    ? `${paciente.nombre} ${paciente.primer_apellido} ${paciente.segundo_apellido || ""}`
    : "Paciente en Consulta";
  const ciPaciente = paciente?.ci || "—";
  const iniciales = paciente
    ? `${paciente.nombre.charAt(0)}${paciente.primer_apellido.charAt(0)}`
    : "HC";
  const edad = paciente?.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : null;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
            toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <MdCheckCircle size={20} />
          {toast.msg}
        </div>
      )}

      {/* ── ENCABEZADO MÉDICO UNIFICADO (HISTORIAL CLÍNICO) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Historial Clínico y Evolución
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Expediente: <strong className="text-slate-800">CI {ciPaciente}</strong>
              </span>
              {edad && (
                <span className="text-xs text-slate-500 font-medium">
                  • Edad: <strong className="text-slate-800">{edad}</strong>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {nombrePaciente}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownPacienteAbierto(!dropdownPacienteAbierto)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200 shadow-sm"
            >
              <MdPerson size={16} />
              <span>{paciente ? "Cambiar Paciente" : "Seleccionar Paciente"}</span>
            </button>

            {dropdownPacienteAbierto && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-fade-in-up">
                <div className="relative mb-1">
                  <MdSearch className="absolute left-2.5 top-2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar paciente por nombre o CI..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-purple-500 text-slate-800"
                    autoFocus
                  />
                </div>

                {listaPacientes
                  .filter((p) => {
                    const q = busquedaPaciente.toLowerCase();
                    return (
                      p.nombre.toLowerCase().includes(q) ||
                      p.primer_apellido.toLowerCase().includes(q) ||
                      (p.ci && p.ci.toLowerCase().includes(q))
                    );
                  })
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (onSelectPaciente) onSelectPaciente(p);
                        setDropdownPacienteAbierto(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                        paciente?.id === p.id
                          ? "bg-purple-50 text-purple-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{`${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">CI: {p.ci || "—"}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleImprimir}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm"
          >
            <MdPrint size={16} />
            <span>Imprimir Historial</span>
          </button>

          <button
            type="button"
            onClick={() => setModalNuevaNota(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-600/20"
          >
            <MdAdd size={16} />
            <span>+ Registrar Evolución</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS DEL HISTORIAL ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar en evolución clínica..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition shadow-sm"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm cursor-pointer"
          >
            <option value="todos">Todos los eventos ({historial.length})</option>
            <option value="Control">Consultas de Control</option>
            <option value="Rotterdam">Diagnósticos Rotterdam</option>
            <option value="Prescripción">Ajustes Terapéuticos</option>
            <option value="Laboratorio">Laboratorios Hormonales</option>
            <option value="Ecografía">Ecografía Ovárica</option>
          </select>
        </div>

        <div className="text-[11px] font-bold text-slate-500">
          Mostrando <strong className="text-slate-800">{notasFiltradas.length}</strong> de{" "}
          <strong className="text-slate-800">{historial.length}</strong> registros
        </div>
      </div>

      {/* ── TIMELINE MÉDICO VISUAL DE EVOLUCIÓN CLÍNICA ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MdEventNote className="text-purple-600" size={20} />
            <h3 className="font-black text-slate-900 text-sm">
              Línea Cronológica de Evolución Médica
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Auditoría Clínica JSONB
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Cargando historial clínico de la paciente...
          </div>
        ) : notasFiltradas.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs text-slate-500 font-bold">
              {historial.length === 0
                ? "Sin notas de evolución registradas aún para esta paciente."
                : "No se encontraron notas clínicas con los filtros aplicados."}
            </p>
            {historial.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Presione en "+ Registrar Evolución" para añadir la primera nota clínica oficial al expediente.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroTipo("todos");
                }}
                className="text-xs text-purple-600 font-black hover:underline"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {notasFiltradas.map((nota, idx) => {
              const fechaStr = nota.fecha
                ? new Date(nota.fecha).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "Fecha no especificada";

              return (
                <div key={nota.id || idx} className="relative group">
                  {/* Punto del timeline */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full bg-white border-4 border-purple-600 shadow-sm transition-transform group-hover:scale-125" />

                  {/* Tarjeta de la nota de evolución */}
                  <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 transition shadow-sm group-hover:shadow-md space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                          {nota.tipo_evento}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          📅 {fechaStr}
                        </span>
                        {nota.medico && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            <MdMedicalServices size={12} className="text-purple-600" />
                            {nota.medico}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        title="Retirar nota del historial"
                        onClick={() => handleEliminarNota(nota.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition self-end sm:self-auto"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {nota.detalle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: REGISTRAR NUEVA NOTA DE EVOLUCIÓN ── */}
      {modalNuevaNota && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-purple-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <MdHistory size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Nueva Nota de Evolución Clínica
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {nombrePaciente} • CI: {ciPaciente}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevaNota(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleAgregarNota} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Evento Clínico *
                  </label>
                  <select
                    value={nuevaNota.tipo_evento}
                    onChange={(e) =>
                      setNuevaNota({ ...nuevaNota, tipo_evento: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="Consulta Médica de Control">Consulta Médica de Control</option>
                    <option value="Evaluación Diagnóstica Rotterdam">
                      Evaluación Diagnóstica Rotterdam
                    </option>
                    <option value="Ajuste de Prescripción Terapéutica">
                      Ajuste de Prescripción Terapéutica
                    </option>
                    <option value="Revisión de Laboratorio Hormonal">
                      Revisión de Laboratorio Hormonal
                    </option>
                    <option value="Control Ecográfico Ovárico">Control Ecográfico Ovárico</option>
                    <option value="Nota de Evolución General">Nota de Evolución General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevaNota.fecha}
                    onChange={(e) => setNuevaNota({ ...nuevaNota, fecha: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Especialista / Médico Responsable
                </label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={nuevaNota.medico}
                    onChange={(e) => setNuevaNota({ ...nuevaNota, medico: e.target.value })}
                    placeholder="Ej: Dr. Rodrigo Espinoza"
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Descripción / Hallazgos Clínicos *
                </label>
                <textarea
                  rows={4}
                  required
                  value={nuevaNota.detalle}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, detalle: e.target.value })}
                  placeholder="Detalle la evolución de la paciente, respuesta a la medicación, variaciones del ciclo menstrual o síntomas..."
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm font-medium text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaNota(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <MdSave size={18} />
                  <span>Guardar Nota en Historial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
