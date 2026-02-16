import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowUp, ArrowDown, MessageSquare, Share2, Flag, Plus,
  Image, X, ChevronLeft, ChevronRight, Loader2, Smile,
  AlertTriangle, Eye, ExternalLink, Youtube,
} from 'lucide-react'

// ── 타입 정의 ──
interface FeedPost {
  id: number
  author_name: string
  title: string
  content: string | null
  media_type: string | null
  media_url: string | null
  media_urls: string[] | null
  thumbnail_url: string | null
  youtube_url: string | null
  upvotes: number
  downvotes: number
  comment_count: number
  view_count: number
  report_count: number
  created_at: string
  userVote: string | null
}

interface FeedBoardProps {
  nickname: string
  password: string
  onPostClick?: (postId: number) => void
}

// ── 유틸 ──
const NICK_COLORS = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#E67E22', '#9B59B6', '#1ABC9C']
function nickColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return NICK_COLORS[Math.abs(h) % NICK_COLORS.length]
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '방금 전'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${mon}개월 전`
  return `${Math.floor(mon / 12)}년 전`
}

function extractYoutubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

// ── 메인 컴포넌트 ──
const FeedBoard: React.FC<FeedBoardProps> = ({ nickname, password, onPostClick }) => {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // 게시물 작성 모달
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newMedia, setNewMedia] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 신고 모달
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportPostId, setReportPostId] = useState<number | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  // 신고된 게시물 콘텐츠 표시 상태
  const [showReportedContent, setShowReportedContent] = useState<Record<number, boolean>>({})

  // 슬라이드 인덱스
  const [currentSlideIndex, setCurrentSlideIndex] = useState<Record<number, number>>({})

  // 정렬
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest')

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // ── 게시글 로드 ──
  const loadPosts = useCallback(async (pageNum: number) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '20',
        sortBy,
      })
      const headers: Record<string, string> = {}
      if (nickname) headers['X-Author-Name'] = nickname

      const res = await fetch(`/api/feed/posts?${params}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setPosts((prev) => (pageNum === 1 ? data.posts : [...prev, ...data.posts]))
        setHasMore(data.hasMore)
        setPage(pageNum)
      }
    } catch (err) {
      console.error('피드 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sortBy, nickname])

  // 초기 로드
  useEffect(() => {
    setPosts([])
    setPage(1)
    setHasMore(true)
    loadPosts(1)
  }, [sortBy])

  // 무한 스크롤
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadPosts(page + 1)
        }
      },
      { threshold: 0.1 }
    )
    observerRef.current.observe(loadMoreRef.current)
    return () => { observerRef.current?.disconnect() }
  }, [hasMore, isLoading, page, loadPosts])

  // ── 투표 ──
  const handleVote = async (postId: number, voteType: 'upvote' | 'downvote') => {
    if (!nickname) return
    try {
      const res = await fetch(`/api/feed/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Name': nickname,
        },
        body: JSON.stringify({ voteType }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  upvotes: updated.upvotes,
                  downvotes: updated.downvotes,
                  userVote: p.userVote === voteType ? null : voteType,
                }
              : p
          )
        )
      }
    } catch (err) {
      console.error('투표 실패:', err)
    }
  }

  // ── 공유 ──
  const handleShare = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/chat?feed=${postId}`
    navigator.clipboard.writeText(url).then(() => alert('주소가 복사되었습니다!'))
  }

  // ── 신고 ──
  const handleReport = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setReportPostId(postId)
    setReportReason('')
    setShowReportModal(true)
  }

  const submitReport = async () => {
    if (!nickname || !reportReason.trim() || !reportPostId) return
    setIsReporting(true)
    try {
      const res = await fetch(`/api/feed/posts/${reportPostId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Name': nickname,
        },
        body: JSON.stringify({ reason: reportReason.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setPosts((prev) =>
          prev.map((p) =>
            p.id === reportPostId ? { ...p, report_count: data.reportCount } : p
          )
        )
        setShowReportModal(false)
      } else {
        const err = await res.json()
        alert(err.error || '신고에 실패했습니다.')
      }
    } catch {
      alert('신고에 실패했습니다.')
    } finally {
      setIsReporting(false)
    }
  }

  // ── 미디어 선택 ──
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (files.length > 10) { alert('최대 10개의 파일만 업로드할 수 있습니다.'); return }
    const over = files.filter((f) => f.size > 50 * 1024 * 1024)
    if (over.length > 0) { alert('각 파일 크기는 50MB를 초과할 수 없습니다.'); return }

    setNewMedia(files)
    const previews: string[] = []
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        previews.push(reader.result as string)
        if (previews.length === files.length) setMediaPreviews([...previews])
      }
      reader.readAsDataURL(file)
    })
  }

  // ── 게시글 작성 ──
  const handleCreatePost = async () => {
    if (!newTitle.trim()) { alert('제목을 입력해주세요.'); return }
    if (!nickname || !password) { alert('닉네임과 비밀번호를 설정해주세요.'); return }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', newTitle)
      formData.append('content', newContent)
      if (newYoutubeUrl.trim()) {
        formData.append('youtubeUrl', newYoutubeUrl)
        formData.append('mediaType', 'youtube')
      }
      if (newMedia.length > 0) {
        newMedia.forEach((file) => formData.append('media', file))
        const hasVideo = newMedia.some((f) => f.type.startsWith('video'))
        formData.append('mediaType', hasVideo ? 'video' : 'image')
      }

      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: {
          'X-Author-Name': nickname,
          'X-Author-Password': password,
        },
        body: formData,
      })

      if (res.ok) {
        setShowCreateModal(false)
        setNewTitle('')
        setNewContent('')
        setNewMedia([])
        setMediaPreviews([])
        setNewYoutubeUrl('')
        setPosts([])
        setPage(1)
        loadPosts(1)
      } else {
        const err = await res.json()
        alert(err.error || '작성에 실패했습니다.')
      }
    } catch {
      alert('게시물 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScore = (up: number, down: number) => up - down

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#030303]">
      {/* 정렬 탭 */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 shrink-0">
        {(['latest', 'popular', 'trending'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sortBy === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'latest' ? '최신순' : s === 'popular' ? '인기순' : '트렌딩'}
          </button>
        ))}
      </div>

      {/* 게시물 목록 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-2">
          {posts.map((post) => {
            const isReported = (post.report_count || 0) >= 10
            const isVisible = showReportedContent[post.id] || false

            // 이미지 URL 배열
            const imageUrls =
              post.media_urls && post.media_urls.length > 0
                ? post.media_urls
                : post.media_url && post.media_type === 'image'
                  ? [post.media_url]
                  : []
            const hasMultiple = imageUrls.length > 1

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-[#0B0B0B] border-b border-gray-200 dark:border-[#1A1A1B] hover:bg-gray-50 dark:hover:bg-[#0F0F0F] transition-colors cursor-pointer relative"
                onClick={() => (!isReported || isVisible) && onPostClick?.(post.id)}
              >
                {/* 신고된 게시물 오버레이 */}
                {isReported && !isVisible && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
                    <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-1">신고된 게시물</h3>
                    <p className="text-gray-300 text-sm text-center mb-3">
                      {post.report_count}건의 신고로 가려졌습니다.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowReportedContent((prev) => ({ ...prev, [post.id]: true }))
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      콘텐츠 보기
                    </button>
                  </div>
                )}

                {/* 헤더 */}
                <div className={`p-3 ${isReported && !isVisible ? 'blur-sm pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: nickColor(post.author_name) }}
                    >
                      {post.author_name[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        r/{post.author_name || '익명'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-600">•</span>
                      <span className="text-xs text-gray-500">{timeAgo(post.created_at)}</span>
                    </div>
                    <button
                      onClick={(e) => handleReport(post.id, e)}
                      className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                    {post.title}
                  </h3>

                  {/* 내용 */}
                  {post.content && (
                    <p className="text-gray-700 dark:text-gray-400 text-sm mb-2 line-clamp-3">
                      {post.content}
                    </p>
                  )}
                </div>

                {/* 이미지 미디어 */}
                {imageUrls.length > 0 && (
                  <div className="px-3 mb-3" onClick={(e) => e.stopPropagation()}>
                    {hasMultiple ? (
                      <div className="relative group bg-black/60 rounded-xl overflow-hidden">
                        <div
                          id={`feed-slider-${post.id}`}
                          className="overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory scroll-smooth"
                          onScroll={(e) => {
                            const slider = e.currentTarget
                            const idx = Math.round(slider.scrollLeft / slider.offsetWidth)
                            setCurrentSlideIndex((prev) => ({ ...prev, [post.id]: idx }))
                          }}
                        >
                          <div className="flex h-[360px]">
                            {imageUrls.map((url, idx) => (
                              <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative">
                                <div
                                  className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 pointer-events-none"
                                  style={{ backgroundImage: `url(${url})` }}
                                />
                                <img
                                  src={url}
                                  alt={`${post.title} - ${idx + 1}`}
                                  loading="lazy"
                                  className="relative w-full h-full object-contain z-10"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* 화살표 */}
                        <button
                          onClick={() => {
                            const el = document.getElementById(`feed-slider-${post.id}`)
                            el?.scrollBy({ left: -(el.offsetWidth), behavior: 'smooth' })
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const el = document.getElementById(`feed-slider-${post.id}`)
                            el?.scrollBy({ left: el.offsetWidth, behavior: 'smooth' })
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {/* 인디케이터 */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                          {imageUrls.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const el = document.getElementById(`feed-slider-${post.id}`)
                                el?.scrollTo({ left: el.offsetWidth * idx, behavior: 'smooth' })
                              }}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${
                                (currentSlideIndex[post.id] || 0) === idx
                                  ? 'bg-white w-4'
                                  : 'bg-white/50 hover:bg-white/80'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative bg-black/60 rounded-xl overflow-hidden h-[360px]">
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 pointer-events-none"
                          style={{ backgroundImage: `url(${imageUrls[0]})` }}
                        />
                        <img
                          src={imageUrls[0]}
                          alt={post.title}
                          loading="lazy"
                          className="relative w-full h-full object-contain z-10"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 비디오 미디어 */}
                {post.media_url && post.media_type === 'video' && (
                  <div className="px-3 mb-3" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-black/90 rounded-xl overflow-hidden">
                      <video
                        src={post.media_url}
                        className="w-full max-h-[400px] object-contain"
                        controls
                        loop
                        muted
                        playsInline
                      />
                    </div>
                  </div>
                )}

                {/* 유튜브 임베드 */}
                {post.youtube_url && extractYoutubeId(post.youtube_url) && (
                  <div className="px-3 mb-3" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-black/90 rounded-xl overflow-hidden aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${extractYoutubeId(post.youtube_url)}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="px-2 py-1.5 flex items-center gap-1 text-xs">
                  {/* 투표 */}
                  <div
                    className={`flex items-center gap-0.5 rounded-full px-2 py-1 ${
                      post.userVote === 'upvote'
                        ? 'bg-orange-500/10 text-orange-500'
                        : post.userVote === 'downvote'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <button
                      className="p-1 hover:bg-transparent"
                      onClick={(e) => { e.stopPropagation(); handleVote(post.id, 'upvote') }}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold min-w-[20px] text-center">
                      {getScore(post.upvotes, post.downvotes)}
                    </span>
                    <button
                      className="p-1 hover:bg-transparent"
                      onClick={(e) => { e.stopPropagation(); handleVote(post.id, 'downvote') }}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 댓글 */}
                  <button
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={(e) => { e.stopPropagation(); onPostClick?.(post.id) }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.comment_count}</span>
                  </button>

                  {/* 공유 */}
                  <button
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={(e) => handleShare(post.id, e)}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>공유</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* 로딩 */}
          {isLoading && (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
            </div>
          )}

          {/* 무한 스크롤 트리거 */}
          {hasMore && <div ref={loadMoreRef} className="h-10" />}

          {/* 더 이상 없음 */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              모든 게시물을 불러왔습니다.
            </div>
          )}

          {/* 비어 있음 */}
          {!isLoading && posts.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">아직 게시물이 없습니다.</p>
              <p className="text-sm text-gray-500 mt-1">첫 번째 게시물을 작성해보세요!</p>
            </div>
          )}
        </div>
      </div>

      {/* 플로팅 작성 버튼 */}
      {nickname && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full shadow-2xl bg-gradient-to-br from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 flex items-center justify-center z-30 border-2 border-black"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      )}

      {/* ── 게시물 작성 모달 ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-white dark:bg-[#0B0B0B] border border-gray-200 dark:border-[#1A1A1B] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">새 게시물 작성</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">제목 *</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="게시물 제목을 입력하세요"
                  maxLength={200}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-[#1A1A1B] border border-gray-300 dark:border-[#272729] text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">내용</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="게시물 내용을 입력하세요 (선택사항)"
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-[#1A1A1B] border border-gray-300 dark:border-[#272729] text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* 유튜브 URL */}
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 block flex items-center gap-1">
                  <Youtube className="w-4 h-4 text-red-500" />
                  유튜브 링크 (선택)
                </label>
                <input
                  value={newYoutubeUrl}
                  onChange={(e) => setNewYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-[#1A1A1B] border border-gray-300 dark:border-[#272729] text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 미디어 업로드 */}
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                  이미지 / 동영상 (최대 10개, 각 50MB)
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
                  onClick={() => document.getElementById('feed-media-input')?.click()}
                >
                  <Image className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">클릭하여 파일 선택</p>
                </div>
                <input
                  id="feed-media-input"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />

                {newMedia.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    {newMedia.length}개 파일 선택됨
                  </div>
                )}

                {mediaPreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {mediaPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        {newMedia[idx]?.type.startsWith('video') ? (
                          <video src={preview} className="w-full h-32 object-cover rounded-lg" controls />
                        ) : (
                          <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <span className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {idx + 1}/{mediaPreviews.length}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => { setNewMedia([]); setMediaPreviews([]) }}
                      className="col-span-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                    >
                      모든 파일 제거
                    </button>
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={isSubmitting || !newTitle.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 text-sm font-medium"
                >
                  {isSubmitting ? '작성 중...' : '게시'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 신고 모달 ── */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div
            className="bg-white dark:bg-[#0B0B0B] border border-gray-200 dark:border-[#1A1A1B] rounded-xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">게시물 신고</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                10건 이상 신고 시 자동으로 가려집니다.
              </p>
            </div>
            <div className="px-6 py-3 space-y-2">
              {['스팸 또는 광고', '혐오 발언 또는 차별', '괴롭힘', '성적인 콘텐츠', '기타'].map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    reportReason === r
                      ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="신고 사유를 직접 입력..."
                className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-[#1A1A1B] border border-gray-300 dark:border-[#272729] text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                rows={3}
              />
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                disabled={isReporting}
                className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
              >
                취소
              </button>
              <button
                onClick={submitReport}
                disabled={isReporting || !reportReason.trim()}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 text-sm font-medium"
              >
                {isReporting ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedBoard

