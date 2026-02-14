import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, ChevronRight, Send, User, X, Minus, Maximize2, Minimize2 } from 'lucide-react'

/**
 * 플로팅 실시간 채팅 컴포넌트
 *
 * - 우측 하단 고정 플로팅 버튼 → 클릭하면 채팅창 펼침
 * - 펼치기 / 접기 토글
 * - 드래그로 크기 조절 가능 (좌상단 모서리)
 * - 최대화 / 복원 토글
 * - 전체 페이지에서 접근 가능 (Layout에 배치)
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

const MIN_WIDTH = 320
const MIN_HEIGHT = 360
const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 520

const FloatingChat: React.FC = () => {
  const navigate = useNavigate()

  // ── 채팅창 상태 ──
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [unreadCount, setUnreadCount] = useState(0)

  // ── 채팅 데이터 ──
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('chatAuthorName') || '')
  const [authorPassword, setAuthorPassword] = useState(() => localStorage.getItem('chatAuthorPassword') || '')
  const [showNickModal, setShowNickModal] = useState(false)
  const [tempNick, setTempNick] = useState('')
  const [tempPw, setTempPw] = useState('')

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const lastMsgCountRef = useRef(0)

  // ── 리사이즈 관련 ──
  const isResizingRef = useRef(false)
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // 메시지 폴링 — 열려있을 때만 (접혀있어도 백그라운드 카운트용으로 가져옴)
  useEffect(() => {
    let cancelled = false

    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/chat/general/messages?limit=30')
        if (res.ok && !cancelled) {
          const data: ChatMsg[] = await res.json()
          // 읽지 않은 메시지 수 계산 (채팅창 닫혀있을 때)
          if (!isOpen && data.length > lastMsgCountRef.current) {
            setUnreadCount((prev) => prev + (data.length - lastMsgCountRef.current))
          }
          lastMsgCountRef.current = data.length
          setMessages(data)
        }
      } catch (err) {
        // 네트워크 오류 무시
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchMessages()
    const intervalId = setInterval(fetchMessages, 3000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [isOpen])

  // 새 메시지 → 스크롤
  useEffect(() => {
    if (isOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isOpen])

  // 채팅창 열면 읽지 않은 카운트 초기화
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  // ── 메시지 전송 ──
  const sendMessage = async () => {
    if (!chatInput.trim()) return

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
        setMessages((prev) => [...prev, newMsg])
        setChatInput('')
      } else {
        const err = await res.json()
        alert(err.error || '메시지 전송 실패')
      }
    } catch (err) {
      alert('메시지 전송에 실패했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

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

  // ── 리사이즈 핸들러 (좌상단 모서리 드래그) ──
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height }

    const handleMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return
      // 좌상단에서 드래그 → 마우스가 왼쪽/위로 가면 커짐
      const dx = resizeStartRef.current.x - ev.clientX
      const dy = resizeStartRef.current.y - ev.clientY
      const newW = Math.max(MIN_WIDTH, Math.min(resizeStartRef.current.w + dx, window.innerWidth - 40))
      const newH = Math.max(MIN_HEIGHT, Math.min(resizeStartRef.current.h + dy, window.innerHeight - 40))
      setSize({ width: newW, height: newH })
    }

    const handleUp = () => {
      isResizingRef.current = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [size])

  // ── 최대화 토글 ──
  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev)
  }

  // ── 플로팅 버튼 (채팅 닫힘) ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-2xl shadow-blue-900/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {/* 읽지 않은 메시지 뱃지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* 호버 라벨 */}
        <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-gray-700/50">
          실시간 채팅
        </span>
      </button>
    )
  }

  // ── 채팅창 크기/위치 ──
  const chatStyle: React.CSSProperties = isMaximized
    ? { position: 'fixed', inset: '0', width: '100%', height: '100%', borderRadius: 0 }
    : {
        position: 'fixed',
        bottom: window.innerWidth < 768 ? '72px' : '24px', // 모바일: 하단 네비 위
        right: window.innerWidth < 768 ? '8px' : '24px',
        width: `${size.width}px`,
        height: `${size.height}px`,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 100px)',
      }

  return (
    <>
      {/* ── 채팅 모달 ── */}
      <div
        className="z-50 flex flex-col bg-gray-900 border border-gray-700/80 shadow-2xl shadow-black/50 overflow-hidden"
        style={{
          ...chatStyle,
          borderRadius: isMaximized ? 0 : '16px',
        }}
      >
        {/* 리사이즈 핸들 (좌상단 모서리, 최대화 아닐 때만) */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-30 group"
            title="드래그하여 크기 조절"
          >
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-gray-500 group-hover:border-blue-400 transition-colors rounded-tl" />
          </div>
        )}

        {/* 헤더 */}
        <div className="h-12 bg-gray-800/90 border-b border-gray-700/60 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">실시간 채팅</span>
            <span className="inline-flex items-center gap-1 text-[9px] text-green-400 font-medium bg-green-500/10 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 닉네임 */}
            <button
              onClick={() => { setTempNick(authorName); setTempPw(authorPassword); setShowNickModal(true) }}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-300 transition-colors bg-gray-700/50 rounded px-2 py-1"
              title="닉네임 설정"
            >
              <User className="w-3 h-3" />
              <span className="truncate max-w-[60px]">{authorName || '설정'}</span>
            </button>

            {/* 전체보기 */}
            <button
              onClick={() => { navigate('/chat'); setIsOpen(false) }}
              className="text-[10px] text-blue-400 hover:text-blue-300 px-2 py-1 transition-colors flex items-center gap-0.5"
            >
              전체
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* 최대화/복원 */}
            <button
              onClick={toggleMaximize}
              className="w-7 h-7 rounded-md hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title={isMaximized ? '복원' : '최대화'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* 접기/닫기 */}
            <button
              onClick={() => { setIsOpen(false); setIsMaximized(false) }}
              className="w-7 h-7 rounded-md hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="닫기"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 채널 표시 */}
        <div className="px-4 py-1.5 border-b border-gray-800/60 bg-gray-850/50 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-medium"># 일반</span>
          <span className="text-[10px] text-gray-600">{messages.length}개 메시지</span>
        </div>

        {/* 메시지 목록 */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-gray-800 rounded w-16" />
                    <div className="h-3 bg-gray-800 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-gray-500 text-xs mb-1">아직 메시지가 없습니다</p>
              <p className="text-gray-600 text-[10px]">아래에서 첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="py-1 hover:bg-gray-800/30 rounded-md px-1.5 -mx-1.5 transition-colors">
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0 mt-0.5"
                    style={{ backgroundColor: nickColor(msg.author_name) }}
                  >
                    {msg.author_name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-semibold" style={{ color: nickColor(msg.author_name) }}>{msg.author_name}</span>
                      <span className="text-[9px] text-gray-600">
                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 메시지 입력 */}
        <div className="px-3 py-2.5 border-t border-gray-800/60 bg-gray-900/80 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder={authorName ? `${authorName}(으)로 메시지 보내기...` : '닉네임을 먼저 설정하세요'}
              rows={1}
              maxLength={1000}
              className="flex-1 bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all max-h-20"
              style={{ overflowY: 'auto' }}
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !chatInput.trim()}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
            >
              {isSending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
          <p className="text-[9px] text-gray-600 mt-1 ml-1">
            Enter 전송 · Shift+Enter 줄바꿈
          </p>
        </div>
      </div>

      {/* ── 닉네임 설정 모달 ── */}
      {showNickModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowNickModal(false)}>
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
    </>
  )
}

export default FloatingChat

