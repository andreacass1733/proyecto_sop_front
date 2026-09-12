/* eslint-disable */
import { HiX } from "react-icons/hi";
import { MdBiotech, MdFavorite } from "react-icons/md";
import Links from "./components/Links";
import routes from "routes";

const Sidebar = (props: {
  open: boolean;
  onClose: (e?: any) => void;
}) => {
  const { open, onClose } = props;
  return (
    <div
      className={`glass-sidebar duration-300 linear fixed z-40 flex h-full flex-col pb-10 transition-all shadow-2xl xl:shadow-none ${
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
      <ul className="mb-auto px-3 space-y-1">
        <Links routes={routes} {...({ onClose } as any)} />
      </ul>

      {/* Footer del sidebar */}
      <div className="mx-6 mt-6">
        <div
          className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(124,58,237,0.12))",
            border: "1px solid rgba(244,63,94,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <MdFavorite size={14} className="text-pink-400" />
            <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">Sistema Activo</span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Detección de SOP asistida por IA — EfficientNet-B0 v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
