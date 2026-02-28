import React, { memo, useState, useRef, useEffect } from 'react';
import { StarIcon, RobotIcon } from './Icons';

// --- UTILIDADES ---
const escapeRegExp = (string) => string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
const resaltarSoloTexto = (texto, busqueda) => {
  if (!busqueda || !texto) return texto;
  try {
    const regex = new RegExp(`(${escapeRegExp(busqueda)})`, 'gi');
    return texto.split(regex).map((frag, i) => frag.toLowerCase() === busqueda.toLowerCase() ? <span key={i} style={{backgroundColor:'#f59e0b', color:'black', padding:'0 2px', borderRadius:'2px'}}>{frag}</span> : frag);
  } catch (error) { return texto; }
};
const procesarTexto = (texto, busqueda) => {
  if (!texto) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return texto.split(urlRegex).map((parte, i) => {
    if (parte.match(urlRegex)) return <a key={i} href={parte} target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration:'none', fontWeight:'500'}}>{resaltarSoloTexto(parte, busqueda)}</a>;
    return <span key={i}>{resaltarSoloTexto(parte, busqueda)}</span>;
  });
};

// --- COMPONENTE: REPRODUCTOR DE AUDIO PIXEL PERFECT ---
const CustomAudioPlayer = ({ src, msgId, onTranscribe, isTranscribing, transcription, esMio }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true); 
  const [audioError, setAudioError] = useState(false); 

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => {
      if (audio.duration === Infinity || isNaN(audio.duration)) return;
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    
    const updateDuration = () => {
      if (audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const onError = () => {
      setAudioError(true);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || audioError) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || audioError || audioRef.current.duration === Infinity) return;
    const seekTo = (e.target.value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTo;
    setProgress(e.target.value);
    setCurrentTime(seekTo);
  };

  const handleSpeedChange = () => {
    if (!audioRef.current || audioError) return;
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    audioRef.current.playbackRate = nextSpeed;
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60); const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const iconColor = esMio ? '#ffffff' : '#94a3b8';
  const sliderColor = esMio ? '#ffffff' : '#38bdf8';
  const bgPlayer = esMio ? 'rgba(0,0,0,0.1)' : 'rgba(15, 23, 42, 0.4)';
  const pillColor = esMio ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';

  if (audioError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '12px', color: '#fca5a5', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        ⚠️ Archivo de audio no disponible o dañado
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '300px', maxWidth: '100%', marginBottom: '8px' }}>
      <audio ref={audioRef} src={src} preload="auto" />
      
      {/* --- REPRODUCTOR UI (DISEÑO DOBLE PISO) --- */}
      <div style={{ background: bgPlayer, padding: '10px 12px 8px 12px', borderRadius: '12px' }}>
        
        {/* PISO 1: Controles y Slider Centrados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Botón Play */}
          <button onClick={togglePlay} style={{ width: '32px', height: '32px', flexShrink: 0, background: 'transparent', color: iconColor, border: 'none', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e=>e.currentTarget.style.transform='scale(0.9)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
            {isPlaying ? 
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : 
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          
          {/* Barra de Progreso (Ahora 100% alineada al medio del Play) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <input type="range" min="0" max="100" value={progress} onChange={handleSeek} 
              style={{ width: '100%', height: '4px', accentColor: sliderColor, cursor: 'pointer', margin: 0, outline: 'none', opacity: 0.9 }} />
          </div>

          {/* Botón Velocidad */}
          <button onClick={handleSpeedChange} style={{ width: '36px', height: '24px', flexShrink: 0, background: pillColor, border: 'none', borderRadius: '12px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: iconColor, fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background=esMio?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.2)'} onMouseLeave={e=>e.currentTarget.style.background=pillColor}>
            {speed}x
          </button>
        </div>

        {/* PISO 2: Tiempos justos por debajo de la barra */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '44px', paddingRight: '48px', marginTop: '4px', fontSize: '10px', color: esMio ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: '500' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* --- TRANSCRIPCIÓN CON ACORDEÓN --- */}
      <div style={{ marginTop: '8px', paddingLeft: '4px' }}>
        {!transcription && !isTranscribing && (
          <div onClick={() => onTranscribe(msgId, src.replace('evidens://', ''))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: esMio ? '#e0f2fe' : '#38bdf8', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s', fontWeight: '600' }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.8}>
            <span style={{fontSize:'14px'}}>✨</span> Transcribir Audio con IA
          </div>
        )}

        {isTranscribing && (
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8', fontStyle:'italic' }}>
             <div style={{width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.2)', borderTopColor: '#38bdf8', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
             Analizando audio...
           </div>
        )}

        {/* CONTENEDOR EXPANDIBLE (ACORDEÓN) */}
        {transcription && (
          <div style={{ marginTop:'5px', background: esMio ? 'rgba(0,0,0,0.1)' : 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', borderLeft: `3px solid ${sliderColor}`, overflow: 'hidden' }}>
            
            {/* Header Clickable con Flechita */}
            <div onClick={() => setIsExpanded(!isExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: esMio ? 'rgba(255,255,255,0.8)' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{fontSize:'14px'}}>✨</span> Transcripción IA
              </span>
              <span style={{ fontSize: '10px', color: esMio ? 'rgba(255,255,255,0.5)' : '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                ▼
              </span>
            </div>

            {/* Texto de la transcripción */}
            {isExpanded && (
              <div style={{ padding: '0 12px 10px 12px', fontSize: '13px', color: esMio ? '#fff' : '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderTop: `1px solid ${esMio ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.1)'}`, paddingTop: '8px' }}>
                {transcription}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MessageBubble = ({ msg, esMio, busqueda, onToggleEvidence, onTranscribe, procesandoAudio, transcripciones }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleOpenLocalFile = (path) => {
    window.open(path.replace('evidens://', 'file:///'));
  };

  return (
    <div className={`message-bubble ${esMio ? 'sent' : 'received'} ${msg.is_evidence ? 'evidence' : ''}`} data-sender={msg.sender_name}>
      
      <div className={`evidence-flag ${msg.is_evidence ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleEvidence(msg.id); }}>
        <StarIcon filled={msg.is_evidence} />
      </div>
      
      {!esMio && <div className="msg-sender">{msg.sender_name}</div>}

      {/* --- IMAGEN CON RECORTE Y LIGHTBOX PREMIUM --- */}
      {msg.media_type === 'image' && msg.local_media_path && (
        <>
          <div style={{ 
            overflow: 'hidden', 
            borderRadius: '8px', 
            marginBottom: msg.content_text ? '8px' : '0', 
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
             <img 
               src={msg.local_media_path} 
               onClick={() => setIsLightboxOpen(true)} 
               loading="lazy" 
               style={{
                 maxWidth: '100%', 
                 maxHeight: '320px', 
                 objectFit: 'cover', 
                 display: 'block', 
                 cursor: 'zoom-in', 
                 transition:'transform 0.2s'
               }} 
               onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} 
               onMouseLeave={e=>e.currentTarget.style.transform='scale(1.0)'} 
             />
          </div>
          
          {isLightboxOpen && (
            <div onClick={() => setIsLightboxOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease-out' }}>
              
              {/* 🔥 ACÁ ESTÁ EL BOTÓN PREMIUM INYECTADO 🔥 */}
              <button 
                style={{ position: 'absolute', top: '25px', right: '30px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#f1f5f9', fontSize: '20px', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'all 0.2s', zIndex: 100000 }} 
                onMouseEnter={e => {e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'; e.currentTarget.style.borderColor = '#ef4444';}} 
                onMouseLeave={e => {e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';}}>
                ✕
              </button>

              <img src={msg.local_media_path} style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 5px 30px rgba(0,0,0,0.5)', animation: 'zoomIn 0.2s ease-out' }} onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </>
      )}

      {/* AUDIO PLAYER */}
      {msg.media_type === 'audio' && msg.local_media_path && (
        <CustomAudioPlayer src={msg.local_media_path} msgId={msg.id} onTranscribe={onTranscribe} isTranscribing={procesandoAudio === msg.id} transcription={transcripciones[msg.id]} esMio={esMio} />
      )}

      {/* DOCUMENTOS */}
      {msg.media_type === 'document' && msg.local_media_path && (
        <div className="document-card" onClick={() => handleOpenLocalFile(msg.local_media_path)} style={{marginBottom: msg.content_text ? '8px' : '0'}}>
          <div className="doc-icon" style={{fontSize:'20px'}}>📄</div>
          <div className="doc-info" style={{overflow:'hidden'}}><span className="doc-name" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block'}}>{msg.local_media_path.split(/[/\\]/).pop()}</span></div>
        </div>
      )}

      {/* VIDEO */}
      {msg.media_type === 'video' && msg.local_media_path && (
        <div style={{marginBottom: msg.content_text ? '8px' : '0', borderRadius:'8px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)'}}>
          <video controls style={{width: '100%', maxHeight: '350px', display:'block', background:'black'}}><source src={msg.local_media_path} /></video>
        </div>
      )}

      {/* TEXTO */}
      {msg.content_text && <div style={{wordBreak:'break-word', whiteSpace: 'pre-wrap'}}>{procesarTexto(msg.content_text, busqueda)}</div>}
      
      <span className="msg-time" style={{ opacity: 0.7, fontSize: '10px', alignSelf: 'flex-end', marginTop: '4px', display:'block' }}>
        {msg.timestamp && msg.timestamp.includes(' ') ? msg.timestamp.split(' ')[1].split(':').slice(0,2).join(':') : ''}
      </span>
    </div>
  );
};

const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.is_evidence === nextProps.msg.is_evidence &&
    prevProps.busqueda === nextProps.busqueda &&
    prevProps.procesandoAudio === nextProps.procesandoAudio &&
    prevProps.transcripciones[prevProps.msg.id] === nextProps.transcripciones[nextProps.msg.id]
  );
};

export default memo(MessageBubble, arePropsEqual);