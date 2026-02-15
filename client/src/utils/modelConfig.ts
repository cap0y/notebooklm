/**
 * Gemini AI 모델 설정 유틸리티
 *
 * 3단계 모델 티어를 제공하여 사용자가 비용과 성능을 직접 조절할 수 있게 합니다.
 * 설정은 localStorage에 저장되어 브라우저를 닫아도 유지됩니다.
 *
 * ── 모델 비용 비교 (대략적인 입력 기준) ──
 * 경제적 (gemini-2.0-flash)      : ~$0.10 / 1M 토큰  ← 가장 저렴
 * 표준   (gemini-2.5-flash)      : ~$0.15 / 1M 토큰  ← 기본값, 균형
 * 고성능 (gemini-2.5-pro)        : ~$1.25 / 1M 토큰  ← 10배 이상 비쌈
 *
 * TTS 모델은 대안이 없으므로 항상 gemini-2.5-flash-preview-tts 사용
 */

export type ModelTier = 'economy' | 'standard' | 'premium'

export interface ModelConfig {
  tier: ModelTier
  /** 텍스트/이미지 분석용 모델 */
  textModel: string
  /** TTS 음성 합성용 모델 (변경 불가) */
  ttsModel: string
  /** UI에 표시할 라벨 */
  label: string
  /** 비용 설명 */
  costLabel: string
  /** 색상 */
  color: string
}

/** 모델 티어별 상세 설정 */
export const MODEL_TIERS: Record<ModelTier, ModelConfig> = {
  economy: {
    tier: 'economy',
    textModel: 'gemini-2.0-flash',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    label: '경제적',
    costLabel: '비용 최소 · 기본 분석에 적합',
    color: 'emerald',
  },
  standard: {
    tier: 'standard',
    textModel: 'gemini-2.5-flash',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    label: '표준 (추천)',
    costLabel: '성능과 비용의 균형',
    color: 'blue',
  },
  premium: {
    tier: 'premium',
    textModel: 'gemini-2.5-pro',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    label: '고성능',
    costLabel: '최고 품질 · 비용 10배↑ 주의',
    color: 'amber',
  },
}

const STORAGE_KEY = 'gemini_model_tier'

/** 저장된 모델 티어 가져오기 (기본값: standard) */
export const getModelTier = (): ModelTier => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (saved === 'economy' || saved === 'standard' || saved === 'premium')) {
      return saved as ModelTier
    }
  } catch {
    // localStorage 접근 불가 시 기본값
  }
  return 'standard'
}

/** 모델 티어 저장 */
export const setModelTier = (tier: ModelTier): void => {
  try {
    localStorage.setItem(STORAGE_KEY, tier)
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

/** 현재 설정된 모델 설정 가져오기 */
export const getCurrentModelConfig = (): ModelConfig => {
  return MODEL_TIERS[getModelTier()]
}

/** 텍스트/이미지 분석용 모델명 가져오기 */
export const getTextModel = (): string => {
  return getCurrentModelConfig().textModel
}

/** TTS 모델명 가져오기 */
export const getTtsModel = (): string => {
  return getCurrentModelConfig().ttsModel
}


