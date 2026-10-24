import { OrdenMedicaOut } from "services/api";

/**
 * Genera el documento HTML profesional, acromático y minimalista para impresión
 * y guardado como PDF de la Orden Médica (Protocolo Rotterdam).
 * Diseño sobrio, sin emojis, sin saturación cromática y con texto conciso.
 */
export function generarHtmlOrdenMedica(orden: OrdenMedicaOut): string {
  const fechaObj = new Date(orden.fecha_emision);
  const fechaFormateada = fechaObj.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const horaFormateada = fechaObj.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const folio = orden.id ? orden.id.slice(0, 8).toUpperCase() : "SOP-0001";
  const nombrePaciente = orden.paciente_nombre || "Paciente";
  const ciPaciente = orden.paciente_ci || "—";
  const diagnostico = orden.diagnostico_presuntivo || "Sospecha de Síndrome de Ovario Poliquístico (CIE-10: E28.2)";
  const prioridad = (orden.prioridad || "normal").toUpperCase();

  // Agrupar exámenes por categoría (sin emojis, títulos técnicos y concisos)
  const categorias: { [key: string]: { titulo: string; items: typeof orden.examenes_laboratorio } } = {
    hormonal: { titulo: "Perfil Hormonal (Rotterdam)", items: [] },
    diferencial: { titulo: "Diagnóstico Diferencial", items: [] },
    metabolico: { titulo: "Perfil Metabólico", items: [] },
    orina: { titulo: "Pruebas de Orina", items: [] },
    otros: { titulo: "Otros Exámenes", items: [] },
  };

  (orden.examenes_laboratorio || []).forEach((e) => {
    const cat = e.categoria && categorias[e.categoria] ? e.categoria : "otros";
    categorias[cat].items.push(e);
  });

  const tieneEcografia = orden.tipo_ecografia && orden.tipo_ecografia !== "ninguna";
  const nombreEcografia =
    orden.tipo_ecografia === "transvaginal"
      ? "Ecografía Transvaginal Ginecológica de Alta Resolución"
      : orden.tipo_ecografia === "pelvica_abdominal"
      ? "Ecografía Pélvica / Abdominal Ginecológica (Repleción Vesical)"
      : orden.tipo_ecografia === "doppler"
      ? "Ecografía Doppler Ovárico"
      : orden.tipo_ecografia;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Orden_Medica_${nombrePaciente.replace(/\\s+/g, "_")}_${folio}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 14mm 16mm 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background-color: #f3f4f6;
      font-size: 10pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Barra Superior no imprimible */
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #111827;
      color: #f9fafb;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      border-bottom: 1px solid #374151;
    }
    .no-print-toolbar button {
      cursor: pointer;
      font-weight: 600;
      padding: 7px 16px;
      border-radius: 6px;
      border: 1px solid #4b5563;
      font-size: 12px;
      background: #1f2937;
      color: #f9fafb;
      transition: background 0.15s;
    }
    .no-print-toolbar button:hover {
      background: #374151;
    }
    .btn-print {
      background: #2563eb !important;
      border-color: #1d4ed8 !important;
      margin-right: 8px;
    }
    .btn-print:hover {
      background: #1d4ed8 !important;
    }

    /* Hoja A4 / Carta */
    .page-container {
      max-width: 800px;
      margin: 20px auto;
      background: #ffffff;
      padding: 32px 36px;
      border: 1px solid #d1d5db;
    }

    @media print {
      body {
        background: #ffffff;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .page-container {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        border: none !important;
      }
    }

    /* Encabezado */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-title h1 {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .header-title p {
      font-size: 8.5pt;
      color: #4b5563;
    }
    .header-right {
      text-align: right;
      font-size: 8.5pt;
      color: #374151;
    }
    .folio-txt {
      font-family: monospace;
      font-weight: 700;
      font-size: 11pt;
      color: #111827;
      letter-spacing: 0.5px;
    }

    .doc-title {
      text-align: center;
      margin: 12px 0;
      padding: 4px 0;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10.5pt;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #111827;
    }

    /* Datos Paciente */
    .patient-card {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 9pt;
      background: #fafafa;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 5px 14px;
    }
    .patient-field strong {
      color: #111827;
      font-weight: 600;
    }

    /* Secciones */
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #111827;
      border-bottom: 1px solid #9ca3af;
      padding-bottom: 2px;
      margin-top: 12px;
      margin-bottom: 8px;
    }

    /* Ecografía */
    .eco-box {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 9pt;
      background: #fafafa;
    }
    .eco-indicacion {
      font-size: 8.5pt;
      color: #374151;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dotted #d1d5db;
    }

    /* Exámenes */
    .examenes-categoria {
      margin-bottom: 8px;
    }
    .categoria-header {
      font-size: 8.5pt;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.2px;
    }
    .examenes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 12px;
    }
    .examen-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 8.5pt;
      color: #111827;
      padding: 2px 0;
    }
    .check-box {
      width: 13px;
      height: 13px;
      border: 1px solid #111827;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      flex-shrink: 0;
    }

    /* Indicaciones */
    .preanalitica-box {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      margin-top: 12px;
      font-size: 8pt;
      color: #374151;
      background: #fafafa;
    }
    .preanalitica-box strong {
      display: block;
      margin-bottom: 3px;
      font-size: 8.5pt;
      text-transform: uppercase;
      color: #111827;
    }
    .preanalitica-texto {
      white-space: pre-line;
      line-height: 1.35;
    }

    /* Firma y Pie */
    .footer-signature {
      margin-top: 24px;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .legal-note {
      font-size: 7.5pt;
      color: #6b7280;
      max-width: 420px;
      line-height: 1.3;
    }
    .signature-box {
      width: 220px;
      text-align: center;
      border-top: 1px solid #111827;
      padding-top: 5px;
      font-size: 8pt;
    }
    .signature-box strong {
      display: block;
      color: #111827;
      font-size: 8.5pt;
    }
    .signature-box p {
      color: #4b5563;
      font-size: 7.5pt;
    }
    .signature-box .matricula {
      font-family: monospace;
      color: #111827;
      font-size: 7.5pt;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <!-- Barra de Acciones no imprimible -->
  <div class="no-print-toolbar">
    <div>
      <strong>Orden Médica #${folio}</strong> — ${nombrePaciente} (${ciPaciente})
    </div>
    <div>
      <button class="btn-print" onclick="window.print();">Imprimir / Guardar PDF</button>
      <button onclick="window.close();">Cerrar</button>
    </div>
  </div>

  <div class="page-container">
    <!-- Encabezado Institucional -->
    <table class="header-table" style="border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top;">
          <div class="header-title">
            <h1>Centro de Endocrinología y Ginecología</h1>
            <p>Unidad Especializada SOP — Protocolo de Diagnóstico y Seguimiento</p>
            <p>Médico: ${orden.medico_nombre || "Dr. Rodrigo Espinoza Iturri"} | Mat: ${orden.medico_matricula || "MP-49201-LP"}</p>
          </div>
        </td>
        <td class="header-right" style="vertical-align: top; width: 200px;">
          <div class="folio-txt">ORDEN #${folio}</div>
          <div>Fecha: ${fechaFormateada}</div>
          <div>Hora: ${horaFormateada}</div>
          <div style="margin-top: 2px; font-weight: 600;">Prioridad: ${prioridad}</div>
        </td>
      </tr>
    </table>

    <div class="doc-title">
      Solicitud de Exámenes de Laboratorio e Imagenología
    </div>

    <!-- Datos de la Paciente -->
    <div class="patient-card">
      <div class="patient-grid">
        <div class="patient-field">
          <strong>Paciente:</strong> ${nombrePaciente}
        </div>
        <div class="patient-field">
          <strong>Cédula de Identidad:</strong> ${ciPaciente}
        </div>
        <div class="patient-field">
          <strong>Diagnóstico Presuntivo:</strong> ${diagnostico}
        </div>
        <div class="patient-field">
          <strong>Validez:</strong> 60 días
        </div>
        ${orden.observaciones ? `
        <div class="patient-field" style="grid-column: 1 / -1;">
          <strong>Observaciones:</strong> ${orden.observaciones}
        </div>` : ""}
      </div>
    </div>

    <!-- 1. Estudio de Imagenología Ecográfica -->
    ${tieneEcografia ? `
    <div class="section-title">
      1. Estudio Ecográfico Ginecológico (Criterio 3 Rotterdam)
    </div>
    <div class="eco-box">
      <div><strong>Estudio:</strong> ${nombreEcografia}</div>
      ${orden.indicacion_ecografia ? `
      <div class="eco-indicacion">
        <strong>Indicación:</strong> ${orden.indicacion_ecografia}
      </div>` : ""}
    </div>
    ` : ""}

    <!-- 2. Exámenes de Laboratorio Solicitados -->
    ${orden.examenes_laboratorio && orden.examenes_laboratorio.length > 0 ? `
    <div class="section-title">
      ${tieneEcografia ? "2" : "1"}. Exámenes de Laboratorio (${orden.examenes_laboratorio.length} solicitados)
    </div>
    
    ${Object.keys(categorias).map(key => {
      const cat = categorias[key];
      if (cat.items.length === 0) return "";
      return `
      <div class="examenes-categoria">
        <div class="categoria-header">${cat.titulo}:</div>
        <div class="examenes-grid">
          ${cat.items.map(item => `
            <div class="examen-item">
              <span class="check-box">X</span>
              <span><strong>${item.codigo}</strong> — ${item.nombre}</span>
            </div>
          `).join("")}
        </div>
      </div>
      `;
    }).join("")}
    ` : ""}

    <!-- 3. Indicaciones Preanalíticas -->
    ${orden.indicaciones_preanaliticas ? `
    <div class="preanalitica-box">
      <strong>Instrucciones de Preparación Pre-analítica:</strong>
      <div class="preanalitica-texto">${orden.indicaciones_preanaliticas}</div>
    </div>
    ` : ""}

    <!-- Firma -->
    <div class="footer-signature">
      <div class="legal-note">
        Documento médico oficial de prescripción diagnóstica bajo Criterios de Rotterdam (2003 / 2023). Válido en laboratorios y centros de imagenología autorizados.
      </div>

      <div class="signature-box">
        <div style="height: 38px;"></div>
        <strong>${orden.medico_nombre || "Dr. Rodrigo Espinoza Iturri"}</strong>
        <p>${orden.medico_especialidad || "Endocrinología y Ginecología"}</p>
        <p class="matricula">${orden.medico_matricula || "MP-49201-LP"}</p>
        <p style="font-size: 7pt; color: #9ca3af; margin-top: 2px;">Firma y Sello Profesional</p>
      </div>
    </div>
  </div>

  <script>
    function launchPrint() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {}
      }, 300);
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      launchPrint();
    } else {
      window.addEventListener('load', launchPrint);
    }
  </script>
</body>
</html>`;
}

/**
 * Abre una ventana o iframe limpio y aislado para imprimir o guardar como PDF la orden médica.
 */
export function imprimirOrdenMedica(orden: OrdenMedicaOut): void {
  const htmlContent = generarHtmlOrdenMedica(orden);

  try {
    const printWindow = window.open("", "_blank", "width=880,height=960,menubar=no,toolbar=no,location=no,status=no");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (_) {}
      }, 500);
      return;
    }
  } catch (e) {
    console.warn("Aviso al abrir ventana de impresión directa:", e);
  }

  // Respaldo en iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1500);
    }, 400);
  }
}
