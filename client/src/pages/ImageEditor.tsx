import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  Loader2,
  X,
  Type,
  Save,
  Undo2,
  Download,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import Tesseract from 'tesseract.js'
import { useAppStore } from '../store/useAppStore'

/** 사각형 선택 영역 */
interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 이미지 편집기 — 깨진 한글 텍스트 교체 (반응형)
 *
 * 데스크탑: 캔버스 좌측 + 텍스트 교체 패널 우측 (가로 배치)
 * 모바일: 캔버스 상단 + 접이식 패널 하단 (세로 배치)
 */
const ImageEditor = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── 스토어 연동 ─── //
  const editingPageNumber = useAppStore((s) => s.editingPageNumber)
  const updatePageDataUrl = useAppStore((s) => s.updatePageDataUrl)

  // ─── 편집 캔버스 (원본 해상도, 편집이 누적됨) ─── //
  const [editCanvas, setEditCanvas] = useState<HTMLCanvasElement | null>(null)
  const [editVersion, setEditVersion] = useState(0)
  const [scale, setScale] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // ─── 영역 선택 상태 ─── //
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [selection, setSelection] = useState<SelectionRect | null>(null)

  // ─── 리사이즈 핸들 상태 ─── //
  type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null
  const [resizeHandle, setResizeHandle] = useState<HandleType>(null)
  const [resizeOrigin, setResizeOrigin] = useState<SelectionRect | null>(null)

  // ─── 이미지 조각 이동 상태 ─── //
  const [isMoving, setIsMoving] = useState(false)
  const [moveImageCanvas, setMoveImageCanvas] = useState<HTMLCanvasElement | null>(null)
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 })

  // ─── OCR & 텍스트 교체 상태 ─── //
  const [editedText, setEditedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [detectedFontSize, setDetectedFontSize] = useState<number | null>(null)

  // ─── 원본 텍스트 측정 결과 ─── //
  interface TextMeasure {
    textHeight: number
    textLeft: number
    textTop: number
    strokeWidth: number
    isBold: boolean
  }
  const [textMeasure, setTextMeasure] = useState<TextMeasure | null>(null)
  const [fontSizeOverride, setFontSizeOverride] = useState<number | null>(null)
  const [fontBold, setFontBold] = useState(false)

  // ─── 편집 히스토리 ─── //
  const [history, setHistory] = useState<string[]>([])

  // ─── PDF 페이지 번호 ─── //
  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null)

  // ─── 저장 완료 피드백 ─── //
  const [showSaved, setShowSaved] = useState(false)

  // ─── 모바일 패널 열림/닫힘 상태 ─── //
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  /**
   * 스토어에서 편집할 이미지 로드
   */
  useEffect(() => {
    if (editingPageNumber !== null) {
      const pages = useAppStore.getState().pages
      const page = pages.find((p) => p.pageNumber === editingPageNumber)
      if (page) {
        setCurrentPageNumber(editingPageNumber)
        loadImageFromUrl(page.dataUrl)
      }
      useAppStore.getState().setEditingPageNumber(null)
    }
  }, [editingPageNumber])

  const loadImageFromUrl = (url: string) => {
    const img = new window.Image()
    img.onload = () => {
      const cvs = document.createElement('canvas')
      cvs.width = img.naturalWidth
      cvs.height = img.naturalHeight
      const ctx = cvs.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      setEditCanvas(cvs)
      setEditVersion(0)
      setSelection(null)
      setEditedText('')
      setScale(1)
      setHistory([])
    }
    img.src = url
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCurrentPageNumber(null)
    loadImageFromUrl(URL.createObjectURL(file))
  }

  /**
   * 디스플레이 캔버스 렌더링
   */
  useEffect(() => {
    if (!editCanvas || !canvasRef.current || !containerRef.current) return
    if (location.pathname !== '/image-editor') return

    const container = containerRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    const containerWidth = container.clientWidth - 16
    const containerHeight = container.clientHeight - 16
    if (containerWidth <= 0 || containerHeight <= 0) return

    const imgAspect = editCanvas.width / editCanvas.height
    const containerAspect = containerWidth / containerHeight

    let displayWidth: number
    let displayHeight: number

    if (imgAspect > containerAspect) {
      displayWidth = Math.min(containerWidth, editCanvas.width) * scale
      displayHeight = (Math.min(containerWidth, editCanvas.width) / imgAspect) * scale
    } else {
      displayHeight = Math.min(containerHeight, editCanvas.height) * scale
      displayWidth = Math.min(containerHeight, editCanvas.height) * imgAspect * scale
    }

    canvas.width = displayWidth
    canvas.height = displayHeight
    setCanvasSize({ width: displayWidth, height: displayHeight })

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(editCanvas, 0, 0, displayWidth, displayHeight)

    // 선택 영역 오버레이
    if (selection && selection.width > 0 && selection.height > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.fillRect(0, 0, canvas.width, selection.y)
      ctx.fillRect(0, selection.y + selection.height, canvas.width, canvas.height - selection.y - selection.height)
      ctx.fillRect(0, selection.y, selection.x, selection.height)
      ctx.fillRect(selection.x + selection.width, selection.y, canvas.width - selection.x - selection.width, selection.height)

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      ctx.setLineDash([])

      if (isMoving && moveImageCanvas) {
        ctx.globalAlpha = 0.85
        ctx.drawImage(moveImageCanvas, selection.x, selection.y, selection.width, selection.height)
        ctx.globalAlpha = 1.0
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height)
        ctx.setLineDash([])
      } else {
        const hs = 8
        const mx = selection.x + selection.width / 2
        const my = selection.y + selection.height / 2
        ctx.fillStyle = '#3b82f6'
        ;[
          [selection.x, selection.y],
          [selection.x + selection.width, selection.y],
          [selection.x, selection.y + selection.height],
          [selection.x + selection.width, selection.y + selection.height],
          [mx, selection.y],
          [mx, selection.y + selection.height],
          [selection.x, my],
          [selection.x + selection.width, my],
        ].forEach(([cx, cy]) => {
          ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs)
        })
      }
    }
  }, [editCanvas, scale, selection, location.pathname, editVersion, isMoving, moveImageCanvas])

  // ─── 마우스/터치 이벤트 ─── //

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    let clientX: number, clientY: number
    if ('touches' in e) {
      // TouchEvent
      const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0]
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const cssX = clientX - rect.left
    const cssY = clientY - rect.top
    const ratioX = canvas.width / rect.width
    const ratioY = canvas.height / rect.height
    return { x: cssX * ratioX, y: cssY * ratioY }
  }, [])

  const detectHandle = useCallback(
    (coords: { x: number; y: number }): HandleType => {
      if (!selection || selection.width < 5 || selection.height < 5) return null
      const { x, y, width, height } = selection
      const T = 10
      const mx = x + width / 2
      const my = y + height / 2

      if (Math.abs(coords.x - x) < T && Math.abs(coords.y - y) < T) return 'nw'
      if (Math.abs(coords.x - (x + width)) < T && Math.abs(coords.y - y) < T) return 'ne'
      if (Math.abs(coords.x - x) < T && Math.abs(coords.y - (y + height)) < T) return 'sw'
      if (Math.abs(coords.x - (x + width)) < T && Math.abs(coords.y - (y + height)) < T) return 'se'

      if (Math.abs(coords.x - mx) < T && Math.abs(coords.y - y) < T) return 'n'
      if (Math.abs(coords.x - mx) < T && Math.abs(coords.y - (y + height)) < T) return 's'
      if (Math.abs(coords.x - x) < T && Math.abs(coords.y - my) < T) return 'w'
      if (Math.abs(coords.x - (x + width)) < T && Math.abs(coords.y - my) < T) return 'e'

      return null
    },
    [selection]
  )

  const getCursorForHandle = useCallback(
    (coords: { x: number; y: number }): string => {
      const h = detectHandle(coords)
      const cursors: Record<string, string> = {
        nw: 'nwse-resize', se: 'nwse-resize',
        ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize',
        e: 'ew-resize', w: 'ew-resize',
      }
      return h ? cursors[h] : 'crosshair'
    },
    [detectHandle]
  )

  const isInsideSelection = useCallback(
    (coords: { x: number; y: number }): boolean => {
      if (!selection || selection.width < 10 || selection.height < 10) return false
      const margin = 12
      return (
        coords.x > selection.x + margin &&
        coords.x < selection.x + selection.width - margin &&
        coords.y > selection.y + margin &&
        coords.y < selection.y + selection.height - margin
      )
    },
    [selection]
  )

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!editCanvas) return
      const coords = getCanvasCoords(e)

      const handle = detectHandle(coords)
      if (handle && selection) {
        setResizeHandle(handle)
        setResizeOrigin({ ...selection })
        setSelectionStart(coords)
        return
      }

      if (isInsideSelection(coords) && selection) {
        const snapshot = editCanvas.toDataURL('image/png')
        setHistory((prev) => {
          const next = [...prev, snapshot]
          return next.length > 10 ? next.slice(-10) : next
        })

        const ctx = editCanvas.getContext('2d')!
        const sx = editCanvas.width / canvasSize.width
        const sy = editCanvas.height / canvasSize.height
        const srcX = Math.round(selection.x * sx)
        const srcY = Math.round(selection.y * sy)
        const srcW = Math.round(selection.width * sx)
        const srcH = Math.round(selection.height * sy)

        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = srcW
        tmpCanvas.height = srcH
        tmpCanvas.getContext('2d')!.drawImage(
          editCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH
        )
        setMoveImageCanvas(tmpCanvas)

        const bg = sampleBackgroundColor(ctx, srcX, srcY, srcW, srcH)
        ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
        ctx.fillRect(srcX, srcY, srcW, srcH)
        setEditVersion((v) => v + 1)

        setMoveOffset({ x: coords.x - selection.x, y: coords.y - selection.y })
        setIsMoving(true)
        return
      }

      setIsSelecting(true)
      setSelectionStart(coords)
      setSelection({ x: coords.x, y: coords.y, width: 0, height: 0 })
      setEditedText('')
      setDetectedFontSize(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editCanvas, getCanvasCoords, detectHandle, selection, isInsideSelection, canvasSize]
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const coords = getCanvasCoords(e)

      if (isMoving && selection) {
        setSelection({
          x: coords.x - moveOffset.x,
          y: coords.y - moveOffset.y,
          width: selection.width,
          height: selection.height,
        })
        return
      }

      if (resizeHandle && resizeOrigin) {
        const dx = coords.x - selectionStart.x
        const dy = coords.y - selectionStart.y
        const o = resizeOrigin
        let nx = o.x, ny = o.y, nw = o.width, nh = o.height

        if (resizeHandle.includes('w')) { nx = o.x + dx; nw = o.width - dx }
        if (resizeHandle.includes('e')) { nw = o.width + dx }
        if (resizeHandle.includes('n')) { ny = o.y + dy; nh = o.height - dy }
        if (resizeHandle.includes('s')) { nh = o.height + dy }

        if (nw < 10) { nw = 10 }
        if (nh < 10) { nh = 10 }

        setSelection({ x: nx, y: ny, width: nw, height: nh })
        return
      }

      // 커서 모양 변경 (마우스만)
      if (!isSelecting && canvasRef.current && !('touches' in e)) {
        if (isInsideSelection(coords)) {
          canvasRef.current.style.cursor = 'move'
        } else {
          canvasRef.current.style.cursor = getCursorForHandle(coords)
        }
      }

      if (!isSelecting) return
      setSelection({
        x: Math.min(selectionStart.x, coords.x),
        y: Math.min(selectionStart.y, coords.y),
        width: Math.abs(coords.x - selectionStart.x),
        height: Math.abs(coords.y - selectionStart.y),
      })
    },
    [isSelecting, selectionStart, getCanvasCoords, resizeHandle, resizeOrigin, getCursorForHandle, isMoving, selection, moveOffset, isInsideSelection]
  )

  const handlePointerUp = useCallback(() => {
    if (isMoving && moveImageCanvas && selection && editCanvas) {
      const ctx = editCanvas.getContext('2d')!
      const sx = editCanvas.width / canvasSize.width
      const sy = editCanvas.height / canvasSize.height
      const dstX = Math.round(selection.x * sx)
      const dstY = Math.round(selection.y * sy)
      ctx.drawImage(moveImageCanvas, dstX, dstY)
      setEditVersion((v) => v + 1)
      setIsMoving(false)
      setMoveImageCanvas(null)
      return
    }

    if (resizeHandle) {
      setResizeHandle(null)
      setResizeOrigin(null)
      return
    }
    setIsSelecting(false)
    setSelection((prev) => {
      if (prev && (prev.width < 10 || prev.height < 10)) return null
      return prev
    })
  }, [resizeHandle, isMoving, moveImageCanvas, selection, editCanvas, canvasSize])

  // ─── OCR 실행 ─── //
  const runOCR = async () => {
    if (!selection || !editCanvas) return

    setIsProcessing(true)
    setOcrProgress(0)
    setEditedText('')

    try {
      const sx = editCanvas.width / canvasSize.width
      const sy = editCanvas.height / canvasSize.height
      const srcX = Math.round(selection.x * sx)
      const srcY = Math.round(selection.y * sy)
      const srcW = Math.round(selection.width * sx)
      const srcH = Math.round(selection.height * sy)

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = srcW
      tempCanvas.height = srcH
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.drawImage(editCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)

      const result = await Tesseract.recognize(
        tempCanvas.toDataURL('image/png'),
        'kor',
        {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100))
            }
          },
        }
      )

      const ocrLines = result.data.lines as Array<{ bbox: { x0: number; y0: number; x1: number; y1: number } }>
      if (ocrLines && ocrLines.length > 0) {
        const totalLineHeight = ocrLines.reduce(
          (sum, line) => sum + (line.bbox.y1 - line.bbox.y0), 0
        )
        setDetectedFontSize(Math.round(totalLineHeight / ocrLines.length))
      }

      setEditedText(result.data.text.trim())
      // 모바일에서 OCR 완료 후 자동으로 패널 열기
      setMobilePanelOpen(true)
    } catch (err) {
      console.error('OCR 오류:', err)
      setEditedText('OCR 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ─── 텍스트 교체 ─── //
  const sampleBackgroundColor = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const sampleY = Math.max(0, y - 2)
    const sampleH = Math.min(2, y)
    if (sampleH <= 0) {
      const belowY = Math.min(y + h, ctx.canvas.height - 2)
      const belowData = ctx.getImageData(x, belowY, w, 2)
      return averageColor(belowData)
    }
    const data = ctx.getImageData(x, sampleY, w, sampleH)
    return averageColor(data)
  }

  const analyzeOriginalText = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): TextMeasure | null => {
      if (w <= 0 || h <= 0) return null
      const imgData = ctx.getImageData(x, y, w, h)
      const d = imgData.data

      let bgR = 0, bgG = 0, bgB = 0, bgN = 0
      for (let col = 0; col < w; col++) {
        for (const row of [0, 1, h - 2, h - 1]) {
          if (row < 0 || row >= h) continue
          const i = (row * w + col) * 4
          bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; bgN++
        }
      }
      for (let row = 2; row < h - 2; row++) {
        for (const col of [0, 1, w - 2, w - 1]) {
          if (col < 0 || col >= w) continue
          const i = (row * w + col) * 4
          bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; bgN++
        }
      }
      if (bgN === 0) return null
      bgR /= bgN; bgG /= bgN; bgB /= bgN

      let maxDiff = 0
      for (let i = 0; i < d.length; i += 4) {
        const diff = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB)
        if (diff > maxDiff) maxDiff = diff
      }
      const threshold = Math.max(maxDiff * 0.3, 30)

      let topRow = h, bottomRow = 0, leftCol = w, rightCol = 0
      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const i = (row * w + col) * 4
          const diff = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB)
          if (diff > threshold) {
            if (row < topRow) topRow = row
            if (row > bottomRow) bottomRow = row
            if (col < leftCol) leftCol = col
            if (col > rightCol) rightCol = col
          }
        }
      }
      if (topRow >= bottomRow) return null

      const textHeight = bottomRow - topRow + 1

      const scanFrom = Math.round(topRow + textHeight * 0.3)
      const scanTo = Math.round(topRow + textHeight * 0.7)
      const runs: number[] = []
      for (let row = scanFrom; row <= scanTo; row += 2) {
        let run = 0
        for (let col = leftCol; col <= rightCol; col++) {
          const i = (row * w + col) * 4
          const diff = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB)
          if (diff > threshold) {
            run++
          } else {
            if (run > 1) runs.push(run)
            run = 0
          }
        }
        if (run > 1) runs.push(run)
      }
      runs.sort((a, b) => a - b)
      const strokeWidth = runs.length > 0 ? runs[Math.floor(runs.length / 2)] : 2

      return {
        textHeight,
        textTop: topRow,
        textLeft: leftCol,
        strokeWidth,
        isBold: strokeWidth > 6,
      }
    },
    []
  )

  // 선택 영역이 확정되면 자동으로 원본 텍스트를 측정
  useEffect(() => {
    if (isSelecting || resizeHandle) return
    if (!selection || !editCanvas || selection.width < 10 || selection.height < 10) {
      setTextMeasure(null)
      return
    }
    const ctx = editCanvas.getContext('2d')
    if (!ctx) return

    const sx = editCanvas.width / canvasSize.width
    const sy = editCanvas.height / canvasSize.height
    const srcX = Math.round(selection.x * sx)
    const srcY = Math.round(selection.y * sy)
    const srcW = Math.round(selection.width * sx)
    const srcH = Math.round(selection.height * sy)

    const m = analyzeOriginalText(ctx, srcX, srcY, srcW, srcH)
    setTextMeasure(m)
    setFontSizeOverride(m ? m.textHeight : srcH)
    if (m) {
      setFontBold(m.isBold)
    } else {
      setFontBold(false)
    }
  }, [selection, isSelecting, resizeHandle, editCanvas, canvasSize, analyzeOriginalText])

  const averageColor = (data: ImageData) => {
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.data.length; i += 4) {
      r += data.data[i]
      g += data.data[i + 1]
      b += data.data[i + 2]
      count++
    }
    if (count === 0) return { r: 255, g: 255, b: 255 }
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    }
  }

  const replaceText = () => {
    if (!editCanvas || !selection || !editedText.trim()) return

    const ctx = editCanvas.getContext('2d')!

    const snapshot = editCanvas.toDataURL('image/png')
    setHistory((prev) => {
      const next = [...prev, snapshot]
      return next.length > 10 ? next.slice(-10) : next
    })

    const sx = editCanvas.width / canvasSize.width
    const sy = editCanvas.height / canvasSize.height
    const srcX = Math.round(selection.x * sx)
    const srcY = Math.round(selection.y * sy)
    const srcW = Math.round(selection.width * sx)
    const srcH = Math.round(selection.height * sy)

    const bg = sampleBackgroundColor(ctx, srcX, srcY, srcW, srcH)
    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
    ctx.fillRect(srcX, srcY, srcW, srcH)

    const brightness = (bg.r * 299 + bg.g * 587 + bg.b * 114) / 1000
    const textColor = brightness > 128 ? '#1a1a1a' : '#f0f0f0'

    const fontFamily = '"Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    const rawLines = editedText.split('\n')
    const weight = fontBold ? 'bold' : 'normal'

    const targetVisualH = fontSizeOverride ?? srcH

    const findFontSize = (target: number): number => {
      let lo = 1, hi = target * 3
      for (let i = 0; i < 20; i++) {
        const mid = Math.round((lo + hi) / 2)
        if (mid <= lo) break
        ctx.font = `${weight} ${mid}px ${fontFamily}`
        const m = ctx.measureText('한글테스트')
        const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
        if (h < target) lo = mid
        else hi = mid
      }
      return hi
    }

    let fontSize = findFontSize(Math.round(targetVisualH / rawLines.length))
    fontSize = Math.max(10, Math.min(fontSize, 800))
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`
    ctx.fillStyle = textColor
    ctx.textBaseline = 'middle'

    const lines = rawLines

    let maxLW = 0
    for (const line of lines) {
      maxLW = Math.max(maxLW, ctx.measureText(line).width)
    }
    if (maxLW > srcW) {
      const extraW = maxLW - srcW + 4
      ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
      ctx.fillRect(srcX + srcW, srcY, extraW, srcH)
    }
    ctx.fillStyle = textColor

    const lineH = srcH / lines.length
    const padX = 2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], srcX + padX, srcY + i * lineH + lineH / 2)
    }

    setEditVersion((v) => v + 1)
    setSelection(null)
    setEditedText('')
  }

  // ─── 실행 취소 ─── //
  const undoRef = useRef<() => void>(() => {})

  const undo = useCallback(() => {
    if (history.length === 0 || !editCanvas) return

    const last = history[history.length - 1]
    setHistory((prev) => prev.slice(0, -1))

    const img = new window.Image()
    img.onload = () => {
      const ctx = editCanvas.getContext('2d')!
      ctx.clearRect(0, 0, editCanvas.width, editCanvas.height)
      ctx.drawImage(img, 0, 0)
      setEditVersion((v) => v + 1)
      setSelection(null)
      setEditedText('')
    }
    img.src = last
  }, [history, editCanvas])

  undoRef.current = undo

  // Ctrl+Z 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (location.pathname !== '/image-editor') return
      const tag = document.activeElement?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undoRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [location.pathname])

  // ─── Ctrl+마우스 휠 확대/축소 ─── //
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setScale((s) => {
        const delta = e.deltaY < 0 ? 0.15 : -0.15
        return Math.min(Math.max(s + delta, 0.3), 5)
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // ─── PDF 변환 탭에 반영 ─── //
  const saveToStore = () => {
    if (!editCanvas || currentPageNumber === null) return
    const dataUrl = editCanvas.toDataURL('image/png')
    updatePageDataUrl(currentPageNumber, dataUrl)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const downloadImage = () => {
    if (!editCanvas) return
    const link = document.createElement('a')
    link.download = currentPageNumber
      ? `page_${String(currentPageNumber).padStart(2, '0')}_edited.png`
      : 'edited_image.png'
    link.href = editCanvas.toDataURL('image/png')
    link.click()
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 5))
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3))
  const resetZoom = () => setScale(1)

  const hasValidSelection = selection && selection.width > 10 && selection.height > 10

  // ── 텍스트 교체 패널 내용 (데스크탑/모바일 공용) ── //
  const renderEditPanel = () => (
    <>
      {/* 패널 헤더 */}
      <div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-400" />
          한글 텍스트 교체
        </h3>
        <div className="flex items-center gap-1">
          {hasValidSelection && (
            <button
              onClick={() => { setSelection(null); setEditedText('') }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="선택 해제"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* 모바일 접기 버튼 */}
          <button
            onClick={() => setMobilePanelOpen(false)}
            className="p-1 text-gray-400 hover:text-white transition-colors md:hidden"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 패널 콘텐츠 */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <div className="text-center">
              <p className="text-gray-300 text-sm">한글을 인식하고 있습니다...</p>
              <p className="text-gray-500 text-xs mt-1">{ocrProgress}% 완료</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {!hasValidSelection && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <Square className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-300 text-sm font-medium">영역을 선택하세요</p>
                <p className="text-gray-500 text-xs mt-1">
                  이미지에서 깨진 한글 영역을 드래그하세요
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1.5 sm:mb-2 block">
                {hasValidSelection ? '① 인식된 텍스트를 확인/수정하거나 직접 입력' : '교체할 텍스트'}
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-gray-200 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
                rows={4}
                placeholder="교체할 한글 텍스트를 입력하세요..."
              />
            </div>

            {/* 원본 텍스트 측정 결과 & 조절 */}
            {hasValidSelection && textMeasure && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 space-y-3">
                <p className="text-xs text-gray-400 font-medium">📏 원본 텍스트 측정 결과</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gray-500">글자 높이</span>
                  <span className="text-gray-300 font-mono">{textMeasure.textHeight}px</span>
                  <span className="text-gray-500">획 두께</span>
                  <span className="text-gray-300 font-mono">{textMeasure.strokeWidth}px</span>
                  <span className="text-gray-500">시작 위치</span>
                  <span className="text-gray-300 font-mono">({textMeasure.textLeft}, {textMeasure.textTop})</span>
                </div>

                {/* 폰트 크기 조절 */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                    <span>교체 텍스트 높이 (px)</span>
                    <button
                      onClick={() => setFontSizeOverride(textMeasure!.textHeight)}
                      className="text-blue-400 hover:text-blue-300 text-[10px]"
                    >
                      측정값으로 초기화
                    </button>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={Math.max(10, Math.round(textMeasure.textHeight * 0.5))}
                      max={Math.round(textMeasure.textHeight * 3)}
                      value={fontSizeOverride ?? textMeasure.textHeight}
                      onChange={(e) => setFontSizeOverride(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <input
                      type="number"
                      min={10}
                      max={800}
                      value={fontSizeOverride ?? textMeasure.textHeight}
                      onChange={(e) => setFontSizeOverride(Number(e.target.value))}
                      className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200 text-xs font-mono text-center"
                    />
                  </div>
                </div>

                {/* 볼드 토글 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fontBold}
                    onChange={(e) => setFontBold(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400">
                    볼드 {textMeasure.isBold && <span className="text-blue-400 ml-1">← 자동 감지</span>}
                  </span>
                </label>
              </div>
            )}

            <button
              onClick={replaceText}
              disabled={!editedText.trim() || !selection}
              className="flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm w-full justify-center transition-colors font-medium"
            >
              <Type className="w-4 h-4" />
              {hasValidSelection ? '② 선택 영역에 텍스트 교체' : '영역을 먼저 선택하세요'}
            </button>

            {/* 사용법 (데스크탑만 표시) */}
            <div className="bg-gray-800/30 rounded-lg p-3 space-y-1.5 hidden sm:block">
              <p className="text-xs text-gray-400 font-medium">💡 사용법</p>
              <p className="text-xs text-gray-500">1. Ctrl+마우스 휠로 확대</p>
              <p className="text-xs text-gray-500">2. 깨진 한글 영역을 드래그로 선택</p>
              <p className="text-xs text-gray-500">3. 자동 측정된 크기/두께 확인 (조절 가능)</p>
              <p className="text-xs text-gray-500">4. 텍스트를 입력하고 "텍스트 교체" 클릭</p>
              <p className="text-xs text-gray-500">5. 핸들로 영역 크기 조절 가능</p>
              <p className="text-xs text-gray-500">6. Ctrl+Z로 실행 취소</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ═══ 상단 툴바 ═══ */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b border-gray-800 shrink-0 flex-wrap">
        {/* 이미지 업로드 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs sm:text-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">이미지</span> 업로드
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="w-px h-5 sm:h-6 bg-gray-700" />

        {/* 줌 컨트롤 */}
        <button onClick={zoomOut} className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="축소">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs sm:text-sm text-gray-400 min-w-[40px] sm:min-w-[48px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="확대">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={resetZoom} className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="원래 크기">
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* 안내 (데스크탑만) */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400">
          <div className="w-px h-6 bg-gray-700" />
          <Square className="w-4 h-4 text-blue-400" />
          <span>Ctrl+휠 확대 → 드래그 선택 → 핸들로 크기 조절</span>
        </div>

        {/* 선택 영역 있을 때 OCR 버튼 */}
        {hasValidSelection && (
          <>
            <div className="w-px h-5 sm:h-6 bg-gray-700" />
            <button
              onClick={runOCR}
              disabled={isProcessing}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-xs sm:text-sm transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">인식 중...</span> {ocrProgress}%
                </>
              ) : (
                '한글 인식'
              )}
            </button>
            <button
              onClick={() => { setSelection(null); setEditedText('') }}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="선택 해제"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {/* 실행 취소 */}
        {history.length > 0 && (
          <>
            <div className="w-px h-5 sm:h-6 bg-gray-700" />
            <button
              onClick={undo}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs sm:text-sm transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">실행 취소</span>
            </button>
          </>
        )}

        {/* 우측 액션 버튼들 */}
        <div className="flex-1" />

        {editCanvas && (
          <button
            onClick={downloadImage}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs sm:text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">이미지 저장</span>
          </button>
        )}

        {currentPageNumber !== null && editCanvas && (
          <button
            onClick={saveToStore}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm transition-colors relative"
          >
            {showSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">저장 완료!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">PDF에 반영</span>
                <span className="hidden lg:inline"> (p.{currentPageNumber})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ═══ 메인 콘텐츠: 캔버스 + 편집 패널 ═══ */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* 캔버스 영역 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-900/50 flex items-center justify-center p-2 sm:p-4"
        >
          {!editCanvas ? (
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl sm:rounded-2xl p-8 sm:p-16 text-center cursor-pointer hover:border-gray-500 active:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-400 text-base sm:text-lg mb-2">이미지를 업로드하세요</p>
              <p className="text-gray-500 text-xs sm:text-sm">
                또는 PDF 변환 페이지에서 이미지를 가져오세요
              </p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="cursor-crosshair shadow-2xl touch-none"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          )}
        </div>

        {/* ═══ 모바일: 패널 토글 버튼 (패널이 닫혀 있을 때만) ═══ */}
        {editCanvas && !mobilePanelOpen && (
          <button
            onClick={() => setMobilePanelOpen(true)}
            className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-gray-300 text-xs shadow-lg z-10"
          >
            <ChevronUp className="w-4 h-4" />
            텍스트 교체 패널
          </button>
        )}

        {/* ═══ 데스크탑: 우측 패널 (항상 표시) ═══ */}
        {editCanvas && (
          <div className="hidden md:flex w-72 lg:w-80 border-l border-gray-800 flex-col bg-gray-900/80 shrink-0">
            {renderEditPanel()}
          </div>
        )}

        {/* ═══ 모바일: 하단 슬라이드업 패널 ═══ */}
        {editCanvas && mobilePanelOpen && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 max-h-[60vh] flex flex-col bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl z-20">
            {/* 드래그 핸들 */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            {renderEditPanel()}
          </div>
        )}
      </div>

      {/* ═══ 하단 상태바 (데스크탑만, 모바일에서는 공간 절약을 위해 숨김) ═══ */}
      <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-gray-800 text-xs text-gray-500 shrink-0">
        {editCanvas && (
          <>
            <span>원본: {editCanvas.width} × {editCanvas.height}px</span>
            <span>표시: {Math.round(canvasSize.width)} × {Math.round(canvasSize.height)}px</span>
            <span>배율: {Math.round(scale * 100)}%</span>
          </>
        )}
        {hasValidSelection && (
          <span className="text-blue-400">
            선택: {Math.round(selection!.width)} × {Math.round(selection!.height)}px
          </span>
        )}
        {currentPageNumber !== null && (
          <span className="text-emerald-400 ml-auto">
            PDF 페이지 {currentPageNumber} 편집 중
          </span>
        )}
        {history.length > 0 && (
          <span className="text-gray-600">편집: {history.length}회</span>
        )}
      </div>
    </div>
  )
}

export default ImageEditor
