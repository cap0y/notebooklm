/**
 * Base64 문자열을 Uint8Array로 변환
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Gemini TTS에서 반환된 원시 PCM 데이터를 AudioBuffer로 디코딩
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer)
  const frameCount = dataInt16.length / numChannels
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate)

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    for (let i = 0; i < frameCount; i++) {
      // Int16 → Float32 [-1.0, 1.0] 변환
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0
    }
  }
  return buffer
}

/**
 * 여러 오디오 버퍼를 하나로 병합 (연결)
 */
export function mergeAudioBuffers(ctx: AudioContext, buffers: AudioBuffer[]): AudioBuffer | null {
  if (buffers.length === 0) return null

  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0)
  const result = ctx.createBuffer(buffers[0].numberOfChannels, totalLength, buffers[0].sampleRate)

  let offset = 0
  for (const buff of buffers) {
    for (let channel = 0; channel < buff.numberOfChannels; channel++) {
      result.getChannelData(channel).set(buff.getChannelData(channel), offset)
    }
    offset += buff.length
  }
  return result
}

