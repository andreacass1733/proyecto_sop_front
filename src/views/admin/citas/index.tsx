import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "components/card";
import {
  MdCalendarMonth,
  MdAdd,
  MdPerson,
  MdCheckCircle,
  MdPendingActions,
  MdCancel,
  MdSearch,
  MdFilterList,
  MdRefresh,
} from "react-icons/md";
import {
  CitaOut,
  PacienteListItem,
  listarCitas,
  crearCita,
  actualizarCita,
  crearConsulta,
  listarPacientes,
} from "services/api";

const CitasView: React.FC = () => {
  const navigate = useNavigate();
  const [citas, setCitas] = useState<CitaOut[]>([]);
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getFechaHoraActualLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Formulario nueva cita
  const [pacienteId, setPacienteId] = useState("");
  const [fechaAtencion, setFechaAtencion] = useState(getFechaHoraActualLocal());
  const [fechaProximaCita, setFechaProximaCita] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const abrirModalNuevaCita = () => {
    setFechaAtencion(getFechaHoraActualLocal());
    setMostrarModal(true);
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listacitas, listapacientes] = await Promise.all([
        listarCitas(),
        listarPacientes(),
      ]);
      setCitas(listacitas);
      setPacientes(listapacientes);
    } catch (err) {
      console.error("Error al cargar citas:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearCita = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await crearCita({
        paciente_id: pacienteId || undefined,
        fecha_atencion: fechaAtencion ? new Date(fechaAtencion).toISOString() : undefined,
        fecha_proxima_cita: fechaProximaCita || undefined,
        motivo,
        observaciones,
        estado: "programada",
      });
      setMostrarModal(false);
      setPacienteId("");
      setMotivo("");
      setObservaciones("");
      setFechaAtencion(getFechaHoraActualLocal());
      setFechaProximaCita("");
      showToast("Cita médica agendada con éxito", "success");
      await cargarDatos();
    } catch (err) {
      showToast("Error al agendar la cita médica", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarCita(id, { estado: nuevoEstado });
      showToast("Estado actualizado correctamente", "success");
      await cargarDatos();
    } catch (err) {
      showToast("Error al actualizar estado", "error");
    }
  };

  const getNombrePaciente = (id?: string | null) => {
    if (!id) return "Paciente no asignado";
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.primer_apellido}` : "Paciente registrado";
  };

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "programada":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <MdPendingActions className="h-4 w-4" /> Programada
          </span>
        );
      case "en_proceso":
      case "en_atencion":
      case "en_consulta":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <MdPendingActions className="h-4 w-4" /> En Atención
          </span>
        );
      case "atendida":
      case "completada":
      case "finalizada":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <MdCheckCircle className="h-4 w-4" /> Atendida
          </span>
        );
      case "cancelada":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            <MdCancel className="h-4 w-4" /> Cancelada
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-navy-700 dark:text-gray-300">
            {estado}
          </span>
        );
    }
  };

  const handleIniciarConsulta = async (c: CitaOut) => {
    try {
      // 1. Crear o recuperar consulta médica para esta cita
      await crearConsulta({
        cita_id: c.id,
        paciente_id: c.paciente_id || undefined,
        motivo: c.motivo || "Atención desde cita médica agendada",
        observaciones: c.observaciones || undefined,
        estado: "en_proceso",
      });
      // 2. Marcar la cita como "en_proceso" (En atención activa)
      await actualizarCita(c.id, { estado: "en_proceso" });
      await cargarDatos();
      // 3. Redirigir al panel de Consultas
      showToast("Consulta iniciada correctamente", "success");
      navigate("/admin/consultas");
    } catch (err) {
      console.error("Error al iniciar consulta:", err);
      showToast("Error al iniciar la consulta médica a partir de esta cita.", "error");
    }
  };

  // Filtrado dinámico
  const citasFiltradas = citas.filter((c) => {
    const pacienteNombre = getNombrePaciente(c.paciente_id).toLowerCase();
    const motivoText = (c.motivo || "").toLowerCase();
    const obsText = (c.observaciones || "").toLowerCase();
    const q = busqueda.toLowerCase().trim();

    const coincideBusqueda =
      !q ||
      pacienteNombre.includes(q) ||
      motivoText.includes(q) ||
      obsText.includes(q);

    const coincideEstado =
      filtroEstado === "todos" || c.estado === filtroEstado;

    const coincideFecha =
      !filtroFecha ||
      (c.fecha_atencion && c.fecha_atencion.startsWith(filtroFecha));

    return coincideBusqueda && coincideEstado && coincideFecha;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("todos");
    setFiltroFecha("");
  };

  return (
    <div className="mt-3 flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
            Gestión de Citas Médicas
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Programación y control de citas para pacientes con seguimiento de SOP
          </p>
        </div>
        <button
          onClick={abrirModalNuevaCita}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900 dark:hover:bg-brand-300"
        >
          <MdAdd className="h-5 w-5" /> Agendar Nueva Cita
        </button>
      </div>

      {/* Grid de Citas con Filtros */}
      <Card extra="p-5 w-full h-full">
        {/* Barra de Filtros */}
        <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-4 dark:border-navy-700 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Buscador general */}
            <div className="relative flex-1">
              <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, motivo u observaciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white dark:focus:border-brand-400"
              />
            </div>

            {/* Filtro por Estado */}
            <div className="flex items-center gap-2">
              <MdFilterList className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              >
                <option value="todos">Todos los Estados</option>
                <option value="programada">Programadas</option>
                <option value="atendida">Atendidas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>

            {/* Filtro por Fecha */}
            <div>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
            </div>
          </div>

          {/* Botón Reset */}
          {(busqueda || filtroEstado !== "todos" || filtroFecha) && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-1 self-start rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300 dark:hover:bg-navy-600 lg:self-center"
            >
              <MdRefresh className="h-4 w-4" /> Limpiar Filtros
            </button>
          )}
        </div>

        {cargando ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            Cargando lista de citas...
          </div>
        ) : citasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <MdCalendarMonth className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-lg font-medium text-gray-700 dark:text-gray-300">
              {citas.length === 0
                ? "No hay citas programadas actualmente"
                : "No se encontraron citas con los filtros aplicados"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {citas.length === 0
                ? 'Haz clic en "Agendar Nueva Cita" para programar una atención.'
                : "Intenta modificar o borrar la búsqueda realizada."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-navy-700 dark:text-gray-400">
                <tr>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Fecha Atención</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Próxima Cita de Control</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                {citasFiltradas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-navy-700/50">
                    <td className="py-4 px-4 font-medium text-navy-700 dark:text-white">
                      <div className="flex items-center gap-2">
                        <MdPerson className="h-5 w-5 text-brand-500" />
                        {getNombrePaciente(c.paciente_id)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {c.fecha_atencion
                        ? new Date(c.fecha_atencion).toLocaleString()
                        : "Fecha no especificada"}
                    </td>
                    <td className="py-4 px-4">{c.motivo || "Consulta general"}</td>
                    <td className="py-4 px-4">
                      {c.fecha_proxima_cita
                        ? new Date(c.fecha_proxima_cita).toLocaleDateString()
                        : "Sin agendar"}
                    </td>
                    <td className="py-4 px-4">{renderBadgeEstado(c.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Nueva Cita */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl lg:max-w-3xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl dark:bg-navy-800 border border-gray-100 dark:border-navy-700">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-navy-700">
              <h3 className="text-xl font-bold text-navy-700 dark:text-white">
                Agendar Cita Médica
              </h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCita} className="mt-5 flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Seleccionar Paciente
                  </label>
                  <select
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  >
                    <option value="">-- Sin paciente asignado --</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.primer_apellido} ({p.ci || "Sin CI"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Fecha y Hora de Atención
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaAtencion}
                    onChange={(e) => setFechaAtencion(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Motivo de la Cita
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Evaluación ecográfica de control SOP"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Fecha Próxima Cita (Opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaProximaCita}
                    onChange={(e) => setFechaProximaCita(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Observaciones
                </label>
                <textarea
                  rows={4}
                  placeholder="Notas preliminares para la cita..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900"
                >
                  {guardando ? "Guardando Cita..." : "Guardar Cita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl p-4 text-sm font-medium text-white shadow-lg transition-all duration-300 ${
            toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default CitasView;
