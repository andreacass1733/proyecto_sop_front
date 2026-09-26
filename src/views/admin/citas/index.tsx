import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "components/card";
import {
  MdChevronLeft,
  MdChevronRight,
  MdAdd,
  MdCheckCircle,
  MdInfoOutline,
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

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];



const CitasView: React.FC = () => {
  const navigate = useNavigate();
  const [citas, setCitas] = useState<CitaOut[]>([]);
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [, setCargando] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Calendario state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Panel state
  const [citaExpandidaId, setCitaExpandidaId] = useState<string | null>(null);

  // Modal nueva cita state
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [modalFecha, setModalFecha] = useState("");
  const [modalTurno, setModalTurno] = useState<"AM" | "PM">("AM");
  const [modalHora, setModalHora] = useState("07");
  const [modalMinuto, setModalMinuto] = useState("00");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const getTodayFormatted = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split("T")[0];
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

  const abrirModalNuevaCita = (fechaPredefinida?: Date) => {
    if (fechaPredefinida && isPastDate(fechaPredefinida)) {
      showToast("No se pueden agendar citas en fechas pasadas.", "error");
      return;
    }

    const baseDate = fechaPredefinida || new Date();
    const localDateStr = new Date(baseDate.getTime() - baseDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    
    setModalFecha(localDateStr);

    const currentHour = new Date().getHours();
    if (currentHour >= 12 && currentHour <= 19) {
      setModalTurno("PM");
      const h12 = currentHour === 12 ? "12" : (currentHour - 12).toString().padStart(2, "0");
      setModalHora(h12);
    } else {
      setModalTurno("AM");
      const hClamped = currentHour < 7 ? "07" : currentHour.toString().padStart(2, "0");
      setModalHora(hClamped);
    }
    setModalMinuto("00");

    setMostrarModal(true);
  };

  const handleCrearCita = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modalFecha) {
      showToast("Selecciona una fecha válida.", "error");
      return;
    }

    // Calcular hora en formato 24h
    let hora24 = `${modalHora}:${modalMinuto}`;
    if (modalTurno === "PM") {
      if (modalHora === "12") {
        hora24 = `12:${modalMinuto}`;
      } else {
        const numH = parseInt(modalHora, 10) + 12;
        hora24 = `${numH.toString().padStart(2, "0")}:${modalMinuto}`;
      }
    }

    const fechaHoraLocal = new Date(`${modalFecha}T${hora24}:00`);

    if (fechaHoraLocal.getTime() < Date.now() - 60000) {
      showToast("No puedes agendar citas en fechas u horas pasadas.", "error");
      return;
    }

    if (new Date(modalFecha + "T12:00:00").getDay() === 0) {
      showToast("Los días domingos no están habilitados.", "error");
      return;
    }

    try {
      setGuardando(true);
      await crearCita({
        paciente_id: pacienteId || undefined,
        fecha_atencion: fechaHoraLocal.toISOString(),
        motivo,
        observaciones,
        estado: "programada",
      });
      setMostrarModal(false);
      setPacienteId("");
      setMotivo("");
      setObservaciones("");
      showToast("Cita médica agendada con éxito", "success");
      await cargarDatos();
    } catch (err) {
      showToast("Error al agendar la cita médica", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleIniciarConsulta = async (c: CitaOut) => {
    try {
      await crearConsulta({
        cita_id: c.id,
        paciente_id: c.paciente_id || undefined,
        motivo: c.motivo || "Atención desde cita médica agendada",
        observaciones: c.observaciones || undefined,
        estado: "en_proceso",
      });
      await actualizarCita(c.id, { estado: "en_proceso" });
      showToast("Consulta iniciada correctamente", "success");
      navigate("/admin/consultas");
    } catch (err) {
      console.error("Error al iniciar consulta:", err);
      showToast("Error al iniciar la consulta médica a partir de esta cita.", "error");
    }
  };

  const getNombrePaciente = (id?: string | null) => {
    if (!id) return "Paciente no asignado";
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.primer_apellido}` : "Paciente registrado";
  };

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "programada": return <span className="text-amber-600 bg-amber-100 px-2 py-0.5 rounded text-xs font-semibold">Programada</span>;
      case "en_proceso": return <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded text-xs font-semibold">En Atención</span>;
      case "atendida": return <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded text-xs font-semibold">Atendida</span>;
      case "cancelada": return <span className="text-rose-600 bg-rose-100 px-2 py-0.5 rounded text-xs font-semibold">Cancelada</span>;
      default: return <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold">{estado}</span>;
    }
  };

  // Filtrado general de citas
  const citasFiltradas = citas.filter((c) => {
    const pacienteNombre = getNombrePaciente(c.paciente_id).toLowerCase();
    const motivoText = (c.motivo || "").toLowerCase();
    const q = busqueda.toLowerCase().trim();

    const coincideBusqueda = !q || pacienteNombre.includes(q) || motivoText.includes(q);
    const coincideEstado = filtroEstado === "todos" || c.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  // Lógica del Calendario
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const startDate = new Date(monthStart);
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1));
  
  const endDate = new Date(monthEnd);
  const endDay = endDate.getDay();
  endDate.setDate(endDate.getDate() + (endDay === 0 ? 0 : 7 - endDay));

  const calendarDays = [];
  let day = new Date(startDate);
  while (day <= endDate) {
    if (day.getDay() !== 0) {
      calendarDays.push(new Date(day));
    }
    day.setDate(day.getDate() + 1);
  }

  const rows = calendarDays.length / 6;

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getCitasByDate = (date: Date) => {
    const target = date.toISOString().split("T")[0];
    return citasFiltradas.filter(c => c.fecha_atencion && c.fecha_atencion.startsWith(target));
  };

  const citasSeleccionadas = selectedDate ? getCitasByDate(selectedDate) : [];

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("todos");
  };

  return (
    <div className="mt-3 flex flex-col gap-4" style={{ height: "calc(100vh - 120px)" }}>
      {/* Barra de Búsqueda y Filtros */}
      <Card extra="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
          {/* Buscador */}
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente o motivo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
            />
          </div>

          {/* Filtro Estado */}
          <div className="flex items-center gap-2">
            <MdFilterList className="h-5 w-5 text-gray-500" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
            >
              <option value="todos">Todos los Estados</option>
              <option value="programada">Programadas</option>
              <option value="en_proceso">En Atención</option>
              <option value="atendida">Atendidas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          {(busqueda || filtroEstado !== "todos") && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300"
            >
              <MdRefresh className="h-4 w-4" /> Limpiar
            </button>
          )}
        </div>
      </Card>

      <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
        {/* Columna Izquierda: Calendario */}
        <Card extra="p-4 flex-1 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-navy-700 dark:text-white capitalize">
              {meses[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button onClick={goToday} className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition">
                Hoy
              </button>
              <button onClick={prevMonth} className="p-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition">
                <MdChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={nextMonth} className="p-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition">
                <MdChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div 
            className="flex-1 grid grid-cols-6 gap-1.5 mt-2 min-h-0" 
            style={{ gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))` }}
          >
            {/* Cabecera del Calendario */}
            {diasSemana.map(d => (
              <div key={d} className="font-bold text-center text-sm text-gray-500 py-1 h-fit">{d}</div>
            ))}
            
            {/* Días del Calendario */}
            {calendarDays.map((d, i) => {
              const isCurrentMonth = d.getMonth() === currentDate.getMonth();
              const isToday = d.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
              const isSelected = selectedDate && d.toISOString().split("T")[0] === selectedDate.toISOString().split("T")[0];
              const dayCitas = getCitasByDate(d);
              const pastDay = isPastDate(d);

              return (
                <div
                  key={i}
                  onClick={() => { setSelectedDate(d); setCitaExpandidaId(null); }}
                  className={`flex flex-col p-1.5 border border-gray-100 dark:border-navy-700 rounded-lg cursor-pointer transition-all overflow-hidden
                    ${!isCurrentMonth ? "bg-gray-50/50 dark:bg-navy-800/30 opacity-60" : "bg-white dark:bg-navy-800"}
                    ${isSelected ? "ring-2 ring-brand-500 shadow-md" : "hover:border-brand-300"}
                    ${pastDay && !isToday ? "opacity-75 bg-gray-50/30" : ""}
                  `}
                >
                  <div className="flex justify-between items-start mb-1 flex-shrink-0">
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-brand-500 text-white" : pastDay ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}`}>
                      {d.getDate()}
                    </span>
                    {dayCitas.length > 0 && (
                      <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-1.5 rounded-full">
                        {dayCitas.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
                    {dayCitas.map((c) => (
                      <div key={c.id} className="text-[10px] truncate bg-brand-50 dark:bg-navy-700 text-brand-700 dark:text-white px-1 py-0.5 rounded border-l-2 border-brand-500">
                        <span className="font-semibold">{new Date(c.fecha_atencion!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {getNombrePaciente(c.paciente_id).split(" ")[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Columna Derecha: Detalle del Día */}
        {selectedDate && (
          <Card extra="p-4 w-full xl:w-[400px] h-full flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2 dark:border-navy-700 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-navy-700 dark:text-white capitalize">
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {isPastDate(selectedDate) && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Fecha pasada (solo consulta de historial)
                  </span>
                )}
              </div>
              {!isPastDate(selectedDate) && (
                <button
                  onClick={() => abrirModalNuevaCita(selectedDate)}
                  className="p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
                  title="Agendar Cita en esta fecha"
                >
                  <MdAdd className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {citasSeleccionadas.length === 0 ? (
                <div className="text-center py-8 text-gray-500 m-auto">
                  <MdCheckCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p>No hay citas programadas.</p>
                </div>
              ) : (
                citasSeleccionadas.sort((a,b) => new Date(a.fecha_atencion!).getTime() - new Date(b.fecha_atencion!).getTime()).map(c => {
                  const isExpanded = citaExpandidaId === c.id;
                  return (
                    <div key={c.id} className="border border-gray-100 dark:border-navy-700 rounded-xl overflow-hidden bg-white dark:bg-navy-800 shadow-sm flex-shrink-0">
                      {/* Header de la Cita */}
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-700 flex justify-between items-center"
                        onClick={() => setCitaExpandidaId(isExpanded ? null : c.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-brand-500 text-xs w-12 text-center bg-brand-50 dark:bg-navy-900 rounded py-1 border border-brand-100 dark:border-navy-700">
                            {new Date(c.fecha_atencion!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div>
                            <p className="font-bold text-navy-700 dark:text-white text-sm">{getNombrePaciente(c.paciente_id)}</p>
                            <div className="mt-0.5">{renderBadgeEstado(c.estado)}</div>
                          </div>
                        </div>
                        <MdInfoOutline className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                      
                      {/* Detalles Expandidos */}
                      {isExpanded && (
                        <div className="p-3 bg-gray-50 dark:bg-navy-900 border-t border-gray-100 dark:border-navy-700 text-xs">
                          <p className="mb-1.5"><strong className="text-navy-700 dark:text-white">Motivo:</strong> {c.motivo || "No especificado"}</p>
                          <p className="mb-3 text-gray-600 dark:text-gray-300"><strong className="text-navy-700 dark:text-white">Observaciones:</strong> {c.observaciones || "Sin observaciones"}</p>
                          
                          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-navy-700">
                             {c.estado === "programada" && (
                               <button
                                 onClick={() => handleIniciarConsulta(c)}
                                 className="px-3 py-1.5 bg-brand-500 text-white rounded text-xs font-semibold hover:bg-brand-600 transition"
                               >
                                 Iniciar Consulta
                               </button>
                             )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Modal Nueva Cita */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 md:p-8 shadow-2xl dark:bg-navy-800 border border-gray-100 dark:border-navy-700">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-navy-700">
              <h3 className="text-xl font-bold text-navy-700 dark:text-white">
                Agendar Cita Médica
              </h3>
              <button onClick={() => setMostrarModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700">✕</button>
            </div>

            <form onSubmit={handleCrearCita} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Seleccionar Paciente *</label>
                <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-navy-700 outline-none dark:bg-navy-900 dark:border-navy-600 dark:text-white">
                  <option value="">-- Seleccionar Paciente --</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.primer_apellido}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Fecha y Turno (AM / PM Dividido) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Fecha de Atención *</label>
                  <input 
                    type="date" 
                    min={getTodayFormatted()}
                    value={modalFecha} 
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const d = new Date(newDate + "T12:00:00");
                      if (d.getDay() === 0) {
                        showToast("Los domingos no están habilitados.", "error");
                        return;
                      }
                      setModalFecha(newDate);
                    }} 
                    required 
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-navy-700 outline-none dark:bg-navy-900 dark:border-navy-600 dark:text-white" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Turno y Hora *</label>
                  
                  {/* Selector AM/PM + Hora + Minutos */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {/* Segmentado AM / PM */}
                    <div className="flex rounded-xl bg-gray-100 dark:bg-navy-900 p-1 border border-gray-200 dark:border-navy-600 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setModalTurno("AM");
                          setModalHora("07");
                        }}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                          modalTurno === "AM"
                            ? "bg-brand-500 text-white shadow"
                            : "text-gray-600 dark:text-gray-300 hover:text-navy-700"
                        }`}
                      >
                        A.M.
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTurno("PM");
                          setModalHora("12");
                        }}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                          modalTurno === "PM"
                            ? "bg-brand-500 text-white shadow"
                            : "text-gray-600 dark:text-gray-300 hover:text-navy-700"
                        }`}
                      >
                        P.M.
                      </button>
                    </div>

                    {/* Desplegable de Horas */}
                    <select 
                      value={modalHora}
                      onChange={(e) => {
                        setModalHora(e.target.value);
                        if (modalTurno === "PM" && e.target.value === "07") {
                          setModalMinuto("00");
                        }
                      }}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-navy-700 outline-none dark:bg-navy-900 dark:border-navy-600 dark:text-white font-medium"
                    >
                      {modalTurno === "AM" ? (
                        ["07", "08", "09", "10", "11"].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))
                      ) : (
                        ["12", "01", "02", "03", "04", "05", "06", "07"].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))
                      )}
                    </select>

                    <span className="font-bold text-gray-500">:</span>

                    {/* Desplegable de Minutos */}
                    <select 
                      value={modalMinuto}
                      onChange={(e) => setModalMinuto(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-navy-700 outline-none dark:bg-navy-900 dark:border-navy-600 dark:text-white font-medium"
                    >
                      {(modalTurno === "PM" && modalHora === "07" ? ["00"] : ["00", "15", "30", "45"]).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Motivo de la cita</label>
                <input type="text" placeholder="Ej: Control SOP" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-navy-700 outline-none dark:bg-navy-900 dark:border-navy-600 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Observaciones</label>
                <textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-navy-700 outline-none dark:bg-navy-900 dark:border-navy-600 dark:text-white" />
              </div>
              <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-navy-700">
                <button type="button" onClick={() => setMostrarModal(false)} className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition">{guardando ? "Guardando..." : "Guardar Cita"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl p-4 text-sm font-medium text-white shadow-lg transition-all ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default CitasView;
