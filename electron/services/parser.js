const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { db } = require('../database');

async function parseAndImportChat(folderPath) {
  const allFiles = fs.readdirSync(folderPath);
  const chatFile = allFiles.find(file => file.endsWith('.txt'));

  if (!chatFile) {
    return { success: false, error: "No se encontró ningún archivo .txt" };
  }

  const chatFilePath = path.join(folderPath, chatFile);
  const chatName = chatFile.replace('.txt', ''); 

  const insertChat = db.prepare('INSERT INTO chats (name) VALUES (?)');
  let chatId;
  try {
    const info = insertChat.run(chatName);
    chatId = info.lastInsertRowid;
  } catch (err) {
    return { success: false, error: "Error BD: " + err.message };
  }

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
    let type = 'unknown';

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

      // --- DETECCIÓN DE ARCHIVOS MEJORADA 3.0 (Docs + Media) ---
      let mediaType = 'text';
      let mediaPath = null;

      let parts = content.split(' (archivo adjunto)');
      if (parts.length === 1) parts = content.split(' (file attached)');
      
      let potentialFileName = parts[0].trim();

      // Verificamos si existe en la carpeta
      if (allFiles.includes(potentialFileName)) {
        const ext = path.extname(potentialFileName).toLowerCase();
        const fullPath = path.join(folderPath, potentialFileName).replace(/\\/g, '/');
        
        // 1. IMAGENES
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          mediaType = 'image';
          mediaPath = fullPath;
        } 
        // 2. AUDIOS
        else if (['.opus', '.mp3', '.ogg', '.m4a', '.wav'].includes(ext)) {
          mediaType = 'audio';
          mediaPath = fullPath;
        }
        // 3. VIDEOS
        else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
          mediaType = 'video';
          mediaPath = fullPath;
        }
        // 4. DOCUMENTOS (NUEVO) 📄
        else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.csv'].includes(ext)) {
          mediaType = 'document';
          mediaPath = fullPath;
        }
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

  const insertMany = db.transaction((messages) => {
    for (const msg of messages) insertMessage.run(msg);
  });
  
  try {
    insertMany(messagesToInsert);
    return { success: true, count: messagesToInsert.length, chatId: chatId };
  } catch (err) {
    return { success: false, error: "Error guardando: " + err.message };
  }
}

module.exports = { parseAndImportChat };