import React, { useCallback, useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  MessageCircle,
  ChevronRight,
  Send,
  Settings,
  User,
  Video,
  Mic,
  Subtitles,
  Film,
} from 'lucide-react'
import Footer from '../components/Footer'

/**
 * 메인 홈 페이지 (반응형)
 * AI 한글 에디터의 주요 기능을 안내하고 빠른 접근을 제공
 *
 * 모바일: 작은 타이틀, 세로 배치, 터치 친화적 버튼
 * 데스크탑: 넓은 그리드, 작업 흐름 가로 표시
 */
interface ChatMsg {
  id: number
  author_name: string
  content: string
  created_at: string
}

const NICK_COLORS = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#E67E22', '#9B59B6', '#1ABC9C']
function nickColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return NICK_COLORS[Math.abs(h) % NICK_COLORS.length]
}

const Home = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isVisible = location.pathname === '/'

  const [recentMessages, setRecentMessages] = useState<ChatMsg[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  // ── 채팅 입력 관련 state ──
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('chatAuthorName') || '')
  const [authorPassword, setAuthorPassword] = useState(() => localStorage.getItem('chatAuthorPassword') || '')
  const [showNickModal, setShowNickModal] = useState(false)
  const [tempNick, setTempNick] = useState('')
  const [tempPw, setTempPw] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 최신 채팅 메시지 가져오기 — 홈 페이지가 보일 때만 폴링
  useEffect(() => {
    if (!isVisible) return

    let cancelled = false

    const fetchRecentMessages = async () => {
      try {
        const res = await fetch('/api/chat/general/messages?limit=30')
        if (res.ok && !cancelled) {
          const data: ChatMsg[] = await res.json()
          setRecentMessages(data)
        }
      } catch (err) {
        console.error('채팅 메시지 로딩 실패:', err)
      } finally {
        if (!cancelled) setIsLoadingMessages(false)
      }
    }

    fetchRecentMessages()
    const intervalId = setInterval(fetchRecentMessages, 3000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [isVisible])

  // 새 메시지가 오면 채팅 컨테이너 내부만 스크롤 (페이지 전체 이동 방지)
  useEffect(() => {
    if (isVisible && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [recentMessages, isVisible])

  // ── 메시지 전송 ──
  const sendMessage = async () => {
    if (!chatInput.trim()) return

    // 닉네임/비밀번호 없으면 설정 모달
    if (!authorName.trim() || !authorPassword.trim()) {
      setTempNick(authorName)
      setTempPw(authorPassword)
      setShowNickModal(true)
      return
    }

    setIsSending(true)
    try {
      const res = await fetch('/api/chat/general/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          password: authorPassword,
          content: chatInput,
        }),
      })
      if (res.ok) {
        const newMsg: ChatMsg = await res.json()
        setRecentMessages((prev) => [...prev, newMsg])
        setChatInput('')
      } else {
        const err = await res.json()
        alert(err.error || '메시지 전송 실패')
      }
    } catch (err) {
      console.error('메시지 전송 실패:', err)
      alert('메시지 전송에 실패했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  // Enter → 전송, Shift+Enter → 줄바꿈
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 닉네임 설정 저장
  const saveNickname = () => {
    if (!tempNick.trim() || !tempPw.trim()) {
      alert('닉네임과 비밀번호를 모두 입력하세요.')
      return
    }
    setAuthorName(tempNick.trim())
    setAuthorPassword(tempPw.trim())
    localStorage.setItem('chatAuthorName', tempNick.trim())
    localStorage.setItem('chatAuthorPassword', tempPw.trim())
    setShowNickModal(false)
  }

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

        {/* ── 기능 카드 & 최신 게시글 (좌우 5:5 레이아웃) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 sm:mb-14">
          {/* 좌측: 기능 카드 */}
          <div className="space-y-4">
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
              className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 sm:p-6 text-left hover:border-gray-700 active:bg-gray-800/40 transition-all group"
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
                      PDF/이미지를 슬라이드로 변환하여 동영상 제작
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

          {/* 우측: 실시간 채팅 (#일반 채널) — 입력 가능 */}
          <div className="flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-400" />
                실시간 채팅
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-normal bg-green-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {/* 닉네임 설정 버튼 */}
                <button
                  onClick={() => { setTempNick(authorName); setTempPw(authorPassword); setShowNickModal(true) }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors bg-gray-800/50 rounded-lg px-2.5 py-1.5"
                  title="닉네임 설정"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[80px]">{authorName || '닉네임 설정'}</span>
                </button>
                <button
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  전체보기
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 채팅 박스 */}
            <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl overflow-hidden flex flex-col" style={{ height: '480px' }}>
              {/* 채널 표시 */}
              <div className="px-4 py-2 border-b border-gray-800/60 bg-gray-900/80 shrink-0 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium"># 일반</span>
                <span className="text-[10px] text-gray-600">{recentMessages.length}개 메시지</span>
              </div>

              {/* 메시지 목록 (스크롤 가능) */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                {isLoadingMessages ? (
                  <div className="space-y-3 py-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                        <div className="flex gap-4">
                          <div className="h-3 bg-gray-800 rounded w-16" />
                          <div className="h-3 bg-gray-800 rounded w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                      <MessageCircle className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-sm mb-1">아직 메시지가 없습니다</p>
                    <p className="text-gray-600 text-xs">아래에서 첫 메시지를 보내보세요!</p>
                  </div>
                ) : (
                  recentMessages.map((msg) => (
                    <div key={msg.id} className="py-1.5 hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5"
                          style={{ backgroundColor: nickColor(msg.author_name) }}
                        >
                          {msg.author_name[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: nickColor(msg.author_name) }}>{msg.author_name}</span>
                            <span className="text-[10px] text-gray-600">
                              {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {/* 스크롤 앵커 불필요 — chatContainerRef.scrollTop 사용 */}
              </div>

              {/* 메시지 입력 영역 */}
              <div className="px-3 py-3 border-t border-gray-800/60 bg-gray-900/80 shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder={authorName ? `${authorName}(으)로 메시지 보내기...` : '닉네임을 먼저 설정하세요'}
                    rows={1}
                    maxLength={1000}
                    className="flex-1 bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all max-h-24"
                    style={{ overflowY: 'auto' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isSending || !chatInput.trim()}
                    className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
                  >
                    {isSending ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5 ml-1">
                  Enter로 전송 · Shift+Enter로 줄바꿈
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── 풋터 ── */}
      <Footer />

      {/* ── 닉네임/비밀번호 설정 모달 ── */}
      {showNickModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNickModal(false)}>
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-lg font-bold text-white mb-1">채팅 설정</h3>
              <p className="text-gray-400 text-xs">채팅에 사용할 닉네임과 비밀번호를 설정합니다.</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">닉네임</label>
                <input
                  type="text"
                  value={tempNick}
                  onChange={(e) => setTempNick(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  maxLength={50}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">비밀번호</label>
                <input
                  type="password"
                  value={tempPw}
                  onChange={(e) => setTempPw(e.target.value)}
                  placeholder="비밀번호 (메시지 삭제 시 필요)"
                  maxLength={100}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  onKeyDown={(e) => { if (e.key === 'Enter') saveNickname() }}
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={() => setShowNickModal(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveNickname}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
