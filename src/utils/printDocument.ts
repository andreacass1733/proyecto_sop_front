/**
 * Utilidad de impresión clínica limpia y minimalista.
 * Utiliza un iframe oculto para aislar completamente el documento del entorno SPA,
 * evitando que se impriman barras de navegación, overlays oscuros o elementos de la UI,
 * y previniendo los mensajes "localhost:3000 dice:".
 */

export function imprimirContenidoClinico(tituloDocumento: string, cuerpoHtml: string): void {
  // Eliminar iframe previo si existe
  const idIframe = "sop-print-frame";
  const iframeExistente = document.getElementById(idIframe);
  if (iframeExistente) {
    iframeExistente.remove();
  }

  // Crear iframe invisible
  const iframe = document.createElement("iframe");
  iframe.id = idIframe;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const htmlCompleto = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${tituloDocumento}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.45;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #7c3aed;
          padding-bottom: 12px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .hospital-title {
          font-size: 15pt;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .hospital-subtitle {
          font-size: 9pt;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }
        .doc-meta {
          text-align: right;
          font-size: 8.5pt;
          color: #475569;
        }
        .doc-id {
          font-family: monospace;
          font-weight: 800;
          color: #7c3aed;
          font-size: 10pt;
        }
        .section-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 14px;
          background: #f8fafc;
        }
        .section-title {
          font-size: 9pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .grid-4 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 8px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .item-label {
          font-size: 8pt;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
        }
        .item-value {
          font-size: 10pt;
          font-weight: 700;
          color: #0f172a;
        }
        .dictamen-banner {
          background: #faf5ff;
          border: 1.5px solid #a855f7;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }
        .dictamen-title {
          font-size: 11pt;
          font-weight: 900;
          color: #581c87;
          margin: 0 0 4px 0;
        }
        .dictamen-desc {
          font-size: 9pt;
          color: #3b0764;
          line-height: 1.4;
        }
        .criteria-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          background: #ffffff;
        }
        .criteria-title {
          font-size: 8pt;
          font-weight: 800;
          color: #6b21a8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .criteria-detail {
          font-size: 8.5pt;
          color: #334155;
          line-height: 1.3;
        }
        .criteria-prob {
          font-weight: 800;
          color: #7c3aed;
        }
        .med-item {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 6px;
          background: #ffffff;
        }
        .med-header {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          font-size: 9.5pt;
          color: #0f172a;
        }
        .med-detail {
          font-size: 8.5pt;
          color: #475569;
          margin-top: 3px;
        }
        .footer-signatures {
          margin-top: 24px;
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .signature-block {
          border-top: 1px solid #94a3b8;
          width: 220px;
          padding-top: 6px;
          text-align: center;
          font-size: 8.5pt;
          color: #475569;
        }
        .seal-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          background: #f8fafc;
          font-size: 7.5pt;
          color: #64748b;
          font-family: monospace;
          text-align: right;
          max-width: 280px;
        }
      </style>
    </head>
    <body>
      ${cuerpoHtml}
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlCompleto);
  doc.close();

  // Esperar a que cargue e imprimir
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn("Fallo al imprimir desde iframe:", e);
    }
  }, 350);
}
