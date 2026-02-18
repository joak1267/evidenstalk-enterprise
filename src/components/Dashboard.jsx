import React from 'react';

// Iconos SVG Inline (Estilo Cyber)
const Icons = {
  Import: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Folder: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Search: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
};

export default function Dashboard({ user, stats, recents, onImport, onCreateFolder, onSearch, onOpenChat }) {
  
  return (
    <div style={{ flex: 1, padding: '40px', background: '#0f172a', color: '#f1f5f9', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. HERO SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
            INFRAESTRUCTURA DE EVIDENCIA DIGITAL
          </div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bienvenido, {user?.username || 'Operador'}
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px', fontSize: '14px' }}>
            Sistema seguro y encriptado. Su sesión está siendo auditada.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={kpiStyle}>
            <div style={kpiLabelStyle}>CASOS ACTIVOS</div>
            <div style={kpiValueStyle}>{stats.chats}</div>
          </div>
          <div style={kpiStyle}>
            <div style={kpiLabelStyle}>EVIDENCIAS (MSGS)</div>
            <div style={kpiValueStyle}>{stats.messages}</div>
          </div>
        </div>
      </div>

      {/* 2. ACCIONES RÁPIDAS (TARJETAS GRANDES) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        
        {/* Card: IMPORTAR */}
        <div onClick={onImport} style={{ ...actionCardStyle, borderColor: 'rgba(56, 189, 248, 0.3)' }} className="dashboard-card">
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '15px', borderRadius: '12px', color: '#38bdf8', marginBottom: '15px', width: 'fit-content' }}>
            <Icons.Import />
          </div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Importar Evidencia</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Procesar exportaciones .txt de WhatsApp (iOS/Android).</p>
        </div>

        {/* Card: NUEVA CARPETA */}
        <div onClick={onCreateFolder} style={{ ...actionCardStyle, borderColor: 'rgba(16, 185, 129, 0.3)' }} className="dashboard-card">
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '12px', color: '#34d399', marginBottom: '15px', width: 'fit-content' }}>
            <Icons.Folder />
          </div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Nuevo Caso / Carpeta</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Organizar evidencias en contenedores lógicos.</p>
        </div>

        {/* Card: BÚSQUEDA GLOBAL */}
        <div onClick={onSearch} style={{ ...actionCardStyle, borderColor: 'rgba(251, 191, 36, 0.3)' }} className="dashboard-card">
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '15px', borderRadius: '12px', color: '#fbbf24', marginBottom: '15px', width: 'fit-content' }}>
            <Icons.Search />
          </div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Inteligencia Global</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Buscar palabras clave en toda la base de datos.</p>
        </div>
      </div>

      {/* 3. ACTIVIDAD RECIENTE (TABLA) */}
      <div style={{ flex: 1, background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginTop: 0, fontSize: '14px', textTransform: 'uppercase', color: '#cbd5e1', borderBottom: '1px solid #334155', paddingBottom: '15px', display:'flex', alignItems:'center', gap:'10px' }}>
          <Icons.Clock /> Casos Recientes
        </h3>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {recents.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px', fontSize: '13px' }}>
              No hay actividad reciente. Comience importando un chat.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>Nombre del Caso</th>
                  <th style={{ padding: '10px' }}>Fecha Ingesta</th>
                  <th style={{ padding: '10px' }}>Integridad</th>
                  <th style={{ padding: '10px', textAlign:'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recents.map(chat => (
                  <tr key={chat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }} className="table-row">
                    <td style={{ padding: '15px 10px', fontWeight: '500', color: '#f1f5f9' }}>
                      {chat.name.replace(/^Chat de WhatsApp con /i, '')}
                    </td>
                    <td style={{ padding: '15px 10px', color: '#94a3b8' }}>
                      {new Date(chat.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '15px 10px' }}>
                      {chat.source_hash ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          <Icons.Shield /> SHA-256
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '11px' }}>Legacy</span>
                      )}
                    </td>
                    <td style={{ padding: '15px 10px', textAlign:'right' }}>
                      <button onClick={() => onOpenChat(chat)} style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', cursor: 'pointer', borderRadius: '4px', padding: '5px 10px', fontSize: '11px' }}>
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

      {/* FOOTER DE ESTADO */}
      <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: '#475569', justifyContent: 'center' }}>
        <span>🔒 ENCRIPTACIÓN AES-256: ACTIVA</span>
        <span>⚡ MOTOR FORENSE: LISTO</span>
        <span>☁️ CONEXIÓN CLOUD: OFF (ON-PREMISE)</span>
      </div>

      {/* Estilos para Hover (inyectados) */}
      <style>{`
        .dashboard-card { transition: transform 0.2s, background 0.2s; cursor: pointer; }
        .dashboard-card:hover { transform: translateY(-5px); background: #252f45 !important; }
        .table-row:hover { background: rgba(255,255,255,0.03); }
      `}</style>
    </div>
  );
}

// Estilos JS
const kpiStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px', minWidth: '120px' };
const kpiLabelStyle = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '5px' };
const kpiValueStyle = { fontSize: '24px', fontWeight: '700', color: '#f1f5f9' };

const actionCardStyle = { 
  background: '#1e293b', 
  border: '1px solid', 
  borderRadius: '16px', 
  padding: '25px',
  display: 'flex', 
  flexDirection: 'column', 
  justifyContent: 'center'
};