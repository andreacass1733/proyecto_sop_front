import React, { useState, useMemo } from "react";
import { MdClose, MdVerified } from "react-icons/md";

export interface CTOGData {
  glucosa0: number;
  insulina0: number;
  glucosa60: number;
  insulina60: number;
  glucosa120: number;
  insulina120: number;
}

interface ModalCurvaCTOGProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteNombre?: string;
  pacienteCi?: string;
  initialGlucosa0?: number | string;
  initialInsulina0?: number | string;
  onGuardar: (datos: {
    glucosa0: number;
    insulina0: number;
    glucosa60: number;
    insulina60: number;
    glucosa120: number;
    insulina120: number;
    homaIr: number;
    quicki: number;
    matsuda: number;
    dictamen: string;
  }) => void;
}

export const ModalCurvaCTOG: React.FC<ModalCurvaCTOGProps> = ({
  isOpen,
  onClose,
  pacienteNombre = "Paciente seleccionada",
  pacienteCi = "",
  initialGlucosa0,
  initialInsulina0,
  onGuardar,
}) => {
  // Valores serológicos de las 3 tomas estándar (0, 60, 120 min tras sobrecarga de 75g de glucosa)
  const [glucosa0, setGlucosa0] = useState<string>(
    initialGlucosa0 !== undefined && initialGlucosa0 !== "" ? String(initialGlucosa0) : "98.0"
  );
  const [insulina0, setInsulina0] = useState<string>(
    initialInsulina0 !== undefined && initialInsulina0 !== "" ? String(initialInsulina0) : "16.5"
  );
  const [glucosa60, setGlucosa60] = useState<string>("156.0");
  const [insulina60, setInsulina60] = useState<string>("112.0");
  const [glucosa120, setGlucosa120] = useState<string>("138.0");
  const [insulina120, setInsulina120] = useState<string>("84.0");

  // Cálculos dinámicos
  const calculos = useMemo(() => {
    const g0 = parseFloat(glucosa0) || 0;
    const i0 = parseFloat(insulina0) || 0;
    const g60 = parseFloat(glucosa60) || 0;
    const i60 = parseFloat(insulina60) || 0;
    const g120 = parseFloat(glucosa120) || 0;
    const i120 = parseFloat(insulina120) || 0;

    // HOMA-IR: (Glucosa_0 * Insulina_0) / 405
    const homaIr = g0 > 0 && i0 > 0 ? (g0 * i0) / 405 : 0;

    // QUICKI: 1 / (log10(G0) + log10(I0))
    let quicki = 0;
    if (g0 > 0 && i0 > 0) {
      const logG = Math.log10(g0);
      const logI = Math.log10(i0);
      if (logG + logI > 0) {
        quicki = 1 / (logG + logI);
      }
    }

    // Índice Matsuda (ISI Composite):
    // 10,000 / sqrt( (G0 * I0) * ( (G0 + G60 + G120)/3 * (I0 + I60 + I120)/3 ) )
    let matsuda = 0;
    if (g0 > 0 && i0 > 0) {
      const gMedia = (g0 + g60 + g120) / 3;
      const iMedia = (i0 + i60 + i120) / 3;
      const producto = (g0 * i0) * (gMedia * iMedia);
      if (producto > 0) {
        matsuda = 10000 / Math.sqrt(producto);
      }
    }

    // Dictamen clínico
    let dictamen = "Metabolismo glucídico e insulínico dentro de límites normales.";
    const tieneResistencia = homaIr >= 2.5 || (matsuda > 0 && matsuda < 2.5) || quicki < 0.33;
    const tieneHiperinsulinismoPico = i60 > 100 || i120 > 60;

    if (tieneResistencia && tieneHiperinsulinismoPico) {
      dictamen = "Intolerancia compensatoria por secreción pancreática supranormal (Hiperinsulinismo dinámico severo con resistencia periférica).";
    } else if (tieneResistencia) {
      dictamen = "Resistencia periférica a la insulina confirmada por HOMA-IR alterado e índice de sensibilidad Matsuda disminuido.";
    } else if (tieneHiperinsulinismoPico) {
      dictamen = "Pico insulínico supranormal reactivo a los 60-120 min con aclaramiento retardado sugerente de fase temprana de disfunción metabólica en SOP.";
    }

    return {
      g0,
      i0,
      g60,
      i60,
      g120,
      i120,
      homaIr: parseFloat(homaIr.toFixed(2)),
      quicki: parseFloat(quicki.toFixed(2)),
      matsuda: parseFloat(matsuda.toFixed(2)),
      dictamen,
      tieneResistencia,
      tieneHiperinsulinismoPico,
    };
  }, [glucosa0, insulina0, glucosa60, insulina60, glucosa120, insulina120]);

  if (!isOpen) return null;

  const handleGuardarClick = () => {
    onGuardar({
      glucosa0: calculos.g0,
      insulina0: calculos.i0,
      glucosa60: calculos.g60,
      insulina60: calculos.i60,
      glucosa120: calculos.g120,
      insulina120: calculos.i120,
      homaIr: calculos.homaIr,
      quicki: calculos.quicki,
      matsuda: calculos.matsuda,
      dictamen: calculos.dictamen,
    });
    onClose();
  };

  // Coordenadas SVG para la Curva de Glucemia e Insulinemia
  // Rango Glucosa: 0 a 200 mg/dL -> Normalizado a eje Y (alto 180px)
  // Rango Insulina: 0 a 160 µUI/mL -> Normalizado a eje Y
  const w = 460;
  const h = 180;
  const padX = 50;
  const padY = 25;
  const graphW = w - padX * 2;
  const graphH = h - padY * 2;

  const x0 = padX;
  const x60 = padX + graphW / 2;
  const x120 = padX + graphW;

  // Escala Glucosa (0 a 220)
  const maxG = 220;
  const getYGlucosa = (val: number) => h - padY - (Math.min(val, maxG) / maxG) * graphH;

  // Escala Insulina (0 a 160)
  const maxI = 160;
  const getYInsulina = (val: number) => h - padY - (Math.min(val, maxI) / maxI) * graphH;

  const gy0 = getYGlucosa(calculos.g0);
  const gy60 = getYGlucosa(calculos.g60);
  const gy120 = getYGlucosa(calculos.g120);

  const iy0 = getYInsulina(calculos.i0);
  const iy60 = getYInsulina(calculos.i60);
  const iy120 = getYInsulina(calculos.i120);

  const pathGlucosa = `M ${x0} ${gy0} Q ${(x0 + x60) / 2} ${Math.min(gy0, gy60) - 10}, ${x60} ${gy60} T ${x120} ${gy120}`;
  const pathInsulina = `M ${x0} ${iy0} Q ${(x0 + x60) / 2} ${Math.min(iy0, iy60) - 15}, ${x60} ${iy60} T ${x120} ${iy120}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-navy-800 border border-slate-200 dark:border-navy-700 my-4 overflow-hidden">
        
        {/* Cabecera Estilo Ventana Médica */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50 dark:border-navy-700 dark:bg-navy-900/60">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            </div>
            <div className="h-4 w-px bg-slate-300 dark:bg-navy-700 mx-1"></div>
            <div>
              <h3 className="text-base font-bold text-navy-800 dark:text-white flex items-center gap-2">
                Curva de Tolerancia Oral a la Glucosa (75g) e Insulina Dinámica (CTOG)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paciente: <span className="font-semibold text-navy-700 dark:text-navy-200">{pacienteNombre}</span> {pacienteCi && `(CI: ${pacienteCi})`} • Detección precoz de hiperinsulinismo compensatorio
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
              Prueba de 120 minutos
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-navy-700 dark:hover:text-white transition"
              title="Cerrar"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo Principal: 2 Columnas (Tomas y Cálculos a la Izquierda, Gráfico Dinámico a la Derecha) */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[80vh] overflow-y-auto">
          
          {/* Columna Izquierda: Tomas de Muestras y Calculadoras (6 cols en desktop) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            
            <div className="rounded-xl border border-slate-200 bg-white dark:bg-navy-800 dark:border-navy-700 overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-navy-900/60 px-4 py-2.5 border-b border-slate-200 dark:border-navy-700 flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Valores Serológicos (3 Tomas):
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-400">Sobrecarga 75g glucosa anhidra</span>
              </div>

              <div className="p-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-navy-700 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2 px-2">Tiempo</th>
                      <th className="py-2 px-2">Glucosa (mg/dL)</th>
                      <th className="py-2 px-2">Insulina (µUI/mL)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
                    {/* 0 min Basal */}
                    <tr>
                      <td className="py-2.5 px-2 font-bold text-navy-800 dark:text-white">
                        0 min (Basal)
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={glucosa0}
                            onChange={(e) => setGlucosa0(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-navy-800 outline-none focus:border-blue-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            calculos.g0 < 100 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                          }`}>
                            {calculos.g0 < 100 ? "Normal" : "Alterada"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={insulina0}
                            onChange={(e) => setInsulina0(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-navy-800 outline-none focus:border-rose-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            calculos.i0 <= 12 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                          }`}>
                            {calculos.i0 <= 12 ? "Normal" : "Alta ●"}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* 60 min */}
                    <tr className="bg-slate-50/50 dark:bg-navy-900/30">
                      <td className="py-2.5 px-2 font-bold text-navy-800 dark:text-white">
                        60 min
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={glucosa60}
                            onChange={(e) => setGlucosa60(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-navy-800 outline-none focus:border-blue-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            calculos.g60 < 160 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                          }`}>
                            {calculos.g60 < 160 ? "Normal" : "Límite"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={insulina60}
                            onChange={(e) => setInsulina60(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-navy-800 outline-none focus:border-rose-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            calculos.i60 <= 100 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                          }`}>
                            {calculos.i60 <= 100 ? "Normal" : "Pico Severo ●"}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* 120 min */}
                    <tr>
                      <td className="py-2.5 px-2 font-bold text-navy-800 dark:text-white">
                        120 min
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={glucosa120}
                            onChange={(e) => setGlucosa120(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-navy-800 outline-none focus:border-blue-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            calculos.g120 < 140 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                          }`}>
                            {calculos.g120 < 140 ? "Normal" : "Límite 🟡"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={insulina120}
                            onChange={(e) => setInsulina120(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-navy-800 outline-none focus:border-rose-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            calculos.i120 <= 60 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                          }`}>
                            {calculos.i120 <= 60 ? "Normal" : "Depuración lenta ●"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cajas de Cálculos de Índices Metabólicos */}
            <div className="flex flex-col gap-2">
              
              {/* HOMA-IR */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                calculos.homaIr >= 2.5
                  ? "bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800"
                  : "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
              }`}>
                <div>
                  <span className="text-xs font-black text-navy-800 dark:text-white block">
                    Índice HOMA-IR:
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    (Glucosa Basal × Insulina Basal) / 405
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-navy-900 dark:text-white">
                    {calculos.homaIr}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    calculos.homaIr >= 2.5 ? "bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300" : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  }`}>
                    {calculos.homaIr >= 2.5 ? "Resistencia (≥ 2.5) ●" : "Normal (< 2.5) ●"}
                  </span>
                </div>
              </div>

              {/* QUICKI */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                calculos.quicki < 0.33
                  ? "bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800"
                  : "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
              }`}>
                <div>
                  <span className="text-xs font-black text-navy-800 dark:text-white block">
                    Índice QUICKI:
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    1 / (log(G0) + log(I0)) — Sensibilidad cuantitativa
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-navy-900 dark:text-white">
                    {calculos.quicki}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    calculos.quicki < 0.33 ? "bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300" : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  }`}>
                    {calculos.quicki < 0.33 ? "Alterado (≤ 0.33) ●" : "Normal (> 0.33) ●"}
                  </span>
                </div>
              </div>

              {/* Índice Matsuda (Sensibilidad) */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                calculos.matsuda > 0 && calculos.matsuda < 2.5
                  ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
                  : "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
              }`}>
                <div>
                  <span className="text-xs font-black text-navy-800 dark:text-white block">
                    Índice Matsuda (Sensibilidad):
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    ISI Composite (0, 60, 120 min)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-navy-900 dark:text-white">
                    {calculos.matsuda}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    calculos.matsuda < 2.5 ? "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200" : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  }`}>
                    {calculos.matsuda < 2.5 ? "Resistencia (< 2.5) 🟡" : "Normal (≥ 2.5) ●"}
                  </span>
                </div>
              </div>

            </div>

            {/* Dictamen */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-navy-900/80 border border-slate-200 dark:border-navy-700 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Dictamen: </span>
              <span className="text-slate-600 dark:text-slate-400">{calculos.dictamen}</span>
            </div>

          </div>

          {/* Columna Derecha: Gráfico Curva Glucosa vs Insulina (6 cols en desktop) */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4">
            
            <div className="p-4 rounded-xl border border-slate-200 bg-white dark:bg-navy-800 dark:border-navy-700 shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Curva Temporal Glucosa vs. Insulina (0 - 120 min)
                </h4>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Glucemia (mg/dL)
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span> Insulinemia (µUI/mL)
                  </span>
                </div>
              </div>

              {/* Renderizado SVG de las Curvas */}
              <div className="relative w-full aspect-[16/9] bg-slate-50/70 dark:bg-navy-900/50 rounded-xl border border-slate-200/80 dark:border-navy-700 flex items-center justify-center p-2">
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                  {/* Líneas guía horizontales */}
                  <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#94a3b8" strokeWidth="1.5" />
                  <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" />

                  {/* Etiquetas del eje X */}
                  <text x={x0} y={h - 6} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">0 min</text>
                  <text x={x60} y={h - 6} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">60 min</text>
                  <text x={x120} y={h - 6} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">120 min</text>

                  {/* Curva de Glucemia (Línea Azul Continua) */}
                  <path d={pathGlucosa} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                  {/* Puntos Glucemia */}
                  <circle cx={x0} cy={gy0} r="4.5" fill="#2563eb" />
                  <text x={x0} y={gy0 - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#2563eb">
                    {calculos.g0}
                  </text>

                  <circle cx={x60} cy={gy60} r="4.5" fill="#2563eb" />
                  <text x={x60} y={gy60 - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#2563eb">
                    {calculos.g60} mg/dL
                  </text>

                  <circle cx={x120} cy={gy120} r="4.5" fill="#2563eb" />
                  <text x={x120} y={gy120 - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#2563eb">
                    {calculos.g120} mg/dL
                  </text>

                  {/* Curva de Insulinemia (Línea Roja Punteada) */}
                  <path d={pathInsulina} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
                  {/* Puntos Insulinemia */}
                  <circle cx={x0} cy={iy0} r="4.5" fill="#e11d48" />
                  <text x={x0} y={iy0 + 15} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#e11d48">
                    {calculos.i0} µUI
                  </text>

                  <circle cx={x60} cy={iy60} r="4.5" fill="#e11d48" />
                  <text x={x60} y={iy60 - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#e11d48">
                    {calculos.i60} µUI (Pico)
                  </text>

                  <circle cx={x120} cy={iy120} r="4.5" fill="#e11d48" />
                  <text x={x120} y={iy120 + 15} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#e11d48">
                    {calculos.i120} µUI
                  </text>
                </svg>
              </div>

              {/* Leyenda y Explicación */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700 flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                    <span className="w-3 h-0.5 bg-blue-600 inline-block"></span> Curva de Glucemia
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                    <span className="w-3 border-b-2 border-dashed border-rose-600 inline-block"></span> Curva de Insulinemia Dinámica
                  </span>
                </div>
                <p className="mt-1">
                  En el SOP, la hiperinsulinemia reactiva (&gt; 100 µUI/mL a los 60 min o aclaramiento lento a los 120 min) revela insulinorresistencia oculta aun con glucemias basales normales.
                </p>
              </div>
            </div>

            {/* Botón de Sincronización en Expediente */}
            <button
              onClick={handleGuardarClick}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition duration-200 hover:-translate-y-0.5"
            >
              <MdVerified size={18} />
              Guardar Parámetros en Perfil Hormonal / Expediente →
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ModalCurvaCTOG;
