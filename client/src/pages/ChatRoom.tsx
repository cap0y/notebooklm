import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Hash,
  Users,
  Loader2,
  Trash2,
  Settings,
  MessageCircle,
  Newspaper,
} from 'lucide-react'
import FeedBoard from '../components/FeedBoard'
import FeedDetail from '../components/FeedDetail'
import EmojiPicker from '../components/EmojiPicker'

// ── 타입 정의 ──
interface ChatMessage {
  id: number
  channel: string
  author_name: string
  content: string
  created_at: string
}

// 기본 채널 목록 (고정)
const DEFAULT_CHANNELS = [
  { id: 'general', name: '일반', description: '자유롭게 대화하세요', type: 'chat' as const },
  { id: 'questions', name: '질문', description: 'AI 한글 에디터 사용법 질문', type: 'chat' as const },
  { id: 'tips', name: '팁 공유', description: '유용한 팁과 노하우를 공유', type: 'chat' as const },
  { id: 'feedback', name: '피드백', description: '기능 제안 및 개선 요청', type: 'chat' as const },
  { id: 'feed', name: '피드 게시판', description: '자유 게시판 - 글, 이미지, 동영상 공유', type: 'feed' as const },
]

// 닉네임 색상 생성 (문자열 해시 기반으로 일관된 색상)
function getNameColor(name: string): string {
  const colors = [
    '#5865F2', // 파란색
    '#57F287', // 초록색
    '#FEE75C', // 노란색
    '#EB459E', // 핑크색
    '#ED4245', // 빨간색
    '#E67E22', // 주황색
    '#9B59B6', // 보라색
    '#1ABC9C', // 청록색
    '#3498DB', // 밝은 파란색
    '#E74C3C', // 산호색
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 날짜 구분선 표시용 포맷
function formatDateDivider(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return '오늘'
  if (d.toDateString() === yesterday.toDateString()) return '어제'

  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

// 시간 포맷
function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 채팅방 컴포넌트
 *
 * aiavata 프로젝트의 Discord 채팅방 스타일을 그대로 구현.
 * - 왼쪽 채널 사이드바 + 가운데 메시지 영역 + 하단 입력창
 * - 닉네임 + 비밀번호로 인증 없이 참여
 * - 3초 폴링으로 새 메시지 자동 갱신
 */
export default function ChatRoom() {
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showChannelSidebar, setShowChannelSidebar] = useState(false)

  // 닉네임/비밀번호 (localStorage에 저장)
  const [nickname, setNickname] = useState(() =>
    localStorage.getItem('chat_nickname') || ''
  )
  const [password, setPassword] = useState(() =>
    localStorage.getItem('chat_password') || ''
  )
  const [showNicknameSetup, setShowNicknameSetup] = useState(false)
  const [tempNickname, setTempNickname] = useState('')
  const [tempPassword, setTempPassword] = useState('')

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // 피드 게시판 상태
  const [feedDetailPostId, setFeedDetailPostId] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgIdRef = useRef<number>(0)
  const isAtBottomRef = useRef(true)

  // ── 메시지 로드 ──
  const loadMessages = useCallback(async (channel: string) => {
    try {
      const res = await fetch(`/api/chat/${channel}/messages?limit=100`)
      if (!res.ok) throw new Error()
      const data: ChatMessage[] = await res.json()
      setMessages(data)
      if (data.length > 0) {
        lastMsgIdRef.current = data[data.length - 1].id
      }
    } catch {
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── 새 메시지 폴링 (채팅 채널만) ──
  const pollNewMessages = useCallback(async () => {
    const channelInfo = DEFAULT_CHANNELS.find((c) => c.id === activeChannel)
    if (channelInfo?.type === 'feed') return
    if (lastMsgIdRef.current === 0) return
    try {
      const res = await fetch(
        `/api/chat/${activeChannel}/messages/after/${lastMsgIdRef.current}`
      )
      if (!res.ok) return
      const newMsgs: ChatMessage[] = await res.json()
      if (newMsgs.length > 0) {
        setMessages((prev) => [...prev, ...newMsgs])
        lastMsgIdRef.current = newMsgs[newMsgs.length - 1].id
      }
    } catch {
      // 폴링 실패 무시
    }
  }, [activeChannel])

  // ── 채널 변경 시 메시지 로드 (채팅 채널만) ──
  useEffect(() => {
    const channelInfo = DEFAULT_CHANNELS.find((c) => c.id === activeChannel)
    if (channelInfo?.type === 'feed') {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setMessages([])
    lastMsgIdRef.current = 0
    loadMessages(activeChannel)
  }, [activeChannel, loadMessages])

  // ── 폴링 시작/정리 ──
  useEffect(() => {
    pollingRef.current = setInterval(pollNewMessages, 3000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [pollNewMessages])

  // ── 스크롤 하단 유지 ──
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ── 스크롤 위치 감지 ──
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const threshold = 100
    isAtBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // ── 메시지 전송 ──
  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return

    if (!nickname.trim() || !password.trim()) {
      setShowNicknameSetup(true)
      return
    }

    setIsSending(true)
    try {
      const res = await fetch(`/api/chat/${activeChannel}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: nickname,
          password,
          content: inputMessage.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '메시지 전송에 실패했습니다.')
        return
      }

      const newMsg: ChatMessage = await res.json()
      setMessages((prev) => [...prev, newMsg])
      lastMsgIdRef.current = newMsg.id
      setInputMessage('')
      isAtBottomRef.current = true
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    } catch {
      alert('메시지 전송에 실패했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  // ── 메시지 삭제 ──
  const handleDelete = async () => {
    if (!deleteTarget || !deletePassword.trim()) return

    try {
      const res = await fetch(`/api/chat/messages/${deleteTarget}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error || '삭제에 실패했습니다.')
        return
      }

      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget))
      setDeleteTarget(null)
      setDeletePassword('')
      setDeleteError('')
    } catch {
      setDeleteError('삭제에 실패했습니다.')
    }
  }

  // ── 닉네임 저장 ──
  const saveNickname = () => {
    if (!tempNickname.trim() || !tempPassword.trim()) return
    const nick = tempNickname.trim()
    const pass = tempPassword.trim()
    setNickname(nick)
    setPassword(pass)
    localStorage.setItem('chat_nickname', nick)
    localStorage.setItem('chat_password', pass)
    setShowNicknameSetup(false)
    inputRef.current?.focus()
  }

  // ── Enter로 전송 (Shift+Enter는 줄바꿈) ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── 메시지 그룹화 (같은 유저가 연속 작성한 메시지 묶기) ──
  const renderMessages = () => {
    if (messages.length === 0) {
      const channelInfo = DEFAULT_CHANNELS.find((c) => c.id === activeChannel)
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-gray-900/60 flex items-center justify-center mb-4">
            <Hash className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            #{channelInfo?.name || activeChannel}에 오신 것을 환영합니다!
          </h3>
          <p className="text-gray-400 text-sm max-w-md">
            {channelInfo?.description || '이 채널에서 대화를 시작해보세요.'}
          </p>
        </div>
      )
    }

    const elements: React.ReactNode[] = []
    let lastDate = ''
    let lastAuthor = ''
    let lastTime = ''

    messages.forEach((msg, idx) => {
      const msgDate = new Date(msg.created_at).toDateString()
      const msgTime = formatTime(msg.created_at)

      // 날짜 구분선
      if (msgDate !== lastDate) {
        elements.push(
          <div key={`date-${msgDate}`} className="flex items-center gap-4 py-2 px-4">
            <div className="flex-1 h-px bg-gray-800/60" />
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {formatDateDivider(msg.created_at)}
            </span>
            <div className="flex-1 h-px bg-gray-800/60" />
          </div>
        )
        lastAuthor = ''
        lastDate = msgDate
      }

      // 같은 유저가 1분 이내에 연속 작성하면 아바타/이름 생략
      const isGrouped = msg.author_name === lastAuthor && msgTime === lastTime

      elements.push(
        <div
          key={msg.id}
          className={`group flex items-start gap-4 px-4 hover:bg-gray-900/40 ${isGrouped ? 'py-0.5' : 'mt-3 py-1'}`}
        >
          {/* 아바타 */}
          {isGrouped ? (
            <div className="w-10 shrink-0 flex items-center justify-center">
              <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {msgTime}
              </span>
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5"
              style={{ backgroundColor: getNameColor(msg.author_name) }}
            >
              {msg.author_name[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* 메시지 내용 */}
          <div className="flex-1 min-w-0">
            {!isGrouped && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className="font-semibold text-sm hover:underline cursor-pointer"
                  style={{ color: getNameColor(msg.author_name) }}
                >
                  {msg.author_name}
                </span>
                <span className="text-[11px] text-gray-500">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            )}
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {msg.content}
            </p>
          </div>

          {/* 삭제 버튼 */}
          <button
            onClick={() => {
              setDeleteTarget(msg.id)
              setDeletePassword('')
              setDeleteError('')
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-400 shrink-0"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )

      lastAuthor = msg.author_name
      lastTime = msgTime
    })

    return elements
  }

  const activeChannelInfo = DEFAULT_CHANNELS.find((c) => c.id === activeChannel)

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-950">
      {/* ─── 모바일 오버레이 배경 ─── */}
      {showChannelSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowChannelSidebar(false)}
        />
      )}

      {/* ─── 채널 사이드바 ─── */}
      <div
        className={`
          ${showChannelSidebar ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:static inset-y-0 left-0 z-40 md:z-auto
          w-60 border-r border-gray-800/50 flex flex-col shrink-0
          transition-transform duration-200 md:transition-none
          bg-gray-900/80 backdrop-blur-sm
        `}
      >
        {/* 서버 헤더 */}
        <div className="h-12 px-4 flex items-center border-b border-gray-800/50 shadow-sm">
          <h2 className="font-semibold text-white text-sm truncate">AI 한글 에디터</h2>
        </div>

        {/* 채널 목록 */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              채팅 채널
            </span>
          </div>
          {DEFAULT_CHANNELS.filter(ch => ch.type === 'chat').map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChannel(ch.id)
                setFeedDetailPostId(null)
                setShowChannelSidebar(false)
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                activeChannel === ch.id
                  ? 'bg-gray-800/60 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Hash className="w-4 h-4 shrink-0 opacity-60" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}

          {/* 피드 게시판 섹션 */}
          <div className="flex items-center justify-between px-2 mb-1 mt-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              게시판
            </span>
          </div>
          {DEFAULT_CHANNELS.filter(ch => ch.type === 'feed').map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChannel(ch.id)
                setFeedDetailPostId(null)
                setShowChannelSidebar(false)
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                activeChannel === ch.id
                  ? 'bg-gray-800/60 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Newspaper className="w-4 h-4 shrink-0 opacity-60" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* 유저 패널 (하단) */}
        <div className="h-[52px] px-2 flex items-center bg-gray-900/60 border-t border-gray-800/50">
          {nickname ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: getNameColor(nickname) }}
              >
                {nickname[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{nickname}</p>
                <p className="text-[10px] text-gray-400">접속 중</p>
              </div>
              <button
                onClick={() => {
                  setTempNickname(nickname)
                  setTempPassword(password)
                  setShowNicknameSetup(true)
                }}
                className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                title="닉네임 변경"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempNickname('')
                setTempPassword('')
                setShowNicknameSetup(true)
              }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-full"
            >
              <Users className="w-4 h-4" />
              <span>닉네임 설정</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 메인 영역 ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
        {/* 채널 헤더 */}
        <div className="h-12 px-4 flex items-center gap-3 border-b border-gray-800/50 shadow-sm shrink-0">
          {/* 모바일 햄버거 */}
          <button
            onClick={() => setShowChannelSidebar(true)}
            className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {activeChannelInfo?.type === 'feed' ? (
            <Newspaper className="w-5 h-5 text-gray-400" />
          ) : (
            <Hash className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="font-semibold text-white text-sm">
            {activeChannelInfo?.name || activeChannel}
          </h3>
          {activeChannelInfo?.description && (
            <>
              <div className="w-px h-5 bg-gray-800/60 hidden sm:block" />
              <p className="text-xs text-gray-400 truncate hidden sm:block">
                {activeChannelInfo.description}
              </p>
            </>
          )}
        </div>

        {/* 피드 게시판 OR 채팅 영역 */}
        {activeChannelInfo?.type === 'feed' ? (
          <div className="flex-1 overflow-hidden relative">
            {feedDetailPostId !== null ? (
              <FeedDetail
                postId={feedDetailPostId}
                nickname={nickname}
                password={password}
                onBack={() => setFeedDetailPostId(null)}
              />
            ) : (
              <FeedBoard
                nickname={nickname}
                password={password}
                onPostClick={(postId) => setFeedDetailPostId(postId)}
              />
            )}
          </div>
        ) : (
          <>
            {/* 메시지 영역 */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto pb-4"
            >
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : (
                <>
                  {renderMessages()}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 입력 영역 */}
            <div className="px-4 pb-4 shrink-0">
              {!nickname ? (
                <button
                  onClick={() => {
                    setTempNickname('')
                    setTempPassword('')
                    setShowNicknameSetup(true)
                  }}
                    className="w-full py-3 rounded-lg bg-gray-900/60 border border-gray-800/60 text-gray-300 hover:bg-gray-800/60 hover:text-white transition-colors text-sm font-medium"
                >
                  닉네임을 설정하고 채팅에 참여하세요
                </button>
              ) : (
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`#${activeChannelInfo?.name || activeChannel}에 메시지 보내기`}
                    rows={1}
                    maxLength={2000}
                    className="w-full px-4 py-3 pr-24 rounded-lg bg-gray-900/60 border border-gray-800/60 text-gray-200 placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    style={{
                      minHeight: '44px',
                      maxHeight: '200px',
                      height: 'auto',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = Math.min(target.scrollHeight, 200) + 'px'
                    }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setInputMessage((prev) => prev + emoji)
                        inputRef.current?.focus()
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isSending}
                      className="p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── 닉네임 설정 모달 ─── */}
      {showNicknameSetup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm border border-gray-800/60 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">닉네임 설정</h3>
            <p className="text-sm text-gray-400 mb-5">
              채팅에 참여하려면 닉네임과 비밀번호를 설정하세요.
              비밀번호는 메시지 삭제 시 사용됩니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">닉네임</label>
                <input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder="표시될 이름"
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-950 border border-gray-800/60 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">비밀번호</label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="메시지 삭제 시 필요"
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-950 border border-gray-800/60 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNicknameSetup(false)}
                className="flex-1 py-2.5 rounded-lg bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveNickname}
                disabled={!tempNickname.trim() || !tempPassword.trim()}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 삭제 확인 모달 ─── */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm border border-gray-800/60 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">메시지 삭제</h3>
            <p className="text-sm text-gray-400 mb-5">
              이 메시지를 삭제하려면 작성 시 사용한 비밀번호를 입력하세요.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value)
                setDeleteError('')
              }}
              placeholder="비밀번호"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-950 border border-gray-800/60 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 mb-2"
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
              autoFocus
            />
            {deleteError && (
              <p className="text-xs text-red-400 mb-2">{deleteError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setDeleteTarget(null)
                  setDeletePassword('')
                  setDeleteError('')
                }}
                className="flex-1 py-2.5 rounded-lg bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={!deletePassword.trim()}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

