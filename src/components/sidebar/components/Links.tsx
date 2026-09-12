import React from "react";
import { Link, useLocation } from "react-router-dom";
import DashIcon from "components/icons/DashIcon";

export const SidebarLinks = (props: { routes: RoutesType[]; onClose?: () => void }): JSX.Element => {
  const location = useLocation();
  const { routes, onClose } = props;

  const activeRoute = (routeName: string) => {
    return location.pathname.includes(routeName);
  };

  const createLinks = (routes: RoutesType[]) => {
    return routes.map((route, index) => {
      // Mostrar solo rutas del layout /admin que no estén ocultas
      if (route.layout === "/admin" && !(route as any).hideInSidebar) {
        const isActive = activeRoute(route.path);

        return (
          <Link
            key={index}
            to={`${route.layout}/${route.path}`}
            onClick={() => {
              if (onClose && window.innerWidth < 1200) {
                onClose();
              }
            }}
          >
            <div
              className={`relative mb-2 flex items-center rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-rose-500/20 to-purple-500/10 text-white font-bold border border-rose-500/30 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <span className={`text-xl transition-colors ${isActive ? "text-rose-400" : "text-slate-400"}`}>
                {route.icon ? route.icon : <DashIcon />}
              </span>
              <p className="ml-3 text-sm tracking-wide">
                {route.name}
              </p>
              {isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-gradient-to-b from-rose-500 to-purple-500" />
              )}
            </div>
          </Link>
        );
      }
      return null;
    });
  };

  return <nav className="space-y-1">{createLinks(routes)}</nav>;
};

export default SidebarLinks;
