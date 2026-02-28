import { useState, useEffect, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso'; 
import './App.css';
import logoImage from './watsappaudittool.png';

// 🔥 IMPORTACIÓN DIRECTA DE SUPABASE PARA LA NUBE 🔥
import { supabase } from './supabase'; 

import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import Login from './components/Login'; 
import AdminPanel from './components/AdminPanel'; 
import Activation from './components/Activation'; 
import Dashboard from './components/Dashboard'; 
import { GalleryIcon, PdfIcon, ChartIcon, StarIcon } from './components/Icons';
import { FolderSelectModal, CreateFolderModal, StatsModal, GalleryModal, ImportModal } from './components/Modals';
import { getPlanFeatures } from './permissions';

const MESSAGES_LIMIT = 2000; 

// 🔥 GENERADOR CRIPTOGRÁFICO DE CONTRASEÑAS CORPORATIVAS 🔥
const generateSecureCorporatePassword = () => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomValues = new Uint32Array(8);
  window.crypto.getRandomValues(randomValues);
  
  let block1 = "";
  let block2 = "";
  
  for (let i = 0; i < 4; i++) {
    block1 += charset[randomValues[i] % charset.length];
    block2 += charset[randomValues[i + 4] % charset.length];
  }
  
  return `EVIDENS-${block1}-${block2}`;
};

function App() {
  const [isLicensed, setIsLicensed] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const virtuosoRef = useRef(null);

  // 🔥 ESTADO PARA MANEJAR LA INVITACIÓN ENTRANTE 🔥
  const [pendingInvite, setPendingInvite] = useState(null);

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [folders, setFolders] = useState([]);
  
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);

  const [loadingMsg, setLoadingMsg] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  const [busqueda, setBusqueda] = useState(''); 
  const [localSearchResults, setLocalSearchResults] = useState([]); 
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [modoFiltroFecha, setModoFiltroFecha] = useState(false);
  const [modoEvidencia, setModoEvidencia] = useState(false);
  const [globalSearchMode, setGlobalSearchMode] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const [activeFolderId, setActiveFolderId] = useState(null); 
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [creatingParentId, setCreatingParentId] = useState(null); 
  const [assignChatId, setAssignChatId] = useState(null);
  const [importingPath, setImportingPath] = useState(null); 
  
  const [pendingDragItem, setPendingDragItem] = useState(null);
  
  const [showGallery, setShowGallery] = useState(false); 
  const [galleryData, setGalleryData] = useState({ media: [] });
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [showProfileMode, setShowProfileMode] = useState(false);
  const [agencyProfile, setAgencyProfile] = useState({ name: 'Departamento de Investigaciones', logoPath: null });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showInvestigatorModal, setShowInvestigatorModal] = useState(false); 
  const [investigatorName, setInvestigatorName] = useState('Investigador Principal'); 
  const [exportConfig, setExportConfig] = useState({
    mode: 'all', 
    singleDate: '',
    startDate: '',
    endDate: '',
    keyword: '',
    caseNumber: ''
  });

  const [transcripciones, setTranscripciones] = useState({});
  const [procesandoAudio, setProcesandoAudio] = useState(null);

  const userPlan = currentUser?.role === 'admin' ? 'institucional' : (currentUser?.plan || 'comunidad');
  const features = getPlanFeatures(userPlan);
  const isComunidad = userPlan === 'comunidad';

  // 🔥 DETECCIÓN EXACTA DE TIPO DE CUENTA (Roles y Permisos) 🔥
  const isInstitucional = userPlan === 'institucional';
  const isSubcuenta = isInstitucional && Boolean(currentUser?.parent_id);
  const isPropietario = isInstitucional && !isSubcuenta;

  // 🔥 ESTADOS PARA GESTIÓN DE EQUIPO INSTITUCIONAL 🔥
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(false);

  // 🔥 ESTADOS PARA SEGURIDAD DE ACCESO (CAMBIO DE CLAVE AUTOMÁTICO) 🔥
  const [currentPassword, setCurrentPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const handleGeneratePassword = () => {
    const newPass = generateSecureCorporatePassword();
    setGeneratedPassword(newPass);
    setShowPassword(true); 
    navigator.clipboard.writeText(newPass);
    alert("Nueva clave generada y copiada al portapapeles con éxito.");
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      return alert("Debe ingresar su clave actual para autorizar el cambio.");
    }
    if (!generatedPassword || generatedPassword.length < 17 || !generatedPassword.startsWith("EVIDENS-")) {
      return alert("Por favor, genere una clave segura haciendo clic en el botón.");
    }

    setIsUpdatingPass(true);
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('password')
        .eq('email', currentUser.username)
        .single();

      if (fetchError || !userData) {
        throw new Error("No se pudo verificar la credencial en la base de datos.");
      }

      if (userData.password !== currentPassword) {
        throw new Error("La contraseña actual ingresada es incorrecta.");
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: generatedPassword })
        .eq('email', currentUser.username);

      if (updateError) {
        throw new Error("Bloqueo de permisos en la tabla: " + updateError.message);
      }

      await supabase.auth.updateUser({ password: generatedPassword }).catch(() => {});

      alert("Su clave de acceso ha sido actualizada correctamente en el sistema.");
      setGeneratedPassword('');
      setCurrentPassword('');
      setShowPassword(false);
    } catch (error) {
      alert("Error del sistema: \n" + error.message);
    } finally {
      setIsUpdatingPass(false);
    }
  };

 useEffect(() => {
    async function verifyLicense() {
      try {
        const status = await window.api.checkLicense();
        setIsLicensed(status.active);
      } catch (e) {
        setIsLicensed(false);
      } finally {
        setTimeout(() => setCheckingLicense(false), 800); 
      }
    }
    verifyLicense();
  }, []);

  // 🔥 SOLUCIÓN 1: Dependencia corregida (escucha solo el texto del email, no el objeto completo)
  useEffect(() => { 
    if (isLicensed && currentUser?.username) {
      cargarDatos(); 
      chequearInvitacionesPendientes(); 
    }
  }, [isLicensed, currentUser?.username]); 

  // 🔥 SOLUCIÓN 2: Función con Anti-Bucle incorporado
  const chequearInvitacionesPendientes = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('parent_id, invitation_status, plan')
        .eq('email', currentUser.username)
        .maybeSingle(); 

      if (data && !error) {
        
        // Validación inteligente para cortar el bucle infinito
        setCurrentUser(prev => {
          const nuevoPlan = data.plan || prev.plan;
          
          // Si los datos de Supabase son iguales a los que ya tenemos, le decimos a React que NO haga nada
          if (prev.plan === nuevoPlan && prev.parent_id === data.parent_id) {
            return prev; 
          }
          
          // Solo si hay cambios reales, actualizamos el estado
          return {
            ...prev, 
            plan: nuevoPlan,
            parent_id: data.parent_id
          };
        });

        if (data.invitation_status === 'pending' && data.parent_id) {
          setPendingInvite(data.parent_id);
        }
      }
    } catch (e) { console.error("Error en sincronización Supabase:", e); }
  };
  
  const cargarDatos = async () => {
    try {
      const listaChats = await window.api.getChats();
      const listaFolders = await window.api.getFolders();
      const listaReportes = await window.api.getReports(); 
      setChats(listaChats || []);
      setFolders(listaFolders || []);
      setReports(listaReportes || []);

      if (window.api.getAgencyProfile) {
        const profile = await window.api.getAgencyProfile();
        if (profile) setAgencyProfile(profile);
      }
    } catch(e) { console.error(e); }
  };

  const cargarEquipo = async () => {
    if (!currentUser || userPlan !== 'institucional') return;
    setLoadingTeam(true);
    try {
      const adminEmail = currentUser.username;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('parent_id', adminEmail);
      
      if (data && !error) {
        setTeamMembers(data.map(u => ({ 
          id: u.id, 
          username: u.email, 
          role: 'analista', 
          is_active: u.is_active !== false,
          invitation_status: u.invitation_status || 'none',
          hwid: u.hwid || 'Desconocido'
        })));
      }
    } catch (e) { console.error(e); }
    setLoadingTeam(false);
  };

  useEffect(() => {
    if (showProfileMode && userPlan === 'institucional') {
      cargarEquipo();
    }
  }, [showProfileMode, userPlan, currentUser]);

  const transformarMensajesSeguros = (msgs) => {
    return msgs.map(msg => {
      if (msg.local_media_path && !msg.local_media_path.startsWith('evidens://')) {
        return { ...msg, local_media_path: `evidens://${msg.local_media_path}` };
      }
      return msg;
    });
  };

  const handleGoHome = () => {
    setActiveChat(null);
    setGlobalSearchMode(false);
    setBusqueda('');
    setActiveFolderId(null);
    setActiveReport(null); 
    setShowProfileMode(false); 
  };

  const handleLogout = () => {
    if(window.confirm("¿Está seguro que desea cerrar su sesión actual?")) {
      setCurrentUser(null);
      setActiveChat(null);
      setMessages([]);
      setActiveReport(null);
      setShowProfileMode(false);
    }
  };

  const handleReportSelect = (rep) => {
    setActiveChat(null);
    setGlobalSearchMode(false);
    setShowProfileMode(false); 
    setActiveReport(rep);
  };

  const handleDeleteReport = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("¿Está seguro que desea remover este reporte del historial?\n\nEl archivo PDF físico permanecerá en su disco duro.")) {
      await window.api.deleteReportRecord(id);
      cargarDatos();
      if (activeReport?.id === id) setActiveReport(null);
    }
  };

  const handleChatClick = async (chat) => {
    setActiveChat(chat); 
    setGlobalSearchMode(false); 
    setActiveReport(null); 
    setShowProfileMode(false); 
    setBusqueda(''); 
    setFechaFiltro('');
    setModoFiltroFecha(false);
    setModoEvidencia(false);
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
    
    if (newOffset >= totalMessages) { 
      setLoadingMsg(false); 
      return; 
    }
    
    const oldMsgs = await window.api.getMessages({ chatId: activeChat.id, offset: newOffset, limit: MESSAGES_LIMIT });
    const procesados = transformarMensajesSeguros(oldMsgs);
    
    setMessages(prev => [...procesados, ...prev]); 
    setCurrentOffset(newOffset);
    setLoadingMsg(false);
  };

  useEffect(() => {
    if (!activeChat) return;
    if (busqueda.length > 2) {
      window.api.searchMessages({ chatId: activeChat.id, term: busqueda })
        .then(results => setLocalSearchResults(transformarMensajesSeguros(results || [])));
    } else { 
      setLocalSearchResults([]); 
    }
  }, [busqueda, activeChat]);

  const handleLocalSearchChange = (e) => {
      const val = e.target.value;
      setBusqueda(val);
      if (val.length > 0) { 
        setModoEvidencia(false); 
        setModoFiltroFecha(false); 
      }
  };

  const mensajesFiltrados = useMemo(() => {
    const listaMensajesAMostrar = (busqueda.length > 2) ? localSearchResults : messages;
    return listaMensajesAMostrar.filter(msg => {
      let fecha = true;
      if (modoFiltroFecha && fechaFiltro) {
          const [d, m, y] = msg.timestamp.split(' ')[0].split('/');
          fecha = (`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` === fechaFiltro);
      }
      return fecha && (!modoEvidencia || Boolean(msg.is_evidence));
    });
  }, [busqueda, localSearchResults, messages, modoFiltroFecha, fechaFiltro, modoEvidencia]);

  const handleGlobalSearch = async (term) => { 
    setGlobalSearchTerm(term); 
    if (!term || term.length < 2) { 
      setGlobalSearchResults([]); 
      return; 
    } 
    const params = { term };
    if (activeFolderId) { params.folderId = activeFolderId; }
    
    try { 
      const results = await window.api.searchMessages(params); 
      setGlobalSearchResults(transformarMensajesSeguros(results || [])); 
    } catch (error) { 
      setGlobalSearchResults([]); 
    }
  };

  const handleBorrarChat = async (e, chatId) => { 
      e.stopPropagation(); 
      if (window.confirm("¿Está seguro que desea eliminar PERMANENTEMENTE este expediente digital?")) { 
          const res = await window.api.deleteChat(chatId); 
          if (res.success) { 
            if (activeChat?.id === chatId) { 
              setActiveChat(null); 
              setMessages([]); 
            } 
            await cargarDatos(); 
          } else { 
            alert("Error: " + res.error); 
          }
      } 
  };

  const handleMoveChat = async (chatId, folderId) => {
    try {
      if (window.api.invoke) {
        await window.api.invoke('move-chat-to-folder', { chatId, folderId });
        cargarDatos();
      }
    } catch (err) { console.error(err); }
  };

  const handleMoveFolder = async (folderId, targetParentId) => {
    if (userPlan === 'comunidad' && targetParentId !== null) {
      alert("La organización en subcarpetas requiere Licencia Pericial o Institucional.");
      return;
    }
    try {
      if (window.api.invoke) {
        await window.api.invoke('move-folder', { folderId, targetParentId });
        cargarDatos();
      }
    } catch (err) { console.error(err); }
  };

  const handleReset = async () => { 
      if (window.confirm("ATENCIÓN: Está a punto de vaciar completamente la base de datos local. ¿Desea continuar?")) { 
          await window.api.resetDatabase(); 
          setChats([]); 
          setMessages([]); 
          setActiveChat(null); 
          setFolders([]); 
          setReports([]);
          alert("Base de datos local formateada correctamente."); 
      } 
  };

  const handleTranscribir = async (msgId, filePath) => { 
    if (!features.canTranscribe) {
      alert("Función de Transcripción con IA Restringida. Requiere plan Pericial o Institucional.");
      return;
    }

    if (transcripciones[msgId]) return; 
    setProcesandoAudio(msgId); 
    const cleanPath = filePath.replace('evidens://', '');
    const result = await window.api.transcribeAudio(cleanPath); 
    
    if (result.success) {
      setTranscripciones(prev => ({ ...prev, [msgId]: result.text })); 
    } else {
      alert("Error en el motor de IA: " + result.error); 
    }
    setProcesandoAudio(null); 
  };

  const handleToggleEvidence = async (msgId) => { 
    await window.api.toggleEvidence(msgId); 
    const updater = (lista) => lista.map(msg => msg.id === msgId ? { ...msg, is_evidence: msg.is_evidence ? 0 : 1 } : msg);
    if (globalSearchMode) { 
      setGlobalSearchResults(prev => updater(prev)); 
    } else { 
      setMessages(prev => updater(prev)); 
      setLocalSearchResults(prev => updater(prev)); 
    }
  };

  const handleOpenGallery = async () => {
    setLoadingGallery(true);
    setShowGallery(true);
    try {
      if (window.api.getChatMedia || window.api.invoke) {
        const rawMedia = window.api.invoke 
          ? await window.api.invoke('get-chat-media', activeChat.id) 
          : await window.api.getChatMedia(activeChat.id);
        setGalleryData({ media: transformarMensajesSeguros(rawMedia) });
      } else {
        throw new Error("No IPC route");
      }
    } catch (err) {
      const fallbackMedia = messages.filter(m => ['image', 'video'].includes(m.media_type) && m.local_media_path);
      setGalleryData({ media: fallbackMedia });
    }
    setLoadingGallery(false);
  };

  const handleGoToMessage = (msg) => {
    setShowGallery(false); 
    setBusqueda(''); 
    
    // APAGAMOS los filtros visuales explícitamente para no mezclar funciones
    setModoFiltroFecha(false); 
    setModoEvidencia(false);

    // Le damos a React 100ms para limpiar la UI y luego hacemos el SCROLL suave
    setTimeout(() => {
      if (virtuosoRef.current) {
         // Buscamos en qué posición (índice) de la lista actual está el mensaje
         const index = mensajesFiltrados.findIndex(m => m.id === msg.id);
         
         if (index !== -1) {
            // Hacemos que la lista viaje hasta ese mensaje y lo centre en la pantalla
            virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
         } else {
            alert("El mensaje está muy atrás en el historial. Usa 'Cargar historial de red' primero para traerlo a la memoria.");
         }
      }
    }, 100);
  };

  const iniciarProcesoReporte = () => { 
    setShowPrintModal(false); 
    setShowInvestigatorModal(true); 
  };

  const confirmarGenerarReporte = async () => {
    if (!activeChat) return;

    if (isComunidad && !['all', 'evidence'].includes(exportConfig.mode)) {
       alert("Las funciones avanzadas de filtrado forense requieren Licencia PRO.");
       return;
    }

    try {
      const result = await window.api.generateReport({ 
        chatId: activeChat.id, 
        caseInfo: { 
          investigator: investigatorName,
          caseNumber: exportConfig.caseNumber,
          mode: exportConfig.mode,
          singleDate: exportConfig.singleDate,
          startDate: exportConfig.startDate,
          endDate: exportConfig.endDate,
          keyword: exportConfig.keyword,
          agencyProfile: agencyProfile,
          userPlan: userPlan,
          transcripciones: transcripciones 
        } 
      });

      if (result.cancelled) return;

      if (result.empty) {
        alert("Aviso del Sistema:\n\n" + result.error);
        return; 
      }

      setShowInvestigatorModal(false); 

      if (result.success) {
        alert("Dictamen Pericial emitido y guardado exitosamente.");
        cargarDatos(); 
      } else {
        alert("Fallo al compilar el documento PDF:\n" + result.error);
      }
    } catch (err) {
      alert("Error crítico del sistema al intentar procesar el PDF:\n" + err.message);
    }
  };

  const handleCreateSubfolderRequest = (parentId) => {
    if (!features.canCreateSubfolders) {
      alert("La organización jerárquica en subcarpetas requiere Licencia Pericial o Institucional.");
      return;
    }
    setCreatingParentId(parentId); 
    setShowFolderModal(true);
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

  if (checkingLicense) {
    return (
      <div style={{height:'100vh', width:'100vw', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', color:'#38bdf8', fontFamily:'monospace', flexDirection:'column', gap:'10px'}}>
        <div style={{width:'30px', height:'30px', border:'3px solid #1e293b', borderTopColor:'#38bdf8', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
        <div style={{fontSize:'12px', letterSpacing:'2px'}}>INICIANDO SISTEMA...</div>
      </div>
    );
  }

  if (!isLicensed) return <Activation onActivationSuccess={() => setIsLicensed(true)} />;
  if (!currentUser) return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  if (showAdminPanel) return <AdminPanel onClose={() => setShowAdminPanel(false)} />;

  return (
    <div className="app-container">

      {/* ESTILOS INYECTADOS PARA EL PANEL PREMIUM (No tocar) */}
      <style>{`
        .premium-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .premium-input { background: #0f172a; border: 1px solid #334155; color: #f8fafc; transition: all 0.2s; outline: none; box-sizing: border-box; }
        .premium-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15); }
        .premium-btn-primary { background: #0ea5e9; color: white; transition: all 0.2s; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .premium-btn-primary:hover:not(:disabled) { background: #0284c7; }
        .premium-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .premium-btn-ghost { color: #94a3b8; background: transparent; border: 1px solid transparent; transition: all 0.2s; cursor: pointer; font-weight: 500; }
        .premium-btn-ghost:hover { color: #f8fafc; background: rgba(255,255,255,0.05); }
        .premium-btn-danger { color: #ef4444; background: transparent; border: 1px solid rgba(239,68,68,0.3); transition: all 0.2s; cursor: pointer; }
        .premium-btn-danger:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; }
        .dropzone-area { border: 2px dashed #475569; border-radius: 8px; transition: all 0.2s; background: rgba(15, 23, 42, 0.4); cursor: pointer; display: flex; align-items: center; gap: 20px; padding: 24px; }
        .dropzone-area:hover { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.05); }
        .premium-table { width: 100%; border-collapse: collapse; text-align: left; }
        .premium-table th { padding: 14px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; color: #64748b; border-bottom: 1px solid #334155; }
        .premium-table td { padding: 16px 20px; font-size: 13px; color: #e2e8f0; border-bottom: 1px solid #1e293b; transition: background 0.2s; }
        .premium-table tr:hover td { background: rgba(255,255,255,0.02); }
        .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid transparent; }
        .badge-success { background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.2); }
        .badge-warning { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.2); }
        .badge-danger { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); }
        .hwid-cell { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11.5px; color: #94a3b8; background: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #334155; word-break: break-all; display: inline-block; cursor: pointer; transition: all 0.2s; position: relative; }
        .hwid-cell:hover { color: #f8fafc; border-color: #64748b; }
      `}</style>

      {/* 🔥 MODAL DE INVITACIÓN ENTRANTE 🔥 */}
      {pendingInvite && (
        <div className="modal-overlay" style={{zIndex: 9999, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)'}}>
          <div className="premium-card" style={{maxWidth: '480px', textAlign: 'center', padding: '40px', borderColor: '#0ea5e9'}}>
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '24px'}}>
              <div style={{width: 64, height: 64, borderRadius: '16px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
            </div>
            <h2 style={{color: '#f8fafc', fontSize: '20px', fontWeight: '700', marginBottom: '16px'}}>Autorización Requerida</h2>
            <p style={{color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px'}}>
              El administrador institucional <b>{pendingInvite}</b> ha solicitado vincular esta cuenta a su Agencia.<br/><br/>
              Al autorizar la vinculación, se actualizará su licencia y se registrará la huella digital de este equipo (HWID) por motivos de auditoría.
            </p>
            <div style={{display: 'flex', gap: '16px', justifyContent: 'center'}}>
              <button className="premium-btn-ghost" style={{padding: '10px 24px', borderRadius: '8px'}} onClick={async () => {
                try { await supabase.from('users').update({ parent_id: null, invitation_status: 'none', hwid: null }).eq('email', currentUser.username); setPendingInvite(null); } catch(e) {}
              }}>Rechazar</button>
              <button className="premium-btn-primary" style={{padding: '10px 24px', borderRadius: '8px'}} onClick={async () => {
                try {
                  const hwid = await window.api.invoke('license-get-hwid');
                  const { error } = await supabase.from('users').update({ plan: 'institucional', invitation_status: 'accepted', hwid: hwid || 'HWID-No-Disponible' }).eq('email', currentUser.username);
                  if(!error){ alert("Vinculación Institucional completada exitosamente."); setCurrentUser(prev => ({...prev, plan: 'institucional', parent_id: pendingInvite})); setPendingInvite(null); } else { alert("Error de sistema: " + error.message); }
                } catch(e) {}
              }}>Autorizar Vinculación</button>
            </div>
          </div>
        </div>
      )}

      <div style={{position:'absolute', bottom:5, right:20, zIndex:50, fontSize:9, color:'#475569', pointerEvents:'none'}}>
        OPERADOR: {currentUser?.username?.toUpperCase() || 'OPERADOR'} | PLAN: {userPlan?.toUpperCase() || 'COMUNIDAD'}
      </div>

      {importingPath && (
        <ImportModal 
          folders={folders} 
          onClose={() => setImportingPath(null)} 
          onTriggerCreateFolder={() => { setShowFolderModal(true); setCreatingParentId(null); }}
          onConfirm={async (tid) => { 
             const res = await window.api.processImport({ folderPath: importingPath, targetFolderId: tid, userPlan: userPlan }); 
             if(res.success) { 
               alert(`Operación Exitosa.\nHash SHA-256 generado correctamente.`); 
               cargarDatos(); 
             } else { 
               alert("Notificación de Sistema:\n\n" + res.error); 
             }
             setImportingPath(null); 
          }} 
        />
      )}

      {showFolderModal && (
        <CreateFolderModal 
          name={newFolderName} 
          setName={setNewFolderName} 
          color={newFolderColor} 
          setColor={setNewFolderColor} 
          isSubfolder={creatingParentId !== null} 
          onClose={() => { setShowFolderModal(false); setCreatingParentId(null); setPendingDragItem(null); }} 
          onCreate={async () => { 
            const res = await window.api.createFolder({ name: newFolderName, color: newFolderColor, parent_id: creatingParentId }); 
            if (res.success && pendingDragItem) {
              if (pendingDragItem.type === 'chat') await window.api.invoke('move-chat-to-folder', { chatId: pendingDragItem.id, folderId: res.id });
              if (pendingDragItem.type === 'folder') await window.api.invoke('move-folder', { folderId: pendingDragItem.id, targetParentId: res.id });
              setPendingDragItem(null);
            }
            setShowFolderModal(false); 
            setCreatingParentId(null); 
            cargarDatos(); 
          }} 
        />
      )}

      {assignChatId && (
        <FolderSelectModal folders={folders} onClose={() => setAssignChatId(null)} onSelect={async (fid) => { await window.api.addChatToFolder({ chatId: assignChatId, folderId: fid }); setAssignChatId(null); cargarDatos(); }} />
      )}
      
      {showStats && <StatsModal data={calcularEstadisticas()} onClose={() => setShowStats(false)} />}
      
     {showGallery && <GalleryModal data={galleryData} allMessages={messages} isLoading={loadingGallery} onClose={() => setShowGallery(false)} onGoToMessage={handleGoToMessage} />}
      
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="premium-card" onClick={e => e.stopPropagation()} style={{width:'900px', height: '85vh', display:'flex', flexDirection:'column', overflow: 'hidden'}}>
            <div className="gallery-header" style={{background:'#1e293b', borderBottom:'1px solid #334155', padding: '20px'}}>
              <h2 style={{display:'flex', alignItems:'center', gap:'10px', fontSize: '16px', margin:0, color: '#f8fafc'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Documentación Técnica
              </h2>
              <button className="premium-btn-ghost" style={{padding: '4px', border: 'none'}} onClick={() => setShowHelp(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="gallery-body" style={{padding: '40px', overflowY: 'auto', textAlign:'left', lineHeight:'1.7', color:'#cbd5e1', fontSize: '14px'}}>
              <p>El proceso de importación garantiza la integridad de la evidencia digital desde el primer momento.</p>
            </div>
          </div>
        </div>
      )}

      {showInvestigatorModal && (
        <div className="modal-overlay" onClick={() => setShowInvestigatorModal(false)}>
          <div className="premium-card" onClick={e => e.stopPropagation()} style={{width: '550px', padding: '30px'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
               <h3 style={{display:'flex', alignItems:'center', gap:'10px', fontSize: '16px', margin: 0, color: '#f8fafc'}}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                 Configuración de Extracción Pericial
               </h3>
               <button className="premium-btn-ghost" style={{padding: '4px', border: 'none'}} onClick={() => setShowInvestigatorModal(false)}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
               </button>
             </div>
             
             <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                {isComunidad && (
                   <div style={{padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '12px'}}>
                     Operando en nivel de acceso básico. Filtros avanzados inactivos.
                   </div>
                )}

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div>
                    <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Identificación del Perito</label>
                    <input className="premium-input" type="text" value={investigatorName} onChange={(e) => setInvestigatorName(e.target.value)} style={{width:'100%', padding: '10px 14px', borderRadius: '8px'}} />
                  </div>
                  <div>
                    <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Número de Expediente</label>
                    <input className="premium-input" type="text" placeholder="Ej: EXP-2026/001" value={exportConfig.caseNumber} onChange={(e) => setExportConfig({...exportConfig, caseNumber: e.target.value})} style={{width:'100%', padding: '10px 14px', borderRadius: '8px'}} />
                  </div>
                </div>

                <div>
                  <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Parámetro de Extracción</label>
                  <select className="premium-input" value={exportConfig.mode} onChange={(e) => setExportConfig({...exportConfig, mode: e.target.value})} style={{width:'100%', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', appearance: 'none'}}>
                    <option value="all">Documento Analítico Integral</option>
                    <option value="evidence">Síntesis de Evidencia Marcada</option>
                    <option value="single_day" disabled={isComunidad}>Extracción por Fecha Específica {isComunidad ? '(Bloqueado)' : ''}</option>
                    <option value="date_range" disabled={isComunidad}>Extracción por Rango Temporal {isComunidad ? '(Bloqueado)' : ''}</option>
                    <option value="keyword" disabled={isComunidad}>Extracción por Término Clave {isComunidad ? '(Bloqueado)' : ''}</option>
                  </select>
                </div>

                <div style={{minHeight: '70px'}}>
                  {exportConfig.mode === 'single_day' && !isComunidad && (
                    <div>
                      <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Fecha Objetivo</label>
                      <input type="date" className="premium-input" style={{width:'100%', padding: '10px 14px', borderRadius: '8px', colorScheme: 'dark'}} value={exportConfig.singleDate} onChange={e => setExportConfig({...exportConfig, singleDate: e.target.value})} />
                    </div>
                  )}
                  {exportConfig.mode === 'date_range' && !isComunidad && (
                    <div style={{display: 'flex', gap: '16px'}}>
                      <div style={{flex: 1}}>
                        <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Fecha Inicio</label>
                        <input type="date" className="premium-input" style={{width:'100%', padding: '10px 14px', borderRadius: '8px', colorScheme: 'dark'}} value={exportConfig.startDate} onChange={e => setExportConfig({...exportConfig, startDate: e.target.value})} />
                      </div>
                      <div style={{flex: 1}}>
                        <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Fecha Cierre</label>
                        <input type="date" className="premium-input" style={{width:'100%', padding: '10px 14px', borderRadius: '8px', colorScheme: 'dark'}} value={exportConfig.endDate} onChange={e => setExportConfig({...exportConfig, endDate: e.target.value})} />
                      </div>
                    </div>
                  )}
                  {exportConfig.mode === 'keyword' && !isComunidad && (
                    <div>
                      <label style={{fontSize: '11px', color: '#94a3b8', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Término de Búsqueda</label>
                      <input type="text" className="premium-input" placeholder="Ingrese término exacto..." value={exportConfig.keyword} onChange={e => setExportConfig({...exportConfig, keyword: e.target.value})} style={{width:'100%', padding: '10px 14px', borderRadius: '8px'}} />
                    </div>
                  )}
                </div>

                <button onClick={confirmarGenerarReporte} className="premium-btn-primary" style={{padding: '14px', borderRadius: '8px', marginTop: '10px'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  EJECUTAR EXTRACCIÓN PDF
                </button>
             </div>
          </div>
        </div>
      )}

      <Sidebar 
        chats={chats} activeChat={activeChat} onChatSelect={handleChatClick}
        folders={folders} activeFolderId={activeFolderId} onFolderSelect={setActiveFolderId}
        onDeleteChat={handleBorrarChat} onDeleteFolder={async (e, id) => { e.stopPropagation(); if(window.confirm("¿Borrar definitivamente?")) {await window.api.deleteFolder(id); cargarDatos();} }}
        onCreateFolder={() => { setCreatingParentId(null); setShowFolderModal(true); }}
        onCreateSubfolder={handleCreateSubfolderRequest} onAssignFolder={setAssignChatId}
        onMoveChat={handleMoveChat} onMoveFolder={handleMoveFolder} 
        onDropOnCreate={(item) => {
          setPendingDragItem(item);
          setCreatingParentId(null);
          setShowFolderModal(true);
        }}
        onResetDB={handleReset} onImport={async () => { const p = await window.api.selectFolderPath(); if(p) setImportingPath(p); }}
        onShowHelp={() => setShowHelp(true)} globalSearchMode={globalSearchMode} 
        
        onGlobalSearchClick={() => { setGlobalSearchMode(true); setActiveChat(null); setGlobalSearchResults([]); setShowProfileMode(false); setActiveReport(null); }}
        isAdmin={currentUser?.role === 'admin'} onOpenAdmin={() => setShowAdminPanel(true)}
        onGoHome={handleGoHome} onLogout={handleLogout}
        onOpenAgency={() => { setShowProfileMode(true); setActiveChat(null); setGlobalSearchMode(false); setActiveReport(null); }} 
        reports={reports} activeReport={activeReport} onReportSelect={handleReportSelect} onDeleteReport={handleDeleteReport}
      />

      <div className="chat-window">
        {/* 🔥 PANEL DE USUARIO: DISEÑO PREMIUM SAAS 🔥 */}
        {showProfileMode ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b1120' }}>
            <div className="chat-header" style={{ padding: '24px 32px', borderBottom: '1px solid #1e293b', background: '#0f172a', zIndex: 10 }}>
              <div className="header-info">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#f8fafc', margin: 0 }}>
                   <span style={{color: '#0ea5e9'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                   </span>
                   Panel de Configuración Administrativa
                </h4>
              </div>
            </div>

            <div style={{ flex: 1, padding: '40px 32px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                
                {/* --- 1. DATOS DE SESIÓN --- */}
                <div className="premium-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: '1 1 300px', minHeight: '380px' }}>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px'}}>
                     <h4 style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', margin: 0}}>Perfil de Operador</h4>
                     <button className="premium-btn-ghost" style={{padding: '6px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'}} onClick={handleLogout} title="Cerrar sesión de forma segura">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Salir
                     </button>
                   </div>
                   
                   <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px'}}>
                     <div style={{width: 64, height: 64, borderRadius: '50%', background: '#1e293b', border: '2px solid #334155', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '600'}}>
                        {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                     </div>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                       <div style={{color: '#f8fafc', fontSize: '18px', fontWeight: '600'}}>{currentUser?.username || 'Usuario'}</div>
                       <span style={{fontSize: '11px', color: '#94a3b8', background: '#0f172a', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #334155', alignSelf: 'flex-start'}}>
                         {currentUser?.role === 'admin' ? 'Administrador del Sistema' : 'Analista Operativo'}
                       </span>
                     </div>
                   </div>

                   <div style={{marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #334155'}}>
                      <h4 style={{fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '16px'}}>Estado de Licencia</h4>
                      <div>
                         {isInstitucional ? (
                            isSubcuenta ? (
                               <div style={{background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                  Licencia Institucional (Subcuenta)
                               </div>
                            ) : (
                               <div style={{background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                  Licencia Institucional (Propietario)
                               </div>
                            )
                         ) : userPlan !== 'comunidad' ? (
                            <div style={{background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)', color: '#38bdf8', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'}}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                               Licencia Profesional Activa
                            </div>
                         ) : (
                            <div style={{background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px'}}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                               Versión Comunidad (Limitada)
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* --- 2. MARCA BLANCA --- */}
                <div className="premium-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: '1.5 1 450px', minHeight: '380px', position: 'relative', overflow: 'hidden' }}>
                   
                   {userPlan !== 'institucional' && (
                     <div style={{position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, textAlign: 'center'}}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '16px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <div style={{color: '#e2e8f0', fontSize: '16px', fontWeight: '600', marginBottom: '8px'}}>Módulo Restringido</div>
                        <div style={{color: '#94a3b8', fontSize: '13px', maxWidth: '300px'}}>La personalización de reportes requiere una Licencia Institucional.</div>
                     </div>
                   )}

                   <h4 style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', marginBottom: '32px'}}>Firma y Personalización (Dictámenes)</h4>

                   <div style={{display: 'flex', flexDirection: 'column', gap: '24px', flex: 1}}>
                      <div>
                        <label style={{fontSize: '12px', color: '#e2e8f0', fontWeight:'500', marginBottom:'8px', display:'block'}}>Entidad o Estudio Jurídico</label>
                        <input className="premium-input" type="text" value={agencyProfile.name} onChange={e => setAgencyProfile({...agencyProfile, name: e.target.value})} style={{width:'100%', padding: '12px 16px', borderRadius: '8px', fontSize: '14px'}} placeholder="Ej: Departamento de Cibercrimen" />
                      </div>
                      
                      <div>
                        <label style={{fontSize: '12px', color: '#e2e8f0', fontWeight:'500', marginBottom:'8px', display:'block'}}>Emblema Oficial</label>
                        <div className="dropzone-area" onClick={async () => { const imgPath = await window.api.selectImage(); if (imgPath) setAgencyProfile({...agencyProfile, logoPath: imgPath}); }}>
                          <div style={{width: 64, height: 64, borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
                            {agencyProfile.logoPath ? (
                               <img src={`evidens://${agencyProfile.logoPath.replace(/\\/g, '/')}`} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} onError={(e) => e.target.style.display='none'} />
                            ) : (
                               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            )}
                          </div>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                             <span style={{fontSize: '14px', fontWeight: '500', color: '#e2e8f0'}}>Cargar imagen del equipo</span>
                             <span style={{fontSize: '12px', color: '#64748b'}}>Formatos soportados: PNG, JPG transparentes.</span>
                          </div>
                        </div>
                        {agencyProfile.logoPath && (
                           <div style={{marginTop: '12px', textAlign: 'right'}}>
                              <button className="premium-btn-danger" onClick={() => setAgencyProfile({...agencyProfile, logoPath: null})} style={{fontSize: '12px', padding: '6px 12px', borderRadius: '6px', fontWeight: '500'}}>Quitar emblema actual</button>
                           </div>
                        )}
                      </div>

                      <div style={{marginTop: 'auto', paddingTop: '16px'}}>
                        <button className="premium-btn-primary" onClick={async () => { await window.api.saveAgencyProfile(agencyProfile); alert("Perfil de configuración guardado."); setShowProfileMode(false); }} style={{width: '100%', padding: '14px', borderRadius: '8px', fontSize: '14px'}}>
                          Actualizar Parámetros
                        </button>
                      </div>
                   </div>
                </div>

                {/* --- NUEVO: SEGURIDAD DE ACCESO (Oculto para sub-cuentas) --- */}
                {isPropietario && (
                  <div className="premium-card" style={{ padding: '32px', flex: '1 1 100%' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                      <div>
                        <h4 style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', margin: 0}}>Seguridad de Acceso</h4>
                        <p style={{color: '#94a3b8', fontSize: '13px', marginTop: '4px'}}>Autorice con su clave actual para generar una nueva credencial corporativa.</p>
                      </div>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                      {/* Fila 1: Clave Actual para autorizar */}
                      <div>
                        <label style={{fontSize: '12px', color: '#e2e8f0', fontWeight:'500', marginBottom:'8px', display:'block'}}>Contraseña actual</label>
                        <input 
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="premium-input" 
                          style={{width:'100%', maxWidth: '300px', padding: '12px 16px', borderRadius: '8px', fontSize: '14px'}} 
                          placeholder="Ingrese su clave vigente..." 
                        />
                      </div>

                      {/* Fila 2: Generador */}
                      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end'}}>
                        <div style={{flex: '1 1 300px'}}>
                          <label style={{fontSize: '12px', color: '#e2e8f0', fontWeight:'500', marginBottom:'8px', display:'block'}}>Nueva clave de acceso (Automática)</label>
                          <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                            <input 
                              type={showPassword ? "text" : "password"}
                              value={generatedPassword}
                              readOnly
                              className="premium-input" 
                              style={{
                                width:'100%', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', 
                                paddingRight: '44px', background: 'rgba(15, 23, 42, 0.6)', cursor: 'default',
                                fontFamily: generatedPassword ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit',
                                letterSpacing: generatedPassword ? '1px' : 'normal'
                              }} 
                              placeholder="Presione el botón para generar..." 
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPassword(!showPassword)} 
                              disabled={!generatedPassword} 
                              style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                                background: 'none', border: 'none', color: generatedPassword ? '#94a3b8' : '#334155', 
                                cursor: generatedPassword ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                              }}
                              title={showPassword ? "Ocultar clave" : "Mostrar clave"}
                            >
                              {showPassword ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                              )}
                            </button>
                          </div>
                        </div>

                        <div style={{display: 'flex', gap: '12px', flex: '1 1 auto'}}>
                          <button 
                            type="button" 
                            onClick={handleGeneratePassword} 
                            className="premium-btn-ghost" 
                            style={{padding: '12px 20px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                            title="Generar credencial segura"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4l-2 2-1.5-1.5-2 2Z"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
                            <span>Generar</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPass || !generatedPassword || !currentPassword}
                            className="premium-btn-primary" 
                            style={{flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px'}}
                          >
                            {isUpdatingPass ? 'Procesando...' : 'Actualizar Clave'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 3. GESTIÓN DE EQUIPO --- */}
                {isPropietario && (
                  <div className="premium-card" style={{ padding: '32px', flex: '1 1 100%' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px'}}>
                      <h4 style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', margin: 0}}>Administración de Accesos</h4>
                      <div style={{background: teamMembers.length >= 4 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: teamMembers.length >= 4 ? '#ef4444' : '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600'}}>
                        Cuotas utilizadas: {teamMembers.filter(m => m.invitation_status === 'accepted').length} / 4
                      </div>
                    </div>

                    {/* Envío de Invitación */}
                    <div style={{display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap'}}>
                      <input 
                        className="premium-input"
                        type="text" 
                        placeholder="Dirección de correo electrónico del analista..." 
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        disabled={teamMembers.length >= 4}
                        style={{flex: '1 1 300px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px'}} 
                      />
                      <button 
                        className="premium-btn-primary"
                        disabled={teamMembers.length >= 4 || !inviteUsername.trim() || loadingTeam}
                        style={{flex: '0 1 auto', padding: '0 24px', borderRadius: '8px'}}
                        onClick={async () => {
                          setLoadingTeam(true);
                          try {
                            const adminEmail = currentUser.username;
                            const currentActive = teamMembers.filter(m => m.invitation_status === 'accepted').length;
                            if (currentActive >= 4) { alert("Límite máximo de conexiones operativas alcanzado."); setLoadingTeam(false); return; }

                            const { data: targetUser, error: findErr } = await supabase.from('users').select('*').eq('email', inviteUsername).maybeSingle();
                            
                            if (findErr || !targetUser) {
                               alert(`Error de validación.\nEl identificador proporcionado no se encuentra registrado en los servidores centrales.`);
                               setLoadingTeam(false); return;
                            }

                            if (targetUser.parent_id) { 
                               alert("Conflicto de dependencia. La credencial ya reporta a otro nodo jerárquico."); 
                               setLoadingTeam(false); return; 
                            }

                            const { error: updateErr } = await supabase.from('users').update({ parent_id: adminEmail, invitation_status: 'pending' }).eq('email', inviteUsername);
                            if (updateErr) throw updateErr;

                            alert(`Solicitud de enlace despachada hacia ${inviteUsername}.`);
                            setInviteUsername('');
                            cargarEquipo();
                          } catch (e) { alert("Error de protocolo: " + e.message); }
                          setLoadingTeam(false);
                        }}
                      >
                        {loadingTeam ? 'Procesando...' : 'Despachar Solicitud'}
                      </button>
                    </div>

                    {/* Tabla de Usuarios */}
                    <div style={{background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', overflowX: 'auto'}}>
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Identidad Operativa</th>
                            <th>Firma Hardware (HWID)</th>
                            <th>Estado Lógico</th>
                            <th style={{textAlign: 'right'}}>Controles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingTeam ? (
                            <tr><td colSpan="4" style={{padding: '24px', textAlign: 'center', color: '#94a3b8'}}>Estableciendo conexión segura...</td></tr>
                          ) : teamMembers.length === 0 ? (
                            <tr><td colSpan="4" style={{padding: '24px', textAlign: 'center', color: '#64748b'}}>No existen dependencias operativas asociadas a esta matriz.</td></tr>
                          ) : (
                            teamMembers.map((member) => (
                              <tr key={member.id} className="hwid-row" style={{opacity: member.is_active ? 1 : 0.6}}>
                                <td style={{fontWeight: '500', color: '#f8fafc'}} title="Correo electrónico del operador enlazado">{member.username}</td>
                                
                                <td style={{maxWidth: '220px'}}>
                                   {member.hwid && member.hwid !== 'Desconocido' && member.invitation_status === 'accepted' ? (
                                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <span className="hwid-cell" title="Huella física inmutable de la terminal origen">
                                          {member.hwid}
                                        </span>
                                        <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(member.hwid); alert("HWID transferido al portapapeles."); }} title="Copiar HWID al portapapeles">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                        </button>
                                      </div>
                                   ) : (
                                      <span style={{fontSize: '12px', color: '#475569'}} title="Sin telemetría de hardware recibida">No registrado</span>
                                   )}
                                </td>

                                <td>
                                  {member.invitation_status === 'pending' ? (
                                    <span className="badge badge-warning" title="Transmisión enviada. Aguardando respuesta de la terminal remota.">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                      Pendiente
                                    </span>
                                  ) : member.is_active ? (
                                    <span className="badge badge-success" title="Enlace persistente confirmado y operativo.">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      Sincronizado
                                    </span>
                                  ) : (
                                    <span className="badge badge-danger" title="Acceso de red revocado manualmente por el administrador.">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                      Bloqueado
                                    </span>
                                  )}
                                </td>
                                <td style={{textAlign: 'right'}}>
                                    <button 
                                      className="premium-btn-ghost"
                                      style={{color: '#ef4444', fontSize: '12px', padding: '6px 12px', borderRadius: '6px'}}
                                      onClick={async () => {
                                        if (window.confirm(`ATENCIÓN:\n¿Confirma la destrucción del enlace con el nodo [${member.username}]?\nEsta acción liberará una licencia inmediatamente.`)) {
                                          const { error } = await supabase.from('users').update({ parent_id: null, plan: 'comunidad', invitation_status: 'none', hwid: null }).eq('email', member.username);
                                          if (!error) { cargarEquipo(); } else { alert("Fallo: " + error.message); }
                                        }
                                      }}
                                      title="Desconecta este usuario de la matriz y elimina su rastro de HWID."
                                    >
                                      Destruir Enlace
                                    </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeReport ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
            <div className="chat-header" style={{background: '#1e293b'}}>
              <div className="header-info">
                <h4 style={{margin:0, color: '#f8fafc', fontSize: '15px'}}>Visor de Archivo Físico</h4>
                <small style={{color: '#94a3b8'}}>{activeReport.chat_name.replace(/^Chat de WhatsApp con /i, '')} | {new Date(activeReport.created_at).toLocaleString()}</small>
              </div>
              <div className="header-tools">
                <button className="premium-btn-danger" style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }} onClick={() => setActiveReport(null)}>Cerrar Visor</button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '20px', background: '#0f172a' }}>
               <iframe src={`evidens://${activeReport.file_path.replace(/\\/g, '/')}`} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} title="Visor Pericial PDF"/>
            </div>
          </div>
        ) : (
          <>
            {!activeChat && !globalSearchMode && (
              <Dashboard 
                user={{...currentUser, plan: userPlan}} 
                stats={{ chats: chats.length, folders: folders.length }} 
                recents={chats.slice(0, 10)} 
                onImport={async () => { const p = await window.api.selectFolderPath(); if(p) setImportingPath(p); }} 
                onCreateFolder={() => { setCreatingParentId(null); setShowFolderModal(true); }} 
                onSearch={() => { setGlobalSearchMode(true); setActiveChat(null); setGlobalSearchResults([]); setShowProfileMode(false); }} 
                onOpenChat={(chat) => handleChatClick(chat)} 
                onOpenAgency={() => { setShowProfileMode(true); setActiveChat(null); setGlobalSearchMode(false); setActiveReport(null); }} 
              />
            )}

            {globalSearchMode && (
              <>
                <div className="chat-header" style={{background: '#1e293b', borderBottom: '1px solid #334155'}}>
                    <div className="header-info"><h4 style={{color: '#f8fafc', margin: 0}}>Búsqueda Indexada Global</h4></div>
                    <div className="header-tools">
                      <input type="text" className="premium-input" placeholder="Término a buscar..." value={globalSearchTerm} onChange={(e) => handleGlobalSearch(e.target.value)} autoFocus style={{width: 300, padding: '8px 12px', borderRadius: '6px'}} />
                    </div>
                </div>
                <div className="messages-area" style={{ flex: 1, overflow: 'hidden' }}>
                  <Virtuoso style={{ height: '100%' }} data={globalSearchResults} itemContent={(index, msg) => { const fechaActual = formatearFecha(msg.timestamp); let fechaAnterior = null; if (index > 0 && globalSearchResults[index - 1]) { fechaAnterior = formatearFecha(globalSearchResults[index - 1].timestamp); } const mostrarSeparador = index === 0 || fechaActual !== fechaAnterior || (index > 0 && msg.chat_id !== globalSearchResults[index - 1].chat_id); return ( <div key={msg.id} style={{display: 'flex', flexDirection: 'column', width: '100%'}}> {mostrarSeparador && ( <div className="date-separator"><span>{fechaActual} {msg.chat_name ? ` • ${msg.chat_name.replace(/^Chat de WhatsApp con /i, '')}` : ''}</span></div> )} <MessageBubble msg={msg} esMio={false} busqueda={globalSearchTerm} onToggleEvidence={handleToggleEvidence} onTranscribe={handleTranscribir} procesandoAudio={procesandoAudio} transcripciones={transcripciones} /> </div> ); }} />
                </div>
              </>
            )}

            {activeChat && (
              <>
                <div className="chat-header" style={{background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px'}}>
                  
                  {/* LADO IZQUIERDO: Título e Info del Chat */}
                  <div className="header-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h4 style={{color: '#f8fafc', margin: 0, fontSize: '16px', fontWeight: '700'}}>
                      {activeChat.name.replace(/^Chat de WhatsApp con /i, '')}
                    </h4>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', width: 'fit-content' }}>
                       {busqueda.length > 2 ? `Resultados: ${mensajesFiltrados.length}` : `Volumen: ${totalMessages} mnsj`}
                    </div>
                  </div>

                  {/* LADO DERECHO: Barra de Herramientas (En una sola línea, más grande) */}
                  <div className="header-tools" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                    
                    {/* 1. Botón Galería */}
                    <button className="premium-btn-ghost" style={{padding: '8px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}} onClick={handleOpenGallery} aria-label="Abrir galería">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Galería
                    </button>

                    {/* 2. Botón Reporte */}
                    <button className="premium-btn-primary" style={{padding: '8px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}} onClick={iniciarProcesoReporte} aria-label="Emitir PDF">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      Emitir PDF
                    </button>

                    {/* 3. Botón Estadísticas */}
                    <button className="premium-btn-ghost" style={{padding: '8px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}} onClick={() => setShowStats(true)} aria-label="Metadatos">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      Metadatos
                    </button>

                    {/* 4. Botón Evidencia (AHORA AL LADO DE METADATOS) */}
                    <button 
                      onClick={() => setModoEvidencia(!modoEvidencia)}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500',
                        background: modoEvidencia ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        color: modoEvidencia ? '#38bdf8' : '#94a3b8',
                        border: modoEvidencia ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent'
                      }}
                      className={modoEvidencia ? '' : 'premium-btn-ghost'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={modoEvidencia ? "#38bdf8" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      Evidencia
                    </button>

                    <div style={{ width: '1px', height: '20px', background: '#334155', margin: '0 4px' }} />

                    {/* 5. Filtro por Fecha (AHORA ANTES DEL BUSCADOR) */}
                    <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', paddingLeft: '10px', gap: '6px', transition: 'border-color 0.2s' }} onFocus={(e) => e.currentTarget.style.borderColor = '#0ea5e9'} onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <input 
                        type="date" 
                        value={fechaFiltro} 
                        onChange={(e) => { 
                          setFechaFiltro(e.target.value); 
                          if(e.target.value) setModoFiltroFecha(true); 
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '13px', outline: 'none', padding: '8px 2px', colorScheme: 'dark', cursor: 'pointer' }}
                      />
                      <button 
                        onClick={() => {
                          if (!fechaFiltro) return alert("Seleccione una fecha primero.");
                          setModoFiltroFecha(!modoFiltroFecha);
                        }}
                        style={{
                          padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                          background: modoFiltroFecha ? '#eab308' : 'transparent',
                          color: modoFiltroFecha ? '#0f172a' : '#94a3b8',
                          borderLeft: '1px solid #334155',
                        }}
                      >
                        Día
                      </button>
                    </div>

                    {/* 6. Buscador */}
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </div>
                      <input 
                        type="text" 
                        className="premium-input" 
                        placeholder="Filtrar cadena..." 
                        value={busqueda} 
                        onChange={handleLocalSearchChange} 
                        style={{ padding: '8px 12px 8px 32px', borderRadius: '8px', width: '180px', fontSize: '13px' }} 
                      />
                    </div>

                  </div>
                </div>
                
                <div className="messages-area" id="printable-area" style={{ flex: 1, overflow: 'hidden' }}>
                  <Virtuoso  ref={virtuosoRef} style={{ height: '100%' }} data={mensajesFiltrados} initialTopMostItemIndex={mensajesFiltrados.length > 0 ? mensajesFiltrados.length - 1 : 0} firstItemIndex={Math.max(0, totalMessages - mensajesFiltrados.length)} components={{ Header: () => (!busqueda && (totalMessages > messages.length)) ? ( <div style={{textAlign: 'center', padding: '20px'}}><button className="premium-btn-ghost" onClick={handleCargarAnteriores} disabled={loadingMsg} style={{padding: '8px 20px', borderRadius: '9999px', border: '1px solid #334155'}}>{loadingMsg ? 'Sincronizando...' : `Cargar historial de red`}</button></div> ) : <div style={{height: '10px'}} />, Footer: () => <div style={{height: '20px'}} /> }} itemContent={(indexAbsoluto, msg) => { const esMio = ['Yo', 'Me', 'Joaco'].includes(msg.sender_name); const primerIndice = Math.max(0, totalMessages - mensajesFiltrados.length); const indexReal = indexAbsoluto - primerIndice; const fechaActual = formatearFecha(msg.timestamp); let fechaAnterior = null; if (indexReal > 0 && mensajesFiltrados[indexReal - 1]) { fechaAnterior = formatearFecha(mensajesFiltrados[indexReal - 1].timestamp); } const mostrarSeparador = indexReal === 0 || fechaActual !== fechaAnterior; return ( <div style={{display: 'flex', flexDirection: 'column', width: '100%'}}> {mostrarSeparador && ( <div className="date-separator"><span>{fechaActual}</span></div> )} <MessageBubble msg={msg} esMio={esMio} busqueda={busqueda} onToggleEvidence={handleToggleEvidence} onTranscribe={handleTranscribir} procesandoAudio={procesandoAudio} transcripciones={transcripciones} /> </div> ); }} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
export default App;