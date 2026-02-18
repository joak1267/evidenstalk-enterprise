const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Genera un HTML estructurado para el reporte forense y lo convierte a PDF.
 * Incluye: Carátula, Hash de Integridad, Mensajes y Logs de Auditoría.
 */
async function generateForensicReport(savePath, data) {
  const { chatName, hash, messages, auditLogs, caseInfo } = data;

  // 1. CONSTRUIR HTML FORENSE
  // Usamos un diseño limpio, tipo "Documento Legal".
  const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; }
        .page-break { page-break-after: always; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
        .meta-box { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; background: #f8fafc; font-size: 12px; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .hash-box { background: #eef2ff; border: 1px solid #6366f1; color: #312e81; padding: 10px; font-family: monospace; font-size: 11px; margin-top: 10px; }
        
        .chat-container { margin-top: 30px; font-size: 12px; }
        .msg { margin-bottom: 10px; page-break-inside: avoid; }
        .msg-meta { color: #64748b; font-size: 10px; margin-bottom: 2px; }
        .msg-content { background: #f1f5f9; padding: 8px; border-radius: 4px; display: inline-block; max-width: 90%; }
        .msg.evidence .msg-content { background: #fffbeb; border: 1px solid #f59e0b; }
        
        .audit-section { margin-top: 50px; }
        .audit-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .audit-table th, .audit-table td { border: 1px solid #ddd; padding: 5px; text-align: left; }
        .audit-table th { background: #e2e8f0; }
        
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">eVidensTalk Enterprise</div>
        <div>Reporte de Evidencia Digital</div>
      </div>

      <div class="meta-box">
        <h3>INFORMACIÓN DEL CASO</h3>
        <div class="meta-row"><strong>Caso / Chat:</strong> <span>${chatName}</span></div>
        <div class="meta-row"><strong>Fecha de Emisión:</strong> <span>${new Date().toLocaleString()}</span></div>
        <div class="meta-row"><strong>Investigador:</strong> <span>${caseInfo.investigator || 'No especificado'}</span></div>
        <div class="meta-row"><strong>Total Mensajes:</strong> <span>${messages.length}</span></div>
        
        <div class="hash-box">
          <strong>INTEGRIDAD DE ORIGEN (SHA-256):</strong><br/>
          ${hash || '⚠️ INTEGRIDAD NO VERIFICADA - ARCHIVO LEGADO'}
        </div>
        <p style="font-size: 10px; color: #666; margin-top:5px;">
          Este documento es una representación estructurada de evidencia digital. 
          El hash SHA-256 garantiza que el archivo fuente no ha sido modificado desde su ingesta.
        </p>
      </div>

      <div class="page-break"></div>

      <div class="chat-container">
        <h3>TRANSCRIPCIÓN SECUENCIAL</h3>
        ${messages.map(m => `
          <div class="msg ${m.is_evidence ? 'evidence' : ''}">
            <div class="msg-meta">
              <strong>${m.sender_name}</strong> | ${m.timestamp} 
              ${m.is_evidence ? '⭐ EVIDENCIA CLAVE' : ''}
            </div>
            <div class="msg-content">
              ${m.content_text.replace(/\n/g, '<br>')}
              ${m.media_type !== 'text' ? `<br><i>[Adjunto: ${m.media_type}]</i>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="page-break"></div>

      <div class="audit-section">
        <h3>ANEXO: CADENA DE CUSTODIA (LOGS DE SISTEMA)</h3>
        <table class="audit-table">
          <thead>
            <tr><th>Fecha</th><th>Acción</th><th>Detalles</th></tr>
          </thead>
          <tbody>
            ${auditLogs.map(l => `
              <tr>
                <td>${l.timestamp}</td>
                <td>${l.action_type}</td>
                <td>${l.details}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 10px; font-size: 10px;">
          <strong>Fin del Reporte.</strong> Generado automáticamente por eVidensTalk Infrastructure.
        </p>
      </div>
    </body>
    </html>
  `;

  // 2. RENDERIZAR EN VENTANA OCULTA Y EXPORTAR
  // Usamos una ventana offscreen para renderizar el PDF con el motor de Chromium
  let win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
  
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    
    const pdfOptions = {
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
      printBackground: true,
      pageSize: 'A4'
    };

    const pdfData = await win.webContents.printToPDF(pdfOptions);
    fs.writeFileSync(savePath, pdfData);
    
    return { success: true, path: savePath };
  } catch (error) {
    console.error("Error generando PDF:", error);
    return { success: false, error: error.message };
  } finally {
    win.close();
  }
}

module.exports = { generateForensicReport };