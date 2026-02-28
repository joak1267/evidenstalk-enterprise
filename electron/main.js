const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url'); 
const { db, logAudit } = require('./database'); 
const fs = require('fs');
const { Worker } = require('worker_threads');
const { parseAndImportChat } = require('./services/parser');

// 🔥 IMPORTAMOS EL GENERADOR Y EL FILTRO 🔥
const { generateForensicReport, filterMessages } = require('./services/reportGenerator');

const bcrypt = require('bcryptjs'); 
const crypto = require('crypto'); 
const { machineIdSync } = require('node-machine-id'); 

// FFMPEG Path Fix
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
  if (app.isPackaged) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  }
} catch (e) { console.warn("FFMPEG no encontrado, transcripción desactivada."); }

let mainWindow;

function setupProtocol() {
  protocol.handle('evidens', (request) => {
    let url = request.url.replace(/^evidens:\/\//i, '');
    try { url = decodeURIComponent(url); } catch (e) {}
    url = url.replace(/^\/?([a-zA-Z])\//, '$1:/');
    return net.fetch(pathToFileURL(url).href);
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
  } else {
    const indexPath = path.join(__dirname, '..', 'dist-web', 'index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error("❌ ERROR CRÍTICO: No encuentro index.html en:", indexPath);
    });
  }
}

app.whenReady().then(() => {
  setupProtocol();
  createWindow();

  try {
    db.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)').run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        chat_id INTEGER, 
        chat_name TEXT, 
        file_path TEXT, 
        mode TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 🔥 AUTO-MIGRACIÓN SILENCIOSA PARA GESTIÓN DE EQUIPO 🔥
    try { db.prepare('ALTER TABLE users ADD COLUMN parent_id INTEGER').run(); } catch(e){}
    try { db.prepare('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1').run(); } catch(e){}
  } catch (e) { console.error("Error creando tablas:", e); }


  // --- 1. IMPORTACIÓN ---
  ipcMain.handle('select-folder-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0]; 
  });

  ipcMain.handle('process-import', async (e, { folderPath, targetFolderId, userPlan }) => {
    if (!folderPath) return { success: false, error: "Ruta inválida" };
    
    const result = await parseAndImportChat(folderPath);
    
    if (result.success) {
      if (userPlan === 'comunidad') {
        try {
          const countRow = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(result.chatId);
          if (countRow && countRow.count > 2000) {
            db.prepare('DELETE FROM messages WHERE chat_id = ?').run(result.chatId);
            db.prepare('DELETE FROM chats WHERE id = ?').run(result.chatId);
            return { 
              success: false, 
              error: `El chat cargado contiene ${countRow.count} mensajes y supera el límite de 2000 mensajes permitidos para el Plan Comunidad.\n\nPor favor, actualice a una Licencia PRO para procesar expedientes de gran volumen.` 
            };
          }
        } catch (err) {
          console.error("Error verificando límite de mensajes:", err);
        }
      }

      if (targetFolderId) {
        try { 
          db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)').run(result.chatId, targetFolderId); 
        } catch (err) {}
      }
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
      const query = `SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`;
      const rows = db.prepare(query).all(chatId, limit, offset);
      return rows.reverse(); 
    } catch (err) { return []; }
  });

  ipcMain.handle('get-chat-media', (e, chatId) => {
    if (typeof chatId !== 'number') return [];
    try {
      return db.prepare(`SELECT * FROM messages WHERE chat_id = ? AND media_type IN ('image', 'video') ORDER BY id ASC`).all(chatId);
    } catch (err) { return []; }
  });

  ipcMain.handle('search-messages', (e, { folderId, chatId, term }) => {
    if (!term) return [];
    let query, params;
    if (chatId && typeof chatId === 'number') {
        query = `SELECT * FROM messages WHERE chat_id = ? AND lower(content_text) LIKE lower(?) ORDER BY id ASC`;
        params = [chatId, `%${term}%`];
    } else if (folderId && typeof folderId === 'number') {
      query = `SELECT m.*, c.name as chat_name FROM messages m JOIN chats c ON m.chat_id = c.id JOIN chat_folder_rel r ON c.id = r.chat_id WHERE r.folder_id = ? AND lower(m.content_text) LIKE lower(?) ORDER BY m.id ASC`;
      params = [folderId, `%${term}%`];
    } else {
      query = `SELECT m.*, c.name as chat_name FROM messages m JOIN chats c ON m.chat_id = c.id WHERE lower(m.content_text) LIKE lower(?) ORDER BY m.id ASC`;
      params = [`%${term}%`];
    }
    query += " LIMIT 500"; 
    return db.prepare(query).all(...params);
  });

  ipcMain.handle('delete-chat', (e, id) => {
    try {
      const chatId = parseInt(id);
      logAudit('DELETE_CHAT', { chatId });
      
      const deleteTx = db.transaction(() => {
        db.exec('DROP TRIGGER IF EXISTS messages_ad');
        db.prepare('DELETE FROM chat_folder_rel WHERE chat_id = ?').run(chatId);
        db.prepare('DELETE FROM messages WHERE chat_id = ?').run(chatId);
        db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
        db.exec(`CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN INSERT INTO messages_fts(messages_fts, rowid, content_text, chat_id, message_id) VALUES('delete', old.id, old.content_text, old.chat_id, old.id); END;`);
      });
      
      deleteTx();
      return { success: true };
    } catch (error) { 
      return { success: false, error: error.message }; 
    }
  });

  ipcMain.handle('reset-database', () => {
    try {
      logAudit('RESET_DB', { warning: 'Full reset triggered' });
      db.pragma('foreign_keys = OFF');
      db.prepare('DELETE FROM messages').run();
      db.prepare('DELETE FROM chats').run();
      db.prepare('DELETE FROM folders').run();
      db.prepare('DELETE FROM chat_folder_rel').run();
      db.prepare('DELETE FROM reports').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'chats', 'folders', 'reports')").run();
      db.pragma('foreign_keys = ON');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('create-folder', (e, { name, color, parent_id }) => { 
    const info = db.prepare('INSERT INTO folders (name, color, parent_id) VALUES (?, ?, ?)').run(name, color, parent_id || null); 
    return { success: true, id: info.lastInsertRowid }; 
  });

  ipcMain.handle('get-folders', () => db.prepare('SELECT * FROM folders ORDER BY created_at ASC').all());
  
  ipcMain.handle('delete-folder', (e, id) => { 
    db.pragma('foreign_keys = ON');
    db.prepare('DELETE FROM folders WHERE id = ?').run(id); 
    return { success: true }; 
  });

  ipcMain.handle('add-chat-to-folder', (e, { chatId, folderId }) => { 
    db.prepare('INSERT OR IGNORE INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)').run(chatId, folderId); 
    return { success: true }; 
  });

  ipcMain.handle('move-chat-to-folder', (e, { chatId, folderId }) => { 
    try {
      const moveTx = db.transaction(() => {
        db.prepare('DELETE FROM chat_folder_rel WHERE chat_id = ?').run(chatId);
        if (folderId !== null) {
          db.prepare('INSERT INTO chat_folder_rel (chat_id, folder_id) VALUES (?, ?)').run(chatId, folderId);
        }
      });
      moveTx();
      return { success: true }; 
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('move-folder', (e, { folderId, targetParentId }) => { 
    try {
      if (folderId === targetParentId) return { success: false, error: "Operación inválida" };
      db.prepare('UPDATE folders SET parent_id = ? WHERE id = ?').run(targetParentId, folderId);
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('toggle-evidence', (e, id) => { 
    db.prepare('UPDATE messages SET is_evidence = NOT is_evidence WHERE id = ?').run(id); 
    return { success: true }; 
  });

  ipcMain.handle('transcribe-audio', (event, filePath) => {
    return new Promise((resolve) => {
      if (!fs.existsSync(filePath)) { resolve({ success: false, error: "Archivo no encontrado" }); return; }
      if (!ffmpegPath) { resolve({ success: false, error: "FFMPEG no está disponible." }); return; }
      
      const workerScriptPath = path.resolve(__dirname, 'worker.js');

      if (!fs.existsSync(workerScriptPath)) {
          console.error("❌ WORKER NO ENCONTRADO EN:", workerScriptPath);
          resolve({ success: false, error: `Error interno: Worker no encontrado` });
          return;
      }

      const tempPath = path.join(app.getPath('temp'), `evidens_audio_${Date.now()}.wav`);
      const worker = new Worker(workerScriptPath, { workerData: { filePath, tempPath, ffmpegPath } });

      const timeout = setTimeout(() => { 
          worker.terminate(); 
          resolve({ success: false, error: "Tiempo de espera agotado (Timeout)" }); 
      }, 300000);

      worker.on('message', (res) => { clearTimeout(timeout); resolve(res); worker.terminate(); });
      worker.on('error', (err) => { clearTimeout(timeout); resolve({ success: false, error: `Error de IA: ${err.message}` }); worker.terminate(); });
      worker.on('exit', (code) => { if (code !== 0) { clearTimeout(timeout); resolve({ success: false, error: `Worker se detuvo` }); } });
    });
  });

  ipcMain.handle('generate-report', async (e, { chatId, caseInfo }) => {
    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
    if (!chat) return { success: false, error: "Chat no encontrado" };
    
    const messages = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC').all(chatId);
    
    // 🔥 MAGIA: VERIFICAMOS SI HAY MENSAJES ANTES DE PREGUNTAR DÓNDE GUARDAR 🔥
    const filteredMsgs = filterMessages(messages, caseInfo);
    if (filteredMsgs.length === 0) {
        return { 
          success: false, 
          empty: true, 
          error: "No se encontraron mensajes para la fecha o los filtros seleccionados.\nPor favor, modifique su selección." 
        };
    }

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
      
      if (result.success) {
         try {
           db.prepare('INSERT INTO reports (chat_id, chat_name, file_path, mode) VALUES (?, ?, ?, ?)').run(chatId, chat.name, filePath, caseInfo.mode || 'all');
         } catch(dbErr) {}
      }

      return result;
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('get-reports', () => {
    try {
      return db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all();
    } catch (e) { return []; }
  });

  ipcMain.handle('delete-report-record', (e, id) => {
    try {
      db.prepare('DELETE FROM reports WHERE id = ?').run(id);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // --- 4. SISTEMA DE LOGIN (Nivel Enterprise - Blindado y con Subcuentas) ---
  ipcMain.handle('auth-login', async (e, { username, password }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        return { success: false, error: "Usuario no encontrado" };
      }

      // 🔥 VALIDACIÓN DE SEGURIDAD: COMPROBAR REVOCACIÓN 🔥
      if (user.is_active === 0) {
        return { success: false, error: "ACCESO DENEGADO: Tu cuenta ha sido suspendida por el Administrador Institucional." };
      }

      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: false, error: "Contraseña incorrecta" };
      }
      logAudit('LOGIN_SUCCESS', { username: user.username, role: user.role });
      
      return { success: true, user: { id: user.id, username: user.username, role: user.role, plan: user.plan, parent_id: user.parent_id } };
    } catch (err) { return { success: false, error: "Error de sistema: " + err.message }; }
  });

  // --- 5. PANEL DE ADMINISTRACIÓN ---
  ipcMain.handle('admin-get-users', () => {
    return db.prepare('SELECT id, username, role, plan, created_at FROM users ORDER BY created_at DESC').all();
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

  ipcMain.handle('auth-create-user', async (e, { username, password, role, plan }) => {
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare("INSERT INTO users (username, password_hash, role, plan) VALUES (?, ?, ?, ?)").run(username, hash, role, plan || 'comunidad');
      logAudit('CREATE_USER', { target_user: username, role });
      return { success: true };
    } catch (err) { return { success: false, error: "Error (quizás ya existe)" }; }
  });

  // --- 6. SISTEMA DE LICENCIAS ---
  ipcMain.handle('license-get-hwid', () => {
    try { return machineIdSync(); } catch (e) { return "UNKNOWN-HWID"; }
  });

  ipcMain.handle('license-activate', (e, { licenseKey }) => {
    try {
      const hwid = machineIdSync();
      const SECRET_MASTER_KEY = "EVIDENSTALK_ENTERPRISE_2026_SECRET"; 

      if (licenseKey.trim() === SECRET_MASTER_KEY) {
        const licensePath = path.join(app.getPath('userData'), 'license.lic');
        fs.writeFileSync(licensePath, JSON.stringify({ key: "MASTER-OVERRIDE", date: new Date(), type: 'OWNER' }));
        return { success: true };
      }

      const expectedKey = crypto.createHmac('sha256', SECRET_MASTER_KEY).update(hwid).digest('hex').substring(0, 16).toUpperCase(); 
      const cleanInput = licenseKey.replace(/-/g, '').toUpperCase();

      if (cleanInput === expectedKey) {
        const licensePath = path.join(app.getPath('userData'), 'license.lic');
        fs.writeFileSync(licensePath, JSON.stringify({ key: expectedKey, date: new Date() }));
        logAudit('LICENSE_ACTIVATED', { hwid });
        return { success: true };
      } else {
        return { success: false, error: "Clave de licencia inválida para este hardware." };
      }
    } catch (err) { return { success: false, error: "Error de validación: " + err.message }; }
  });

  ipcMain.handle('license-check-status', () => {
    try {
      const licensePath = path.join(app.getPath('userData'), 'license.lic');
      if (!fs.existsSync(licensePath)) return { active: false };
      const data = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
      if (data.key === "MASTER-OVERRIDE") return { active: true };

      const hwid = machineIdSync();
      const SECRET_MASTER_KEY = "EVIDENSTALK_ENTERPRISE_2026_SECRET";
      const expectedKey = crypto.createHmac('sha256', SECRET_MASTER_KEY).update(hwid).digest('hex').substring(0, 16).toUpperCase();
      
      if (data.key === expectedKey) return { active: true };
      return { active: false };
    } catch (e) { return { active: false }; }
  });

  // --- 7. RUTAS DE AGENCIA ---
  ipcMain.handle('get-agency-profile', () => {
    try {
      const nameRow = db.prepare("SELECT value FROM settings WHERE key = 'agency_name'").get();
      const logoRow = db.prepare("SELECT value FROM settings WHERE key = 'agency_logo'").get();
      return {
        name: nameRow ? nameRow.value : 'Departamento de Investigaciones',
        logoPath: logoRow ? logoRow.value : null
      };
    } catch (e) { return { name: 'Departamento de Investigaciones', logoPath: null }; }
  });

  ipcMain.handle('save-agency-profile', (e, { name, logoPath }) => {
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('agency_name', ?)").run(name || '');
      if (logoPath !== undefined) {
         db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('agency_logo', ?)").run(logoPath || '');
      }
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar Logo Institucional',
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // --- 8. GESTIÓN DE EQUIPO (INSTITUCIONAL: VINCULAR CUENTAS EXISTENTES) ---
  ipcMain.handle('get-team', (e, parentId) => {
    try {
      return db.prepare('SELECT id, username, role, is_active FROM users WHERE parent_id = ?').all(parentId);
    } catch (err) { return []; }
  });

  ipcMain.handle('invite-member', async (e, { parentId, username }) => {
    try {
      // 1. Verificamos el límite de 4 cuentas
      const countRow = db.prepare('SELECT COUNT(*) as total FROM users WHERE parent_id = ?').get(parentId);
      if (countRow && countRow.total >= 4) {
        return { success: false, error: "Límite Institucional alcanzado (Máximo 4 subcuentas)." };
      }

      // 2. Buscamos al usuario que queremos invitar
      const targetUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!targetUser) {
        return { success: false, error: "El usuario no existe. Pídele que se registre gratis en eVidensTalk primero." };
      }

      // 3. Verificamos que no esté vinculado ya a otra agencia
      if (targetUser.parent_id) {
        return { success: false, error: "Este usuario ya está vinculado a una Licencia Institucional." };
      }

      // 4. 🔥 VINCULAMOS LA CUENTA 🔥
      db.prepare("UPDATE users SET parent_id = ?, plan = 'institucional', role = 'analista', is_active = 1 WHERE username = ?").run(parentId, username);
      
      logAudit('TEAM_INVITE_LINKED', { parentId, linked_user: username });
      return { success: true }; 
    } catch (err) {
      return { success: false, error: "Error al vincular la cuenta: " + err.message };
    }
  });

  ipcMain.handle('revoke-member', (e, userId) => {
    try {
       db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
       return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });