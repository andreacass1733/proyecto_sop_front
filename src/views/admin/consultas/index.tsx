import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Card from "components/card";
import {
  MdMedicalServices,
  MdAdd,
  MdPerson,
  MdSearch,
  MdFilterList,
  MdRefresh,
  MdFileDownload,
  MdPrint,
  MdVisibility,
  MdCalendarToday,
  MdAssignment,
} from "react-icons/md";
import {
  ConsultaOut,
  PacienteListItem,
  listarConsultas,
  crearConsulta,
  listarPacientes,
  guardarDatosClinicos,
} from "services/api";

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ConsultasView: React.FC = () => {
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState<ConsultaOut[]>([]);
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [consultaDetalle, setConsultaDetalle] = useState<ConsultaOut | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Formulario nueva consulta médica con constantes vitales
  const [pacienteId, setPacienteId] = useState("");
  const [tipoConsulta, setTipoConsulta] = useState("Evaluación Inicial Rotterdam");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [prescripcion, setPrescripcion] = useState("");
  const [fechaProximaCita, setFechaProximaCita] = useState("");
  // Signos vitales / Antropometría rápida
  const [pesoKg, setPesoKg] = useState("");
  const [tallaCm, setTallaCm] = useState("");
  const [presionSistolica, setPresionSistolica] = useState("");
  const [presionDiastolica, setPresionDiastolica] = useState("");
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState("");

  // Cálculo en vivo de IMC
  const imcCalculado = useMemo(() => {
    const p = parseFloat(pesoKg);
    const t = parseFloat(tallaCm);
    if (!isNaN(p) && !isNaN(t) && p > 0 && t > 0) {
      const tm = t / 100;
      return (p / (tm * tm)).toFixed(1);
    }
    return null;
  }, [pesoKg, tallaCm]);

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
    if (!pacienteId) {
      showToast("Debe seleccionar una paciente para registrar la consulta médica", "error");
      return;
    }

    try {
      setGuardando(true);

      // 1. Armar motivo completo con tipo de consulta
      const motivoCompleto = `[${tipoConsulta}] ${motivo}`.trim();
      let obsCompleta = observaciones;
      if (prescripcion) {
        obsCompleta += `\n\nPrescripción / Conducta: ${prescripcion}`;
      }

      // 2. Crear la consulta médica
      const nuevaConsulta = await crearConsulta({
        paciente_id: pacienteId,
        motivo: motivoCompleto,
        observaciones: obsCompleta,
        fecha_proxima_cita: fechaProximaCita || undefined,
      });

      // 3. Si se ingresaron signos vitales / antropometría, persistirlos en datos_clinicos
      if (pesoKg || tallaCm || presionSistolica || frecuenciaCardiaca) {
        try {
          await guardarDatosClinicos({
            paciente_id: pacienteId,
            consulta_id: nuevaConsulta?.id,
            peso_kg: pesoKg ? parseFloat(pesoKg) : undefined,
            talla_cm: tallaCm ? parseFloat(tallaCm) : undefined,
            presion_sistolica: presionSistolica ? parseInt(presionSistolica, 10) : undefined,
            presion_diastolica: presionDiastolica ? parseInt(presionDiastolica, 10) : undefined,
            frecuencia_cardiaca: frecuenciaCardiaca ? parseInt(frecuenciaCardiaca, 10) : undefined,
          });
        } catch (errAntropo) {
          console.warn("Aviso al guardar antropometría de la consulta:", errAntropo);
        }
      }

      setMostrarModal(false);
      setPacienteId("");
      setTipoConsulta("Evaluación Inicial Rotterdam");
      setMotivo("");
      setObservaciones("");
      setPrescripcion("");
      setFechaProximaCita("");
      setPesoKg("");
      setTallaCm("");
      setPresionSistolica("");
      setPresionDiastolica("");
      setFrecuenciaCardiaca("");

      showToast("Acto médico registrado exitosamente en el expediente", "success");
      await cargarDatos();
    } catch (err) {
      showToast("Error al registrar la consulta médica", "error");
    } finally {
      setGuardando(false);
    }
  };

  const getPacienteInfo = (id?: string | null) => {
    if (!id) return { nombre: "Paciente no asignada", ci: "—", edad: "—" };
    const p = pacientes.find((x) => x.id === id);
    if (!p) return { nombre: "Paciente registrada", ci: "—", edad: "—" };

    let edadStr = "—";
    if (p.fecha_nacimiento) {
      const hoy = new Date();
      const nac = new Date(p.fecha_nacimiento);
      let edad = hoy.getFullYear() - nac.getFullYear();
      const m = hoy.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
        edad--;
      }
      edadStr = `${edad} años`;
    }

    return {
      nombre: `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.trim(),
      ci: p.ci || "S/CI",
      edad: edadStr,
    };
  };

  // Filtrado dinámico por búsqueda, tipo de consulta y fecha
  const consultasFiltradas = consultas.filter((c) => {
    const pInfo = getPacienteInfo(c.paciente_id);
    const textoBuscar = `${pInfo.nombre} ${pInfo.ci} ${c.motivo || ""} ${c.observaciones || ""}`.toLowerCase();
    const q = busqueda.toLowerCase().trim();

    const coincideBusqueda = !q || textoBuscar.includes(q);

    const coincideTipo =
      filtroTipo === "todos" ||
      (c.motivo && c.motivo.toLowerCase().includes(filtroTipo.toLowerCase()));

    const coincideFecha =
      !filtroFecha || (c.created_at && c.created_at.startsWith(filtroFecha));

    return coincideBusqueda && coincideTipo && coincideFecha;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroTipo("todos");
    setFiltroFecha("");
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (consultasFiltradas.length === 0) {
      showToast("No hay consultas para exportar", "error");
      return;
    }
    const headers = [
      "ID_Consulta",
      "Fecha_Atencion",
      "Paciente",
      "CI",
      "Edad",
      "Motivo_Consulta",
      "Observaciones_Clinicas",
      "Proxima_Cita",
    ];

    const rows = consultasFiltradas.map((c) => {
      const p = getPacienteInfo(c.paciente_id);
      return [
        `"${c.id}"`,
        `"${c.created_at ? new Date(c.created_at).toLocaleString() : ""}"`,
        `"${p.nombre}"`,
        `"${p.ci}"`,
        `"${p.edad}"`,
        `"${(c.motivo || "").replace(/"/g, '""')}"`,
        `"${(c.observaciones || "").replace(/"/g, '""')}"`,
        `"${c.fecha_proxima_cita || ""}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `consultas_clinicas_sop_${formatLocalDate(new Date())}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Reporte CSV de consultas exportado correctamente", "success");
  };

  const exportarPDF = () => {
    window.print();
  };

  return (
    <div className="mt-3 flex h-full flex-col gap-4">
      
      {/* ── HEADER PRINCIPAL CON BOTONES ALINEADOS A LA DERECHA DEL MISMO TAMAÑO ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-navy-700 dark:text-white flex items-center gap-2">
            <MdMedicalServices className="text-brand-500" /> Consultas Médicas & Actos Clínicos
          </h2>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            Registro cronológico de atenciones, anamnesis, constantes vitales y evaluación de criterios Rotterdam
          </p>
        </div>

        {/* Acciones Superiores: Mismo tamaño y alineados a la derecha */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <button
            onClick={exportarCSV}
            className="h-9 min-w-[130px] rounded-xl border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 dark:border-navy-600 dark:bg-navy-800 dark:text-gray-200 dark:hover:bg-navy-700 flex items-center justify-center gap-1.5"
            title="Exportar listado de consultas en formato CSV"
          >
            <MdFileDownload size={16} className="text-emerald-600 dark:text-emerald-400" />
            Exportar CSV
          </button>

          <button
            onClick={exportarPDF}
            className="h-9 min-w-[130px] rounded-xl border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 dark:border-navy-600 dark:bg-navy-800 dark:text-gray-200 dark:hover:bg-navy-700 flex items-center justify-center gap-1.5"
            title="Imprimir o guardar ficha clínica en PDF"
          >
            <MdPrint size={16} className="text-blue-600 dark:text-blue-400" />
            Exportar PDF
          </button>

          <button
            onClick={() => setMostrarModal(true)}
            className="h-9 min-w-[160px] rounded-xl bg-brand-500 px-4 text-xs font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900 dark:hover:bg-brand-300 flex items-center justify-center gap-1.5"
          >
            <MdAdd size={18} />
            Nueva Consulta Médica
          </button>
        </div>
      </div>

      {/* ── KPIS RESUMEN CLÍNICO (4 TARJETAS COMPACTAS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card extra="p-3 border border-slate-200/80 dark:border-navy-700 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            TOTAL CONSULTAS REGISTRADAS
          </p>
          <div className="my-0.5">
            <h3 className="text-2xl font-black text-navy-800 dark:text-white">
              {consultas.length}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
            Actos clínicos documentados
          </p>
        </Card>

        <Card extra="p-3 border border-slate-200/80 dark:border-navy-700 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            PACIENTES EN SEGUIMIENTO
          </p>
          <div className="my-0.5">
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {new Set(consultas.map((c) => c.paciente_id).filter(Boolean)).size}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-400">
            Expedientes activos con atención
          </p>
        </Card>

        <Card extra="p-3 border border-slate-200/80 dark:border-navy-700 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            EVALUACIONES ROTTERDAM
          </p>
          <div className="my-0.5">
            <h3 className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {consultas.filter((c) => (c.motivo || "").toLowerCase().includes("rotterdam") || (c.motivo || "").toLowerCase().includes("sop")).length}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-purple-600/80 dark:text-purple-400">
            Criterios 1, 2 y 3 abordados
          </p>
        </Card>

        <Card extra="p-3 border border-slate-200/80 dark:border-navy-700 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            CITAS DE CONTROL ENLAZADAS
          </p>
          <div className="my-0.5">
            <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400">
              {consultas.filter((c) => c.fecha_proxima_cita).length}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-blue-600/80 dark:text-blue-400">
            Próximas atenciones agendadas
          </p>
        </Card>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS CLÍNICOS ── */}
      <Card extra="p-3 border border-slate-200/90 dark:border-navy-700 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            
            {/* Buscador de Paciente / CI / Motivo */}
            <div className="relative flex-1 min-w-[220px]">
              <MdSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, CI, motivo o detalle clínico..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
              />
            </div>

            {/* Filtro por Tipo de Atención Médica (Sin estados) */}
            <div className="flex items-center gap-1.5">
              <MdFilterList className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 py-1.5 px-3 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
              >
                <option value="todos">Todos los Tipos de Atención</option>
                <option value="Rotterdam">Evaluación Inicial Rotterdam</option>
                <option value="Hormonal">Control Hormonal / Metabólico</option>
                <option value="Ecográfico">Control Ecográfico (Criterio 3)</option>
                <option value="Tratamiento">Ajuste de Tratamiento / Fármacos</option>
                <option value="General">Atención / Seguimiento General</option>
              </select>
            </div>

            {/* Filtro por Fecha */}
            <div>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 py-1.5 px-3 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
              />
            </div>
          </div>

          {/* Reset de Filtros */}
          {(busqueda || filtroTipo !== "todos" || filtroFecha) && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-1 self-start rounded-xl bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300 dark:hover:bg-navy-600 lg:self-center"
            >
              <MdRefresh className="h-4 w-4" /> Limpiar Filtros
            </button>
          )}
        </div>
      </Card>

      {/* ── TABLA PRINCIPAL DE CONSULTAS MÉDICAS ── */}
      <Card extra="p-3 w-full h-full border border-slate-200/90 dark:border-navy-700 shadow-2xs">
        {cargando ? (
          <div className="py-12 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
            Cargando historial de consultas médicas...
          </div>
        ) : consultasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <MdMedicalServices className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-base font-bold text-gray-700 dark:text-gray-300">
              {consultas.length === 0
                ? "No hay consultas médicas registradas"
                : "No se encontraron consultas con los filtros aplicados"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {consultas.length === 0
                ? 'Presione en "Nueva Consulta Médica" para registrar una atención médica.'
                : "Intente modificar el texto de búsqueda o la fecha seleccionada."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 dark:bg-navy-700/80 dark:text-gray-400">
                <tr>
                  <th className="py-2.5 px-3">Paciente (Identificación)</th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Tipo / Motivo de Consulta</th>
                  <th className="py-2.5 px-3">Observaciones & Prescripción</th>
                  <th className="py-2.5 px-3">Próximo Control</th>
                  <th className="py-2.5 px-3 text-right">Acciones Clínicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700/60">
                {consultasFiltradas.map((c) => {
                  const pInfo = getPacienteInfo(c.paciente_id);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-navy-700/40 transition-colors"
                    >
                      {/* Paciente */}
                      <td className="py-3 px-3 font-medium text-navy-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-navy-700 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold shrink-0">
                            <MdPerson size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-xs block leading-tight">
                              {pInfo.nombre}
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                              CI: {pInfo.ci} • {pInfo.edad}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Fecha de atención */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleDateString()
                            : "N/A"}
                        </span>
                        <span className="block text-[10px] text-gray-400 font-mono">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </td>

                      {/* Motivo de consulta */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <span className="font-bold text-navy-700 dark:text-white block truncate" title={c.motivo || "Atención General"}>
                          {c.motivo || "Atención General"}
                        </span>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                          Acto Médico
                        </span>
                      </td>

                      {/* Observaciones & Prescripción */}
                      <td className="py-3 px-3 max-w-[260px]">
                        <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300 leading-snug" title={c.observaciones || "Sin observaciones adicionales"}>
                          {c.observaciones || "Sin observaciones adicionales"}
                        </p>
                      </td>

                      {/* Próximo Control */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {c.fecha_proxima_cita ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                            <MdCalendarToday size={12} />
                            {c.fecha_proxima_cita}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-mono">Sin agendar</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Botón Ver Detalle */}
                          <button
                            onClick={() => setConsultaDetalle(c)}
                            className="rounded-lg bg-slate-100 hover:bg-slate-200 p-1.5 text-slate-700 dark:bg-navy-700 dark:text-slate-300 dark:hover:bg-navy-600 transition"
                            title="Ver nota clínica completa"
                          >
                            <MdVisibility size={15} />
                          </button>

                          {/* Botón Evaluación Criterios 1 y 2 (Rotterdam) */}
                          <button
                            onClick={() =>
                              navigate(
                                `/admin/evaluacion-clinica?pacienteId=${c.paciente_id || ""}`
                              )
                            }
                            className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition border border-indigo-200/60 dark:border-indigo-800"
                            title="Evaluar Criterios Clínicos 1 y 2 (Rotterdam) para esta paciente"
                          >
                            Criterios 1 y 2
                          </button>

                          {/* Botón Expediente */}
                          <button
                            onClick={() =>
                              navigate(
                                `/admin/pacientes?pacienteId=${c.paciente_id || ""}`
                              )
                            }
                            className="rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 transition border border-brand-200/60 dark:border-brand-800"
                            title="Abrir expediente clínico completo"
                          >
                            Expediente
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── MODAL: NUEVA CONSULTA MÉDICA CON CONSTANTES VITALES ── */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl lg:max-w-3xl rounded-2xl bg-white p-5 md:p-7 shadow-2xl dark:bg-navy-800 border border-gray-100 dark:border-navy-700 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 dark:border-navy-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-navy-700 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold">
                  <MdMedicalServices size={18} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-navy-700 dark:text-white">
                    Registrar Consulta Médica
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Acto médico, anamnesis, constantes vitales y prescripción
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearConsulta} className="mt-4 flex flex-col gap-4">
              
              {/* Selección de Paciente y Tipo de Consulta */}
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Seleccionar Paciente *
                  </label>
                  <select
                    required
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
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
                    Tipo de Acto Médico
                  </label>
                  <select
                    value={tipoConsulta}
                    onChange={(e) => setTipoConsulta(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                  >
                    <option value="Evaluación Inicial Rotterdam">Evaluación Inicial Rotterdam</option>
                    <option value="Control Hormonal / Metabólico">Control Hormonal / Metabólico</option>
                    <option value="Control Ecográfico (Criterio 3)">Control Ecográfico (Criterio 3)</option>
                    <option value="Ajuste de Tratamiento / Fármacos">Ajuste de Tratamiento / Fármacos</option>
                    <option value="Seguimiento Clínico General">Seguimiento Clínico General</option>
                  </select>
                </div>
              </div>

              {/* Bloque de Signos Vitales y Antropometría Obligatoria de la Cita */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-navy-900/40 dark:border-navy-700">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-2">
                  Constantes Vitales & Antropometría de la Consulta:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej. 65.5"
                      value={pesoKg}
                      onChange={(e) => setPesoKg(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-1.5 text-xs font-bold text-navy-800 outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      Talla (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej. 162"
                      value={tallaCm}
                      onChange={(e) => setTallaCm(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-1.5 text-xs font-bold text-navy-800 outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      IMC Calculado
                    </label>
                    <div className="mt-1 p-1.5 rounded-lg bg-gray-100 dark:bg-navy-700 text-xs font-black text-navy-800 dark:text-white text-center">
                      {imcCalculado ? `${imcCalculado} kg/m²` : "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      Presión Art. (S/D)
                    </label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        placeholder="120"
                        value={presionSistolica}
                        onChange={(e) => setPresionSistolica(e.target.value)}
                        className="w-1/2 rounded-lg border border-gray-200 bg-white p-1.5 text-xs font-bold text-navy-800 outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-800 dark:text-white"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        placeholder="80"
                        value={presionDiastolica}
                        onChange={(e) => setPresionDiastolica(e.target.value)}
                        className="w-1/2 rounded-lg border border-gray-200 bg-white p-1.5 text-xs font-bold text-navy-800 outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      Frec. Cardíaca
                    </label>
                    <input
                      type="number"
                      placeholder="Ej. 75 lpm"
                      value={frecuenciaCardiaca}
                      onChange={(e) => setFrecuenciaCardiaca(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-1.5 text-xs font-bold text-navy-800 outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Motivo de la Consulta / Anamnesis *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Paciente acude por retraso menstrual de 45 días, hirsutismo en mentón y aumento de peso"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                />
              </div>

              {/* Observaciones y Hallazgos Clínicos */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Hallazgos Clínicos / Evaluación de Criterios Rotterdam
                </label>
                <textarea
                  rows={3}
                  placeholder="Detallar exploración física, signos de hiperandrogenismo, acantosis nigricans o estado ovárico..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                />
              </div>

              {/* Prescripción Médica / Tratamiento Indicado */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Prescripción Farmacológica / Conducta Terapéutica
                </label>
                <input
                  type="text"
                  placeholder="Ej: Metformina 850mg c/12h con alimentos, Espironolactona 50mg/día, plan dietético bajo en índice glucémico"
                  value={prescripcion}
                  onChange={(e) => setPrescripcion(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                />
              </div>

              {/* Próxima Cita Opcional */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Agendar Próxima Cita de Control (Opcional)
                </label>
                <input
                  type="date"
                  value={fechaProximaCita}
                  onChange={(e) => setFechaProximaCita(e.target.value)}
                  className="mt-1 w-full sm:w-1/2 rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                />
              </div>

              {/* Botonera Guardar */}
              <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-3.5 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="rounded-xl bg-gray-100 px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-brand-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-600 dark:bg-brand-400 dark:text-navy-900 shadow-md"
                >
                  {guardando ? "Registrando Acto Médico..." : "Guardar Consulta Médica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VER NOTA CLÍNICA COMPLETA ── */}
      {consultaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-navy-700">
              <h3 className="text-base font-bold text-navy-800 dark:text-white flex items-center gap-2">
                <MdAssignment className="text-brand-500" /> Ficha de Consulta Médica
              </h3>
              <button
                onClick={() => setConsultaDetalle(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="font-bold text-gray-500 dark:text-gray-400 block text-[10px] uppercase">
                  Paciente:
                </span>
                <span className="text-sm font-bold text-navy-800 dark:text-white">
                  {getPacienteInfo(consultaDetalle.paciente_id).nombre}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-gray-500 dark:text-gray-400 block text-[10px] uppercase">
                    Fecha de Atención:
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {consultaDetalle.created_at ? new Date(consultaDetalle.created_at).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 dark:text-gray-400 block text-[10px] uppercase">
                    Próxima Cita:
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {consultaDetalle.fecha_proxima_cita || "No programada"}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-500 dark:text-gray-400 block text-[10px] uppercase">
                  Motivo de Consulta:
                </span>
                <p className="mt-0.5 p-2 rounded-lg bg-gray-50 dark:bg-navy-900/50 text-gray-700 dark:text-gray-200 font-medium">
                  {consultaDetalle.motivo || "Atención General"}
                </p>
              </div>

              <div>
                <span className="font-bold text-gray-500 dark:text-gray-400 block text-[10px] uppercase">
                  Evolución Clínica & Prescripción:
                </span>
                <p className="mt-0.5 p-2.5 rounded-lg bg-gray-50 dark:bg-navy-900/50 text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                  {consultaDetalle.observaciones || "Sin observaciones adicionales registradas."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-navy-700">
              <button
                onClick={() => {
                  const pid = consultaDetalle.paciente_id;
                  setConsultaDetalle(null);
                  navigate(`/admin/evaluacion-clinica?pacienteId=${pid || ""}`);
                }}
                className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                Ir a Criterios 1 y 2
              </button>
              <button
                onClick={() => setConsultaDetalle(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold text-white shadow-lg transition-all duration-300 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ConsultasView;
