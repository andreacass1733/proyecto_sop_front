import React, { useState } from "react";
import { MdClose, MdAnalytics, MdScience } from "react-icons/md";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalMetricasXGBoostClinico: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tabGrafico, setTabGrafico] = useState<"confusion" | "roc" | "features" | "calibracion" | "pr">("confusion");

  if (!isOpen) return null;

  const API_BASE = "http://localhost:8000";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-navy-800 shadow-2xl border border-slate-200/80 dark:border-navy-700 overflow-hidden">
        
        {/* Encabezado del Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide text-white">
                  Clasificador Clínico XGBoost — Rotterdam
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 rounded-full shadow-xs">
                  Ítems 10 y 11 Completados 100%
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium">
                Validación, Regularización L1/L2, Importancia de Características y Calibración de Probabilidades
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shadow-xs"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Tarjetas Resumen de Métricas de Test Set (N=82) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-navy-700/60 border border-indigo-100 dark:border-navy-600 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                Exactitud (Acc)
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                81.71%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Test Set (N=82)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-navy-700/60 border border-emerald-100 dark:border-navy-600 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                Especificidad
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                90.91%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                50 / 55 Sanas
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-navy-700/60 border border-blue-100 dark:border-navy-600 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                Precisión (PPV)
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                77.27%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Valor Pred. Positivo
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-navy-700/60 border border-purple-100 dark:border-navy-600 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-0.5">
                Sensibilidad
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                62.96%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Recall Criterio 2
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-navy-700/60 border border-amber-100 dark:border-navy-600 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                Área ROC-AUC
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                0.8276
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Capacidad Discrim.
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-navy-700/60 border border-teal-100 dark:border-navy-600 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-0.5">
                5-Fold Cross-Val
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                83.37%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                ± 2.00% (N=541)
              </span>
            </div>
          </div>

          {/* Selector de Gráficos de Evaluación */}
          <div className="border border-slate-200 dark:border-navy-700 rounded-3xl p-4 bg-slate-50/50 dark:bg-navy-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-navy-700 pb-3 mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MdAnalytics className="text-indigo-600 text-base" />
                Gráficos de Evaluación Científica (300 DPI)
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "confusion", label: "Matriz de Confusión" },
                  { id: "roc", label: "Curva ROC & Youden" },
                  { id: "features", label: "Importancia de Variables" },
                  { id: "calibracion", label: "Calibración (Brier)" },
                  { id: "pr", label: "Curva Precisión-Recall" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabGrafico(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      tabGrafico === tab.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visor de Gráfico Seleccionado */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200/90 dark:border-navy-700 min-h-[360px]">
              {tabGrafico === "confusion" && (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`${API_BASE}/outputs/evaluacion_clinica/matriz_confusion_clinica.png`}
                    alt="Matriz de Confusión Clínica"
                    className="max-h-[380px] w-auto rounded-xl shadow-md object-contain"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xl">
                    <strong>Matriz de Confusión Anotada:</strong> Demuestra alta especificidad clínica (90.91%), con solo 5 falsos positivos sobre 55 pacientes sanas en datos no vistos de prueba.
                  </p>
                </div>
              )}

              {tabGrafico === "roc" && (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`${API_BASE}/outputs/evaluacion_clinica/curva_roc_clinica.png`}
                    alt="Curva ROC Clínica"
                    className="max-h-[380px] w-auto rounded-xl shadow-md object-contain"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xl">
                    <strong>Curva ROC y Punto Óptimo de Youden:</strong> Área bajo la curva (AUC = 0.8276). Identifica el umbral óptimo de decisión que maximiza la discriminación clínica sin sobreajuste.
                  </p>
                </div>
              )}

              {tabGrafico === "features" && (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`${API_BASE}/outputs/evaluacion_clinica/importancia_caracteristicas_clinica.png`}
                    alt="Importancia de Variables Clínicas"
                    className="max-h-[420px] w-auto rounded-xl shadow-md object-contain"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xl">
                    <strong>Importancia de Características (Feature Importance):</strong> La puntuación de hiperandrogenismo cutáneo/piloso (29.6%) y el riesgo metabólico (13.8%) lideran la toma de decisiones, concordando con el consenso de Rotterdam.
                  </p>
                </div>
              )}

              {tabGrafico === "calibracion" && (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`${API_BASE}/outputs/evaluacion_clinica/calibracion_probabilidades_clinica.png`}
                    alt="Calibración de Probabilidades"
                    className="max-h-[380px] w-auto rounded-xl shadow-md object-contain"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xl">
                    <strong>Diagrama de Confiabilidad (Reliability Diagram):</strong> El escalado de Platt (Sigmoide) redujo el Brier Score a 0.1397, garantizando que una probabilidad estimada del 80% signifique 80% de frecuencia real observada.
                  </p>
                </div>
              )}

              {tabGrafico === "pr" && (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`${API_BASE}/outputs/evaluacion_clinica/curva_precision_recall_clinica.png`}
                    alt="Curva Precision Recall"
                    className="max-h-[380px] w-auto rounded-xl shadow-md object-contain"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xl">
                    <strong>Curva Precisión-Sensibilidad:</strong> Excelente rendimiento con Average Precision muy por encima de la prevalencia base, indicando detección robusta de la clase minoritaria.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Hiperparámetros y Justificación Médica (Para Tribunal) */}
          <div className="border border-slate-200 dark:border-navy-700 rounded-3xl p-5 bg-white dark:bg-navy-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <MdScience className="text-purple-600 text-base" />
              Arquitectura e Hiperparámetros de Regularización (Ítem 10)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-700">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Número de Árboles (n_estimators):</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">120 estimadores</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-700">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Profundidad Máxima (max_depth):</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">3 niveles (interacciones controladas)</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-700">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Tasa de Aprendizaje (learning_rate):</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">0.03 (convergencia suave)</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-700">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Regularización L1 (reg_alpha):</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">1.0 (Lasso - Sparsity)</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-700">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Regularización L2 (reg_lambda):</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">1.5 (Ridge - Suavizado)</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-700">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Calibración de Probabilidades:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">Platt Scaling (Sigmoide)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer del Modal */}
        <div className="px-6 py-3.5 bg-slate-100/80 dark:bg-navy-900/80 border-t border-slate-200 dark:border-navy-700 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm"
          >
            Cerrar Panel de Métricas
          </button>
        </div>

      </div>
    </div>
  );
};
