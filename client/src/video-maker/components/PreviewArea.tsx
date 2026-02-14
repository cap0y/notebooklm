import React, { useEffect, useRef, useState } from 'react'
import { Slide, AspectRatio, SubtitleStyle } from '../types'
import { splitTextIntoChunks, getChunkIndexByCharacterCount } from '../services/textUtils'

interface PreviewAreaProps {
  activeSlide: Slide | undefined
  aspectRatio: AspectRatio
  subtitleStyle: SubtitleStyle
}

/**
 * 미리보기 영역 — 현재 선택된 슬라이드의 이미지/비디오, 자막, 오디오 재생을 미리보기
 *
 * - 화면 비율에 맞는 컨테이너 크기 자동 조절
 * - 오디오 재생 시 진행률에 맞춰 자막 청크를 동적으로 변경
 * - 비디오 슬라이드: 원본 영상을 직접 재생
 * - ResizeObserver를 사용하여 실시간 컨테이너 크기 측정
 */
export const PreviewArea: React.FC<PreviewAreaProps> = ({ activeSlide, aspectRatio, subtitleStyle }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [dynamicSubtitle, setDynamicSubtitle] = useState('')

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // 비디오 관련 ref
  const videoRef = useRef<HTMLVideoElement>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const isVideoSlide = !!(activeSlide?.videoUrl)

  // 컨테이너 크기 측정
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateSize()

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [aspectRatio])

  // 슬라이드 변경 시 오디오/비디오 정지
  useEffect(() => {
    stopAudio()
    stopVideo()
    setDynamicSubtitle(activeSlide?.subtitle || activeSlide?.script || '')
  }, [activeSlide?.id])

  // 재생 중이 아닐 때 자막 업데이트
  useEffect(() => {
    if (!isPlaying && activeSlide) {
      setDynamicSubtitle(activeSlide.subtitle || activeSlide.script || '')
    }
  }, [activeSlide?.subtitle, activeSlide?.script, isPlaying])

  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop()
      } catch (e) {}
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsPlaying(false)
    if (activeSlide) setDynamicSubtitle(activeSlide.subtitle || activeSlide.script || '')
  }

  /**
   * 비디오 슬라이드 재생/정지 토글
   * - 오디오가 있으면 비디오는 음소거 + 오디오버퍼 재생
   * - 오디오가 없으면 비디오 자체 소리 재생
   */
  const toggleVideoPlay = () => {
    if (!videoRef.current || !activeSlide?.videoUrl) return

    if (isPlaying) {
      // 정지
      videoRef.current.pause()
      stopAudio()
      setIsPlaying(false)
      return
    }

    // 재생 시작
    const video = videoRef.current
    video.currentTime = 0

    if (activeSlide.audioData) {
      // TTS 오디오가 있는 경우: 비디오 음소거 + 오디오버퍼 재생
      video.muted = true
      playAudioBuffer()
    } else {
      // 오디오 없음: 비디오 자체 소리 재생
      video.muted = false
    }

    video.play()
    setIsPlaying(true)

    // 비디오 종료 시 정지
    video.onended = () => {
      setIsPlaying(false)
      stopAudio()
    }

    // 자막 애니메이션 (비디오 duration 기준)
    if (activeSlide.script) {
      const script = activeSlide.script
      const duration = activeSlide.audioData
        ? activeSlide.audioData.duration
        : (activeSlide.videoDuration || video.duration)
      const isPortrait = aspectRatio === AspectRatio.Portrait9_16
      const maxCharsPerLine = isPortrait ? 20 : 45
      const chunks = splitTextIntoChunks(script, maxCharsPerLine)
      const totalChunks = chunks.length

      const updateLoop = () => {
        const elapsed = video.currentTime
        const progress = Math.min(Math.max(elapsed / duration, 0), 1)

        if (totalChunks > 0) {
          const chunkIndex = getChunkIndexByCharacterCount(chunks, progress)
          setDynamicSubtitle(chunks[chunkIndex])
        }

        if (!video.paused && !video.ended) {
          animationFrameRef.current = requestAnimationFrame(updateLoop)
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop)
    }
  }

  /**
   * 이미지 슬라이드용 오디오 재생
   */
  const playAudioBuffer = () => {
    if (!activeSlide?.audioData) return

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    // 이전 소스 정리
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch (e) {}
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    const source = audioContextRef.current.createBufferSource()
    source.buffer = activeSlide.audioData
    source.connect(audioContextRef.current.destination)

    source.onended = () => {
      if (!isVideoSlide) {
        setIsPlaying(false)
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      setDynamicSubtitle(activeSlide.subtitle || activeSlide.script || '')
    }

    source.start()
    startTimeRef.current = audioContextRef.current.currentTime
    sourceRef.current = source
  }

  /**
   * 이미지 슬라이드용 오디오 재생 (독립)
   */
  const playAudio = () => {
    if (!activeSlide?.audioData) return

    stopAudio()
    playAudioBuffer()
    setIsPlaying(true)

    // 자막 애니메이션 루프
    const script = activeSlide.script || ''
    const duration = activeSlide.audioData.duration

    const isPortrait = aspectRatio === AspectRatio.Portrait9_16
    const maxCharsPerLine = isPortrait ? 20 : 45

    const chunks = splitTextIntoChunks(script, maxCharsPerLine)
    const totalChunks = chunks.length

    const updateLoop = () => {
      if (!audioContextRef.current) return

      const elapsed = audioContextRef.current.currentTime - startTimeRef.current
      const progress = Math.min(Math.max(elapsed / duration, 0), 1)

      if (totalChunks > 0) {
        const chunkIndex = getChunkIndexByCharacterCount(chunks, progress)
        setDynamicSubtitle(chunks[chunkIndex])
      }

      if (elapsed < duration) {
        animationFrameRef.current = requestAnimationFrame(updateLoop)
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateLoop)
  }

  if (!activeSlide) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center text-gray-500">
        <p>슬라이드를 선택하세요</p>
      </div>
    )
  }

  const isPortrait = aspectRatio === AspectRatio.Portrait9_16

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const minDim = Math.min(containerSize.width, containerSize.height)
  const effectiveMinDim = minDim || 720
  const scale = (effectiveMinDim / 720) * 0.95

  const scaledFontSize = subtitleStyle.fontSize * scale
  const scaledPaddingY = scaledFontSize * 0.25
  const scaledPaddingX = scaledFontSize * 0.5

  // 비디오/이미지 슬라이드에 따른 재생 버튼 핸들러
  const handlePlayClick = isVideoSlide
    ? toggleVideoPlay
    : (isPlaying ? stopAudio : playAudio)

  // 재생 가능 여부 (비디오 슬라이드 또는 오디오가 있는 이미지 슬라이드)
  const canPlay = isVideoSlide || !!activeSlide.audioData

  // 하단 상태 텍스트
  const statusText = isVideoSlide
    ? `${activeSlide.videoDuration?.toFixed(1) || '?'}초 영상`
    : (activeSlide.audioData ? `${activeSlide.audioData.duration.toFixed(1)}초 오디오` : '오디오 없음')

  return (
    <div className="flex-1 bg-gray-950 p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* 화면 비율 컨테이너 */}
      <div
        ref={containerRef}
        className="relative bg-black shadow-2xl rounded-lg overflow-hidden border border-gray-800 transition-all duration-300"
        style={{
          width: isPortrait ? 'auto' : '100%',
          height: isPortrait ? '95%' : 'auto',
          aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* 비디오 슬라이드일 때 비디오 엘리먼트 */}
        {isVideoSlide ? (
          <video
            ref={videoRef}
            src={activeSlide.videoUrl}
            poster={activeSlide.imageUrl}
            className="w-full h-full object-contain"
            playsInline
            preload="auto"
          />
        ) : (
          /* 이미지 레이어 */
          <img src={activeSlide.imageUrl} alt="Preview" className="w-full h-full object-contain" />
        )}

        {/* 자막 레이어 */}
        {dynamicSubtitle && (
          <div
            className="absolute left-0 right-0 text-center px-4 pointer-events-none transition-all duration-75"
            style={{
              top: `${subtitleStyle.verticalPosition}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <span
              className="inline-block rounded-lg shadow-lg"
              style={{
                fontSize: `${scaledFontSize}px`,
                fontWeight: 'bold',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                padding: `${scaledPaddingY}px ${scaledPaddingX}px`,
                fontFamily: subtitleStyle.fontFamily,
                color: subtitleStyle.color,
                backgroundColor: hexToRgba(subtitleStyle.backgroundColor, subtitleStyle.backgroundOpacity),
                textShadow: subtitleStyle.backgroundOpacity < 0.3 ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
              }}
            >
              {dynamicSubtitle}
            </span>
          </div>
        )}

        {/* 재생 버튼 (비디오 슬라이드이거나 오디오가 있을 때) */}
        {canPlay && (
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <button
              onClick={handlePlayClick}
              className={`p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isPlaying ? 'bg-red-500 text-white' : (isVideoSlide ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white')}`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* 비디오 슬라이드 뱃지 */}
        {isVideoSlide && (
          <div className="absolute top-4 left-4 z-20 bg-purple-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
            </svg>
            영상 클립
          </div>
        )}
      </div>

      <div className="mt-4 text-gray-500 text-sm font-mono">
        미리보기 • {aspectRatio} • {statusText}
      </div>
    </div>
  )
}
