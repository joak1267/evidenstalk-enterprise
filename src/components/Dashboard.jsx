import React from 'react';
import { getPlanFeatures } from '../permissions'; 

const Icons = {
  Import: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Folder: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Search: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Crown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Building: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
};

// 🔥 GENERADOR DE TEMAS DINÁMICOS (ARMONÍA CORREGIDA) 🔥
const getDashboardTheme = (plan) => {
  // BASE NEUTRA: Garantiza la "compaginación" con el Sidebar y toda la app
  const baseTheme = {
    bg: '#0b1120',          // Fondo oscuro neutral
    cardBg: '#1e293b',      // Fondo de las tarjetas (Gris pizarra)
    cardHover: '#0f172a',   // Fondo oscuro al pasar el mouse
    border: '#334155',      // Bordes grises sutiles
    text: '#f8fafc',        // Texto principal blanco nítido
    textMuted: '#94a3b8'    // Texto secundario gris claro/plata
  };

  if (plan === 'institucional') {
    return { 
      ...baseTheme,
      accent: '#c084fc', // Un morado pastel más suave y elegante (Purple-400)
      accentBg: 'rgba(192, 132, 252, 0.12)', // Fondo morado muy sutil
    };
  } else if (plan === 'pericial') {
    return { 
      ...baseTheme,
      accent: '#38bdf8', // Celeste Técnico (Sky-400)
      accentBg: 'rgba(56, 189, 248, 0.12)',
    };
  } else {
    return { 
      ...baseTheme,
      accent: '#cbd5e1', // Gris Plata (Comunidad)
      accentBg: 'rgba(255, 255, 255, 0.05)',
    };
  }
};

export default function Dashboard({ user, stats, recents, onImport, onCreateFolder, onSearch, onOpenChat, onOpenAgency }) {
  
  const userPlan = user?.role === 'admin' ? 'institucional' : (user?.plan || 'comunidad');
  const features = getPlanFeatures(userPlan);
  
  // Extraemos el tema dinámico
  const theme = getDashboardTheme(userPlan);

  const isComunidad = userPlan === 'comunidad';
  const isInstitucional = userPlan === 'institucional';

  const handleRestrictedAction = (action, isAllowed) => {
    if (isAllowed) {
      action();
    } else {
      alert("🔒 Esta característica requiere una Licencia Institucional. Por favor, contacte a ventas o actualice su plan.");
    }
  };

  return (
    <div style={{ flex: 1, padding: '40px 50px', background: theme.bg, color: theme.text, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '40px', transition: 'background 0.4s ease' }}>
      
      {/* --- CABECERA Y KPI --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            INFRAESTRUCTURA DE EVIDENCIA DIGITAL
            
            <span style={{ 
              background: theme.accentBg, color: theme.accent, border: `1px solid ${theme.border}`,
              padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' 
            }}>
              {!isComunidad && <Icons.Crown />}
              LICENCIA {features.name.toUpperCase()}
            </span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Bienvenido, <span style={{ color: theme.accent }}>{user?.username || 'Operador'}</span>
          </h1>
          <p style={{ color: theme.textMuted, margin: 0, fontSize: '14px' }}>
            Sistema seguro y encriptado. Su sesión está siendo auditada.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px 24px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>CASOS ACTIVOS</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: theme.text }}>{stats?.chats || 0}</div>
          </div>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px 24px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>CARPETAS CREADAS</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: theme.accent }}>{stats?.folders || 0}</div>
          </div>
        </div>
      </div>

      {/* --- BOTONES DE ACCIÓN RÁPIDA --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <ActionCard icon={<Icons.Import />} title="Importar Evidencia" desc="Procesar exportaciones .txt de WhatsApp." onClick={onImport} theme={theme} />
        <ActionCard icon={<Icons.Folder />} title="Nuevo Caso" desc="Organizar evidencias en contenedores." onClick={onCreateFolder} theme={theme} />
        <ActionCard icon={<Icons.Search />} title="Inteligencia Global" desc="Buscar en toda la base de datos." onClick={onSearch} theme={theme} />
        <ActionCard 
           icon={isInstitucional ? <Icons.Building /> : <Icons.Lock />} 
           title="Perfil Agencia" 
           desc="Personalizar logo e info para reportes." 
           onClick={() => handleRestrictedAction(onOpenAgency, isInstitucional)} 
           theme={theme} 
           isLocked={!isInstitucional} 
        />
      </div>

      {/* --- TABLA DE HISTORIAL --- */}
      <div style={{ flex: 1, background: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ color: theme.textMuted }}><Icons.Clock /></div>
          <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', color: theme.text, fontWeight: '600', letterSpacing: '0.5px' }}>
            Casos Recientes Activos
          </h3>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(!recents || recents.length === 0) ? (
            <div style={{ textAlign: 'center', color: theme.textMuted, padding: '60px 20px', fontSize: '14px' }}>
              No hay expedientes cargados en el sistema actualmente.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}` }}>Nombre del Caso</th>
                  <th style={{ padding: '16px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}` }}>Fecha Ingesta</th>
                  <th style={{ padding: '16px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}` }}>Integridad</th>
                  <th style={{ padding: '16px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}`, textAlign:'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recents.map(chat => (
                  <tr 
                    key={chat.id} 
                    style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.2s' }} 
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} 
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onOpenChat(chat)}
                  >
                    <td style={{ padding: '16px 24px', fontWeight: '500', color: theme.text }}>
                      {chat.name.replace(/^Chat de WhatsApp con /i, '')}
                    </td>
                    <td style={{ padding: '16px 24px', color: theme.textMuted }}>
                      {new Date(chat.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {chat.source_hash ? (
                        !isComunidad ? (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', background: theme.accentBg, color: theme.accent, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            <Icons.Shield /> SHA-256
                          </span>
                        ) : (
                          <span title="Requiere Plan Pericial" style={{ display:'inline-flex', alignItems:'center', gap:'6px', background: 'transparent', color: theme.textMuted, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', border: `1px solid ${theme.border}` }}>
                            <Icons.Lock /> Hash Bloqueado
                          </span>
                        )
                      ) : (
                        <span style={{ color: theme.textMuted, fontSize: '11px' }}>Legacy</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign:'right' }}>
                      <button 
                        style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, cursor: 'pointer', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', transition: 'all 0.2s' }} 
                        onMouseOver={e=> {e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = theme.accent;}} 
                        onMouseOut={e=> {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text; e.currentTarget.style.borderColor = theme.border;}}
                      >
                        ABRIR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// 🔥 COMPONENTE REUTILIZABLE PARA TARJETAS 🔥
const ActionCard = ({ icon, title, desc, onClick, theme, isLocked }) => (
  <div 
    onClick={isLocked ? undefined : onClick}
    style={{ 
      background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px', 
      cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', 
      display: 'flex', flexDirection: 'column', opacity: isLocked ? 0.6 : 1 
    }}
    onMouseEnter={e => { 
      if(!isLocked) {
        e.currentTarget.style.borderColor = theme.accent; 
        e.currentTarget.style.background = theme.cardHover; 
        e.currentTarget.style.transform = 'translateY(-4px)'; 
        e.currentTarget.style.boxShadow = `0 10px 25px -5px ${theme.accent}40`; 
      }
    }}
    onMouseLeave={e => { 
      if(!isLocked) {
        e.currentTarget.style.borderColor = theme.border; 
        e.currentTarget.style.background = theme.cardBg; 
        e.currentTarget.style.transform = 'translateY(0)'; 
        e.currentTarget.style.boxShadow = 'none'; 
      }
    }}
  >
    <div style={{ background: theme.accentBg, color: theme.accent, padding: '14px', borderRadius: '12px', width: 'fit-content', marginBottom: '16px' }}>
      {icon}
    </div>
    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: theme.text, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {title} {isLocked && <span style={{fontSize:'9px', background:'#ef4444', padding:'3px 6px', borderRadius:'4px', color:'white', fontWeight:'bold', letterSpacing:'0.5px'}}>PRO</span>}
    </h3>
    <p style={{ margin: 0, fontSize: '13px', color: theme.textMuted, lineHeight: '1.5' }}>{desc}</p>
  </div>
);