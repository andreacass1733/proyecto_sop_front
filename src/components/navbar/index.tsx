import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiMoonFill, RiSunFill } from "react-icons/ri";
import { FiAlignJustify, FiChevronDown, FiLogOut, FiUserCheck } from "react-icons/fi";
import { useAuth } from "context/AuthContext";
import LogoutConfirmationModal from "components/modal/LogoutConfirmationModal";

const Navbar = (props: {
  onOpenSidenav: () => void;
  brandText: string;
  secondary?: boolean | string;
}) => {
  const { onOpenSidenav, brandText } = props;
  const navigate = useNavigate();
  const { medico, logout } = useAuth();
  const [darkmode, setDarkmode] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const toggleDark = () => {
    if (darkmode) {
      document.body.classList.remove("dark");
      setDarkmode(false);
    } else {
      document.body.classList.add("dark");
      setDarkmode(true);
    }
  };

  const handleOpenLogout = () => {
    setShowProfile(false);
    setShowLogoutModal(true);
  };

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

  const doctorName = medico
    ? `Dr. ${medico.nombre} ${medico.primer_apellido}`
    : "Dr. Rodrigo Espinoza";
  const specialty = medico?.especialidad || "Endocrinología y Ginecología";

  return (
    <>
      <nav className="sticky top-4 z-40 flex flex-row items-center justify-between rounded-2xl bg-white/80 dark:bg-navy-800/80 px-5 py-3 shadow-sm backdrop-blur-xl border border-slate-200/80 dark:border-navy-700">
        {/* Izquierda: breadcrumb + título */}
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tracking-wide font-medium">
            Sistema SOP
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">/</span>
            <span className="capitalize text-rose-500 font-bold">{brandText}</span>
          </p>
          <Link
            to="#"
            className="text-lg font-extrabold capitalize text-slate-800 dark:text-white hover:text-rose-500 transition-colors duration-200 leading-tight"
          >
            {brandText}
          </Link>
        </div>

        {/* Derecha: perfil del médico y acciones */}
        <div className="flex items-center gap-3">
          {/* Toggle dark/light */}
          <button
            onClick={toggleDark}
            title={darkmode ? "Modo claro" : "Modo oscuro"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-slate-500 dark:text-slate-300 shadow-sm transition-all hover:border-rose-300 hover:text-rose-500"
          >
            {darkmode ? (
              <RiSunFill className="h-4 w-4 text-amber-400" />
            ) : (
              <RiMoonFill className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Separador */}
          <div className="h-7 w-px bg-slate-200 dark:bg-navy-600" />

          {/* Avatar + Info del Médico */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 px-3 py-1.5 shadow-sm transition-all hover:border-rose-300 hover:shadow-md"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                RE
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                  {doctorName}
                </span>
                <span className="text-[10px] font-semibold text-rose-500">
                  {specialty}
                </span>
              </div>
              <FiChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  showProfile ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown perfil */}
            {showProfile && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfile(false)}
                />
                <div className="absolute right-0 top-12 z-20 w-64 rounded-2xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800 p-3 shadow-2xl animate-fade-in-up">
                  {/* Info usuario */}
                  <div className="flex items-center gap-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/20 p-2.5 border border-rose-100 dark:border-rose-800/40 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      RE
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {doctorName} {medico?.segundo_apellido || ""}
                      </span>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        {specialty}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Tel: {medico?.telefono || "79678791"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 rounded-lg mb-2">
                    <FiUserCheck size={14} />
                    <span>Médico Tratante Único Activo</span>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-navy-700 my-1" />

                  {/* Botón Cerrar sesión en el dropdown con confirmación */}
                  <button
                    onClick={handleOpenLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Botón de Cierre de Sesión Directo en Navbar */}
          <button
            onClick={handleOpenLogout}
            title="Cerrar sesión del sistema"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold shadow-sm hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:border-rose-300 transition-all cursor-pointer"
          >
            <FiLogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>

          {/* Hamburguesa mobile */}
          <button
            onClick={onOpenSidenav}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-slate-500 dark:text-slate-300 shadow-sm transition-all hover:border-rose-300 xl:hidden"
          >
            <FiAlignJustify className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Modal de Confirmación de Cierre de Sesión */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
};

export default Navbar;