import { Muxer, ArrayBufferTarget } from 'webm-muxer'
import { Slide, SubtitleStyle } from '../types'
import { splitTextIntoChunks, getChunkIndexByCharacterCount } from './textUtils'

/* ─────────────────────────────────────
   상수
   ───────────────────────────────────── */
const FAST_FPS = 24
const FAST_FRAME_US = Math.round(1_000_000 / FAST_FPS)
const LEGACY_FPS = 30

/* ─────────────────────────────────────
   공통 유틸리티
   ───────────────────────────────────── */

/** 슬라이드 재생 시간(초) */
const getSlideDuration = (slide: Slide): number => {
  if (slide.audioData) return slide.audioData.duration
  if (slide.videoDuration) return slide.videoDuration
  return 3
}

/** HEX → RGBA */
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 자막 렌더링 (공통) */
const renderSubtitle = (
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  w: number,
  h: number,
  style: SubtitleStyle,
  enabled: boolean,
) => {
  if (!enabled || !text) return

  const scaleFactor = Math.min(w, h) / 720
  const fontSize = style.fontSize * scaleFactor

  ctx.font = `bold ${fontSize}px ${style.fontFamily}, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const textX = w / 2
  const textY = h * (style.verticalPosition / 100)
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize * 1.2
  const padding = fontSize * 0.5

  // 배경 박스
  if (style.backgroundOpacity > 0) {
    ctx.fillStyle = hexToRgba(style.backgroundColor, style.backgroundOpacity)
    ctx.fillRect(
      textX - textWidth / 2 - padding,
      textY - textHeight / 2 - padding / 2,
      textWidth + padding * 2,
      textHeight + padding,
    )
  }

  // 텍스트
  ctx.fillStyle = style.color
  if (style.backgroundOpacity < 0.3) {
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

/** 비디오 엘리먼트 로드 */
const loadVideoEl = (url: string): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.oncanplaythrough = () => resolve(v)
    v.onerror = () => reject(new Error('비디오 로드 실패'))
    v.src = url
    v.load()
  })

/** 비디오 시크 (지정 시간으로 이동) */
const seekTo = (v: HTMLVideoElement, t: number): Promise<void> =>
  new Promise((resolve) => {
    if (Math.abs(v.currentTime - t) < 0.02) {
      resolve()
      return
    }
    const handler = () => {
      v.removeEventListener('seeked', handler)
      resolve()
    }
    v.addEventListener('seeked', handler)
    v.currentTime = Math.max(0, t)
  })

/** 진행률 기반 자막 텍스트 결정 */
const resolveSubtitle = (slide: Slide, progress: number, chunks: string[]): string => {
  if (slide.script && chunks.length > 0) {
    return chunks[getChunkIndexByCharacterCount(chunks, progress)]
  }
  return slide.subtitle || ''
}

/** 이미지/비디오를 Contain 방식으로 캔버스에 그리기 */
const drawContain = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  cw: number,
  ch: number,
) => {
  const scale = Math.min(cw / sw, ch / sh)
  const x = cw / 2 - (sw * scale) / 2
  const y = ch / 2 - (sh * scale) / 2
  ctx.drawImage(source, x, y, sw * scale, sh * scale)
}

/* ═══════════════════════════════════════════════
   메인 엔트리
   ═══════════════════════════════════════════════ */

/**
 * 비디오 내보내기
 *
 * 1차: WebCodecs + webm-muxer (비실시간 고속 인코딩, 10~20배 빠름)
 * 2차: MediaRecorder 폴백 (WebCodecs 미지원 브라우저)
 */
export const exportVideo = async (
  slides: Slide[],
  width: number,
  height: number,
  subtitleStyle: SubtitleStyle,
  onProgress: (progress: number, msg: string) => void,
  includeSubtitles: boolean,
  externalCanvas?: HTMLCanvasElement,
  slideDelay: number = 0,
): Promise<Blob> => {
  // WebCodecs 지원 확인
  if (typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined') {
    try {
      return await exportVideoFast(
        slides, width, height, subtitleStyle, onProgress, includeSubtitles, externalCanvas, slideDelay,
      )
    } catch (err) {
      console.warn('⚡ WebCodecs 인코딩 실패 → MediaRecorder 폴백:', err)
    }
  }
  return exportVideoLegacy(
    slides, width, height, subtitleStyle, onProgress, includeSubtitles, externalCanvas, slideDelay,
  )
}

/* ═══════════════════════════════════════════════
   ⚡ 고속 내보내기 (WebCodecs + webm-muxer)
   ── CPU 최대 속도로 인코딩 (실시간 제약 없음) ──
   ═══════════════════════════════════════════════ */

async function exportVideoFast(
  slides: Slide[],
  width: number,
  height: number,
  subtitleStyle: SubtitleStyle,
  onProgress: (progress: number, msg: string) => void,
  includeSubtitles: boolean,
  externalCanvas?: HTMLCanvasElement,
  slideDelay: number = 0,
): Promise<Blob> {
  const canvas = externalCanvas || document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  /* ── 1) 슬라이드 정보 계산 ── */
  const baseDurations = slides.map(getSlideDuration)
  // 마지막 슬라이드를 제외하고 딜레이 추가
  const durations = baseDurations.map((d, i) =>
    i < slides.length - 1 ? d + slideDelay : d,
  )
  const totalDuration = durations.reduce((a, b) => a + b, 0)
  const totalFrames = Math.max(1, Math.ceil(totalDuration * FAST_FPS))
  const isPortrait = width < height
  const maxChars = isPortrait ? 20 : 45

  /* ── 2) 오디오 결합 (OfflineAudioContext) ── */
  onProgress(0, '오디오 믹싱 중...')
  const hasAudio = slides.some((s) => s.audioData || s.videoUrl)
  let combinedAudio: AudioBuffer | null = null

  if (hasAudio && totalDuration > 0) {
    const SR = 48000
    const offCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * SR), SR)
    let t = 0

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]
      try {
        if (s.audioData) {
          // TTS 오디오 → 직접 연결
          const src = offCtx.createBufferSource()
          src.buffer = s.audioData
          src.connect(offCtx.destination)
          src.start(t)
        } else if (s.videoUrl) {
          // 비디오 원본 오디오 추출
          const ab = await (await fetch(s.videoUrl)).arrayBuffer()
          const tmp = new AudioContext()
          const buf = await tmp.decodeAudioData(ab)
          const src = offCtx.createBufferSource()
          src.buffer = buf
          src.connect(offCtx.destination)
          src.start(t)
          await tmp.close()
        }
      } catch {
        /* 오디오 없을 수 있음 */
      }
      t += durations[i]
    }

    try {
      combinedAudio = await offCtx.startRendering()
    } catch {
      /* ignore */
    }
  }

  /* ── 3) 코덱 확인 ── */
  onProgress(2, '인코더 초기화 중...')
  let vCodec = 'vp8'
  let muxVC: 'V_VP8' | 'V_VP9' = 'V_VP8'

  try {
    const ok = await VideoEncoder.isConfigSupported({
      codec: 'vp8',
      width,
      height,
      bitrate: 4_000_000,
    })
    if (!ok.supported) {
      vCodec = 'vp09.00.10.08'
      muxVC = 'V_VP9'
    }
  } catch {
    vCodec = 'vp09.00.10.08'
    muxVC = 'V_VP9'
  }

  /* ── 4) Muxer + Encoder 생성 ── */
  const target = new ArrayBufferTarget()
  const muxCfg: any = {
    target,
    video: { codec: muxVC, width, height },
    firstTimestampBehavior: 'offset',
  }
  if (combinedAudio) {
    muxCfg.audio = {
      codec: 'A_OPUS',
      sampleRate: 48000,
      numberOfChannels: combinedAudio.numberOfChannels,
    }
  }
  const muxer = new Muxer(muxCfg)

  const vEnc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder:', e),
  })
  vEnc.configure({
    codec: vCodec,
    width,
    height,
    bitrate: 4_000_000,
    framerate: FAST_FPS,
  })

  let aEnc: AudioEncoder | null = null
  if (combinedAudio) {
    aEnc = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error('AudioEncoder:', e),
    })
    aEnc.configure({
      codec: 'opus',
      sampleRate: 48000,
      numberOfChannels: combinedAudio.numberOfChannels,
      bitrate: 128_000,
    })
  }

  /* ── 5) 리소스 프리로드 ── */
  onProgress(3, '이미지/비디오 로딩 중...')
  const imgMap = new Map<number, HTMLImageElement>()
  const vidMap = new Map<number, HTMLVideoElement>()

  for (let i = 0; i < slides.length; i++) {
    if (slides[i].videoUrl) {
      vidMap.set(i, await loadVideoEl(slides[i].videoUrl!))
    } else {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = slides[i].imageUrl
      await new Promise<void>((r) => {
        img.onload = () => r()
      })
      imgMap.set(i, img)
    }
  }

  /* ── 6) 프레임 렌더링 (최대 속도) ── */
  let gf = 0

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const baseDur = baseDurations[i]      // 콘텐츠 재생 시간 (자막 표시 구간)
    const effectiveDur = durations[i]      // 딜레이 포함 총 시간
    const sf = Math.max(1, Math.ceil(effectiveDur * FAST_FPS))
    const chunks = splitTextIntoChunks(slide.script || '', maxChars)
    const vid = vidMap.get(i)
    const img = imgMap.get(i)

    for (let f = 0; f < sf; f++) {
      // 진행률 보고 + UI 스레드 양보 (8프레임마다)
      if (f % 8 === 0) {
        onProgress(
          3 + (gf / totalFrames) * 92,
          `슬라이드 ${i + 1}/${slides.length} (${f + 1}/${sf} 프레임)`,
        )
        await new Promise((r) => setTimeout(r, 0))
      }

      // 인코더 큐 백프레셔 (큐가 너무 차면 대기)
      if (vEnc.encodeQueueSize > 15) {
        await new Promise<void>((r) => vEnc.addEventListener('dequeue', r, { once: true }))
      }

      // 현재 프레임의 시간 위치
      const timeInSlide = f / FAST_FPS
      const isInDelay = timeInSlide >= baseDur // 딜레이 구간 여부

      // 검은 배경
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)

      // 슬라이드 콘텐츠 (딜레이 구간에서도 이미지/비디오 마지막 프레임 표시)
      if (vid) {
        // 딜레이 구간이면 비디오 마지막 프레임 유지
        const seekTime = isInDelay
          ? Math.max(0, (vid.duration || baseDur) - 0.02)
          : Math.min(timeInSlide, (vid.duration || baseDur) - 0.02)
        await seekTo(vid, seekTime)
        drawContain(ctx, vid, vid.videoWidth || width, vid.videoHeight || height, width, height)
      } else if (img) {
        drawContain(ctx, img, img.width, img.height, width, height)
      }

      // 자막: 콘텐츠 재생 구간에서만 표시 (딜레이 구간에서는 숨김)
      if (!isInDelay) {
        const sub = resolveSubtitle(slide, timeInSlide / baseDur, chunks)
        renderSubtitle(ctx, sub, width, height, subtitleStyle, includeSubtitles)
      }

      // 프레임 인코딩
      const frame = new VideoFrame(canvas, { timestamp: gf * FAST_FRAME_US })
      vEnc.encode(frame, { keyFrame: gf % (FAST_FPS * 5) === 0 })
      frame.close()
      gf++
    }
  }

  /* ── 7) 오디오 인코딩 ── */
  if (aEnc && combinedAudio) {
    onProgress(96, '오디오 인코딩 중...')
    const CHUNK = 4800 // 100ms 단위 (48000Hz)
    const nch = combinedAudio.numberOfChannels

    for (let off = 0; off < combinedAudio.length; off += CHUNK) {
      const n = Math.min(CHUNK, combinedAudio.length - off)
      const buf = new Float32Array(n * nch)

      for (let ch = 0; ch < nch; ch++) {
        buf.set(combinedAudio.getChannelData(ch).subarray(off, off + n), ch * n)
      }

      const ad = new AudioData({
        format: 'f32-planar' as AudioSampleFormat,
        sampleRate: combinedAudio.sampleRate,
        numberOfFrames: n,
        numberOfChannels: nch,
        timestamp: Math.round((off / combinedAudio.sampleRate) * 1_000_000),
        data: buf,
      })
      aEnc.encode(ad)
      ad.close()

      // 오디오 큐 백프레셔
      if (aEnc.encodeQueueSize > 30) {
        await new Promise<void>((r) => aEnc!.addEventListener('dequeue', r, { once: true }))
      }
    }
  }

  /* ── 8) 마무리 ── */
  onProgress(98, '파일 생성 중...')

  await vEnc.flush()
  vEnc.close()

  if (aEnc) {
    await aEnc.flush()
    aEnc.close()
  }

  muxer.finalize()

  return new Blob([target.buffer], { type: 'video/webm' })
}

/* ═══════════════════════════════════════════════
   기본 내보내기 (MediaRecorder 폴백)
   ── WebCodecs 미지원 브라우저 (Firefox, Safari) ──
   ═══════════════════════════════════════════════ */

async function exportVideoLegacy(
  slides: Slide[],
  width: number,
  height: number,
  subtitleStyle: SubtitleStyle,
  onProgress: (progress: number, msg: string) => void,
  includeSubtitles: boolean,
  externalCanvas?: HTMLCanvasElement,
  slideDelay: number = 0,
): Promise<Blob> {
  const canvas = externalCanvas || document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context 생성 실패')

  const stream = canvas.captureStream(LEGACY_FPS)
  const audioContext = new AudioContext()
  const dest = audioContext.createMediaStreamDestination()

  const combinedTracks = [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()]
  const combinedStream = new MediaStream(combinedTracks)

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9',
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const isPortrait = width < height
  const maxCharsPerLine = isPortrait ? 20 : 45

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

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const scriptText = slide.script || ''
      const textChunks = splitTextIntoChunks(scriptText, maxCharsPerLine)

      const isLastSlide = i === slides.length - 1
      const delayMs = (!isLastSlide && slideDelay > 0) ? slideDelay * 1000 : 0

      if (slide.videoUrl) {
        /* ── 비디오 슬라이드 ── */
        try {
          const video = await loadVideoEl(slide.videoUrl)
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
            try {
              const ms = audioContext.createMediaElementSource(video)
              ms.connect(dest)
            } catch {
              /* 비디오에 오디오 없을 수 있음 */
            }
          }

          const totalMs = durationMs + delayMs

          video.currentTime = 0
          video.muted = !!slide.audioData
          await video.play()

          const startTime = performance.now()
          let lastReport = 0

          await new Promise<void>((resolveFrame) => {
            const drawFrame = () => {
              const now = performance.now()
              const elapsed = now - startTime
              const progress = Math.min(Math.max(elapsed / totalMs, 0), 1)
              const isInDelay = elapsed >= durationMs

              // 진행률 보고 (200ms 간격 쓰로틀링)
              if (now - lastReport > 200) {
                const pct = ((i + progress) / slides.length) * 100
                onProgress(pct, `슬라이드 ${i + 1}/${slides.length} (${Math.round(progress * 100)}%)`)
                lastReport = now
              }

              ctx.fillStyle = '#000'
              ctx.fillRect(0, 0, width, height)
              drawContain(ctx, video, video.videoWidth || width, video.videoHeight || height, width, height)

              // 딜레이 구간에서는 자막 숨김
              if (!isInDelay) {
                const contentProgress = Math.min(elapsed / durationMs, 1)
                const sub = resolveSubtitle(slide, contentProgress, textChunks)
                renderSubtitle(ctx, sub, width, height, subtitleStyle, includeSubtitles)
              }

              if (elapsed < totalMs) {
                requestAnimationFrame(drawFrame)
              } else {
                resolveFrame()
              }
            }
            drawFrame()
          })

          video.pause()
          if (audioSource) {
            audioSource.stop()
            audioSource.disconnect()
          }
        } catch (err) {
          console.error(`비디오 슬라이드 ${i + 1} 렌더링 실패:`, err)
          await renderImageSlideLegacy(ctx, slide, durationFallback(slide), i, slides.length, onProgress, width, height, subtitleStyle, includeSubtitles, maxCharsPerLine, audioContext, dest, delayMs)
        }
      } else {
        /* ── 이미지 슬라이드 ── */
        await renderImageSlideLegacy(ctx, slide, durationFallback(slide), i, slides.length, onProgress, width, height, subtitleStyle, includeSubtitles, maxCharsPerLine, audioContext, dest, delayMs)
      }
    }

    onProgress(100, '마무리 중...')
    recorder.stop()
  })
}

/** 이미지 슬라이드 렌더링 (Legacy 전용) */
async function renderImageSlideLegacy(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  durationMs: number,
  slideIndex: number,
  totalSlides: number,
  onProgress: (progress: number, msg: string) => void,
  width: number,
  height: number,
  subtitleStyle: SubtitleStyle,
  includeSubtitles: boolean,
  maxCharsPerLine: number,
  audioContext: AudioContext,
  dest: MediaStreamAudioDestinationNode,
  delayMs: number = 0,
) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = slide.imageUrl
  await new Promise((r) => {
    img.onload = r
  })

  let source: AudioBufferSourceNode | null = null
  if (slide.audioData) {
    durationMs = slide.audioData.duration * 1000
    source = audioContext.createBufferSource()
    source.buffer = slide.audioData
    source.connect(dest)
    source.start(audioContext.currentTime)
  }

  const totalMs = durationMs + delayMs
  const scriptText = slide.script || ''
  const textChunks = splitTextIntoChunks(scriptText, maxCharsPerLine)

  const startTime = performance.now()
  let lastReport = 0

  await new Promise<void>((resolveFrame) => {
    const drawFrame = () => {
      const now = performance.now()
      const elapsed = now - startTime
      const progress = Math.min(Math.max(elapsed / totalMs, 0), 1)
      const isInDelay = elapsed >= durationMs

      // 진행률 보고 (200ms 간격 쓰로틀링)
      if (now - lastReport > 200) {
        const pct = ((slideIndex + progress) / totalSlides) * 100
        onProgress(pct, `슬라이드 ${slideIndex + 1}/${totalSlides} (${Math.round(progress * 100)}%)`)
        lastReport = now
      }

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      drawContain(ctx, img, img.width, img.height, width, height)

      // 자막: 콘텐츠 재생 구간에서만 표시 (딜레이 구간에서는 숨김)
      if (!isInDelay) {
        const contentProgress = Math.min(elapsed / durationMs, 1)
        const sub = resolveSubtitle(slide, contentProgress, textChunks)
        renderSubtitle(ctx, sub, width, height, subtitleStyle, includeSubtitles)
      }

      if (elapsed < totalMs) {
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

/** 슬라이드 재생 시간 폴백 */
function durationFallback(slide: Slide): number {
  if (slide.audioData) return slide.audioData.duration * 1000
  if (slide.videoDuration) return slide.videoDuration * 1000
  return 3000
}
