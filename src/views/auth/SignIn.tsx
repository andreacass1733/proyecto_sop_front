import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdEmail, MdLock, MdHealthAndSafety, MdArrowForward } from "react-icons/md";

export default function SignIn() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const email = emailRef.current?.value || "";
    const password = passwordRef.current?.value || "";
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Credenciales incorrectas. Verifique su correo institucional y contraseña.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      navigate("/admin/default");
    } catch {
      setError("No se pudo conectar con el servidor médico.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header Médico */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-md">
          <MdHealthAndSafety size={24} />
        </div>
        <div>
          <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
            Módulo Médico
          </span>
          <p className="text-[11px] text-slate-400 font-medium">Acceso Privado</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Acceso Médico
      </h1>
      <p className="mt-1 mb-6 text-xs text-slate-500 dark:text-slate-400">
        Ingrese sus credenciales para acceder a las evaluaciones de imágenes ecográficas.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Correo Electrónico */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
            Correo Institucional
          </label>
          <div className="relative">
            <MdEmail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              ref={emailRef}
              type="email"
              placeholder="medico@hospital.com"
              required
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-navy-600 rounded-xl text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-navy-900 focus:outline-none focus:border-pink-500 focus:bg-white dark:focus:bg-navy-900 transition-all font-medium"
            />
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
            Contraseña
          </label>
          <div className="relative">
            <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              ref={passwordRef}
              type="password"
              placeholder="••••••••••••"
              required
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-navy-600 rounded-xl text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-navy-900 focus:outline-none focus:border-pink-500 focus:bg-white dark:focus:bg-navy-900 transition-all font-medium"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Botón Ingreso */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Verificando usuario...</span>
          ) : (
            <>
              <span>Ingresar al Sistema</span>
              <MdArrowForward size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}