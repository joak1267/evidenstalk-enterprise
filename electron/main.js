const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { db } = require('./database'); 
const fs = require('fs');
const { Worker } = require('worker_threads');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const { parseAndImportChat } = require('./services/parser');

// --- MIGRACIONES AUTOMÁTICAS ---
try { db.prepare("ALTER TABLE messages ADD COLUMN is_evidence INTEGER DEFAULT 0").run(); } catch (error) {}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js'), 
      webSecurity: false 
    }
  });
  
  // En producción carga el index.html, en desarrollo el localhost
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ---------------------------------------------------------------
// INICIO DE LA APP
// ---------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();

  // --- 1. IMPORTACIÓN ---
  ipcMain.handle('select-folder-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0]; 
  });

  ipcMain.handle('process-import', async (e, { folderPath, targetFolderId }) => {
    const result = await parseAndImportChat(folderPath);
    if (result.success && targetFolderId) {
      try { db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)').run(result.chatId, targetFolderId); } catch (err) {}
    }
    return result;
  });

  // --- 2. GESTIÓN DE DATOS (LECTURA) ---
  ipcMain.handle('get-chats', () => {
    return db.prepare(`
      SELECT c.*, GROUP_CONCAT(f.id) as folder_ids, GROUP_CONCAT(f.color) as folder_colors 
      FROM chats c 
      LEFT JOIN chat_folder_rel r ON c.id = r.chat_id 
      LEFT JOIN folders f ON r.folder_id = f.id 
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    `).all();
  });
  
  ipcMain.handle('get-count-messages', (e, chatId) => {
    try { const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId); return row.count; } catch (err) { return 0; }
  });

  ipcMain.handle('get-messages', (e, { chatId, offset = 0, limit = 1000 }) => {
    try {
      // Optimizacion: SELECT normal paginado
      const query = `SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      const rows = db.prepare(query).all(chatId, limit, offset);
      return rows.reverse(); // Invertimos para mostrar cronológicamente en el chat
    } catch (err) { return []; }
  });

  ipcMain.handle('search-messages', (e, { folderId, chatId, term }) => {
    let query, params;
    if (chatId) {
        query = `SELECT * FROM messages WHERE chat_id = ? AND lower(content_text) LIKE lower(?) ORDER BY timestamp ASC`;
        params = [chatId, `%${term}%`];
    } else if (folderId) {
      query = `SELECT m.*, c.name as chat_name FROM messages m JOIN chats c ON m.chat_id = c.id JOIN chat_folder_rel r ON c.id = r.chat_id WHERE r.folder_id = ? AND lower(m.content_text) LIKE lower(?) ORDER BY m.timestamp ASC`;
      params = [folderId, `%${term}%`];
    } else {
      query = `SELECT m.*, c.name as chat_name FROM messages m JOIN chats c ON m.chat_id = c.id WHERE lower(m.content_text) LIKE lower(?) ORDER BY m.timestamp ASC`;
      params = [`%${term}%`];
    }
    query += " LIMIT 500"; 
    return db.prepare(query).all(...params);
  });

  // --- 🔴 3. BORRADO DE CHATS (VERSIÓN DEFINITIVA - SIN TRANSACCIONES) 🔴 ---
  ipcMain.handle('delete-chat', (e, id) => {
    try {
      const chatId = parseInt(id);
      if (!chatId) throw new Error("ID inválido");

      console.log(`🗑️ Eliminando chat ${chatId}...`);

      // 1. Desactivamos FK para evitar errores de restricción
      db.pragma('foreign_keys = OFF');

      // 2. Borrar Relaciones
      db.prepare('DELETE FROM chat_folder_rel WHERE chat_id = ?').run(chatId);

      // 3. Borrar Mensajes (Ignorando errores de FTS si ocurren)
      try {
        db.prepare('DELETE FROM messages WHERE chat_id = ?').run(chatId);
      } catch (err) {
        console.warn("⚠️ Advertencia al borrar mensajes (posible FTS):", err.message);
      }

      // 4. Borrar Chat Padre
      const info = db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);

      // 5. Restaurar seguridad y limpiar
      db.pragma('foreign_keys = ON');
      
      // Checkpoint para asegurar que se escriba en disco y no quede en WAL
      try { db.pragma('wal_checkpoint(RESTART)'); } catch(e) {}

      if (info.changes === 0) {
        console.log("⚠️ Chat no encontrado (ya borrado).");
      } else {
        console.log("✅ Chat eliminado con éxito.");
      }
      return { success: true };

    } catch (error) { 
      // Seguridad: reactivar FK siempre
      db.pragma('foreign_keys = ON');
      console.error("❌ Error FATAL al borrar chat:", error);
      return { success: false, error: error.message }; 
    }
  });

  // --- 🔴 4. RESET DATABASE (VERSIÓN DEFINITIVA) 🔴 ---
  ipcMain.handle('reset-database', () => {
    try {
      console.log("⚠️ RESETEANDO BASE DE DATOS COMPLETA...");
      
      db.pragma('foreign_keys = OFF');
      
      // Borrado secuencial directo
      db.prepare('DELETE FROM messages').run();
      db.prepare('DELETE FROM chats').run();
      db.prepare('DELETE FROM folders').run();
      db.prepare('DELETE FROM chat_folder_rel').run();
      
      // Resetear contadores de IDs
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'chats', 'folders')").run();
      
      db.pragma('foreign_keys = ON');
      try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch(e) {} // Limpieza profunda

      console.log("✅ Base de datos vaciada.");
      return { success: true };
    } catch (e) { 
      db.pragma('foreign_keys = ON');
      return { success: false, error: e.message }; 
    }
  });

  // --- 5. OTROS ---
  ipcMain.handle('create-folder', (e, { name, color }) => { const info = db.prepare('INSERT INTO folders (name, color) VALUES (?, ?)').run(name, color); return { success: true, id: info.lastInsertRowid }; });
  ipcMain.handle('get-folders', () => db.prepare('SELECT * FROM folders ORDER BY created_at ASC').all());
  ipcMain.handle('delete-folder', (e, id) => { db.prepare('DELETE FROM folders WHERE id = ?').run(id); return { success: true }; });
  ipcMain.handle('add-chat-to-folder', (e, { chatId, folderId }) => { db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)').run(chatId, folderId); return { success: true }; });
  ipcMain.handle('toggle-evidence', (e, id) => { db.prepare('UPDATE messages SET is_evidence = NOT is_evidence WHERE id = ?').run(id); return { success: true }; });

  // --- WORKER DE TRANSCRIPCIÓN ---
  ipcMain.handle('transcribe-audio', (event, filePath) => {
    return new Promise((resolve) => {
      if (!fs.existsSync(filePath)) { resolve({ success: false, error: "Archivo no encontrado" }); return; }
      const tempPath = path.join(app.getPath('temp'), `wa_audit_${Date.now()}.wav`);
      
      const worker = new Worker(path.join(__dirname, 'worker.js'), { 
        workerData: { filePath, tempPath, ffmpegPath } 
      });
      
      worker.on('message', (res) => { resolve(res); worker.terminate(); });
      worker.on('error', (err) => { resolve({ success: false, error: err.message }); worker.terminate(); });
      
      // Timeout de 5 minutos
      setTimeout(() => { worker.terminate(); resolve({ success: false, error: "Tiempo agotado" }); }, 300000);
    });
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });