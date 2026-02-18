const fs = require('fs');
const readline = require('readline');
const path = require('path');
const crypto = require('crypto'); // Módulo nativo de criptografía
const { db, logAudit } = require('../database');

/**
 * Calcula el Hash SHA-256 de un archivo para verificar su integridad.
 * Esto es lo que diferencia a eVidensTalk de un simple visor.
 */
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

async function parseAndImportChat(folderPath) {
  console.log(`🔒 eVidensTalk: Iniciando protocolo de ingesta segura en: ${folderPath}`);

  const allFiles = fs.readdirSync(folderPath);
  const chatFile = allFiles.find(file => file.endsWith('.txt'));

  if (!chatFile) {
    return { success: false, error: "No se encontró archivo de evidencia (.txt)" };
  }

  const chatFilePath = path.join(folderPath, chatFile);
  const chatName = chatFile.replace('.txt', ''); 

  // 1. OBTENER METADATOS FORENSES
  const stats = fs.statSync(chatFilePath);
  const fileSize = stats.size;
  
  // 2. CALCULAR ADN DIGITAL (HASH SHA-256)
  let fileHash;
  try {
    fileHash = await calculateFileHash(chatFilePath);
    console.log(`🔐 Integridad Verificada. Hash SHA-256: ${fileHash}`);
  } catch (err) {
    return { success: false, error: "Error de integridad: " + err.message };
  }

  // Preparar inserción de Chat con metadatos de seguridad
  const insertChat = db.prepare(`
    INSERT INTO chats (name, source_hash, file_size_bytes, imported_at) 
    VALUES (?, ?, ?, datetime('now'))
  `);
  
  let chatId;
  try {
    const info = insertChat.run(chatName, fileHash, fileSize);
    chatId = info.lastInsertRowid;
    
    // Registrar en Auditoría
    logAudit('IMPORT_CHAT', { chatId, hash: fileHash, name: chatName });
  } catch (err) {
    return { success: false, error: "Error BD: " + err.message };
  }

  // Preparar inserción de Mensajes
  const insertMessage = db.prepare(`
    INSERT INTO messages (chat_id, timestamp, sender_name, content_text, media_type, local_media_path)
    VALUES (@chat_id, @timestamp, @sender_name, @content_text, @media_type, @local_media_path)
  `);

  const iosRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{4}), (\d{1,2}:\d{2}:\d{2})\] (.*?): (.*)$/;
  const androidRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}), (\d{1,2}:\d{2}) - (.*?): (.*)$/;
  const androidSystemRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}), (\d{1,2}:\d{2}) - (.*)$/;

  const fileStream = fs.createReadStream(chatFilePath, 'utf8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let bufferMessage = null;
  const messagesToInsert = [];

  for await (const line of rl) {
    const cleanLine = line.replace(/\u200e/g, '').trim();
    if (!cleanLine) continue;

    let match = null;

    if (androidRegex.test(cleanLine)) match = cleanLine.match(androidRegex);
    else if (iosRegex.test(cleanLine)) match = cleanLine.match(iosRegex);
    else if (androidSystemRegex.test(cleanLine)) match = cleanLine.match(androidSystemRegex);

    if (match) {
      if (bufferMessage) messagesToInsert.push(bufferMessage);

      let dateStr, timeStr, sender, content;
      if (match.length === 5) {
        [_, dateStr, timeStr, sender, content] = match;
      } else {
        [_, dateStr, timeStr, content] = match;
        sender = 'Sistema'; 
      }

      // --- DETECCIÓN DE ARCHIVOS (Evidencia Multimedia) ---
      let mediaType = 'text';
      let mediaPath = null;

      let parts = content.split(' (archivo adjunto)');
      if (parts.length === 1) parts = content.split(' (file attached)');
      
      let potentialFileName = parts[0].trim();

      if (allFiles.includes(potentialFileName)) {
        const ext = path.extname(potentialFileName).toLowerCase();
        const fullPath = path.join(folderPath, potentialFileName).replace(/\\/g, '/');
        
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) mediaType = 'image';
        else if (['.opus', '.mp3', '.ogg', '.m4a', '.wav'].includes(ext)) mediaType = 'audio';
        else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) mediaType = 'video';
        else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.csv'].includes(ext)) mediaType = 'document';
        
        if (mediaType !== 'text') mediaPath = fullPath;
      }

      bufferMessage = {
        chat_id: chatId,
        timestamp: `${dateStr} ${timeStr}`,
        sender_name: sender,
        content_text: content, 
        media_type: mediaType,
        local_media_path: mediaPath
      };

    } else {
      if (bufferMessage) bufferMessage.content_text += `\n${cleanLine}`;
    }
  }
  
  if (bufferMessage) messagesToInsert.push(bufferMessage);

  // Transacción ACID para asegurar integridad: O se guarda todo, o nada.
  const insertMany = db.transaction((messages) => {
    for (const msg of messages) insertMessage.run(msg);
  });
  
  try {
    insertMany(messagesToInsert);
    return { success: true, count: messagesToInsert.length, chatId: chatId, hash: fileHash };
  } catch (err) {
    return { success: false, error: "Error guardando transacción: " + err.message };
  }
}

module.exports = { parseAndImportChat };