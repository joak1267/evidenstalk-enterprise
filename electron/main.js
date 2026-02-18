const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const { db, logAudit } = require('./database'); 
const fs = require('fs');
const { Worker } = require('worker_threads');
const { parseAndImportChat } = require('./services/parser');
const { generateForensicReport } = require('./services/reportGenerator');
const bcrypt = require('bcryptjs'); 
// 👇 AGREGADO: Las librerías necesarias para que funcione la licencia
const crypto = require('crypto'); 
const { machineIdSync } = require('node-machine-id'); 

// FFMPEG Path Fix
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
} catch (e) { console.warn("FFMPEG no encontrado, transcripción desactivada"); }

let mainWindow;

function setupProtocol() {
  protocol.registerFileProtocol('evidens', (request, callback) => {
    const url = request.url.replace('evidens://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Error protocolo evidens:', error);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, 
    height: 800,
    icon: path.join(__dirname, 'assets/evidens.ico'),
    title: "eVidensTalk - Infraestructura de Evidencia Digital",
    backgroundColor: '#0f172a',
    show: true,
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js'), 
      webSecurity: true, 
      sandbox: false 
    }
  });

 if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    //mainWindow.webContents.openDevTools();//
  } else {
    // En producción, main.js está en: resources/app.asar/electron/main.js
    // El index.html está en: resources/app.asar/dist-web/index.html
    // Tenemos que subir un nivel (..) y entrar a dist-web
    const indexPath = path.join(__dirname, '..', 'dist-web', 'index.html');
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error("❌ ERROR CRÍTICO: No encuentro index.html en:", indexPath);
      console.error(err);
    });
  }
}

// EVENTOS DE LA APP
app.whenReady().then(() => {
  setupProtocol();
  createWindow();

  // --- 1. IMPORTACIÓN ---
  ipcMain.handle('select-folder-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0]; 
  });

  ipcMain.handle('process-import', async (e, { folderPath, targetFolderId }) => {
    if (!folderPath) return { success: false, error: "Ruta inválida" };
    
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
    if (typeof chatId !== 'number') return 0;
    try { 
      const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId); 
      return row.count; 
    } catch (err) { return 0; }
  });

  ipcMain.handle('get-messages', (e, { chatId, offset = 0, limit = 1000 }) => {
    if (typeof chatId !== 'number') return [];
    try {
      const query = `SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      const rows = db.prepare(query).all(chatId, limit, offset);
      return rows.reverse(); 
    } catch (err) { return []; }
  });

  ipcMain.handle('search-messages', (e, { folderId, chatId, term }) => {
    if (!term) return [];
    let query, params;
    if (chatId && typeof chatId === 'number') {
        query = `SELECT * FROM messages WHERE chat_id = ? AND lower(content_text) LIKE lower(?) ORDER BY timestamp ASC`;
        params = [chatId, `%${term}%`];
    } else if (folderId && typeof folderId === 'number') {
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
      logAudit('DELETE_CHAT', { chatId });
      db.prepare('DELETE FROM chat_folder_rel WHERE chat_id = ?').run(chatId);
      db.prepare('DELETE FROM messages WHERE chat_id = ?').run(chatId);
      db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
      db.pragma('foreign_keys = ON');
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('reset-database', () => {
    try {
      logAudit('RESET_DB', { warning: 'Full reset triggered' });
      db.pragma('foreign_keys = OFF');
      db.prepare('DELETE FROM messages').run();
      db.prepare('DELETE FROM chats').run();
      db.prepare('DELETE FROM folders').run();
      db.prepare('DELETE FROM chat_folder_rel').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'chats', 'folders')").run();
      db.pragma('foreign_keys = ON');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
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
    db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)').run(chatId, folderId); 
    return { success: true }; 
  });

  ipcMain.handle('toggle-evidence', (e, id) => { 
    db.prepare('UPDATE messages SET is_evidence = NOT is_evidence WHERE id = ?').run(id); 
    return { success: true }; 
  });

  ipcMain.handle('transcribe-audio', (event, filePath) => {
    return new Promise((resolve) => {
      if (!fs.existsSync(filePath)) { resolve({ success: false, error: "Archivo no encontrado" }); return; }
      const tempPath = path.join(app.getPath('temp'), `evidens_audio_${Date.now()}.wav`);
      const worker = new Worker(path.join(__dirname, 'worker.js'), { workerData: { filePath, tempPath, ffmpegPath } });
      const timeout = setTimeout(() => { worker.terminate(); resolve({ success: false, error: "Timeout" }); }, 300000);
      worker.on('message', (res) => { clearTimeout(timeout); resolve(res); worker.terminate(); });
      worker.on('error', (err) => { clearTimeout(timeout); resolve({ success: false, error: err.message }); worker.terminate(); });
    });
  });

  ipcMain.handle('generate-report', async (e, { chatId, caseInfo }) => {
    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
    if (!chat) return { success: false, error: "Chat no encontrado" };
    const messages = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC').all(chatId);
    const auditLogs = db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20`).all();
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar Reporte Forense',
      defaultPath: `Reporte_${chat.name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });
    if (!filePath || filePath.canceled) return { success: false, cancelled: true };
    try {
      logAudit('EXPORT_REPORT', { chatId, path: filePath, investigator: caseInfo.investigator });
      const result = await generateForensicReport(filePath, { chatName: chat.name, hash: chat.source_hash, messages, auditLogs, caseInfo });
      return result;
    } catch (err) { return { success: false, error: err.message }; }
  });

  // --- 4. SISTEMA DE LOGIN (NUEVO) ---
  ipcMain.handle('auth-login', async (e, { username, password }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        return { success: false, error: "Usuario no encontrado" };
      }
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: false, error: "Contraseña incorrecta" };
      }
      logAudit('LOGIN_SUCCESS', { username: user.username, role: user.role });
      return { success: true, user: { id: user.id, username: user.username, role: user.role } };
    } catch (err) { return { success: false, error: "Error de sistema: " + err.message }; }
  });

  // --- 5. PANEL DE ADMINISTRACIÓN (NUEVO) ---
  ipcMain.handle('admin-get-users', () => {
    return db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
  });

  ipcMain.handle('admin-delete-user', (e, userId) => {
    if (userId === 1) return { success: false, error: "No se puede eliminar al Super Admin." };
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      logAudit('DELETE_USER', { target_id: userId });
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('admin-get-logs', () => {
    return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  });

  // Agregamos handler para crear usuario desde el panel
  ipcMain.handle('auth-create-user', async (e, { username, password, role }) => {
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);
      logAudit('CREATE_USER', { target_user: username, role });
      return { success: true };
    } catch (err) { return { success: false, error: "Error (quizás ya existe)" }; }
  });

  // --- 6. SISTEMA DE LICENCIAS (DRM) - CORREGIDO ---

  ipcMain.handle('license-get-hwid', () => {
    try {
      return machineIdSync(); 
    } catch (e) { return "UNKNOWN-HWID"; }
  });

  ipcMain.handle('license-activate', (e, { licenseKey }) => {
    try {
      const hwid = machineIdSync();
      const SECRET_MASTER_KEY = "EVIDENSTALK_ENTERPRISE_2026_SECRET"; 

      // 🔓 BACKDOOR DE DUEÑO (TU ACCESO DIRECTO)
      // Si escribes exactamente la clave maestra en el input, entras directo.
      if (licenseKey.trim() === SECRET_MASTER_KEY) {
        const licensePath = path.join(app.getPath('userData'), 'license.lic');
        fs.writeFileSync(licensePath, JSON.stringify({ key: "MASTER-OVERRIDE", date: new Date(), type: 'OWNER' }));
        console.log("🔓 DUEÑO DETECTADO. ACCESO CONCEDIDO.");
        return { success: true };
      }

      // VALIDACIÓN NORMAL (CLIENTES)
      const expectedKey = crypto.createHmac('sha256', SECRET_MASTER_KEY)
                                .update(hwid)
                                .digest('hex')
                                .substring(0, 16) 
                                .toUpperCase(); 

      const cleanInput = licenseKey.replace(/-/g, '').toUpperCase();

      if (cleanInput === expectedKey) {
        const licensePath = path.join(app.getPath('userData'), 'license.lic');
        fs.writeFileSync(licensePath, JSON.stringify({ key: expectedKey, date: new Date() }));
        logAudit('LICENSE_ACTIVATED', { hwid });
        return { success: true };
      } else {
        return { success: false, error: "Clave de licencia inválida para este hardware." };
      }
    } catch (err) {
      return { success: false, error: "Error de validación: " + err.message };
    }
  });

  ipcMain.handle('license-check-status', () => {
    try {
      const licensePath = path.join(app.getPath('userData'), 'license.lic');
      if (!fs.existsSync(licensePath)) return { active: false };
      
      const data = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
      
      // Permitir acceso si es el dueño
      if (data.key === "MASTER-OVERRIDE") return { active: true };

      const hwid = machineIdSync();
      const SECRET_MASTER_KEY = "EVIDENSTALK_ENTERPRISE_2026_SECRET";
      const expectedKey = crypto.createHmac('sha256', SECRET_MASTER_KEY)
                                .update(hwid)
                                .digest('hex')
                                .substring(0, 16).toUpperCase();
      
      if (data.key === expectedKey) return { active: true };
      return { active: false };
    } catch (e) { return { active: false }; }
  });

});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });