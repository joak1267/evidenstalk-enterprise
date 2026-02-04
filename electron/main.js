const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { db } = require('./database'); 
const fs = require('fs');
const { Worker } = require('worker_threads');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const { parseAndImportChat } = require('./services/parser');

// --- MIGRACIONES AUTOMÁTICAS ---
try { 
  db.prepare("ALTER TABLE messages ADD COLUMN is_evidence INTEGER DEFAULT 0").run(); 
} catch (error) {
  // Ya existe la columna, no hacemos nada
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, 
    height: 800,
    show: false, // No mostramos la ventana hasta que esté lista
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true, 
      // IMPORTANTE: __dirname es la carpeta /electron
      preload: path.join(__dirname, 'preload.js'), 
      webSecurity: false 
    }
  });

  // Decidimos qué cargar según si la app está instalada o en desarrollo
  if (!app.isPackaged) {
    // Modo Desarrollo (Vite)
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Modo Producción (Instalado)
    // CAMBIO CLAVE: Ahora buscamos en 'dist-web' para evitar conflictos con el instalador
    const indexPath = path.resolve(__dirname, '..', 'dist-web', 'index.html');
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error("❌ Error fatal al cargar index.html:", err);
      // Si falla, abrimos la consola para ver qué pasó
      mainWindow.webContents.openDevTools();
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// ---------------------------------------------------------------
// EVENTOS DE LA APP
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
      try { 
        db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)')
          .run(result.chatId, targetFolderId); 
      } catch (err) {}
    }
    return result;
  });

  // --- 2. GESTIÓN DE DATOS ---
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
    try { 
      const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId); 
      return row.count; 
    } catch (err) { return 0; }
  });

  ipcMain.handle('get-messages', (e, { chatId, offset = 0, limit = 1000 }) => {
    try {
      const query = `SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      const rows = db.prepare(query).all(chatId, limit, offset);
      return rows.reverse(); 
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

  ipcMain.handle('delete-chat', (e, id) => {
    try {
      const chatId = parseInt(id);
      db.pragma('foreign_keys = OFF');
      db.prepare('DELETE FROM chat_folder_rel WHERE chat_id = ?').run(chatId);
      db.prepare('DELETE FROM messages WHERE chat_id = ?').run(chatId);
      db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
      db.pragma('foreign_keys = ON');
      try { db.pragma('wal_checkpoint(RESTART)'); } catch(e) {}
      return { success: true };
    } catch (error) { 
      db.pragma('foreign_keys = ON');
      return { success: false, error: error.message }; 
    }
  });

  ipcMain.handle('reset-database', () => {
    try {
      db.pragma('foreign_keys = OFF');
      db.prepare('DELETE FROM messages').run();
      db.prepare('DELETE FROM chats').run();
      db.prepare('DELETE FROM folders').run();
      db.prepare('DELETE FROM chat_folder_rel').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'chats', 'folders')").run();
      db.pragma('foreign_keys = ON');
      return { success: true };
    } catch (e) { 
      return { success: false, error: e.message }; 
    }
  });

  ipcMain.handle('create-folder', (e, { name, color }) => { 
    const info = db.prepare('INSERT INTO folders (name, color) VALUES (?, ?)').run(name, color); 
    return { success: true, id: info.lastInsertRowid }; 
  });

  ipcMain.handle('get-folders', () => db.prepare('SELECT * FROM folders ORDER BY created_at ASC').all());
  
  ipcMain.handle('delete-folder', (e, id) => { 
    db.prepare('DELETE FROM folders WHERE id = ?').run(id); 
    return { success: true }; 
  });

  ipcMain.handle('add-chat-to-folder', (e, { chatId, folderId }) => { 
    db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)')
      .run(chatId, folderId); 
    return { success: true }; 
  });

  ipcMain.handle('toggle-evidence', (e, id) => { 
    db.prepare('UPDATE messages SET is_evidence = NOT is_evidence WHERE id = ?').run(id); 
    return { success: true }; 
  });

  ipcMain.handle('transcribe-audio', (event, filePath) => {
    return new Promise((resolve) => {
      if (!fs.existsSync(filePath)) { resolve({ success: false, error: "Archivo no encontrado" }); return; }
      const tempPath = path.join(app.getPath('temp'), `wa_audit_${Date.now()}.wav`);
      const worker = new Worker(path.join(__dirname, 'worker.js'), { 
        workerData: { filePath, tempPath, ffmpegPath } 
      });
      worker.on('message', (res) => { resolve(res); worker.terminate(); });
      worker.on('error', (err) => { resolve({ success: false, error: err.message }); worker.terminate(); });
    });
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });