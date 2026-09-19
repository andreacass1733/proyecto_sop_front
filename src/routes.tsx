import React from "react";

// Views
import MainDashboard from "views/admin/default";
import Analysis from "views/admin/analysis";
import Pacientes from "views/admin/pacientes";
import DetallePaciente from "views/admin/pacientes/DetallePaciente";
import AntecedentesView from "views/admin/antecedentes";
import CitasView from "views/admin/citas";
import ConsultasView from "views/admin/consultas";
import SignIn from "views/auth/SignIn";

// Icons
import {
  MdHome,
  MdImageSearch,
  MdPeople,
  MdLock,
  MdMedicalServices,
  MdAssignment,
  MdCalendarMonth,
  MdFormatListBulleted,
} from "react-icons/md";

const routes: RoutesType[] = [
  {
    category: "PANEL PRINCIPAL",
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-5 w-5" />,
    component: <MainDashboard />,
  },
  {
    category: "PACIENTES Y ATENCIÓN CLÍNICA",
    name: "Pacientes",
    layout: "/admin",
    path: "pacientes",
    icon: <MdPeople className="h-5 w-5" />,
    component: <Pacientes />,
  },
  {
    category: "PACIENTES Y ATENCIÓN CLÍNICA",
    name: "Consultas Médicas",
    layout: "/admin",
    path: "consultas",
    icon: <MdFormatListBulleted className="h-5 w-5" />,
    component: <ConsultasView />,
  },
  {
    category: "PACIENTES Y ATENCIÓN CLÍNICA",
    name: "Agenda de Citas",
    layout: "/admin",
    path: "citas",
    icon: <MdCalendarMonth className="h-5 w-5" />,
    component: <CitasView />,
  },
  {
    category: "DIAGNÓSTICO E IA (ROTTERDAM)",
    name: "Antecedentes Médicos (XGBoost)",
    layout: "/admin",
    path: "antecedentes",
    icon: <MdAssignment className="h-5 w-5" />,
    component: <AntecedentesView />,
  },
  {
    category: "DIAGNÓSTICO E IA (ROTTERDAM)",
    name: "Análisis Ecográfico (EfficientNet)",
    layout: "/admin",
    path: "analysis",
    icon: <MdImageSearch className="h-5 w-5" />,
    component: <Analysis />,
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
