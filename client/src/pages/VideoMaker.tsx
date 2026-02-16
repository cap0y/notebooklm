import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Slide, VoiceName, GenerationState, ScriptLevel, AspectRatio, SubtitleStyle } from '../video-maker/types'
import { SAMPLE_SLIDES } from '../video-maker/constants'
import { SlideThumbnail } from '../video-maker/components/SlideThumbnail'
import { PreviewArea } from '../video-maker/components/PreviewArea'
import { EditorPanel } from '../video-maker/components/EditorPanel'
import { generateSpeech, generateSlideScript } from '../video-maker/services/geminiService'
import { base64ToBytes, decodeAudioData } from '../video-maker/services/audioUtils'
import { exportVideo } from '../video-maker/services/videoRenderer'
import { convertPdfToImages } from '../video-maker/services/pdfUtils'
import { exportPptx } from '../video-maker/services/pptxService'
import { type ModelTier, MODEL_TIERS, getModelTier, setModelTier as saveModelTier } from '../utils/modelConfig'

/**
 * 동영상 만들기 페이지 (MagicSlide Studio)
 *
 * PDF/이미지를 업로드하여 슬라이드를 구성하고,
 * AI로 나레이션 대본 생성 → TTS 음성 변환 → WebM 비디오 내보내기
 *
 * 주요 기능:
 * - PDF/이미지 업로드 → 슬라이드 자동 생성
 * - Gemini AI 기반 나레이션 대본 자동 생성
 * - Gemini TTS 음성 합성
 * - 자막 스타일 커스터마이징
 * - WebM 비디오 렌더링/다운로드
 * - PPTX 내보내기
 */
const VideoMaker: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>(SAMPLE_SLIDES)
  const slidesRef = useRef<Slide[]>(SAMPLE_SLIDES)

  useEffect(() => {
    slidesRef.current = slides
  }, [slides])

  const [activeSlideId, setActiveSlideId] = useState<string>(
    SAMPLE_SLIDES.length > 0 ? SAMPLE_SLIDES[0].id : '',
  )
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([])
  const [generationState, setGenerationState] = useState<GenerationState>({
    isExporting: false,
    progress: 0,
    statusMessage: '',
  })
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Video16_9)
  const [includeSubtitles, setIncludeSubtitles] = useState<boolean>(true)

  // 슬라이드 간 딜레이 설정
  const [slideDelayEnabled, setSlideDelayEnabled] = useState(true)
  const [slideDelaySec, setSlideDelaySec] = useState(2)

  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Zephyr)
  const [scriptLevel, setScriptLevel] = useState<ScriptLevel>('university')

  // 일괄 생성 상태
  const [batchState, setBatchState] = useState<{ type: '' | 'script' | 'voice'; current: number; total: number }>({
    type: '',
    current: 0,
    total: 0,
  })

  // AI 모델 선택
  const [modelTier, setModelTier] = useState<ModelTier>('standard')
  const [showModelSelect, setShowModelSelect] = useState(false)
  useEffect(() => { setModelTier(getModelTier()) }, [])
  const handleModelChange = (tier: ModelTier) => {
    setModelTier(tier)
    saveModelTier(tier)
    setShowModelSelect(false)
  }
  const batchCancelRef = useRef(false)

  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontSize: 32,
    fontFamily: 'Inter',
    color: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0.6,
    verticalPosition: 90,
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const renderCanvasRef = useRef<HTMLCanvasElement>(null)

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }

  // 현재 활성 슬라이드 객체
  const activeSlide = useMemo(
    () => slides.find((s) => s.id === activeSlideId),
    [slides, activeSlideId],
  )

  /**
   * 비디오 파일에서 첫 프레임(썸네일)을 추출
   * ⚠️ 전달받은 blobUrl은 해제하지 않음 — 슬라이드에서 계속 사용하므로 호출자가 관리
   */
  const extractVideoThumbnail = (file: File): Promise<{ thumbnail: string; duration: number; blobUrl: string }> => {
    return new Promise((resolve, reject) => {
      // 썸네일 추출 전용 blob URL (추출 후 해제)
      const tempUrl = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'auto' // 프레임 데이터까지 로드
      video.muted = true
      video.playsInline = true

      video.onloadeddata = () => {
        // 프레임 데이터 로드 완료 후 seek
        video.currentTime = Math.min(1, video.duration * 0.1)
      }

      video.onseeked = () => {
        // seek 후 한 프레임 대기하여 화면에 그려진 것 확인
        requestAnimationFrame(() => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 1920
          canvas.height = video.videoHeight || 1080
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            URL.revokeObjectURL(tempUrl)
            reject(new Error('Canvas context 생성 실패'))
            return
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const thumbnail = canvas.toDataURL('image/jpeg', 0.85)
          const duration = video.duration

          // 썸네일용 임시 URL 해제
          URL.revokeObjectURL(tempUrl)

          // 실제 사용할 blob URL을 별도로 생성
          const permanentUrl = URL.createObjectURL(file)
          resolve({ thumbnail, duration, blobUrl: permanentUrl })
        })
      }

      video.onerror = () => {
        URL.revokeObjectURL(tempUrl)
        reject(new Error('비디오를 로드할 수 없습니다'))
      }

      video.src = tempUrl
    })
  }

  /**
   * 파일 업로드 핸들러
   * - PDF: 각 페이지를 고품질 이미지로 변환
   * - 이미지: 그대로 슬라이드에 추가
   * - 비디오: 썸네일 추출 후 비디오 슬라이드로 추가
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setGenerationState({ isExporting: true, progress: 0, statusMessage: '파일 처리 중...' })

    try {
      const newSlides: Slide[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setGenerationState({
          isExporting: true,
          progress: (i / files.length) * 100,
          statusMessage: `파일 처리 중... (${i + 1}/${files.length})`,
        })

        if (file.type === 'application/pdf') {
          // PDF → 이미지 변환
          const images = await convertPdfToImages(file)
          images.forEach((imgUrl) => {
            newSlides.push({
              id: Math.random().toString(36).substr(2, 9),
              imageUrl: imgUrl,
              script: '',
              subtitle: '',
              audioData: null,
              isGeneratingAudio: false,
            })
          })
        } else if (file.type.startsWith('video/')) {
          // 비디오 파일 → 썸네일 추출 + blob URL 저장
          try {
            const { thumbnail, duration, blobUrl } = await extractVideoThumbnail(file)
            newSlides.push({
              id: Math.random().toString(36).substr(2, 9),
              imageUrl: thumbnail,
              videoUrl: blobUrl,
              videoDuration: duration,
              script: '',
              subtitle: '',
              audioData: null,
              isGeneratingAudio: false,
            })
          } catch (err) {
            console.error('비디오 처리 실패:', err)
            alert(`비디오 "${file.name}"을(를) 로드할 수 없습니다.`)
          }
        } else {
          // 이미지 파일 직접 읽기
          const reader = new FileReader()
          const p = new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(file)
          })
          const imgUrl = await p
          newSlides.push({
            id: Math.random().toString(36).substr(2, 9),
            imageUrl: imgUrl,
            script: '',
            subtitle: '',
            audioData: null,
            isGeneratingAudio: false,
          })
        }
      }

      setSlides((prev) => {
        const updated = [...prev, ...newSlides]
        if (prev.length === 0 && newSlides.length > 0) setActiveSlideId(newSlides[0].id)
        return updated
      })
    } catch (e) {
      console.error(e)
      alert('파일 로드 중 오류가 발생했습니다.')
    } finally {
      setGenerationState({ isExporting: false, progress: 0, statusMessage: '' })
      if (event.target) event.target.value = ''
    }
  }

  /** 슬라이드 부분 업데이트 */
  const updateSlide = (id: string, updates: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  /** 슬라이드 삭제 */
  const deleteSlide = (id: string) => {
    setSlides((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      if (activeSlideId === id) setActiveSlideId(filtered.length > 0 ? filtered[0].id : '')
      return filtered
    })
    setSelectedSlideIds((prev) => prev.filter((sid) => sid !== id))
  }

  /** 슬라이드 선택 토글 */
  const toggleSlideSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedSlideIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    )
  }

  /** 전체 선택/해제 */
  const handleSelectAll = () => {
    if (selectedSlideIds.length === slides.length && slides.length > 0) {
      setSelectedSlideIds([])
    } else {
      setSelectedSlideIds(slides.map((s) => s.id))
    }
  }

  /**
   * SRT 자막 파일 파싱
   * SRT 포맷: 번호 → 타임코드 → 텍스트 (빈 줄로 구분)
   */
  const parseSrt = (content: string): { index: number; text: string }[] => {
    const entries: { index: number; text: string }[] = []
    // \r\n과 \n 모두 지원, 블록 단위 분리
    const blocks = content.trim().replace(/\r\n/g, '\n').split(/\n\n+/)

    for (const block of blocks) {
      const lines = block.trim().split('\n')
      if (lines.length < 3) continue // 번호 + 타임코드 + 최소 1줄 텍스트

      const index = parseInt(lines[0], 10)
      if (isNaN(index)) continue

      // 타임코드 줄(00:00:00,000 --> 00:00:00,000) 건너뛰고 텍스트만 추출
      const textLines = lines.slice(2)
      const text = textLines.join(' ').trim()
      if (text) entries.push({ index, text })
    }

    return entries
  }

  /**
   * 전체 자막 파일(SRT) 불러오기
   * → SRT 항목들을 현재 슬라이드 수에 맞게 균등 배분
   */
  const handleLoadSubtitleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (!content) return

      const entries = parseSrt(content)
      if (entries.length === 0) {
        alert('유효한 자막 항목이 없습니다.\nSRT 형식을 확인해 주세요.')
        return
      }

      if (slides.length === 0) {
        alert('슬라이드가 없습니다.\n먼저 이미지나 PDF를 업로드해 주세요.')
        return
      }

      // 자막 항목들을 슬라이드 수에 맞게 균등 배분
      const slideCount = slides.length
      const entriesPerSlide = Math.ceil(entries.length / slideCount)

      setSlides((prev) =>
        prev.map((slide, idx) => {
          const startIdx = idx * entriesPerSlide
          const endIdx = Math.min(startIdx + entriesPerSlide, entries.length)
          const assignedEntries = entries.slice(startIdx, endIdx)

          if (assignedEntries.length === 0) return slide

          const script = assignedEntries.map((e) => e.text).join('\n')
          const subtitle = assignedEntries[0].text // 첫 줄을 자막 미리보기로

          return { ...slide, script, subtitle }
        }),
      )

      alert(`자막 파일 불러오기 완료!\n\n총 ${entries.length}개 항목 → ${slideCount}개 슬라이드에 배분되었습니다.`)
    }
    reader.readAsText(file, 'utf-8')
  }

  /** AI 나레이션 대본 생성 */
  const performScriptGeneration = async (id: string, level: ScriptLevel) => {
    const targetSlide = slidesRef.current.find((s) => s.id === id)
    if (!targetSlide) return

    updateSlide(id, { script: 'AI 분석 중...' })

    try {
      const base64Data = targetSlide.imageUrl.split(',')[1] || targetSlide.imageUrl
      const result = await generateSlideScript(base64Data, level)
      updateSlide(id, { script: result.script, subtitle: result.subtitle })
      return result
    } catch (err) {
      console.error(`슬라이드 ${id} 대본 생성 실패:`, err)
      updateSlide(id, { script: '오류: 분석에 실패했습니다.' })
      throw err
    }
  }

  /** TTS 음성 생성 */
  const handleGenerateVoice = async (id: string, text: string, voice: VoiceName) => {
    if (!text || text.includes('분석 중') || text.startsWith('오류')) return
    updateSlide(id, { isGeneratingAudio: true })
    try {
      const base64Audio = await generateSpeech(text, voice)
      if (base64Audio) {
        const buffer = await decodeAudioData(base64ToBytes(base64Audio), getAudioContext())
        updateSlide(id, { audioData: buffer, isGeneratingAudio: false })
      } else {
        throw new Error('No audio data')
      }
    } catch (err: any) {
      updateSlide(id, { isGeneratingAudio: false })
      if (err?.message === 'API_KEY_MISSING') {
        alert('Gemini API Key가 설정되지 않았습니다.\n\nPDF 변환 페이지에서 API Key를 먼저 입력해 주세요.')
      } else {
        alert('음성 생성에 실패했습니다.\n\n' + (err?.message || '알 수 없는 오류'))
      }
    }
  }

  /** 전체 자막 일괄 생성 */
  const handleGenerateAllScripts = async () => {
    if (slides.length === 0) return
    batchCancelRef.current = false
    const total = slides.length
    setBatchState({ type: 'script', current: 0, total })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < total; i++) {
      if (batchCancelRef.current) break
      const slide = slidesRef.current[i]
      if (!slide) continue

      setBatchState({ type: 'script', current: i + 1, total })
      setActiveSlideId(slide.id)

      try {
        const base64Data = slide.imageUrl.split(',')[1] || slide.imageUrl
        updateSlide(slide.id, { script: 'AI 분석 중...' })
        const result = await generateSlideScript(base64Data, scriptLevel)
        updateSlide(slide.id, { script: result.script, subtitle: result.subtitle })
        successCount++
      } catch (err: any) {
        failCount++
        if (err?.message === 'API_KEY_MISSING') {
          alert('Gemini API Key가 설정되지 않았습니다.\n\nPDF 변환 페이지에서 API Key를 먼저 입력해 주세요.')
          break
        }
        updateSlide(slide.id, { script: '오류: 분석 실패' })
        console.error(`슬라이드 ${i + 1} 자막 생성 실패:`, err)
      }
    }

    setBatchState({ type: '', current: 0, total: 0 })
    if (!batchCancelRef.current && failCount > 0) {
      alert(`자막 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    }
  }

  /** 전체 음성 일괄 생성 */
  const handleGenerateAllVoice = async () => {
    // 스크립트가 있는 슬라이드만 대상
    const targetSlides = slidesRef.current.filter(
      (s) => s.script && !s.script.includes('분석 중') && !s.script.startsWith('오류') && !s.audioData,
    )
    if (targetSlides.length === 0) {
      alert('음성을 생성할 슬라이드가 없습니다.\n\n자막이 있고 아직 음성이 없는 슬라이드가 필요합니다.')
      return
    }

    batchCancelRef.current = false
    const total = targetSlides.length
    setBatchState({ type: 'voice', current: 0, total })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < total; i++) {
      if (batchCancelRef.current) break
      const slide = targetSlides[i]

      setBatchState({ type: 'voice', current: i + 1, total })
      setActiveSlideId(slide.id)
      updateSlide(slide.id, { isGeneratingAudio: true })

      try {
        const base64Audio = await generateSpeech(slide.script, selectedVoice)
        if (base64Audio) {
          const buffer = await decodeAudioData(base64ToBytes(base64Audio), getAudioContext())
          updateSlide(slide.id, { audioData: buffer, isGeneratingAudio: false })
          successCount++
        } else {
          throw new Error('No audio data')
        }
      } catch (err: any) {
        failCount++
        updateSlide(slide.id, { isGeneratingAudio: false })
        if (err?.message === 'API_KEY_MISSING') {
          alert('Gemini API Key가 설정되지 않았습니다.\n\nPDF 변환 페이지에서 API Key를 먼저 입력해 주세요.')
          break
        }
        console.error(`슬라이드 음성 생성 실패:`, err)
      }
    }

    setBatchState({ type: '', current: 0, total: 0 })
    if (!batchCancelRef.current && failCount > 0) {
      alert(`음성 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    }
  }

  /** 일괄 생성 취소 */
  const handleCancelBatch = () => {
    batchCancelRef.current = true
  }

  const isBatchRunning = batchState.type !== ''

  /** WebM 비디오 내보내기 */
  const handleExport = async () => {
    if (slides.length === 0) return
    setGenerationState({ isExporting: true, progress: 0, statusMessage: '비디오 렌더링 초기화 중...' })
    try {
      const canvas = renderCanvasRef.current || undefined
      const blob = await exportVideo(
        slides,
        aspectRatio === AspectRatio.Portrait9_16 ? 1080 : 1920,
        aspectRatio === AspectRatio.Portrait9_16 ? 1920 : 1080,
        subtitleStyle,
        (p, msg) => setGenerationState((prev) => ({ ...prev, progress: p, statusMessage: msg })),
        includeSubtitles,
        canvas,
        slideDelayEnabled ? slideDelaySec : 0,
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `magic-studio-video-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('비디오 생성 실패')
    } finally {
      setGenerationState({ isExporting: false, progress: 0, statusMessage: '' })
    }
  }

  /** PPTX 내보내기 */
  const handlePptxExport = async () => {
    if (slides.length === 0) return
    try {
      await exportPptx(slides, aspectRatio)
    } catch (err) {
      alert('PPTX 변환 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden relative">
      {/* ── 상단 헤더 바 ── */}
      <header className="h-14 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-4 sm:px-6 z-20 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
            </svg>
          </div>
          <h1 className="font-bold text-lg tracking-tight hidden sm:block">
            동영상 <span className="text-indigo-400 font-light">스튜디오</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* 화면 비율 토글 */}
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setAspectRatio(AspectRatio.Video16_9)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                aspectRatio === AspectRatio.Video16_9
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              16:9
            </button>
            <button
              onClick={() => setAspectRatio(AspectRatio.Portrait9_16)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                aspectRatio === AspectRatio.Portrait9_16
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              9:16
            </button>
          </div>

          {/* 자막 ON/OFF */}
          <button
            onClick={() => setIncludeSubtitles(!includeSubtitles)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${
              includeSubtitles
                ? 'bg-green-500/10 border-green-500/50 text-green-400'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${includeSubtitles ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`}></div>
            <span className="hidden sm:inline">자막 {includeSubtitles ? 'ON' : 'OFF'}</span>
          </button>

          {/* 슬라이드 간 딜레이 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSlideDelayEnabled(!slideDelayEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-bold ${
                slideDelayEnabled
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500'
              }`}
              title="슬라이드 전환 시 딜레이 추가"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">딜레이</span>
            </button>
            {slideDelayEnabled && (
              <select
                value={slideDelaySec}
                onChange={(e) => setSlideDelaySec(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-400 outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                {[1, 2, 3, 4, 5].map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}초
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* AI 모델 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelect(!showModelSelect)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                modelTier === 'economy' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' :
                modelTier === 'premium' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
                'border-blue-500/50 text-blue-400 bg-blue-500/10'
              }`}
              title="AI 모델 선택 (비용 조절)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.294-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">{MODEL_TIERS[modelTier].label}</span>
            </button>
            {showModelSelect && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                {(Object.keys(MODEL_TIERS) as ModelTier[]).map((tier) => {
                  const c = MODEL_TIERS[tier]
                  const isActive = modelTier === tier
                  return (
                    <button
                      key={tier}
                      onClick={() => handleModelChange(tier)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                        isActive ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : 'hover:bg-gray-700 text-gray-400'
                      }`}
                    >
                      <div className="font-medium">{c.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{c.costLabel}</div>
                    </button>
                  )
                })}
                <div className="text-[9px] text-gray-500 px-2 pt-1 border-t border-gray-700/50">
                  TTS 모델은 변경할 수 없습니다
                </div>
              </div>
            )}
          </div>

          {/* 내보내기 버튼들 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePptxExport}
              disabled={generationState.isExporting || slides.length === 0}
              className="px-3 sm:px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-full font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-orange-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="hidden sm:inline">PPTX</span>
            </button>
            <button
              onClick={handleExport}
              disabled={generationState.isExporting || slides.length === 0}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full font-bold shadow-xl transition-all flex items-center gap-2 disabled:opacity-30 disabled:grayscale text-xs sm:text-sm"
            >
              {generationState.isExporting ? '내보내는 중...' : '비디오 내보내기'}
            </button>
          </div>
        </div>
      </header>

      {/* ── 메인 콘텐츠 영역 ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 슬라이드 관리 패널 */}
        <aside className="w-64 sm:w-80 bg-gray-900 border-r border-gray-800 flex flex-col z-10 shadow-2xl shrink-0">
          <div className="p-4 sm:p-5 border-b border-gray-800 bg-gray-900/50">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">슬라이드 관리</h2>
              <div className="flex items-center gap-2">
                {slides.length > 0 && (
                  <button
                    onClick={() => {
                      if (!confirm(`슬라이드 ${slides.length}개를 모두 삭제하시겠습니까?`)) return
                      // 비디오 blob URL 해제
                      slides.forEach((s) => { if (s.videoUrl) URL.revokeObjectURL(s.videoUrl) })
                      setSlides([])
                      setActiveSlideId('')
                      setSelectedSlideIds([])
                    }}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                  >
                    전체 삭제
                  </button>
                )}
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {selectedSlideIds.length === slides.length && slides.length > 0 ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>
          </div>

          {/* 일괄 생성 버튼 영역 */}
          {slides.length > 0 && (
            <div className="p-3 border-b border-gray-800 flex flex-col gap-2">
              {!isBatchRunning ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateAllScripts}
                    disabled={generationState.isExporting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                    </svg>
                    전체 자막생성
                  </button>
                  <button
                    onClick={handleGenerateAllVoice}
                    disabled={generationState.isExporting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                      <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                    </svg>
                    전체 음성생성
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* 진행 상태 표시 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {batchState.type === 'script' ? '자막 생성 중' : '음성 생성 중'}
                      </span>
                      <span className="text-[10px] font-black text-indigo-400 tabular-nums">
                        {batchState.current}/{batchState.total}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${batchState.total > 0 ? (batchState.current / batchState.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCancelBatch}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-[10px] font-bold transition-all shrink-0"
                  >
                    중단
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {slides.map((slide, idx) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                index={idx}
                isActive={slide.id === activeSlideId}
                isSelected={selectedSlideIds.includes(slide.id)}
                onClick={() => setActiveSlideId(slide.id)}
                onSelect={(e) => toggleSlideSelection(slide.id, e)}
                onDelete={deleteSlide}
              />
            ))}

            {/* 파일 업로드 영역 */}
            <label className="border-2 border-dashed border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 group">
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,application/pdf,video/*"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 bg-gray-800 group-hover:bg-indigo-600 rounded-full flex items-center justify-center transition-all shadow-lg shadow-black/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-gray-400 group-hover:text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xs font-black text-gray-500 group-hover:text-indigo-400 uppercase tracking-widest text-center">
                이미지 / PDF / 영상 추가
              </span>
            </label>
          </div>
        </aside>

        {/* 우측 미리보기 + 편집 영역 */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-950">
          {/* 미리보기 / 렌더링 캔버스 영역 */}
          <div className="flex-1 relative overflow-hidden">
            {/* 일반 미리보기 (내보내기 중이 아닐 때) */}
            <div style={{ display: generationState.isExporting ? 'none' : 'flex' }} className="w-full h-full">
              <PreviewArea activeSlide={activeSlide} aspectRatio={aspectRatio} subtitleStyle={subtitleStyle} />
            </div>

            {/* 렌더링 캔버스 (내보내기 중일 때 표시) */}
            <div
              className="w-full h-full flex items-center justify-center bg-gray-950 p-4"
              style={{ display: generationState.isExporting ? 'flex' : 'none' }}
            >
              <canvas
                ref={renderCanvasRef}
                className="max-w-full max-h-full rounded-lg shadow-2xl border border-gray-700/50"
                style={{
                  aspectRatio: aspectRatio === AspectRatio.Portrait9_16 ? '9 / 16' : '16 / 9',
                }}
              />
            </div>
          </div>

          <EditorPanel
            slide={activeSlide}
            onUpdate={updateSlide}
            onGenerateAudio={handleGenerateVoice}
            onGenerateScript={(id, level) => performScriptGeneration(id, level)}
            onLoadSubtitleFile={handleLoadSubtitleFile}
            subtitleStyle={subtitleStyle}
            onUpdateSubtitleStyle={setSubtitleStyle}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            scriptLevel={scriptLevel}
            onScriptLevelChange={setScriptLevel}
          />
        </main>
      </div>

      {/* ── 상단 렌더링 진행 배너 (화면 가리지 않음) ── */}
      {generationState.isExporting && (
        <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none">
          {/* 프로그레스 바 (가장 상단) */}
          <div className="w-full h-1 bg-gray-900/80">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out shadow-[0_0_20px_rgba(99,102,241,0.8)]"
              style={{ width: `${Math.round(generationState.progress)}%` }}
            />
          </div>

          {/* 상태 배너 */}
          <div className="flex items-center justify-center px-4 py-2 pointer-events-auto">
            <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-md border border-indigo-500/30 rounded-full px-5 py-2 shadow-2xl shadow-indigo-900/30">
              <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shrink-0"></div>
              <span className="text-sm font-semibold text-gray-200">
                {generationState.statusMessage || '렌더링 중...'}
              </span>
              <span className="text-sm font-black text-indigo-400 tabular-nums">
                {Math.round(generationState.progress)}%
              </span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0"></span>
            </div>
          </div>
        </div>
      )}

      {/* ── 일괄 생성 진행 배너 ── */}
      {isBatchRunning && !generationState.isExporting && (
        <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none">
          <div className="w-full h-1 bg-gray-900/80">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${batchState.total > 0 ? (batchState.current / batchState.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-center px-4 py-2 pointer-events-auto">
            <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-md border border-indigo-500/30 rounded-full px-5 py-2 shadow-2xl shadow-indigo-900/30">
              <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shrink-0"></div>
              <span className="text-sm font-semibold text-gray-200">
                {batchState.type === 'script' ? '전체 자막 생성 중' : '전체 음성 생성 중'}
              </span>
              <span className="text-sm font-black text-indigo-400 tabular-nums">
                {batchState.current}/{batchState.total}
              </span>
              <button
                onClick={handleCancelBatch}
                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
              >
                중단
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoMaker

