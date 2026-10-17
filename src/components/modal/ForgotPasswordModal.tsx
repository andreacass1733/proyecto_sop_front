import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdCheckCircle,
  MdErrorOutline,
  MdClose,
  MdLockReset,
  MdArrowBack,
  MdRefresh,
  MdVpnKey,
  MdMarkEmailRead,
} from "react-icons/md";
import { solicitarRecuperacionApi, restablecerContrasenaApi } from "services/api";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onPasswordChanged?: (newPassword: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = "",
  onPasswordChanged,
}) => {
  // Paso 1 = Ingresar Correo y Solicitar Código; Paso 2 = Ingresar Código + Nueva Contraseña
  const [paso, setPaso] = useState<1 | 2>(1);

  // Estados Paso 1
  const [email, setEmail] = useState<string>(initialEmail);

  // Estados Paso 2
  const [sessionId, setSessionId] = useState<string>("");
  const [emailMasked, setEmailMasked] = useState<string>("");
  const [codigoOtp, setCodigoOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [reenviado, setReenviado] = useState<boolean>(false);

  // Estados comunes
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Sincronizar email inicial si cambia la propiedad
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || "");
      setPaso(1);
      setError(null);
      setExito(null);
      setCodigoOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setReenviado(false);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  // ── PASO 1: Solicitar código OTP al correo electrónico ─────────────────────
  const handleSolicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("El correo electrónico es requerido");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Formato de correo electrónico inválido");
      return;
    }

    setLoading(true);

    try {
      const res = await solicitarRecuperacionApi(cleanEmail);
      setSessionId(res.session_id);
      setEmailMasked(res.email_masked || cleanEmail);
      setPaso(2);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error al solicitar el código de recuperación");
    } finally {
      setLoading(false);
    }
  };

  // ── Reenviar código OTP ────────────────────────────────────────────────────
  const handleReenviarCodigo = async () => {
    setError(null);
    setReenviado(false);
    setLoading(true);

    try {
      const res = await solicitarRecuperacionApi(email.trim());
      setSessionId(res.session_id);
      setEmailMasked(res.email_masked || email.trim());
      setReenviado(true);
      setTimeout(() => setReenviado(false), 4000);
    } catch (err: any) {
      setError(err.message || "Error al reenviar código");
    } finally {
      setLoading(false);
    }
  };

  // ── PASO 2: Validar código y cambiar contraseña ───────────────────────────
  const handleCambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    const cleanCode = codigoOtp.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError("Ingrese el código completo de 6 dígitos recibido en su correo");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await restablecerContrasenaApi({
        email: email.trim(),
        new_password: newPassword.trim(),
        code: cleanCode,
        session_id: sessionId || undefined,
      });

      setExito(res.mensaje || "Contraseña actualizada exitosamente.");
      if (onPasswordChanged) {
        onPasswordChanged(newPassword.trim());
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Código incorrecto o error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      {/* Fondo clicable para cerrar */}
      <div className="fixed inset-0" onClick={!loading ? onClose : undefined} />

      {/* Tarjeta del Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-navy-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-700 p-6 sm:p-7 z-10 animate-scale-up">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
        >
          <MdClose size={20} />
        </button>

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <MdLockReset size={24} />
          </div>
          <div>
            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {paso === 1 ? "Paso 1 de 2: Verificación" : "Paso 2 de 2: Nueva Clave"}
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight mt-0.5">
              Recuperar Contraseña
            </h3>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/25 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold animate-shake">
            <MdErrorOutline size={18} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de éxito */}
        {exito && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-fade-in">
            <MdCheckCircle size={18} className="flex-shrink-0 text-emerald-500" />
            <span>{exito}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* PASO 1: Ingreso de correo y envío de código */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {paso === 1 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Por seguridad médica y confidencialidad de la cuenta, le enviaremos un <strong>código de verificación de 6 dígitos</strong> a su correo electrónico antes de permitir el cambio de contraseña.
            </p>

            <form onSubmit={handleSolicitarCodigo} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <MdEmail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="email"
                    autoComplete="off"
                    placeholder="ejemplo: medico@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-navy-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando código...</span>
                    </div>
                  ) : (
                    <>
                      <MdVpnKey size={15} />
                      <span>Enviar Código al Correo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* PASO 2: Verificación de código y cambio de clave */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {paso === 2 && (
          <div className="animate-fade-in">
            {/* Botón volver a paso 1 */}
            <button
              type="button"
              onClick={() => {
                setPaso(1);
                setError(null);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 mb-3 transition-colors cursor-pointer"
            >
              <MdArrowBack size={14} />
              <span>Cambiar correo</span>
            </button>

            {/* Aviso de correo enviado */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-3 flex items-start gap-2.5">
              <MdMarkEmailRead size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed min-w-0">
                <p className="font-bold">Código enviado a:</p>
                <p className="font-mono text-[11px] font-semibold truncate text-amber-800 dark:text-amber-300">
                  {emailMasked}
                </p>
              </div>
            </div>

            {reenviado && (
              <div className="mb-3 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-bold animate-fade-in">
                <MdCheckCircle size={15} className="text-emerald-500" />
                <span>Nuevo código reenviado al correo.</span>
              </div>
            )}

            <form onSubmit={handleCambiarContrasena} className="space-y-3" autoComplete="off">
              {/* Código OTP */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Código de Verificación (6 Dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={handleReenviarCodigo}
                    disabled={loading}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <MdRefresh size={14} />
                    <span>Reenviar</span>
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="off"
                  value={codigoOtp}
                  onChange={(e) => {
                    const soloNumeros = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCodigoOtp(soloNumeros);
                    if (error) setError(null);
                  }}
                  className="w-full py-2 px-3 text-center text-lg font-mono font-black tracking-[0.3em] bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Nueva Contraseña Médica
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repita la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-navy-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || codigoOtp.length < 6}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    <>
                      <MdCheckCircle size={16} />
                      <span>Verificar y Cambiar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ForgotPasswordModal;
