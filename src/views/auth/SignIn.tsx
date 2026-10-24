import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdHealthAndSafety,
  MdArrowForward,
  MdArrowBack,
  MdErrorOutline,
  MdVpnKey,
  MdRefresh,
  MdCheckCircle,
  MdMarkEmailRead,
} from "react-icons/md";
import { useAuth } from "context/AuthContext";
import ForgotPasswordModal from "components/modal/ForgotPasswordModal";

export default function SignIn() {
  const navigate = useNavigate();
  const { loginStep1, verify2Fa, resend2Fa } = useAuth();

  // Paso del flujo: 1 = Credenciales, 2 = Doble Factor Obligatorio (2FA por Correo)
  const [paso, setPaso] = useState<1 | 2>(1);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // Campos Paso 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Datos de sesión Paso 2 (2FA)
  const [sessionId, setSessionId] = useState<string>("");
  const [emailMasked, setEmailMasked] = useState<string>("");
  const [codigo2Fa, setCodigo2Fa] = useState<string>("");
  const [reenviadoExitoso, setReenviadoExitoso] = useState<boolean>(false);

  // Temporizador de 5 minutos para el código 2FA
  const [segundosRestantes, setSegundosRestantes] = useState<number>(300);

  // Estados de carga y error
  const [loading, setLoading] = useState<boolean>(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<{ email?: string; password?: string }>({});

  const input2FaRef = useRef<HTMLInputElement>(null);

  // Manejo del temporizador de 2FA
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval>;
    if (paso === 2 && segundosRestantes > 0) {
      intervalo = setInterval(() => {
        setSegundosRestantes((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [paso, segundosRestantes]);

  // Auto-focus en el campo 2FA al pasar al paso 2
  useEffect(() => {
    if (paso === 2) {
      setTimeout(() => input2FaRef.current?.focus(), 150);
    }
  }, [paso]);

  const formatearTiempo = (segundos: number): string => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const validarCamposPaso1 = (): boolean => {
    const errores: { email?: string; password?: string } = {};
    let valido = true;

    if (!email.trim()) {
      errores.email = "El correo electrónico es obligatorio";
      valido = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errores.email = "Formato de correo electrónico inválido";
        valido = false;
      }
    }

    if (!password) {
      errores.password = "La contraseña es obligatoria";
      valido = false;
    } else if (password.trim().length < 6) {
      errores.password = "La contraseña debe tener al menos 6 caracteres";
      valido = false;
    } else if (password.length > 128) {
      errores.password = "La contraseña excede los 128 caracteres permitidos";
      valido = false;
    }

    setErroresCampos(errores);
    return valido;
  };

  // ── Enviar Paso 1: Validación de Credenciales ───────────────────────────────
  const handleSubmitPaso1 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorGeneral(null);

    if (!validarCamposPaso1()) {
      return;
    }

    setLoading(true);

    try {
      const res = await loginStep1(email.trim(), password);

      if (res.success) {
        if (res.session_id) {
          // Doble factor 2FA obligatorio
          setSessionId(res.session_id);
          setEmailMasked(res.email_masked || email.trim());
          setSegundosRestantes(300);
          setCodigo2Fa("");
          setPaso(2);
        } else if (!res.requires_2fa) {
          // Contingencia si el backend devuelve acceso directo
          navigate("/admin/default", { replace: true });
        }
      } else {
        // Mensaje de seguridad o bloqueo por fuerza bruta
        setErrorGeneral(res.error || "Correo o contraseña incorrectos");
      }
    } catch (err: any) {
      setErrorGeneral(err.message || "Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  // ── Enviar Paso 2: Verificación de Código 2FA ───────────────────────────────
  const ejecutarVerificacion2Fa = async (codigo: string) => {
    const cleanCode = codigo.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setErrorGeneral("Ingrese el código completo de 6 dígitos que recibió en su correo");
      return;
    }

    if (segundosRestantes <= 0) {
      setErrorGeneral("El código ha expirado. Por favor solicite un nuevo reenvío a su correo.");
      return;
    }

    setLoading(true);
    setErrorGeneral(null);

    try {
      const res = await verify2Fa(sessionId, cleanCode);

      if (res.success) {
        // Redirigir al dashboard principal tras validación 2FA exitosa
        navigate("/admin/default", { replace: true });
      } else {
        setErrorGeneral(res.error || "Código de verificación incorrecto o expirado");
      }
    } catch {
      setErrorGeneral("Código de verificación incorrecto o expirado");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPaso2 = async (e: React.FormEvent) => {
    e.preventDefault();
    await ejecutarVerificacion2Fa(codigo2Fa);
  };

  // ── Reenviar Código 2FA al Correo ───────────────────────────────────────────
  const handleReenviar2Fa = async () => {
    if (!sessionId) return;
    setLoading(true);
    setErrorGeneral(null);
    setReenviadoExitoso(false);

    try {
      const res = await resend2Fa(sessionId);
      if (res.success) {
        setSegundosRestantes(300);
        setCodigo2Fa("");
        setReenviadoExitoso(true);
        setTimeout(() => setReenviadoExitoso(false), 4000);
      } else {
        setErrorGeneral(res.error || "No se pudo reenviar el código");
      }
    } catch {
      setErrorGeneral("Error al solicitar nuevo código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PASO 1: CORREO Y CONTRASEÑA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {paso === 1 && (
        <div className="animate-fade-in">
          {/* Encabezado clínico */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20 flex-shrink-0">
              <MdHealthAndSoapOrSafety size={26} />
            </div>
            <div>
              <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Acceso Especialista
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Protocolo Rotterdam SOP
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="mt-1.5 mb-6 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ingrese sus credenciales registradas. Por seguridad clínica, se despachará un código de verificación directamente a su correo para el Doble Factor (2FA).
          </p>

          {/* Alerta de error de credenciales */}
          {errorGeneral && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-900/25 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold animate-shake">
              <MdErrorOutline size={20} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorGeneral}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPaso1} className="space-y-4" noValidate autoComplete="off">
            {/* Campo Correo Electrónico */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <MdEmail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  placeholder="ejemplo: medico@hospital.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (erroresCampos.email) {
                      setErroresCampos((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-navy-900 border ${
                    erroresCampos.email
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 dark:border-navy-600 focus:border-rose-500 focus:ring-rose-500/30"
                  } rounded-xl text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {erroresCampos.email && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                  {erroresCampos.email}
                </p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <MdLock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (erroresCampos.password) {
                      setErroresCampos((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`w-full pl-10 pr-11 py-3 bg-white dark:bg-navy-900 border ${
                    erroresCampos.password
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 dark:border-navy-600 focus:border-rose-500 focus:ring-rose-500/30"
                  } rounded-xl text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
              {erroresCampos.password && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                  {erroresCampos.password}
                </p>
              )}
              {/* Enlace para restablecer / cambiar contraseña con 2FA */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
                >
                  ¿Olvidó su contraseña o desea cambiarla?
                </button>
              </div>
            </div>

            {/* Acción de Inicio de Sesión Único */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando credenciales...</span>
                  </div>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <MdArrowForward size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PASO 2: DOBLE FACTOR DE AUTENTICACIÓN (2FA POR CORREO OBLIGATORIO) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {paso === 2 && (
        <div className="animate-fade-in">
          {/* Botón volver al paso 1 */}
          <button
            type="button"
            onClick={() => {
              setPaso(1);
              setErrorGeneral(null);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 mb-5 transition-colors cursor-pointer"
          >
            <MdArrowBack size={16} />
            <span>Volver a ingresar credenciales</span>
          </button>

          {/* Encabezado 2FA */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
              <MdVpnKey size={24} />
            </div>
            <div>
              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Seguridad HIPAA / 2FA
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mt-0.5">
                Doble Factor por Correo
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Por seguridad médica, hemos enviado un código de 6 dígitos a su correo electrónico para confirmar su identidad antes de otorgar acceso al sistema.
          </p>

          {/* Tarjeta de notificación del correo enviado */}
          <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/40 rounded-2xl mb-5 flex items-start gap-3">
            <MdMarkEmailRead size={22} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed min-w-0">
              <p className="font-bold">Código enviado a su bandeja:</p>
              <p className="mt-0.5 font-mono text-[11px] text-purple-700 dark:text-purple-300 font-semibold truncate">
                {emailMasked}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Revise su bandeja de entrada (o carpeta de spam) e ingrese el código a continuación.
              </p>
            </div>
          </div>

          {/* Mensaje de reenvío exitoso */}
          {reenviadoExitoso && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-fade-in">
              <MdCheckCircle size={18} className="flex-shrink-0 text-emerald-500" />
              <span>Se ha reenviado un nuevo código a su correo electrónico.</span>
            </div>
          )}

          {/* Error general en 2FA */}
          {errorGeneral && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-900/25 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold animate-shake">
              <MdErrorOutline size={20} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorGeneral}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPaso2} className="space-y-4" autoComplete="off">
            <div>
              <label
                htmlFor="code2fa"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider text-center"
              >
                Código Recibido en su Correo (6 Dígitos)
              </label>

              <div className="relative">
                <input
                  ref={input2FaRef}
                  id="code2fa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  placeholder="••••••"
                  value={codigo2Fa}
                  onChange={(e) => {
                    const soloNumeros = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCodigo2Fa(soloNumeros);
                    if (errorGeneral) setErrorGeneral(null);
                    if (soloNumeros.length === 6) {
                      ejecutarVerificacion2Fa(soloNumeros);
                    }
                  }}
                  className="w-full py-3.5 px-4 text-center text-2xl font-mono font-black tracking-[0.5em] bg-slate-50 dark:bg-navy-900 border-2 border-purple-200 dark:border-navy-600 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 rounded-2xl text-slate-800 dark:text-white placeholder-slate-300 focus:outline-none transition-all shadow-inner"
                />
              </div>

              {/* Temporizador y reenvío */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Expira en:{" "}
                  <strong
                    className={`font-mono font-bold ${
                      segundosRestantes < 60 ? "text-rose-500 animate-pulse" : "text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {formatearTiempo(segundosRestantes)}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={handleReenviar2Fa}
                  disabled={loading}
                  className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <MdRefresh size={16} />
                  <span>Reenviar código al correo</span>
                </button>
              </div>
            </div>

            {/* Botón validar 2FA */}
            <button
              type="submit"
              disabled={loading || codigo2Fa.length < 6}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando código...</span>
                </div>
              ) : (
                <>
                  <MdCheckCircle size={18} />
                  <span>Verificar y Acceder al Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Pie de seguridad HIPAA */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-navy-700 flex items-center justify-between text-[11px] text-slate-400">
        <span>Conexión cifrada JWT / SSL</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
          <MdCheckCircle size={14} /> HIPAA Compliant
        </span>
      </div>

      {/* Modal para restablecer / cambiar contraseña médica (Portal a nivel de body) */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
        onPasswordChanged={(newPwd) => {
          setPassword(newPwd);
          setErrorGeneral(null);
        }}
      />
    </div>
  );
}

// Icon helper
function MdHealthAndSoapOrSafety(props: any) {
  return <MdHealthAndSafety {...props} />;
}