/** PDF에서 추출한 텍스트 항목 */
export interface TextItem {
  text: string
  x: number // PDF 좌표계 기준
  y: number
  width: number
  height: number
  fontSize: number
  fontName?: string
}

/** 변환된 PDF 페이지 이미지 */
export interface ConvertedPage {
  pageNumber: number
  dataUrl: string
  width: number
  height: number
  textItems?: TextItem[] // PDF에서 추출한 텍스트 정보 (PPT 변환 시 사용)
}

/** OCR 인식 결과 */
export interface OcrResult {
  text: string
  confidence: number
  region: {
    x: number
    y: number
    width: number
    height: number
  }
}
