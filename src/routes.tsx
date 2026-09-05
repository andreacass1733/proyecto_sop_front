import React from "react";

// Views (tus pantallas)
import MainDashboard from "views/admin/default";
import Analysis from "views/admin/analysis";
// import Results from "views/admin/results";
// import ModelInfo from "views/admin/model";
// import About from "views/admin/about";

// Auth
import SignIn from "views/auth/SignIn";

// Icons
import {
  MdHome,
  MdImageSearch,
  MdBarChart,
  MdInsights,
  MdInfo,
  MdLock,
} from "react-icons/md";

const routes = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-6 w-6" />,
    component: <MainDashboard />,
  },

  {
    name: "Análisis de Ecografía",
    layout: "/admin",
    path: "analysis",
    icon: <MdImageSearch className="h-6 w-6" />,
    component: <Analysis />,
  },

  {
    name: "Resultados",
    layout: "/admin",
    path: "results",
    icon: <MdBarChart className="h-6 w-6" />,
    component: <MainDashboard />, //<Results />,
  },

  {
    name: "Modelo IA",
    layout: "/admin",
    path: "model",
    icon: <MdInsights className="h-6 w-6" />,
    component: <MainDashboard />, //<ModelInfo />,
  },

  {
    name: "Acerca del Sistema",
    layout: "/admin",
    path: "about",
    icon: <MdInfo className="h-6 w-6" />,
    component: <MainDashboard />,//<About />,
  },

  {
    name: "Sign In",
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-6 w-6" />,
    component: <SignIn />,
  },
];

export default routes;
