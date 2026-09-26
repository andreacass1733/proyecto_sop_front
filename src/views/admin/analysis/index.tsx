import React, { useState, useEffect } from "react";
import {
  MdUpload, MdWarning, MdCheckCircle,
  MdCancel, MdOutlineAnalytics, MdCenterFocusStrong, MdPerson, MdDelete, MdLayers,
} from "react-icons/md";
import {
  predecirImagen,
  validarImagen,
  listarPacientes,
  PrediccionResponse,
  PacienteListItem,
} from "services/api";

// ── Barra de probabilidad Médica ──────────────────────────────────────────
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
    <div className="mb-6 last:mb-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${barGradient.split(" ")[0].replace("from-", "bg-")}`} />
          {label}
        </span>
        <span className={`text-base font-bold ${textColor} font-mono tracking-tight`}>
          {safePct.toFixed(1)}%
        </span>
      </div>
      <div className="h-3.5 bg-slate-100 dark:bg-navy-900/80 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-navy-700/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
};

// ── Componente Principal ──────────────────────────────────────────────────
const Analysis = () => {
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [pacienteId, setPacienteId] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrediccionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Validación clínica
  const [validating, setValidating] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [validationLabel, setValidationLabel] = useState<"SOP" | "Normal" | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const cargarListaPacientes = async () => {
      try {
        const lista = await listarPacientes();
        setPacientes(lista);
      } catch (err) {
        console.error("Error al cargar lista de pacientes:", err);
      }
    };
    cargarListaPacientes();
  }, []);

  const handleFile = (selected: File) => {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setValidationDone(false);
    setValidationLabel(null);
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

  const handleAnalyze = async () => {
    if (!file || !pacienteId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setValidationDone(false);
    setValidationLabel(null);
    setValidationError(null);

    try {
      const data = await predecirImagen(file, pacienteId, undefined, "izquierdo");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar la ecografía médica.");
    } finally {
      setLoading(false);
    }
  };

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
      });
      setValidationLabel(etiqueta);
      setValidationDone(true);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "No se pudo registrar la validación médica.");
    } finally {
      setValidating(false);
    }
  };

  const cumple = result?.resultado === "Cumple criterio";
  const resultIdText = result?.id ? String(result.id) : null;
  const pacienteSeleccionado = pacientes.find((p) => p.id === pacienteId);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50/50 dark:bg-navy-950 p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">

        {/* ── HEADER CLÍNICO ── */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-sm font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Criterio Rotterdam 3
                </span>
                <span className="bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold px-3 py-1 rounded-full border border-slate-200 dark:border-navy-600">
                  Evaluación Ecográfica Avanzada
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Evaluación de Morfología Ovárica
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5 max-w-4xl leading-relaxed">
                Análisis asistido de ecografía ovárica acoplado a la paciente para cuantificación folicular de Ovario Izquierdo y Derecho.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-3.5 self-start md:self-auto">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Módulo Ecográfico Activo</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Conectado con Pacientes</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── SELECCIÓN DE PACIENTE VINCULADA ── */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
            <MdPerson className="text-brand-500" size={18} />
            Seleccionar Paciente para la Evaluación Ecográfica *
          </label>
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">-- Seleccionar Paciente Registrada --</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.primer_apellido} ({p.ci || "Sin CI"})
              </option>
            ))}
          </select>
          {pacienteSeleccionado && (
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Estudio ecográfico vinculado a: {pacienteSeleccionado.nombre} {pacienteSeleccionado.primer_apellido}
            </p>
          )}
        </div>

        {/* ── MENSAJE SI NO HA SELECCIONADO PACIENTE ── */}
        {!pacienteId ? (
          <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[360px]">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-5 text-amber-500">
              <MdPerson size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Selección de Paciente Requerida
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg leading-relaxed">
              Por favor, seleccione una paciente registrada en la lista desplegable superior para habilitar el panel de evaluación ecográfica y vincular el estudio a su expediente clínico.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* ── GRID PRINCIPAL ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── PANEL IZQUIERDO: Carga de Imagen (5 COLS) ── */}
            <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-6 sm:p-7 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MdUpload className="text-pink-500" size={20} />
                Imagen Ecográfica de la Paciente
              </h2>

              {/* Subida vs Vista Previa limpia */}
              {!previewUrl ? (
                /* Zona de Arrastre cuando NO hay imagen */
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all min-h-[220px]
                    ${dragOver
                      ? "border-pink-500 bg-pink-50/50 dark:bg-pink-900/10"
                      : "border-slate-200 dark:border-navy-600 hover:border-pink-400 hover:bg-slate-50 dark:hover:bg-navy-700/50"
                    }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center mb-3">
                    <MdUpload className="text-pink-500" size={32} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
                    Cargar ecografía clínica de la paciente
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">
                    JPG, PNG (Máx. 10MB)
                  </p>
                  <input type="file" accept="image/jpeg,image/png" onChange={handleImageUpload} className="hidden" />
                </label>
              ) : (
                /* Vista Previa limpia cuando SÍ hay imagen cargada */
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-navy-700 bg-slate-950 p-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[220px]">
                      {file?.name || "Ecografía Carga"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                        setResult(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900 px-3 py-1.5 rounded-xl border border-rose-800/60 transition"
                    >
                      <MdDelete size={16} /> Eliminar Imagen
                    </button>
                  </div>
                  <img src={previewUrl} alt="Ecografía subida" className="max-h-80 w-full object-contain rounded-xl" />
                </div>
              )}

              {/* Botón Iniciar Evaluación */}
              <button
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="mt-6 w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:via-rose-600 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Analizando ecografía ovárica...</span>
                  </>
                ) : (
                  <>
                    <MdOutlineAnalytics size={20} />
                    <span>Ejecutar Evaluación Médica</span>
                  </>
                )}
              </button>

              {/* Banner de Error */}
              {error && (
                <div className="mt-4 flex items-start gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-xl">
                  <MdWarning className="text-rose-500 mt-0.5 flex-shrink-0" size={20} />
                  <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── PANEL DERECHO: Informe de Resultados (7 COLS) ── */}
          <div className="lg:col-span-7 space-y-6">
            {!result ? (
              <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[480px]">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-navy-900/50 border border-slate-100 dark:border-navy-700 flex items-center justify-center mb-4 text-slate-300 dark:text-navy-600">
                  <MdCenterFocusStrong size={40} />
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  Esperando Ecografía para Evaluación
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-md leading-relaxed">
                  Cargue un estudio ecográfico en el panel izquierdo y seleccione <span className="font-semibold text-pink-600">Ejecutar Evaluación Médica</span>.
                </p>
              </div>
            ) : (
              <>
                {/* ── Resultado Clínico ── */}
                <div className={`rounded-3xl border p-7 sm:p-8 shadow-sm ${
                  cumple
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Informe de Evaluación Asistida
                    </span>
                    {resultIdText && (
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                        N° Estudio: {resultIdText.slice(0, 8)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white ${
                      cumple ? "bg-rose-500" : "bg-emerald-500"
                    }`}>
                      {cumple ? <MdCancel size={32} /> : <MdCheckCircle size={32} />}
                    </div>
                    <div>
                      <h2 className={`text-2xl sm:text-3xl font-extrabold ${
                        cumple ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {cumple ? "Cumple Criterio de Morfología Poliquística (SOP)" : "No Cumple Criterio de Morfología Poliquística"}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {cumple
                          ? "La ecografía presenta características compatibles con el Criterio 3 de Rotterdam (patrón periférico / folicular aumentado)."
                          : "La estructura ovárica se encuentra dentro de los límites ecológicos normales."}
                      </p>
                    </div>
                  </div>

                  {/* ── CONTEO TOTAL DE FOLÍCULOS ECOGRÁFICOS ── */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-5 border-t border-slate-200/60 dark:border-navy-700/60">
                    <div className="bg-pink-50/80 dark:bg-pink-950/30 rounded-2xl p-4.5 border border-pink-200 dark:border-pink-800/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">Folículos Totales Estimados</p>
                      <p className="text-3xl font-extrabold text-pink-600 dark:text-pink-400 mt-1">
                        {result.num_foliculos} <span className="text-xs font-normal text-slate-500">folículos antrales</span>
                      </p>
                      {cumple ? (
                        result.num_foliculos >= 12 ? (
                          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                            ⚠ Patrón SOP (Elevado: ≥ 12 folículos)
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            ⚠ Morfología SOP por IA (Revisión de folículos recomendada)
                          </p>
                        )
                      ) : (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                          ✓ Normal (Fisiológico: &lt; 12 folículos)
                        </p>
                      )}
                    </div>

                    <div className="bg-white dark:bg-navy-900/60 rounded-2xl p-4.5 border border-slate-200/60 dark:border-navy-700/50 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Umbral Criterio Rotterdam</p>
                        <p className="text-base font-bold text-slate-800 dark:text-white mt-1">
                          ≥ 12 folículos <span className="text-xs font-normal text-slate-400">(2-9 mm)</span>
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-2">
                        Un ovario sano contiene folículos normales (&lt;12). El SOP se diagnostica por exceso folicular.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Probabilidades Estadísticas ── */}
                <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-7 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">
                    Probabilidad Estimada por Categoría
                  </h3>
                  <ProbBar
                    label="Morfología Poliquística Ovárica (SOP)"
                    pct={result.prob_sop_porcentaje ?? (result.prob_sop ? result.prob_sop * 100 : 0)}
                    barGradient="from-rose-500 to-pink-600"
                    textColor="text-rose-600 dark:text-rose-400"
                  />
                  <ProbBar
                    label="Morfología Ovárica Normal"
                    pct={result.prob_normal_porcentaje ?? (result.prob_normal ? result.prob_normal * 100 : 0)}
                    barGradient="from-emerald-400 to-emerald-600"
                    textColor="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── SECCIÓN INFERIOR DE ANCHO COMPLETO (100% WIDTH - SIN ESPACIO BLANCO EN EL LADO IZQUIERDO) ── */}
        {result && (
          <div className="w-full space-y-6 pt-2">
            
            {/* ── Mapa de Calor Grad-CAM con Guía Clínica Lado a Lado (ANCHO COMPLETO) ── */}
            {result.mapa_calor_url && (
              <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-7 shadow-sm space-y-4 w-full">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700/60 pb-3.5">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <MdLayers className="text-pink-500" size={18} />
                    Mapa de Atención e Interpretación Visual (Grad-CAM)
                  </h3>
                  <span className="text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
                    Explicabilidad IA
                  </span>
                </div>

                {/* ESTRUCTURA INTERNA LADO A LADO: IZQUIERDA IMAGEN | DERECHA ETIQUETAS Y GUÍA */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch pt-1">
                  
                  {/* ── IZQUIERDA: Imagen del Mapa de Calor (5 COLS) ── */}
                  <div className="md:col-span-5 flex flex-col justify-center bg-slate-950 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 overflow-hidden shadow-inner min-h-[300px]">
                    <img
                      src={result.mapa_calor_url}
                      alt="Mapa de calor de atención en ecografía"
                      className="max-h-80 w-full object-contain rounded-xl"
                    />
                    <p className="text-[11px] text-slate-400 text-center mt-2 font-mono">
                      Superposición Saliency Map Grad-CAM
                    </p>
                  </div>

                  {/* ── DERECHA: Etiquetas y Guía de Interpretación (7 COLS) ── */}
                  <div className="md:col-span-7 bg-slate-50 dark:bg-navy-900/60 rounded-2xl p-5 sm:p-6 border border-slate-200/60 dark:border-navy-700/60 flex flex-col justify-between space-y-4">
                    
                    {/* Encabezado de la Guía */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        💡
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          Guía de Interpretación para el Especialista
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Muestra las áreas focales donde la red neuronal basó su diagnóstico de la ecografía.
                        </p>
                      </div>
                    </div>

                    {/* Tarjetas de Etiquetas de Colores Apiladas */}
                    <div className="space-y-3">
                      {/* Zona Roja */}
                      <div className="bg-white dark:bg-navy-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-navy-700 flex items-start gap-3 shadow-2xs">
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Zonas Rojas (Alta Atención)</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            Máximo interés diagnóstico: distribución folicular periférica (patrón en collar de perlas) y estroma denso.
                          </p>
                        </div>
                      </div>

                      {/* Zona Amarilla */}
                      <div className="bg-white dark:bg-navy-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-navy-700 flex items-start gap-3 shadow-2xs">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Zonas Amarillas (Media)</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            Estructuras ecogénicas intermedias o bordes de folículos secundarios analizados.
                          </p>
                        </div>
                      </div>

                      {/* Zona Azul */}
                      <div className="bg-white dark:bg-navy-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-navy-700 flex items-start gap-3 shadow-2xs">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Zonas Azules (Baja / Nula)</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            Fondo ecográfico o parénquima de baja significancia diagnóstica.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ── Validación Médica Real (ANCHO COMPLETO) ── */}
            <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200/80 dark:border-navy-700 p-7 shadow-sm w-full">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Confirmación del Diagnóstico Médico
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Registre su diagnóstico profesional definitivo para respaldar el registro clínico.
              </p>

              {validationDone ? (
                <div className={`flex items-center gap-3 rounded-2xl p-4.5 border ${
                  validationLabel === "SOP"
                    ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700 dark:text-emerald-300"
                }`}>
                  <MdCheckCircle size={24} className="flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">
                      Diagnóstico confirmado: {validationLabel === "SOP" ? "SOP (Cumple criterio)" : "Normal (Sin alteración)"}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      Su validación profesional fue registrada en el historial clínico.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleValidar("SOP")}
                    disabled={validating || !resultIdText}
                    className="flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs sm:text-sm py-3.5 rounded-2xl transition-all disabled:opacity-40"
                  >
                    {validating ? "Registrando..." : "Confirmar Criterio SOP"}
                  </button>
                  <button
                    onClick={() => handleValidar("Normal")}
                    disabled={validating || !resultIdText}
                    className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-xs sm:text-sm py-3.5 rounded-2xl transition-all disabled:opacity-40"
                  >
                    {validating ? "Registrando..." : "Confirmar Como Normal"}
                  </button>
                </div>
              )}

              {validationError && (
                <p className="mt-3 text-xs text-rose-500 font-medium">{validationError}</p>
              )}
            </div>

            {/* Disclaimer Profesional (ANCHO COMPLETO) */}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 text-xs sm:text-sm text-amber-700 dark:text-amber-400 leading-relaxed w-full">
              <MdWarning className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
              <span>
                <strong>Nota Médica:</strong> Este sistema constituye una herramienta de apoyo asistencial. Las decisiones clínicas deben basarse en la evaluación integral del especialista.
              </span>
            </div>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;