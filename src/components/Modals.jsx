import React, { useState, useMemo } from 'react';

// Estilos compartidos para la estética Enterprise/Cyber
const overlayStyle = {
  backdropFilter: 'blur(5px)',
  background: 'rgba(15, 23, 42, 0.75)'
};

const modalContainerStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '16px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.1)',
  padding: 0,
  overflow: 'hidden'
};

const headerStyle = {
  padding: '20px',
  background: 'rgba(15, 23, 42, 0.4)',
  borderBottom: '1px solid #334155',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const titleStyle = {
  margin: 0,
  fontSize: '16px',
  color: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontWeight: '600'
};

// --------------------------------------------------------
// 1. MODAL DE NUEVA CARPETA / CASO
// --------------------------------------------------------
export const CreateFolderModal = ({ onClose, onCreate, name, setName, color, setColor, isSubfolder }) => {
  const colorPalette = [
    '#38bdf8', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#d946ef', '#f43f5e', '#ef4444', '#f97316', 
    '#f59e0b', '#84cc16', '#10b981', '#14b8a6'
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{...modalContainerStyle, maxWidth: '420px', width: '100%'}}>
        
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            {isSubfolder ? 'Nueva Subcarpeta' : 'Nueva Carpeta / Caso'}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ padding: '25px' }}>
          
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nombre del Contenedor
            </label>
            <input 
              type="text" placeholder="Ej: Caso Fraude Financiero - 2026" value={name} onChange={e => setName(e.target.value)} autoFocus
              style={{ width: '100%', padding: '14px 15px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }} 
              onFocus={e => { e.target.style.borderColor = '#38bdf8'; e.target.style.boxShadow = '0 0 0 1px #38bdf8'; }}
              onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '30px' }}>
             <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               Color de Etiqueta
             </label>
             <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
               {colorPalette.map(c => (
                 <div 
                   key={c} onClick={() => setColor(c)} 
                   style={{ 
                     width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', 
                     border: color === c ? '3px solid #1e293b' : '3px solid transparent', 
                     boxShadow: color === c ? `0 0 0 2px ${c}, 0 0 15px ${c}80` : 'none', 
                     transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                     transform: color === c ? 'scale(1.15)' : 'scale(1)' 
                   }}
                 />
               ))}
             </div>
          </div>

          <button 
            onClick={onCreate} disabled={!name.trim()}
            style={{ 
              width: '100%', padding: '14px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '14px', letterSpacing: '1px',
              cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: name.trim() ? '0 4px 15px rgba(2, 132, 199, 0.4)' : 'none', opacity: name.trim() ? 1 : 0.5
            }} 
            onMouseOver={e => { if(name.trim()) e.currentTarget.style.filter = 'brightness(1.1)'; }} onMouseOut={e => e.currentTarget.style.filter = 'none'}
          >
            {isSubfolder ? 'CREAR SUBCARPETA' : 'CREAR CASO'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------
// 2. MODAL DE IMPORTACIÓN
// --------------------------------------------------------
export const ImportModal = ({ folders, onClose, onConfirm, onTriggerCreateFolder }) => (
  <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{...modalContainerStyle, maxWidth: '420px', width: '100%'}}>
      
      <div style={headerStyle}>
        <h3 style={titleStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Guardar Evidencia En...
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>
      
      <div style={{ padding: '25px' }}>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>
          Selecciona un contenedor existente o crea uno nuevo para aislar la evidencia de esta importación.
        </p>

        <button 
          onClick={onTriggerCreateFolder} 
          style={{
            width:'100%', marginBottom:'20px', padding:'14px', 
            background: 'rgba(56, 189, 248, 0.05)', border:'1px dashed #38bdf8', 
            color:'#38bdf8', borderRadius:'8px', cursor:'pointer', fontWeight:'bold',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)'}
        >
          + Crear Nueva Carpeta
        </button>

        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {folders.length === 0 && <p style={{ fontSize:'12px', color:'#64748b', textAlign:'center', marginTop:'10px' }}>No hay carpetas creadas.</p>}
          
          {folders.map(f => (
            <button 
              key={f.id} 
              onClick={() => onConfirm(f.id)} 
              style={{
                width:'100%', padding:'12px 15px', background:'#0f172a', border:'1px solid #334155', 
                color:'#f8fafc', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px',
                transition: 'border-color 0.2s, background 0.2s', fontSize:'14px', fontWeight:'500'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.background = '#1e293b'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#0f172a'; }}
            >
              <div style={{ width:'12px', height:'12px', borderRadius:'50%', background: f.color, boxShadow: `0 0 8px ${f.color}80` }}></div> 
              {f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// --------------------------------------------------------
// 3. MODAL DE MOVER CHAT
// --------------------------------------------------------
export const FolderSelectModal = ({ folders, onClose, onSelect }) => (
  <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{...modalContainerStyle, maxWidth: '350px', width: '100%'}}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Mover a...</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>
      <div style={{ padding: '20px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {folders.map(f => (
          <button 
            key={f.id} 
            onClick={() => onSelect(f.id)} 
            style={{
              width:'100%', padding:'12px', background:'#0f172a', border:'1px solid #334155', 
              color:'#f8fafc', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px',
              transition: 'all 0.2s', fontSize:'13px', fontWeight:'500'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.background = '#1e293b'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#0f172a'; }}
          >
            <div style={{ width:'10px', height:'10px', borderRadius:'50%', background: f.color }}></div> 
            {f.name}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// --------------------------------------------------------
// 4. MODAL DE ESTADÍSTICAS
// --------------------------------------------------------
export const StatsModal = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState('hours'); 

  if (!data || !data.timeStats) return null;

  const views = {
    hours: { label: 'Por Hora', labels: Array.from({length:24}, (_, i) => `${i}h`), values: data.timeStats.hours },
    weekDays: { label: 'Día', labels: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], values: data.timeStats.weekDays },
    months: { label: 'Mes', labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], values: data.timeStats.months },
    years: { label: 'Año', labels: Object.keys(data.timeStats.years), values: Object.values(data.timeStats.years) }
  };

  const currentView = views[activeTab];
  const maxVal = Math.max(...currentView.values, 1);

  return (
    <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{...modalContainerStyle, maxWidth: '750px', width: '95%'}}>
        
        <div style={headerStyle}>
           <h3 style={titleStyle}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
             Inteligencia y Estadísticas
           </h3>
           <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ padding: '25px' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: '#0f172a', padding: '6px', borderRadius: '10px', border: '1px solid #334155' }}>
            {Object.keys(views).map(key => (
              <button 
                key={key} onClick={() => setActiveTab(key)}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                  background: activeTab === key ? '#1e293b' : 'transparent',
                  color: activeTab === key ? '#38bdf8' : '#64748b',
                  boxShadow: activeTab === key ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {views[key].label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', height: '220px', gap: '6px', paddingBottom: '30px', borderBottom: '1px dashed #334155', position: 'relative' }}>
            {currentView.values.map((val, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                
                <div style={{ fontSize:'10px', marginBottom:'8px', color:'#cbd5e1', fontWeight:'bold', opacity: val > 0 ? 1 : 0, transition: 'opacity 0.3s' }}>
                    {val > 0 ? val : ''}
                </div>
                
                <div style={{
                    width: '100%', maxWidth: '40px', height: `${(val / maxVal) * 100}%`,
                    background: val > 0 ? 'linear-gradient(to top, #0284c7, #38bdf8)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '4px 4px 0 0', transition: 'height 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    minHeight: val > 0 ? '4px' : '0',
                    boxShadow: val > 0 ? '0 -5px 15px rgba(56, 189, 248, 0.2)' : 'none'
                }}></div>

                <div style={{
                    position: 'absolute', bottom: '-25px', fontSize: '11px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap',
                    transform: currentView.labels.length > 15 ? 'rotate(-45deg)' : 'none', transformOrigin: 'left top'
                }}>
                  {currentView.labels[index]}
                </div>
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: '30px', color: '#38bdf8', fontSize: '12px', textTransform:'uppercase', letterSpacing: '1px' }}>
            Participación por Actor
          </h4>
          <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop:'15px', paddingRight: '10px' }}>
            {data.userRanking.map(([u, c], idx) => (
                <div key={u} style={{ display:'flex', alignItems:'center', marginBottom:'12px', fontSize:'13px', background: '#0f172a', padding: '10px 15px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ width:'20px', color: '#64748b', fontWeight: 'bold' }}>{idx + 1}</div>
                    <div style={{ width:'140px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'#f8fafc', fontWeight: '500' }}>{u}</div>
                    <div style={{ flex:1, background:'#1e293b', height:'6px', borderRadius:'4px', overflow:'hidden', margin:'0 15px' }}>
                        <div style={{ width:`${(c/data.maxMsgs)*100}%`, background:'#34d399', height:'100%', boxShadow: '0 0 10px rgba(52, 211, 153, 0.5)' }}></div>
                    </div>
                    <div style={{ width:'50px', textAlign:'right', color:'#34d399', fontSize:'12px', fontWeight:'bold' }}>{c} msgs</div>
                </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};


// --------------------------------------------------------
// 5. MODAL DE GALERÍA (NUEVA: ESTILO WHATSAPP CON FECHAS, DOCS Y LINKS)
// --------------------------------------------------------
export const GalleryModal = ({ data, allMessages = [], isLoading, onClose, onGoToMessage }) => {
  const [activeTab, setActiveTab] = useState('media');

  const { mediaItems, docItems, linkItems } = useMemo(() => {
    // 1. Multimedia (Imágenes y Videos - EXCLUYENDO STICKERS .webp)
    const media = (data?.media || []).filter(m => {
      const isImageOrVideo = ['image', 'video'].includes(m.media_type);
      const isSticker = m.local_media_path?.toLowerCase().endsWith('.webp') || m.file_name?.toLowerCase().endsWith('.webp');
      return isImageOrVideo && !isSticker;
    });

    // 2. Documentos (PDFs, Word, Excel, etc. - EXCLUYENDO STICKERS .webp)
    const docs = (data?.media || []).filter(m => {
      const isDoc = ['document', 'application', 'pdf', 'audio'].includes(m.media_type) || 
                    (m.file_name && !['image', 'video'].includes(m.media_type));
      const isSticker = m.local_media_path?.toLowerCase().endsWith('.webp') || m.file_name?.toLowerCase().endsWith('.webp');
      return isDoc && !isSticker;
    });

    // 3. Enlaces (Extraídos de todos los mensajes)
    const links = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    allMessages.forEach(msg => {
      if (msg.body) {
        const foundLinks = msg.body.match(urlRegex);
        if (foundLinks) {
          foundLinks.forEach(url => {
            links.push({ ...msg, extractedUrl: url, id: `${msg.id}-${url}` });
          });
        }
      }
    });

    return { mediaItems: media, docItems: docs, linkItems: links };
  }, [data, allMessages]);

  const groupItemsByDate = (items) => {
    const grouped = {};
    items.forEach(item => {
      const dateStr = item.timestamp ? item.timestamp.split(' ')[0] : 'Fecha desconocida';
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(item);
    });
    return grouped;
  };

  const getItemsToRender = () => {
    if (activeTab === 'media') return groupItemsByDate(mediaItems);
    if (activeTab === 'docs') return groupItemsByDate(docItems);
    if (activeTab === 'links') return groupItemsByDate(linkItems);
    return {};
  };

  const groupedData = getItemsToRender();
  
  const sortedDates = Object.keys(groupedData).sort((a, b) => {
    if (a === 'Fecha desconocida') return 1;
    if (b === 'Fecha desconocida') return -1;
    const [da, ma, ya] = a.split('/');
    const [db, mb, yb] = b.split('/');
    return new Date(yb, mb-1, db) - new Date(ya, ma-1, da);
  });

  const hasItems = sortedDates.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{...overlayStyle, zIndex: 9999, display: 'flex', flexDirection: 'column'}}>
      
      {/* 🔥 INYECCIÓN DE CSS PURO: CERO LAG Y CLICS PERFECTOS 🔥 */}
      <style>{`
        .media-item-card { position: relative; aspect-ratio: 1/1; cursor: pointer; overflow: hidden; background: #0b1120; }
        .media-item-card .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 17, 32, 0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s ease; pointer-events: none; }
        .media-item-card:hover .overlay { opacity: 1; }
        
        .list-row-item { display: flex; align-items: center; gap: 16px; padding: 12px 24px; background: transparent; cursor: pointer; border-bottom: 1px solid #1e293b; transition: background 0.2s ease; }
        .list-row-item:hover { background: rgba(255, 255, 255, 0.03); }
      `}</style>

      {/* HEADER DE LA GALERÍA: DISEÑO WHATSAPP WEB */}
      <div className="gallery-header" onClick={(e) => e.stopPropagation()} style={{ background: '#0b1120', width: '100%', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 10px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: '600' }}>
              Contenido multimedia
            </h2>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Contenido multimedia, documentos y enlaces de la extracción
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'} 
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              aria-label="Cerrar galería"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '0 24px' }}>
          <TabButton label="Archivos multimedia" active={activeTab === 'media'} onClick={() => setActiveTab('media')} count={mediaItems.length} />
          <TabButton label="Documentos" active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} count={docItems.length} />
          <TabButton label="Enlaces" active={activeTab === 'links'} onClick={() => setActiveTab('links')} count={linkItems.length} />
        </div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <div className="gallery-body" onClick={(e) => e.stopPropagation()} style={{ flex: 1, width: '100%', margin: '0 auto', overflowY: 'auto', background: '#0f172a' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#38bdf8', fontWeight: 'bold' }}>Procesando archivos y enlaces...</div>
        ) : !hasItems ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#64748b' }}>No hay {activeTab === 'media' ? 'multimedia' : activeTab === 'docs' ? 'documentos' : 'enlaces'} en este expediente.</div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} style={{ marginBottom: activeTab === 'media' ? '24px' : '0' }}>
              
              {/* Separador de Fecha Estilo WhatsApp */}
              <div style={{ 
                position: 'sticky', top: 0, background: '#0f172a', zIndex: 10, color: '#94a3b8', 
                fontSize: '14px', fontWeight: '600', padding: '16px 24px 8px 24px', 
              }}>
                {date}
              </div>
              
              {/* RENDERIZADO SEGÚN LA PESTAÑA */}
              {activeTab === 'media' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '4px', padding: '0 24px' }}>
                  {groupedData[date].map(item => (
                    <MediaCard key={item.id} item={item} onGoToMessage={onGoToMessage} />
                  ))}
                </div>
              )}

              {activeTab === 'docs' && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {groupedData[date].map(item => (
                    <DocumentRow key={item.id} item={item} onGoToMessage={onGoToMessage} />
                  ))}
                </div>
              )}

              {activeTab === 'links' && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {groupedData[date].map(item => (
                    <LinkRow key={item.id} item={item} onGoToMessage={onGoToMessage} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- COMPONENTES AUXILIARES PARA LA UI ---

const TabButton = ({ label, active, onClick, count }) => (
  <div 
    onClick={onClick}
    style={{ 
      padding: '14px 4px', 
      fontSize: '14px', 
      fontWeight: active ? '600' : '500', 
      cursor: 'pointer',
      color: active ? '#38bdf8' : '#94a3b8',
      borderBottom: active ? '3px solid #38bdf8' : '3px solid transparent',
      marginBottom: '-1px', 
      transition: 'color 0.2s, border-color 0.2s',
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      boxSizing: 'border-box'
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#cbd5e1'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#94a3b8'; }}
  >
    {label} 
    <span style={{ 
      background: active ? 'rgba(56, 189, 248, 0.1)' : '#1e293b', 
      padding: '2px 6px', 
      borderRadius: '12px', 
      fontSize: '11px', 
      fontWeight: '700',
      color: active ? '#38bdf8' : '#64748b',
      transition: 'all 0.2s'
    }}>
      {count}
    </span>
  </div>
);

const MediaCard = ({ item, onGoToMessage }) => (
  <div className="media-item-card" onClick={() => onGoToMessage(item)}>
    {item.media_type === 'video' ? (
       <video src={item.local_media_path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
       <img src={item.local_media_path} alt="media" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'} />
    )}
    <div className="overlay">
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '6px'}}><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
         <span style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>Ver en chat</span>
    </div>
  </div>
);

const DocumentRow = ({ item, onGoToMessage }) => (
  <div className="list-row-item" onClick={() => onGoToMessage(item)}>
    <div style={{ width: '40px', height: '40px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.file_name || 'Documento adjunto'}</div>
      <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', gap: '8px', marginTop: '4px' }}>
        <span>{item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(2)} MB` : 'Desconocido'}</span>
        <span>•</span>
        <span>{item.media_type.toUpperCase()}</span>
      </div>
    </div>
    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
      <div style={{ color: '#94a3b8', fontSize: '12px' }}>{item.timestamp?.split(' ')[1] || ''}</div>
      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{item.sender_name}</div>
    </div>
  </div>
);

const LinkRow = ({ item, onGoToMessage }) => (
  <div className="list-row-item" onClick={() => onGoToMessage(item)}>
    <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <a href={item.extractedUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#38bdf8', fontSize: '15px', fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', textDecoration: 'none' }}>
        {item.extractedUrl}
      </a>
      <div style={{ color: '#94a3b8', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '4px' }}>
        {item.body?.replace(item.extractedUrl, '').trim() || 'Enlace compartido'}
      </div>
    </div>
    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
      <div style={{ color: '#94a3b8', fontSize: '12px' }}>{item.timestamp?.split(' ')[1] || ''}</div>
      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{item.sender_name}</div>
    </div>
  </div>
);