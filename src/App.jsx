import { useState, useEffect, useRef } from 'react';
import './App.css';
import logoImage from './watsappaudittool.png';
// Componentes Importados
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import Login from './components/Login'; 
import AdminPanel from './components/AdminPanel'; 
import Activation from './components/Activation'; 
import Dashboard from './components/Dashboard'; 
import { GalleryIcon, PdfIcon, ChartIcon, StarIcon } from './components/Icons';
import { FolderSelectModal, CreateFolderModal, StatsModal, GalleryModal, ImportModal } from './components/Modals';

// --- CONFIG ---
const MESSAGES_LIMIT = 2000; 

function App() {
  const [isLicensed, setIsLicensed] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Estados Globales
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [folders, setFolders] = useState([]);
  
  // UI/UX
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null); 

  // Buscadores
  const [busqueda, setBusqueda] = useState(''); 
  const [localSearchResults, setLocalSearchResults] = useState([]); 
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [modoFiltroFecha, setModoFiltroFecha] = useState(false);
  const [modoEvidencia, setModoEvidencia] = useState(false);
  const [globalSearchMode, setGlobalSearchMode] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Modales
  const [activeFolderId, setActiveFolderId] = useState(null); 
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [assignChatId, setAssignChatId] = useState(null);
  const [importingPath, setImportingPath] = useState(null); 
  const [showStats, setShowStats] = useState(false);
  const [showGallery, setShowGallery] = useState(false); 
  const [showHelp, setShowHelp] = useState(false);
  
  // Modales Reporte
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showInvestigatorModal, setShowInvestigatorModal] = useState(false); 
  const [investigatorName, setInvestigatorName] = useState('Investigador Principal'); 

  // Transcripción
  const [transcripciones, setTranscripciones] = useState({});
  const [procesandoAudio, setProcesandoAudio] = useState(null);

  // --- INICIO ---
  useEffect(() => {
    async function verifyLicense() {
      try {
        const status = await window.api.checkLicense();
        setIsLicensed(status.active);
      } catch (e) {
        console.error("Error DRM:", e);
        setIsLicensed(false);
      } finally {
        setTimeout(() => setCheckingLicense(false), 800); 
      }
    }
    verifyLicense();
  }, []);

  useEffect(() => { if (isLicensed && currentUser) cargarDatos(); }, [isLicensed, currentUser]); 

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

  const transformarMensajesSeguros = (msgs) => {
    return msgs.map(msg => {
      if (msg.local_media_path && !msg.local_media_path.startsWith('evidens://')) {
        return { ...msg, local_media_path: `evidens://${msg.local_media_path}` };
      }
      return msg;
    });
  };

  // --- ACCIONES PRINCIPALES ---
  
  // NUEVO: IR AL INICIO (SIN RECARGAR)
  const handleGoHome = () => {
    setActiveChat(null);
    setGlobalSearchMode(false);
    setBusqueda('');
    setActiveFolderId(null);
  };

  // NUEVO: CERRAR SESIÓN
  const handleLogout = () => {
    if(window.confirm("¿Cerrar sesión segura?")) {
      setCurrentUser(null);
      // Opcional: Limpiar estados sensibles
      setActiveChat(null);
      setMessages([]);
    }
  };

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
    setMessages(transformarMensajesSeguros(msgs));
    setLoadingMsg(false);
  };

  const handleCargarAnteriores = async () => {
    if (loadingMsg) return;
    setLoadingMsg(true);
    const newOffset = currentOffset + MESSAGES_LIMIT;
    if (newOffset >= totalMessages) { setLoadingMsg(false); return; }
    const oldMsgs = await window.api.getMessages({ chatId: activeChat.id, offset: newOffset, limit: MESSAGES_LIMIT });
    setMessages(transformarMensajesSeguros(oldMsgs)); 
    setCurrentOffset(newOffset);
    setLoadingMsg(false);
  };

  const handleCargarRecientes = async () => {
    if (loadingMsg || currentOffset === 0) return;
    setLoadingMsg(true);
    let newOffset = currentOffset - MESSAGES_LIMIT;
    if (newOffset < 0) newOffset = 0;
    const newerMsgs = await window.api.getMessages({ chatId: activeChat.id, offset: newOffset, limit: MESSAGES_LIMIT });
    setMessages(transformarMensajesSeguros(newerMsgs)); 
    setCurrentOffset(newOffset);
    setLoadingMsg(false);
  };

  useEffect(() => {
    if (!activeChat) return;
    if (busqueda.length > 2) {
      window.api.searchMessages({ chatId: activeChat.id, term: busqueda }).then(results => setLocalSearchResults(transformarMensajesSeguros(results || [])));
    } else { setLocalSearchResults([]); }
  }, [busqueda, activeChat]);

  const handleLocalSearchChange = (e) => {
      const val = e.target.value;
      setBusqueda(val);
      if (val.length > 0) { setModoEvidencia(false); setModoFiltroFecha(false); }
  };

  const listaMensajesAMostrar = (busqueda.length > 2) ? localSearchResults : messages;
  const mensajesFiltrados = listaMensajesAMostrar.filter(msg => {
    let fecha = true;
    if (modoFiltroFecha && fechaFiltro) {
        const [d, m, y] = msg.timestamp.split(' ')[0].split('/');
        fecha = (`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` === fechaFiltro);
    }
    return fecha && (!modoEvidencia || Boolean(msg.is_evidence));
  });

  const handleGlobalSearch = async (term) => { 
    setGlobalSearchTerm(term); 
    if (!term || term.length < 2) { setGlobalSearchResults([]); return; } 
    const params = { term };
    if (activeFolderId) { params.folderId = activeFolderId; }
    try { const results = await window.api.searchMessages(params); setGlobalSearchResults(transformarMensajesSeguros(results || [])); } 
    catch (error) { setGlobalSearchResults([]); }
  };

  const handleBorrarChat = async (e, chatId) => { 
      e.stopPropagation(); 
      if (window.confirm("🗑️ ¿CONFIRMAR BORRADO PERMANENTE?")) { 
          const res = await window.api.deleteChat(chatId); 
          if (res.success) { if (activeChat?.id === chatId) { setActiveChat(null); setMessages([]); } await cargarDatos(); } 
          else { alert("Error: " + res.error); }
      } 
  };

  const handleReset = async () => { 
      if (window.confirm("⚠️ PELIGRO: ¿Vaciar TODA la base de datos?")) { 
          await window.api.resetDatabase(); 
          setChats([]); setMessages([]); setActiveChat(null); setFolders([]); 
          alert("✅ Base de datos vaciada."); 
      } 
  };

  const handleTranscribir = async (msgId, filePath) => { 
    if (transcripciones[msgId]) return; 
    setProcesandoAudio(msgId); 
    const cleanPath = filePath.replace('evidens://', '');
    const result = await window.api.transcribeAudio(cleanPath); 
    if (result.success) setTranscripciones(prev => ({ ...prev, [msgId]: result.text })); 
    else alert("Error IA: " + result.error); 
    setProcesandoAudio(null); 
  };

  const handleToggleEvidence = async (msgId) => { 
    await window.api.toggleEvidence(msgId); 
    const updater = (lista) => lista.map(msg => msg.id === msgId ? { ...msg, is_evidence: msg.is_evidence ? 0 : 1 } : msg);
    if (globalSearchMode) { setGlobalSearchResults(prev => updater(prev)); } else { setMessages(prev => updater(prev)); setLocalSearchResults(prev => updater(prev)); }
  };

  const iniciarProcesoReporte = () => { setShowPrintModal(false); setShowInvestigatorModal(true); };
  const confirmarGenerarReporte = async () => {
    if (!activeChat) return;
    setShowInvestigatorModal(false); setLoadingMsg(true); 
    try {
      const result = await window.api.generateReport({ chatId: activeChat.id, caseInfo: { investigator: investigatorName } });
      if (result.success) { alert(`✅ REPORTE GENERADO:\n📂 ${result.path}`); } else if (!result.cancelled) { alert(`❌ Error: ${result.error}`); }
    } catch (error) { alert("⚠️ Error."); } finally { setLoadingMsg(false); }
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
            timeStats.hours[dateObj.getHours()]++; timeStats.weekDays[dateObj.getDay()]++; timeStats.months[dateObj.getMonth()]++; const year = dateObj.getFullYear(); timeStats.years[year] = (timeStats.years[year] || 0) + 1;
        }
      } catch (e) {}
    });
    const userRanking = Object.entries(userStats).sort(([,a], [,b]) => b - a);
    return { userRanking, maxMsgs: userRanking[0] ? userRanking[0][1] : 1, timeStats };
  };

  const formatearFecha = (f) => f ? f.split(' ')[0] : '';

  // --- RENDERIZADO CONDICIONAL ---

  if (checkingLicense) {
    return (
      <div style={{height:'100vh', width:'100vw', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', color:'#38bdf8', fontFamily:'monospace', flexDirection:'column', gap:'10px'}}>
        <div style={{width:'30px', height:'30px', border:'3px solid #1e293b', borderTopColor:'#38bdf8', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
        <div style={{fontSize:'12px', letterSpacing:'2px'}}>SYSTEM_BOOT_SEQUENCE...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isLicensed) return <Activation onActivationSuccess={() => setIsLicensed(true)} />;
  if (!currentUser) return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  if (showAdminPanel) return <AdminPanel onClose={() => setShowAdminPanel(false)} />;

  // APP PRINCIPAL
  return (
    <div className="app-container">
      {/* Footer Operador */}
      <div style={{position:'absolute', bottom:5, right:20, zIndex:50, fontSize:9, color:'#475569', pointerEvents:'none'}}>
        OPERADOR: {currentUser.username.toUpperCase()} | ROLE: {currentUser.role.toUpperCase()}
      </div>

      {importingPath && (
        <ImportModal 
          folders={folders} 
          onClose={() => setImportingPath(null)} 
          onTriggerCreateFolder={() => { setShowFolderModal(true); }}
          onConfirm={async (tid) => { 
             const res = await window.api.processImport({ folderPath: importingPath, targetFolderId: tid }); 
             if(res.success) { alert(`✅ Chat importado.\n🔐 Hash SHA-256: ${res.hash ? 'OK' : 'N/A'}`); cargarDatos(); } 
             else { alert("Error: " + res.error); }
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'900px', height: '85vh', display:'flex', flexDirection:'column', background:'#0f172a', border:'1px solid #334155'}}>
            
            {/* Header del Manual */}
            <div className="gallery-header" style={{background:'#1e293b', borderBottom:'1px solid #334155'}}>
              <h2 style={{display:'flex', alignItems:'center', gap:'10px'}}>
                📘 Manual de Operaciones <span style={{fontSize:'12px', background:'#38bdf8', color:'#0f172a', padding:'2px 8px', borderRadius:'4px'}}>v4.0 Enterprise</span>
              </h2>
              <button className="header-btn" onClick={() => setShowHelp(false)}>✕</button>
            </div>

            {/* Cuerpo del Manual */}
            <div className="gallery-body" style={{padding: '40px', overflowY: 'auto', textAlign:'left', lineHeight:'1.7', color:'#cbd5e1', fontFamily:"'Inter', sans-serif"}}>
              
              <section style={{marginBottom:'40px'}}>
                <h3 style={{color:'#38bdf8', borderBottom:'1px solid #334155', paddingBottom:'10px'}}>1. Ingesta y Preservación de Datos</h3>
                <p>El proceso de importación garantiza la integridad de la evidencia digital desde el primer momento.</p>
                <ul style={{listStyle:'none', padding:0, marginTop:'15px'}}>
                  <li style={{marginBottom:'10px'}}>📥 <strong>Importación:</strong> Utilice el botón <em>"Importar Carpeta"</em> en el menú lateral. Seleccione la carpeta raíz que contiene los archivos de texto y multimedia del chat de WhatsApp exportado.</li>
                  <li style={{marginBottom:'10px'}}>🔐 <strong>Validación de Integridad (Hashing):</strong> Al importar, el sistema calcula automáticamente el <strong>Hash SHA-256</strong> de los archivos fuente. Este hash es inmutable y se imprimirá en los reportes finales para garantizar la cadena de custodia.</li>
                </ul>
              </section>

              <section style={{marginBottom:'40px'}}>
                <h3 style={{color:'#38bdf8', borderBottom:'1px solid #334155', paddingBottom:'10px'}}>2. Herramientas de Análisis Forense</h3>
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'20px'}}>
                  <div style={{background:'#1e293b', padding:'15px', borderRadius:'8px'}}>
                    <h4 style={{color:'#f8fafc', margin:'0 0 10px 0'}}>⭐ Etiquetado de Evidencia</h4>
                    <p style={{fontSize:'13px'}}>Marque mensajes críticos haciendo clic en el icono de estrella. Use el filtro <strong>"Solo Evidencia"</strong> en la barra superior para aislar estos elementos del ruido de la conversación.</p>
                  </div>
                  <div style={{background:'#1e293b', padding:'15px', borderRadius:'8px'}}>
                    <h4 style={{color:'#f8fafc', margin:'0 0 10px 0'}}>🔍 Búsqueda Global</h4>
                    <p style={{fontSize:'13px'}}>Utilice la lupa en el Dashboard principal para buscar palabras clave (ej: "dinero", "droga", "encuentro") a través de <strong>todos los casos y chats</strong> simultáneamente.</p>
                  </div>
                  <div style={{background:'#1e293b', padding:'15px', borderRadius:'8px'}}>
                    <h4 style={{color:'#f8fafc', margin:'0 0 10px 0'}}>🎙️ Transcripción Offline (IA)</h4>
                    <p style={{fontSize:'13px'}}>Los audios pueden ser procesados localmente. Haga clic en el botón <em>"Transcribir"</em> en la burbuja de audio. El texto resultante es indexable en las búsquedas.</p>
                  </div>
                  <div style={{background:'#1e293b', padding:'15px', borderRadius:'8px'}}>
                    <h4 style={{color:'#f8fafc', margin:'0 0 10px 0'}}>📊 Estadísticas de Comportamiento</h4>
                    <p style={{fontSize:'13px'}}>El botón <em>"Info"</em> genera gráficos de actividad: horas pico de mensajes, días más activos y ranking de participantes.</p>
                  </div>
                </div>
              </section>

              <section style={{marginBottom:'40px'}}>
                <h3 style={{color:'#38bdf8', borderBottom:'1px solid #334155', paddingBottom:'10px'}}>3. Generación de Reportes Periciales</h3>
                <p>eVidensTalk genera documentos listos para ser presentados en fiscalía o juzgados.</p>
                <ol style={{paddingLeft:'20px', color:'#94a3b8'}}>
                  <li style={{marginBottom:'8px'}}>Seleccione el chat objetivo.</li>
                  <li style={{marginBottom:'8px'}}>Haga clic en el botón <strong>Reporte (PDF)</strong>.</li>
                  <li style={{marginBottom:'8px'}}>Complete el formulario de <strong>Cadena de Custodia</strong> con el nombre del Perito Informático o Investigador a cargo.</li>
                  <li>El sistema generará un PDF sellado digitalmente que incluye:
                    <ul style={{marginTop:'5px', color:'#cbd5e1'}}>
                      <li>• Hash SHA-256 de la evidencia original.</li>
                      <li>• Logs de auditoría (quién accedió y cuándo).</li>
                      <li>• Transcripción secuencial de los mensajes seleccionados.</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section>
                <h3 style={{color:'#ef4444', borderBottom:'1px solid #334155', paddingBottom:'10px'}}>⚠️ Zona de Peligro & Auditoría</h3>
                <p>Todas las acciones sensibles (borrado de chats, exportación de reportes, logins) quedan registradas en el <strong>Log de Auditoría</strong> interno, accesible solo por el Administrador.</p>
                <p style={{fontSize:'13px', background:'rgba(239, 68, 68, 0.1)', padding:'10px', borderRadius:'6px', border:'1px solid rgba(239, 68, 68, 0.2)'}}>
                  <strong>Nota Importante:</strong> El borrado de un chat es definitivo y elimina tanto los metadatos de la base de datos como las referencias a los archivos.
                </p>
              </section>

            </div>
          </div>
        </div>
      )}
      
      {showPrintModal && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '450px', textAlign: 'center'}}>
            <div className="gallery-header"><h3>🖨️ Generar Reporte</h3><button className="header-btn" onClick={() => setShowPrintModal(false)}>✕</button></div>
            <div style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 10}}>
              <button className="btn-action header-btn" style={{justifyContent: 'center', padding: 20, background: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8'}} 
                onClick={iniciarProcesoReporte}> 
                <span style={{fontSize:'16px'}}>📄 REPORTE PDF CERTIFICADO</span>
                <span style={{fontSize:'10px', opacity:0.7, color:'#cbd5e1'}}>Hash SHA-256 + Auditoría</span>
              </button>
              <div style={{height: '1px', background: '#334155', margin: '10px 0'}}></div>
              <button className="btn-action header-btn" style={{justifyContent: 'center', padding: 15, background: '#334155'}} onClick={() => { setModoEvidencia(false); setModoFiltroFecha(false); setBusqueda(''); setTimeout(() => { window.print(); setShowPrintModal(false); }, 300); }}>
                🖨️ Impresión Simple (Borrador)
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvestigatorModal && (
        <div className="modal-overlay" onClick={() => setShowInvestigatorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '400px'}}>
             <div className="gallery-header"><h3>👮 Cadena de Custodia</h3></div>
             <div style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <label style={{fontSize: '12px', color: '#94a3b8'}}>Nombre del Investigador / Perito:</label>
                <input type="text" autoFocus value={investigatorName} onChange={(e) => setInvestigatorName(e.target.value)}
                  style={{padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', fontSize: '14px'}}
                />
                <button onClick={confirmarGenerarReporte} className="btn-action header-btn" style={{background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', justifyContent: 'center'}}>GENERAR DOCUMENTO</button>
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
        
        isAdmin={currentUser.role === 'admin'}
        onOpenAdmin={() => setShowAdminPanel(true)}
        
        // --- PROPS NUEVAS PARA EL LOGO Y LOGOUT ---
        onGoHome={handleGoHome}
        onLogout={handleLogout}
      />

      <div className="chat-window">
        {!activeChat && !globalSearchMode && (
          <Dashboard 
            user={currentUser}
            stats={{ chats: chats.length, messages: '—' }} 
            recents={chats.slice(0, 10)}
            onImport={async () => { const p = await window.api.selectFolderPath(); if(p) setImportingPath(p); }}
            onCreateFolder={() => setShowFolderModal(true)}
            onSearch={() => { setGlobalSearchMode(true); setActiveChat(null); setGlobalSearchResults([]); }}
            onOpenChat={(chat) => handleChatClick(chat)}
          />
        )}

        {globalSearchMode && (
          <>
            <div className="chat-header" style={{background: '#0f172a'}}>
                <div className="header-info"><h4>🔎 Búsqueda Global</h4></div>
                <div className="header-tools"><input type="text" className="header-input" placeholder="Buscar..." value={globalSearchTerm} onChange={(e) => handleGlobalSearch(e.target.value)} autoFocus style={{width: 300}} /></div>
            </div>
            <div className="messages-area">
                {globalSearchResults.map((msg) => (
                    <div key={msg.id}>
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
                <div style={{display:'flex', gap:10, alignItems:'center'}}>
                   <small style={{color: '#94a3b8', fontSize: '0.8rem'}}>{busqueda.length > 2 ? `🔍 ${mensajesFiltrados.length}` : `${totalMessages} msgs`}</small>
                   {activeChat.source_hash && (
                     <span title={`Hash: ${activeChat.source_hash}`} style={{fontSize:'0.7rem', background:'rgba(16, 185, 129, 0.2)', color:'#34d399', padding:'2px 6px', borderRadius:4}}>
                       🔐 Verificado
                     </span>
                   )}
                </div>
              </div>
              <div className="header-tools">
                <button className="header-btn btn-primary" onClick={() => setShowGallery(true)}><GalleryIcon /> Galería</button>
                <button className="header-btn btn-pdf" onClick={() => setShowPrintModal(true)}><PdfIcon /> Reporte</button>
                <button className="header-btn btn-primary" onClick={() => setShowStats(true)}><ChartIcon /> Info</button>
                <button className={`header-btn ${modoEvidencia ? 'btn-filter-active' : 'btn-primary'}`} onClick={() => setModoEvidencia(!modoEvidencia)}><StarIcon filled={modoEvidencia} /> {modoEvidencia ? "Ver Todo" : "Evidencia"}</button>
                <input type="date" className="header-input" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} style={{colorScheme: 'dark', width:'35px'}} />
                <button className={`header-btn ${modoFiltroFecha ? 'btn-filter-active' : 'btn-primary'}`} onClick={() => setModoFiltroFecha(!modoFiltroFecha)}>Día</button>
                <input type="text" className="header-input" placeholder="Buscar..." value={busqueda} onChange={handleLocalSearchChange} />
              </div>
            </div>
            
            <div className="messages-area" id="printable-area" ref={scrollContainerRef}>
              {!busqueda && (totalMessages > currentOffset + messages.length) && (
                <div style={{textAlign: 'center', padding: '15px'}}>
                  <button onClick={handleCargarAnteriores} disabled={loadingMsg} style={{background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '8px 25px', borderRadius: 20, cursor: 'pointer', fontSize: '12px'}}>
                    {loadingMsg ? 'Cargando...' : `⬇️ Cargar anteriores`}
                  </button>
                </div>
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
                  <button onClick={handleCargarRecientes} disabled={loadingMsg} style={{background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 30px', borderRadius: 25, cursor: 'pointer', fontWeight: 'bold'}}>
                    {loadingMsg ? 'Cargando...' : `⬇️ Volver a recientes`}
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