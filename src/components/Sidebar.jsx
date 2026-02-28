import React, { useState, useRef } from 'react';
import { DatabaseCleanIcon, ImportIcon, SearchGlobalIcon, TrashIcon } from './Icons';
import logoImage from '../assets/logo-clean.png'; 

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const CleanFolderIcon = ({ color }) => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: `drop-shadow(0 4px 10px ${color}50)` }}>
    <path d="M3 6C3 4.89543 3.89543 4 5 4H9.58579L11.5858 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill={color} />
  </svg>
);

const SubFolderNode = ({ sub, folders, chats, onChatSelect, activeChat, onCreateSubfolder, onDeleteChat, onDeleteFolder, onMoveChat, onMoveFolder, level }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false); 

  const subfolders = folders.filter(f => f.parent_id === sub.id);
  const myChats = chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(sub.id)));
  const hasChildren = subfolders.length > 0 || myChats.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div 
        draggable="true"
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('evidens/item', JSON.stringify({ type: 'folder', id: sub.id }));
        }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
          try {
            const data = JSON.parse(e.dataTransfer.getData('evidens/item'));
            if (data.type === 'chat') onMoveChat(data.id, sub.id);
            if (data.type === 'folder' && data.id !== sub.id) onMoveFolder(data.id, sub.id);
          } catch(err) {}
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
          background: isDragOver ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
          boxShadow: isDragOver ? 'inset 0 0 0 1px #38bdf8' : 'none',
          boxSizing: 'border-box'
        }}
        onMouseOver={e => {
          if (!isDragOver) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.querySelector('.add-btn').style.opacity = '1';
          const delBtn = e.currentTarget.querySelector('.delete-folder-btn');
          if(delBtn) delBtn.style.opacity = '1';
        }}
        onMouseOut={e => {
          if (!isDragOver) e.currentTarget.style.background = 'transparent';
          e.currentTarget.querySelector('.add-btn').style.opacity = '0.5';
          const delBtn = e.currentTarget.querySelector('.delete-folder-btn');
          if(delBtn) delBtn.style.opacity = '0';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', boxSizing: 'border-box' }}>
          <svg 
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
            style={{ 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
              color: hasChildren ? '#94a3b8' : '#334155', 
              flexShrink: 0 
            }}
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: sub.color, flexShrink: 0 }}></div>
          <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}>
          <button className="add-btn" onClick={(e) => { e.stopPropagation(); onCreateSubfolder(sub.id); setIsExpanded(true); }} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '14px', lineHeight: '1', padding: '0 4px', opacity: '0.5', transition: 'all 0.2s' }} title="Crear Subcarpeta adentro">+</button>
          <button className="delete-folder-btn" onClick={(e) => onDeleteFolder(e, sub.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', opacity: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center' }} title="Eliminar Subcarpeta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <RecursiveFolderContent folderId={sub.id} folders={folders} chats={chats} onChatSelect={onChatSelect} activeChat={activeChat} onCreateSubfolder={onCreateSubfolder} onDeleteChat={onDeleteChat} onDeleteFolder={onDeleteFolder} onMoveChat={onMoveChat} onMoveFolder={onMoveFolder} level={level + 1} />
      )}
    </div>
  );
};

const RecursiveFolderContent = ({ folderId, folders, chats, onChatSelect, activeChat, onCreateSubfolder, onDeleteChat, onDeleteFolder, onMoveChat, onMoveFolder, level = 0 }) => {
  const subfolders = folders.filter(f => f.parent_id === folderId);
  const myChats = chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(folderId)));

  return (
      <div style={{ marginLeft: level > 0 ? '16px' : '0', paddingLeft: level > 0 ? '8px' : '0', borderLeft: level > 0 ? '1px solid #334155' : 'none', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: level > 0 ? '2px' : '0', boxSizing: 'border-box' }}>
          {subfolders.map(sub => (
              <SubFolderNode key={sub.id} sub={sub} folders={folders} chats={chats} onChatSelect={onChatSelect} activeChat={activeChat} onCreateSubfolder={onCreateSubfolder} onDeleteChat={onDeleteChat} onDeleteFolder={onDeleteFolder} onMoveChat={onMoveChat} onMoveFolder={onMoveFolder} level={level} />
          ))}

          {myChats.map(chat => {
              const nombreLimpio = chat.name.replace(/^Chat de WhatsApp con /i, '').trim();
              const isActive = activeChat?.id === chat.id;
              
              return (
                  <div key={chat.id} 
                      draggable="true"
                      onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('evidens/item', JSON.stringify({ type: 'chat', id: chat.id }));
                      }}
                      onClick={() => onChatSelect(chat)} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isActive ? '#38bdf8' : '#94a3b8', cursor: 'pointer', padding: '6px 8px', background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent', borderRadius: '6px', transition: 'all 0.2s', marginLeft: '4px', boxSizing: 'border-box' }}
                      onMouseOver={e => { if(!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#e2e8f0'; } e.currentTarget.querySelector('.delete-btn').style.opacity = '1'; }}
                      onMouseOut={e => { if(!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } e.currentTarget.querySelector('.delete-btn').style.opacity = isActive ? '1' : '0'; }}
                  >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreLimpio}</span>
                      <button className="delete-btn" style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, opacity: isActive ? 1 : 0, transition: 'opacity 0.2s' }} onClick={(e) => onDeleteChat(e, chat.id)} title="Eliminar Chat">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                  </div>
              );
          })}
      </div>
  );
};

const RootFolderCard = ({ f, count, onFolderSelect, onDeleteFolder, onMoveChat, onMoveFolder }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div 
      draggable="true"
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('evidens/item', JSON.stringify({ type: 'folder', id: f.id }));
      }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        try {
          const data = JSON.parse(e.dataTransfer.getData('evidens/item'));
          if (data.type === 'chat') onMoveChat(data.id, f.id);
          if (data.type === 'folder' && data.id !== f.id) onMoveFolder(data.id, f.id);
        } catch(err) {}
      }}
      onClick={() => onFolderSelect(f.id)}
      style={{ 
        background: isDragOver ? 'rgba(56,189,248,0.1)' : '#1e293b', 
        border: isDragOver ? `1px dashed #38bdf8` : '1px solid transparent', 
        borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        padding: '15px 5px', cursor: 'pointer', transition: 'all 0.2s', minHeight: '105px', position: 'relative', 
        boxShadow: isDragOver ? '0 0 15px rgba(56,189,248,0.2)' : 'none', 
        boxSizing: 'border-box',
        minWidth: 0
      }}
      onMouseOver={e => { if(!isDragOver) { e.currentTarget.style.background = '#25334a'; e.currentTarget.style.borderColor = `${f.color}50`; } e.currentTarget.querySelector('.delete-cross').style.opacity = '1'; e.currentTarget.querySelector('.delete-cross').style.transform = 'scale(1)'; }}
      onMouseOut={e => { if(!isDragOver) { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = 'transparent'; } e.currentTarget.querySelector('.delete-cross').style.opacity = '0'; e.currentTarget.querySelector('.delete-cross').style.transform = 'scale(0.8)'; }}
    >
       <CleanFolderIcon color={f.color} />
       <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600', marginTop: '8px', textAlign: 'center', width: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.name}>{f.name}</div>
       <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{count} {count === 1 ? 'item' : 'items'}</div>
       
       <button className="delete-cross" onClick={(e) => { e.stopPropagation(); onDeleteFolder(e, f.id); }} style={{ position: 'absolute', top: '6px', right: '6px', background: '#0f172a', border: '1px solid #334155', color: '#ef4444', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', opacity: 0, transform: 'scale(0.8)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', zIndex: 10, padding: 0 }} onMouseOver={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseOut={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.borderColor = '#334155'; }} title="Eliminar Caso">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
       </button>
    </div>
  );
};

const ReportFolderCard = ({ group, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(group.chat_id)}
      style={{ background: '#1e293b', border: '1px solid transparent', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 5px', cursor: 'pointer', transition: 'all 0.2s', minHeight: '105px', boxSizing: 'border-box', minWidth: 0 }}
      onMouseOver={e => { e.currentTarget.style.background = '#25334a'; e.currentTarget.style.borderColor = '#2dd4bf50'; }}
      onMouseOut={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
       <CleanFolderIcon color="#2dd4bf" />
       <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600', marginTop: '8px', textAlign: 'center', width: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={group.chat_name}>{group.chat_name.replace(/^Chat de WhatsApp con /i, '').trim()}</div>
       <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{group.reports.length} {group.reports.length === 1 ? 'reporte' : 'reportes'}</div>
    </div>
  );
};

export default function Sidebar({ 
  chats, activeChat, onChatSelect, folders, activeFolderId, onFolderSelect, 
  onDeleteChat, onDeleteFolder, onCreateFolder, onCreateSubfolder, onImport,
  onMoveChat, onMoveFolder, onDropOnCreate, globalSearchMode, onGlobalSearchClick,
  isAdmin, onOpenAdmin, onGoHome, onLogout, onOpenAgency,
  reports, activeReport, onReportSelect, onDeleteReport
}) {
  
  const [isBreadcrumbDragOver, setBreadcrumbDragOver] = useState(false);
  const [isRootDragOver, setIsRootDragOver] = useState(false); 
  const [isCreateDragOver, setIsCreateDragOver] = useState(false); 
  
  const [activeTab, setActiveTab] = useState('casos');
  const [activeReportChatId, setActiveReportChatId] = useState(null);

  // 🔥 ESTADO LOCAL PARA EL MANUAL DE USUARIO 🔥
  const [showLocalHelp, setShowLocalHelp] = useState(false);

  const dragTimer = useRef(null);

  const rootFolders = folders.filter(f => !f.parent_id);
  const activeFolderData = folders.find(f => f.id === activeFolderId);
  const colorAccento = activeFolderData?.color || '#38bdf8'; 

  const reportsByChat = (reports || []).reduce((acc, rep) => {
    if (!acc[rep.chat_id]) {
      acc[rep.chat_id] = { chat_id: rep.chat_id, chat_name: rep.chat_name, reports: [] };
    }
    acc[rep.chat_id].reports.push(rep);
    return acc;
  }, {});

  return (
    <>
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        
        {/* HEADER FIJO */}
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', boxSizing: 'border-box' }}>
          <div className="brand-title" onClick={() => { setActiveTab('casos'); setActiveReportChatId(null); onGoHome(); }} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} title="Ir al Dashboard">
            <img src={logoImage} alt="Logo" style={{ width: '26px', height: '26px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.5))' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}><span style={{ color: '#38bdf8' }}>e</span><span style={{ color: 'white' }}>VidensTalk</span></span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', boxSizing: 'border-box' }}>
             <button onClick={onImport} title="Importar Evidencia" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: '0', color: '#cbd5e1' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.background = '#0f172a'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = '#1e293b'; }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
             
             {/* 🔥 BOTÓN QUE ABRE EL MANUAL LOCAL 🔥 */}
             <button onClick={() => setShowLocalHelp(true)} title="Manual de Operaciones" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: '0', color: '#cbd5e1' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.background = '#0f172a'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = '#1e293b'; }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></button>
             
             <button onClick={onOpenAgency} title="Mi Cuenta / Agencia" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cbd5e1', transition: 'all 0.2s', padding: '0' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.background = '#0f172a'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = '#1e293b'; }}><UserIcon /></button>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
          <button
            onClick={() => { setActiveTab('casos'); setActiveReportChatId(null); onGoHome(); }}
            style={{ flex: 1, background: activeTab === 'casos' ? 'linear-gradient(0deg, rgba(56, 189, 248, 0.12) 0%, transparent 100%)' : 'transparent', border: 'none', borderBottom: activeTab === 'casos' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'casos' ? '#f8fafc' : '#64748b', padding: '14px 0', cursor: 'pointer', fontWeight: activeTab === 'casos' ? '700' : '600', fontSize: '11px', letterSpacing: '0.5px', transition: 'all 0.2s ease', textTransform: 'uppercase', outline: 'none', marginBottom: '-1px' }}
            onMouseOver={e => { if(activeTab !== 'casos') { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
            onMouseOut={e => { if(activeTab !== 'casos') { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: activeTab === 'casos' ? 1 : 0.6 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              MIS CASOS
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('reportes'); onFolderSelect(null); }}
            style={{ flex: 1, background: activeTab === 'reportes' ? 'linear-gradient(0deg, rgba(45, 212, 191, 0.12) 0%, transparent 100%)' : 'transparent', border: 'none', borderBottom: activeTab === 'reportes' ? '2px solid #2dd4bf' : '2px solid transparent', color: activeTab === 'reportes' ? '#f8fafc' : '#64748b', padding: '14px 0', cursor: 'pointer', fontWeight: activeTab === 'reportes' ? '700' : '600', fontSize: '11px', letterSpacing: '0.5px', transition: 'all 0.2s ease', textTransform: 'uppercase', outline: 'none', marginBottom: '-1px' }}
            onMouseOver={e => { if(activeTab !== 'reportes') { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
            onMouseOut={e => { if(activeTab !== 'reportes') { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: activeTab === 'reportes' ? 1 : 0.6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              MIS REPORTES
            </div>
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div 
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: isRootDragOver ? 'rgba(56, 189, 248, 0.05)' : 'transparent', transition: 'background 0.2s' }}
          onDragOver={(e) => { if (!activeFolderId && activeTab === 'casos') { e.preventDefault(); setIsRootDragOver(true); } }}
          onDragLeave={() => setIsRootDragOver(false)}
          onDrop={(e) => {
            setIsRootDragOver(false);
            if (!activeFolderId && activeTab === 'casos') {
              e.preventDefault();
              try { const data = JSON.parse(e.dataTransfer.getData('evidens/item')); if (data.type === 'folder') onMoveFolder(data.id, null); if (data.type === 'chat') onMoveChat(data.id, null); } catch(err) {}
            }
          }}
        >
          {activeTab === 'reportes' ? (
             activeReportChatId ? (
               <>
                 <div style={{ background: 'linear-gradient(180deg, rgba(15,23,42,1) 0%, rgba(30,41,59,0.3) 100%)', borderBottom: '1px solid #334155', paddingBottom: '15px', boxSizing: 'border-box' }}>
                   <div onClick={() => setActiveReportChatId(null)} style={{ padding: '12px 15px', color: '#94a3b8', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' }} onMouseOver={e => e.currentTarget.style.color = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                     Volver
                   </div>
                   <div style={{ padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                       <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2dd4bf', boxShadow: '0 0 10px #2dd4bf80', flexShrink: 0 }}></div>
                       <div style={{ overflow: 'hidden' }}>
                         <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>{reportsByChat[activeReportChatId]?.chat_name.replace(/^Chat de WhatsApp con /i, '').trim()}</h3>
                         <span style={{ fontSize: '10px', color: '#64748b' }}>CARPETA DE EXPEDIENTES</span>
                       </div>
                     </div>
                   </div>
                 </div>
                 <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
                    {reportsByChat[activeReportChatId]?.reports.map(rep => {
                        const isSelected = activeReport?.id === rep.id;
                        const fileName = rep.file_path ? rep.file_path.split(/[\\/]/).pop() : rep.chat_name;
                        const nombreLimpio = fileName.replace(/\.pdf$/i, '');
                        const fecha = new Date(rep.created_at).toLocaleDateString();
                        return (
                          <div key={rep.id} onClick={() => onReportSelect(rep)} style={{ background: isSelected ? 'rgba(45, 212, 191, 0.1)' : '#1e293b', border: isSelected ? '1px solid #2dd4bf' : '1px solid #334155', borderRadius: '8px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseOver={e => { if(!isSelected) e.currentTarget.style.background = '#25334a'; e.currentTarget.querySelector('.del-rep-btn').style.opacity = '1'; }} onMouseOut={e => { if(!isSelected) e.currentTarget.style.background = '#1e293b'; e.currentTarget.querySelector('.del-rep-btn').style.opacity = isSelected ? '1' : '0'; }}>
                            <div style={{ color: isSelected ? '#2dd4bf' : '#94a3b8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ color: isSelected ? '#2dd4bf' : '#f8fafc', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreLimpio}</div>
                                <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px', display: 'flex', gap: '6px' }}><span>{fecha}</span> | <span style={{ textTransform: 'uppercase' }}>{rep.mode === 'all' ? 'Sábana' : rep.mode}</span></div>
                            </div>
                            <button className="del-rep-btn" onClick={(e) => onDeleteReport(e, rep.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px', opacity: isSelected ? '1' : '0', transition: 'opacity 0.2s' }} title="Quitar del historial"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                          </div>
                        )
                    })}
                 </div>
               </>
             ) : (
               <>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', padding: '15px', boxSizing: 'border-box' }}>
                    {Object.values(reportsByChat).length === 0 ? (
                       <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '12px' }}>No hay reportes generados todavía.</div>
                    ) : (
                       Object.values(reportsByChat).map(group => <ReportFolderCard key={group.chat_id} group={group} onSelect={setActiveReportChatId} />)
                    )}
                 </div>
               </>
             )
          ) : (
            activeFolderId ? (
              <>
                <div style={{ background: 'linear-gradient(180deg, rgba(15,23,42,1) 0%, rgba(30,41,59,0.3) 100%)', borderBottom: '1px solid #334155', paddingBottom: '15px', boxSizing: 'border-box' }}>
                  <div 
                    onClick={() => onFolderSelect(null)} 
                    onDragOver={(e) => { e.preventDefault(); if (!isBreadcrumbDragOver) { setBreadcrumbDragOver(true); dragTimer.current = setTimeout(() => { onFolderSelect(null); setBreadcrumbDragOver(false); }, 800); } }}
                    onDragLeave={(e) => { e.preventDefault(); setBreadcrumbDragOver(false); if (dragTimer.current) { clearTimeout(dragTimer.current); dragTimer.current = null; } }}
                    onDrop={(e) => { e.preventDefault(); setBreadcrumbDragOver(false); if (dragTimer.current) { clearTimeout(dragTimer.current); dragTimer.current = null; } try { const data = JSON.parse(e.dataTransfer.getData('evidens/item')); if (data.type === 'folder') onMoveFolder(data.id, null); if (data.type === 'chat') onMoveChat(data.id, null); } catch(err) {} }}
                    style={{ padding: '12px 15px', color: '#94a3b8', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px', background: isBreadcrumbDragOver ? 'rgba(56, 189, 248, 0.2)' : 'transparent', borderBottom: isBreadcrumbDragOver ? '1px dashed #38bdf8' : '1px solid transparent', boxSizing: 'border-box' }} 
                    onMouseOver={e => { if(!isBreadcrumbDragOver) e.currentTarget.style.color = '#e2e8f0'; }} 
                    onMouseOut={e => { if(!isBreadcrumbDragOver) e.currentTarget.style.color = '#94a3b8'; }}
                    title="Arrastrá elementos aquí para sacarlos de esta carpeta"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Volver a Casos {isBreadcrumbDragOver && <span style={{color: '#38bdf8', marginLeft: '5px', textTransform:'none', fontWeight:'normal'}}>(Soltar para extraer)</span>}
                  </div>
                  <div style={{ padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colorAccento, boxShadow: `0 0 10px ${colorAccento}80`, flexShrink: 0 }}></div>
                      <div style={{ overflow: 'hidden' }}><h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>{activeFolderData?.name}</h3><span style={{ fontSize: '10px', color: '#64748b' }}>CARPETA PRINCIPAL</span></div>
                    </div>
                    <button onClick={() => onCreateSubfolder(activeFolderData.id)} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid #334155`, color: '#cbd5e1', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }} onMouseOver={e => { e.currentTarget.style.background = `${colorAccento}15`; e.currentTarget.style.borderColor = colorAccento; e.currentTarget.style.color = colorAccento; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#cbd5e1'; }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Subcarpeta</button>
                  </div>
                </div>
                
                <div className="chat-list" style={{ padding: '10px', boxSizing: 'border-box' }}>
                  <div className={`chat-item ${globalSearchMode ? 'active' : ''}`} onClick={onGlobalSearchClick} style={{ background: globalSearchMode ? 'rgba(56, 189, 248, 0.15)' : 'transparent', border: '1px dashed #38bdf8', margin: '0 0 10px 0', padding: '10px', boxSizing: 'border-box' }}>
                    <div className="avatar" style={{ background: 'transparent', color: '#38bdf8' }}><SearchGlobalIcon /></div>
                    <div className="chat-info"><h4>Buscar en Carpeta</h4></div>
                  </div>
                  <RecursiveFolderContent folderId={activeFolderId} folders={folders} chats={chats} onChatSelect={onChatSelect} activeChat={activeChat} onCreateSubfolder={onCreateSubfolder} onDeleteChat={onDeleteChat} onDeleteFolder={onDeleteFolder} onMoveChat={onMoveChat} onMoveFolder={onMoveFolder} level={0} />
                </div>
              </>
            ) : (
              <>
                {isRootDragOver && (
                  <div style={{ padding: '15px 15px 0 15px', pointerEvents: 'none', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold', letterSpacing: '1px' }}>📥 SOLTAR AQUÍ PARA SACAR DE LA CARPETA</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', padding: '15px', boxSizing: 'border-box' }}>
                  <div 
                    onClick={onCreateFolder} 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreateDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreateDragOver(false); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreateDragOver(false); try { const data = JSON.parse(e.dataTransfer.getData('evidens/item')); if (onDropOnCreate) onDropOnCreate(data); } catch(err) {} }}
                    style={{ border: isCreateDragOver ? '2px dashed #38bdf8' : '1px dashed #475569', background: isCreateDragOver ? 'rgba(56,189,248,0.15)' : 'transparent', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 5px', cursor: 'pointer', transition: 'all 0.2s', minHeight: '105px', boxSizing: 'border-box', minWidth: 0 }} 
                    onMouseOver={e => { if(!isCreateDragOver) { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = 'rgba(56,189,248,0.05)'; } }} 
                    onMouseOut={e => { if(!isCreateDragOver) { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <div style={{ fontSize: '32px', color: '#38bdf8', marginBottom: '4px', lineHeight: '1' }}>{isCreateDragOver ? '📥' : '+'}</div>
                    <div style={{ color: '#38bdf8', fontSize: '13px', fontWeight: '600' }}>{isCreateDragOver ? 'Soltar y Crear' : 'Crear'}</div>
                  </div>

                  {rootFolders.map(f => {
                    const count = chats.filter(c => c.folder_ids && c.folder_ids.split(',').includes(String(f.id))).length;
                    return <RootFolderCard key={f.id} f={f} count={count} onFolderSelect={onFolderSelect} onDeleteFolder={onDeleteFolder} onMoveChat={onMoveChat} onMoveFolder={onMoveFolder} />
                  })}
                </div>
              </>
            )
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '10px', borderTop: '1px solid #334155', background: '#1e293b', display: 'flex', flexDirection: 'column', gap: '5px', boxSizing: 'border-box' }}>
          {isAdmin && (
            <button onClick={onOpenAdmin} style={{ width: '100%', background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.1), rgba(15, 23, 42, 0.5))', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#facc15', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              🛡️ Panel Admin
            </button>
          )}
          <button onClick={onLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
            <LogoutIcon /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📖 MANUAL DE USUARIO SUPER COMPLETO (AHORA VIVE AQUÍ) 📖 */}
      {/* ========================================================= */}
      {showLocalHelp && (
        <div className="modal-overlay" onClick={() => setShowLocalHelp(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="premium-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '950px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0b1120', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Cabecera del Manual */}
            <div className="gallery-header" style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', margin: '0 0 6px 0', color: '#f8fafc', fontWeight: '700' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Guía Operativa y Forense
                </h2>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Documentación oficial de eVidensTalk Enterprise</span>
              </div>
              <button 
  onClick={() => setShowLocalHelp(false)} 
  style={{ 
    width: '36px', 
    height: '36px', 
    padding: 0, 
    border: 'none', 
    background: 'transparent', 
    color: '#94a3b8', 
    borderRadius: '50%', 
    cursor: 'pointer', 
    transition: 'all 0.2s ease', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    outline: 'none'
  }} 
  onMouseOver={e => { 
    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; 
    e.currentTarget.style.color = '#ef4444'; 
  }} 
  onMouseOut={e => { 
    e.currentTarget.style.background = 'transparent'; 
    e.currentTarget.style.color = '#94a3b8'; 
  }}
  aria-label="Cerrar Manual"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
</button>
            </div>
            
            {/* Cuerpo del Manual */}
            <div className="gallery-body" style={{ padding: '40px 50px', overflowY: 'auto', textAlign: 'left', lineHeight: '1.8', color: '#cbd5e1', fontSize: '14.5px' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', color: '#38bdf8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: '16px', margin: '0 0 8px 0' }}>1. Estructura de Trabajo (Casos y Evidencia)</h3>
                  <p style={{ margin: 0 }}><b>eVidensTalk</b> organiza la información en dos niveles para facilitar el análisis pericial:<br/>• <b>Casos (Carpetas):</b> Son los contenedores principales (Ej: "Causa Penal 123/24"). Puede crear infinitas carpetas y subcarpetas.<br/>• <b>Evidencia (Chats):</b> Son las extracciones de WhatsApp reales (.txt) que usted asocia a dichos Casos arrastrándolos y soltándolos en la barra lateral.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', color: '#38bdf8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: '16px', margin: '0 0 8px 0' }}>2. Carga y Preservación Criptográfica</h3>
                  <p style={{ margin: 0 }}>Para cargar un nuevo expediente, presione <b>Importar Evidencia</b> y seleccione la carpeta extraída directamente desde el dispositivo móvil. <br/>Durante este proceso de ingesta, el motor generará automáticamente un <b>Hash SHA-256</b> de los archivos originales. Esto sella criptográficamente la prueba, garantizando su inmutabilidad y cadena de custodia ante cualquier tribunal.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', color: '#38bdf8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: '16px', margin: '0 0 8px 0' }}>3. Herramientas de Análisis Avanzado</h3>
                  <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <li><b>Buscador Global:</b> Ubicado en la barra lateral, rastrea instantáneamente palabras clave en todas las carpetas y chats simultáneamente.</li>
                    <li><b>Filtro por Fecha:</b> En la cabecera de cualquier chat, elija un día en el calendario para aislar temporalmente todas las comunicaciones de esa fecha.</li>
                    <li><b>Marcador de Evidencia (Estrella):</b> Al analizar un chat, marque mensajes incriminatorios con la estrella. Luego, active el botón superior "Evidencia" para ocultar todo el ruido y leer solo lo marcado.</li>
                  </ul>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', color: '#38bdf8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: '16px', margin: '0 0 8px 0' }}>4. Módulo Multimedia y Metadatos</h3>
                  <p style={{ margin: 0 }}>El botón <b>Galería</b> indexa automáticamente todas las fotos, videos, documentos (PDF, Word) y Enlaces Web cruzados en el chat. Al hacer clic en cualquier elemento, el sistema hará un scroll automático llevándolo al momento exacto en el que fue enviado.<br/>El botón <b>Metadatos</b> le mostrará patrones de comportamiento, horarios de actividad y estadísticas de participación por cada actor involucrado.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', color: '#38bdf8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: '16px', margin: '0 0 8px 0' }}>5. Emisión de Dictámenes y Marca Blanca</h3>
                  <p style={{ margin: 0 }}>El botón <b>Emitir PDF</b> compila su investigación en un documento listo para presentar en sede judicial o corporativa. <br/>Desde <b>Mi Cuenta / Agencia</b>, los usuarios con Licencia pueden personalizar el nombre del Estudio y cargar un emblema oficial, el cual encabezará todas las extracciones impresas.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', color: '#38bdf8' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: '16px', margin: '0 0 8px 0' }}>6. Administración Institucional</h3>
                  <p style={{ margin: 0 }}>Si su organización adquirió una licencia Institucional, la cuenta Propietaria posee un panel de "Administración de Accesos". Desde allí, puede despachar invitaciones a sus analistas. Una vez que la subcuenta acepta, su computadora registra la firma física de hardware (HWID) en los servidores centrales para auditoría estricta de seguridad.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}