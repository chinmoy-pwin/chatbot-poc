import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';

export class VoiceService {
  private client: ElevenLabsClient;

  constructor(apiKey: string) {
    this.client = new ElevenLabsClient({ apiKey });
  }

  async textToSpeech(text: string, voiceId: string = 'ErXwobaYiN019PkySvjV'): Promise<Buffer> {
    try {
      const audio = await this.client.generate({
        voice: voiceId,
        text: text,
        model_id: 'eleven_multilingual_v2'
      });

      // Convert audio stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`TTS failed: ${error}`);
    }
  }

  async getVoices() {
    try {
      const voices = await this.client.voices.getAll();
      return voices.voices.map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name
      }));
    } catch (error) {
      // Return default voice if API fails
      return [{ voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Default)' }];
    }
  }
}