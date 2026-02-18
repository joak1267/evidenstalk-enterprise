import { useState, useEffect } from 'react';

// Iconos SVG integrados para no depender de archivos externos
const LockIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

function Activation({ onActivationSuccess }) {
  const [hwid, setHwid] = useState('OBTENIENDO ID...');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Obtener el ID de la máquina al montar
    window.api.getHWID().then(id => setHwid(id));
  }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Pequeña simulación de conexión segura
    await new Promise(r => setTimeout(r, 800));

    try {
      const res = await window.api.activateLicense(licenseKey);
      if (res.success) {
        onActivationSuccess();
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError("Error de comunicación con el núcleo de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  const copiarID = () => {
    navigator.clipboard.writeText(hwid);
    alert("ID de Hardware copiado al portapapeles");
  };

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: '#0f172a', // Tu fondo Slate 900
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#f1f5f9', fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        width: '500px', padding: '40px',
        background: '#1e293b', // Tu panel Slate 800
        borderRadius: '16px',
        border: '1px solid #334155', // Borde sutil
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Barra superior decorativa (Cyber Accent) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', 
          background: 'linear-gradient(90deg, #38bdf8, #818cf8)'
        }}></div>

        {/* Icono de Candado */}
        <div style={{ 
          marginBottom: '20px', display: 'inline-flex', padding: '15px', 
          borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' 
        }}>
          <LockIcon />
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '700', color: '#f1f5f9' }}>
          Activación de Producto
        </h2>
        <p style={{ margin: '0 0 30px 0', color: '#94a3b8', fontSize: '13px', lineHeight: '1.5' }}>
          Esta instalación de <strong>eVidensTalk Enterprise</strong> requiere una licencia válida vinculada a este hardware.
        </p>

        {/* CAJA DE HWID (Fingerprint) */}
        <div style={{ 
          background: '#0f172a', padding: '15px', borderRadius: '8px', 
          border: '1px dashed #334155', marginBottom: '25px', textAlign: 'left' 
        }}>
          <label style={{ 
            fontSize: '10px', color: '#38bdf8', fontWeight: '700', 
            textTransform: 'uppercase', display: 'block', marginBottom: '8px' 
          }}>
            ID DE HARDWARE (FINGERPRINT)
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <code style={{ 
              flex: 1, fontFamily: "'JetBrains Mono', monospace", 
              color: '#cbd5e1', fontSize: '13px', letterSpacing: '0.5px',
              wordBreak: 'break-all'
            }}>
              {hwid}
            </code>
            <button onClick={copiarID} style={{ 
              background: '#334155', color: 'white', border: 'none', 
              borderRadius: '6px', padding: '6px 12px', fontSize: '11px', 
              cursor: 'pointer', fontWeight: '600', transition: '0.2s' 
            }}>
              COPIAR
            </button>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleActivate} style={{textAlign: 'left'}}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
            CLAVE DE LICENCIA ENTERPRISE
          </label>
          
          <input 
            value={licenseKey} 
            onChange={e => setLicenseKey(e.target.value.toUpperCase())} // Auto mayúsculas
            placeholder="XXXX-XXXX-XXXX-XXXX"
            style={{ 
              width: '100%', padding: '14px', 
              background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
              color: '#38bdf8', fontSize: '16px', textAlign: 'center', 
              letterSpacing: '2px', outline: 'none', fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '20px',
              boxSizing: 'border-box'
            }}
            // Efecto focus simple
            onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
            onBlur={(e) => e.target.style.borderColor = '#334155'}
          />
          
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '20px', textAlign: 'center' 
            }}>
              ⛔ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '14px', 
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', // Gradiente azul oficial
              color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase',
              boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'VALIDANDO CRIPTOGRAFÍA...' : 'ACTIVAR LICENCIA'}
          </button>
        </form>

        <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px', fontSize: '11px', color: '#64748b' }}>
          Protegido por DRM de Hardware. <br/>
          Soporte: <span style={{color: '#38bdf8'}}>soporte@evidenstalk.com</span>
        </div>
      </div>
    </div>
  );
}

export default Activation;