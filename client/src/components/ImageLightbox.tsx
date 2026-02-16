import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * ImageLightbox 컴포넌트
 *
 * - 이미지 클릭 시 원본 크기로 모달 표시
 * - 여러 이미지 좌/우 슬라이드 탐색
 * - 키보드 좌/우 화살표 & ESC 지원
 * - 모바일 터치 스와이프 지원
 * - 하단 인디케이터 점
 */

interface ImageLightboxProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // 열릴 때 initialIndex 동기화
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isOpen])

  // 키보드 단축키
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentIndex((p) => (p - 1 + images.length) % images.length)
      else if (e.key === 'ArrowRight') setCurrentIndex((p) => (p + 1) % images.length)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, images.length, onClose])

  // body 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || images.length === 0) return null

  const handlePrev = () => setCurrentIndex((p) => (p - 1 + images.length) % images.length)
  const handleNext = () => setCurrentIndex((p) => (p + 1) % images.length)

  // 터치 스와이프
  const minSwipe = 50
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX) }
  const onTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX) }
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const dist = touchStart - touchEnd
    if (dist > minSwipe) handleNext()
    else if (dist < -minSwipe) handlePrev()
  }

  const currentImage = images[currentIndex]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 블러 배경 */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${currentImage})` }}
      />

      {/* 좌측 그라디언트 + 버튼 */}
      {images.length > 1 && (
        <>
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity z-40 pointer-events-none" />
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev() }}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-gray-800/90 hover:bg-gray-700 text-white rounded-full items-center justify-center z-50 shadow-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </>
      )}

      {/* 이미지 */}
      <div
        className="relative z-10 flex items-center justify-center w-full h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
          draggable={false}
        />
      </div>

      {/* 우측 그라디언트 + 버튼 */}
      {images.length > 1 && (
        <>
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity z-40 pointer-events-none" />
          <button
            onClick={(e) => { e.stopPropagation(); handleNext() }}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-gray-800/90 hover:bg-gray-700 text-white rounded-full items-center justify-center z-50 shadow-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* 페이지 인디케이터 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-50">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx) }}
              className={`h-2 rounded-full transition-all ${
                currentIndex === idx
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/80 w-2'
              }`}
            />
          ))}
        </div>
      )}

      {/* 카운터 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-sm rounded-full z-50">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}

export default ImageLightbox

