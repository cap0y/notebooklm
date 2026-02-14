import { Slide, SubtitleStyle } from '../types'
import { splitTextIntoChunks, getChunkIndexByCharacterCount } from './textUtils'

/**
 * 비디오 엘리먼트를 로드하고 재생 준비
 */
const loadVideo = (url: string): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    video.oncanplaythrough = () => resolve(video)
    video.onerror = () => reject(new Error('비디오를 로드할 수 없습니다'))

    video.src = url
    video.load()
  })
}

/**
 * 슬라이드 배열을 WebM 비디오로 렌더링
 *
 * Canvas + MediaRecorder를 사용하여 클라이언트 측에서 비디오 생성
 * 각 슬라이드의 이미지/비디오와 오디오(있는 경우)를 결합하고 자막을 오버레이
 *
 * 비디오 슬라이드:
 *  - 원본 비디오 프레임을 캔버스에 그림
 *  - TTS 오디오가 있으면 비디오 음소거 + 오디오버퍼 재생
 *  - TTS 오디오가 없으면 비디오 자체 길이만큼 재생 (비디오 원본 오디오는 dest에 연결)
 */
export const exportVideo = async (
  slides: Slide[],
  width: number,
  height: number,
  subtitleStyle: SubtitleStyle,
  onProgress: (progress: number, msg: string) => void,
  includeSubtitles: boolean,
  externalCanvas?: HTMLCanvasElement,
): Promise<Blob> => {
  const canvas = externalCanvas || document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('Canvas context 생성 실패')

  const stream = canvas.captureStream(30) // 30 FPS
  const audioContext = new AudioContext()
  const dest = audioContext.createMediaStreamDestination()

  // 비디오(캔버스) + 오디오 스트림 결합
  const combinedTracks = [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()]
  const combinedStream = new MediaStream(combinedTracks)

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9',
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  // HEX 색상 → RGBA 문자열 변환 헬퍼
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  /**
   * 자막 렌더링 공통 함수
   */
  const drawSubtitle = (text: string) => {
    if (!includeSubtitles || !text || !ctx) return

    const scaleFactor = Math.min(width, height) / 720
    const fontSize = subtitleStyle.fontSize * scaleFactor

    ctx.font = `bold ${fontSize}px ${subtitleStyle.fontFamily}, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textX = width / 2
    const textY = height * (subtitleStyle.verticalPosition / 100)

    const metrics = ctx.measureText(text)
    const textWidth = metrics.width
    const textHeight = fontSize * 1.2
    const padding = fontSize * 0.5

    // 배경 박스
    if (subtitleStyle.backgroundOpacity > 0) {
      ctx.fillStyle = hexToRgba(subtitleStyle.backgroundColor, subtitleStyle.backgroundOpacity)
      ctx.fillRect(
        textX - textWidth / 2 - padding,
        textY - textHeight / 2 - padding / 2,
        textWidth + padding * 2,
        textHeight + padding,
      )
    }

    // 텍스트
    ctx.fillStyle = subtitleStyle.color
    if (subtitleStyle.backgroundOpacity < 0.3) {
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 4
      ctx.lineWidth = fontSize * 0.05
      ctx.strokeStyle = 'black'
      ctx.strokeText(text, textX, textY)
    } else {
      ctx.shadowColor = 'transparent'
    }

    ctx.fillText(text, textX, textY)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }

  return new Promise(async (resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      audioContext.close()
      resolve(blob)
    }

    recorder.onerror = (e) => {
      audioContext.close()
      reject(e)
    }

    recorder.start()

    // 화면 방향에 따른 자막 최대 글자 수 결정
    const isPortrait = width < height
    const maxCharsPerLine = isPortrait ? 20 : 45

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      onProgress((i / slides.length) * 100, `슬라이드 ${i + 1}/${slides.length} 렌더링 중...`)

      // 자막 청크 사전 계산
      const scriptText = slide.script || ''
      const textChunks = splitTextIntoChunks(scriptText, maxCharsPerLine)
      const totalChunks = textChunks.length

      if (slide.videoUrl) {
        // ──── 비디오 슬라이드 렌더링 ────
        try {
          const video = await loadVideo(slide.videoUrl)

          // 기간 결정: TTS 오디오 > 비디오 자체 길이
          let durationMs: number
          let audioSource: AudioBufferSourceNode | null = null

          if (slide.audioData) {
            durationMs = slide.audioData.duration * 1000
            audioSource = audioContext.createBufferSource()
            audioSource.buffer = slide.audioData
            audioSource.connect(dest)
            audioSource.start(audioContext.currentTime)
          } else {
            durationMs = (slide.videoDuration || video.duration) * 1000
            // 비디오 원본 오디오를 dest에 연결
            try {
              const mediaSource = audioContext.createMediaElementSource(video)
              mediaSource.connect(dest)
            } catch (e) {
              // 비디오에 오디오 트랙이 없을 수 있음 — 무시
              console.warn('비디오 오디오 스트림 연결 실패:', e)
            }
          }

          // 비디오 재생 시작
          video.currentTime = 0
          video.muted = !!slide.audioData // TTS 있으면 비디오 음소거
          await video.play()

          // 프레임 루프
          const startTime = performance.now()

          await new Promise<void>((resolveFrame) => {
            const drawFrame = () => {
              const now = performance.now()
              const elapsed = now - startTime
              const progress = Math.min(Math.max(elapsed / durationMs, 0), 1)

              // 검은 배경
              ctx.fillStyle = '#000'
              ctx.fillRect(0, 0, width, height)

              // 비디오 프레임을 캔버스에 contain 방식으로 그리기
              const vw = video.videoWidth || width
              const vh = video.videoHeight || height
              const scale = Math.min(width / vw, height / vh)
              const x = width / 2 - (vw / 2) * scale
              const y = height / 2 - (vh / 2) * scale
              ctx.drawImage(video, x, y, vw * scale, vh * scale)

              // 자막
              let currentSubtitle = slide.subtitle
              if (scriptText && totalChunks > 0) {
                const chunkIndex = getChunkIndexByCharacterCount(textChunks, progress)
                currentSubtitle = textChunks[chunkIndex]
              }
              drawSubtitle(currentSubtitle)

              if (elapsed < durationMs) {
                requestAnimationFrame(drawFrame)
              } else {
                resolveFrame()
              }
            }
            drawFrame()
          })

          // 정리
          video.pause()
          if (audioSource) {
            audioSource.stop()
            audioSource.disconnect()
          }
        } catch (err) {
          console.error(`비디오 슬라이드 ${i + 1} 렌더링 실패:`, err)
          // 실패 시 썸네일 이미지로 폴백
          await renderImageSlide(slide, durationFallback(slide))
        }
      } else {
        // ──── 이미지 슬라이드 렌더링 ────
        await renderImageSlide(slide, durationFallback(slide))
      }
    }

    onProgress(100, '마무리 중...')
    recorder.stop()

    // ── 이미지 슬라이드 렌더링 내부 함수 ──
    async function renderImageSlide(slide: Slide, durationMs: number) {
      // 이미지 로드
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = slide.imageUrl
      await new Promise((r) => {
        img.onload = r
      })

      // 오디오 준비
      let source: AudioBufferSourceNode | null = null
      if (slide.audioData) {
        durationMs = slide.audioData.duration * 1000
        source = audioContext.createBufferSource()
        source.buffer = slide.audioData
        source.connect(dest)
        source.start(audioContext.currentTime)
      }

      // 프레임 루프
      const startTime = performance.now()

      await new Promise<void>((resolveFrame) => {
        const drawFrame = () => {
          const now = performance.now()
          const elapsed = now - startTime
          const progress = Math.min(Math.max(elapsed / durationMs, 0), 1)

          // 검은 배경
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, width, height)

          // 이미지 Contain 방식으로 그리기
          const scale = Math.min(width / img.width, height / img.height)
          const x = width / 2 - (img.width / 2) * scale
          const y = height / 2 - (img.height / 2) * scale
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

          // 자막
          let currentSubtitle = slide.subtitle
          if (slide.audioData && scriptText && totalChunks > 0) {
            const chunkIndex = getChunkIndexByCharacterCount(textChunks, progress)
            currentSubtitle = textChunks[chunkIndex]
          }
          drawSubtitle(currentSubtitle)

          if (elapsed < durationMs) {
            requestAnimationFrame(drawFrame)
          } else {
            resolveFrame()
          }
        }
        drawFrame()
      })

      if (source) {
        source.stop()
        source.disconnect()
      }
    }

    function durationFallback(slide: Slide): number {
      if (slide.audioData) return slide.audioData.duration * 1000
      if (slide.videoDuration) return slide.videoDuration * 1000
      return 3000 // 기본 3초
    }
  })
}
