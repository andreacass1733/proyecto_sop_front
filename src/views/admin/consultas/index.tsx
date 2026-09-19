import React, { useState, useEffect } from "react";
import Card from "components/card";
import {
  MdMedicalServices,
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
  ConsultaOut,
  PacienteListItem,
  listarConsultas,
  crearConsulta,
  actualizarConsulta,
  listarPacientes,
} from "services/api";

const ConsultasView: React.FC = () => {
  const [consultas, setConsultas] = useState<ConsultaOut[]>([]);
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

  // Formulario nueva consulta
  const [pacienteId, setPacienteId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaProximaCita, setFechaProximaCita] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listaconsultas, listapacientes] = await Promise.all([
        listarConsultas(),
        listarPacientes(),
      ]);
      setConsultas(listaconsultas);
      setPacientes(listapacientes);
    } catch (err) {
      console.error("Error al cargar consultas:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await crearConsulta({
        paciente_id: pacienteId || undefined,
        motivo,
        observaciones,
        estado: "en_proceso",
        fecha_proxima_cita: fechaProximaCita || undefined,
      });
      setMostrarModal(false);
      setPacienteId("");
      setMotivo("");
      setObservaciones("");
      setFechaProximaCita("");
      showToast("Consulta médica iniciada con éxito", "success");
      await cargarDatos();
    } catch (err) {
      showToast("Error al iniciar la consulta médica", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarConsulta(id, { estado: nuevoEstado });
      showToast("Estado de la consulta actualizado", "success");
      await cargarDatos();
    } catch (err) {
      showToast("Error al actualizar estado de la consulta", "error");
    }
  };

  const getNombrePaciente = (id?: string | null) => {
    if (!id) return "Paciente no asignado";
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.primer_apellido}` : "Paciente registrado";
  };

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "en_proceso":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <MdPendingActions className="h-4 w-4" /> En Proceso
          </span>
        );
      case "completada":
      case "finalizada":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <MdCheckCircle className="h-4 w-4" /> Completada
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

  // Filtrado dinámico
  const consultasFiltradas = consultas.filter((c) => {
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
      (c.created_at && c.created_at.startsWith(filtroFecha));

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
            Consultas Médicas Registradas
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Registro clínico de atenciones y evaluaciones para el diagnóstico de SOP
          </p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900 dark:hover:bg-brand-300"
        >
          <MdAdd className="h-5 w-5" /> Nueva Consulta Médica
        </button>
      </div>

      {/* Grid de Consultas con Filtros */}
      <Card extra="p-5 w-full h-full">
        {/* Barra de Filtros */}
        <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-4 dark:border-navy-700 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Buscador general */}
            <div className="relative flex-1">
              <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, motivo o detalle clínico..."
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
                <option value="en_proceso">En Proceso</option>
                <option value="completada">Completadas</option>
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
            Cargando historial de consultas...
          </div>
        ) : consultasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <MdMedicalServices className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-lg font-medium text-gray-700 dark:text-gray-300">
              {consultas.length === 0
                ? "No hay consultas médicas registradas"
                : "No se encontraron consultas con los filtros aplicados"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {consultas.length === 0
                ? 'Presiona en "Nueva Consulta Médica" para iniciar la atención clínica.'
                : "Intenta cambiar la búsqueda o borrar los filtros."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-navy-700 dark:text-gray-400">
                <tr>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Fecha Creación</th>
                  <th className="py-3 px-4">Motivo / Tipo</th>
                  <th className="py-3 px-4">Observaciones</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                {consultasFiltradas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-navy-700/50">
                    <td className="py-4 px-4 font-medium text-navy-700 dark:text-white">
                      <div className="flex items-center gap-2">
                        <MdPerson className="h-5 w-5 text-brand-500" />
                        {getNombrePaciente(c.paciente_id)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="py-4 px-4">{c.motivo || "Atención General"}</td>
                    <td className="py-4 px-4">{c.observaciones || "Sin observaciones"}</td>
                    <td className="py-4 px-4">{renderBadgeEstado(c.estado)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {c.estado === "en_proceso" && (
                          <button
                            onClick={() => handleCambiarEstado(c.id, "completada")}
                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 dark:bg-emerald-400 dark:text-navy-900"
                          >
                            Finalizar Consulta
                          </button>
                        )}
                        {c.estado !== "cancelada" && (
                          <button
                            onClick={() => handleCambiarEstado(c.id, "cancelada")}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Nueva Consulta */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl lg:max-w-3xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl dark:bg-navy-800 border border-gray-100 dark:border-navy-700">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-navy-700">
              <h3 className="text-xl font-bold text-navy-700 dark:text-white">
                Nueva Consulta Médica
              </h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCrearConsulta} className="mt-5 flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Seleccionar Paciente *
                  </label>
                  <select
                    required
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  >
                    <option value="">-- Seleccionar Paciente --</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.primer_apellido} ({p.ci || "Sin CI"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Agendar Próxima Cita (Opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaProximaCita}
                    onChange={(e) => setFechaProximaCita(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Se registrará automáticamente en la Agenda de Citas.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Motivo de la Consulta
                </label>
                <input
                  type="text"
                  placeholder="Ej: Evaluación clínica por irregularidad menstrual y sospecha de SOP"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Observaciones Clínicas / Diagnóstico Preliminar
                </label>
                <textarea
                  rows={4}
                  placeholder="Detalles del síntoma, examen físico o indicación de laboratorio..."
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
                  {guardando ? "Creando Consulta..." : "Guardar Consulta"}
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

export default ConsultasView;
