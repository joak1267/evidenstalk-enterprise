import React, { useState } from 'react';

// Modal para seleccionar carpeta al mover un chat
export const FolderSelectModal = ({ folders, onClose, onSelect }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'300px'}}>
      <div className="gallery-header"><h3>Mover a...</h3><button className="header-btn" onClick={onClose}>✕</button></div>
      <div className="folder-list-select" style={{padding:20}}>
        {folders.map(f => (
          <div key={f.id} className="folder-item-select" onClick={() => onSelect(f.id)} style={{padding:10, cursor:'pointer', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #334155'}}>
            <div className="folder-dot" style={{background: f.color}}></div> {f.name}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Modal para crear nueva carpeta/caso
export const CreateFolderModal = ({ onClose, onCreate, name, setName, color, setColor }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'400px', textAlign:'center'}}>
      <div className="gallery-header"><h3>Nueva Carpeta / Caso</h3><button className="header-btn" onClick={onClose}>✕</button></div>
      <div style={{padding:20}}>
        <input type="text" className="header-input" placeholder="Nombre (ej: Caso Fraude)" value={name} onChange={e => setName(e.target.value)} style={{width:'90%', marginBottom:15}}/>
        <div style={{display:'flex', gap:10, justifyContent:'center', marginBottom:20}}>
          {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
            <div key={c} onClick={() => setColor(c)} style={{width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer', border:color === c ? '2px solid white' : 'none'}}></div>
          ))}
        </div>
        <button className="btn-action header-btn" style={{width:'100%', justifyContent:'center'}} onClick={onCreate}>Crear Caso</button>
      </div>
    </div>
  </div>
);

// Modal de Estadísticas AVANZADO
export const StatsModal = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState('hours'); // hours | weekDays | months | years

  // Si no hay datos o faltan las estadísticas de tiempo, no mostramos nada para evitar errores
  if (!data || !data.timeStats) return null;

  // Configuración de las vistas
  const views = {
    hours: { 
      label: 'Por Hora (24h)', 
      labels: Array.from({length:24}, (_, i) => `${i}h`), 
      values: data.timeStats.hours 
    },
    weekDays: { 
      label: 'Día de Semana', 
      labels: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], 
      values: data.timeStats.weekDays 
    },
    months: { 
      label: 'Mensual', 
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], 
      values: data.timeStats.months 
    },
    years: { 
      label: 'Anual', 
      labels: Object.keys(data.timeStats.years), 
      values: Object.values(data.timeStats.years) 
    }
  };

  const currentView = views[activeTab];
  // Calcular el máximo de la vista actual para escalar las barras
  const maxVal = Math.max(...currentView.values, 1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '700px'}}>
        
        {/* HEADER */}
        <div className="gallery-header">
           <h2>📊 Actividad del Chat</h2>
           <button className="header-btn" onClick={onClose}>✕</button>
        </div>

        <div className="gallery-body" style={{padding: '20px'}}>
          
          {/* TABS DE NAVEGACIÓN */}
          <div style={{display: 'flex', gap: '10px', marginBottom: '20px', background: '#0f172a', padding: '5px', borderRadius: '10px'}}>
            {Object.keys(views).map(key => (
              <button 
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: activeTab === key ? '#38bdf8' : 'transparent',
                  color: activeTab === key ? '#0f172a' : '#94a3b8',
                  transition: '0.2s'
                }}
              >
                {views[key].label}
              </button>
            ))}
          </div>

          {/* GRÁFICO DE BARRAS VERTICALES */}
          <div style={{
              display: 'flex', 
              alignItems: 'flex-end', 
              height: '200px', 
              gap: '6px', 
              paddingBottom: '25px', // espacio para labels
              borderBottom: '1px solid #334155',
              position: 'relative'
          }}>
            {currentView.values.map((val, index) => (
              <div key={index} style={{
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  height: '100%', 
                  justifyContent: 'flex-end',
                  position: 'relative'
              }}>
                {/* Valor numérico flotante (tooltip) */}
                <div className="bar-tooltip" style={{fontSize:'10px', marginBottom:'5px', color:'white', fontWeight:'bold', opacity: val > 0 ? 0.7 : 0}}>
                    {val > 0 ? val : ''}
                </div>
                
                {/* La Barra */}
                <div style={{
                    width: '100%',
                    height: `${(val / maxVal) * 100}%`,
                    background: val > 0 ? 'linear-gradient(to top, #38bdf8, #818cf8)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    minHeight: val > 0 ? '4px' : '0'
                }}></div>

                {/* Etiqueta Eje X */}
                <div style={{
                    position: 'absolute', 
                    bottom: '-25px', 
                    fontSize: '10px', 
                    color: '#94a3b8', 
                    whiteSpace: 'nowrap',
                    transform: currentView.labels.length > 15 ? 'rotate(-45deg)' : 'none',
                    transformOrigin: 'left top'
                }}>
                  {currentView.labels[index]}
                </div>
              </div>
            ))}
          </div>

          {/* RANKING DE USUARIOS */}
          <h4 style={{marginTop: '30px', color: '#94a3b8', fontSize: '12px', textTransform:'uppercase'}}>Participación por Usuario</h4>
          <div style={{maxHeight: '150px', overflowY: 'auto', marginTop:'10px'}}>
            {data.userRanking.map(([u, c]) => (
                <div key={u} style={{display:'flex', alignItems:'center', marginBottom:'8px', fontSize:'13px'}}>
                    <div style={{width:'120px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'#cbd5e1'}}>{u}</div>
                    <div style={{flex:1, background:'rgba(255,255,255,0.05)', height:'8px', borderRadius:'4px', overflow:'hidden', margin:'0 10px'}}>
                        <div style={{width:`${(c/data.maxMsgs)*100}%`, background:'#38bdf8', height:'100%'}}></div>
                    </div>
                    <div style={{width:'40px', textAlign:'right', color:'#64748b', fontSize:'11px'}}>{c}</div>
                </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

// Modal de Galería Multimedia
export const GalleryModal = ({ data, onClose, activeTab }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content">
      <div className="gallery-header"><h2>Galería</h2><button className="header-btn" onClick={onClose}>✕</button></div>
      <div className="gallery-body">
        {activeTab === 'media' && (
          <div className="media-grid">
            {data.media.map(m => (
              <div key={m.id} className="media-item">
                <img src={`file://${m.local_media_path}`} onClick={() => window.open(`file://${m.local_media_path}`)} loading="lazy"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// Modal de Importación (ESTRICTO: Solo carpetas)
export const ImportModal = ({ folders, onClose, onConfirm, onTriggerCreateFolder }) => (
  <div className="modal-overlay">
    <div className="modal-content" style={{maxWidth:'400px', textAlign:'center'}}>
      <div className="gallery-header">
        <h3>Guardar Evidencia En...</h3>
        <button className="header-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="folder-list-select" style={{padding:20}}>
        <p style={{fontSize: '12px', color: '#94a3b8', marginBottom: '15px'}}>
          Selecciona una carpeta existente o crea una nueva para organizar este chat.
        </p>

        {/* Botón para crear nueva carpeta directamente desde aquí */}
        <button 
          className="folder-item-select" 
          onClick={onTriggerCreateFolder} 
          style={{
            width:'100%', marginBottom:15, padding:12, 
            background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.1), transparent)', 
            border:'1px dashed #38bdf8', 
            color:'#38bdf8', borderRadius:6, cursor:'pointer', fontWeight:'bold'
          }}
        >
          + Crear Nueva Carpeta
        </button>

        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
          {folders.length === 0 && <p style={{fontSize:10, opacity:0.5}}>No hay carpetas creadas.</p>}
          
          {folders.map(f => (
            <button key={f.id} className="folder-item-select" onClick={() => onConfirm(f.id)} style={{width:'100%', marginBottom:5, padding:10, background:'#1e293b', border:'1px solid #334155', color:'white', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', gap:10}}>
              <div className="folder-dot" style={{background: f.color}}></div> {f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);