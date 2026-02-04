import { Router } from 'express';
import multer from 'multer';
import { VoiceService } from '../services/voiceService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const voiceService = new VoiceService(process.env.ELEVENLABS_API_KEY || '');

// Text-to-Speech
router.post('/tts', async (req, res) => {
  try {
    const { text, voice_id } = req.body;

    if (!text) {
      return res.status(400).json({ detail: 'text is required' });
    }

    const audioBuffer = await voiceService.textToSpeech(text, voice_id);
    const audioBase64 = audioBuffer.toString('base64');

    res.json({
      audio_url: `data:audio/mpeg;base64,${audioBase64}`,
      text,
      voice_id: voice_id || 'ErXwobaYiN019PkySvjV'
    });
  } catch (error) {
    res.status(500).json({ detail: `Error generating TTS: ${error}` });
  }
});

// Speech-to-Text (placeholder - requires ElevenLabs API)
router.post('/stt', upload.single('audio_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'audio_file is required' });
    }

    // Note: ElevenLabs STT implementation would go here
    // For now, return placeholder response
    res.json({
      transcribed_text: 'Speech-to-text transcription would appear here',
      filename: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ detail: `Error transcribing audio: ${error}` });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    const voices = await voiceService.getVoices();
    res.json({ voices });
  } catch (error) {
    res.status(500).json({ detail: `Error fetching voices: ${error}` });
  }
});

export default router;