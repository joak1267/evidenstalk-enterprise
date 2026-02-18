import { useState } from 'react';
// Asegurate de que el nombre coincida con el archivo que descargaste (logo-clean.png o similar)
import logoImage from '../assets/logo-clean.png'; 

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ID de terminal persistente por sesión
  const [terminalId] = useState(() => Math.random().toString(36).substr(2, 8).toUpperCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.login({ username, password });
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error);
        setLoading(false); 
      }
    } catch (err) {
      setError("Error de conexión con el núcleo");
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, height: '100vh', width: '100vw',
      background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#f1f5f9', fontFamily: "'Inter', sans-serif", zIndex: 99999, WebkitAppRegion: 'drag'
    }}>
      
      <div style={{
        width: '360px', 
        padding: '30px 35px', // Padding equilibrado para que no sobre espacio
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.1)',
        textAlign: 'center',
        WebkitAppRegion: 'no-drag',
        cursor: 'default'
      }}>
        
        <img 
          src={logoImage} 
          alt="Logo eVidensTalk" 
          style={{ 
            width: '140px', // Como no tiene aire, 140px ya es un tamaño imponente
            height: 'auto',
            marginTop: '0',    // Ya no necesita valores negativos
            marginBottom: '10px', // Espacio real y controlado hasta el texto
            filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.4))'
          }} 
        />
        
        <h2 style={{ margin: '0 0 4px 0', fontSize: '19px', fontWeight: '700' }}>eVidensTalk Enterprise</h2>
        <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '11px', letterSpacing: '1px' }}>
            ACCESO RESTRINGIDO - AUDITORÍA ACTIVA
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600', marginLeft: '4px' }}>OPERADOR (ID)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              style={{
                width: '100%', padding: '10px', marginTop: '4px',
                background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600', marginLeft: '4px' }}>CLAVE DE ACCESO</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px', marginTop: '4px',
                background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '11px', margin: '5px 0' }}>
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: '8px', padding: '12px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '14px', cursor: 'pointer'
            }}
          >
            {loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN SEGURA'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '9px', color: '#64748b' }}>
          ID DE TERMINAL: {terminalId} <br/>
          SISTEMA PROTEGIDO POR LEY DE PROPIEDAD INTELECTUAL
        </div>
      </div>
    </div>
  );
}

export default Login;