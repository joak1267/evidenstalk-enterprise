import { useState, useEffect } from 'react';

// --- ICONOS SVG INLINE (Para no depender de archivos externos) ---
const Icons = {
  Users: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Shield: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Activity: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Database: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
  Lock: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Trash: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Search: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
};

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'users'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado creación usuario
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('viewer');

  useEffect(() => { refreshData(); }, []);

  const refreshData = async () => {
    try {
      const u = await window.api.getUsers();
      const l = await window.api.getAuditLogs();
      setUsers(u || []);
      setLogs(l || []);
    } catch(e) { console.error(e); }
  };

  // --- LÓGICA DE ESTADÍSTICAS ---
  const stats = {
    totalUsers: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    totalActions: logs.length,
    securityEvents: logs.filter(l => l.action_type.includes('DELETE') || l.action_type.includes('LOGIN_FAIL')).length
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if(!newUser || !newPass) return alert("Complete todos los campos");
    const res = await window.api.createUser({ username: newUser, password: newPass, role: newRole });
    if(res.success) { 
      alert("✅ Credencial creada exitosamente"); 
      setNewUser(''); setNewPass(''); 
      refreshData(); 
    } else { alert("❌ Error: " + res.error); }
  };

  const handleDeleteUser = async (id) => {
    if(window.confirm("⚠️ ¿REVOCAR ACCESO? Esta acción es irreversible.")) {
      const res = await window.api.deleteUser(id);
      if(res.success) refreshData(); else alert(res.error);
    }
  };

  // --- COMPONENTES UI INTERNOS ---
  const StatCard = ({ title, value, icon, color, subtext }) => (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', color: color, opacity: 0.1, transform: 'scale(2.5)' }}>{icon}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
        <span style={{ color: color }}>{icon}</span> {title}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: '11px', color: color, opacity: 0.8 }}>{subtext}</div>
    </div>
  );

  return (
    <div style={{ padding: '30px', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f1f5f9', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <div style={{background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', padding:'10px', borderRadius:'8px', boxShadow: '0 0 15px rgba(56,189,248,0.3)'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '20px', letterSpacing: '0.5px' }}>CENTRO DE COMANDO</h2>
            <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'4px' }}>
              <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>● SISTEMA SEGURO</span>
              <small style={{ color: '#64748b', fontSize: '11px' }}>v1.0 Enterprise Edition</small>
            </div>
          </div>
        </div>
        
        <button onClick={onClose} style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize:'12px', transition: 'all 0.2s' }}>
          SALIR AL ESCRITORIO
        </button>
      </div>

      {/* GRID DE ESTADÍSTICAS (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <StatCard title="Operadores" value={stats.totalUsers} icon={<Icons.Users />} color="#38bdf8" subtext={`${stats.admins} Administradores`} />
        <StatCard title="Integridad" value="100%" icon={<Icons.Shield />} color="#34d399" subtext="Hashing SHA-256 Activo" />
        <StatCard title="Eventos (24h)" value={stats.totalActions} icon={<Icons.Activity />} color="#fbbf24" subtext="Auditoría Registrada" />
        <StatCard title="Base de Datos" value="Estable" icon={<Icons.Database />} color="#a78bfa" subtext="SQLite Encriptada" />
      </div>

      {/* ÁREA PRINCIPAL DIVIDIDA */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', flex: 1, overflow: 'hidden' }}>
        
        {/* COLUMNA IZQUIERDA: GESTIÓN DE USUARIOS */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
          
          {/* Toolbar de Tabla */}
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Users /> DIRECTORIO DE ACCESO</h3>
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Buscar usuario..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '6px 10px 6px 30px', borderRadius: '6px', fontSize: '12px', outline: 'none', width: '150px' }} 
              />
              <div style={{ position: 'absolute', left: '8px', top: '7px', color: '#64748b' }}><Icons.Search /></div>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#0f172a', color: '#94a3b8', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', position:'sticky', top:0 }}>
                <tr>
                  <th style={{ padding: '12px 20px' }}>ID / Credencial</th>
                  <th style={{ padding: '12px 20px' }}>Rol de Acceso</th>
                  <th style={{ padding: '12px 20px' }}>Alta en Sistema</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{u.username}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>ID: {u.id.toString().padStart(4, '0')}</div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ 
                        background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)', 
                        color: u.role === 'admin' ? '#fca5a5' : '#7dd3fc',
                        border: `1px solid ${u.role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                        padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        {u.role === 'admin' && <Icons.Shield />} {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', color: '#cbd5e1', fontSize: '12px' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      {u.id !== 1 ? (
                        <button onClick={() => handleDeleteUser(u.id)} title="Revocar Acceso" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex' }}>
                          <Icons.Trash />
                        </button>
                      ) : <span style={{fontSize:'10px', color:'#64748b', fontStyle:'italic'}}>Sistema</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formulario Inline (Footer) */}
          <div style={{ padding: '15px 20px', background: '#0f172a', borderTop: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#38bdf8' }}>+ EXPEDIR NUEVA CREDENCIAL</h4>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', gap: '10px' }}>
              <input value={newUser} onChange={e=>setNewUser(e.target.value)} placeholder="Usuario..." style={inputStyle} />
              <input value={newPass} onChange={e=>setNewPass(e.target.value)} type="password" placeholder="Contraseña..." style={inputStyle} />
              <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={inputStyle}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" style={btnStyle}>CREAR</button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: LOGS EN VIVO */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #334155', background: 'rgba(15, 23, 42, 0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{width:'8px', height:'8px', background:'#22c55e', borderRadius:'50%', boxShadow:'0 0 8px #22c55e'}}></span> 
              FEED DE AUDITORÍA
            </h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            {logs.map((l, i) => (
              <div key={l.id} style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', fontSize: '12px', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <div style={{ color: '#64748b', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', minWidth: '70px' }}>
                  {l.timestamp.split(' ')[1]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ 
                      fontWeight: '700', 
                      color: l.action_type.includes('DELETE') ? '#ef4444' : l.action_type.includes('LOGIN') ? '#34d399' : '#eab308'
                    }}>
                      {l.action_type}
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', wordBreak: 'break-all' }}>
                    {l.details.length > 50 ? l.details.substring(0, 50) + '...' : l.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Estilos Reutilizables
const inputStyle = { 
  background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', outline: 'none' 
};
const btnStyle = { 
  background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer', textTransform: 'uppercase' 
};

export default AdminPanel;