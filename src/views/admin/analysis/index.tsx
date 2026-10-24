import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MdUpload, MdWarning, MdCheckCircle,
  MdCancel, MdOutlineAnalytics, MdCenterFocusStrong, MdPerson, MdDelete, MdLayers,
  MdSearch, MdCompare, MdZoomIn, MdZoomOut, MdRestartAlt, MdClose, MdPrint, MdHistory, MdArrowForward,
  MdCheck, MdOpenInNew, MdRefresh, MdInfoOutline
} from "react-icons/md";
import {
  predecirImagen,
  validarImagen,
  listarPacientes,
  listarEstudiosEcograficos,
  PrediccionResponse,
  PacienteListItem,
  EstudioEcograficoItem,
} from "services/api";

// ── Formatear Fechas ────────────────────────────────────────────────────────
function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

// ── Barra de Probabilidad ──────────────────────────────────────────────────
const ProbBar = ({
  label,
  pct,
  barGradient,
  textColor,
}: {
  label: string;
  pct: number;
  barGradient: string;
  textColor: string;
}) => {
  const safePct = typeof pct === "number" && !isNaN(pct) ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${barGradient.split(" ")[0].replace("from-", "bg-")}`} />
          {label}
        </span>
        <span className={`text-sm font-extrabold ${textColor} font-mono tracking-tight`}>
          {safePct.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 bg-slate-100 dark:bg-navy-900 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-navy-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
};

// ── Componente Principal ────────────────────────────────────────────────────
const Analysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pacientes
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [pacienteId, setPacienteId] = useState<string>("");
  const [busquedaPaciente, setBusquedaPaciente] = useState<string>("");
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState<boolean>(false);

  // Imagen y Estado
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analisisPaso, setAnalisisPaso] = useState<number>(0);
  const [result, setResult] = useState<PrediccionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Modo de visualización de imagen (gradcam | original | split)
  const [vistaImagen, setVistaImagen] = useState<"gradcam" | "original" | "split">("gradcam");
  const [imagenModalZoom, setImagenModalZoom] = useState<string | null>(null);
  const [zoomNivel, setZoomNivel] = useState<number>(1.8);
  const [posicionPan, setPosicionPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const abrirModalZoom = (url: string) => {
    setImagenModalZoom(url);
    setZoomNivel(1.8);
    setPosicionPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomNivel((prev) => Math.min(4.5, Number((prev + 0.3).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomNivel((prev) => Math.max(0.7, Number((prev - 0.3).toFixed(2))));
  };

  const handleResetZoom = (factor: number = 1.0) => {
    setZoomNivel(factor);
    setPosicionPan({ x: 0, y: 0 });
  };

  // Validación médica
  const [validating, setValidating] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [validationLabel, setValidationLabel] = useState<"SOP" | "Normal" | null>(null);
  const [observacionMedico, setObservacionMedico] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Historial de estudios de la paciente
  const [estudiosPaciente, setEstudiosPaciente] = useState<EstudioEcograficoItem[]>([]);
  const [cargandoEstudios, setCargandoEstudios] = useState(false);
  const [tabEstudiosAbierto, setTabEstudiosAbierto] = useState(false);

  // Cargar lista de pacientes
  useEffect(() => {
    const cargar = async () => {
      try {
        const lista = await listarPacientes(undefined, true, 1, 100);
        setPacientes(lista);
      } catch (err) {
        console.error("Error al cargar pacientes:", err);
      }
    };
    cargar();
  }, []);

  // Leer parámetros de URL si viene desde el perfil del paciente
  useEffect(() => {
    const pId = searchParams.get("pacienteId");
    if (pId) {
      setPacienteId(pId);
    }
  }, [searchParams]);

  // Paciente seleccionado actual
  const pacienteSeleccionado = useMemo(() => {
    return pacientes.find((p) => String(p.id) === String(pacienteId)) || null;
  }, [pacientes, pacienteId]);

  // Cargar historial de ecografías de la paciente seleccionada
  const cargarHistorial = useCallback(async (pId: string) => {
    setCargandoEstudios(true);
    try {
      const data = await listarEstudiosEcograficos(pId);
      setEstudiosPaciente(data);
    } catch (err) {
      console.warn("No se pudo cargar historial de ecografías:", err);
    } finally {
      setCargandoEstudios(false);
    }
  }, []);

  useEffect(() => {
    if (pacienteId) {
      cargarHistorial(pacienteId);
    } else {
      setEstudiosPaciente([]);
    }
  }, [pacienteId, cargarHistorial]);

  // Manejo de archivos
  const handleFile = (selected: File) => {
    if (!selected.type.includes("jpeg") && !selected.type.includes("png") && !selected.type.includes("jpg")) {
      setError("Formato de imagen inválido. Solo se admiten archivos JPG o PNG de ecografía.");
      return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setError("La imagen supera los 15MB. Por favor elija un archivo más liviano.");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setValidationDone(false);
    setValidationLabel(null);
    setObservacionMedico("");
    setValidationError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected) handleFile(selected);
  };

  // Ejecución del análisis ecográfico por etapas clínicas
  const handleAnalyze = async () => {
    if (!file || !pacienteId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setValidationDone(false);
    setValidationLabel(null);
    setValidationError(null);
    setAnalisisPaso(1);

    const stepTimer1 = setTimeout(() => setAnalisisPaso(2), 700);
    const stepTimer2 = setTimeout(() => setAnalisisPaso(3), 1500);

    try {
      const data = await predecirImagen(file, pacienteId);
      setResult(data);
      setAnalisisPaso(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar la ecografía médica.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setLoading(false);
    }
  };

  // Validación médica profesional
  const handleValidar = async (etiqueta: "SOP" | "Normal") => {
    if (!result) return;
    setValidating(true);
    setValidationError(null);
    try {
      await validarImagen(String(result.id || crypto.randomUUID()), etiqueta, {
        paciente_id: pacienteId,
        imagen_url: result.imagen_url,
        imagen_nombre: result.imagen_nombre,
        prob_sop: result.prob_sop,
        prob_normal: result.prob_normal,
        resultado: result.resultado,
        num_foliculos: result.num_foliculos,
        mapa_calor_url: result.mapa_calor_url,
        observacion_medico: observacionMedico || undefined,
      });
      setValidationLabel(etiqueta);
      setValidationDone(true);
      // Recargar historial
      if (pacienteId) cargarHistorial(pacienteId);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "No se pudo registrar la validación médica.");
    } finally {
      setValidating(false);
    }
  };

  // Filtrado de pacientes en combobox
  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente) return pacientes.slice(0, 15);
    const q = busquedaPaciente.toLowerCase();
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.primer_apellido.toLowerCase().includes(q) ||
        (p.ci && p.ci.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [pacientes, busquedaPaciente]);

  const cumple = result?.resultado === "Cumple criterio";
  const resultIdText = result?.id ? String(result.id) : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── ENCABEZADO MÉDICO UNIFICADO (ECOGRAFÍA CRITERIO 3) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {pacienteSeleccionado
              ? `${pacienteSeleccionado.nombre.charAt(0)}${pacienteSeleccionado.primer_apellido.charAt(0)}`
              : "EC"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Estudio Ecográfico (Criterio 3)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Expediente: <strong className="text-slate-800">CI {pacienteSeleccionado?.ci || "Sin CI"}</strong>
              </span>
              {pacienteSeleccionado?.fecha_nacimiento && (
                <span className="text-xs text-slate-500 font-medium">
                  • Edad: <strong className="text-slate-800">{calcularEdad(pacienteSeleccionado.fecha_nacimiento)}</strong>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {pacienteSeleccionado
                ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.primer_apellido} ${pacienteSeleccionado.segundo_apellido || ""}`
                : "Sin paciente seleccionada"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pacienteSeleccionado && (
            <button
              type="button"
              onClick={() => setTabEstudiosAbierto(!tabEstudiosAbierto)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm"
            >
              <MdHistory size={16} />
              <span>Historial Ecográfico ({estudiosPaciente.length})</span>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownPacienteAbierto(!dropdownPacienteAbierto)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition border border-purple-200 shadow-sm"
            >
              <MdPerson size={16} />
              <span>{pacienteSeleccionado ? "Cambiar Paciente" : "Seleccionar Paciente"}</span>
            </button>

            {dropdownPacienteAbierto && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 max-h-64 overflow-y-auto p-2 space-y-1 animate-fade-in-up">
                <div className="relative mb-2">
                  <MdSearch size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busquedaPaciente}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                    placeholder="Buscar por nombre o CI..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>
                {pacientesFiltrados.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                    No se encontraron pacientes
                  </div>
                ) : (
                  pacientesFiltrados.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setPacienteId(p.id);
                        setSearchParams({ pacienteId: p.id });
                        setDropdownPacienteAbierto(false);
                        setBusquedaPaciente("");
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 cursor-pointer transition text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">
                          {p.nombre} {p.primer_apellido}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          CI: {p.ci || "Sin CI"}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                        Elegir
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── HISTORIAL DE ECOGRAFÍAS DESPLEGABLE ── */}
      {tabEstudiosAbierto && pacienteSeleccionado && (
        <div className="rounded-3xl p-6 bg-white border border-slate-200/80 shadow-md space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MdHistory size={20} className="text-purple-600" />
              <span>Estudios Ecográficos Previos — {pacienteSeleccionado.nombre} {pacienteSeleccionado.primer_apellido}</span>
            </h3>
            <button
              onClick={() => setTabEstudiosAbierto(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <MdClose size={20} />
            </button>
          </div>

          {cargandoEstudios ? (
            <p className="text-xs text-slate-500 font-bold py-4 text-center">Cargando estudios previos...</p>
          ) : estudiosPaciente.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs font-extrabold text-slate-600">No hay ecografías registradas previamente para esta paciente.</p>
              <p className="text-xs text-slate-400 mt-1">Cargue la primera ecografía en el panel inferior.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {estudiosPaciente.map((est) => (
                <div
                  key={est.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {est.imagen_url ? (
                      <img
                        src={est.imagen_url}
                        alt="Ecografía"
                        onClick={() => abrirModalZoom(est.imagen_url)}
                        className="w-16 h-16 rounded-xl object-cover bg-black cursor-pointer border border-slate-300 hover:opacity-90"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                        <MdLayers size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Ecografía Ovárica
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          est.resultado === "Cumple criterio"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {est.resultado === "Cumple criterio" ? "SOP" : "Normal"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">
                        {est.num_foliculos} folículos detectados
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {formatearFecha(est.created_at)}
                      </p>
                    </div>
                  </div>

                  {est.observacion_medico && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 line-clamp-2">
                      <strong>Nota:</strong> {est.observacion_medico}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ÁREA PRINCIPAL: CARGA Y RESULTADOS ── */}
      {!pacienteId ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[380px]">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-500">
            <MdPerson size={40} />
          </div>
          <h2 className="text-xl font-black text-slate-800">
            Selección de Paciente Requerida
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
            Para iniciar la evaluación ecográfica del Criterio 3 de Rotterdam, seleccione o busque a una paciente registrada en el recuadro superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── PANEL IZQUIERDO: Carga de Imagen (5 Cols) ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <MdUpload size={20} className="text-rose-600" />
                  <span>Carga de Ecografía Ovárica</span>
                </h3>
                <span className="text-[11px] font-bold text-rose-600 uppercase bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                  Ecografía Ovárica
                </span>
              </div>

              {/* Zona de Drop o Preview */}
              {!previewUrl ? (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 cursor-pointer transition-all min-h-[260px] ${
                    dragOver
                      ? "border-rose-500 bg-rose-50/60"
                      : "border-slate-300 hover:border-rose-400 hover:bg-slate-50 bg-slate-50/40"
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-3 text-rose-600">
                    <MdUpload size={32} />
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 text-center">
                    Arrastre la ecografía aquí o haga clic para buscar
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Formatos estándar JPG o PNG (Resolución clínica recomendada)
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black group">
                    <img
                      src={previewUrl}
                      alt="Ecografía previa"
                      className="w-full max-h-72 object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => abrirModalZoom(previewUrl)}
                        className="px-3.5 py-2 rounded-xl bg-white/90 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-lg hover:bg-white"
                      >
                        <MdZoomIn size={16} />
                        <span>Ampliar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                          setResult(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg hover:bg-rose-700"
                      >
                        <MdDelete size={16} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                    <span className="truncate max-w-[200px]">{file?.name}</span>
                    <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : ""}</span>
                  </div>
                </div>
              )}

              {/* Botón de Ejecutar Evaluación */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #f43f5e, #a855f7)",
                  boxShadow: "0 6px 20px rgba(244,63,94,0.3)",
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>
                      {analisisPaso === 1 && "Preprocesando y ajustando ecografía..."}
                      {analisisPaso === 2 && "Evaluando morfología ecográfica ovárica..."}
                      {analisisPaso === 3 && "Estimando recuento folicular y mapa de densidad..."}
                      {analisisPaso >= 4 && "Finalizando diagnóstico..."}
                    </span>
                  </>
                ) : (
                  <>
                    <MdOutlineAnalytics size={22} />
                    <span>Ejecutar Evaluación Ecográfica</span>
                  </>
                )}
              </button>

              {/* Mensaje de Error y Control de Calidad */}
              {error && (
                <div className="p-4 bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 rounded-2xl shadow-sm text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                    <div className="w-7 h-7 rounded-lg bg-rose-200/80 flex items-center justify-center text-rose-700 flex-shrink-0">
                      <MdCancel size={18} />
                    </div>
                    <span>Control de Calidad: Imagen Rechazada</span>
                  </div>
                  
                  <p className="text-rose-800 font-medium leading-relaxed pl-1">
                    {error}
                  </p>

                  <div className="pt-2 border-t border-rose-200/80 text-[11px] text-rose-900/90 space-y-1">
                    <strong className="font-bold flex items-center gap-1 text-rose-950">
                      <MdInfoOutline size={14} className="text-rose-600 flex-shrink-0" />
                      Requisitos para el estudio ecográfico:
                    </strong>
                    <ul className="list-disc list-inside space-y-0.5 text-rose-800/90 pl-1">
                      <li>Ecografía ovárica ginecológica en escala de grises (Modo-B).</li>
                      <li>Abordaje transvaginal o pélvico con foco en el estroma ovárico.</li>
                      <li>No se admiten fotos a color, radiografías ni ultrasonidos obstétricos fetales.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PANEL DERECHO: Resultados Clínicos (7 Cols) ── */}
          <div className="lg:col-span-7 space-y-6">
            {!result ? (
              error ? (
                <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50/40 p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[480px]">
                  <div className="w-20 h-20 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
                    <MdWarning size={42} />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 mb-2">
                    Estudio Bloqueado por Seguridad Médica
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Imagen Médica Fuera de Dominio Ovárico
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 max-w-md leading-relaxed">
                    El sistema de inteligencia artificial ha rechazado la imagen cargada para prevenir clasificaciones falsas y conteos foliculares erróneos en tejidos u objetos no ováricos.
                  </p>
                  <div className="mt-6 p-4 max-w-md w-full bg-white rounded-2xl border border-rose-200 text-left shadow-sm">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                      <MdCheckCircle className="text-emerald-600" size={16} />
                      ¿Cómo proceder?
                    </h4>
                    <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                      <li>Cargue una ecografía ginecológica real del ovario de la paciente.</li>
                      <li>Asegúrese de que el corte muestre el parénquima ovárico.</li>
                      <li>Presione nuevamente <strong>"Ejecutar Evaluación Ecográfica"</strong>.</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[480px]">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                    <MdCenterFocusStrong size={42} />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Esperando Ecografía para Análisis
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                    Cargue la imagen ecográfica del ovario en el panel izquierdo y presione <strong>"Ejecutar Evaluación Ecográfica"</strong> para obtener el dictamen según Criterios de Rotterdam.
                  </p>
                </div>
              )
            ) : (
              <>
                {/* ── DICTAMEN DIAGNÓSTICO ROTTERDAM ── */}
                <div className={`rounded-3xl p-6 sm:p-7 border shadow-sm ${
                  cumple
                    ? "bg-rose-50/70 border-rose-200"
                    : "bg-emerald-50/70 border-emerald-200"
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Dictamen Criterio 3 de Rotterdam
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded-lg border border-slate-200">
                      Estudio: Ecografía Ovárica
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-md ${
                      cumple ? "bg-rose-600" : "bg-emerald-600"
                    }`}>
                      {cumple ? <MdCancel size={32} /> : <MdCheckCircle size={32} />}
                    </div>
                    <div>
                      <h2 className={`text-xl sm:text-2xl font-black ${
                        cumple ? "text-rose-700" : "text-emerald-700"
                      }`}>
                        {cumple ? "Cumple Criterio de Morfología Poliquística (SOP)" : "No Cumple Criterio Poliquístico (Normal)"}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                        {cumple
                          ? "La ecografía presenta un patrón estromal y distribución folicular periférica compatible con el Criterio 3 de Rotterdam."
                          : "La estructura ovárica se encuentra dentro de los límites ecológicos normales, sin proliferación microquística subcapsular."}
                      </p>
                    </div>
                  </div>

                  {/* Tarjetas de Métricas Foliculares */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-200">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Antrales Pequeños (2-9 mm)
                      </span>
                      <p className="text-2xl font-black text-slate-900">
                        {result.foliculos_antrales_pequenos ?? result.num_foliculos}
                      </p>
                      <span className={`text-[11px] font-bold mt-0.5 block ${
                        (result.foliculos_antrales_pequenos ?? result.num_foliculos) >= 12
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}>
                        {(result.foliculos_antrales_pequenos ?? result.num_foliculos) >= 12 ? "≥12 (Positivo SOP)" : "Rango Normal"}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Folículo Dominante (18-24 mm)
                      </span>
                      <p className="text-2xl font-black text-slate-900">
                        {result.foliculos_dominante ?? (cumple ? 0 : 1)}
                      </p>
                      <span className={`text-[11px] font-bold mt-0.5 block ${cumple ? "text-slate-500" : "text-blue-600"}`}>
                        {cumple ? "Ausente (Anovulación)" : "Presente (Ovulatorio)"}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Patrón Estromal
                      </span>
                      <p className="text-xs font-black text-purple-700 mt-2 truncate">
                        {cumple ? "Collar de Perlas" : "Fisiológico Normal"}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {cumple ? "Distribución subcapsular" : "Dispersión uniforme"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── PROBABILIDADES ESTIMADAS ── */}
                <div className="rounded-3xl p-6 bg-white border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">
                    Probabilidad Predictiva Estimada
                  </h3>
                  <ProbBar
                    label="Morfología Poliquística Ovárica (SOP)"
                    pct={result.prob_sop_porcentaje ?? (result.prob_sop ? result.prob_sop * 100 : 0)}
                    barGradient="from-rose-500 to-purple-600"
                    textColor="text-rose-600"
                  />
                  <ProbBar
                    label="Morfología Ovárica Normal / Fisiológica"
                    pct={result.prob_normal_porcentaje ?? (result.prob_normal ? result.prob_normal * 100 : 0)}
                    barGradient="from-emerald-400 to-teal-600"
                    textColor="text-emerald-600"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SECCIÓN DE EXPLICABILIDAD GRAD-CAM Y COMPARADOR ── */}
      {result && result.mapa_calor_url && (
        <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MdLayers className="text-purple-600" size={22} />
                <h3 className="text-base font-black text-slate-900">
                  Mapeo Anatómico y Delineado Folicular (Grad-CAM)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualización de gradientes de densidad tisular y cápsulas foliculares identificadas.
              </p>
            </div>

            {/* Selector de Vista: GradCAM | Original | Doble */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setVistaImagen("gradcam")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  vistaImagen === "gradcam" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mapa Grad-CAM
              </button>
              <button
                type="button"
                onClick={() => setVistaImagen("original")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  vistaImagen === "original" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ecografía Original
              </button>
              <button
                type="button"
                onClick={() => setVistaImagen("split")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                  vistaImagen === "split" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MdCompare size={14} />
                <span>Comparación Doble</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Visualizador de Imágenes */}
            <div className="lg:col-span-7">
              {vistaImagen === "gradcam" && (
                <div className="rounded-3xl bg-slate-950 p-4 border border-slate-300 relative group text-center">
                  <img
                    src={result.mapa_calor_url}
                    alt="Mapa de calor Grad-CAM"
                    className="max-h-96 w-full object-contain rounded-2xl mx-auto"
                  />
                  <button
                    onClick={() => abrirModalZoom(result.mapa_calor_url!)}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition shadow-lg"
                    title="Ampliar en pantalla completa"
                  >
                    <MdZoomIn size={20} />
                  </button>
                  <p className="text-[11px] font-mono text-slate-400 mt-2">
                    Superposición Grad-CAM con contornos foliculares dorados
                  </p>
                </div>
              )}

              {vistaImagen === "original" && (
                <div className="rounded-3xl bg-slate-950 p-4 border border-slate-300 relative group text-center">
                  <img
                    src={result.imagen_url || previewUrl || ""}
                    alt="Ecografía original"
                    className="max-h-96 w-full object-contain rounded-2xl mx-auto"
                  />
                  <button
                    onClick={() => abrirModalZoom(result.imagen_url || previewUrl || "")}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition shadow-lg"
                    title="Ampliar en pantalla completa"
                  >
                    <MdZoomIn size={20} />
                  </button>
                  <p className="text-[11px] font-mono text-slate-400 mt-2">
                    Ecografía ovárica original en escala de grises
                  </p>
                </div>
              )}

              {vistaImagen === "split" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-950 p-3 border border-slate-300 text-center">
                    <img
                      src={result.imagen_url || previewUrl || ""}
                      alt="Original"
                      onClick={() => abrirModalZoom(result.imagen_url || previewUrl || "")}
                      className="max-h-64 w-full object-contain rounded-xl mx-auto cursor-pointer"
                    />
                    <p className="text-[10px] font-mono text-slate-400 mt-1.5">Original</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-3 border border-slate-300 text-center">
                    <img
                      src={result.mapa_calor_url}
                      alt="Grad-CAM"
                      onClick={() => abrirModalZoom(result.mapa_calor_url!)}
                      className="max-h-64 w-full object-contain rounded-xl mx-auto cursor-pointer"
                    />
                    <p className="text-[10px] font-mono text-slate-400 mt-1.5">Grad-CAM + Contornos</p>
                  </div>
                </div>
              )}
            </div>

            {/* Leyenda y Guía de Interpretación */}
            <div className="lg:col-span-5 space-y-4 bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Leyenda Anatómica e Interpretación Clínica
              </h4>

              <div className="space-y-3">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-3">
                  <span className="w-4 h-4 rounded-full bg-rose-500 flex-shrink-0 mt-0.5 shadow-sm" />
                  <div>
                    <h5 className="text-xs font-extrabold text-rose-700">Regiones Rojas / Cálidas</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Foco diagnóstico en áreas de estroma ovárico hiperdenso y periferia folicular.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-2xs flex items-start gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 mt-0.5 shadow-sm" />
                  <div>
                    <h5 className="text-xs font-extrabold text-amber-700">Contornos Dorados</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Delineado anatómico de la cápsula folicular (línea granulosa/teca). El interior anecoico (negro) contiene el líquido folicular.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-2xs flex items-start gap-3">
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 mt-0.5 shadow-sm" />
                  <div>
                    <h5 className="text-xs font-extrabold text-blue-700">Regiones Azules / Frías</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Parénquima ovárico o fondo sin alteraciones patológicas significativas.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic pt-1">
                * El análisis computarizado resalta las características morfológicas; el criterio clínico del especialista prevalece en todo momento.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── PANEL DE CONFIRMACIÓN MÉDICA DEFINITIVA ── */}
      {result && (
        <div className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Confirmación y Validación por el Especialista
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valide el resultado para incorporarlo de forma definitiva al expediente clínico y consulta de la paciente.
              </p>
            </div>
            {resultIdText && (
              <span className="text-xs font-mono text-slate-400 font-bold">
                ID Estudio: {resultIdText.slice(0, 8)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones Clínicas del Especialista (Opcional)
            </label>
            <textarea
              rows={3}
              value={observacionMedico}
              onChange={(e) => setObservacionMedico(e.target.value)}
              disabled={validationDone}
              placeholder="Ej: Se observa patrón de folículos periféricos subcapsulares con estroma central prominente. Compatible con Criterio 3 de Rotterdam..."
              className="w-full border border-slate-300 rounded-2xl p-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-sm bg-white disabled:bg-slate-50"
            />
          </div>

          {validationDone ? (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              validationLabel === "SOP"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}>
              <MdCheckCircle size={24} className="flex-shrink-0" />
              <div>
                <p className="text-sm font-extrabold">
                  Estudio validado exitosamente como: {validationLabel === "SOP" ? "SOP (Cumple Rotterdam 3)" : "Normal (Sin alteración)"}
                </p>
                <p className="text-xs font-medium opacity-90 mt-0.5">
                  Registrado en el historial clínico de {pacienteSeleccionado?.nombre} {pacienteSeleccionado?.primer_apellido}.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleValidar("SOP")}
                disabled={validating}
                className="py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <MdCheck size={18} />
                <span>Confirmar Dictamen: Cumple Criterio SOP</span>
              </button>
              <button
                type="button"
                onClick={() => handleValidar("Normal")}
                disabled={validating}
                className="py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <MdCheck size={18} />
                <span>Confirmar Dictamen: Morfología Normal</span>
              </button>
            </div>
          )}

          {validationError && (
            <p className="text-xs font-bold text-rose-600">{validationError}</p>
          )}
        </div>
      )}

      {/* ── MODAL DE ZOOM / PANTALLA COMPLETA ── */}
      {imagenModalZoom && (
        <div
          onClick={() => setImagenModalZoom(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in"
        >
          <div
            className="relative w-full max-w-6xl h-[90vh] bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Visor Clínico */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-800/80 bg-slate-900/80 z-20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <MdZoomIn size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Visor Ecográfico de Alta Resolución</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Ampliación Médica
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Examine con precisión contornos foliculares subcapsulares, estroma ovárico y ecogenicidad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700 shadow-inner">
                  {Math.round(zoomNivel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImagenModalZoom(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition shadow-sm"
                  title="Cerrar visor"
                >
                  <MdClose size={22} />
                </button>
              </div>
            </div>

            {/* Viewport Interactivo con Pan y Drag */}
            <div
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - posicionPan.x, y: e.clientY - posicionPan.y });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                setPosicionPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                  handleZoomIn();
                } else {
                  handleZoomOut();
                }
              }}
              className={`flex-1 flex items-center justify-center overflow-hidden relative select-none ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{
                backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              <div
                style={{
                  transform: `translate(${posicionPan.x}px, ${posicionPan.y}px) scale(${zoomNivel})`,
                  transition: isDragging ? "none" : "transform 0.12s ease-out",
                  transformOrigin: "center center",
                }}
                className="flex items-center justify-center p-4"
              >
                <img
                  src={imagenModalZoom}
                  alt="Ecografía ampliada"
                  draggable={false}
                  className="max-h-[72vh] max-w-[85vw] w-auto h-auto min-w-[420px] sm:min-w-[540px] md:min-w-[620px] object-contain rounded-2xl shadow-2xl border border-slate-800 pointer-events-none"
                  style={{
                    imageRendering: "auto",
                    boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9)",
                  }}
                />
              </div>
            </div>

            {/* Barra de Herramientas Inferior */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-7 py-3 border-t border-slate-800/80 bg-slate-900/90 z-20">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hidden sm:inline">Rueda del ratón para ampliar · Arrastre con el cursor para explorar cada área.</span>
                <span className="sm:hidden">Arrastre para explorar.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-bold"
                  title="Reducir zoom (-)"
                >
                  <MdZoomOut size={18} />
                </button>

                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleResetZoom(1.0)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      zoomNivel === 1.0 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetZoom(1.8)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      zoomNivel === 1.8 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    180%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetZoom(2.5)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      zoomNivel === 2.5 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    250%
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-bold"
                  title="Aumentar zoom (+)"
                >
                  <MdZoomIn size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => handleResetZoom(1.0)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                  title="Centrar y reajustar"
                >
                  <MdRestartAlt size={16} />
                  <span className="hidden sm:inline">Centrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Analysis;