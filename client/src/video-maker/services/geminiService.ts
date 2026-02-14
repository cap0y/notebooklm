import { GoogleGenAI, Type } from '@google/genai'
import { VoiceName, ScriptLevel } from '../types'

/**
 * Gemini API Key를 가져오는 헬퍼
 * PDF 변환 페이지에서 저장한 localStorage 키 → 환경변수 순서로 확인
 */
const getApiKey = (): string => {
  // PDF 변환 페이지에서 저장한 API Key를 우선 사용
  const fromStorage = localStorage.getItem('gemini_api_key')
  if (fromStorage) return fromStorage

  // .env에 GEMINI_API_KEY가 설정되어 있으면 사용
  const fromEnv = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || ''
  return fromEnv
}

/**
 * AI 응답에서 JSON 마커를 제거하는 클리너
 */
const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json\s?|```/g, '').trim()
}

/**
 * 슬라이드 이미지를 분석하여 나레이션 대본과 자막을 생성
 */
export const generateSlideScript = async (
  base64Image: string,
  level: ScriptLevel,
): Promise<{ script: string; subtitle: string }> => {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  const ai = new GoogleGenAI({ apiKey })

  try {
    let audiencePrompt = '일반 대중'
    switch (level) {
      case 'expert':
        audiencePrompt = '해당 분야의 전문가 (전문 용어 사용, 정확하고 간결한 문체)'
        break
      case 'university':
        audiencePrompt = '대학생 (학술적이고 정보를 전달하는 어조)'
        break
      case 'elementary':
        audiencePrompt = '초등학생 (쉽고 친근하며 이해하기 쉬운 단어 사용)'
        break
      case 'senior':
        audiencePrompt = '어르신 (존댓말 사용, 이해하기 쉽고 천천히 읽히는 문체)'
        break
    }

    const prompt = `이 이미지를 시각적으로 분석하여 ${audiencePrompt}을(를) 대상으로 한 매력적인 한국어 프레젠테이션 나레이션 대본을 작성해 주세요. 
    최대 3문장 이내의 구어체로 작성해야 합니다. 
    반드시 다음 JSON 형식을 엄격히 지켜주세요:
    {
      "script": "슬라이드 내용을 설명하는 전체 나레이션 텍스트",
      "subtitle": "화면 하단에 표시될 짧은 요약 자막 (한 줄)"
    }`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            subtitle: { type: Type.STRING },
          },
          required: ['script', 'subtitle'],
        },
      },
    })

    const rawText = response.text
    if (!rawText) throw new Error('Empty response')

    const cleanText = cleanJsonResponse(rawText)
    const result = JSON.parse(cleanText)

    return {
      script: result.script || '대본을 생성할 수 없습니다.',
      subtitle: result.subtitle || '자막 없음',
    }
  } catch (error) {
    console.error('Gemini Script Error:', error)
    throw error
  }
}

/**
 * 텍스트를 Gemini TTS로 음성 변환하여 Base64 오디오 데이터 반환
 */
export const generateSpeech = async (text: string, voiceName: VoiceName): Promise<string | null> => {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  const ai = new GoogleGenAI({ apiKey })

  try {
    const cleanText = text.trim()
    if (!cleanText || cleanText.includes('분석 중') || cleanText.startsWith('오류')) return null

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO' as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    })

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null
  } catch (error) {
    console.error('Gemini TTS Error:', error)
    throw error
  }
}

