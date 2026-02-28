const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// ============================================================================
// 🔥 PARSER DE FECHAS SUPREMO (A PRUEBA DE BALAS PARA ORDENAMIENTO) 🔥
// ============================================================================
function parseArgDate(dateStr) {
  if (!dateStr) return 0;
  try {
    const cleanStr = dateStr.replace(/\n/g, ' ').replace(',', '').trim();
    
    // 1. Intentar formato DB: YYYY-MM-DD HH:MM:SS
    const isoMatch = cleanStr.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
    if (isoMatch) {
        return new Date(isoMatch[1], parseInt(isoMatch[2], 10)-1, isoMatch[3], isoMatch[4], isoMatch[5], isoMatch[6] || 0).getTime();
    }

    // 2. Intentar formato Argentino/WhatsApp: D/M/YYYY HH:MM
    const argMatch = cleanStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[ ,]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/);
    if (argMatch) {
        let d = parseInt(argMatch[1], 10);
        let m = parseInt(argMatch[2], 10) - 1;
        let y = parseInt(argMatch[3], 10);
        if (y < 100) y += 2000; // Por si viene "26" en lugar de "2026"
        let hr = parseInt(argMatch[4] || 0, 10);
        let min = parseInt(argMatch[5] || 0, 10);
        let sec = parseInt(argMatch[6] || 0, 10);
        return new Date(y, m, d, hr, min, sec).getTime();
    }

    // 3. Fallback nativo
    return new Date(cleanStr).getTime() || 0;
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// 🔥 NUEVO: FUNCIÓN PURA DE FILTRADO (SE USA PARA VALIDAR ANTES DE EXPORTAR) 🔥
// ============================================================================
function filterMessages(messages, caseInfo) {
  let processedMessages = [...messages].sort((a, b) => parseArgDate(a.timestamp) - parseArgDate(b.timestamp));

  const mode = caseInfo.mode || 'all';

  if (mode === 'single_day' && caseInfo.singleDate) {
    const [y, m, d] = caseInfo.singleDate.split('-');
    processedMessages = processedMessages.filter(msg => {
       const t = parseArgDate(msg.timestamp);
       if (!t) return false;
       const dObj = new Date(t);
       return dObj.getFullYear() === parseInt(y, 10) && dObj.getMonth() === parseInt(m, 10) - 1 && dObj.getDate() === parseInt(d, 10);
    });
  } 
  else if (mode === 'date_range' && caseInfo.startDate && caseInfo.endDate) {
    const startT = new Date(`${caseInfo.startDate}T00:00:00`).getTime();
    const endT = new Date(`${caseInfo.endDate}T23:59:59`).getTime();
    processedMessages = processedMessages.filter(msg => {
       const t = parseArgDate(msg.timestamp);
       return t >= startT && t <= endT;
    });
  }
  else if (mode === 'keyword' && caseInfo.keyword) {
    const kw = caseInfo.keyword.toLowerCase();
    processedMessages = processedMessages.filter(msg => msg.content_text && msg.content_text.toLowerCase().includes(kw));
    // Resaltamos la palabra
    processedMessages = processedMessages.map(msg => {
       const regex = new RegExp(`(${caseInfo.keyword})`, 'gi');
       return { ...msg, content_text: msg.content_text.replace(regex, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>') };
    });
  }
  else if (mode === 'evidence') {
    // Contexto de Evidencia (2 antes y 2 después)
    let evidenceIds = new Set();
    let contextIds = new Set();
    for (let i = 0; i < processedMessages.length; i++) {
      if (processedMessages[i].is_evidence) {
        evidenceIds.add(processedMessages[i].id);
        for(let j = Math.max(0, i - 2); j <= Math.min(processedMessages.length - 1, i + 2); j++) {
          contextIds.add(processedMessages[j].id);
        }
      }
    }
    processedMessages = processedMessages.filter(msg => contextIds.has(msg.id));
    processedMessages = processedMessages.map(msg => ({ ...msg, is_context_only: !evidenceIds.has(msg.id) }));
  }
  else if (mode === 'media') {
     processedMessages = processedMessages.filter(msg => msg.media_type && msg.media_type !== 'text');
  }

  return processedMessages;
}

/**
 * Genera un HTML estructurado para el reporte forense y lo convierte a PDF.
 */
async function generateForensicReport(savePath, data) {
  const { chatName, hash, messages, auditLogs, caseInfo } = data;
  
  const plan = caseInfo.userPlan || 'comunidad';
  const isFree = plan === 'comunidad';
  const isInst = plan === 'institucional';

  // 🔥 USAMOS LA FUNCIÓN EXTRAÍDA 🔥
  const processedMessages = filterMessages(messages, caseInfo);
  const mode = caseInfo.mode || 'all';

  const modeTitles = {
    'all': 'Sábana Completa de Mensajes',
    'evidence': 'Resumen Ejecutivo de Evidencias (Con Contexto)',
    'single_day': `Filtro por Día: ${caseInfo.singleDate}`,
    'date_range': `Rango de Fechas: ${caseInfo.startDate} al ${caseInfo.endDate}`,
    'keyword': `Búsqueda por Palabra Clave: "${caseInfo.keyword}"`,
    'media': 'Anexo de Archivos Multimedia'
  };
  const reportModeSubtitle = modeTitles[mode] || 'Extracción de Evidencia Digital';

  const agencyName = caseInfo.agencyProfile?.name || 'Departamento de Investigaciones';
  let watermarkText = isInst ? agencyName : (isFree ? 'S/ VALIDEZ LEGAL - FREE' : 'EVIDENSTALK ENTERPRISE');
  let reportTitle = isFree ? 'REPORTE BÁSICO DE LECTURA' : 'INFORME TÉCNICO PERICIAL';
  
  let logoHtml = '';
  if (isInst && caseInfo.agencyProfile?.logoPath && fs.existsSync(caseInfo.agencyProfile.logoPath)) {
    try {
      const ext = path.extname(caseInfo.agencyProfile.logoPath).substring(1);
      const imgData = fs.readFileSync(caseInfo.agencyProfile.logoPath).toString('base64');
      logoHtml = `<img src="data:image/${ext};base64,${imgData}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`;
    } catch (e) { console.error("Error cargando logo:", e); }
  } else if (!isFree) {
    logoHtml = `<div style="font-family: sans-serif; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 24px; font-weight: 900; color: #475569;">eVidensTalk</span>
        <span style="background: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 600;">PRO</span>
    </div>`;
  } else {
    logoHtml = `<div style="font-family: sans-serif; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 22px; font-weight: 900; color: #475569;">eVidensTalk</span>
        <span style="background: #e2e8f0; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 13px; font-weight: 500;">Comunidad</span>
    </div>`;
  }

  let hashHtml = isFree ? `
      <div class="hash-box" style="background: #fef2f2; border-left-color: #ef4444;">
        <span class="meta-label" style="color: #b91c1c;">INTEGRIDAD DE ORIGEN (HASH SHA-256)</span>
        <div class="hash-value" style="color: #ef4444; font-size: 14px; margin-top: 10px;">🔒 FUNCIONALIDAD BLOQUEADA (Requiere Licencia Pro)</div>
        <div style="font-size: 10px; color: #991b1b; margin-top: 8px; font-weight: 600;">⚠️ Este reporte carece de firma criptográfica y cadena de custodia certificada. No posee validez legal probatoria.</div>
      </div>
    ` : `
      <div class="hash-box">
        <span class="meta-label" style="color: #0369a1;">INTEGRIDAD DE ORIGEN (HASH SHA-256)</span>
        <div class="hash-value">${hash || '⚠️ INTEGRIDAD NO VERIFICADA - ARCHIVO LEGADO'}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 8px;">Este dictamen es una representación estructurada inalterada. El hash garantiza la inmutabilidad de la fuente.</div>
      </div>
    `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; font-size: 11px; margin: 0; padding: 0; }
        .page-break { page-break-after: always; }
        .no-break { page-break-inside: avoid; }
        
        .watermark {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px; color: rgba(148, 163, 184, 0.08); white-space: nowrap; z-index: -1;
          font-weight: 800; text-transform: uppercase; pointer-events: none;
        }

        .cover-page { height: 90vh; display: flex; flex-direction: column; padding: 40px; }
        .header-logos { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .header-title { text-align: right; }
        .header-title h1 { margin: 0; font-size: 22px; color: ${isFree ? '#ef4444' : '#000'}; text-transform: uppercase; letter-spacing: 1px; font-weight: 900; }
        .header-title h2 { margin: 0; font-size: 12px; color: #334155; font-weight: 600; text-transform: uppercase; }

        .meta-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 25px; margin-bottom: 20px; background: #f8fafc; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 3px; }
        .meta-value { font-size: 13px; font-weight: 600; color: #0f172a; }

        .hash-box { background: #f1f5f9; border-left: 4px solid #38bdf8; padding: 15px; margin-top: 15px; }
        .hash-value { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #0f172a; word-break: break-all; margin-top: 5px; font-weight: 700; }
        
        .legal-section { margin-top: 30px; margin-bottom: 20px; }
        .legal-title { 
          font-size: 14px; 
          color: #0f172a; 
          border-bottom: 3px solid #0f172a; 
          padding-bottom: 8px; 
          margin-bottom: 12px; 
          font-weight: 900; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
        }
        .legal-text { font-size: 11px; color: #334155; text-align: justify; margin-bottom: 10px; }

        .transcript-table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; margin-top: 10px; }
        .transcript-table th { background: #000; color: white; padding: 8px; text-align: left; text-transform: uppercase; font-size: 9px; font-weight: 600; }
        .transcript-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-wrap: break-word; }
        .col-date { width: 15%; color: #64748b; }
        .col-sender { width: 20%; font-weight: 600; color: #0f172a; }
        .col-msg { width: 65%; }

        .evidence-row td { background-color: #fffbeb; border-bottom: 1px solid #fde68a; }
        .evidence-badge { display: inline-block; background: #0f172a; color: #facc15; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
        .context-badge { display: inline-block; border: 1px solid #cbd5e1; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 8px; margin-bottom: 4px; text-transform: uppercase; }
        
        .media-badge { 
          display: inline-flex; 
          align-items: center; 
          border: 1px solid #cbd5e1; 
          color: #334155; 
          padding: 3px 8px; 
          border-radius: 6px; 
          font-size: 10px; 
          background: #f8fafc; 
          margin-top: 6px; 
          font-weight: 600; 
        }

        .audit-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .audit-table th, .audit-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
        .audit-table th { background: #f1f5f9; text-transform: uppercase; color: #475569; }
      </style>
    </head>
    <body>
      <div class="watermark">${watermarkText}</div>

      <div class="cover-page page-break">
        <div class="header-logos">
          <div>${logoHtml}</div>
          <div class="header-title">
            <h1>${reportTitle}</h1>
            <h2>${reportModeSubtitle}</h2>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">Carátula / Nº de Caso</span><span class="meta-value">${caseInfo.caseNumber || 'NO ESPECIFICADO'}</span></div>
            <div class="meta-item"><span class="meta-label">Perito / Investigador</span><span class="meta-value">${caseInfo.investigator || 'NO ESPECIFICADO'}</span></div>
            <div class="meta-item"><span class="meta-label">Agencia / Organismo</span><span class="meta-value">${isInst ? agencyName : 'N/A (Requiere Plan Institucional)'}</span></div>
            <div class="meta-item"><span class="meta-label">Fecha de Emisión</span><span class="meta-value">${new Date().toLocaleString()}</span></div>
          </div>
        </div>

        <div class="legal-section">
          <div class="legal-title">I - OBJETO DE LA ${isFree ? 'REVISIÓN' : 'PERICIA'}</div>
          <div class="legal-text">
            El presente informe tiene por objeto la extracción, preservación lógica, estructuración y transcripción secuencial de los registros de comunicación correspondientes a la evidencia digital aportada, identificada como <strong>${chatName}</strong>. 
            El proceso fue ejecutado utilizando el motor de análisis <strong>eVidensTalk Enterprise</strong>.
            El filtrado aplicado es: <strong>${reportModeSubtitle}</strong>.
          </div>
        </div>

        <div class="legal-section">
          <div class="legal-title">II - ELEMENTOS OFRECIDOS</div>
          <div class="legal-text">
            Se ha procesado un conjunto de datos digitales originado desde la aplicación de mensajería analizada. Se procedió a la ingesta automatizada mediante el software forense <strong>eVidensTalk</strong>, extrayendo un total de <strong>${processedMessages.length} registros</strong> de comunicación resultantes del filtrado técnico.
          </div>
          ${hashHtml}
        </div>
      </div>

      <div class="legal-section">
        <div class="legal-title">III - OPERACIONES REALIZADAS (TRANSCRIPCIÓN)</div>
        <table class="transcript-table">
          <thead>
            <tr>
              <th class="col-date">Fecha / Hora</th>
              <th class="col-sender">Emisor</th>
              <th class="col-msg">Contenido del Registro</th>
            </tr>
          </thead>
          <tbody>
            ${processedMessages.map(m => {
              
              let transHtml = '';
              if (!isFree && caseInfo.transcripciones) {
                 const textoIA = caseInfo.transcripciones[m.id] || caseInfo.transcripciones[String(m.id)];
                 if (textoIA) {
                    transHtml = `
                      <div style="margin-top: 8px; background: #f0fdf4; padding: 8px; border-left: 3px solid #22c55e; border-radius: 0 4px 4px 0;">
                        <strong style="color: #166534; font-size: 9px; text-transform: uppercase;">🎙️ Transcripción IA Forense (eVidensTalk):</strong><br/>
                        <span style="color: #0f172a; font-size: 10px; font-weight: 500;">"${textoIA}"</span>
                      </div>
                    `;
                 }
              }

              let mediaHtml = '';
              if (m.media_type && m.media_type !== 'text') {
                 if (m.media_type === 'image' && m.local_media_path && fs.existsSync(m.local_media_path)) {
                    try {
                        const ext = path.extname(m.local_media_path).substring(1).toLowerCase().replace('jpg', 'jpeg') || 'jpeg';
                        const imgData = fs.readFileSync(m.local_media_path).toString('base64');
                        mediaHtml = `
                          <br>
                          <div style="margin-top: 8px; padding: 4px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; display: inline-block;">
                            <img src="data:image/${ext};base64,${imgData}" style="max-height: 250px; max-width: 100%; border-radius: 4px; object-fit: contain;" />
                          </div>
                        `;
                    } catch(err) {
                        mediaHtml = `<br><div class="media-badge">📎 Archivo Adjunto: IMAGE (Error de lectura)</div>`;
                    }
                 } else {
                    mediaHtml = `<br><div class="media-badge">📎 Archivo Adjunto: ${m.media_type.toUpperCase()}</div>`;
                 }
              }

              return `
              <tr class="no-break ${m.is_evidence && !m.is_context_only ? 'evidence-row' : ''}">
                <td class="col-date">${m.timestamp}</td>
                <td class="col-sender">${m.sender_name}</td>
                <td class="col-msg">
                  ${m.is_evidence && !m.is_context_only ? `<div class="evidence-badge">★ EVIDENCIA CLAVE</div><br>` : ''}
                  ${m.is_context_only ? `<div class="context-badge">ℹ️ CONTEXTO VINCULADO</div><br>` : ''}
                  
                  ${m.content_text ? m.content_text.replace(/\n/g, '<br>') : ''}
                  
                  ${mediaHtml}

                  ${transHtml}
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>

      <div class="page-break"></div>

      <div class="legal-section">
        <div class="legal-title">IV - CONCLUSIONES</div>
        <div class="legal-text">
          Tras la revisión técnica metodológicamente realizada, se concluye la extracción exitosa de los registros detallados en la Sección III. La integridad de la información volcada en este documento queda respaldada por la Cadena de Custodia (Anexo I) documentada inalterablemente por el sistema.
        </div>
      </div>

      <div class="legal-section" style="margin-top: 40px;">
        <div class="legal-title">ANEXO I: CADENA DE CUSTODIA TÉCNICA (LOGS)</div>
        <table class="audit-table">
          <thead>
            <tr><th style="width: 20%;">Fecha (Timestamp)</th><th style="width: 20%;">Acción</th><th style="width: 60%;">Detalles Técnicos</th></tr>
          </thead>
          <tbody>
            ${auditLogs.map(l => `
              <tr class="no-break">
                <td>${l.timestamp}</td>
                <td><strong>${l.action_type}</strong></td>
                <td style="font-family: monospace; font-size: 8px;">${l.details}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; font-size: 9px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          Fin del Reporte. Infraestructura tecnológica y motor de extracción pericial provistos por <strong>eVidensTalk Enterprise</strong>.
        </div>
      </div>
      
      <div class="no-break" style="margin-top: 60px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 20px; width: 50%; margin-left: auto; margin-right: auto;">
        <div style="height: 60px;"></div>
        <div style="font-size: 11px; font-weight: bold; color: #0f172a;">FIRMA Y SELLO DEL EXPERTO / PERITO</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 5px;">${caseInfo.investigator || 'Firma ológrafa'}</div>
      </div>

    </body>
    </html>
  `;

  let win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, webSecurity: false } });
  
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    
    let footerHash = isFree ? 'NO VERIFICADO' : (hash ? hash.substring(0,16) + '...' : 'N/A');
    let footerName = isInst ? `<span style="color:#38bdf8; font-weight:bold;">e</span><span style="color:#94a3b8;">VidensTalk Enterprise | Licencia: ${agencyName}</span>` : 
                     (isFree ? `<span style="color:#38bdf8; font-weight:bold;">e</span><span style="color:#94a3b8;">VidensTalk Comunidad</span>` : 
                               `<span style="color:#38bdf8; font-weight:bold;">e</span><span style="color:#94a3b8;">VidensTalk PRO</span>`);

    const pdfOptions = {
      marginsType: 0,
      pageSize: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', 
      footerTemplate: `
        <div style="width: 100%; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; padding: 0 40px; font-family: sans-serif;">
          <div>${footerName}</div>
          <div>Ref. Hash: ${footerHash}</div>
          <div>Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
        </div>
      `,
    };

    const pdfData = await win.webContents.printToPDF(pdfOptions);
    fs.writeFileSync(savePath, pdfData);
    
    return { success: true, path: savePath };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    win.close();
  }
}

// 🔥 EXPORTAMOS LA NUEVA FUNCIÓN PARA USARLA EN MAIN.JS 🔥
module.exports = { generateForensicReport, filterMessages };