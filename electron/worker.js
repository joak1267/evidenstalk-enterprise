const { parentPort, workerData } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const wavefile = require('wavefile');

// Recibimos la ruta de ffmpeg desde el hilo principal para evitar errores de rutas
if (workerData && workerData.ffmpegPath) {
  ffmpeg.setFfmpegPath(workerData.ffmpegPath);
}

// Función para convertir audio
const convertToWav = (inputPath, tempPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => resolve(tempPath))
      .on('error', (err) => reject(err))
      .save(tempPath);
  });
};

// Función principal del Worker
const runTranscription = async () => {
  try {
    const { filePath, tempPath } = workerData;

    // 🔥 FIX CRÍTICO: Importación dinámica para esquivar el error de "ES Module no soportado"
    const transformers = await import('@xenova/transformers');
    const pipeline = transformers.pipeline || transformers.default.pipeline;

    // 1. CARGA DEL MODELO MEJORADO
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
      quantized: true 
    });

    // 2. Convertir audio
    await convertToWav(filePath, tempPath);

    // 3. Leer audio procesado
    const buffer = fs.readFileSync(tempPath);
    const wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth('32f');
    const audioData = wav.getSamples();
    const input = Array.isArray(audioData) ? audioData[0] : audioData;

    // 4. Transcribir
    const output = await transcriber(input, {
      language: 'spanish',
      task: 'transcribe',
      chunk_length_s: 30, 
      stride_length_s: 5,
      return_timestamps: false 
    });

    // 5. Enviar resultado y borrar temporal
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    
    parentPort.postMessage({ success: true, text: output.text.trim() });

  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
};

runTranscription();