import React from 'react';
import { StarIcon, RobotIcon } from './Icons';

// Función auxiliar para resaltar texto
const escapeRegExp = (string) => string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

const resaltarSoloTexto = (texto, busqueda) => {
  if (!busqueda || !texto) return texto;
  try {
    const regex = new RegExp(`(${escapeRegExp(busqueda)})`, 'gi');
    return texto.split(regex).map((frag, i) => 
      frag.toLowerCase() === busqueda.toLowerCase() 
      ? <span key={i} className="highlight">{frag}</span> 
      : frag
    );
  } catch (error) { return texto; }
};

const procesarTexto = (texto, busqueda) => {
  if (!texto) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return texto.split(urlRegex).map((parte, i) => {
    if (parte.match(urlRegex)) return <a key={i} href={parte} target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8'}}>{resaltarSoloTexto(parte, busqueda)}</a>;
    return <span key={i}>{resaltarSoloTexto(parte, busqueda)}</span>;
  });
};

export default function MessageBubble({ msg, esMio, busqueda, onToggleEvidence, onTranscribe, procesandoAudio, transcripciones }) {
  return (
    // AQUÍ ESTÁ EL CAMBIO CLAVE: agregamos data-sender={msg.sender_name}
    <div 
      className={`message-bubble ${esMio ? 'sent' : 'received'} ${msg.is_evidence ? 'evidence' : ''}`}
      data-sender={msg.sender_name} 
    >
      <div className={`evidence-flag ${msg.is_evidence ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleEvidence(msg.id); }}>
        <StarIcon filled={msg.is_evidence} />
      </div>
      
      {/* Solo mostramos el nombre en pantalla si NO es mío, pero en impresión usaremos el data-sender para todos */}
      {!esMio && <div className="msg-sender">{msg.sender_name}</div>}

      {/* --- MEDIA RENDERING --- */}
      {msg.media_type === 'image' && msg.local_media_path && (
        <img src={`file://${msg.local_media_path}`} style={{width: '100%', borderRadius: 8, cursor: 'pointer'}} onClick={() => window.open(`file://${msg.local_media_path}`)} loading="lazy"/>
      )}

      {msg.media_type === 'audio' && msg.local_media_path && (
        <div style={{marginBottom: 5, minWidth: 260}}>
          <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            <audio controls style={{height: 35, flex: 1}}><source src={`file://${msg.local_media_path}`} /></audio>
            <button className="action-btn-icon" onClick={() => onTranscribe(msg.id, msg.local_media_path)}>
              {procesandoAudio === msg.id ? <span className="spin">⚙️</span> : <RobotIcon />}
            </button>
          </div>
          {transcripciones[msg.id] && <div className="transcription-box">{transcripciones[msg.id]}</div>}
        </div>
      )}

      {msg.media_type === 'document' && msg.local_media_path && (
        <div className="document-card" onClick={() => window.open(`file://${msg.local_media_path}`)}>
          <div className="doc-icon">📄</div>
          <div className="doc-info"><span className="doc-name">{msg.local_media_path.split('/').pop()}</span></div>
        </div>
      )}

      {msg.media_type === 'video' && msg.local_media_path && (
        <div style={{marginBottom: 5}}>
          <video controls style={{maxWidth: '100%', borderRadius: 6}}><source src={`file://${msg.local_media_path}`} /></video>
        </div>
      )}

      {/* --- TEXT RENDERING --- */}
      <div>{procesarTexto(msg.content_text, busqueda)}</div>
      <span className="msg-time">{msg.timestamp.split(' ')[1]}</span>
    </div>
  );
}