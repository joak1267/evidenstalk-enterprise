import { useState, useEffect, useRef } from 'react';
import './App.css';
import logoImage from './watsappaudittool.png';
// Componentes Importados
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import { GalleryIcon, PdfIcon, ChartIcon, StarIcon } from './components/Icons';
import { FolderSelectModal, CreateFolderModal, StatsModal, GalleryModal, ImportModal } from './components/Modals';

// --- CONFIG ---
const MESSAGES_LIMIT = 2000; 

function App() {
  // Estado Global
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [folders, setFolders] = useState([]);
  
  // Estado UI/UX
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null); 

  // Buscadores y Filtros
  const [busqueda, setBusqueda] = useState(''); 
  const [localSearchResults, setLocalSearchResults] = useState([]); 
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [modoFiltroFecha, setModoFiltroFecha] = useState(false);
  const [modoEvidencia, setModoEvidencia] = useState(false);
  const [globalSearchMode, setGlobalSearchMode] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Modales y Acciones
  const [activeFolderId, setActiveFolderId] = useState(null); 
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [assignChatId, setAssignChatId] = useState(null);
  const [importingPath, setImportingPath] = useState(null); 
  const [showStats, setShowStats] = useState(false);
  const [showGallery, setShowGallery] = useState(false); 
  const [showHelp, setShowHelp] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Transcripción IA
  const [transcripciones, setTranscripciones] = useState({});
  const [procesandoAudio, setProcesandoAudio] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  // Scroll Automático
  useEffect(() => {
    if (activeChat && messages.length > 0 && !loadingMsg && currentOffset === 0) {
       chatEndRef.current?.scrollIntoView({ behavior: "auto" });
    } else if (activeChat && messages.length > 0 && !loadingMsg && currentOffset > 0) {
       if(scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeChat, messages, currentOffset, loadingMsg]); 

  const cargarDatos = async () => {
    try {
      const listaChats = await window.api.getChats();
      const listaFolders = await window.api.getFolders();
      setChats(listaChats || []);
      setFolders(listaFolders || []);
    } catch(e) { console.error(e); }
  };

  // --- LÓGICA DE CHATS ---
  const handleChatClick = async (chat) => {
    setActiveChat(chat); 
    setGlobalSearchMode(false); 
    setBusqueda(''); setFechaFiltro('');
    setMessages([]); 
    setCurrentOffset(0);

    const total = await window.api.getCountMessages(chat.id);
    setTotalMessages(total);
    
    setLoadingMsg(true);
    const msgs = await window.api.getMessages({ chatId: chat.id, offset: 0, limit: MESSAGES_LIMIT });
    setMessages(msgs);
    setLoadingMsg(false);
  };

  // Navegación Historial
  const handleCargarAnteriores = async () => {
    if (loadingMsg) return;
    setLoadingMsg(true);
    const newOffset = currentOffset + MESSAGES_LIMIT;
    if (newOffset >= totalMessages) { setLoadingMsg(false); return; }
    const oldMsgs = await window.api.getMessages({ chatId: activeChat.id, offset: newOffset, limit: MESSAGES_LIMIT });
    setMessages(oldMsgs); 
    setCurrentOffset(newOffset);
    setLoadingMsg(false);
  };

  const handleCargarRecientes = async () => {
    if (loadingMsg || currentOffset === 0) return;
    setLoadingMsg(true);
    let newOffset = currentOffset - MESSAGES_LIMIT;
    if (newOffset < 0) newOffset = 0;
    const newerMsgs = await window.api.getMessages({ chatId: activeChat.id, offset: newOffset, limit: MESSAGES_LIMIT });
    setMessages(newerMsgs); 
    setCurrentOffset(newOffset);
    setLoadingMsg(false);
  };

  // --- BÚSQUEDA LOCAL (Arreglada) ---
  useEffect(() => {
    if (!activeChat) return;
    if (busqueda.length > 2) {
      // Pedimos resultados a la API
      window.api.searchMessages({ chatId: activeChat.id, term: busqueda })
        .then(results => {
            // Aseguramos que siempre sea un array para no romper el .map
            setLocalSearchResults(results || []);
        })
        .catch(err => {
            console.error("Error búsqueda local:", err);
            setLocalSearchResults([]);
        });
    } else {
      setLocalSearchResults([]);
    }
  }, [busqueda, activeChat]);

  // Manejador del Input Local (Limpia filtros para que se vea el resultado)
  const handleLocalSearchChange = (e) => {
      const val = e.target.value;
      setBusqueda(val);
      if (val.length > 0) {
          setModoEvidencia(false);   // 👈 Desactiva filtro evidencia
          setModoFiltroFecha(false); // 👈 Desactiva filtro fecha
      }
  };

  // Filtrado final visual
  const listaMensajesAMostrar = (busqueda.length > 2) ? localSearchResults : messages;
  
  const mensajesFiltrados = listaMensajesAMostrar.filter(msg => {
    let fecha = true;
    if (modoFiltroFecha && fechaFiltro) {
        const [d, m, y] = msg.timestamp.split(' ')[0].split('/');
        fecha = (`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` === fechaFiltro);
    }
    return fecha && (!modoEvidencia || Boolean(msg.is_evidence));
  });

  // --- BÚSQUEDA GLOBAL (Arreglada) ---
  const handleGlobalSearch = async (term) => { 
    setGlobalSearchTerm(term); 
    if (!term || term.length < 2) { setGlobalSearchResults([]); return; } 
    
    // PREPARAR PARÁMETROS: Si no hay carpeta, no mandamos folderId null
    const params = { term };
    if (activeFolderId) {
        params.folderId = activeFolderId;
    }
    
    try {
        const results = await window.api.searchMessages(params); 
        setGlobalSearchResults(results || []); 
    } catch (error) {
        console.error("Error búsqueda global:", error);
        setGlobalSearchResults([]);
    }
  };

  // --- ACCIONES RESTANTES ---
  const handleBorrarChat = async (e, chatId) => { 
      e.stopPropagation(); 
      if (window.confirm("🗑️ ¿CONFIRMAR BORRADO?")) { 
          const res = await window.api.deleteChat(chatId); 
          if (res.success) {
              if (activeChat?.id === chatId) { setActiveChat(null); setMessages([]); }
              await cargarDatos(); 
          } else { alert("Error: " + res.error); }
      } 
  };

  const handleReset = async () => { 
      if (window.confirm("⚠️ ¿Vaciar TODA la base de datos?")) { 
          await window.api.resetDatabase(); 
          setChats([]); setMessages([]); setActiveChat(null); setFolders([]); 
          alert("✅ Base de datos vaciada."); 
      } 
  };

  const handleTranscribir = async (msgId, filePath) => { 
    if (transcripciones[msgId]) return; 
    setProcesandoAudio(msgId); 
    const result = await window.api.transcribeAudio(filePath); 
    if (result.success) setTranscripciones(prev => ({ ...prev, [msgId]: result.text })); 
    else alert("Error IA: " + result.error); 
    setProcesandoAudio(null); 
  };

  const handleToggleEvidence = async (msgId) => { 
    await window.api.toggleEvidence(msgId); 
    const updater = (lista) => lista.map(msg => 
      msg.id === msgId ? { ...msg, is_evidence: msg.is_evidence ? 0 : 1 } : msg
    );
    if (globalSearchMode) {
       setGlobalSearchResults(prev => updater(prev));
    } else {
       setMessages(prev => updater(prev)); 
       setLocalSearchResults(prev => updater(prev)); 
    }
  };

  const getGalleryData = () => {
    const media = []; messages.forEach(msg => { if (['image', 'video'].includes(msg.media_type) && msg.local_media_path) media.push(msg); });
    return { media };
  };
  
  const calcularEstadisticas = () => {
    if (!messages.length) return null;
    const userStats = {};
    const timeStats = { hours: new Array(24).fill(0), weekDays: new Array(7).fill(0), months: new Array(12).fill(0), years: {} };

    messages.forEach((msg) => {
      const sender = msg.sender_name || 'Desconocido';
      userStats[sender] = (userStats[sender] || 0) + 1;
      if (!msg.timestamp) return;
      try {
        let dateObj;
        if (typeof msg.timestamp === 'string' && msg.timestamp.includes('/')) {
            const parts = msg.timestamp.split(' ');
            const dateParts = parts[0].split('/'); 
            const timeParts = parts[1] ? parts[1].split(':') : [0,0,0];
            dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0] || 0), parseInt(timeParts[1] || 0));
        } else { dateObj = new Date(msg.timestamp); }

        if (!isNaN(dateObj.getTime())) {
            timeStats.hours[dateObj.getHours()]++;
            timeStats.weekDays[dateObj.getDay()]++;
            timeStats.months[dateObj.getMonth()]++;
            const year = dateObj.getFullYear();
            timeStats.years[year] = (timeStats.years[year] || 0) + 1;
        }
      } catch (e) {}
    });

    const userRanking = Object.entries(userStats).sort(([,a], [,b]) => b - a);
    return { userRanking, maxMsgs: userRanking[0] ? userRanking[0][1] : 1, timeStats };
  };

  const formatearFecha = (f) => f ? f.split(' ')[0] : '';

  return (
    <div className="app-container">
      {importingPath && (
        <ImportModal 
          folders={folders} 
          onClose={() => setImportingPath(null)} 
          onTriggerCreateFolder={() => { setShowFolderModal(true); }}
          onConfirm={async (tid) => { 
             const res = await window.api.processImport({ folderPath: importingPath, targetFolderId: tid }); 
             if(res.success) { alert("✅ Chat importado a la carpeta exitosamente."); cargarDatos(); } 
             setImportingPath(null); 
          }} 
        />
      )}
      {showFolderModal && <CreateFolderModal name={newFolderName} setName={setNewFolderName} color={newFolderColor} setColor={setNewFolderColor} onClose={() => setShowFolderModal(false)} onCreate={async () => { await window.api.createFolder({ name: newFolderName, color: newFolderColor }); setShowFolderModal(false); cargarDatos(); }} />}
      {assignChatId && <FolderSelectModal folders={folders} onClose={() => setAssignChatId(null)} onSelect={async (fid) => { await window.api.addChatToFolder({ chatId: assignChatId, folderId: fid }); setAssignChatId(null); cargarDatos(); }} />}
      {showStats && <StatsModal data={calcularEstadisticas()} onClose={() => setShowStats(false)} />}
      {showGallery && <GalleryModal data={getGalleryData()} activeTab="media" onClose={() => setShowGallery(false)} />}
      
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'800px', height: '85vh', display:'flex', flexDirection:'column'}}>
            <div className="gallery-header"><h2>📘 Manual de Usuario</h2><button className="header-btn" onClick={() => setShowHelp(false)}>✕</button></div>
            <div className="gallery-body" style={{padding: '30px', overflowY: 'auto', textAlign:'left', lineHeight:'1.6', color:'#cbd5e1'}}>
              <section style={{marginBottom: '30px'}}><h3 style={{color: '#38bdf8', borderBottom: '1px solid rgba(56,189,248,0.3)', paddingBottom: '10px'}}>1. Gestión y Organización</h3><ul style={{listStyleType:'disc', paddingLeft:'20px'}}><li><strong>Sistema de Casos:</strong> Creación de carpetas contenedoras (Ej: "Caso Divorcio X", "Fraude Empresa Y").</li><li><strong>Ingesta de Datos:</strong> Importación de chats exportados de WhatsApp (.txt + media) con asignación a carpetas específicas.</li></ul></section>
              <section style={{marginBottom: '30px'}}><h3 style={{color: '#a78bfa', borderBottom: '1px solid rgba(167,139,250,0.3)', paddingBottom: '10px'}}>2. Visualización Forense</h3><ul style={{listStyleType:'disc', paddingLeft:'20px'}}><li><strong>Interfaz Dark Mode:</strong> Diseño profesional de bajo cansancio visual.</li><li><strong>Reproducción Multimedia:</strong> Visualización de fotos y videos locales integrados en el flujo del chat.</li><li><strong>Separadores Temporales:</strong> Indicadores claros de cambio de día/fecha.</li></ul></section>
              <section style={{marginBottom: '30px'}}><h3 style={{color: '#facc15', borderBottom: '1px solid rgba(250,204,21,0.3)', paddingBottom: '10px'}}>3. Descubrimiento de Información (Discovery)</h3><ul style={{listStyleType:'disc', paddingLeft:'20px'}}><li><strong>Búsqueda Global (Cross-Case):</strong> Busca palabras clave en todos los casos simultáneamente.</li><li><strong>Filtros Avanzados:</strong> Por fecha (calendario) y por etiquetas de Evidencia.</li><li><strong>Transcripción IA:</strong> Conversión de audios (OGG/Opus) a texto legible dentro de la burbuja del chat.</li></ul></section>
              <section style={{marginBottom: '30px'}}><h3 style={{color: '#ef4444', borderBottom: '1px solid rgba(239,68,68,0.3)', paddingBottom: '10px'}}>4. Reportes y Entregables</h3><ul style={{listStyleType:'disc', paddingLeft:'20px'}}><li><strong>Sistema de Marcado:</strong> Etiquetado de mensajes clave con "Estrella" (Evidencia).</li><li><strong>Exportación PDF:</strong><ul style={{listStyleType:'circle', paddingLeft:'20px', marginTop:'5px', color:'#94a3b8'}}><li>Reporte Completo (Historial total).</li><li>Reporte de Evidencia (Solo mensajes marcados, ideal para jueces).</li><li>Vista Actual (Lo que se ve en pantalla).</li></ul></li></ul></section>
              <div style={{marginTop:'20px', textAlign:'center', fontSize:'12px', opacity:0.5}}>WhatsApp Audit Tool v3.7</div>
            </div>
          </div>
        </div>
      )}
      
      {showPrintModal && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '450px', textAlign: 'center'}}>
            <div className="gallery-header"><h3>🖨️ Generar Reporte</h3><button className="header-btn" onClick={() => setShowPrintModal(false)}>✕</button></div>
            <div style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 10}}>
              <p style={{color: '#94a3b8', marginBottom: 15}}>Selecciona el formato de exportación:</p>
              <button className="btn-action header-btn" style={{justifyContent: 'center', padding: 15, background: '#3b82f6', color: 'white', border: '1px solid rgba(255,255,255,0.1)'}} onClick={() => { setTimeout(() => { window.print(); setShowPrintModal(false); }, 300); }}>👁️ Imprimir Vista Actual</button>
              <button className="btn-action header-btn" style={{justifyContent: 'center', padding: 15, background: '#334155'}} onClick={() => { setModoEvidencia(false); setModoFiltroFecha(false); setBusqueda(''); setTimeout(() => { window.print(); setShowPrintModal(false); }, 300); }}>📚 Todo el Historial</button>
              <button className="btn-action header-btn" style={{justifyContent: 'center', padding: 15, background: '#eab308', color: 'black'}} onClick={() => { setModoEvidencia(true); setTimeout(() => { window.print(); setShowPrintModal(false); }, 300); }}>⭐ Resumen de Evidencias</button>
            </div>
          </div>
        </div>
      )}

      <Sidebar 
        chats={chats} activeChat={activeChat} onChatSelect={handleChatClick}
        folders={folders} activeFolderId={activeFolderId} onFolderSelect={setActiveFolderId}
        onDeleteChat={handleBorrarChat} onDeleteFolder={async (e, id) => { e.stopPropagation(); if(confirm("Borrar?")) {await window.api.deleteFolder(id); cargarDatos();} }}
        onCreateFolder={() => setShowFolderModal(true)} onAssignFolder={setAssignChatId}
        onResetDB={handleReset} onImport={async () => { const p = await window.api.selectFolderPath(); if(p) setImportingPath(p); }}
        onShowHelp={() => setShowHelp(true)} globalSearchMode={globalSearchMode} onGlobalSearchClick={() => { setGlobalSearchMode(true); setActiveChat(null); setGlobalSearchResults([]); }}
      />

      <div className="chat-window">
        {!activeChat && !globalSearchMode && (
          <div className="welcome-screen">
            <img src={logoImage} style={{width: '100%', maxWidth: '700px', borderRadius: '12px', filter: 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.3))'}} />
            <div style={{marginTop: '-30px', position: 'relative', zIndex: 10}}>
                <div className="welcome-subtitle">Cyber Forensic Suite</div>
                <h1 className="welcome-title">WhatsApp Audit Tool v3.5</h1>
                <div className="welcome-text">
                  <p style={{marginBottom: '8px'}}>Sistema integral para la gestión, análisis y preservación de evidencia digital.</p>
                  <small style={{opacity: 0.7, fontSize: '13px'}}>Desarrollado por <a href="https://joak1267.github.io/Portafolio-Joa-Tech/index.html" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer'}} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>Joa tech</a></small>
                </div>
            </div>
          </div>
        )}

        {globalSearchMode && (
          <>
            <div className="chat-header" style={{background: '#0f172a'}}>
                <div className="header-info"><h4>🔎 Búsqueda Global</h4><small>Buscando en carpeta seleccionada</small></div>
                <div className="header-tools"><input type="text" className="header-input" placeholder="Buscar en TODOS los chats..." value={globalSearchTerm} onChange={(e) => handleGlobalSearch(e.target.value)} autoFocus style={{width: 300, borderColor: '#38bdf8'}} /></div>
            </div>
            
            <div className="messages-area">
                {globalSearchResults.map((msg) => (
                    <div key={msg.id} style={{opacity: 0.9}}>
                        <div style={{alignSelf: 'center', background: '#1e293b', color: '#94a3b8', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, marginTop: 10}}>
                            📁 Chat Origen: <b>{msg.chat_name}</b>
                        </div>
                        <MessageBubble msg={msg} esMio={false} busqueda={globalSearchTerm} onToggleEvidence={handleToggleEvidence} onTranscribe={handleTranscribir} procesandoAudio={procesandoAudio} transcripciones={transcripciones} />
                    </div>
                ))}
            </div>
          </>
        )}

        {activeChat && (
          <>
            <div className="chat-header">
              <div className="header-info">
                <h4>{activeChat.name.replace(/^Chat de WhatsApp con /i, '')}</h4>
                <small style={{color: '#94a3b8', fontSize: '0.8rem'}}>{busqueda.length > 2 ? `🔍 ${mensajesFiltrados.length} resultados` : `${totalMessages} mensajes en total`}</small>
              </div>
              <div className="header-tools">
                <button className="header-btn btn-primary" onClick={() => setShowGallery(true)}><GalleryIcon /> Galería</button>
                <button className="header-btn btn-pdf" onClick={() => setShowPrintModal(true)}><PdfIcon /> Reporte</button>
                <button className="header-btn btn-primary" onClick={() => setShowStats(true)}><ChartIcon /> Info</button>
                <button className={`header-btn ${modoEvidencia ? 'btn-filter-active' : 'btn-primary'}`} onClick={() => setModoEvidencia(!modoEvidencia)} title={modoEvidencia ? "Ver todo el chat" : "Ver solo evidencias"}><StarIcon filled={modoEvidencia} /> {modoEvidencia ? "Ver Todo" : "Evidencia"}</button>
                <input type="date" className="header-input" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} style={{colorScheme: 'dark', width:'35px'}} />
                <button className={`header-btn ${modoFiltroFecha ? 'btn-filter-active' : 'btn-primary'}`} onClick={() => setModoFiltroFecha(!modoFiltroFecha)}>Día</button>
                <input type="text" className="header-input" placeholder="Buscar..." value={busqueda} onChange={handleLocalSearchChange} />
              </div>
            </div>
            
            <div className="messages-area" id="printable-area" ref={scrollContainerRef}>
              
              {!busqueda && (totalMessages > currentOffset + messages.length) && (
                <div style={{textAlign: 'center', padding: '15px'}}>
                  <button onClick={handleCargarAnteriores} disabled={loadingMsg} style={{background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '8px 25px', borderRadius: 20, cursor: 'pointer', fontSize: '12px'}}>
                    {loadingMsg ? 'Cargando...' : `⬆️ Cargar mensajes anteriores (${totalMessages - (currentOffset + messages.length)} restantes)`}
                  </button>
                </div>
              )}

              {!busqueda && currentOffset > 0 && !loadingMsg && (
                 <div style={{textAlign: 'center', fontSize: '11px', opacity: 0.6, margin: '10px 0'}}>
                    📜 Viendo historial antiguo (Estás en el bloque {currentOffset} - {currentOffset + messages.length})
                 </div>
              )}

              {mensajesFiltrados.length === 0 && modoEvidencia && (
                <div style={{textAlign:'center', padding: 50, color: '#94a3b8'}}><h3>⭐ No hay mensajes marcados como evidencia</h3><p>Haz clic en la estrella de los mensajes para destacarlos.</p></div>
              )}

              {mensajesFiltrados.map((msg, index) => {
                const esMio = ['Yo', 'Me', 'Joaco'].includes(msg.sender_name);
                const fechaActual = formatearFecha(msg.timestamp);
                const fechaAnterior = formatearFecha(mensajesFiltrados[index - 1]?.timestamp);
                
                return (
                  <div key={msg.id} id={`msg-${msg.id}`} style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
                    {fechaActual !== fechaAnterior && <div className="date-separator"><span>{fechaActual}</span></div>}
                    <MessageBubble msg={msg} esMio={esMio} busqueda={busqueda} onToggleEvidence={handleToggleEvidence} onTranscribe={handleTranscribir} procesandoAudio={procesandoAudio} transcripciones={transcripciones} />
                  </div>
                )
              })}
              
              <div ref={chatEndRef}></div>

              {!busqueda && currentOffset > 0 && (
                <div style={{textAlign: 'center', padding: '20px'}}>
                  <button onClick={handleCargarRecientes} disabled={loadingMsg} style={{background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 30px', borderRadius: 25, cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(56,189,248,0.3)'}}>
                    {loadingMsg ? 'Cargando...' : `⬇️ Volver a mensajes recientes`}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export default App;