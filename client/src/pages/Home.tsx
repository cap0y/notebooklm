import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  ScanLine,
  Move,
  Upload,
  Type,
  Download,
  ArrowRight,
  ArrowDown,
  Eraser,
  Ruler,
  Video,
} from 'lucide-react'
import Footer from '../components/Footer'

/**
 * 메인 홈 페이지 (반응형)
 * AI 한글 에디터의 주요 기능을 안내하고 빠른 접근을 제공
 *
 * 모바일: 작은 타이틀, 세로 배치, 터치 친화적 버튼
 * 데스크탑: 넓은 그리드, 작업 흐름 가로 표시
 *
 * 채팅 기능은 FloatingChat 컴포넌트로 분리되어 전체 페이지에서 접근 가능
 */
const Home = () => {
  const navigate = useNavigate()

  // PDF/이미지 파일 드래그 앤 드롭
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
        navigate('/pdf-converter', { state: { file } })
      }
    },
    [navigate]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // 파일 선택
  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        navigate('/pdf-converter', { state: { file } })
      }
    }
    input.click()
  }, [navigate])

  const workflowSteps = [
    { icon: FileText, text: 'PDF 업로드' },
    { icon: Eraser, text: '워터마크 제거' },
    { icon: ScanLine, text: '한글 인식' },
    { icon: Type, text: '텍스트 교체' },
    { icon: Download, text: 'PDF 다운로드' },
  ]

  return (
    <div className="flex-1 overflow-auto bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── 헤더 영역 ── */}
        <div className="text-center mb-8 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4 sm:mb-5">
            <Type className="w-3.5 h-3.5" />
            PDF 한글 텍스트 복원 도구
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3 sm:mb-4">
          NotebookLM 워터마크 제거 및 AI 한글 에디터
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            NotebookLM 등에서 생성된 PDF 슬라이드의 깨진 한글을
            자동으로 인식하고 깨끗한 텍스트로 교체합니다
          </p>
        </div>

        {/* ── PDF 업로드 영역 ── */}
        <div
          className="mb-8 sm:mb-14 cursor-pointer group"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleFileSelect}
        >
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-700/60 p-5 sm:p-8 hover:border-blue-500/40 active:border-blue-500/50 transition-all duration-300">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-gray-300 font-medium text-sm sm:text-base mb-1">
                  PDF 또는 이미지 파일을 드래그하거나 클릭하여 시작
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">
                  워터마크 자동 제거 → 이미지 변환 → 한글 편집 → PDF 다운로드
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 작업 흐름 ── */}
        <div className="mb-8 sm:mb-14">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 sm:mb-6 text-center">
            작업 흐름
          </h2>
          {/* 모바일: 세로 방향 / 데스크탑: 가로 방향 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            {workflowSteps.map((step, i, arr) => (
              <React.Fragment key={step.text}>
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2.5 w-full sm:w-auto justify-center">
                  <step.icon className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-gray-300 text-sm whitespace-nowrap">{step.text}</span>
                </div>
                {i < arr.length - 1 && (
                  <>
                    {/* 모바일: 아래 화살표 / 데스크탑: 오른쪽 화살표 */}
                    <ArrowDown className="w-4 h-4 text-gray-600 shrink-0 sm:hidden" />
                    <ArrowRight className="w-4 h-4 text-gray-600 shrink-0 hidden sm:block" />
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── 기능 카드 그리드 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 sm:mb-14">
          {/* PDF 변환 */}
          <button
            onClick={() => navigate('/pdf-converter')}
            className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 sm:p-6 text-left hover:border-gray-700 active:bg-gray-800/40 transition-all group"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-1.5">PDF 변환 & 워터마크 제거</h3>
                <ul className="space-y-1">
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    PDF 슬라이드를 고해상도 이미지로 변환
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    NotebookLM 워터마크 자동 제거
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    이미지 또는 PDF로 일괄 다운로드
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* 한글 텍스트 교체 */}
          <button
            onClick={() => navigate('/image-editor')}
            className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 sm:p-6 text-left hover:border-gray-700 active:bg-gray-800/40 transition-all group"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Type className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-1.5">한글 텍스트 교체</h3>
                <ul className="space-y-1">
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    깨진 한글 영역을 선택하여 OCR 인식
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    원본 폰트 크기·두께 자동 측정 후 교체
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    편집 결과를 PDF에 바로 반영
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* 이미지 조각 이동 */}
          <button
            onClick={() => navigate('/image-editor')}
            className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 sm:p-6 text-left hover:border-gray-700 active:bg-gray-800/40 transition-all group"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Move className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-1.5">이미지 조각 이동</h3>
                <ul className="space-y-1">
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    선택 영역의 이미지를 드래그로 이동
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    8개 핸들로 선택 영역 크기 조절
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    Ctrl+Z로 실행 취소
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* 정밀 편집 */}
          <button
            onClick={() => navigate('/image-editor')}
            className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 sm:p-6 text-left hover:border-gray-700 active:bg-gray-800/40 transition-all group"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Ruler className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-1.5">정밀 편집 도구</h3>
                <ul className="space-y-1">
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    원본 글자 높이·획 두께 픽셀 단위 측정
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    폰트 크기 슬라이더 + 볼드 토글
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    Ctrl+마우스 휠로 이미지 확대/축소
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* 동영상 스튜디오 */}
          <button
            onClick={() => navigate('/video-maker')}
            className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 sm:p-6 text-left hover:border-gray-700 active:bg-gray-800/40 transition-all group md:col-span-2"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-1.5">동영상 스튜디오</h3>
                <ul className="space-y-1">
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    PDF/이미지/영상을 슬라이드로 변환하여 동영상 제작
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    AI 나레이션 대본 자동 생성 + TTS 음성 합성
                  </li>
                  <li className="text-gray-500 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    자막 스타일 커스터마이징 + WebM 비디오 내보내기
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </div>

      </div>

      {/* ── 풋터 ── */}
      <Footer />
    </div>
  )
}

export default Home
