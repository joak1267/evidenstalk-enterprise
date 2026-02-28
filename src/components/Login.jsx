import { useState } from 'react';
import logoImage from '../assets/logo-clean.png'; 
import { supabase } from '../supabase';

const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const EyeOffIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;

function Login({ onLoginSuccess }) {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [terminalId] = useState(() => Math.random().toString(36).substr(2, 8).toUpperCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!identificador.trim() || !password.trim()) {
      setError("Por favor, ingrese su correo y su clave de acceso.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('plan, email, password') 
        .eq('email', identificador.trim().toLowerCase()) 
        .single();

      if (supabaseError || !data) {
        setError("Acceso denegado: Licencia no encontrada para este correo.");
        setLoading(false);
        return;
      }

      if (data.password !== password) {
        setError("Clave de acceso incorrecta. Acceso denegado.");
        setLoading(false);
        return;
      }

      const planDelUsuario = data.plan || 'comunidad';
      
      // Guardamos para uso cosmético
      localStorage.setItem('emailUsuario', data.email);

      // --- REGLA DE SEGURIDAD ESTRICTA PARA EL PANEL ADMIN ---
      const esAdmin = data.email === 'evidenstalk@gmail.com';

      const usuarioCombinado = {
        id: 1,
        username: data.email, 
        name: data.email,
        role: esAdmin ? 'admin' : 'user', // Solo este correo será admin, el resto 'user'
        plan: planDelUsuario 
      };
      
      onLoginSuccess(usuarioCombinado);

    } catch (err) {
      setError("Error de conexión con el núcleo o servidor de licencias.");
    } finally {
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
        width: '360px', padding: '30px 35px', background: '#1e293b', borderRadius: '16px',
        border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.1)',
        textAlign: 'center', WebkitAppRegion: 'no-drag', cursor: 'default'
      }}>
        <img src={logoImage} alt="Logo eVidensTalk" style={{ width: '140px', height: 'auto', marginBottom: '10px', filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.4))'}} />
        <h2 style={{ margin: '0 0 4px 0', fontSize: '19px', fontWeight: '700' }}>eVidensTalk Enterprise</h2>
        <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '11px', letterSpacing: '1px' }}>ACCESO RESTRINGIDO - AUDITORÍA ACTIVA</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600', marginLeft: '4px' }}>CORREO DE LICENCIA</label>
            <input type="text" value={identificador} onChange={(e) => setIdentificador(e.target.value)} placeholder="tu@estudio.com" autoFocus
              style={{ width: '100%', padding: '10px', marginTop: '4px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600', marginLeft: '4px' }}>CLAVE DE ACCESO</label>
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', padding: '10px', paddingRight: '40px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '11px', margin: '5px 0' }}>⚠️ {error}</div>}

          <button type="submit" disabled={loading}
            style={{ marginTop: '8px', padding: '12px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'VERIFICANDO LICENCIA...' : 'INICIAR SESIÓN SEGURA'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '9px', color: '#64748b' }}>
          ID DE TERMINAL: {terminalId} <br/>SISTEMA PROTEGIDO POR LEY DE PROPIEDAD INTELECTUAL
        </div>
      </div>
    </div>
  );
}

export default Login;