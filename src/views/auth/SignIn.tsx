import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdLock, MdHealthAndSafety, MdArrowForward, MdCheckCircle } from "react-icons/md";
import { useAuth, DR_RODRIGO_ESPINOZA } from "context/AuthContext";

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      login();
      navigate("/admin/pacientes");
    }, 400);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl">
      {/* Header Médico */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-md">
          <MdHealthAndSafety size={26} />
        </div>
        <div>
          <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Acceso Médico RBAC
          </span>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Sistema SOP Rotterdam</p>
        </div>
      </div>

      <h1 className="text-2xl font-black text-slate-800 tracking-tight">
        Inicio de Sesión
      </h1>
      <p className="mt-1 mb-6 text-xs text-slate-500">
        Bienvenido de nuevo. Inicie sesión para acceder a la gestión de pacientes y diagnósticos.
      </p>

      {/* Perfil del médico predeterminado */}
      <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          RE
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">
            Dr. {DR_RODRIGO_ESPINOZA.nombre} {DR_RODRIGO_ESPINOZA.primer_apellido} {DR_RODRIGO_ESPINOZA.segundo_apellido}
          </p>
          <p className="text-[11px] text-rose-600 font-semibold truncate">
            {DR_RODRIGO_ESPINOZA.especialidad}
          </p>
        </div>
        <MdCheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            PIN o Clave de Acceso
          </label>
          <div className="relative">
            <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              placeholder="••••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Iniciando sesión...</span>
          ) : (
            <>
              <span>Ingresar como Dr. Rodrigo Espinoza</span>
              <MdArrowForward size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}