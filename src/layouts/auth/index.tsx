import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import routes from "routes";
import sopHeroImg from "assets/img/auth/sop_hero.png";
import { MdBiotech, MdHealthAndSafety, MdVerified } from "react-icons/md";

export default function Auth() {
  const getRoutes = (routes: RoutesType[]): any => {
    return routes.map((prop, key) => {
      if (prop.layout === "/auth") {
        return (
          <Route path={`/${prop.path}`} element={prop.component} key={key} />
        );
      } else {
        return null;
      }
    });
  };

  document.documentElement.dir = "ltr";

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-100 via-rose-50/40 to-purple-50/50 dark:from-slate-950 dark:via-[#0c101d] dark:to-purple-950/40 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans">
      {/* Círculos decorativos de fondo con desenfoque */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-rose-300/20 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="relative w-full max-w-6xl bg-white/95 dark:bg-navy-800/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/90 dark:border-navy-700 grid grid-cols-1 lg:grid-cols-12 min-h-[660px] z-10">
        
        {/* Formulario a la izquierda (Login y 2FA) */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-navy-700/80">
          <Routes>
            {getRoutes(routes)}
            <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />
          </Routes>
        </div>

        {/* Panel Temático SOP a la derecha con la ilustración clínica */}
        <div className="hidden lg:flex lg:col-span-6 relative flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-purple-950/90 to-slate-900 text-white overflow-hidden">
          {/* Fondo con brillo suave */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-transparent pointer-events-none" />

          {/* Encabezado del banner */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <MdBiotech size={20} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-white">SOP SYSTEM</p>
                <p className="text-[10px] text-rose-300 font-semibold tracking-wider uppercase">Criterios de Rotterdam</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-rose-200">
              <MdVerified size={14} className="text-emerald-400" />
              <span>Portal Clínico</span>
            </div>
          </div>

          {/* Ilustración central médica del SOP */}
          <div className="relative z-10 my-auto py-4 flex flex-col items-center">
            <div className="relative w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/90 p-3 group transition-transform duration-500 hover:scale-[1.02]">
              <img
                src={sopHeroImg}
                alt="Fisiopatología y Morfología del Síndrome de Ovario Poliquístico"
                className="w-full h-auto object-contain rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent rounded-2xl pointer-events-none" />
            </div>

            <div className="mt-5 text-center px-4">
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
                Detección y Clasificación del Síndrome de Ovario Poliquístico
              </h2>
              <p className="mt-1.5 text-xs text-rose-100/80 leading-relaxed max-w-md mx-auto">
                Evaluación integral asistida por Redes Neuronales Convolucionales (EfficientNet-B0) para el análisis folicular y estromal ecográfico.
              </p>
            </div>
          </div>

          {/* Pie de banner con credenciales del especialista asignado */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-rose-200/90">
            <div className="flex items-center gap-2">
              <MdHealthAndSafety size={18} className="text-rose-400" />
              <span className="font-semibold">Dr. Rodrigo Espinoza • Endocrinología</span>
            </div>
            <span className="text-[11px] font-mono text-white/50">Normativa HIPAA</span>
          </div>

        </div>

      </main>
    </div>
  );
}
