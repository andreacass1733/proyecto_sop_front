import React from "react";
import ReactDOM from "react-dom";
import { FiLogOut, FiAlertTriangle } from "react-icons/fi";

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      {/* Fondo clicable para cerrar */}
      <div className="fixed inset-0" onClick={!loading ? onClose : undefined} />

      {/* Tarjeta modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-navy-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-700 p-6 sm:p-7 z-10 animate-scale-up">
        {/* Icono de advertencia */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <FiAlertTriangle size={28} />
        </div>

        {/* Textos */}
        <div className="text-center">
          <h3 className="text-lg font-black text-slate-800 dark:text-white">
            Confirmar Cierre de Sesión
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ¿Está seguro de que desea cerrar la sesión actual? Por seguridad y confidencialidad médica (normativa HIPAA), el token JWT será invalidado en la base de datos y se cerrará el acceso a los expedientes de pacientes.
          </p>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-navy-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Cerrando...</span>
              </div>
            ) : (
              <>
                <FiLogOut size={15} />
                <span>Cerrar Sesión</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutConfirmationModal;
