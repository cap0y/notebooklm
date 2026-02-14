import React, { useState } from 'react'
import { Slide, VoiceName, ScriptLevel, SubtitleStyle } from '../types'
import { VOICES } from '../constants'

interface EditorPanelProps {
  slide: Slide | undefined
  onUpdate: (id: string, updates: Partial<Slide>) => void
  onGenerateAudio: (id: string, text: string, voice: VoiceName) => void
  onGenerateScript: (id: string, level: ScriptLevel) => void
  onLoadSubtitleFile: (file: File) => void
  subtitleStyle: SubtitleStyle
  onUpdateSubtitleStyle: (style: SubtitleStyle) => void
  selectedVoice: VoiceName
  onVoiceChange: (voice: VoiceName) => void
  scriptLevel: ScriptLevel
  onScriptLevelChange: (level: ScriptLevel) => void
}

/**
 * 편집 패널 — 나레이션 대본 편집, TTS 음성 생성, 자막 스타일 설정
 *
 * 좌측: 나레이션 대본 입력/AI 생성 + 음성 선택/생성
 * 우측: 자막 위치, 폰트 크기, 색상, 배경 투명도 등 스타일 설정
 */
export const EditorPanel: React.FC<EditorPanelProps> = ({
  slide,
  onUpdate,
  onGenerateAudio,
  onGenerateScript,
  onLoadSubtitleFile,
  subtitleStyle,
  onUpdateSubtitleStyle,
  selectedVoice,
  onVoiceChange,
  scriptLevel,
  onScriptLevelChange,
}) => {
  const [isScriptGenerating, setIsScriptGenerating] = useState(false)
  const srtInputRef = React.useRef<HTMLInputElement>(null)

  const handleSrtFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onLoadSubtitleFile(file)
      e.target.value = '' // 같은 파일 재선택 가능하도록 초기화
    }
  }

  const handleScriptGen = async () => {
    if (!slide) return
    setIsScriptGenerating(true)
    try {
      await onGenerateScript(slide.id, scriptLevel)
    } catch (err: any) {
      if (err?.message === 'API_KEY_MISSING') {
        alert('Gemini API Key가 설정되지 않았습니다.\n\nPDF 변환 페이지에서 API Key를 먼저 입력해 주세요.')
      } else {
        alert('자막 생성에 실패했습니다.\n\n' + (err?.message || '알 수 없는 오류'))
      }
    } finally {
      setIsScriptGenerating(false)
    }
  }

  const updateStyle = (field: keyof SubtitleStyle, value: any) => {
    onUpdateSubtitleStyle({ ...subtitleStyle, [field]: value })
  }

  if (!slide) {
    return (
      <div className="h-72 bg-gray-900 border-t border-gray-800 p-8 flex items-center justify-center text-gray-600">
        슬라이드를 선택하세요
      </div>
    )
  }

  return (
    <div className="h-80 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row">
      {/* ── 나레이션 대본 섹션 ── */}
      <div className="flex-1 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">나레이션 대본 (TTS)</label>

          <div className="flex items-center gap-2">
            {/* 대상 청중 선택 */}
            <select
              className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 focus:ring-indigo-500 text-gray-300 outline-none"
              value={scriptLevel}
              onChange={(e) => onScriptLevelChange(e.target.value as ScriptLevel)}
            >
              <option value="expert">전문가</option>
              <option value="university">대학생</option>
              <option value="elementary">초등학생</option>
              <option value="senior">시니어</option>
            </select>

            {/* SRT 자막 파일 불러오기 버튼 */}
            <input
              ref={srtInputRef}
              type="file"
              accept=".srt,.txt"
              className="hidden"
              onChange={handleSrtFileSelect}
            />
            <button
              onClick={() => srtInputRef.current?.click()}
              className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors"
              title="SRT 자막 파일을 불러와 전체 슬라이드에 배분합니다"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              자막 불러오기
            </button>

            {/* AI 자막 생성 버튼 */}
            <button
              onClick={handleScriptGen}
              disabled={isScriptGenerating}
              className={`text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors ${isScriptGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isScriptGenerating ? (
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              )}
              자막생성
            </button>
          </div>
        </div>

        {/* 대본 입력 텍스트 영역 */}
        <textarea
          className="flex-1 bg-gray-800 border-gray-700 rounded-md p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed"
          placeholder="AI 음성으로 읽을 나레이션 텍스트를 입력하세요..."
          value={slide.script}
          onChange={(e) => onUpdate(slide.id, { script: e.target.value })}
        />

        {/* 음성 선택 + TTS 생성 */}
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-800 border-gray-700 text-sm rounded px-3 py-1.5 focus:ring-indigo-500 outline-none"
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
          >
            {VOICES.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.gender}, {v.style})
              </option>
            ))}
          </select>

          <button
            onClick={() => onGenerateAudio(slide.id, slide.script, selectedVoice)}
            disabled={slide.isGeneratingAudio || !slide.script}
            className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all
              ${slide.isGeneratingAudio ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'}`}
          >
            {slide.isGeneratingAudio ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                생성 중...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                음성 생성
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 자막 스타일 설정 섹션 ── */}
      <div className="w-full md:w-1/3 p-4 sm:p-6 flex flex-col gap-4 bg-gray-900/50 overflow-y-auto">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">자막 스타일</label>

        <div className="space-y-4">
          {/* 세로 위치 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>세로 위치</span>
              <span>{subtitleStyle.verticalPosition}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={subtitleStyle.verticalPosition}
              onChange={(e) => updateStyle('verticalPosition', Number(e.target.value))}
              className="w-full accent-indigo-500 bg-gray-700 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* 글꼴 크기 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>글꼴 크기</span>
              <span>{subtitleStyle.fontSize}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={subtitleStyle.fontSize}
              onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
              className="w-full accent-indigo-500 bg-gray-700 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* 글꼴 종류 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">글꼴</label>
            <select
              value={subtitleStyle.fontFamily}
              onChange={(e) => updateStyle('fontFamily', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:ring-indigo-500 outline-none"
            >
              <option value="Inter">Inter (기본)</option>
              <option value="sans-serif">고딕</option>
              <option value="serif">명조</option>
              <option value="monospace">고정폭</option>
              <option value="cursive">손글씨</option>
            </select>
          </div>

          {/* 텍스트 & 배경 색상 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">글자 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={subtitleStyle.color}
                  onChange={(e) => updateStyle('color', e.target.value)}
                  className="w-8 h-8 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-gray-400 uppercase">{subtitleStyle.color}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">배경 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={subtitleStyle.backgroundColor}
                  onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                  className="w-8 h-8 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-gray-400 uppercase">{subtitleStyle.backgroundColor}</span>
              </div>
            </div>
          </div>

          {/* 배경 투명도 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>배경 투명도</span>
              <span>{Math.round(subtitleStyle.backgroundOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={subtitleStyle.backgroundOpacity}
              onChange={(e) => updateStyle('backgroundOpacity', Number(e.target.value))}
              className="w-full accent-indigo-500 bg-gray-700 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

