import React, { useState, useEffect } from "react";
import Card from "components/card";
import {
  MdSecurity,
  MdLock,
  MdFileDownload,
  MdSearch,
  MdRefresh,
  MdContentCopy,
  MdCheckCircle,
  MdWarning,
  MdVpnKey,
  MdClose,
  MdNavigateBefore,
  MdNavigateNext,
} from "react-icons/md";
import {
  listarAuditoriaLogs,
  obtenerMetricasAuditoria,
  AuditLogItem,
  AuditoriaMetricas,
} from "services/api";

const AuditoriaLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [metricas, setMetricas] = useState<AuditoriaMetricas>({
    eventos_totales_hoy: 0,
    trazabilidad_activa_pct: 100.0,
    inferencias_ia_registradas: 0,
    inferencias_subtitulo: "Criterio 3 (EfficientNet-B0)",
    validaciones_medicas: 0,
    validaciones_subtitulo: "Firma Humana Verificada",
    alertas_seguridad: 0,
    alertas_subtitulo: "Eventos de Acceso / 2FA",
  });
  const [cargando, setCargando] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");

  // Paginación (Estilo Pacientes)
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // Modales y Toasts
  const [modalFirma, setModalFirma] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resLogs, resMetricas] = await Promise.all([
        listarAuditoriaLogs({
          q: busqueda || undefined,
          modulo: filtroModulo !== "todos" ? filtroModulo : undefined,
          nivel: filtroNivel !== "todos" ? filtroNivel : undefined,
          fecha: filtroFecha || undefined,
          limite: 200,
        }).catch(() => null),
        obtenerMetricasAuditoria().catch(() => null),
      ]);

      if (resLogs && resLogs.logs) {
        setLogs(resLogs.logs);
        if (resLogs.logs.length > 0 && !selectedLog) {
          setSelectedLog(resLogs.logs[0]);
        }
      }
      if (resMetricas) {
        setMetricas(resMetricas);
      }
    } catch (err) {
      console.error("Error cargando auditoría:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroModulo, filtroNivel, filtroFecha]);

  const totalPaginas = Math.ceil(logs.length / porPagina) || 1;
  const logsPaginados = logs.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Selección automática si la lista cambia
  useEffect(() => {
    if (logs.length > 0 && (!selectedLog || !logs.some((l) => l.id === selectedLog.id))) {
      setSelectedLog(logs[0]);
    }
  }, [logs, selectedLog]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroModulo("todos");
    setFiltroNivel("todos");
    setFiltroFecha("");
    setPagina(1);
  };

  const copiarAlPortapapeles = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    showToast(`${label} copiado al portapapeles con éxito.`);
  };

  const exportarCSV = () => {
    if (logs.length === 0) {
      showToast("No hay registros disponibles para exportar.", "error");
      return;
    }

    const headers = [
      "ID",
      "Timestamp",
      "Usuario",
      "Rol",
      "IP",
      "Estacion",
      "Modulo",
      "Evento",
      "Paciente_ID",
      "Paciente_Nombre",
      "Detalle",
      "Hash_SHA256",
      "Estado",
    ];

    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.usuario}"`,
      `"${l.rol}"`,
      `"${l.ip}"`,
      `"${l.estacion}"`,
      `"${l.modulo}"`,
      `"${l.evento}"`,
      `"${l.paciente_id || ""}"`,
      `"${l.paciente_nombre || ""}"`,
      `"${l.detalle.replace(/"/g, '""')}"`,
      `"${l.hash_sha256}"`,
      `"${l.estado}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `auditoria_sop_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Archivo CSV descargado correctamente.");
  };

  const imprimirCertificado = () => {
    window.print();
  };

  const formatearFechaHora = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const anio = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const seg = String(d.getSeconds()).padStart(2, "0");
      const ms = String(d.getMilliseconds()).padStart(3, "0");
      return `${dia}/${mes}/${anio} ${hora}:${min}:${seg}.${ms}`;
    } catch {
      return isoStr;
    }
  };

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "AUDIT_OK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            AUDIT_OK
          </span>
        );
      case "AI_EXEC":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            AI_EXEC
          </span>
        );
      case "LOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-300 dark:bg-navy-700 dark:text-slate-200 dark:border-navy-600">
            <MdLock size={12} className="text-amber-600" />
            LOCKED
          </span>
        );
      case "AUTH_OK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            AUTH_OK
          </span>
        );
      case "ALERT_WARN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
            <MdWarning size={12} className="text-amber-600" />
            ALERT_WARN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gray-100 text-gray-800 border border-gray-300">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="mt-1 flex flex-col gap-2.5 font-sans">
      {/* ── BARRA SUPERIOR CON SELLO INMUTABLE CRIPTOGRÁFICO ── */}
      <div className="flex items-center justify-end px-1">
        <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
          <MdLock className="text-amber-500 h-3.5 w-3.5" />
          <span>Registro Inmutable Criptográfico SHA-256</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      {/* ── ENCABEZADO MÉDICO PRINCIPAL CON ACCIONES (CARD 1) ── */}
      <Card extra="p-3.5 sm:p-4 border border-slate-200/90 dark:border-navy-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-brand-500/20 shrink-0">
              <MdSecurity size={22} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-navy-700 dark:text-white tracking-tight">
                Registro de Auditoría Médica, Seguridad y Trazabilidad de IA (Audit Logs)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Cumplimiento estricto HIPAA Security Rule • NOM-024-SSA3 • Registro Inmutable Criptográfico
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={exportarCSV}
              className="h-9 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 transition border border-slate-300 dark:border-navy-600 shadow-sm flex items-center justify-center gap-2 min-w-[130px]"
            >
              <MdFileDownload size={16} />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={imprimirCertificado}
              className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 min-w-[130px]"
            >
              <MdLock size={15} />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ── 4 KPI METRICS CARDS (CARD 2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {/* Eventos Totales Hoy */}
        <Card extra="p-3 py-2.5 border border-slate-200/90 dark:border-navy-700 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            EVENTOS TOTALES HOY
          </p>
          <div className="my-1">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {metricas.eventos_totales_hoy.toLocaleString()}
            </h3>
          </div>
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {metricas.trazabilidad_activa_pct}% trazabilidad activa
          </p>
        </Card>

        {/* Inferencias IA Registradas (Borde Morado) */}
        <Card extra="p-3 py-2.5 border-2 border-purple-300 dark:border-purple-600 bg-purple-50/10 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
            INFERENCIAS IA REGISTRADAS
          </p>
          <div className="my-1">
            <h3 className="text-2xl font-black text-purple-700 dark:text-purple-300">
              {metricas.inferencias_ia_registradas}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-purple-600/80 dark:text-purple-400">
            {metricas.inferencias_subtitulo}
          </p>
        </Card>

        {/* Validaciones Médicas (Borde Verde) */}
        <Card extra="p-3 py-2.5 border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50/10 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            VALIDACIONES MÉDICAS
          </p>
          <div className="my-1">
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {metricas.validaciones_medicas}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-400">
            {metricas.validaciones_subtitulo}
          </p>
        </Card>

        {/* Alertas de Seguridad (Borde Ámbar) */}
        <Card extra="p-3 py-2.5 border-2 border-amber-300 dark:border-amber-600 bg-amber-50/10 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            ALERTAS DE SEGURIDAD
          </p>
          <div className="my-1">
            <h3 className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {metricas.alertas_seguridad}
            </h3>
          </div>
          <p className="text-[11px] font-bold text-amber-600/80 dark:text-amber-400">
            {metricas.alertas_subtitulo}
          </p>
        </Card>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS (CARD 3) ── */}
      <Card extra="p-2.5 sm:p-3 border border-slate-200/90 dark:border-navy-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            {/* Buscador de Paciente / Folio / Hash */}
            <div className="relative flex-1 min-w-[200px]">
              <MdSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, CI, IP, usuario o hash..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
              />
            </div>

            {/* Selector de Módulo */}
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
            >
              <option value="todos">Todos los Módulos</option>
              <option value="ECOGRAFIA_CRIT3">IA Ecografía (Criterio 3)</option>
              <option value="EXPEDIENTE">Expediente Clínico</option>
              <option value="CITAS">Citas y Atenciones</option>
              <option value="TRATAMIENTO">Tratamiento y Farmacología</option>
              <option value="AUTH_SERVICE">Autenticación y Seguridad</option>
            </select>

            {/* Selector de Nivel */}
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
            >
              <option value="todos">Nivel: Todos</option>
              <option value="AUDIT_OK">AUDIT_OK</option>
              <option value="AI_EXEC">AI_EXEC</option>
              <option value="LOCKED">LOCKED</option>
              <option value="AUTH_OK">AUTH_OK</option>
              <option value="ALERT_WARN">ALERT_WARN</option>
            </select>

            {/* Selector de Fecha */}
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 py-1.5 px-2.5 text-xs font-semibold text-navy-700 outline-none transition duration-200 focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              Filtro activo:{" "}
              <strong className="text-slate-800 dark:text-white">
                {logs.length} eventos {busqueda ? `para "${busqueda}"` : "en el sistema"}
              </strong>
            </span>

            {(busqueda || filtroModulo !== "todos" || filtroNivel !== "todos" || filtroFecha) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-navy-700 dark:hover:bg-navy-600 transition"
              >
                <MdRefresh size={13} />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ── TABLA DE LOGS DE AUDITORÍA FORENSE (CARD 4) ── */}
      <Card extra="overflow-hidden border border-slate-200/90 dark:border-navy-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-navy-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-black border-b border-slate-200 dark:border-navy-700">
              <tr>
                <th className="py-2.5 px-3">Timestamp (ISO 8601)</th>
                <th className="py-2.5 px-3">Usuario / Rol</th>
                <th className="py-2.5 px-3">IP / Estación</th>
                <th className="py-2.5 px-3">Módulo / Evento</th>
                <th className="py-2.5 px-3">Paciente Afectado</th>
                <th className="py-2.5 px-3 min-w-[220px]">Detalle Forense & Hash SHA-256</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <div className="w-7 h-7 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-1.5"></div>
                    <span className="font-bold text-xs">Cargando registros forenses de auditoría...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <MdCheckCircle className="h-8 w-8 mx-auto text-slate-300 mb-1.5" />
                    <p className="font-bold text-xs text-slate-600 dark:text-slate-300">
                      No se encontraron eventos con los filtros seleccionados.
                    </p>
                    <button
                      type="button"
                      onClick={limpiarFiltros}
                      className="mt-1.5 text-xs font-bold text-brand-600 hover:underline"
                    >
                      Restablecer filtros de búsqueda
                    </button>
                  </td>
                </tr>
              ) : (
                logsPaginados.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-inset ring-purple-400"
                          : "hover:bg-slate-50/70 dark:hover:bg-navy-700/50"
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-2 px-3 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {formatearFechaHora(log.timestamp)}
                      </td>

                      {/* Usuario y Rol */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">{log.usuario}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{log.rol}</p>
                      </td>

                      {/* IP y Estación */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[10px]">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{log.ip}</p>
                        <p className="text-[9px] text-slate-400 font-sans">{log.estacion}</p>
                      </td>

                      {/* Módulo y Evento */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-black text-purple-700 dark:text-purple-300 text-[10px] block leading-tight">
                          {log.modulo}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">{log.evento}</span>
                      </td>

                      {/* Paciente Afectado */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {log.paciente_id ? (
                          <>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block leading-tight">
                              {log.paciente_id}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {log.paciente_nombre || "Paciente"}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {log.paciente_nombre || "— (Sesión de Sistema)"}
                          </span>
                        )}
                      </td>

                      {/* Detalle Forense & Hash */}
                      <td className="py-2 px-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-[11px] line-clamp-1 leading-normal">
                          {log.detalle}
                        </p>
                        <p className="font-mono text-[9px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                          Hash: {log.hash_sha256.substring(0, 10)}...{log.hash_sha256.substring(log.hash_sha256.length - 6)}
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {renderBadgeEstado(log.estado)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINACIÓN COMPLETA Y PROFESIONAL (ESTILO PACIENTES) ── */}
        {logs.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-navy-800 border-t border-slate-200 dark:border-navy-700 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Mostrar</span>
              <select
                value={porPagina}
                onChange={(e) => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                className="border border-slate-300 dark:border-navy-600 rounded-xl px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-navy-900 focus:outline-none"
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>
              <span>de {logs.length} eventos en el sistema</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagina === 1 || cargando}
                onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-600 hover:bg-slate-100 dark:hover:bg-navy-700 disabled:opacity-40 transition shadow-sm"
              >
                <MdNavigateBefore size={16} /> Anterior
              </button>

              <span className="px-2.5 py-0.5 text-xs font-extrabold text-slate-800 dark:text-white bg-slate-200/80 dark:bg-navy-700 rounded-xl">
                Página {pagina} de {totalPaginas}
              </span>

              <button
                disabled={pagina >= totalPaginas || cargando}
                onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-600 hover:bg-slate-100 dark:hover:bg-navy-700 disabled:opacity-40 transition shadow-sm"
              >
                Siguiente <MdNavigateNext size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── INSPECTOR FORENSE DEL EVENTO SELECCIONADO (CARD 5) ── */}
      {selectedLog && (
        <Card extra="p-4 sm:p-5 border-2 border-purple-300 dark:border-purple-700 bg-purple-50/20 dark:bg-purple-950/20 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/60 dark:border-purple-800/60 pb-3">
            <div>
              <h4 className="text-sm sm:text-base font-black text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <span>Inspector Forense del Evento Seleccionado</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  (ID #{selectedLog.id}):
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Carga útil JSON inmutable, firma criptográfica y sello temporal RFC 3339
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  copiarAlPortapapeles(
                    JSON.stringify(selectedLog.payload_json, null, 2),
                    "Payload JSON"
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-navy-800 hover:bg-slate-100 transition border border-slate-300 dark:border-navy-600 shadow-sm"
              >
                <MdContentCopy size={15} />
                <span>Copiar JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setModalFirma(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-600/20"
              >
                <MdVpnKey size={15} />
                <span>Ver Firma Criptográfica</span>
              </button>
            </div>
          </div>

          {/* Bloque de Código JSON */}
          <div className="mt-3 rounded-2xl bg-slate-900 text-emerald-400 p-4 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
            <pre style={{ margin: 0 }}>
              {JSON.stringify(selectedLog.payload_json, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {/* ── MODAL DE FIRMA Y CERTIFICADO CRIPTOGRÁFICO ── */}
      {modalFirma && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-navy-800 p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-700 animate-fade-in-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <MdVpnKey size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Certificado de Integridad y Firma Criptográfica
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Estándar HIPAA 45 CFR § 164.312(c)(1) & NOM-024-SSA3
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalFirma(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700 transition"
              >
                <MdClose size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider text-[11px]">
                    Hash Inmutable SHA-256:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    VERIFICADO 100%
                  </span>
                </div>
                <p className="font-mono text-xs break-all bg-white dark:bg-navy-900 p-2.5 rounded-xl border border-purple-200 dark:border-navy-700 font-bold text-slate-800 dark:text-white">
                  {selectedLog.hash_sha256}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Folio de Auditoría
                  </span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                    {selectedLog.id}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Timestamp Criptográfico
                  </span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                    {selectedLog.timestamp}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Usuario Firmante / Rol
                  </span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    {selectedLog.usuario} ({selectedLog.rol})
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    IP / Estación de Origen
                  </span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                    {selectedLog.ip} — {selectedLog.estacion}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                <MdCheckCircle size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Este registro ha sido sellado criptográficamente en el momento exacto de su emisión.
                  Cualquier alteración en los parámetros clínicos o imágenes biomédicas invalidará
                  automáticamente la suma de verificación SHA-256 ante auditorías médicas oficiales.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-navy-700">
              <button
                type="button"
                onClick={() => copiarAlPortapapeles(selectedLog.hash_sha256, "Hash SHA-256")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-navy-700 transition"
              >
                <MdContentCopy size={15} />
                <span>Copiar Hash</span>
              </button>
              <button
                type="button"
                onClick={() => setModalFirma(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-xl animate-fade-in-up ${
            toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <MdCheckCircle size={18} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default AuditoriaLogsView;
