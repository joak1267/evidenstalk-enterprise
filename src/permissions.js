// src/permissions.js

export const PLAN_FEATURES = {
  comunidad: {
    name: 'Comunidad',
    canExportPDF: false,
    canGenerateHashes: false,
    canCreateSubfolders: false, // 🔒 Bloqueo de Subcarpetas
    canTranscribe: false,       // 🔒 Bloqueo de IA Transcripción
    canViewHash: false,         // 🔒 Bloqueo visual del Hash en la interfaz
    canUseWhiteLabel: false,
    maxMessages: 15000,
    theme: { bg: '#1e293b', text: '#cbd5e1', border: '1px solid #334155', badgeBg: '#334155' }
  },
  pericial: {
    name: 'Pericial',
    canExportPDF: true,
    canGenerateHashes: true,
    canCreateSubfolders: true,  // ✅ Desbloqueado
    canTranscribe: true,        // ✅ Desbloqueado
    canViewHash: true,          // ✅ Desbloqueado
    canUseWhiteLabel: false,
    maxMessages: Infinity,
    theme: { bg: '#0f172a', text: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', badgeBg: 'rgba(56, 189, 248, 0.2)' }
  },
  institucional: {
    name: 'Institucional',
    canExportPDF: true,
    canGenerateHashes: true,
    canCreateSubfolders: true,  // ✅ Desbloqueado
    canTranscribe: true,        // ✅ Desbloqueado
    canViewHash: true,          // ✅ Desbloqueado
    canUseWhiteLabel: true,     // ✅ Función estrella desbloqueada
    maxMessages: Infinity,
    theme: { bg: '#0a0f1d', text: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.4)', badgeBg: 'rgba(99, 102, 241, 0.2)' }
  }
};

export const getPlanFeatures = (planName) => {
  let normalizedPlan = (planName || 'comunidad').toLowerCase();
  
  // Si el usuario es 'admin', le otorgamos todo el poder del plan Institucional
  if (normalizedPlan === 'admin') {
    normalizedPlan = 'institucional';
  }

  return PLAN_FEATURES[normalizedPlan] || PLAN_FEATURES['comunidad'];
};