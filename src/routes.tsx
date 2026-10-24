import React from "react";

// Views
import MainDashboard from "views/admin/default";
import Analysis from "views/admin/analysis";
import Pacientes from "views/admin/pacientes";
import DetallePaciente from "views/admin/pacientes/DetallePaciente";
import CitasView from "views/admin/citas";
import ConsultasView from "views/admin/consultas";
import SignIn from "views/auth/SignIn";
import EvaluacionClinicaView from "views/admin/evaluacion-clinica";
import AuditoriaLogsView from "views/admin/auditoria";

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
  MdAutoGraph,
  MdSecurity,
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
    category: "GESTIÓN DE PACIENTES",
    name: "Pacientes",
    layout: "/admin",
    path: "pacientes",
    icon: <MdPeople className="h-5 w-5" />,
    component: <Pacientes />,
  },
  {
    category: "GESTIÓN DE PACIENTES",
    name: "Consultas Médicas",
    layout: "/admin",
    path: "consultas",
    icon: <MdFormatListBulleted className="h-5 w-5" />,
    component: <ConsultasView />,
  },
  {
    category: "GESTIÓN DE PACIENTES",
    name: "Agenda de Citas",
    layout: "/admin",
    path: "citas",
    icon: <MdCalendarMonth className="h-5 w-5" />,
    component: <CitasView />,
  },
  {
    category: "EVALUACIÓN Y DIAGNÓSTICO",
    name: "Análisis Ecográfico",
    layout: "/admin",
    path: "analysis",
    icon: <MdImageSearch className="h-5 w-5" />,
    component: <Analysis />,
  },
  {
    category: "EVALUACIÓN Y DIAGNÓSTICO",
    name: "Evaluación Clínica y Hormonal",
    layout: "/admin",
    path: "evaluacion-clinica",
    icon: <MdAutoGraph className="h-5 w-5" />,
    component: <EvaluacionClinicaView />,
  },
  {
    category: "SEGURIDAD Y CUMPLIMIENTO",
    name: "Auditoría y Logs",
    layout: "/admin",
    path: "auditoria-logs",
    icon: <MdSecurity className="h-5 w-5" />,
    component: <AuditoriaLogsView />,
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
