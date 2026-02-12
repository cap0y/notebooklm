import { create } from 'zustand'
import type { SlideData } from '../types/slide'

/** PDF에서 추출한 텍스트 항목 */
export interface TextItem {
  text: string
  x: number // Canvas 좌표 (픽셀)
  y: number
  width: number
  height: number
  fontSize: number
  fontName?: string
  color?: string              // 텍스트 색상 hex (e.g., 'FF0000')
  bold?: boolean              // 굵은 글꼴 여부
  align?: 'left' | 'center' | 'right'  // 정렬
}

/** PDF 변환된 페이지 이미지 정보 (PdfConverter ↔ ImageEditor 공유) */
export interface ConvertedPage {
  pageNumber: number
  dataUrl: string
  width: number
  height: number
  textItems?: TextItem[] // PDF에서 추출한 텍스트 정보 (PPT 변환 시 사용)
}

interface AppState {
  // PDF 변환 페이지 데이터
  pages: ConvertedPage[]
  setPages: (pages: ConvertedPage[]) => void
  updatePageDataUrl: (pageNumber: number, dataUrl: string) => void

  // 이미지 편집기로 전달할 페이지 번호
  editingPageNumber: number | null
  setEditingPageNumber: (num: number | null) => void

  // PPT 분석 결과 (Sidebar ↔ PdfConverter 공유)
  slidesData: SlideData[]
  setSlidesData: (data: SlideData[]) => void
  showPptPreview: boolean
  setShowPptPreview: (show: boolean) => void
}

/**
 * 앱 전역 스토어
 * PdfConverter와 ImageEditor가 페이지 데이터를 공유
 * - PdfConverter: pages를 생성/표시
 * - ImageEditor: 특정 페이지를 편집 후 updatePageDataUrl로 반영
 * - Sidebar: PPT 결과 아이콘 활성화 여부 확인
 */
export const useAppStore = create<AppState>((set) => ({
  pages: [],
  setPages: (pages) => set({ pages }),
  updatePageDataUrl: (pageNumber, dataUrl) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.pageNumber === pageNumber ? { ...p, dataUrl } : p
      ),
    })),

  editingPageNumber: null,
  setEditingPageNumber: (num) => set({ editingPageNumber: num }),

  slidesData: [],
  setSlidesData: (data) => set({ slidesData: data }),
  showPptPreview: false,
  setShowPptPreview: (show) => set({ showPptPreview: show }),
}))

