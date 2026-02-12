import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Upload,
  Download,
  Loader2,
  Eraser,
  CheckCircle,
  RotateCcw,
  FileDown,
  ImageDown,
  Pencil,
  Presentation,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { GoogleGenAI, Type } from '@google/genai'
import { useAppStore, type ConvertedPage, type TextItem } from '../store/useAppStore'
import { ElementType, type SlideData } from '../types/slide'
import SlidePreview from '../components/SlidePreview'

// PDF.js 워커 설정 (CDN에서 로드)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// ── Gemini 시스템 지시문 ──────────────────────────────────────
const GEMINI_SYSTEM_INSTRUCTION = `
You are an expert presentation layout parser. Your goal is to analyze an image of a presentation slide and extract a structured JSON representation to reconstruct it as an editable PowerPoint file.

**Analysis Strategy:**
1. **Deconstruct Layers**: Identify the background color first. Then, identify shapes that serve as containers or backgrounds. Finally, identify text elements on top.
2. **Visual Asset Preservation (CRITICAL)**: 
   - **Photos, Icons, Logos, Complex Diagrams**: Identify these as \`type: image\`. Do NOT ignore them. We must preserve visual fidelity.
   - **Simple Shapes**: Rectangles, circles, and lines used for design (e.g., text backgrounds, dividers) should be \`type: shape\`.
3. **Text Granularity**: Do *not* group distinct text blocks into a single large box. 
   - A Title and a Subtitle are separate elements.
   - Headers and footers are separate elements.
4. **Shapes vs. Backgrounds**: 
   - If text sits inside a colored box, create a SHAPE element for the box first, then a TEXT element for the content.

**Properties & Estimation Rules:**
- **Coordinates (x, y, w, h)**: Use percentage (0-100) relative to the top-left corner.
  - \`x\`, \`y\`: Position of the top-left corner of the element.
  - \`w\`, \`h\`: Width and height.
  - *Crucial*: Bounding boxes must be tight around the visible content.
- **Font Size**: Estimate in points (pt). 
  - Title: 40-60pt, Subtitle: 24-32pt, Body: 14-20pt, Caption: 10-12pt.
- **Colors**: Return 6-digit Hex codes (e.g., #FF0000).
- **Alignment**: 'left', 'center', 'right'.

**Output Order**:
Return elements in visual stacking order (back to front). Background shapes -> Images -> Text.
`

// ── Gemini 응답 스키마 ───────────────────────────────────────
const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    backgroundColor: {
      type: Type.STRING,
      description: 'Hex color code for the slide background canvas',
    },
    elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: [ElementType.Text, ElementType.Shape, ElementType.Image],
          },
          content: {
            type: Type.STRING,
            description: 'The actual text content. For shapes/images, leave empty.',
          },
          x: { type: Type.NUMBER, description: 'Left position (0-100)' },
          y: { type: Type.NUMBER, description: 'Top position (0-100)' },
          w: { type: Type.NUMBER, description: 'Width (0-100)' },
          h: { type: Type.NUMBER, description: 'Height (0-100)' },
          color: { type: Type.STRING, description: 'Text color hex code' },
          bgColor: { type: Type.STRING, description: 'Shape fill color hex code' },
          fontSize: {
            type: Type.NUMBER,
            description: 'Estimated font size in points',
          },
          bold: { type: Type.BOOLEAN, description: 'True if text is bold' },
          align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
          shapeType: {
            type: Type.STRING,
            enum: ['rect', 'ellipse', 'line'],
            description: 'Only for type=shape',
          },
        },
        required: ['type', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['backgroundColor', 'elements'],
}

/**
 * Gemini AI로 슬라이드 이미지 분석 (고급 모드 — API Key 필요)
 */
const analyzeSlideWithGemini = async (
  apiKey: string,
  base64Image: string,
  index: number,
): Promise<SlideData> => {
  const ai = new GoogleGenAI({ apiKey })

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: 'Analyze this slide image. Extract layout, text, shapes, and IMAGES into a precise JSON structure. Prioritize preserving diagrams and photos as "image" type.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.0,
      },
    })

    const text = response.text
    if (!text) throw new Error('AI 응답이 비어있습니다')

    // Gemini가 가끔 잘못된 JSON을 반환하므로 수리 시도
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      // 잘린 JSON 수리 시도: 열린 문자열/배열/객체를 닫아줌
      let fixed = text
        .replace(/,\s*([}\]])/g, '$1')       // trailing comma 제거
        .replace(/([^\\])\\$/gm, '$1')       // 끝에 단독 백슬래시 제거
      // 열린 따옴표 닫기
      const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length
      if (quoteCount % 2 !== 0) fixed += '"'
      // 열린 괄호 닫기
      const opens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length
      for (let i = 0; i < opens; i++) fixed += ']'
      const braces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length
      for (let i = 0; i < braces; i++) fixed += '}'

      try {
        data = JSON.parse(fixed)
      } catch {
        console.warn(`슬라이드 ${index + 1} JSON 수리 실패, 이미지로 대체`)
        return {
          index,
          originalImageBase64: base64Image,
          backgroundColor: '#FFFFFF',
          elements: [{ type: ElementType.Image, x: 0, y: 0, w: 100, h: 100 }],
        }
      }
    }

    return {
      index,
      originalImageBase64: base64Image,
      backgroundColor: data.backgroundColor || '#FFFFFF',
      elements: data.elements || [],
    }
  } catch (error) {
    console.error(`슬라이드 ${index + 1} AI 분석 실패:`, error)
    return {
      index,
      originalImageBase64: base64Image,
      backgroundColor: '#FFFFFF',
      elements: [{ type: ElementType.Image, x: 0, y: 0, w: 100, h: 100 }],
    }
  }
}

/**
 * 원본 슬라이드 이미지에서 특정 영역을 크롭 (고급 모드 — AI가 식별한 이미지 영역)
 */
const cropImageFromSlide = async (
  base64Image: string,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const startX = (xPct / 100) * img.width
      const startY = (yPct / 100) * img.height
      const width = (wPct / 100) * img.width
      const height = (hPct / 100) * img.height

      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context 생성 실패')); return }

      ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = `data:image/png;base64,${base64Image}`
  })
}

/**
 * 이미지를 로드하는 헬퍼
 */
const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * 텍스트 영역을 배경으로 덮은 이미지 생성 (strip-copy 방식)
 *
 * 이전 방식: 4개 모서리 평균색으로 fillRect → 단색 사각형이 눈에 띔
 * 개선 방식: 텍스트 바로 위 1px 가로줄을 복사하여 세로로 타일링
 *   → 그라데이션/텍스처 배경에서도 자연스럽게 지워짐
 *   → 워터마크 제거와 동일한 원리
 */
const eraseTextFromImage = async (
  originalDataUrl: string,
  regions: Array<{ x: number; y: number; w: number; h: number }>,
  width: number,
  height: number,
): Promise<string> => {
  const img = await loadImage(originalDataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0)

  for (const r of regions) {
    const padding = 3
    const rx = Math.max(0, Math.round(r.x) - padding)
    const ry = Math.max(0, Math.round(r.y) - padding)
    const rw = Math.min(width - rx, Math.round(r.w) + padding * 2)
    const rh = Math.min(height - ry, Math.round(r.h) + padding * 2)

    // 텍스트 바로 위 1px strip을 복사해서 세로로 타일링
    // → 배경 패턴/그라데이션이 자연스럽게 유지됨
    const stripY = Math.max(0, ry - 2)
    const strip = ctx.getImageData(rx, stripY, rw, 1)

    for (let y = ry; y < Math.min(height, ry + rh); y++) {
      ctx.putImageData(strip, rx, y)
    }
  }

  return canvas.toDataURL('image/png')
}

/**
 * PDF.js 텍스트 아이템을 라인 단위로 그룹핑 + 정렬/색상/굵기 감지
 *
 * 개선된 기능:
 * - 같은 Y 좌표(허용 오차 내)의 아이템을 하나의 라인으로 병합
 * - 라인별 정렬 감지 (center/left/right → 페이지 폭 기준)
 * - 가장 많이 사용된 텍스트 색상을 라인 색상으로 채택
 * - 하나라도 bold이면 라인 전체를 bold 처리
 */
const groupTextItemsByLine = (items: TextItem[], pageWidth?: number): TextItem[] => {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)

  const groups: TextItem[][] = []
  let currentGroup: TextItem[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[0]
    const curr = sorted[i]
    const yTolerance = Math.max(prev.height, curr.height) * 0.5

    if (Math.abs(curr.y - prev.y) < yTolerance) {
      currentGroup.push(curr)
    } else {
      groups.push(currentGroup)
      currentGroup = [curr]
    }
  }
  groups.push(currentGroup)

  const pw = pageWidth || 0

  return groups.map((group) => {
    const minX = Math.min(...group.map((g) => g.x))
    const minY = Math.min(...group.map((g) => g.y))
    const maxRight = Math.max(...group.map((g) => g.x + g.width))
    const maxBottom = Math.max(...group.map((g) => g.y + g.height))
    const maxFontSize = Math.max(...group.map((g) => g.fontSize))

    const mergedText = group.map((g) => g.text).join('')

    // ── 정렬 감지 (페이지 폭 기준) ──
    let align: 'left' | 'center' | 'right' = 'left'
    if (pw > 0) {
      const lineWidth = maxRight - minX
      const lineCenter = minX + lineWidth / 2
      const pageCenter = pw / 2
      const leftMargin = minX
      const rightMargin = pw - maxRight

      // 좌우 여백의 차이가 라인 폭의 10% 이내면 가운데 정렬
      if (Math.abs(leftMargin - rightMargin) < lineWidth * 0.15 && leftMargin > pw * 0.05) {
        align = 'center'
      } else if (leftMargin > pw * 0.55) {
        align = 'right'
      }
    }

    // ── 색상: 가장 많이 사용된 색상 채택 ──
    const colorCounts: Record<string, number> = {}
    for (const g of group) {
      const c = g.color || '333333'
      colorCounts[c] = (colorCounts[c] || 0) + g.text.length
    }
    const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '333333'

    // ── 굵기: 그룹 내 하나라도 bold이면 전체 bold ──
    const hasBold = group.some((g) => g.bold)

    return {
      text: mergedText,
      x: minX,
      y: minY,
      width: maxRight - minX,
      height: maxBottom - minY,
      fontSize: maxFontSize,
      color: dominantColor,
      bold: hasBold,
      align,
    }
  })
}

/**
 * PDF → 이미지 변환 + 워터마크 제거 + PPT 변환 페이지
 *
 * PPT 변환 모드:
 * 1. 기본 모드 (API Key 불필요): PDF.js의 getTextContent()로 텍스트 구조 추출
 * 2. 고급 모드 (Gemini API Key): AI 비전으로 텍스트/도형/이미지 완전 분리
 */
const PdfConverter = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── 스토어에서 pages 관리 (ImageEditor와 공유) ─── //
  const pages = useAppStore((s) => s.pages)
  const setPages = useAppStore((s) => s.setPages)

  // ─── PPT 분석 결과를 글로벌 스토어에서 관리 (Sidebar에서 접근) ─── //
  const slidesData = useAppStore((s) => s.slidesData)
  const setSlidesData = useAppStore((s) => s.setSlidesData)
  const showPreview = useAppStore((s) => s.showPptPreview)
  const setShowPreview = useAppStore((s) => s.setShowPptPreview)

  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [watermarkRemoval, setWatermarkRemoval] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [pptProgress, setPptProgress] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false)
  const [genProgressText, setGenProgressText] = useState('')

  // localStorage에서 Gemini API Key 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key')
    if (saved) setGeminiApiKey(saved)
  }, [])

  const saveApiKey = (key: string) => {
    setGeminiApiKey(key)
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim())
    } else {
      localStorage.removeItem('gemini_api_key')
    }
  }

  /**
   * NotebookLM 워터마크 제거
   */
  const eraseWatermark = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    const wmWidth = Math.round(w * 0.09)
    const wmHeight = Math.round(h * 0.03)
    const startX = w - wmWidth
    const startY = h - wmHeight

    const rowAbove = ctx.getImageData(startX, startY - 1, wmWidth, 1)
    for (let y = startY; y < h; y++) {
      ctx.putImageData(rowAbove, startX, y)
    }
  }

  // 다른 페이지에서 파일을 전달받은 경우 자동으로 변환 시작
  React.useEffect(() => {
    const stateFile = location.state?.file
    if (stateFile instanceof File) {
      convertPdf(stateFile)
    }
  }, [location.state])

  const getBaseName = (name: string) => name.replace(/\.pdf$/i, '')

  /**
   * PDF 파일을 이미지로 변환하면서 동시에 텍스트 구조 추출
   *
   * PDF.js의 getTextContent()는 PDF 구조에서 직접 텍스트와 위치를 읽어옴
   * → API 키 없이도 텍스트 분리가 가능 (단, PDF에 텍스트가 텍스트로 존재해야 함)
   *
   * 좌표계 변환:
   *   PDF 좌표: 원점 = 좌하단, Y축 위로 증가, 단위 = 포인트(1pt = 1/72인치)
   *   Canvas 좌표: 원점 = 좌상단, Y축 아래로 증가, 단위 = 픽셀
   *   변환식: canvasX = pdfX × scale, canvasY = canvasHeight − pdfY × scale − fontHeight × scale
   */
  const convertPdf = async (pdfFile: File) => {
    if (pdfFile.type !== 'application/pdf') {
      setError('PDF 파일만 업로드할 수 있습니다.')
      return
    }

    setFile(pdfFile)
    setFileName(getBaseName(pdfFile.name))
    setError(null)
    setIsConverting(true)
    setPages([])
    setProgress(0)

    try {
      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setTotalPages(pdf.numPages)

      const convertedPages: ConvertedPage[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const scale = 2
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!

        await page.render({ canvasContext: ctx, viewport }).promise

        if (watermarkRemoval) {
          eraseWatermark(canvas)
        }

        // ── PDF 구조에서 텍스트 추출 (API Key 불필요) ──
        let extractedText: TextItem[] = []
        try {
          const textContent = await page.getTextContent()

          for (const item of textContent.items) {
            // TextMarkedContent 아이템 건너뛰기 (타입 가드)
            if ('type' in item) continue

            const textItem = item as {
              str: string
              transform: number[]
              width: number
              height: number
              fontName: string
            }

            if (!textItem.str || !textItem.str.trim()) continue

            // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
            const tx = textItem.transform
            const fontSizePdf = Math.abs(tx[3]) // PDF 포인트 단위 (= PPT 포인트)
            const xPdf = tx[4]
            const yPdf = tx[5]

            // PDF 좌표 → Canvas 픽셀 좌표 변환
            const xCanvas = xPdf * scale
            const fontHeightPx = fontSizePdf * scale
            const yCanvas = viewport.height - yPdf * scale - fontHeightPx
            const widthPx = textItem.width * scale
            const heightPx = fontHeightPx

            // 유효한 텍스트만 저장 (너비/높이 > 0)
            if (widthPx > 1 && heightPx > 1) {
              // ── 캔버스에서 실제 텍스트 색상 샘플링 ──
              // 텍스트 영역 중앙 지점에서 픽셀 색상을 읽어 정확한 글자 색상 획득
              let textColor = '333333'
              try {
                // 배경색 샘플 (텍스트 바로 위)
                const bgSX = Math.round(Math.min(Math.max(0, xCanvas + widthPx / 2), viewport.width - 1))
                const bgSY = Math.max(0, Math.round(yCanvas) - 3)
                const bgPx = ctx.getImageData(bgSX, bgSY, 1, 1).data

                // 텍스트 중앙 픽셀 (글자가 있는 위치)
                const txSX = bgSX
                const txSY = Math.min(viewport.height - 1, Math.round(yCanvas + heightPx * 0.55))
                const txPx = ctx.getImageData(txSX, txSY, 1, 1).data

                // 배경과 텍스트 색상 차이가 충분히 크면 텍스트 색상 사용
                const diff = Math.abs(txPx[0] - bgPx[0]) + Math.abs(txPx[1] - bgPx[1]) + Math.abs(txPx[2] - bgPx[2])
                if (diff > 50) {
                  textColor = ((txPx[0] << 16) | (txPx[1] << 8) | txPx[2]).toString(16).padStart(6, '0')
                } else {
                  // 차이가 작으면 배경 밝기 기준으로 흰/검정 결정
                  const bgBright = (bgPx[0] + bgPx[1] + bgPx[2]) / 3
                  textColor = bgBright < 128 ? 'FFFFFF' : '333333'
                }
              } catch { /* 샘플링 실패 시 기본값 유지 */ }

              // ── 폰트명에서 Bold 감지 ──
              const fontLower = (textItem.fontName || '').toLowerCase()
              const isBold = fontLower.includes('bold') || fontLower.includes('-bd')
                || fontLower.includes('heavy') || fontLower.includes('black')

              extractedText.push({
                text: textItem.str,
                x: xCanvas,
                y: yCanvas,
                width: widthPx,
                height: heightPx,
                fontSize: fontSizePdf,
                fontName: textItem.fontName,
                color: textColor,
                bold: isBold,
              })
            }
          }
        } catch (err) {
          console.warn(`페이지 ${i} 텍스트 추출 실패 (이미지만 사용):`, err)
        }

        convertedPages.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height,
          textItems: extractedText.length > 0 ? extractedText : undefined,
        })

        setProgress(i)
        setPages([...convertedPages])
      }
    } catch (err) {
      console.error('PDF 변환 오류:', err)
      setError('PDF 변환 중 오류가 발생했습니다. 파일이 손상되었거나 암호화되어 있을 수 있습니다.')
    } finally {
      setIsConverting(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) convertPdf(droppedFile)
    },
    [watermarkRemoval]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) convertPdf(selectedFile)
    },
    [watermarkRemoval]
  )

  const downloadPage = (page: ConvertedPage) => {
    const link = document.createElement('a')
    link.download = `${fileName}_${String(page.pageNumber).padStart(2, '0')}.png`
    link.href = page.dataUrl
    link.click()
  }

  const downloadAllImages = async () => {
    setIsDownloading(true)
    for (let i = 0; i < pages.length; i++) {
      downloadPage(pages[i])
      if (i < pages.length - 1) {
        await new Promise((r) => setTimeout(r, 250))
      }
    }
    setIsDownloading(false)
  }

  const downloadAsPdf = async () => {
    setIsDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')

      const firstPage = pages[0]
      const pw = firstPage.width / 2
      const ph = firstPage.height / 2

      const doc = new jsPDF({
        orientation: pw > ph ? 'l' : 'p',
        unit: 'px',
        format: [pw, ph],
        compress: true,
      })

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const w = page.width / 2
        const h = page.height / 2

        if (i > 0) {
          doc.addPage([w, h], w > h ? 'l' : 'p')
        }

        const jpegUrl = await toJpeg(page.dataUrl)
        doc.addImage(jpegUrl, 'JPEG', 0, 0, w, h, undefined, 'FAST')
      }

      doc.save(`${fileName}_워터마크제거.pdf`)
    } catch (err) {
      console.error('PDF 생성 오류:', err)
      setError('PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setIsDownloading(false)
    }
  }

  /**
   * PPT 변환 1단계: 슬라이드 분석 → 미리보기 표시
   *
   * AI 모드 (API Key 있음): Gemini AI 비전으로 텍스트/도형/이미지 완전 분리
   * 기본 모드 (API Key 없음): PDF.js getTextContent()로 텍스트 구조 추출
   *
   * 분석 완료 후 SlidePreview 화면이 표시되어 사용자가 편집 가능
   */
  const startPptConversion = async () => {
    setIsDownloading(true)
    setPptProgress('분석 시작...')
    setError(null)

    const apiKey = geminiApiKey || (process.env.GEMINI_API_KEY as string)
    const useAI = !!apiKey

    try {
      const newSlidesData: SlideData[] = []

      for (let idx = 0; idx < pages.length; idx++) {
        const page = pages[idx]

        if (useAI) {
          setPptProgress(`슬라이드 ${idx + 1}/${pages.length} — AI 분석 중...`)
          // JPEG로 변환하여 Gemini API 전송 크기 최적화
          const jpegUrl = await toJpeg(page.dataUrl)
          const base64 = jpegUrl.split(',')[1]
          const slideData = await analyzeSlideWithGemini(apiKey!, base64, idx)
          // display용 원본 이미지 (full data URL)
          slideData.originalImageBase64 = page.dataUrl
          slideData.mode = 'ai'
          newSlidesData.push(slideData)
        } else {
          setPptProgress(`슬라이드 ${idx + 1}/${pages.length} — 텍스트 분석 중...`)
          const textItems = page.textItems
            ? groupTextItemsByLine(page.textItems, page.width)
            : []
          newSlidesData.push({
            index: idx,
            originalImageBase64: page.dataUrl,
            backgroundColor: '#FFFFFF',
            mode: 'basic',
            elements: textItems.map((ti) => ({
              type: ElementType.Text,
              content: ti.text,
              x: (ti.x / page.width) * 100,
              y: (ti.y / page.height) * 100,
              w: (ti.width / page.width) * 100,
              h: (ti.height / page.height) * 100,
              color: `#${ti.color || '333333'}`,
              fontSize: Math.round(ti.fontSize),
              bold: ti.bold || false,
              align: ti.align || 'left',
            })),
          })
        }
      }

      setSlidesData(newSlidesData)
      setShowPreview(true)
      setPptProgress('')
    } catch (err: any) {
      console.error('분석 오류:', err)
      const errMsg = err?.message || ''
      if (
        errMsg.includes('API') ||
        errMsg.includes('key') ||
        errMsg.includes('401') ||
        errMsg.includes('403')
      ) {
        setError('Gemini API Key가 유효하지 않습니다. 확인 후 다시 시도해주세요.')
      } else {
        setError(`분석 중 오류가 발생했습니다: ${errMsg}`)
      }
      setPptProgress('')
    } finally {
      setIsDownloading(false)
    }
  }

  /**
   * PPT 변환 2단계: 미리보기에서 편집한 slidesData로 PPTX 파일 생성
   *
   * AI 모드: 배경색 + 도형/텍스트/이미지(크롭) 조합
   * 기본 모드: 텍스트 영역을 지운 배경 이미지 + 텍스트 오버레이
   */
  const generatePptxFromSlides = async () => {
    setIsGeneratingPptx(true)
    setGenProgressText('PPTX 파일 생성 시작...')
    setError(null)

    try {
      const PptxGenJS = (await import('pptxgenjs')).default
      const pptx = new PptxGenJS()

      pptx.layout = 'LAYOUT_16x9'
      const PRES_WIDTH = 10.0
      const PRES_HEIGHT = 5.625

      for (let idx = 0; idx < slidesData.length; idx++) {
        const sd = slidesData[idx]
        const slide = pptx.addSlide()

        setGenProgressText(`슬라이드 ${idx + 1}/${slidesData.length} 생성 중...`)

        if (sd.mode === 'ai') {
          // ══════════════════════════════════════════════
          //  AI 모드: 배경색 + 도형 + 텍스트 + 이미지
          // ══════════════════════════════════════════════
          slide.background = { color: sd.backgroundColor.replace('#', '') }

          for (const el of sd.elements) {
            const x = (el.x / 100) * PRES_WIDTH
            const y = (el.y / 100) * PRES_HEIGHT
            const w = (el.w / 100) * PRES_WIDTH
            const h = (el.h / 100) * PRES_HEIGHT

            if (el.type === ElementType.Shape) {
              let shapeType = pptx.ShapeType.rect
              if (el.shapeType === 'ellipse') shapeType = pptx.ShapeType.ellipse
              if (el.shapeType === 'line') shapeType = pptx.ShapeType.line

              slide.addShape(shapeType, {
                x,
                y,
                w,
                h,
                fill: { color: el.bgColor ? el.bgColor.replace('#', '') : 'CCCCCC' },
                line: { width: 0 },
              })
            } else if (el.type === ElementType.Text && el.content) {
              slide.addText(el.content, {
                x,
                y,
                w,
                h,
                fontSize: el.fontSize || 14,
                color: el.color ? el.color.replace('#', '') : '000000',
                align: el.align || 'left',
                bold: el.bold || false,
                fontFace: 'Malgun Gothic',
                wrap: true,
              })
            } else if (el.type === ElementType.Image) {
              try {
                const base64 = sd.originalImageBase64.includes(',')
                  ? sd.originalImageBase64.split(',')[1]
                  : sd.originalImageBase64
                let imagePayload = sd.originalImageBase64.includes(',')
                  ? sd.originalImageBase64
                  : `data:image/png;base64,${sd.originalImageBase64}`

                if (el.w < 95 || el.h < 95) {
                  imagePayload = await cropImageFromSlide(base64, el.x, el.y, el.w, el.h)
                }
                slide.addImage({ data: imagePayload, x, y, w, h })
              } catch (e) {
                console.warn('이미지 크롭 실패:', e)
              }
            }
          }
        } else {
          // ══════════════════════════════════════════════
          //  기본 모드: 텍스트 지운 배경 + 텍스트 오버레이
          // ══════════════════════════════════════════════
          const page = pages[idx]
          if (!page) continue

          const pageH = (page.height / page.width) * PRES_WIDTH
          const textElements = sd.elements.filter((el) => el.type === ElementType.Text)

          if (textElements.length > 0) {
            // 텍스트 영역을 배경에서 지우기 (strip-copy)
            const regions = textElements.map((el) => ({
              x: (el.x / 100) * page.width,
              y: (el.y / 100) * page.height,
              w: (el.w / 100) * page.width,
              h: (el.h / 100) * page.height,
            }))

            const bgDataUrl = await eraseTextFromImage(
              page.dataUrl,
              regions,
              page.width,
              page.height,
            )
            slide.addImage({ data: bgDataUrl, x: 0, y: 0, w: PRES_WIDTH, h: pageH })

            // 편집된 텍스트 오버레이 추가
            for (const el of textElements) {
              if (!el.content) continue
              const x = (el.x / 100) * PRES_WIDTH
              const y = (el.y / 100) * pageH
              const w = Math.max(0.3, (el.w / 100) * PRES_WIDTH)
              const h = Math.max(0.15, (el.h / 100) * pageH)

              slide.addText(el.content, {
                x,
                y,
                w,
                h,
                fontSize: Math.max(6, Math.min(72, el.fontSize || 14)),
                color: el.color ? el.color.replace('#', '') : '333333',
                bold: el.bold || false,
                fontFace: 'Malgun Gothic',
                align: el.align || 'left',
                valign: 'middle',
                margin: 0,
                wrap: false,
              })
            }
          } else {
            // 텍스트 없음 → 원본 이미지만 추가
            const pageH2 = (page.height / page.width) * PRES_WIDTH
            slide.addImage({ data: page.dataUrl, x: 0, y: 0, w: PRES_WIDTH, h: pageH2 })
          }
        }
      }

      setGenProgressText('PPTX 저장 중...')
      await pptx.writeFile({ fileName: `${fileName}_변환.pptx` })
      setGenProgressText('✓ 다운로드 완료 — 계속 편집하거나 다시 생성할 수 있습니다')
    } catch (err: any) {
      console.error('PPTX 생성 오류:', err)
      setError(`PPTX 생성 중 오류가 발생했습니다: ${err?.message || ''}`)
      setGenProgressText('')
    } finally {
      setIsGeneratingPptx(false)
    }
  }

  const toJpeg = (pngDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const cvs = document.createElement('canvas')
        cvs.width = img.width
        cvs.height = img.height
        const ctx = cvs.getContext('2d')!
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, cvs.width, cvs.height)
        ctx.drawImage(img, 0, 0)
        resolve(cvs.toDataURL('image/jpeg', 0.92))
      }
      img.src = pngDataUrl
    })
  }

  const openInEditor = (page: ConvertedPage) => {
    useAppStore.getState().setEditingPageNumber(page.pageNumber)
    navigate('/image-editor')
  }

  const resetFile = () => {
    setFile(null)
    setFileName('')
    setPages([])
    setProgress(0)
    setTotalPages(0)
    setError(null)
    setPptProgress('')
    setSlidesData([])
    setShowPreview(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isComplete = !isConverting && pages.length > 0
  const hasApiKey = !!(geminiApiKey || process.env.GEMINI_API_KEY)

  // 추출된 텍스트 개수 (기본 모드 정보 표시용)
  const totalExtractedText = pages.reduce(
    (sum, p) => sum + (p.textItems?.length || 0),
    0
  )

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-auto">
      {showPreview && slidesData.length > 0 ? (
        <SlidePreview
          slides={slidesData}
          onUpdateSlides={setSlidesData}
          onGenerate={generatePptxFromSlides}
          onBack={() => setShowPreview(false)}
          isGenerating={isGeneratingPptx}
          progressText={genProgressText}
        />
      ) : (
      <>
      {/* 페이지 헤더 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">PDF → 이미지 변환</h1>
        <p className="text-gray-400 text-xs sm:text-sm">
          PDF 슬라이드를 이미지로 변환하고 NotebookLM 워터마크를 자동 제거합니다.
        </p>
      </div>

      {/* 워터마크 제거 토글 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setWatermarkRemoval(!watermarkRemoval)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            watermarkRemoval ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              watermarkRemoval ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <div className="flex items-center gap-2">
          <Eraser className={`w-4 h-4 ${watermarkRemoval ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${watermarkRemoval ? 'text-gray-300' : 'text-gray-500'}`}>
            워터마크 자동 제거
          </span>
        </div>
        {watermarkRemoval && (
          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded hidden sm:inline">
            오른쪽 하단 워터마크를 배경색으로 채워 제거합니다
          </span>
        )}
      </div>

      {/* ─── 업로드 영역 ─── */}
      {!file && (
        <div
          className="border-2 border-dashed border-gray-700 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center hover:border-gray-500 active:border-gray-400 transition-colors cursor-pointer mb-4 sm:mb-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileInput}
          />
          <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-300 text-base sm:text-lg mb-2">
            PDF 파일을 여기에 드래그하세요
          </p>
          <p className="text-gray-500 text-xs sm:text-sm">또는 클릭하여 파일 선택 (최대 50MB)</p>
        </div>
      )}

      {/* ─── 변환 중 진행률 ─── */}
      {file && isConverting && (
        <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-medium text-sm sm:text-base truncate">{file.name}</p>
              <p className="text-blue-400 text-xs sm:text-sm">
                {progress}/{totalPages} 페이지 변환 중...
                {watermarkRemoval && ' (워터마크 제거 포함)'}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress / totalPages) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── 변환 완료 → 다운로드 ─── */}
      {isComplete && (
        <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-emerald-700/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 완료 상태 */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-base sm:text-lg">
                  변환 완료! {pages.length}장
                  {watermarkRemoval && ' · 워터마크 제거됨'}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm truncate">{file?.name}</p>
                {totalExtractedText > 0 ? (
                  <p className="text-emerald-400 text-xs mt-0.5">
                    {totalExtractedText}개 텍스트 추출됨 — PPT 변환 시 자동 분리
                    {hasApiKey && ' (AI 고급 모드 사용 가능)'}
                  </p>
                ) : (
                  <p className="text-yellow-400 text-xs mt-0.5">
                    텍스트 추출 불가 (벡터/이미지형 PDF)
                    {hasApiKey
                      ? ' — AI 고급 모드로 분리 가능'
                      : ' — Gemini API Key로 AI 분리 가능'}
                  </p>
                )}
              </div>
            </div>

            {/* 다운로드 버튼들 */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={startPptConversion}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-xl font-semibold text-sm sm:text-base transition-colors shadow-lg shadow-orange-900/30 flex-1 sm:flex-none justify-center"
              >
                {isDownloading && pptProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="text-xs sm:text-sm">{pptProgress}</span>
                  </>
                ) : isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">생성 중...</span>
                  </>
                ) : (
                  <>
                    <Presentation className="w-4 h-4 sm:w-5 sm:h-5" />
                    PPT 변환
                  </>
                )}
              </button>
              <button
                onClick={downloadAsPdf}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-xl font-semibold text-sm sm:text-base transition-colors shadow-lg shadow-emerald-900/30 flex-1 sm:flex-none justify-center"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">생성 중...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    PDF 다운로드
                  </>
                )}
              </button>
              <button
                onClick={downloadAllImages}
                disabled={isDownloading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700/50 text-gray-300 rounded-xl text-xs sm:text-sm transition-colors justify-center"
              >
                <ImageDown className="w-4 h-4" />
                <span className="hidden sm:inline">이미지</span> ({pages.length}장)
              </button>
              <button
                onClick={resetFile}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs sm:text-sm transition-colors justify-center"
                title="새 PDF 업로드"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">새 파일</span>
              </button>
            </div>
          </div>

          {/* Gemini API Key 입력 (선택 사항 — 고급 모드) */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                고급 모드: Gemini API Key 설정 (선택 사항)
                {hasApiKey && ' ✓'}
              </span>
            </button>

            {showApiKeyInput && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => saveApiKey(e.target.value)}
                    placeholder="Gemini API Key 입력 (없어도 기본 모드로 동작)"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-orange-500 pr-10"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {geminiApiKey && (
                  <span className="text-xs text-emerald-400 whitespace-nowrap">저장됨</span>
                )}
              </div>
            )}

            <p className="text-[11px] text-gray-500 mt-2">
              기본 모드: PDF 구조에서 텍스트를 직접 추출 (API Key 불필요) · 
              고급 모드: AI가 텍스트/도형/이미지까지 분리
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 ml-1"
              >
                API Key 발급 →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ─── 변환된 이미지 미리보기 그리드 ─── */}
      {pages.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-medium text-gray-400">
              미리보기 · 각 이미지를 클릭하면 다운로드 또는 편집
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 auto-rows-min">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 group"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={page.dataUrl}
                    alt={`페이지 ${page.pageNumber}`}
                    className="w-full h-auto block bg-white"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => downloadPage(page)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      title="다운로드"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => openInEditor(page)}
                      className="p-2 bg-blue-500/60 backdrop-blur-sm rounded-lg hover:bg-blue-500/80 transition-colors"
                      title="편집기에서 열기"
                    >
                      <Pencil className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {page.pageNumber}
                    {page.textItems && page.textItems.length > 0 && (
                      <span className="text-emerald-500 ml-1">
                        · {page.textItems.length}텍스트
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openInEditor(page)}
                      className="text-xs text-gray-500 hover:text-blue-400 transition-colors p-1"
                      title="편집"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => downloadPage(page)}
                      className="text-xs text-gray-500 hover:text-blue-400 transition-colors p-1"
                      title="다운로드"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </>
      )}
    </div>
  )
}

export default PdfConverter
