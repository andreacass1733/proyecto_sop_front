import authImg from "assets/img/auth/auth.png";
import { Routes, Route, Navigate } from "react-router-dom";
import routes from "routes";

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
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-navy-900 flex items-center justify-center p-4">
      <main className="w-full max-w-5xl bg-white dark:bg-navy-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-navy-700 grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Formulario a la izquierda */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center">
          <Routes>
            {getRoutes(routes)}
            <Route
              path="/"
              element={<Navigate to="/auth/sign-in" replace />}
            />
          </Routes>
        </div>

        {/* Imagen / Banner Médico a la derecha */}
        <div className="hidden lg:block lg:col-span-6 relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-purple-700 p-12 text-white flex flex-col justify-between">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay"
            style={{ backgroundImage: `url(${authImg})` }}
          />
          
          <div className="relative z-10">
            <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Sistema Asistido por IA
            </span>
            <h2 className="text-3xl font-extrabold mt-6 leading-tight">
              Evaluación Ecográfica Ovárica
            </h2>
            <p className="mt-3 text-sm text-pink-100 leading-relaxed font-medium">
              Herramienta clínica avanzada basada en los Criterios de Rotterdam para la detección de morfología poliquística.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/20 flex items-center justify-between text-xs text-pink-100">
            <span>Protocolo Rotterdam C3</span>
            <span>Versión 1.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
