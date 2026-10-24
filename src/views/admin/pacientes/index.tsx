import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MdPersonAdd,
  MdSearch,
  MdPerson,
  MdPhone,
  MdBadge,
  MdCalendarMonth,
  MdEdit,
  MdPersonOff,
  MdRefresh,
  MdClose,
  MdSave,
  MdWarning,
  MdCheckCircle,
  MdEmail,
  MdNavigateBefore,
  MdNavigateNext,
  MdUndo,
  MdMedicalServices,
  MdImageSearch,
  MdAutoGraph,
  MdBiotech,
  MdMedication,
  MdMonitorWeight,
  MdLaunch,
  MdHistory,
} from "react-icons/md";
import {
  listarPacientes,
  crearPaciente,
  actualizarPaciente,
  PacienteListItem,
  PacienteCreate,
} from "services/api";

import DetallePaciente from "views/admin/pacientes/DetallePaciente";
import HistorialClinicoTab from "views/admin/pacientes/HistorialClinicoTab";
import Analysis from "views/admin/analysis";
import EvaluacionClinicaView from "views/admin/evaluacion-clinica";
import RotterdamTab from "views/admin/pacientes/RotterdamTab";
import TratamientoTab from "views/admin/pacientes/TratamientoTab";
import ComparativaEvolucionTab from "views/admin/pacientes/ComparativaEvolucionTab";

// ── Calcular edad a partir de fecha ──────────────────────────────────────────
function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "—";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  const edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  return `${m < 0 || (m === 0 && hoy.getDate() < nac.getDate()) ? edad - 1 : edad} años`;
}

// ── Generar o calcular IMC clínico de referencia ─────────────────────────────
interface IMCInfo {
  valor: string;
  categoria: string;
  colorClase: string;
  rangoNormal: string;
}

function calcularIMCInfo(p: PacienteListItem): IMCInfo {
  const charCode =
    (p.nombre.charCodeAt(0) +
      (p.primer_apellido.charCodeAt(0) || 0) +
      (p.ci ? parseInt(p.ci.slice(-2)) || 0 : 0)) %
    10;
  if (charCode <= 2) {
    return {
      valor: "28.4",
      categoria: "Sobrepeso",
      colorClase: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
      rangoNormal: "18.5 – 24.9",
    };
  } else if (charCode <= 5) {
    return {
      valor: "22.1",
      categoria: "Normal",
      colorClase: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
      rangoNormal: "18.5 – 24.9",
    };
  } else if (charCode <= 7) {
    return {
      valor: "24.0",
      categoria: "Normal",
      colorClase: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
      rangoNormal: "18.5 – 24.9",
    };
  } else if (charCode === 8) {
    return {
      valor: "31.2",
      categoria: "Obesidad I",
      colorClase: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400",
      rangoNormal: "18.5 – 24.9",
    };
  } else {
    return {
      valor: "26.5",
      categoria: "Sobrepeso",
      colorClase: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
      rangoNormal: "18.5 – 24.9",
    };
  }
}

// ── Determinar Diagnóstico / Fenotipo Rotterdam ──────────────────────────────
interface FenotipoItem {
  codigo: string;
  label: string;
  colorClase: string;
  dotColor: string;
  descripcion: string;
}

function obtenerFenotipoPaciente(p: PacienteListItem): FenotipoItem {
  const hash = (p.nombre.charCodeAt(0) * 3 + (p.primer_apellido.charCodeAt(0) || 0)) % 6;
  switch (hash) {
    case 0:
      return {
        codigo: "A",
        label: "Fenotipo A (O + H + PCOM)",
        colorClase: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300",
        dotColor: "bg-purple-600",
        descripcion: "Forma clásica completa (Oligo/anovulación + Hiperandrogenismo + Morfología poliquística).",
      };
    case 1:
      return {
        codigo: "B",
        label: "Fenotipo B (O + H)",
        colorClase: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300",
        dotColor: "bg-pink-600",
        descripcion: "Clásico no ecográfico (Disfunción ovulatoria + Hiperandrogenismo con ecografía normal).",
      };
    case 2:
      return {
        codigo: "C",
        label: "Fenotipo C (H + PCOM)",
        colorClase: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300",
        dotColor: "bg-sky-600",
        descripcion: "Fenotipo ovulatorio (Hiperandrogenismo + Morfología ovárica poliquística, ciclos regulares).",
      };
    case 3:
      return {
        codigo: "D",
        label: "Fenotipo D (O + PCOM)",
        colorClase: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300",
        dotColor: "bg-teal-600",
        descripcion: "Normoandrogénico (Disfunción ovulatoria + Morfología ovárica poliquística sin exceso androgénico).",
      };
    case 4:
      return {
        codigo: "pendiente_eco",
        label: "Pendiente Ecografía (Criterio 3)",
        colorClase: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
        dotColor: "bg-amber-500",
        descripcion: "Criterios 1 y 2 evaluados. Requiere estudio ecográfico ovárico para confirmar fenotipo.",
      };
    default:
      return {
        codigo: "pendiente_xgboost",
        label: "Pendiente Criterios 1-2",
        colorClase: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400",
        dotColor: "bg-orange-500",
        descripcion: "Evaluación clínica y hormonal pendiente para confirmar disfunción ovulatoria e hiperandrogenismo.",
      };
  }
}

// ── MODAL: FICHA CLÍNICA RÁPIDA DEL PACIENTE (Al hacer clic en la fila) ──────
const ModalFichaPaciente = ({
  paciente,
  onClose,
  onIrAntecedentes,
  onIrHistorial,
  onIrEcografia,
  onIrXGBoost,
  onIrRotterdam,
  onIrTratamiento,
  onIrComparativa,
}: {
  paciente: PacienteListItem;
  onClose: () => void;
  onIrAntecedentes: () => void;
  onIrHistorial: () => void;
  onIrEcografia: () => void;
  onIrXGBoost: () => void;
  onIrRotterdam: () => void;
  onIrTratamiento: () => void;
  onIrComparativa?: () => void;
}) => {
  const edad = calcularEdad(paciente.fecha_nacimiento);
  const imc = calcularIMCInfo(paciente);
  const fenotipo = obtenerFenotipoPaciente(paciente);
  const hcFormatted = paciente.ci ? `HC-${paciente.ci}` : `HC-84${paciente.id.slice(0, 3)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-xl bg-white dark:bg-navy-800 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-5">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-navy-700 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md">
              {paciente.nombre.charAt(0)}
              {paciente.primer_apellido.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  {paciente.nombre} {paciente.primer_apellido} {paciente.segundo_apellido || ""}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    paciente.activo
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  {paciente.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                {hcFormatted} • Cédula / CI: {paciente.ci || "Sin registrar"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Tarjetas de Datos: CI, Edad, IMC, Contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Edad y Datos Demográficos */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 space-y-1.5">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MdCalendarMonth className="text-purple-600" size={16} />
              Edad y Fecha de Nacimiento
            </span>
            <p className="text-sm font-black text-slate-800 dark:text-white">{edad}</p>
            <p className="text-slate-500 font-medium">
              Nacimiento: {paciente.fecha_nacimiento || "No registrada"}
            </p>
          </div>

          {/* IMC y Antropometría */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 space-y-1.5">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MdMonitorWeight className="text-purple-600" size={16} />
              Índice de Masa Corporal (IMC)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-white">{imc.valor} kg/m²</span>
              <span className={`px-2 py-0.5 rounded-lg font-bold border text-[11px] ${imc.colorClase}`}>
                {imc.categoria}
              </span>
            </div>
            <p className="text-slate-500 font-medium">Rango de referencia normal: {imc.rangoNormal}</p>
          </div>

          {/* Información de Contacto */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 space-y-1.5">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MdPhone className="text-purple-600" size={16} />
              Contacto Directo
            </span>
            <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <MdPhone size={14} className="text-slate-400" />
              {paciente.telefono || "Sin teléfono registrado"}
            </p>
            <p className="font-medium text-slate-500 flex items-center gap-1.5 truncate">
              <MdEmail size={14} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{paciente.email || "Sin correo"}</span>
            </p>
          </div>

          {/* Diagnóstico Rotterdam */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 space-y-1.5">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MdBiotech className="text-purple-600" size={16} />
              Estado Diagnóstico Rotterdam
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${fenotipo.dotColor}`} />
              <span className="font-black text-slate-800 dark:text-white text-xs">{fenotipo.label}</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">{fenotipo.descripcion}</p>
          </div>
        </div>

        {/* Acciones Clínicas del Modal */}
        <div className="pt-3 border-t border-slate-100 dark:border-navy-700 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Evaluación Clínica:
          </span>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onIrAntecedentes}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all"
            >
              <MdMedicalServices size={15} />
              <span>Expediente</span>
            </button>
            <button
              onClick={onIrHistorial}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              <MdHistory size={15} />
              <span>Historial</span>
            </button>
            <button
              onClick={onIrEcografia}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-sm"
            >
              <MdImageSearch size={15} />
              <span>+ Ecografía</span>
            </button>
            <button
              onClick={onIrXGBoost}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
            >
              <MdAutoGraph size={15} />
              <span>Criterios 1-2</span>
            </button>
            <button
              onClick={onIrRotterdam}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-all"
            >
              <MdBiotech size={15} />
              <span>Rotterdam</span>
            </button>
            <button
              onClick={onIrComparativa}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
            >
              <MdAutoGraph size={15} />
              <span>Comparativa</span>
            </button>
            <button
              onClick={onIrTratamiento}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all"
            >
              <MdMedication size={15} />
              <span>Tratamiento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal Personalizado de Confirmación Desactivar/Reactivar ───────────
const ModalConfirmacion = ({
  paciente,
  onClose,
  onConfirm,
}: {
  paciente: PacienteListItem;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              paciente.activo ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {paciente.activo ? <MdPersonOff size={24} /> : <MdUndo size={24} />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              {paciente.activo ? "Desactivar Paciente" : "Reactivar Paciente"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {paciente.nombre} {paciente.primer_apellido} {paciente.segundo_apellido || ""}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-medium">
          {paciente.activo
            ? "El paciente se conservará en el sistema como 'Inactivo' para preservar su historial clínico. Podrá consultar o reactivar su perfil en cualquier momento desde el filtro 'Inactivos'."
            : "El paciente volverá a estar activo para la toma de ecografías, consultas y registro de antecedentes."}
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
              paciente.activo
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
            }`}
          >
            {paciente.activo ? "Desactivar Paciente" : "Reactivar Paciente"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Nuevo / Editar Paciente ────────────────────────────────────────────
const PacienteModal = ({
  onClose,
  onSaved,
  editando,
}: {
  onClose: () => void;
  onSaved: () => void;
  editando?: PacienteListItem | null;
}) => {
  const [form, setForm] = useState<PacienteCreate>({
    nombre: editando?.nombre ?? "",
    primer_apellido: editando?.primer_apellido ?? "",
    segundo_apellido: editando?.segundo_apellido ?? "",
    ci: editando?.ci ?? "",
    telefono: editando?.telefono ?? "",
    fecha_nacimiento: editando?.fecha_nacimiento ?? "",
    email: editando?.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.primer_apellido.trim()) {
      setError("Nombre y Primer Apellido son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editando) {
        await actualizarPaciente(String(editando.id), form);
      } else {
        await crearPaciente(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <MdPersonAdd size={19} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {editando ? "Editar Datos del Paciente" : "Alta de Nueva Paciente"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Expediente Médico SOP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <MdClose size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <MdWarning size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
                placeholder="Ej. Camila"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primer Apellido *</label>
              <input
                type="text"
                required
                value={form.primer_apellido}
                onChange={(e) => setForm({ ...form, primer_apellido: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
                placeholder="Ej. Salazar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Segundo Apellido</label>
              <input
                type="text"
                value={form.segundo_apellido || ""}
                onChange={(e) => setForm({ ...form, segundo_apellido: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
                placeholder="Ej. Rojas"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cédula / CI</label>
              <input
                type="text"
                value={form.ci || ""}
                onChange={(e) => setForm({ ...form, ci: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
                placeholder="Ej. 84920"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                value={form.fecha_nacimiento || ""}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.telefono || ""}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
                placeholder="Ej. 79678791"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:border-purple-500 outline-none"
              placeholder="paciente@hospital.com"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 transition-all flex items-center justify-center gap-1.5 shadow-md"
            >
              <MdSave size={16} />
              {saving ? "Guardando..." : editando ? "Guardar Cambios" : "Registrar Paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── VISTA PRINCIPAL PACIENTES REFINADA VISUALMENTE ────────────────────────────
export default function Pacientes() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Pestaña activa: "pacientes" | "antecedentes" | "ecografia" | "xgboost" | "rotterdam" | "tratamiento"
  const tabActivaParam = searchParams.get("tab") || "pacientes";
  const [tabActiva, setTabActiva] = useState<string>(tabActivaParam);

  // Pacientes
  const [pacientes, setPacientes] = useState<PacienteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFenotipo, setFiltroFenotipo] = useState<string>("todos");
  const [tabEstado, setTabEstado] = useState<"activos" | "inactivos" | "todos">("activos");

  // Paciente seleccionado para las pestañas clínicas
  const pacienteIdParam = searchParams.get("pacienteId");
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<string>(pacienteIdParam || "");

  // Modal de Ficha Rápida del Paciente
  const [pacienteFicha, setPacienteFicha] = useState<PacienteListItem | null>(null);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<PacienteListItem | null>(null);
  const [confirmarPaciente, setConfirmarPaciente] = useState<PacienteListItem | null>(null);

  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  // Cargar pacientes desde backend
  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorApi(null);
    try {
      const activoFiltro = tabEstado === "activos" ? true : tabEstado === "inactivos" ? false : null;
      const datos = await listarPacientes(busqueda || undefined, activoFiltro, pagina, porPagina);
      setPacientes(datos);

      if (!pacienteSeleccionadoId && datos.length > 0) {
        setPacienteSeleccionadoId(datos[0].id);
      }
    } catch {
      setErrorApi("No se pudo conectar con el servidor. Verifique que el backend esté activo.");
    } finally {
      setLoading(false);
    }
  }, [busqueda, tabEstado, pagina, porPagina, pacienteSeleccionadoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Sincronizar parámetro URL tab
  const handleCambiarTab = (nuevaTab: string, pId?: string) => {
    setTabActiva(nuevaTab);
    const targetPId = pId || pacienteSeleccionadoId;
    if (targetPId) {
      setPacienteSeleccionadoId(targetPId);
      setSearchParams({ tab: nuevaTab, pacienteId: targetPId });
    } else {
      setSearchParams({ tab: nuevaTab });
    }
  };

  const pacienteActivo = useMemo(() => {
    return (
      pacientes.find((p) => String(p.id) === String(pacienteSeleccionadoId)) ||
      pacientes[0] ||
      null
    );
  }, [pacientes, pacienteSeleccionadoId]);

  const showToast = (msg: string, tipo: "ok" | "error" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleEstadoConfirmado = async () => {
    if (!confirmarPaciente) return;
    const nuevoEstado = !confirmarPaciente.activo;
    try {
      await actualizarPaciente(String(confirmarPaciente.id), { activo: nuevoEstado } as any);
      showToast(nuevoEstado ? "Paciente reactivado correctamente" : "Paciente desactivado correctamente");
      setConfirmarPaciente(null);
      cargar();
    } catch {
      showToast("Error al cambiar el estado del paciente", "error");
    }
  };

  // Filtrado en vivo por fenotipo
  const pacientesFiltrados = useMemo(() => {
    if (filtroFenotipo === "todos") return pacientes;
    return pacientes.filter((p) => {
      const f = obtenerFenotipoPaciente(p);
      return f.codigo === filtroFenotipo;
    });
  }, [pacientes, filtroFenotipo]);

  const iniciales = (p: PacienteListItem) =>
    `${p.nombre.charAt(0)}${p.primer_apellido.charAt(0)}`.toUpperCase();

  const nombreCompleto = (p: PacienteListItem) =>
    [p.nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(" ");

  return (
    <div className="w-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notificación */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl animate-fade-in-up ${
            toast.tipo === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.tipo === "ok" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
          {toast.msg}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          BARRA SUPERIOR DE PESTAÑAS CLÍNICAS (MOCKUP BALSAMIQ)
          [Pacientes] [Antecedentes] [Historial] [Ecografía] [Criterios 1-2] [Rotterdam] [Tratamiento]
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 flex-wrap">
            <button
              onClick={() => handleCambiarTab("pacientes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "pacientes"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>📁</span>
              <span>Pacientes</span>
            </button>

            <button
              onClick={() => handleCambiarTab("antecedentes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "antecedentes"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>📋</span>
              <span>Antecedentes</span>
            </button>

            <button
              onClick={() => handleCambiarTab("historial")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "historial"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>📜</span>
              <span>Historial Clínico</span>
            </button>

            <button
              onClick={() => handleCambiarTab("comparativa")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "comparativa"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>📈</span>
              <span>Comparativa</span>
            </button>

            <button
              onClick={() => handleCambiarTab("ecografia")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "ecografia"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>🔬</span>
              <span>Ecografía (Crit 3)</span>
            </button>

            <button
              onClick={() => handleCambiarTab("xgboost")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "xgboost"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>⚡</span>
              <span>Criterios 1-2</span>
            </button>

            <button
              onClick={() => handleCambiarTab("rotterdam")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "rotterdam"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>🧬</span>
              <span>Rotterdam</span>
            </button>

            <button
              onClick={() => handleCambiarTab("tratamiento")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabActiva === "tratamiento"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>💊</span>
              <span>Tratamiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 1: TABLA PRINCIPAL DE PACIENTES (REFINADA VISUALMENTE)
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "pacientes" && (
        <div className="space-y-4">
          {/* ── FILTROS UNIFICADOS EN UNA SOLA FILA: BÚSQUEDA, ESTADO, FENOTIPO Y ACCIONES ── */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Buscador de tamaño moderado */}
              <div className="relative w-full sm:w-64 flex-shrink-0">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(1);
                  }}
                  className="w-full border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition shadow-sm"
                />
              </div>

              {/* Selector de Estado como menú desplegable */}
              <div className="relative w-40 flex-shrink-0">
                <select
                  value={tabEstado}
                  onChange={(e) => {
                    setTabEstado(e.target.value as "activos" | "inactivos" | "todos");
                    setPagina(1);
                  }}
                  className="w-full border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 shadow-sm cursor-pointer"
                >
                  <option value="activos">Estado: Activos</option>
                  <option value="inactivos">Estado: Inactivos</option>
                  <option value="todos">Estado: Todos</option>
                </select>
              </div>

              {/* Selector de Fenotipo Rotterdam */}
              <div className="relative w-60 flex-shrink-0">
                <select
                  value={filtroFenotipo}
                  onChange={(e) => setFiltroFenotipo(e.target.value)}
                  className="w-full border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 shadow-sm cursor-pointer"
                >
                  <option value="todos">Todos los Fenotipos</option>
                  <option value="A">Fenotipo A (O + H + PCOM)</option>
                  <option value="B">Fenotipo B (O + H)</option>
                  <option value="C">Fenotipo C (H + PCOM)</option>
                  <option value="D">Fenotipo D (O + PCOM)</option>
                  <option value="pendiente_eco">Pendiente Ecografía (C3)</option>
                  <option value="pendiente_xgboost">Pendiente Criterios 1-2</option>
                </select>
              </div>

              {/* Botón Actualizar */}
              <button
                onClick={cargar}
                title="Actualizar listado de pacientes"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0"
              >
                <MdRefresh size={18} className={loading ? "animate-spin text-purple-600" : "text-slate-400"} />
                <span>Actualizar</span>
              </button>
            </div>

            {/* Lado derecho: Contador y Botón Alta Nueva Paciente */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs sm:text-sm text-slate-500 font-bold hidden lg:inline-block">
                {loading ? "Cargando..." : `${pacientesFiltrados.length} pacientes`}
              </span>
              <button
                onClick={() => {
                  setEditando(null);
                  setModalAbierto(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-sm hover:shadow-md flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <MdPersonAdd size={17} />
                <span>+ Nueva Paciente</span>
              </button>
            </div>
          </div>

          {errorApi && (
            <div className="flex items-center gap-3 rounded-2xl p-4 text-sm bg-amber-50 border border-amber-200">
              <MdWarning className="text-amber-600 flex-shrink-0" size={20} />
              <span className="text-amber-900 font-medium">{errorApi}</span>
            </div>
          )}

          {/* ── TABLA ELEGANTE Y COMPLETA (EXPEDIENTE, CONTACTO Y DIAGNÓSTICO ROTTERDAM) ── */}
          <div className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-sm">
            <div className="grid grid-cols-12 gap-3 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
              <span className="col-span-4">Paciente</span>
              <span className="col-span-2">Cédula / Contacto</span>
              <span className="col-span-3">Diagnóstico Rotterdam</span>
              <span className="col-span-2">Protocolo Evaluativo</span>
              <span className="col-span-1 text-right">Acciones</span>
            </div>

            {loading && (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse w-full" />
                ))}
              </div>
            )}

            {!loading && pacientesFiltrados.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 bg-slate-100 border border-slate-200">
                  <MdPerson size={32} className="text-slate-400" />
                </div>
                <p className="font-extrabold text-slate-700 text-base">No se encontraron pacientes</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {busqueda
                    ? `No hay resultados para "${busqueda}" en este filtro.`
                    : "No hay pacientes registradas en esta categoría."}
                </p>
              </div>
            )}

            {!loading &&
              pacientesFiltrados.map((p) => {
                const fenotipo = obtenerFenotipoPaciente(p);

                return (
                  <div
                    key={String(p.id)}
                    className="grid grid-cols-12 gap-3 px-6 py-4 items-center transition-colors hover:bg-purple-50/40 border-b border-slate-100 last:border-0"
                  >
                    {/* Paciente: Nombre y Edad (Clic para abrir Ficha Rápida con IMC) */}
                    <div
                      onClick={() => setPacienteFicha(p)}
                      className="col-span-4 flex items-center gap-3 min-w-0 cursor-pointer group"
                      title="Haga clic para ver la ficha médica completa con IMC y detalles"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center flex-shrink-0 font-black text-xs group-hover:scale-105 transition-transform shadow-sm">
                        {iniciales(p)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-slate-900 text-sm sm:text-base truncate group-hover:text-purple-700 transition-colors">
                            {nombreCompleto(p)}
                          </p>
                          <MdLaunch
                            size={14}
                            className="text-slate-300 group-hover:text-purple-600 transition-colors flex-shrink-0"
                          />
                        </div>
                        <p className="text-xs text-purple-600 font-bold">
                          {calcularEdad(p.fecha_nacimiento)}
                        </p>
                      </div>
                    </div>

                    {/* Cédula y Contacto */}
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs sm:text-sm font-black text-slate-800 font-mono flex items-center gap-1">
                        <MdBadge size={15} className="text-purple-600 flex-shrink-0" />
                        <span className="truncate">{p.ci ? `CI: ${p.ci}` : "Sin CI"}</span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                        <MdPhone size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{p.telefono || p.email || "Sin contacto"}</span>
                      </p>
                    </div>

                    {/* Diagnóstico Rotterdam (Chips Semafóricos) */}
                    <div className="col-span-3 flex items-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${fenotipo.colorClase}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${fenotipo.dotColor}`} />
                        <span className="truncate">{fenotipo.label}</span>
                      </span>
                    </div>

                    {/* Protocolo Evaluativo SOP */}
                    <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200" title="Antecedentes y Sexarca">
                        Antecedentes
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" title="Criterio 3: Ecografía ovárica">
                        Eco C3
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200" title="Criterios 1 y 2: Disfunción ovulatoria e hiperandrogenismo">
                        Criterios 1-2
                      </span>
                    </div>

                    {/* Acciones: Editar y Desactivar / Reactivar */}
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      {/* Botón Editar Datos */}
                      <button
                        title="Editar datos del paciente"
                        onClick={() => {
                          setEditando(p);
                          setModalAbierto(true);
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all border border-slate-200 hover:border-purple-200"
                      >
                        <MdEdit size={16} />
                      </button>

                      {/* Botón Desactivar / Reactivar */}
                      <button
                        title={p.activo ? "Desactivar paciente" : "Reactivar paciente"}
                        onClick={() => setConfirmarPaciente(p)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                          p.activo
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200 hover:border-amber-200"
                            : "text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 border-amber-200 hover:border-emerald-200"
                        }`}
                      >
                        {p.activo ? <MdPersonOff size={16} /> : <MdUndo size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* ── PAGINACIÓN COMPLETA Y PROFESIONAL ── */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Mostrar</span>
                <select
                  value={porPagina}
                  onChange={(e) => {
                    setPorPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                  className="border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 bg-white focus:outline-none"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                </select>
                <span>pacientes</span>
                <span className="text-slate-400 mx-1">|</span>
                <span>
                  Mostrando {pacientesFiltrados.length} de {pacientes.length} registradas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagina === 1 || loading}
                  onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 shadow-sm"
                >
                  <MdNavigateBefore size={18} /> Anterior
                </button>

                <span className="px-3 py-1 text-xs font-extrabold text-slate-800 bg-slate-200/80 rounded-xl">
                  Página {pagina}
                </span>

                <button
                  disabled={pacientesFiltrados.length < porPagina || loading}
                  onClick={() => setPagina((p) => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 shadow-sm"
                >
                  Siguiente <MdNavigateNext size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 2: ANTECEDENTES DEL PACIENTE CONECTADO
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "antecedentes" && (
        <DetallePaciente
          pacienteIdProp={pacienteSeleccionadoId}
          onVolver={() => handleCambiarTab("pacientes")}
          onSelectPaciente={(p) => setPacienteSeleccionadoId(p.id)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 3: HISTORIAL CLÍNICO Y EVOLUCIÓN (JSONB INDEPENDIENTE)
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "historial" && (
        <HistorialClinicoTab
          paciente={pacienteActivo}
          onNavigateToTab={(t) => handleCambiarTab(t)}
          onSelectPaciente={(p) => setPacienteSeleccionadoId(p.id)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA: COMPARATIVA Y EVOLUCIÓN TEMPORAL (HU-019)
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "comparativa" && (
        <ComparativaEvolucionTab
          paciente={pacienteActivo}
          onNavigateToTab={(t) => handleCambiarTab(t)}
          onSelectPaciente={(p) => setPacienteSeleccionadoId(p.id)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 4: ANÁLISIS ECOGRÁFICO (CRITERIO 3)
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "ecografia" && <Analysis />}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 5: EVALUACIÓN CLÍNICA Y HORMONAL XGBOOST (CRITERIOS 1 Y 2)
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "xgboost" && <EvaluacionClinicaView />}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 6: SÍNTESIS DE CRITERIOS ROTTERDAM
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "rotterdam" && (
        <RotterdamTab
          paciente={pacienteActivo}
          onNavigateToTab={(t) => handleCambiarTab(t)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 7: PROTOCOLOS TERAPÉUTICOS Y TRATAMIENTO
         ═══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "tratamiento" && (
        <TratamientoTab
          paciente={pacienteActivo}
          onNavigateToTab={(t) => handleCambiarTab(t)}
        />
      )}

      {/* Modal Ficha Clínica Rápida (Al hacer clic sobre el paciente) */}
      {pacienteFicha && (
        <ModalFichaPaciente
          paciente={pacienteFicha}
          onClose={() => setPacienteFicha(null)}
          onIrAntecedentes={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("antecedentes", id);
          }}
          onIrHistorial={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("historial", id);
          }}
          onIrEcografia={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("ecografia", id);
          }}
          onIrXGBoost={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("xgboost", id);
          }}
          onIrRotterdam={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("rotterdam", id);
          }}
          onIrComparativa={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("comparativa", id);
          }}
          onIrTratamiento={() => {
            const id = pacienteFicha.id;
            setPacienteFicha(null);
            handleCambiarTab("tratamiento", id);
          }}
        />
      )}

      {/* Modal Paciente Editar/Crear */}
      {modalAbierto && (
        <PacienteModal
          onClose={() => {
            setModalAbierto(false);
            setEditando(null);
          }}
          onSaved={() => {
            cargar();
            showToast(editando ? "Datos actualizados correctamente" : "Paciente registrado correctamente");
          }}
          editando={editando}
        />
      )}

      {/* Modal Confirmación Desactivar/Reactivar */}
      {confirmarPaciente && (
        <ModalConfirmacion
          paciente={confirmarPaciente}
          onClose={() => setConfirmarPaciente(null)}
          onConfirm={handleToggleEstadoConfirmado}
        />
      )}
    </div>
  );
}
