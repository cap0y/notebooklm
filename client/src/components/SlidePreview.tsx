import React, { useState, useRef, useEffect } from 'react'
import {
  Download,
  Trash2,
  Type,
  Square,
  Image as ImageIcon,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { ElementType, type SlideElement, type SlideData } from '../types/slide'

interface SlidePreviewProps {
  slides: SlideData[]
  onUpdateSlides: (slides: SlideData[]) => void
  onGenerate: () => void
  onBack: () => void
  isGenerating: boolean
  progressText: string
}

/**
 * 슬라이드 미리보기 & 편집 컴포넌트
 *
 * AI(또는 기본 모드) 분석 결과를 시각화하고 편집할 수 있는 3단 레이아웃:
 * - 좌측: 슬라이드 썸네일 목록
 * - 중앙: 원본 이미지 + 요소 바운딩 박스 오버레이
 * - 우측: 요소 속성 편집 패널
 */
const SlidePreview: React.FC<SlidePreviewProps> = ({
  slides,
  onUpdateSlides,
  onGenerate,
  onBack,
  isGenerating,
  progressText,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null)

  const currentSlide = slides[currentIndex]
  const listRefs = useRef<(HTMLDivElement | null)[]>([])

  // 선택된 요소가 바뀌면 목록에서 해당 요소로 스크롤
  useEffect(() => {
    if (selectedElementIndex !== null && listRefs.current[selectedElementIndex]) {
      listRefs.current[selectedElementIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [selectedElementIndex])

  // 슬라이드 변경 시 선택 초기화
  useEffect(() => {
    setSelectedElementIndex(null)
  }, [currentIndex])

  /** 요소 속성 변경 핸들러 */
  const handleElementChange = (elementIndex: number, field: string, value: any) => {
    const updatedSlides = [...slides]
    updatedSlides[currentIndex] = {
      ...updatedSlides[currentIndex],
      elements: updatedSlides[currentIndex].elements.map((el, idx) =>
        idx === elementIndex ? { ...el, [field]: value } : el,
      ),
    }
    onUpdateSlides(updatedSlides)
  }

  /** 요소 삭제 핸들러 */
  const handleDeleteElement = (elementIndex: number) => {
    const updatedSlides = [...slides]
    updatedSlides[currentIndex] = {
      ...updatedSlides[currentIndex],
      elements: updatedSlides[currentIndex].elements.filter((_, idx) => idx !== elementIndex),
    }
    onUpdateSlides(updatedSlides)
    setSelectedElementIndex(null)
  }

  /** 요소 타입별 아이콘 */
  const getElementIcon = (type: ElementType) => {
    switch (type) {
      case ElementType.Text:
        return <Type className="w-4 h-4" />
      case ElementType.Shape:
        return <Square className="w-4 h-4" />
      case ElementType.Image:
        return <ImageIcon className="w-4 h-4" />
    }
  }

  /** 요소 타입 한글명 */
  const getElementLabel = (type: ElementType) => {
    switch (type) {
      case ElementType.Text:
        return '텍스트'
      case ElementType.Shape:
        return '도형'
      case ElementType.Image:
        return '이미지'
    }
  }

  /** base64 이미지 src 정규화 (data: prefix 유무 처리) */
  const getImageSrc = (base64: string) => {
    if (base64.startsWith('data:')) return base64
    return `data:image/png;base64,${base64}`
  }

  if (!currentSlide) return null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700/50 overflow-hidden flex flex-col flex-1">
      {/* ── 상단 헤더 ── */}
      <div className="p-3 sm:p-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            disabled={isGenerating}
            className="text-gray-400 hover:text-white disabled:text-gray-600 transition-colors p-1"
            title="돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white">
              슬라이드 미리보기 & 편집
            </h2>
            <p className="text-xs text-gray-400">
              이미지 위의 요소를 클릭하거나 목록에서 선택하여 편집하세요
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 완료 상태 메시지 */}
          {!isGenerating && progressText && (
            <span className="text-xs text-emerald-400 hidden sm:inline">{progressText}</span>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs sm:text-sm">{progressText || '생성 중...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>PPTX 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 3단 레이아웃 ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 슬라이드 썸네일 */}
        <div className="w-28 sm:w-36 bg-gray-800/30 border-r border-gray-700/50 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 shrink-0">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2 ${
                idx === currentIndex
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="aspect-video bg-gray-900 relative">
                <img
                  src={getImageSrc(slide.originalImageBase64)}
                  alt={`슬라이드 ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                  {idx + 1}
                </div>
                {slide.elements.length > 0 && (
                  <div className="absolute top-0 left-0 bg-orange-500/80 text-white text-[9px] px-1 py-0.5 rounded-br">
                    {slide.elements.length}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 중앙: 원본 이미지 + 바운딩 박스 오버레이 */}
        <div className="flex-1 bg-gray-800/20 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
          <div className="w-full max-w-4xl shadow-xl rounded-lg overflow-hidden bg-gray-900 relative">
            {/* 슬라이드 정보 바 */}
            <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1.5 flex justify-between items-center">
              <span>원본 슬라이드 — 요소를 클릭하여 선택</span>
              <span className="text-gray-400">
                {currentIndex + 1} / {slides.length}
                {currentSlide.mode === 'ai' && (
                  <span className="ml-2 text-orange-400">AI 분석</span>
                )}
                {currentSlide.mode === 'basic' && (
                  <span className="ml-2 text-emerald-400">기본 모드</span>
                )}
              </span>
            </div>

            {/* 이미지 + 오버레이 영역 */}
            <div
              className="relative w-full"
              onClick={() => setSelectedElementIndex(null)}
            >
              <img
                src={getImageSrc(currentSlide.originalImageBase64)}
                className="w-full h-auto block select-none"
                alt="원본 슬라이드"
              />

              {/* 요소별 인터랙티브 바운딩 박스 */}
              {currentSlide.elements.map((el, idx) => {
                const isSelected = idx === selectedElementIndex
                return (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedElementIndex(idx)
                    }}
                    title={`${getElementLabel(el.type)} — 클릭하여 편집`}
                    className={`absolute transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-red-500 bg-red-500/10 z-20'
                        : 'border border-dashed border-blue-400/30 hover:border-blue-400 hover:bg-blue-400/10 z-10'
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.w}%`,
                      height: `${el.h}%`,
                    }}
                  >
                    {isSelected && (
                      <div className="absolute -top-5 left-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                        {getElementLabel(el.type)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 우측: 요소 편집 패널 */}
        <div className="w-72 sm:w-80 bg-gray-800/50 border-l border-gray-700/50 overflow-y-auto flex flex-col shrink-0">
          {/* 패널 헤더 */}
          <div className="p-3 border-b border-gray-700/50 sticky top-0 bg-gray-800 z-30 shadow-sm">
            <h3 className="font-semibold text-gray-200 flex items-center justify-between text-sm">
              <span>요소 목록</span>
              <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full text-xs">
                {currentSlide.elements.length}
              </span>
            </h3>
          </div>

          {/* 요소 카드 리스트 */}
          <div className="p-3 space-y-2 pb-20">
            {currentSlide.elements.map((el, idx) => {
              const isSelected = idx === selectedElementIndex
              return (
                <div
                  key={idx}
                  ref={(r) => {
                    listRefs.current[idx] = r
                  }}
                  onClick={() => setSelectedElementIndex(idx)}
                  className={`border rounded-lg p-2.5 transition-all duration-200 cursor-pointer relative ${
                    isSelected
                      ? 'border-red-500 bg-red-500/10 shadow-md ring-1 ring-red-500/20'
                      : 'border-gray-700 hover:border-gray-500 bg-gray-800/30'
                  }`}
                >
                  {/* 요소 타입 헤더 + 삭제 버튼 */}
                  <div className="flex justify-between items-start mb-1.5">
                    <div
                      className={`flex items-center gap-2 ${isSelected ? 'text-red-400' : 'text-gray-400'}`}
                    >
                      {getElementIcon(el.type)}
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {getElementLabel(el.type)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteElement(idx)
                      }}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      title="요소 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* ── 텍스트 요소 편집 ── */}
                  {el.type === ElementType.Text && (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={el.content || ''}
                        onChange={(e) => handleElementChange(idx, 'content', e.target.value)}
                        onFocus={() => setSelectedElementIndex(idx)}
                        className="w-full text-sm bg-gray-900 border border-gray-600 rounded-md focus:border-orange-500 focus:ring-1 focus:ring-orange-500 min-h-[50px] p-2 text-gray-200 placeholder-gray-500 resize-none"
                        placeholder="텍스트 내용..."
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 block mb-0.5">
                            크기 (pt)
                          </label>
                          <input
                            type="number"
                            value={el.fontSize || 14}
                            onChange={(e) =>
                              handleElementChange(idx, 'fontSize', parseInt(e.target.value))
                            }
                            className="w-full text-xs bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-200"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 block mb-0.5">색상</label>
                          <input
                            type="color"
                            value={
                              el.color?.startsWith('#') ? el.color : `#${el.color || '000000'}`
                            }
                            onChange={(e) => handleElementChange(idx, 'color', e.target.value)}
                            className="h-6 w-full p-0 border-0 rounded cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 도형 요소 편집 ── */}
                  {el.type === ElementType.Shape && (
                    <div className="text-sm text-gray-400" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs w-10">종류:</span>
                        <select
                          value={el.shapeType || 'rect'}
                          onChange={(e) => handleElementChange(idx, 'shapeType', e.target.value)}
                          onFocus={() => setSelectedElementIndex(idx)}
                          className="text-xs bg-gray-900 border border-gray-600 rounded px-2 py-1 flex-1 text-gray-200"
                        >
                          <option value="rect">사각형</option>
                          <option value="ellipse">타원</option>
                          <option value="line">선</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-10">채우기:</span>
                        <input
                          type="color"
                          value={
                            el.bgColor?.startsWith('#') ? el.bgColor : `#${el.bgColor || 'CCCCCC'}`
                          }
                          onChange={(e) => handleElementChange(idx, 'bgColor', e.target.value)}
                          className="h-6 flex-1 p-0 border-0 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── 이미지 요소 정보 ── */}
                  {el.type === ElementType.Image && (
                    <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded border border-gray-700">
                      <div className="flex justify-between mb-1">
                        <span>위치:</span>
                        <span className="font-mono">
                          {Math.round(el.x)}%, {Math.round(el.y)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>크기:</span>
                        <span className="font-mono">
                          {Math.round(el.w)}% × {Math.round(el.h)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {currentSlide.elements.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                감지된 편집 가능 요소가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SlidePreview

