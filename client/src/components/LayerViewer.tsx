import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Eye,
  EyeOff,
  Download,
  Layers,
  ArrowLeft,
  Type,
  Square,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { writePsd } from 'ag-psd'
import { ElementType, type SlideData } from '../types/slide'

// ────────────────────── 타입 ──────────────────────

/** 각 레이어의 상태 정보 */
interface LayerInfo {
  id: string
  name: string
  type: 'background' | 'text' | 'shape' | 'image'
  visible: boolean
  opacity: number
  canvas: HTMLCanvasElement | null
  x: number          // 전체 이미지 기준 위치 (px)
  y: number
  width: number      // 레이어 자체 크기 (px)
  height: number
  thumbnailUrl: string
}

interface LayerViewerProps {
  slides: SlideData[]
  onBack: () => void
  fileName?: string
}

// ────────────────────── 유틸 함수 ──────────────────────

const loadImageEl = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const getImageSrc = (base64OrUrl: string) =>
  base64OrUrl.startsWith('data:') ? base64OrUrl : `data:image/png;base64,${base64OrUrl}`

/**
 * 레이어 캔버스 → 40×40 썸네일 데이터 URL
 * 체커보드 배경 위에 레이어 컨텐츠를 축소 렌더링
 */
const generateThumbnail = (canvas: HTMLCanvasElement, w: number, h: number): string => {
  const S = 40
  const thumb = document.createElement('canvas')
  thumb.width = S
  thumb.height = S
  const ctx = thumb.getContext('2d')!

  // 체커보드 배경 (투명 부분 표시)
  for (let y = 0; y < S; y += 6) {
    for (let x = 0; x < S; x += 6) {
      ctx.fillStyle = ((x + y) / 6) % 2 === 0 ? '#444' : '#333'
      ctx.fillRect(x, y, 6, 6)
    }
  }

  const scale = Math.min(S / w, S / h)
  const dw = w * scale
  const dh = h * scale
  ctx.drawImage(canvas, (S - dw) / 2, (S - dh) / 2, dw, dh)

  return thumb.toDataURL('image/png')
}

// ────────────────────── 컴포넌트 ──────────────────────

/**
 * 레이어 분리 뷰어 컴포넌트
 *
 * 이미지/PDF 슬라이드를 배경·텍스트·도형·이미지 레이어로 분리하여 보여주고,
 * 개별 PNG 다운로드 또는 PSD(포토샵) 파일로 내보내기 가능
 *
 * 레이어 생성 흐름:
 *  1. 원본 이미지에서 모든 요소 영역을 strip-copy 방식으로 지워 배경 레이어 생성
 *  2. 도형 요소 → 투명 배경 위에 도형 렌더링
 *  3. 이미지 요소 → 원본에서 해당 영역 크롭
 *  4. 텍스트 요소 → 투명 배경 위에 텍스트 렌더링
 */
const LayerViewer: React.FC<LayerViewerProps> = ({ slides, onBack, fileName = 'layers' }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  const currentSlide = slides[currentIndex]

  // ─── 레이어 생성 ─── //
  const generateLayers = useCallback(async () => {
    if (!currentSlide) return
    setIsGenerating(true)
    setLayers([])
    setSelectedLayerId(null)

    try {
      const imgSrc = getImageSrc(currentSlide.originalImageBase64)
      const img = await loadImageEl(imgSrc)
      const imgW = img.width
      const imgH = img.height
      setImageSize({ width: imgW, height: imgH })

      const newLayers: LayerInfo[] = []
      const allElements = currentSlide.elements || []
      const textElements = allElements.filter(el => el.type === ElementType.Text)
      const shapeElements = allElements.filter(el => el.type === ElementType.Shape)
      const imageElements = allElements.filter(el => el.type === ElementType.Image)

      // 배경에서 지울 영역 = 모든 요소 (전체 크기 이미지 제외)
      const regionsToErase = allElements
        .filter(el => !(el.type === ElementType.Image && el.w >= 95 && el.h >= 95))
        .map(el => ({
          x: (el.x / 100) * imgW,
          y: (el.y / 100) * imgH,
          w: (el.w / 100) * imgW,
          h: (el.h / 100) * imgH,
        }))

      // ── 1. 배경 레이어 (strip-copy 방식으로 텍스트/도형 영역 제거) ──
      const bgCanvas = document.createElement('canvas')
      bgCanvas.width = imgW
      bgCanvas.height = imgH
      const bgCtx = bgCanvas.getContext('2d')!
      bgCtx.drawImage(img, 0, 0)

      if (regionsToErase.length > 0) {
        for (const r of regionsToErase) {
          const pad = 3
          const rx = Math.max(0, Math.round(r.x) - pad)
          const ry = Math.max(0, Math.round(r.y) - pad)
          const rw = Math.min(imgW - rx, Math.round(r.w) + pad * 2)
          const rh = Math.min(imgH - ry, Math.round(r.h) + pad * 2)

          // 영역 바로 위 1px strip 복사 → 세로 타일링 (배경 패턴 유지)
          const stripY = Math.max(0, ry - 2)
          const strip = bgCtx.getImageData(rx, stripY, rw, 1)
          for (let y = ry; y < Math.min(imgH, ry + rh); y++) {
            bgCtx.putImageData(strip, rx, y)
          }
        }
      }

      newLayers.push({
        id: 'bg',
        name: '배경',
        type: 'background',
        visible: true,
        opacity: 1,
        canvas: bgCanvas,
        x: 0, y: 0,
        width: imgW, height: imgH,
        thumbnailUrl: generateThumbnail(bgCanvas, imgW, imgH),
      })

      // ── 2. 도형 레이어 ──
      shapeElements.forEach((el, i) => {
        const x = Math.round((el.x / 100) * imgW)
        const y = Math.round((el.y / 100) * imgH)
        const w = Math.max(1, Math.round((el.w / 100) * imgW))
        const h = Math.max(1, Math.round((el.h / 100) * imgH))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        const color = el.bgColor?.startsWith('#') ? el.bgColor : `#${el.bgColor || 'CCCCCC'}`

        if (el.shapeType === 'ellipse') {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (el.shapeType === 'line') {
          ctx.strokeStyle = color
          ctx.lineWidth = Math.max(1, h * 0.1)
          ctx.beginPath()
          ctx.moveTo(0, h / 2)
          ctx.lineTo(w, h / 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = color
          ctx.fillRect(0, 0, w, h)
        }

        newLayers.push({
          id: `shape-${i}`,
          name: `도형 ${i + 1}`,
          type: 'shape',
          visible: true,
          opacity: 1,
          canvas,
          x, y, width: w, height: h,
          thumbnailUrl: generateThumbnail(canvas, w, h),
        })
      })

      // ── 3. 이미지 레이어 (원본에서 크롭) ──
      for (let i = 0; i < imageElements.length; i++) {
        const el = imageElements[i]
        // 전체 크기(≈100%) 이미지는 배경과 동일하므로 스킵
        if (el.w >= 95 && el.h >= 95) continue

        const x = Math.round((el.x / 100) * imgW)
        const y = Math.round((el.y / 100) * imgH)
        const w = Math.max(1, Math.round((el.w / 100) * imgW))
        const h = Math.max(1, Math.round((el.h / 100) * imgH))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h)

        newLayers.push({
          id: `image-${i}`,
          name: `이미지 ${i + 1}`,
          type: 'image',
          visible: true,
          opacity: 1,
          canvas,
          x, y, width: w, height: h,
          thumbnailUrl: generateThumbnail(canvas, w, h),
        })
      }

      // ── 4. 텍스트 레이어 (투명 배경 위에 텍스트 렌더링) ──
      textElements.forEach((el, i) => {
        const x = Math.round((el.x / 100) * imgW)
        const y = Math.round((el.y / 100) * imgH)
        const w = Math.max(1, Math.round((el.w / 100) * imgW))
        const h = Math.max(1, Math.round((el.h / 100) * imgH))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!

        // 이미지 해상도에 비례한 폰트 크기 스케일링
        const scaleFactor = imgW / 960
        const fontSize = Math.max(10, Math.round((el.fontSize || 14) * scaleFactor))
        const color = el.color?.startsWith('#') ? el.color : `#${el.color || '333333'}`

        ctx.font = `${el.bold ? 'bold ' : ''}${fontSize}px "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif`
        ctx.fillStyle = color
        ctx.textBaseline = 'top'

        const text = el.content || ''
        const lines = text.split('\n')
        const lineHeight = fontSize * 1.4

        for (let li = 0; li < lines.length; li++) {
          let tx = 2
          if (el.align === 'center') {
            ctx.textAlign = 'center'
            tx = w / 2
          } else if (el.align === 'right') {
            ctx.textAlign = 'right'
            tx = w - 2
          } else {
            ctx.textAlign = 'left'
          }
          ctx.fillText(lines[li], tx, li * lineHeight + 2)
        }

        const truncated = text.length > 15 ? text.slice(0, 15) + '…' : text

        newLayers.push({
          id: `text-${i}`,
          name: truncated || `텍스트 ${i + 1}`,
          type: 'text',
          visible: true,
          opacity: 1,
          canvas,
          x, y, width: w, height: h,
          thumbnailUrl: generateThumbnail(canvas, w, h),
        })
      })

      setLayers(newLayers)
    } catch (err) {
      console.error('레이어 생성 오류:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [currentSlide])

  // 페이지(슬라이드) 변경 시 레이어 재생성
  useEffect(() => {
    generateLayers()
  }, [currentIndex, generateLayers])

  // ─── 미리보기 렌더링 ─── //
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || imageSize.width === 0 || layers.length === 0) return

    canvas.width = imageSize.width
    canvas.height = imageSize.height
    const ctx = canvas.getContext('2d')!

    // 체커보드 패턴 (투명 배경 표현)
    const pat = document.createElement('canvas')
    pat.width = 32
    pat.height = 32
    const pCtx = pat.getContext('2d')!
    pCtx.fillStyle = '#3a3a3a'
    pCtx.fillRect(0, 0, 32, 32)
    pCtx.fillStyle = '#2a2a2a'
    pCtx.fillRect(16, 0, 16, 16)
    pCtx.fillRect(0, 16, 16, 16)

    const bgPattern = ctx.createPattern(pat, 'repeat')!
    ctx.fillStyle = bgPattern
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 보이는 레이어를 아래→위 순서로 합성
    for (const layer of layers) {
      if (!layer.visible || !layer.canvas) continue
      ctx.globalAlpha = layer.opacity
      ctx.drawImage(layer.canvas, layer.x, layer.y)
    }
    ctx.globalAlpha = 1
  }, [layers, imageSize])

  useEffect(() => {
    renderPreview()
  }, [renderPreview])

  // ─── 레이어 가시성 / 불투명도 ─── //

  const toggleVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }

  const toggleAllVisibility = (visible: boolean) => {
    setLayers(prev => prev.map(l => ({ ...l, visible })))
  }

  const setLayerOpacity = (id: string, value: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: value } : l))
  }

  // ─── 내보내기 ─── //

  /** 개별 레이어를 전체 이미지 크기 PNG로 다운로드 */
  const downloadLayer = (layer: LayerInfo) => {
    if (!layer.canvas) return
    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = imageSize.width
    fullCanvas.height = imageSize.height
    const ctx = fullCanvas.getContext('2d')!
    ctx.drawImage(layer.canvas, layer.x, layer.y)

    const link = document.createElement('a')
    link.download = `${fileName}_${layer.name.replace(/[<>:"/\\|?*]/g, '_')}.png`
    link.href = fullCanvas.toDataURL('image/png')
    link.click()
  }

  /** 모든 레이어를 개별 PNG로 다운로드 */
  const downloadAllLayers = async () => {
    for (let i = 0; i < layers.length; i++) {
      downloadLayer(layers[i])
      if (i < layers.length - 1) {
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }

  /** PSD(포토샵) 파일로 내보내기 */
  const exportPsd = async () => {
    if (layers.length === 0) return

    try {
      // 합성 미리보기 이미지 (PSD 썸네일용)
      const compositeCanvas = document.createElement('canvas')
      compositeCanvas.width = imageSize.width
      compositeCanvas.height = imageSize.height
      const compCtx = compositeCanvas.getContext('2d')!

      for (const layer of layers) {
        if (!layer.visible || !layer.canvas) continue
        compCtx.globalAlpha = layer.opacity
        compCtx.drawImage(layer.canvas, layer.x, layer.y)
      }
      compCtx.globalAlpha = 1

      // PSD 구조 생성
      const psdData: any = {
        width: imageSize.width,
        height: imageSize.height,
        canvas: compositeCanvas,
        children: layers
          .filter(l => l.canvas)
          .map(l => ({
            name: l.name,
            left: l.x,
            top: l.y,
            right: l.x + l.width,
            bottom: l.y + l.height,
            canvas: l.canvas!,
            hidden: !l.visible,
            opacity: Math.round(l.opacity * 255),
          })),
      }

      const buffer = writePsd(psdData)
      const blob = new Blob([buffer], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}_레이어_${currentIndex + 1}.psd`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PSD 내보내기 오류:', err)
      alert('PSD 생성 중 오류가 발생했습니다.')
    }
  }

  // ─── 레이어 타입별 아이콘/색상/라벨 ─── //

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'background': return <ImageIcon className="w-3.5 h-3.5" />
      case 'text': return <Type className="w-3.5 h-3.5" />
      case 'shape': return <Square className="w-3.5 h-3.5" />
      case 'image': return <ImageIcon className="w-3.5 h-3.5" />
      default: return <Layers className="w-3.5 h-3.5" />
    }
  }

  const getLayerColor = (type: string) => {
    switch (type) {
      case 'background': return 'text-emerald-400'
      case 'text': return 'text-blue-400'
      case 'shape': return 'text-purple-400'
      case 'image': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const getLayerTypeLabel = (type: string) => {
    switch (type) {
      case 'background': return '배경'
      case 'text': return '텍스트'
      case 'shape': return '도형'
      case 'image': return '이미지'
      default: return type
    }
  }

  const selectedLayer = layers.find(l => l.id === selectedLayerId)

  // ─── UI ─── //

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">돌아가기</span>
          </button>
          <div className="h-5 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium text-sm">레이어 분리 뷰어</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* 페이지 네비게이션 */}
          {slides.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 tabular-nums">
                {currentIndex + 1}/{slides.length}
              </span>
              <button
                onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
                disabled={currentIndex === slides.length - 1}
                className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={downloadAllLayers}
            disabled={isGenerating || layers.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-gray-300 rounded-lg text-xs transition-colors"
            title="모든 레이어를 PNG로 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PNG 전체</span>
          </button>

          <button
            onClick={exportPsd}
            disabled={isGenerating || layers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/30"
          >
            <Download className="w-4 h-4" />
            PSD 다운로드
          </button>
        </div>
      </div>

      {/* ── 본문 ── */}
      <div className="flex-1 flex min-h-0">
        {/* 좌측: 레이어 목록 */}
        <div className="w-60 sm:w-72 bg-gray-900/60 border-r border-gray-700/50 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-gray-700/50 bg-gray-800/50 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              레이어
              <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full text-[10px]">
                {layers.length}
              </span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleAllVisibility(true)}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                title="모두 보이기"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleAllVisibility(false)}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                title="모두 숨기기"
              >
                <EyeOff className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 레이어 리스트 (맨 위 레이어 = 목록 상단) */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">레이어 분리 중...</span>
              </div>
            ) : (
              [...layers].reverse().map(layer => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id === selectedLayerId ? null : layer.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                    selectedLayerId === layer.id
                      ? 'bg-purple-500/15 ring-1 ring-purple-500/30'
                      : 'hover:bg-gray-800/60'
                  }`}
                >
                  {/* 가시성 토글 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id) }}
                    className="shrink-0 p-0.5"
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400" />
                    )}
                  </button>

                  {/* 썸네일 */}
                  <img
                    src={layer.thumbnailUrl}
                    className="w-8 h-8 rounded border border-gray-700 shrink-0"
                    alt={layer.name}
                  />

                  {/* 레이어 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={getLayerColor(layer.type)}>
                        {getLayerIcon(layer.type)}
                      </span>
                      <span className={`text-[11px] font-medium truncate ${
                        layer.visible ? 'text-gray-200' : 'text-gray-500'
                      }`}>
                        {layer.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500">
                      {getLayerTypeLabel(layer.type)} · {layer.width}×{layer.height}
                    </span>
                  </div>

                  {/* 개별 PNG 다운로드 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadLayer(layer) }}
                    className="shrink-0 p-1 text-gray-600 hover:text-blue-400 transition-colors"
                    title="PNG로 다운로드"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 선택된 레이어의 불투명도 슬라이더 */}
          {selectedLayer && (
            <div className="px-3 py-2.5 border-t border-gray-700/50 bg-gray-800/50 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">불투명도</span>
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {Math.round(selectedLayer.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(selectedLayer.opacity * 100)}
                onChange={(e) => setLayerOpacity(selectedLayerId!, Number(e.target.value) / 100)}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex items-center justify-between mt-2 text-[9px] text-gray-500">
                <span>{selectedLayer.width} × {selectedLayer.height}px</span>
                <span>위치: ({selectedLayer.x}, {selectedLayer.y})</span>
              </div>
            </div>
          )}
        </div>

        {/* 중앙: 미리보기 */}
        <div className="flex-1 bg-gray-950 flex items-center justify-center p-4 sm:p-8 overflow-auto min-h-0">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin" />
              <span className="text-sm">레이어를 분리하고 있습니다...</span>
            </div>
          ) : layers.length === 0 ? (
            <div className="text-center text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">분석된 레이어가 없습니다</p>
            </div>
          ) : (
            <canvas
              ref={previewCanvasRef}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-gray-800"
              style={{ imageRendering: 'auto' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default LayerViewer

