import React from "react";
import { Link } from "react-router-dom";
import { RiMoonFill, RiSunFill } from "react-icons/ri";
import { FiAlignJustify, FiChevronDown } from "react-icons/fi";
import { IoMdNotificationsOutline } from "react-icons/io";

const Navbar = (props: {
  onOpenSidenav: () => void;
  brandText: string;
  secondary?: boolean | string;
}) => {
  const { onOpenSidenav, brandText } = props;
  const [darkmode, setDarkmode] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [notifCount] = React.useState(3);

  const toggleDark = () => {
    if (darkmode) {
      document.body.classList.remove("dark");
      setDarkmode(false);
    } else {
      document.body.classList.add("dark");
      setDarkmode(true);
    }
  };

  return (
    <nav className="sticky top-4 z-40 flex flex-row items-center justify-between rounded-2xl bg-white/70 px-5 py-3 shadow-sm shadow-gray-200 backdrop-blur-xl dark:bg-[#1E293B]/80 dark:shadow-none border border-gray-100 dark:border-[#334155]">

      {/* Izquierda: breadcrumb + título */}
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 tracking-wide">
          Pages
          <span className="mx-1.5 text-gray-300 dark:text-gray-600">/</span>
          <span className="capitalize text-pink-400">{brandText}</span>
        </p>
        <Link
          to="#"
          className="text-lg font-bold capitalize text-gray-800 hover:text-pink-500 dark:text-white dark:hover:text-pink-400 transition-colors duration-200 leading-tight"
        >
          {brandText}
        </Link>
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-2">

        {/* Toggle dark/light — solo ícono */}
        <button
          onClick={toggleDark}
          title={darkmode ? "Modo claro" : "Modo oscuro"}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:border-pink-300 hover:text-pink-500 hover:shadow-md dark:border-[#334155] dark:bg-[#0F172A] dark:text-gray-400 dark:hover:border-pink-500 dark:hover:text-pink-400"
        >
          {darkmode
            ? <RiSunFill className="h-[17px] w-[17px] text-yellow-400" />
            : <RiMoonFill className="h-[17px] w-[17px]" />
          }
        </button>

        {/* Separador */}
        <div className="mx-1 h-7 w-px bg-gray-200 dark:bg-[#334155]" />

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm transition-all duration-200 hover:border-pink-300 hover:shadow-md dark:border-[#334155] dark:bg-[#0F172A]"
          >            
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[12px] font-bold text-gray-800 dark:text-white">Adela</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Médico</span>
            </div>
            <FiChevronDown
              className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${showProfile ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown perfil */}
          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfile(false)}
              />
              <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl dark:border-[#334155] dark:bg-[#1E293B]">

                {/* Info usuario */}
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-[#0F172A]">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-bold text-gray-800 dark:text-white">Adela García</span>
                    <span className="text-[11px] text-gray-400">adela@sopai.com</span>
                  </div>
                </div>

                <div className="my-2 h-px bg-gray-100 dark:bg-[#334155]" />

                <div className="my-2 h-px bg-gray-100 dark:bg-[#334155]" />

                {/* Cerrar sesión */}
                <button
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Cerrar sesión
                </button>

              </div>
            </>
          )}
        </div>

        {/* Hamburguesa mobile */}
        <button
          onClick={onOpenSidenav}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-pink-300 hover:text-pink-500 dark:border-[#334155] dark:bg-[#0F172A] dark:text-gray-400 xl:hidden"
        >
          <FiAlignJustify className="h-5 w-5" />
        </button>

      </div>
    </nav>
  );
};

export default Navbar;