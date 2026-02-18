import React from 'react';
// Importamos los iconos que ya tenías
import { DatabaseCleanIcon, ImportIcon, SearchGlobalIcon, TrashIcon } from './Icons';

// Icono de Salida (Logout)
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

export default function Sidebar({ 
  chats, activeChat, onChatSelect, 
  folders, activeFolderId, onFolderSelect, 
  onDeleteChat, onDeleteFolder, onCreateFolder, onImport,
  globalSearchMode, onGlobalSearchClick,
  onShowHelp,
  isAdmin, onOpenAdmin, onGoHome, onLogout 
}) {
  
  const chatsDeLaCarpeta = activeFolderId 
    ? chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(activeFolderId))) 
    : [];

  const activeFolderData = folders.find(f => f.id === activeFolderId);

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER FIJO */}
      <div className="sidebar-header">
        <div 
          className="brand-title" 
          onClick={onGoHome} 
          style={{ cursor: 'pointer', userSelect: 'none' }} 
          title="Ir al Dashboard"
        >
          <span>eVidens<strong style={{ color: 'white' }}>Talk</strong></span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
           {/* BOTÓN MANUAL - SVG INLINE FORZADO */}
           <button 
              onClick={onShowHelp} 
              title="Manual de Operaciones"
              style={{
                background: '#1e293b', 
                border: '1px solid #334155', 
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: '0'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.background = '#0f172a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.background = '#1e293b';
              }}
            >
              <svg 
                width="22" 
                height="22" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ display: 'block' }}
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
           </button>

           <button className="import-btn" onClick={onImport}><ImportIcon /> Importar</button>
        </div>
      </div>

      {/* CONTENIDO SCROLLABLE */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {activeFolderId ? (
          <>
            <button className="back-folder-btn" onClick={() => onFolderSelect(null)}>
              <span>← Volver a Carpetas</span>
            </button>
            <div style={{ padding: '15px', background: activeFolderData?.color || '#333', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>{activeFolderData?.name}</h3>
              <small style={{ opacity: 0.8 }}>{chatsDeLaCarpeta.length} chats</small>
            </div>
            <div className="chat-list">
              <div className={`chat-item ${globalSearchMode ? 'active' : ''}`} onClick={onGlobalSearchClick} style={{ background: globalSearchMode ? 'rgba(56, 189, 248, 0.15)' : 'transparent', border: '1px dashed #38bdf8', margin: '10px' }}>
                 <div className="avatar" style={{ background: 'transparent', color: '#38bdf8' }}><SearchGlobalIcon /></div>
                 <div className="chat-info"><h4>Buscar en Carpeta</h4></div>
              </div>
              {chatsDeLaCarpeta.map((chat) => {
                if (!chat || !chat.name) return null; 
                const nombreLimpio = chat.name.replace(/^Chat de WhatsApp con /i, '').trim();
                return (
                  <div key={chat.id} className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`} onClick={() => onChatSelect(chat)}>
                    <div className="avatar">{nombreLimpio.substring(0, 2).toUpperCase()}</div>
                    <div className="chat-info" style={{ flex: 1 }}>
                      <h4>{nombreLimpio}</h4>
                      <small>{new Date(chat.created_at).toLocaleDateString()}</small>
                    </div>
                    <button className="delete-btn" style={{ color: '#ef4444' }} onClick={(e) => onDeleteChat(e, chat.id)}><TrashIcon /></button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '15px 15px 0 15px' }}>
               <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px' }}>MIS CASOS</span>
            </div>
            <div className="folders-grid">
              <div className="folder-card" onClick={onCreateFolder} style={{ borderStyle: 'dashed', background: 'transparent' }}>
                <div style={{ fontSize: '24px', color: '#38bdf8' }}>+</div>
                <div className="folder-name" style={{ color: '#38bdf8' }}>Crear</div>
              </div>
              {folders.map(f => {
                const count = chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(f.id))).length;
                return (
                  <div key={f.id} className="folder-card" onClick={() => onFolderSelect(f.id)}>
                     <div className="folder-tab-visual" style={{ background: f.color }}></div>
                     <div className="folder-name">{f.name}</div>
                     <div className="folder-count">{count} items</div>
                     <button onClick={(e) => onDeleteFolder(e, f.id)} style={{ position: 'absolute', top: 5, right: 5, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.5 }}>×</button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ padding: '10px', borderTop: '1px solid #334155', background: '#1e293b', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {isAdmin && (
          <button 
            onClick={onOpenAdmin}
            style={{
              width: '100%', background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.1), rgba(15, 23, 42, 0.5))',
              border: '1px solid rgba(234, 179, 8, 0.3)', color: '#facc15',
              padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px',
              textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            🛡️ Panel Admin
          </button>
        )}
        <button 
          onClick={onLogout}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid #475569', color: '#94a3b8',
            padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '11px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <LogoutIcon /> Cerrar Sesión
        </button>
      </div>

    </div>
  );
}