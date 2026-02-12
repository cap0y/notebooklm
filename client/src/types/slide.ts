/** 슬라이드 요소 타입 (Gemini AI + 기본 모드 공용) */
export enum ElementType {
  Text = 'text',
  Shape = 'shape',
  Image = 'image',
}

/** 슬라이드 내 개별 요소 (텍스트/도형/이미지) */
export interface SlideElement {
  type: ElementType
  x: number // percentage 0-100
  y: number // percentage 0-100
  w: number // percentage 0-100
  h: number // percentage 0-100
  content?: string
  color?: string
  bgColor?: string
  fontSize?: number
  shapeType?: 'rect' | 'ellipse' | 'line'
  align?: 'left' | 'center' | 'right'
  bold?: boolean
}

/** 슬라이드 분석 결과 (AI 또는 기본 모드) */
export interface SlideData {
  index: number
  backgroundColor: string
  elements: SlideElement[]
  originalImageBase64: string // full data URL 또는 raw base64
  mode?: 'ai' | 'basic' // PPTX 생성 전략 구분
}

