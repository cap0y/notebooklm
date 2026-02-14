import React from 'react'
import { Slide } from '../types'

interface SlideThumbnailProps {
  slide: Slide
  index: number
  isActive: boolean
  isSelected: boolean
  onClick: () => void
  onSelect: (e: React.MouseEvent) => void
  onDelete: (id: string) => void
}

/**
 * 슬라이드 썸네일 — 좌측 사이드바에 표시되는 개별 슬라이드 미리보기 카드
 *
 * - 활성 상태, 선택 상태에 따른 스타일 구분
 * - 오디오 생성 완료 표시 (마이크 아이콘)
 * - 호버 시 삭제 버튼 노출
 */
export const SlideThumbnail: React.FC<SlideThumbnailProps> = ({
  slide,
  index,
  isActive,
  isSelected,
  onClick,
  onSelect,
  onDelete,
}) => {
  return (
    <div
      className={`group relative flex flex-col gap-2 p-2 rounded-lg cursor-pointer transition-all border-2 
        ${isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-transparent hover:bg-gray-800'}
        ${isSelected && !isActive ? 'bg-indigo-900/10 border-indigo-800/50' : ''}`}
      onClick={onClick}
    >
      <div className="relative aspect-video w-full bg-gray-900 rounded overflow-hidden shadow-sm">
        <img src={slide.imageUrl} alt={`Slide ${index}`} className="w-full h-full object-cover" />

        {/* 선택 체크박스 오버레이 */}
        <div
          onClick={onSelect}
          className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center z-20
            ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-black/40 border-white/60 hover:border-white'}`}
        >
          {isSelected && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* 슬라이드 번호 */}
        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 rounded">
          {index + 1}
        </div>

        {/* 비디오 슬라이드 표시 */}
        {slide.videoUrl && (
          <div className="absolute bottom-1 left-1 bg-purple-600 text-white px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
              <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
            </svg>
            <span className="text-[8px] font-bold">
              {slide.videoDuration ? `${slide.videoDuration.toFixed(1)}s` : '영상'}
            </span>
          </div>
        )}

        {/* 오디오 생성 완료 표시 */}
        {slide.audioData && (
          <div className="absolute bottom-1 right-1 bg-indigo-600 text-white p-0.5 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
              <path d="M5.5 9.643a.75.75 0 00-1.06 1.06h.006v.005a6.002 6.002 0 0010.553 0V9.75a.75.75 0 00-1.06-1.06a4.5 4.5 0 01-8.44 1.053z" />
            </svg>
          </div>
        )}
      </div>

      {/* 대본 미리보기 텍스트 */}
      <div className="text-xs text-gray-400 truncate px-1">
        {slide.script ? (
          slide.script.substring(0, 30) + '...'
        ) : (
          <span className="italic opacity-50">대본 없음</span>
        )}
      </div>

      {/* 삭제 버튼 (호버 시 표시) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(slide.id)
        }}
        className="absolute top-[-8px] left-[-8px] bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-30"
        title="슬라이드 삭제"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}

