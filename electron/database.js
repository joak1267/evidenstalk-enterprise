const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
// Importamos bcryptjs para la seguridad de claves
const bcrypt = require('bcryptjs'); 

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

// --- MIGRACIONES ---
function runMigrations() {
  const columns = [
    { table: 'chats', col: 'source_hash TEXT', desc: 'Huella digital SHA-256' },
    { table: 'chats', col: 'file_size_bytes INTEGER', desc: 'Tamaño original' },
    { table: 'chats', col: 'imported_at TEXT', desc: 'Fecha importación' },
    { table: 'messages', col: 'is_evidence INTEGER DEFAULT 0', desc: 'Flag evidencia' }
  ];

  columns.forEach(mig => {
    try {
      db.prepare(`ALTER TABLE ${mig.table} ADD COLUMN ${mig.col}`).run();
    } catch (error) { /* Ignorar si existe */ }
  });
}

// Inicializar tablas
function initDB() {
  // 1. CHATS
  db.exec(`CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

  // 2. MENSAJES
  db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, timestamp TEXT, sender_name TEXT, content_text TEXT, media_type TEXT DEFAULT 'text', local_media_path TEXT, is_evidence INTEGER DEFAULT 0, FOREIGN KEY(chat_id) REFERENCES chats(id))`);

  // 3. CARPETAS
  db.exec(`CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, color TEXT DEFAULT '#3b82f6', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

  // 4. RELACIÓN
  db.exec(`CREATE TABLE IF NOT EXISTS chat_folder_rel (folder_id INTEGER, chat_id INTEGER, added_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (folder_id, chat_id), FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE, FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE)`);

  // 5. AUDIT LOGS
  db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action_type TEXT NOT NULL, details TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP)`);

  // 6. USUARIOS (NUEVO SISTEMA DE ACCESO) 🔒
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'viewer', -- 'admin' o 'viewer'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // --- SEED ADMIN USER ---
  // Si no hay usuarios, creamos el Admin por defecto
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log("🔒 Creando usuario Admin por defecto...");
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("admin123", salt); // Clave inicial
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run('admin', hash, 'admin');
    console.log("✅ Usuario 'admin' creado con contraseña 'admin123'");
  }

  // FTS y Triggers
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content_text, chat_id UNINDEXED, message_id UNINDEXED)`);
    db.exec(`CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN INSERT INTO messages_fts(rowid, content_text, chat_id, message_id) VALUES (new.id, new.content_text, new.chat_id, new.id); END;`);
    db.exec(`CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN INSERT INTO messages_fts(messages_fts, rowid, content_text, chat_id, message_id) VALUES('delete', old.id, old.content_text, old.chat_id, old.id); END;`);
  } catch (e) {}

  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON messages(chat_id, timestamp)`);
  
  runMigrations();
  console.log("✅ eVidensTalk Core: Base de datos v4.0 (Auth) lista.");
}

initDB();

// --- FUNCIONES EXPORTADAS ---
function logAudit(action, details) {
  try { db.prepare("INSERT INTO audit_logs (action_type, details) VALUES (?, ?)").run(action, JSON.stringify(details)); } 
  catch (e) { console.error("Error audit log:", e); }
}

module.exports = { db, logAudit };