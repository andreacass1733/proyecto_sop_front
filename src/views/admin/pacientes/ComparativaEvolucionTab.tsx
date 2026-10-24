import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MdCompareArrows,
  MdTimeline,
  MdTrendingDown,
  MdTrendingUp,
  MdTrendingFlat,
  MdCheckCircle,
  MdInfo,
  MdPrint,
  MdRefresh,
  MdPerson,
  MdSearch,
  MdScience,
  MdSpeed,
  MdMonitorWeight,
} from "react-icons/md";
import {
  PacienteListItem,
  listarPacientes,
  obtenerComparativaConsultas,
  ComparativaEvolucionOut,
} from "services/api";

interface ComparativaEvolucionTabProps {
  paciente: PacienteListItem | null;
  onNavigateToTab?: (tab: string) => void;
  onSelectPaciente?: (p: PacienteListItem) => void;
}

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

export default function ComparativaEvolucionTab({
  paciente,
  onNavigateToTab,
  onSelectPaciente,
}: ComparativaEvolucionTabProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [datosComparativa, setDatosComparativa] = useState<ComparativaEvolucionOut | null>(null);
  const [errorApi, setErrorApi] = useState<string | null>(null);

  // Selector de pacientes
  const [listaPacientes, setListaPacientes] = useState<PacienteListItem[]>([]);
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState(false);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");

  // Selección de consultas específicas para comparar (por defecto primera vs última)
  const [idConsultaBase, setIdConsultaBase] = useState<string>("");
  const [idConsultaSeguimiento, setIdConsultaSeguimiento] = useState<string>("");

  useEffect(() => {
    listarPacientes("", null, 1, 100)
      .then((data) => setListaPacientes(data))
      .catch((err) => console.error("Error al cargar pacientes para comparativa:", err));
  }, []);

  const cargarComparativa = useCallback(async () => {
    if (!paciente?.id) return;
    setLoading(true);
    setErrorApi(null);
    try {
      const data = await obtenerComparativaConsultas(paciente.id);
      setDatosComparativa(data);
      if (data.consultas && data.consultas.length >= 2) {
        setIdConsultaBase(data.consultas[0].consulta_id);
        setIdConsultaSeguimiento(data.consultas[data.consultas.length - 1].consulta_id);
      } else if (data.consultas && data.consultas.length === 1) {
        setIdConsultaBase(data.consultas[0].consulta_id);
      }
    } catch (err: any) {
      setErrorApi(err.message || "Error al cargar la comparativa de la paciente.");
    } finally {
      setLoading(false);
    }
  }, [paciente?.id]);

  useEffect(() => {
    cargarComparativa();
  }, [cargarComparativa]);

  const consultaBase = useMemo(() => {
    if (!datosComparativa?.consultas) return null;
    return datosComparativa.consultas.find((c) => c.consulta_id === idConsultaBase) || datosComparativa.consultas[0] || null;
  }, [datosComparativa, idConsultaBase]);

  const consultaSeguimiento = useMemo(() => {
    if (!datosComparativa?.consultas) return null;
    return (
      datosComparativa.consultas.find((c) => c.consulta_id === idConsultaSeguimiento) ||
      datosComparativa.consultas[datosComparativa.consultas.length - 1] ||
      null
    );
  }, [datosComparativa, idConsultaSeguimiento]);

  // Cálculo dinámico de delta entre el par de consultas seleccionado
  const calcularDeltaPar = (valAct?: number, valIni?: number, unidad = "", menorEsMejor = true) => {
    if (valAct === undefined || valAct === null || valIni === undefined || valIni === null) return null;
    const diff = Number((valAct - valIni).toFixed(2));
    if (diff === 0) {
      return {
        diferencia: 0,
        unidad,
        tendencia: "estable",
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        icono: <MdTrendingFlat className="text-slate-500" size={16} />,
        texto: "Sin variación",
      };
    }
    const esMejoria = (diff < 0 && menorEsMejor) || (diff > 0 && !menorEsMejor);
    return {
      diferencia: diff,
      unidad,
      tendencia: esMejoria ? "mejoria" : "alerta",
      badge: esMejoria
        ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
        : "bg-rose-50 text-rose-800 border-rose-200 font-bold",
      icono: esMejoria ? (
        <MdTrendingDown className="text-emerald-600" size={18} />
      ) : (
        <MdTrendingUp className="text-rose-600" size={18} />
      ),
      texto: `${diff > 0 ? "+" : ""}${diff} ${unidad}`.trim(),
    };
  };

  const nombrePaciente = paciente
    ? `${paciente.nombre} ${paciente.primer_apellido} ${paciente.segundo_apellido || ""}`
    : "Paciente en Consulta";
  const ciPaciente = paciente?.ci || "—";
  const iniciales = paciente
    ? `${paciente.nombre.charAt(0)}${paciente.primer_apellido.charAt(0)}`
    : "EV";
  const edad = paciente?.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : null;

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO MÉDICO UNIFICADO (COMPARATIVA HU-019) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                HU-019: Comparativa y Evolución Temporal
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
          {/* Selector de Paciente */}
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
            onClick={cargarComparativa}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm disabled:opacity-50"
            title="Recargar comparativa evolutiva"
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shadow-sm"
          >
            <MdPrint size={16} />
            <span>Imprimir Comparativa</span>
          </button>
        </div>
      </div>

      {/* ── ALERTA INFORMATIVA SI LA PACIENTE TIENE MENOS DE 2 CONSULTAS (HU-019 CRITERIO 4) ── */}
      {datosComparativa && !datosComparativa.habilitada && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-3xl p-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <MdInfo size={32} />
          </div>
          <div className="max-w-xl mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-amber-900">
              Se requieren al menos dos consultas registradas para la comparativa
            </h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {datosComparativa.mensaje} Actualmente la paciente cuenta con{" "}
              <strong>{datosComparativa.total_consultas} consulta(s)</strong> registrada(s). Programe una nueva atención o registre la evaluación clínica y de laboratorio para habilitar el seguimiento longitudinal de variables y fenotipo Rotterdam.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateToTab?.("xgboost")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm"
            >
              Registrar Evaluación Criterios 1-2 →
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab?.("ecografia")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 transition shadow-sm"
            >
              Cargar Ecografía Criterio 3 →
            </button>
          </div>
        </div>
      )}

      {/* ── COMPARATIVA COMPLETA CUANDO HAY 2 O MÁS CONSULTAS (HU-019) ── */}
      {datosComparativa && datosComparativa.habilitada && (
        <div className="space-y-6">
          {/* BANNER DE SÍNTESIS Y SELECTOR DE INTERVALO */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-200 border border-purple-300/30">
                  Resumen de Evolución Médica Longitudinal
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Comparativa de Respuesta Terapéutica y Biomarcadores
                </h3>
                <p className="text-xs text-purple-200/90 max-w-2xl">
                  {datosComparativa.resumen_clinico}
                </p>
              </div>

              {/* Selectores de Consultas para Comparar */}
              <div className="flex items-center gap-2 flex-wrap bg-white/10 p-2.5 rounded-2xl border border-white/15">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 block">
                    Consulta Base (Inicial)
                  </span>
                  <select
                    value={idConsultaBase}
                    onChange={(e) => setIdConsultaBase(e.target.value)}
                    className="text-xs font-bold bg-slate-900 text-white rounded-xl px-2.5 py-1.5 border border-purple-400/30 focus:outline-none"
                  >
                    {datosComparativa.consultas.map((c, idx) => (
                      <option key={c.consulta_id} value={c.consulta_id}>
                        {`C${idx + 1} (${new Date(c.fecha).toLocaleDateString()}) - ${c.motivo.slice(0, 20)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-purple-300 font-bold px-1 self-center pt-3">
                  <MdCompareArrows size={22} />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 block">
                    Consulta de Seguimiento
                  </span>
                  <select
                    value={idConsultaSeguimiento}
                    onChange={(e) => setIdConsultaSeguimiento(e.target.value)}
                    className="text-xs font-bold bg-slate-900 text-white rounded-xl px-2.5 py-1.5 border border-purple-400/30 focus:outline-none"
                  >
                    {datosComparativa.consultas.map((c, idx) => (
                      <option key={c.consulta_id} value={c.consulta_id}>
                        {`C${idx + 1} (${new Date(c.fecha).toLocaleDateString()}) - ${c.motivo.slice(0, 20)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── TARJETAS MÉTRICAS DE BIOMARCADORES CON TENDENCIAS (HU-019 CRITERIO 2 Y 3) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* IMC */}
            {(() => {
              const delta = calcularDeltaPar(consultaSeguimiento?.imc, consultaBase?.imc, "kg/m²", true);
              return (
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-black uppercase tracking-wider">IMC</span>
                    <MdMonitorWeight size={18} className="text-purple-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-lg font-black text-slate-900">
                      {consultaSeguimiento?.imc ? `${consultaSeguimiento.imc} kg/m²` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Base: {consultaBase?.imc ? `${consultaBase.imc}` : "—"}
                    </div>
                  </div>
                  {delta && (
                    <div className={`px-2 py-1 rounded-xl text-[11px] border flex items-center justify-between ${delta.badge}`}>
                      <span>{delta.texto}</span>
                      {delta.icono}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* RELACIÓN LH / FSH */}
            {(() => {
              const delta = calcularDeltaPar(consultaSeguimiento?.relacion_lh_fsh, consultaBase?.relacion_lh_fsh, "", true);
              return (
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-black uppercase tracking-wider">LH / FSH</span>
                    <MdScience size={18} className="text-indigo-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-lg font-black text-slate-900">
                      {consultaSeguimiento?.relacion_lh_fsh ? `${consultaSeguimiento.relacion_lh_fsh}` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Base: {consultaBase?.relacion_lh_fsh ? `${consultaBase.relacion_lh_fsh}` : "—"}
                    </div>
                  </div>
                  {delta && (
                    <div className={`px-2 py-1 rounded-xl text-[11px] border flex items-center justify-between ${delta.badge}`}>
                      <span>{delta.texto}</span>
                      {delta.icono}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TESTOSTERONA TOTAL */}
            {(() => {
              const delta = calcularDeltaPar(consultaSeguimiento?.testosterona_total, consultaBase?.testosterona_total, "ng/dL", true);
              return (
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-black uppercase tracking-wider">Testosterona</span>
                    <MdSpeed size={18} className="text-pink-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-lg font-black text-slate-900">
                      {consultaSeguimiento?.testosterona_total ? `${consultaSeguimiento.testosterona_total}` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Base: {consultaBase?.testosterona_total ? `${consultaBase.testosterona_total}` : "—"}
                    </div>
                  </div>
                  {delta && (
                    <div className={`px-2 py-1 rounded-xl text-[11px] border flex items-center justify-between ${delta.badge}`}>
                      <span>{delta.texto}</span>
                      {delta.icono}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SCORE FERRIMAN-GALLWEY */}
            {(() => {
              const delta = calcularDeltaPar(consultaSeguimiento?.score_ferriman_gallwey, consultaBase?.score_ferriman_gallwey, "pts", true);
              return (
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-black uppercase tracking-wider">Ferriman-G.</span>
                    <MdTimeline size={18} className="text-amber-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-lg font-black text-slate-900">
                      {consultaSeguimiento?.score_ferriman_gallwey !== undefined && consultaSeguimiento?.score_ferriman_gallwey !== null ? `${consultaSeguimiento.score_ferriman_gallwey} pts` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Base: {consultaBase?.score_ferriman_gallwey !== undefined ? `${consultaBase.score_ferriman_gallwey}` : "—"}
                    </div>
                  </div>
                  {delta && (
                    <div className={`px-2 py-1 rounded-xl text-[11px] border flex items-center justify-between ${delta.badge}`}>
                      <span>{delta.texto}</span>
                      {delta.icono}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* HOMA-IR */}
            {(() => {
              const delta = calcularDeltaPar(consultaSeguimiento?.homa_ir, consultaBase?.homa_ir, "", true);
              return (
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-black uppercase tracking-wider">HOMA-IR</span>
                    <MdCheckCircle size={18} className="text-teal-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-lg font-black text-slate-900">
                      {consultaSeguimiento?.homa_ir ? `${consultaSeguimiento.homa_ir}` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Base: {consultaBase?.homa_ir ? `${consultaBase.homa_ir}` : "—"}
                    </div>
                  </div>
                  {delta && (
                    <div className={`px-2 py-1 rounded-xl text-[11px] border flex items-center justify-between ${delta.badge}`}>
                      <span>{delta.texto}</span>
                      {delta.icono}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* CONTEO FOLICULAR ECOGRÁFICO */}
            {(() => {
              const delta = calcularDeltaPar(consultaSeguimiento?.num_foliculos, consultaBase?.num_foliculos, "fol.", true);
              return (
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-black uppercase tracking-wider">Folículos</span>
                    <MdScience size={18} className="text-rose-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-lg font-black text-slate-900">
                      {consultaSeguimiento?.num_foliculos ? `${consultaSeguimiento.num_foliculos}` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Base: {consultaBase?.num_foliculos ? `${consultaBase.num_foliculos}` : "—"}
                    </div>
                  </div>
                  {delta && (
                    <div className={`px-2 py-1 rounded-xl text-[11px] border flex items-center justify-between ${delta.badge}`}>
                      <span>{delta.texto}</span>
                      {delta.icono}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── TABLA COMPARATIVA LADO A LADO SEGÚN ESPECIFICACIÓN HU-019 ── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MdCompareArrows className="text-purple-600" size={20} />
                <h3 className="font-black text-slate-900 text-sm">
                  Matriz Comparativa Longitudinal de Variables Clínicas y Hormonales
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Consenso ESHRE / Rotterdam 2023
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black bg-slate-50/70">
                    <th className="py-3 px-4">Parámetro Clínico / Biomarcador</th>
                    <th className="py-3 px-4">
                      {`Consulta Base (${consultaBase ? new Date(consultaBase.fecha).toLocaleDateString() : "—"})`}
                    </th>
                    <th className="py-3 px-4">
                      {`Consulta Actual (${consultaSeguimiento ? new Date(consultaSeguimiento.fecha).toLocaleDateString() : "—"})`}
                    </th>
                    <th className="py-3 px-4">Variación Neta (Δ)</th>
                    <th className="py-3 px-4">Tendencia / Impacto Clínico</th>
                    <th className="py-3 px-4">Rango / Meta Internacional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {/* FENOTIPO ROTTERDAM */}
                  <tr className="bg-purple-50/30">
                    <td className="py-3 px-4 font-black text-purple-900">Fenotipo Rotterdam</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{consultaBase?.fenotipo_rotterdam || "Sin Evaluar"}</td>
                    <td className="py-3 px-4 font-bold text-purple-700">{consultaSeguimiento?.fenotipo_rotterdam || "Sin Evaluar"}</td>
                    <td className="py-3 px-4 text-slate-500">—</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                        {consultaSeguimiento?.fenotipo_rotterdam || "En Seguimiento"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">Consenso Rotterdam (≥2 de 3)</td>
                  </tr>

                  {/* IMC */}
                  <tr>
                    <td className="py-3 px-4 font-bold">Índice de Masa Corporal (IMC)</td>
                    <td className="py-3 px-4">{consultaBase?.imc ? `${consultaBase.imc} kg/m²` : "—"}</td>
                    <td className="py-3 px-4">{consultaSeguimiento?.imc ? `${consultaSeguimiento.imc} kg/m²` : "—"}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.imc, consultaBase?.imc, "kg/m²", true);
                        return d ? <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${d.badge}`}>{d.texto}</span> : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.imc, consultaBase?.imc, "", true);
                        return d ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${d.tendencia === "mejoria" ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.icono} {d.tendencia === "mejoria" ? "Descenso favorable" : "Aumento de riesgo"}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">18.5 – 24.9 kg/m²</td>
                  </tr>

                  {/* FERRIMAN GALLWEY */}
                  <tr>
                    <td className="py-3 px-4 font-bold">Escala Ferriman-Gallwey (Hirsutismo)</td>
                    <td className="py-3 px-4">{consultaBase?.score_ferriman_gallwey !== undefined ? `${consultaBase.score_ferriman_gallwey} pts` : "—"}</td>
                    <td className="py-3 px-4">{consultaSeguimiento?.score_ferriman_gallwey !== undefined ? `${consultaSeguimiento.score_ferriman_gallwey} pts` : "—"}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.score_ferriman_gallwey, consultaBase?.score_ferriman_gallwey, "pts", true);
                        return d ? <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${d.badge}`}>{d.texto}</span> : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.score_ferriman_gallwey, consultaBase?.score_ferriman_gallwey, "", true);
                        return d ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${d.tendencia === "mejoria" ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.icono} {d.tendencia === "mejoria" ? "Reducción pilosa" : "Aumento piloso"}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">&lt; 8 puntos (Normal)</td>
                  </tr>

                  {/* RELACIÓN LH / FSH */}
                  <tr>
                    <td className="py-3 px-4 font-bold">Relación Gonadotrópica LH / FSH</td>
                    <td className="py-3 px-4">{consultaBase?.relacion_lh_fsh ? `${consultaBase.relacion_lh_fsh}` : "—"}</td>
                    <td className="py-3 px-4">{consultaSeguimiento?.relacion_lh_fsh ? `${consultaSeguimiento.relacion_lh_fsh}` : "—"}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.relacion_lh_fsh, consultaBase?.relacion_lh_fsh, "", true);
                        return d ? <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${d.badge}`}>{d.texto}</span> : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.relacion_lh_fsh, consultaBase?.relacion_lh_fsh, "", true);
                        return d ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${d.tendencia === "mejoria" ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.icono} {d.tendencia === "mejoria" ? "Balance hormonal" : "Desbalance androgénico"}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">&lt; 2.0 (Normal)</td>
                  </tr>

                  {/* TESTOSTERONA TOTAL */}
                  <tr>
                    <td className="py-3 px-4 font-bold">Testosterona Total Sérica</td>
                    <td className="py-3 px-4">{consultaBase?.testosterona_total ? `${consultaBase.testosterona_total} ng/dL` : "—"}</td>
                    <td className="py-3 px-4">{consultaSeguimiento?.testosterona_total ? `${consultaSeguimiento.testosterona_total} ng/dL` : "—"}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.testosterona_total, consultaBase?.testosterona_total, "ng/dL", true);
                        return d ? <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${d.badge}`}>{d.texto}</span> : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.testosterona_total, consultaBase?.testosterona_total, "", true);
                        return d ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${d.tendencia === "mejoria" ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.icono} {d.tendencia === "mejoria" ? "Descenso androgénico" : "Elevación androgénica"}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">15 – 50 ng/dL</td>
                  </tr>

                  {/* HOMA-IR */}
                  <tr>
                    <td className="py-3 px-4 font-bold">Índice HOMA-IR (Resistencia a la Insulina)</td>
                    <td className="py-3 px-4">{consultaBase?.homa_ir ? `${consultaBase.homa_ir}` : "—"}</td>
                    <td className="py-3 px-4">{consultaSeguimiento?.homa_ir ? `${consultaSeguimiento.homa_ir}` : "—"}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.homa_ir, consultaBase?.homa_ir, "", true);
                        return d ? <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${d.badge}`}>{d.texto}</span> : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.homa_ir, consultaBase?.homa_ir, "", true);
                        return d ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${d.tendencia === "mejoria" ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.icono} {d.tendencia === "mejoria" ? "Mayor sensibilidad" : "Resistencia aumentada"}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">&lt; 2.5 (Sin Resistencia)</td>
                  </tr>

                  {/* CONTEO FOLICULAR */}
                  <tr>
                    <td className="py-3 px-4 font-bold">Folículos Antrales Ecográficos (2-9 mm)</td>
                    <td className="py-3 px-4">{consultaBase?.num_foliculos ? `${consultaBase.num_foliculos} folículos` : "—"}</td>
                    <td className="py-3 px-4">{consultaSeguimiento?.num_foliculos ? `${consultaSeguimiento.num_foliculos} folículos` : "—"}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.num_foliculos, consultaBase?.num_foliculos, "fol.", true);
                        return d ? <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${d.badge}`}>{d.texto}</span> : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const d = calcularDeltaPar(consultaSeguimiento?.num_foliculos, consultaBase?.num_foliculos, "", true);
                        return d ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${d.tendencia === "mejoria" ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.icono} {d.tendencia === "mejoria" ? "Disminución folicular" : "Persistencia PCOM"}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">&lt; 12 – 20 folículos / ovario</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
