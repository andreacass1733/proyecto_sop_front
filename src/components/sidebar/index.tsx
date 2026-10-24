/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiX } from "react-icons/hi";
import { MdBiotech, MdFavorite } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import Links from "./components/Links";
import routes from "routes";
import { useAuth } from "context/AuthContext";
import LogoutConfirmationModal from "components/modal/LogoutConfirmationModal";

const Sidebar = (props: {
  open: boolean;
  onClose: (e?: any) => void;
}) => {
  const { open, onClose } = props;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate("/auth/sign-in", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <div
        className={`glass-sidebar duration-300 linear fixed z-40 flex h-full flex-col pb-6 transition-all shadow-2xl xl:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 280 }}
      >
        {/* Botón cerrar móvil */}
        <span
          className="absolute top-4 right-4 block cursor-pointer xl:hidden text-white/50 hover:text-white transition-colors"
          onClick={onClose}
        >
          <HiX size={20} />
        </span>

        {/* Logo / Brand */}
        <div className="mx-6 mt-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7, #7c3aed)" }}
          >
            <MdBiotech size={22} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-base leading-none tracking-tight">
              SOP<span className="font-light text-pink-400"> System</span>
            </p>
            <p className="text-xs text-white/40 font-medium mt-0.5">Criterios de Rotterdam</p>
          </div>
        </div>

        {/* Divisor con gradiente */}
        <div
          className="mx-6 mt-7 mb-5 h-px"
          style={{ background: "linear-gradient(90deg, rgba(244,63,94,0.4), rgba(124,58,237,0.4), transparent)" }}
        />

        {/* Links de navegación */}
        <ul className="mb-auto px-3 space-y-1 overflow-y-auto">
          <Links routes={routes} {...({ onClose } as any)} />
        </ul>

        {/* Footer del sidebar con Cierre de Sesión */}
        <div className="mx-6 mt-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Cerrar sesión del sistema"
          >
            <FiLogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>

          <div
            className="rounded-2xl p-3.5"
            style={{
              background: "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(124,58,237,0.12))",
              border: "1px solid rgba(244,63,94,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MdFavorite size={14} className="text-pink-400" />
              <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider">Sistema Activo</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Detección y Seguimiento Clínico de SOP
            </p>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de cierre de sesión */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
};

export default Sidebar;
