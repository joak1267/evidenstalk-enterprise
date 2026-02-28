const fs = require('fs');
const readline = require('readline');
const path = require('path');
const crypto = require('crypto');
const { db, logAudit } = require('../database');

// Calcula el Hash SHA-256 de un archivo para verificar su integridad (Cadena de Custodia)
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
    return { success: false, error: "Error BD al crear chat: " + err.message };
  }

  // Preparar inserción de Mensajes
  const insertMessage = db.prepare(`
    INSERT INTO messages (chat_id, timestamp, sender_name, content_text, media_type, local_media_path)
    VALUES (@chat_id, @timestamp, @sender_name, @content_text, @media_type, @local_media_path)
  `);

  // Expresiones regulares para soportar distintos formatos de exportación
  const iosRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{4}), (\d{1,2}:\d{2}:\d{2})\] (.*?): (.*)$/;
  const androidRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}), (\d{1,2}:\d{2}) - (.*?): (.*)$/;
  const androidSystemRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}), (\d{1,2}:\d{2}) - (.*)$/;

  const fileStream = fs.createReadStream(chatFilePath, 'utf8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let bufferMessage = null;
  let messagesToInsert = [];
  let totalInserted = 0;
  
  // Tamaño de lote para no reventar la memoria RAM de Node.js
  const CHUNK_SIZE = 10000; 

  const insertMany = db.transaction((messages) => {
    for (const msg of messages) {
      insertMessage.run(msg);
    }
  });

  try {
    for await (const line of rl) {
      // Limpiar caracteres invisibles de WhatsApp
      const cleanLine = line.replace(/\u200e/g, '').trim();
      if (!cleanLine) continue;

      let match = null;

      if (androidRegex.test(cleanLine)) {
        match = cleanLine.match(androidRegex);
      } else if (iosRegex.test(cleanLine)) {
        match = cleanLine.match(iosRegex);
      } else if (androidSystemRegex.test(cleanLine)) {
        match = cleanLine.match(androidSystemRegex);
      }

      if (match) {
        // Si hay un mensaje anterior en el buffer, lo guardamos
        if (bufferMessage) {
          messagesToInsert.push(bufferMessage);
          
          // Si llenamos el chunk, descargamos a la base de datos y liberamos RAM
          if (messagesToInsert.length >= CHUNK_SIZE) {
            insertMany(messagesToInsert);
            totalInserted += messagesToInsert.length;
            messagesToInsert = []; 
          }
        }

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
        
        // Extraemos el posible nombre del archivo
        let potentialFileName = content.split(' (archivo adjunto)')[0].split(' (file attached)')[0].trim();

        if (allFiles.includes(potentialFileName)) {
          const ext = path.extname(potentialFileName).toLowerCase();
          const fullPath = path.join(folderPath, potentialFileName).replace(/\\/g, '/');
          
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) mediaType = 'image';
          else if (['.opus', '.mp3', '.ogg', '.m4a', '.wav'].includes(ext)) mediaType = 'audio';
          else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) mediaType = 'video';
          else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'].includes(ext)) mediaType = 'document';
          
          if (mediaType !== 'text') {
            mediaPath = fullPath;
          }
        }

        // 🔥 MAGIA UX: LIMPIEZA DEL TEXTO BASURA EN LA BASE DE DATOS 🔥
        let cleanedContent = content;
        if (mediaType !== 'text') {
          const suffixes = [
            `${potentialFileName} (archivo adjunto)`, 
            `${potentialFileName} (file attached)`, 
            `Archivo adjunto: ${potentialFileName}`, 
            potentialFileName
          ];
          
          for (const suffix of suffixes) {
            if (cleanedContent.includes(suffix)) {
              cleanedContent = cleanedContent.replace(suffix, '').trim();
            }
          }
        }

        bufferMessage = {
          chat_id: chatId,
          timestamp: `${dateStr} ${timeStr}`,
          sender_name: sender,
          content_text: cleanedContent, // <-- Se guarda limpio para siempre
          media_type: mediaType,
          local_media_path: mediaPath
        };

      } else {
        // Es un salto de línea del mensaje anterior
        if (bufferMessage) {
          bufferMessage.content_text += `\n${cleanLine}`;
        }
      }
    }
    
    // Insertar el último mensaje que quedó colgado en el buffer
    if (bufferMessage) {
      messagesToInsert.push(bufferMessage);
    }
    
    if (messagesToInsert.length > 0) {
      insertMany(messagesToInsert);
      totalInserted += messagesToInsert.length;
    }
    
    return { success: true, count: totalInserted, chatId: chatId, hash: fileHash };

  } catch (err) {
    return { success: false, error: "Error guardando transacción: " + err.message };
  }
}

module.exports = { parseAndImportChat };