import React, { useState, useEffect } from "react";
import { MdClose, MdVerified, MdInfoOutline } from "react-icons/md";

export interface FerrimanData {
  labioSuperior: number;
  menton: number;
  pecho: number;
  abdomenSuperior: number;
  abdomenInferior: number;
  brazos: number;
  muslos: number;
  espaldaSuperior: number;
  espaldaLumbar: number;
  acneGags: number;
  alopeciaLudwig: number;
}

interface ModalFerrimanGallweyProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteNombre?: string;
  pacienteCi?: string;
  initialScore?: number;
  initialCuadrantes?: Partial<FerrimanData> | null;
  initialAcne?: boolean;
  initialAlopecia?: boolean;
  onGuardar: (datos: {
    totalScore: number;
    hirsutismo: boolean;
    acne: boolean;
    alopecia: boolean;
    acneGags: number;
    alopeciaLudwig: number;
    detalleCuadrantes: FerrimanData;
  }) => void;
}

// Descripciones anatómicas de los 9 cuadrantes según el estándar Ferriman-Gallwey
const DESCRIPCIONES_CUADRANTES: Record<keyof Omit<FerrimanData, "acneGags" | "alopeciaLudwig">, { titulo: string; desc: string[] }> = {
  labioSuperior: {
    titulo: "1. Labio Superior",
    desc: [
      "Sin vello terminal significativo",
      "Pocos vellos aislados en el borde lateral",
      "Vellos finos en comisuras labiales",
      "Bigote que se extiende al centro sin ser continuo",
      "Vello grueso en bigote completo",
    ],
  },
  menton: {
    titulo: "2. Mentón / Barbilla",
    desc: [
      "Sin vello terminal visible",
      "Vellos aislados y dispersos",
      "Pequeño parche o mechón localizado",
      "Cobertura parcial densa en barbilla",
      "Barba completa continua en mentón y mandíbula",
    ],
  },
  pecho: {
    titulo: "3. Pecho / Tórax",
    desc: [
      "Sin vello terminal significativo",
      "Vellos periareolares aislados",
      "Vello en zona esternal media",
      "Cobertura esternal extendida continua",
      "Cobertura completa en todo el tórax anterior",
    ],
  },
  abdomenSuperior: {
    titulo: "4. Abdomen Superior",
    desc: [
      "Sin vello terminal",
      "Pocos vellos en línea media",
      "Línea alba con vellos finos dispersos",
      "Banda media prominente y densa",
      "Cobertura extendida sobre epigastrio e hipocondrios",
    ],
  },
  abdomenInferior: {
    titulo: "5. Abdomen Inferior",
    desc: [
      "Sin vello terminal",
      "Vellos aislados sobre sínfisis pubiana",
      "Banda pubo-umbilical densa (línea sagital)",
      "Extensión amplia triangular / piramidal",
      "Distribución masculina completa pubo-umbilical",
    ],
  },
  brazos: {
    titulo: "6. Brazos",
    desc: [
      "Vello fino velloso normal",
      "Vello terminal disperso en tercio del antebrazo",
      "Cobertura moderada en cara dorsal del antebrazo",
      "Cobertura densa en antebrazo",
      "Cobertura completa densa en brazo y antebrazo",
    ],
  },
  muslos: {
    titulo: "7. Muslos",
    desc: [
      "Sin vello terminal significativo",
      "Vello terminal discreto en cara interna",
      "Cobertura moderada en cara anterior del muslo",
      "Cobertura densa y extendida en muslos",
      "Cobertura pilosa continua en toda la extremidad",
    ],
  },
  espaldaSuperior: {
    titulo: "8. Espalda Superior",
    desc: [
      "Sin vello terminal",
      "Vello escaso interescapular",
      "Vellos dispersos interescapulares y hombros",
      "Cobertura moderada continua escapular",
      "Cobertura densa y continua en parte alta",
    ],
  },
  espaldaLumbar: {
    titulo: "9. Espalda Lumbar",
    desc: [
      "Sin vello terminal significativo",
      "Vellos aislados en zona sacrolumbar",
      "Parche piloso localizado en zona sacra",
      "Cobertura moderada que asciende a zona lumbar",
      "Cobertura completa densa en región lumbar",
    ],
  },
};

export const ModalFerrimanGallwey: React.FC<ModalFerrimanGallweyProps> = ({
  isOpen,
  onClose,
  pacienteNombre = "Paciente seleccionada",
  pacienteCi = "",
  initialScore,
  initialCuadrantes,
  initialAcne = false,
  initialAlopecia = false,
  onGuardar,
}) => {
  const [cuadrantes, setCuadrantes] = useState<FerrimanData>({
    labioSuperior: 0,
    menton: 0,
    pecho: 0,
    abdomenSuperior: 0,
    abdomenInferior: 0,
    brazos: 0,
    muslos: 0,
    espaldaSuperior: 0,
    espaldaLumbar: 0,
    acneGags: initialAcne ? 2 : 0,
    alopeciaLudwig: initialAlopecia ? 1 : 0,
  });

  // Al abrir, cargar los cuadrantes reales guardados o inicializar
  useEffect(() => {
    if (isOpen) {
      if (initialCuadrantes && Object.keys(initialCuadrantes).length > 0) {
        setCuadrantes({
          labioSuperior: Number(initialCuadrantes.labioSuperior || 0),
          menton: Number(initialCuadrantes.menton || 0),
          pecho: Number(initialCuadrantes.pecho || 0),
          abdomenSuperior: Number(initialCuadrantes.abdomenSuperior || 0),
          abdomenInferior: Number(initialCuadrantes.abdomenInferior || 0),
          brazos: Number(initialCuadrantes.brazos || 0),
          muslos: Number(initialCuadrantes.muslos || 0),
          espaldaSuperior: Number(initialCuadrantes.espaldaSuperior || 0),
          espaldaLumbar: Number(initialCuadrantes.espaldaLumbar || 0),
          acneGags: Number(initialCuadrantes.acneGags ?? (initialAcne ? 2 : 0)),
          alopeciaLudwig: Number(initialCuadrantes.alopeciaLudwig ?? (initialAlopecia ? 1 : 0)),
        });
      } else if (typeof initialScore === "number" && initialScore > 0) {
        // Distribuir el score inicial proporcionalmente solo si no hay cuadrantes específicos
        const pts = Math.min(Math.max(initialScore, 0), 36);
        const base = Math.floor(pts / 9);
        const resto = pts % 9;
        setCuadrantes((prev) => ({
          ...prev,
          labioSuperior: Math.min(base + (resto > 0 ? 1 : 0), 4),
          menton: Math.min(base + (resto > 1 ? 1 : 0), 4),
          pecho: Math.min(base + (resto > 2 ? 1 : 0), 4),
          abdomenSuperior: Math.min(base + (resto > 3 ? 1 : 0), 4),
          abdomenInferior: Math.min(base + (resto > 4 ? 1 : 0), 4),
          brazos: Math.min(base + (resto > 5 ? 1 : 0), 4),
          muslos: Math.min(base + (resto > 6 ? 1 : 0), 4),
          espaldaSuperior: Math.min(base + (resto > 7 ? 1 : 0), 4),
          espaldaLumbar: Math.min(base, 4),
          acneGags: initialAcne ? 2 : 0,
          alopeciaLudwig: initialAlopecia ? 1 : 0,
        }));
      } else {
        setCuadrantes({
          labioSuperior: 0,
          menton: 0,
          pecho: 0,
          abdomenSuperior: 0,
          abdomenInferior: 0,
          brazos: 0,
          muslos: 0,
          espaldaSuperior: 0,
          espaldaLumbar: 0,
          acneGags: initialAcne ? 2 : 0,
          alopeciaLudwig: initialAlopecia ? 1 : 0,
        });
      }
    }
  }, [isOpen, initialScore, initialCuadrantes, initialAcne, initialAlopecia]);

  if (!isOpen) return null;

  const handleSliderChange = (campo: keyof Omit<FerrimanData, "acneGags" | "alopeciaLudwig">, valor: number) => {
    setCuadrantes((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // Sumatoria total de los 9 cuadrantes
  const totalScore =
    cuadrantes.labioSuperior +
    cuadrantes.menton +
    cuadrantes.pecho +
    cuadrantes.abdomenSuperior +
    cuadrantes.abdomenInferior +
    cuadrantes.brazos +
    cuadrantes.muslos +
    cuadrantes.espaldaSuperior +
    cuadrantes.espaldaLumbar;

  const tieneHirsutismo = totalScore >= 8;
  const tieneAcne = cuadrantes.acneGags > 0;
  const tieneAlopecia = cuadrantes.alopeciaLudwig > 0;

  const handleGuardarClick = () => {
    onGuardar({
      totalScore,
      hirsutismo: tieneHirsutismo,
      acne: tieneAcne,
      alopecia: tieneAlopecia,
      acneGags: cuadrantes.acneGags,
      alopeciaLudwig: cuadrantes.alopeciaLudwig,
      detalleCuadrantes: cuadrantes,
    });
    onClose();
  };

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
                Evaluación Especializada de Hiperandrogenismo Clínico (Escala Ferriman-Gallwey)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paciente: <span className="font-semibold text-navy-700 dark:text-navy-200">{pacienteNombre}</span> {pacienteCi && `(CI: ${pacienteCi})`} • Ponderación clínica del Criterio 2 Rotterdam
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
              Umbral de Hirsutismo: ≥ 8 puntos
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

        {/* Cuerpo Principal: 2 Columnas (9 Cuadrantes a la Izquierda, Puntuación y Escalas a la Derecha) */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[80vh] overflow-y-auto">
          
          {/* Columna Izquierda: Los 9 Cuadrantes Andrógeno-Dependientes (8 cols en desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                9 Cuadrantes Andrógeno-Dependientes (Puntuación 0 a 4):
              </h4>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Ajuste los deslizadores según la severidad observada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(DESCRIPCIONES_CUADRANTES) as Array<keyof typeof DESCRIPCIONES_CUADRANTES>).map((key) => {
                const info = DESCRIPCIONES_CUADRANTES[key];
                const valorActual = cuadrantes[key];
                const tienePuntaje = valorActual > 0;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                      tienePuntaje
                        ? "bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 shadow-sm"
                        : "bg-white border-slate-200 dark:bg-navy-800 dark:border-navy-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-xs font-bold text-navy-800 dark:text-white truncate">
                        {info.titulo}
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          tienePuntaje
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                            : "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300"
                        }`}
                      >
                        {valorActual} {valorActual === 1 ? "pt" : "pts"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 min-h-[32px] line-clamp-2 mb-2 leading-tight">
                      {info.desc[valorActual]}
                    </p>

                    <div className="mt-auto pt-1">
                      <input
                        type="range"
                        min={0}
                        max={4}
                        step={1}
                        value={valorActual}
                        onChange={(e) => handleSliderChange(key, parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-navy-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
                        <span>0</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Sumatoria, GAGS, Ludwig y Acción (4 cols en desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Tarjeta de Sumatoria Total */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center justify-center shadow-sm ${
                tieneHirsutismo
                  ? "bg-rose-50 border-rose-300 dark:bg-rose-950/30 dark:border-rose-700"
                  : "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SUMATORIA FERRIMAN-GALLWEY TOTAL:
              </p>
              
              <div className="my-2">
                <span
                  className={`text-4xl sm:text-5xl font-black ${
                    tieneHirsutismo
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {totalScore}
                </span>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1.5">
                  Puntos
                </span>
              </div>

              {tieneHirsutismo ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-800 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  HIRSUTISMO CLÍNICO CONFIRMADO
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  NORMAL / SIN HIRSUTISMO
                </div>
              )}
            </div>

            {/* Selector Acné Clínico (Escala GAGS) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white dark:bg-navy-800 dark:border-navy-700 shadow-sm">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Acné Clínico (Escala GAGS):
              </label>
              <select
                value={cuadrantes.acneGags}
                onChange={(e) => setCuadrantes((prev) => ({ ...prev, acneGags: parseInt(e.target.value, 10) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-navy-800 outline-none transition focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              >
                <option value={0}>Grado 0: Sin Acné</option>
                <option value={1}>Grado 1: Leve (Comedónico / Pápulas aisladas en cara)</option>
                <option value={2}>Grado 2: Moderado (Pápulo-Pustuloso en cara y cuello)</option>
                <option value={3}>Grado 3: Moderado-Severo (Pápulo-Pustuloso con nódulos en cara y torso)</option>
                <option value={4}>Grado 4: Severo quístico / Conglobata</option>
              </select>
            </div>

            {/* Selector Alopecia Androgénica (Escala Ludwig) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white dark:bg-navy-800 dark:border-navy-700 shadow-sm">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Alopecia Androgénica (Escala Ludwig):
              </label>
              <select
                value={cuadrantes.alopeciaLudwig}
                onChange={(e) => setCuadrantes((prev) => ({ ...prev, alopeciaLudwig: parseInt(e.target.value, 10) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-navy-800 outline-none transition focus:border-brand-500 focus:bg-white dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              >
                <option value={0}>Normal (Densidad capilar femenina conservada)</option>
                <option value={1}>Grado I (Adelgazamiento coronal difuso en raya media)</option>
                <option value={2}>Grado II (Adelgazamiento coronal moderado pronunciado)</option>
                <option value={3}>Grado III (Alopecia parietal difusa extensa)</option>
              </select>
            </div>

            {/* Nota de Aporte Clínico */}
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-purple-900 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-300 text-[11px] flex items-start gap-2">
              <MdInfoOutline size={16} className="shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
              <span>
                <strong>Aporte Criterio 2 Rotterdam:</strong> El umbral de {'>='} 8 puntos certifica hiperandrogenismo clínico oficial. Los grados de acné y alopecia complementan el diagnóstico androgénico.
              </span>
            </div>

            {/* Botón de Guardar en Expediente */}
            <button
              onClick={handleGuardarClick}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition duration-200 hover:-translate-y-0.5"
            >
              <MdVerified size={18} />
              Guardar Puntuación en Expediente →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ModalFerrimanGallwey;
