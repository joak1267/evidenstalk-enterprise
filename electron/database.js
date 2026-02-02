const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

// Ruta de la base de datos
const dbPath = isDev 
  ? path.join(__dirname, '../data/whatsapp.db') 
  : path.join(app.getPath('userData'), 'whatsapp.db');

// Crear carpeta si no existe
const dbFolder = path.dirname(dbPath);
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

// Conexión
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Inicializar tablas (Arquitectura v3.0)
function initDB() {
  // 1. CHATS
  db.exec(`CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

  // 2. MENSAJES
  db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, timestamp TEXT, sender_name TEXT, content_text TEXT, media_type TEXT DEFAULT 'text', local_media_path TEXT, is_evidence INTEGER DEFAULT 0, FOREIGN KEY(chat_id) REFERENCES chats(id))`);

  // 3. CARPETAS
  db.exec(`CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, color TEXT DEFAULT '#3b82f6', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

  // 4. RELACIÓN
  db.exec(`CREATE TABLE IF NOT EXISTS chat_folder_rel (folder_id INTEGER, chat_id INTEGER, added_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (folder_id, chat_id), FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE, FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE)`);

  // 5. MOTOR DE BÚSQUEDA
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content_text, chat_id UNINDEXED, message_id UNINDEXED)`);
    db.exec(`CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN INSERT INTO messages_fts(rowid, content_text, chat_id, message_id) VALUES (new.id, new.content_text, new.chat_id, new.id); END;`);
    db.exec(`CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN INSERT INTO messages_fts(messages_fts, rowid, content_text, chat_id, message_id) VALUES('delete', old.id, old.content_text, old.chat_id, old.id); END;`);
  } catch (e) { console.log("FTS no disponible"); }

  // --- OPTIMIZACIÓN CRÍTICA DE VELOCIDAD ---
  // Este índice hace que la paginación y el conteo sean instantáneos
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON messages(chat_id, timestamp)`);
  
  console.log("✅ Base de datos v3.1 (Optimizada) inicializada.");
}

// Ejecutar inicialización
initDB();

// --- FUNCIONES ---
function getChats() {
  const query = `
    SELECT c.*, GROUP_CONCAT(f.id) as folder_ids, GROUP_CONCAT(f.color) as folder_colors
    FROM chats c
    LEFT JOIN chat_folder_rel r ON c.id = r.chat_id
    LEFT JOIN folders f ON r.folder_id = f.id
    GROUP BY c.id ORDER BY c.created_at DESC
  `;
  try { return db.prepare(query).all(); } catch (e) { return []; }
}

function getMessages(chatId) {
  // Nota: Esta es la función básica, la paginada está en main.js
  try { return db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC').all(chatId); } catch (e) { return []; }
}

module.exports = { db, getChats, getMessages };