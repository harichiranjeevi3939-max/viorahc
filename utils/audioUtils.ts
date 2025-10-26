// The type for the media blob expected by the Gemini Live API
interface GeminiMediaBlob {
  data: string; // base64 encoded string
  mimeType: string;
}

// This function decodes a base64 string into a Uint8Array of bytes.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// This function encodes a Uint8Array of bytes into a base64 string.
export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// This function decodes raw PCM audio data into an AudioBuffer the browser can play.
// The Gemini TTS API returns audio at a 24000 sample rate with 1 channel.
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  // The raw data is 16-bit signed integers.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize the 16-bit signed integer to a float between -1.0 and 1.0
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// This function creates a media blob for the Gemini Live API from raw audio data.
export function createBlob(data: Float32Array): GeminiMediaBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Convert float32 from -1.0 to 1.0 to int16 from -32768 to 32767
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    // The supported audio MIME type is 'audio/pcm' with a 16000 sample rate.
    mimeType: 'audio/pcm;rate=16000',
  };
}