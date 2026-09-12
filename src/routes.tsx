import React from "react";

// Views
import MainDashboard from "views/admin/default";
import Analysis from "views/admin/analysis";
import Pacientes from "views/admin/pacientes";
import DetallePaciente from "views/admin/pacientes/DetallePaciente";
import AntecedentesView from "views/admin/antecedentes";
import SignIn from "views/auth/SignIn";

// Icons
import {
  MdHome,
  MdImageSearch,
  MdPeople,
  MdLock,
  MdMedicalServices,
  MdAssignment,
} from "react-icons/md";

const routes: RoutesType[] = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-5 w-5" />,
    component: <MainDashboard />,
  },
  {
    name: "Análisis de Ecografía",
    layout: "/admin",
    path: "analysis",
    icon: <MdImageSearch className="h-5 w-5" />,
    component: <Analysis />,
  },
  {
    name: "Pacientes",
    layout: "/admin",
    path: "pacientes",
    icon: <MdPeople className="h-5 w-5" />,
    component: <Pacientes />,
  },
  {
    name: "Antecedentes Médicos",
    layout: "/admin",
    path: "antecedentes",
    icon: <MdAssignment className="h-5 w-5" />,
    component: <AntecedentesView />,
  },
  {
    name: "Expediente de Paciente",
    layout: "/admin",
    path: "pacientes/:id",
    icon: <MdMedicalServices className="h-5 w-5" />,
    component: <DetallePaciente />,
    hideInSidebar: true,
  },
  {
    name: "Iniciar Sesión",
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-5 w-5" />,
    component: <SignIn />,
    hideInSidebar: true,
  },
];

export default routes;
