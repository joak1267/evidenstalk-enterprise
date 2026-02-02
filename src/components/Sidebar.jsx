import React from 'react';
import { HelpIcon, DatabaseCleanIcon, ImportIcon, SearchGlobalIcon, FolderIcon, TrashIcon } from './Icons';

export default function Sidebar({ 
  chats, activeChat, onChatSelect, 
  folders, activeFolderId, onFolderSelect, 
  onDeleteChat, onDeleteFolder, onCreateFolder, onResetDB, onImport,
  globalSearchMode, onGlobalSearchClick,
  onShowHelp, onAssignFolder
}) {
  
  // 1. LÓGICA: ¿Qué chats mostramos?
  // Solo mostramos chats si hay una carpeta activa seleccionada.
  const chatsDeLaCarpeta = activeFolderId 
    ? chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(activeFolderId))) 
    : [];

  // Encontrar nombre de carpeta activa para el título
  const activeFolderData = folders.find(f => f.id === activeFolderId);

  return (
    <div className="sidebar">
      {/* HEADER FIJO */}
      <div className="sidebar-header">
        {/* REEMPLAZA LA LÍNEA DEL TÍTULO POR ESTA: */}
<a href="/" className="brand-title" style={{textDecoration: 'none', color: 'var(--accent)'}} title="Volver al Inicio">
  <span>Whatsapp <strong style={{color:'white'}}>Audit Tool</strong></span>
</a>
        <div style={{display:'flex', gap:'5px'}}>
           <button className="action-btn-icon" onClick={onShowHelp} title="Manual de Usuario"><HelpIcon /></button>
           <button className="action-btn-icon danger-icon" onClick={onResetDB} title="Borrar BD"><DatabaseCleanIcon /></button>
           <button className="import-btn" onClick={onImport}><ImportIcon /> Importar</button>
        </div>
      </div>

      {/* ZONA DE CONTENIDO CAMBIANTE */}
      
      {/* ESCENA 1: ESTAMOS DENTRO DE UNA CARPETA (VEMOS LISTA DE CHATS) */}
      {activeFolderId ? (
        <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
          
          {/* Botón Volver */}
          <button className="back-folder-btn" onClick={() => onFolderSelect(null)}>
            <span>← Volver a Carpetas</span>
          </button>
          
          {/* Título de la Carpeta */}
          <div style={{padding: '15px', background: activeFolderData?.color || '#333', color: 'white'}}>
            <h3 style={{margin:0, fontSize:'14px'}}>{activeFolderData?.name}</h3>
            <small style={{opacity: 0.8}}>{chatsDeLaCarpeta.length} chats archivados</small>
          </div>

          <div className="chat-list">
            <div className={`chat-item ${globalSearchMode ? 'active' : ''}`} onClick={onGlobalSearchClick} style={{background: globalSearchMode ? 'rgba(56, 189, 248, 0.15)' : 'transparent', border: '1px dashed #38bdf8', margin: '10px'}}>
               <div className="avatar" style={{background: 'transparent', color: '#38bdf8'}}><SearchGlobalIcon /></div>
               <div className="chat-info"><h4>Buscar en Carpeta</h4></div>
            </div>

            {chatsDeLaCarpeta.length === 0 && (
              <div style={{padding:20, textAlign:'center', color:'#64748b', fontSize:12}}>
                Carpeta vacía. <br/>Importa un chat aquí.
              </div>
            )}

            {chatsDeLaCarpeta.map((chat) => {
              // --- PROTECCIÓN Y LIMPIEZA DE NOMBRE ---
              
              // 1. Evitamos el error "Cannot read properties of null"
              if (!chat || !chat.name) return null; 

              // 2. Limpiamos el nombre quitando "Chat de WhatsApp con "
              const nombreLimpio = chat.name.replace(/^Chat de WhatsApp con /i, '').trim();

              return (
                <div key={chat.id} className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`} onClick={() => onChatSelect(chat)}>
                  <div className="avatar">{nombreLimpio.substring(0, 2).toUpperCase()}</div>
                  <div className="chat-info" style={{flex: 1}}>
                    <h4>{nombreLimpio}</h4>
                    <small>{new Date(chat.created_at).toLocaleDateString()}</small>
                  </div>
                  <button className="delete-btn" style={{color: '#ef4444'}} onClick={(e) => onDeleteChat(e, chat.id)} title="Eliminar Chat"><TrashIcon /></button>
                </div>
              );
            })}
          </div>
        </div>

      ) : (
        
        /* ESCENA 2: VISTA PRINCIPAL (GRILLA DE CARPETAS) */
        <div style={{display:'flex', flexDirection:'column', height:'100%', overflowY:'auto'}}>
          <div style={{padding: '15px 15px 0 15px'}}>
             <span style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px'}}>MIS CASOS / CARPETAS</span>
          </div>

          <div className="folders-grid">
            {/* Botón Crear Carpeta (Siempre primero) */}
            <div className="folder-card" onClick={onCreateFolder} style={{borderStyle: 'dashed', background: 'transparent'}}>
              <div style={{fontSize: '24px', color: '#38bdf8'}}>+</div>
              <div className="folder-name" style={{color: '#38bdf8'}}>Crear<br/>Carpeta</div>
            </div>

            {/* Lista de Carpetas Existentes */}
            {folders.map(f => {
              // Calculamos cuántos chats tiene esta carpeta
              const count = chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(f.id))).length;
              
              return (
                <div key={f.id} className="folder-card" onClick={() => onFolderSelect(f.id)}>
                   <div className="folder-tab-visual" style={{background: f.color}}></div>
                   <div className="folder-name">{f.name}</div>
                   <div className="folder-count">{count} items</div>
                   
                   {/* Botón borrar carpeta pequeño */}
                   <button 
                      onClick={(e) => onDeleteFolder(e, f.id)}
                      style={{position:'absolute', top:5, right:5, background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.5}}
                   >×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}