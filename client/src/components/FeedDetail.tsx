import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, ArrowUp, ArrowDown, MessageSquare, Share2, Flag,
  ChevronLeft, ChevronRight, Loader2, Eye, AlertTriangle,
  Send, Trash2, X, Youtube,
} from 'lucide-react'

// ── 타입 ──
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

interface FeedComment {
  id: number
  post_id: number
  author_name: string
  parent_id: number | null
  content: string
  upvotes: number
  downvotes: number
  created_at: string
  userVote: string | null
}

interface FeedDetailProps {
  postId: number
  nickname: string
  password: string
  onBack: () => void
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

const FeedDetail: React.FC<FeedDetailProps> = ({ postId, nickname, password, onBack }) => {
  const [post, setPost] = useState<FeedPost | null>(null)
  const [comments, setComments] = useState<FeedComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [expandedCommentId, setExpandedCommentId] = useState<number | null>(null)
  const [collapsedComments, setCollapsedComments] = useState<Set<number>>(new Set())
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // 신고 상태
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [showReportedContent, setShowReportedContent] = useState(false)

  // 수정 모달
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('')

  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // ── 게시글 로드 ──
  const loadPost = async () => {
    try {
      const headers: Record<string, string> = {}
      if (nickname) headers['X-Author-Name'] = nickname
      const res = await fetch(`/api/feed/posts/${postId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setPost(data)
      }
    } catch (err) {
      console.error('게시글 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ── 댓글 로드 ──
  const loadComments = async () => {
    try {
      const headers: Record<string, string> = {}
      if (nickname) headers['X-Author-Name'] = nickname
      const res = await fetch(`/api/feed/posts/${postId}/comments`, { headers })
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (err) {
      console.error('댓글 로드 실패:', err)
    }
  }

  useEffect(() => {
    loadPost()
    loadComments()
  }, [postId])

  // ── 투표 ──
  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!nickname) return
    try {
      const res = await fetch(`/api/feed/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Author-Name': nickname },
        body: JSON.stringify({ voteType }),
      })
      if (res.ok) loadPost()
    } catch (err) {
      console.error('투표 실패:', err)
    }
  }

  // ── 댓글 투표 ──
  const handleCommentVote = async (commentId: number, voteType: 'upvote' | 'downvote') => {
    if (!nickname) return
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Author-Name': nickname },
        body: JSON.stringify({ voteType }),
      })
      if (res.ok) loadComments()
    } catch (err) {
      console.error('댓글 투표 실패:', err)
    }
  }

  // ── 댓글 작성 ──
  const handleSubmitComment = async () => {
    if (!nickname || !password || !newComment.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Name': nickname,
          'X-Author-Password': password,
        },
        body: JSON.stringify({ content: newComment.trim(), parentId: replyTo }),
      })
      if (res.ok) {
        setNewComment('')
        setReplyTo(null)
        setExpandedCommentId(null)
        loadComments()
        loadPost()
      } else {
        const err = await res.json()
        alert(err.error || '댓글 작성 실패')
      }
    } catch {
      alert('댓글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 댓글 삭제 ──
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'X-Author-Name': nickname, 'X-Author-Password': password },
      })
      if (res.ok) {
        loadComments()
        loadPost()
      }
    } catch (err) {
      console.error('댓글 삭제 실패:', err)
    }
  }

  // ── 신고 ──
  const submitReport = async () => {
    if (!nickname || !reportReason.trim()) return
    setIsReporting(true)
    try {
      const res = await fetch(`/api/feed/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Author-Name': nickname },
        body: JSON.stringify({ reason: reportReason.trim() }),
      })
      if (res.ok) {
        loadPost()
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

  // ── 공유 ──
  const handleShare = () => {
    const url = `${window.location.origin}/chat?feed=${postId}`
    navigator.clipboard.writeText(url).then(() => alert('주소가 복사되었습니다!'))
  }

  // ── 게시글 수정 ──
  const handleEditPost = async () => {
    if (!editTitle.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/feed/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Name': nickname,
          'X-Author-Password': password,
        },
        body: JSON.stringify({ title: editTitle, content: editContent, youtubeUrl: editYoutubeUrl }),
      })
      if (res.ok) {
        setShowEditModal(false)
        loadPost()
      } else {
        const err = await res.json()
        alert(err.error || '수정에 실패했습니다.')
      }
    } catch {
      alert('게시물 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 게시글 삭제 ──
  const handleDeletePost = async () => {
    if (!confirm('게시물을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/feed/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'X-Author-Name': nickname, 'X-Author-Password': password },
      })
      if (res.ok) onBack()
      else {
        const err = await res.json()
        alert(err.error || '삭제에 실패했습니다.')
      }
    } catch {
      alert('삭제에 실패했습니다.')
    }
  }

  const handleReply = (commentId: number, authorName: string) => {
    if (expandedCommentId === commentId) {
      setExpandedCommentId(null)
      setReplyTo(null)
      setNewComment('')
    } else {
      setExpandedCommentId(commentId)
      setReplyTo(commentId)
      setNewComment(`@${authorName} `)
      setTimeout(() => commentInputRef.current?.focus(), 100)
    }
  }

  const toggleCommentCollapse = (commentId: number) => {
    const newSet = new Set(collapsedComments)
    if (newSet.has(commentId)) newSet.delete(commentId)
    else newSet.add(commentId)
    setCollapsedComments(newSet)
  }

  const getScore = (u: number, d: number) => u - d

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-gray-400 mb-4">게시물을 찾을 수 없습니다.</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          돌아가기
        </button>
      </div>
    )
  }

  const isReported = (post.report_count || 0) >= 10
  const imageUrls =
    post.media_urls && post.media_urls.length > 0
      ? post.media_urls
      : post.media_url && post.media_type === 'image'
        ? [post.media_url]
        : []
  const hasMultipleImages = imageUrls.length > 1

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      {/* 헤더 */}
      <div className="px-3 py-2 border-b border-gray-800/50 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-900/60 text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: nickColor(post.author_name) }}
        >
          {post.author_name[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-gray-300">r/{post.author_name}</span>
        <span className="text-xs text-gray-500 ml-auto">
          <Eye className="w-3.5 h-3.5 inline mr-1" />{post.view_count}
        </span>
      </div>

      {/* 본문 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* 신고 오버레이 */}
          {isReported && !showReportedContent && (
            <div className="p-8 flex flex-col items-center">
              <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">신고된 게시물</h3>
              <p className="text-gray-500 text-sm mb-3">{post.report_count}건의 신고로 가려졌습니다.</p>
              <button
                onClick={() => setShowReportedContent(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
              >
                <Eye className="w-4 h-4" /> 콘텐츠 보기
              </button>
            </div>
          )}

          {(!isReported || showReportedContent) && (
            <>
              {/* 제목 & 내용 */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span>{timeAgo(post.created_at)}</span>
                  {post.author_name === nickname && (
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => {
                          setEditTitle(post.title)
                          setEditContent(post.content || '')
                          setEditYoutubeUrl(post.youtube_url || '')
                          setShowEditModal(true)
                        }}
                        className="px-2 py-0.5 text-xs bg-gray-800/60 text-gray-300 rounded hover:bg-gray-700/60"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDeletePost}
                        className="px-2 py-0.5 text-xs bg-red-900/30 text-red-400 rounded hover:bg-red-900/50"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-100 mb-2">{post.title}</h1>
                {post.content && (
                  <p className="text-gray-400 text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                )}
              </div>

              {/* 이미지 미디어 */}
              {imageUrls.length > 0 && (
                <div className="px-4 mb-3">
                  {hasMultipleImages ? (
                    <div className="relative group bg-black/60 rounded-xl overflow-hidden">
                      <div
                        id={`detail-slider-${post.id}`}
                        className="overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory scroll-smooth"
                        onScroll={(e) => {
                          const el = e.currentTarget
                          setCurrentSlideIndex(Math.round(el.scrollLeft / el.offsetWidth))
                        }}
                      >
                        <div className="flex h-[400px]">
                          {imageUrls.map((url, idx) => (
                            <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative">
                              <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 pointer-events-none" style={{ backgroundImage: `url(${url})` }} />
                              <img src={url} alt={`${idx + 1}`} loading="lazy" className="relative w-full h-full object-contain z-10" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const el = document.getElementById(`detail-slider-${post.id}`)
                          el?.scrollBy({ left: -(el.offsetWidth), behavior: 'smooth' })
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 z-20"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const el = document.getElementById(`detail-slider-${post.id}`)
                          el?.scrollBy({ left: el.offsetWidth, behavior: 'smooth' })
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 z-20"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                        {imageUrls.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const el = document.getElementById(`detail-slider-${post.id}`)
                              el?.scrollTo({ left: el.offsetWidth * idx, behavior: 'smooth' })
                            }}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlideIndex === idx ? 'bg-white w-4' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-black/60 rounded-xl overflow-hidden h-[400px]">
                      <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 pointer-events-none" style={{ backgroundImage: `url(${imageUrls[0]})` }} />
                      <img src={imageUrls[0]} alt={post.title} loading="lazy" className="relative w-full h-full object-contain z-10" />
                    </div>
                  )}
                </div>
              )}

              {/* 비디오 */}
              {post.media_url && post.media_type === 'video' && (
                <div className="px-4 mb-3">
                  <div className="bg-black/90 rounded-xl overflow-hidden">
                    <video src={post.media_url} className="w-full max-h-[400px] object-contain" controls loop muted playsInline />
                  </div>
                </div>
              )}

              {/* 유튜브 */}
              {post.youtube_url && extractYoutubeId(post.youtube_url) && (
                <div className="px-4 mb-3">
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
              <div className="px-3 py-1.5 flex items-center gap-1 text-xs border-b border-gray-800/50">
                <div className={`flex items-center gap-0.5 rounded-full px-2 py-1 ${
                  post.userVote === 'upvote' ? 'bg-orange-500/10 text-orange-500'
                    : post.userVote === 'downvote' ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-gray-800/60 text-gray-300'
                }`}>
                  <button className="p-1" onClick={() => handleVote('upvote')}><ArrowUp className="w-3.5 h-3.5" /></button>
                  <span className="font-bold min-w-[20px] text-center">{getScore(post.upvotes, post.downvotes)}</span>
                  <button className="p-1" onClick={() => handleVote('downvote')}><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <button
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/60 text-gray-300 hover:bg-gray-700/60"
                  onClick={handleShare}
                >
                  <Share2 className="w-3.5 h-3.5" /><span>공유</span>
                </button>
                <button
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/60 text-gray-300 hover:bg-red-600 hover:text-white"
                  onClick={() => { setReportReason(''); setShowReportModal(true) }}
                >
                  <Flag className="w-3.5 h-3.5" /><span>신고</span>
                </button>
              </div>

              {/* 댓글 입력 */}
              {nickname && (
                <div className="px-4 py-3 border-b border-gray-800/50">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 달아보세요"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-800/60 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setNewComment('')}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmitComment}
                      disabled={isSubmitting || !newComment.trim()}
                      className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40"
                    >
                      {isSubmitting ? '작성 중...' : '댓글'}
                    </button>
                  </div>
                </div>
              )}

              {/* 댓글 목록 */}
              <div>
                {comments
                  .filter((c) => !c.parent_id)
                  .map((comment) => {
                    const isCollapsed = collapsedComments.has(comment.id)
                    const replies = comments.filter((c) => c.parent_id === comment.id)

                    return (
                      <div key={comment.id}>
                        {/* 부모 댓글 */}
                        <div className="px-4 py-3 hover:bg-gray-900/40 transition-colors border-b border-gray-800/30">
                          <div className="flex gap-2">
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer"
                                style={{ backgroundColor: nickColor(comment.author_name) }}
                                onClick={() => toggleCommentCollapse(comment.id)}
                              >
                                {comment.author_name[0]?.toUpperCase() || '?'}
                              </div>
                              {replies.length > 0 && (
                                <button
                                  onClick={() => toggleCommentCollapse(comment.id)}
                                  className="text-[10px] font-bold text-gray-500 hover:text-gray-300"
                                >
                                  {isCollapsed ? '+' : '−'}
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs font-bold text-gray-300">{comment.author_name}</span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-500">{timeAgo(comment.created_at)}</span>
                                {isCollapsed && replies.length > 0 && (
                                  <span className="text-xs text-blue-400 ml-1">({replies.length}개 답글)</span>
                                )}
                              </div>
                              {!isCollapsed && (
                                <>
                                  <p className="text-gray-300 text-sm mb-2 leading-relaxed">{comment.content}</p>
                                  <div className="flex items-center gap-1">
                                    <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ${
                                      comment.userVote === 'upvote' ? 'bg-orange-500/10 text-orange-500'
                                        : comment.userVote === 'downvote' ? 'bg-blue-500/10 text-blue-500'
                                          : 'bg-gray-800/60 text-gray-300'
                                    }`}>
                                      <button className="p-0.5" onClick={() => handleCommentVote(comment.id, 'upvote')}>
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <span className="text-[11px] font-bold min-w-[16px] text-center">
                                        {comment.upvotes - comment.downvotes}
                                      </span>
                                      <button className="p-0.5" onClick={() => handleCommentVote(comment.id, 'downvote')}>
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <button
                                      className="text-[11px] font-bold text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded-full hover:bg-gray-800/60"
                                      onClick={() => handleReply(comment.id, comment.author_name)}
                                    >
                                      <MessageSquare className="w-3 h-3 inline mr-1" />답글
                                    </button>
                                    {comment.author_name === nickname && (
                                      <button
                                        className="text-gray-500 hover:text-red-500 p-0.5 ml-auto"
                                        onClick={() => handleDeleteComment(comment.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 답글 */}
                        {!isCollapsed && replies.map((reply) => (
                          <div key={reply.id} className="ml-8 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none">
                              <div className="absolute left-3 top-0 w-0.5 h-full bg-gray-700"></div>
                              <div className="absolute left-3 top-5 w-4 h-0.5 bg-gray-700"></div>
                            </div>
                            <div className="pl-10 pr-4 py-3 hover:bg-gray-900/40 border-b border-gray-800/30">
                              <div className="flex gap-2">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                  style={{ backgroundColor: nickColor(reply.author_name) }}
                                >
                                  {reply.author_name[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs font-bold text-gray-300">{reply.author_name}</span>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">{timeAgo(reply.created_at)}</span>
                                  </div>
                                  <p className="text-gray-300 text-sm mb-2 leading-relaxed">{reply.content}</p>
                                  <div className="flex items-center gap-1">
                                    <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ${
                                      reply.userVote === 'upvote' ? 'bg-orange-500/10 text-orange-500'
                                        : reply.userVote === 'downvote' ? 'bg-blue-500/10 text-blue-500'
                                          : 'bg-gray-800/60 text-gray-300'
                                    }`}>
                                      <button className="p-0.5" onClick={() => handleCommentVote(reply.id, 'upvote')}>
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <span className="text-[11px] font-bold min-w-[16px] text-center">
                                        {reply.upvotes - reply.downvotes}
                                      </span>
                                      <button className="p-0.5" onClick={() => handleCommentVote(reply.id, 'downvote')}>
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {reply.author_name === nickname && (
                                      <button className="text-gray-500 hover:text-red-500 p-0.5 ml-auto" onClick={() => handleDeleteComment(reply.id)}>
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* 답글 입력 아코디언 */}
                        {!isCollapsed && expandedCommentId === comment.id && nickname && (
                          <div className="ml-8 pl-10 pr-4 py-3 bg-gray-900/40 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none">
                              <div className="absolute left-3 top-0 w-0.5 h-full bg-blue-500"></div>
                              <div className="absolute left-3 top-5 w-4 h-0.5 bg-blue-500"></div>
                            </div>
                            <textarea
                              ref={commentInputRef}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="답글을 입력하세요..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800/60 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => { setExpandedCommentId(null); setReplyTo(null); setNewComment('') }}
                                className="px-3 py-1 text-xs text-gray-500"
                              >
                                취소
                              </button>
                              <button
                                onClick={handleSubmitComment}
                                disabled={isSubmitting || !newComment.trim()}
                                className="px-4 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40"
                              >
                                {isSubmitting ? '작성 중...' : '답글'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                {comments.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">댓글이 아직 없어요</p>
                    <p className="text-gray-600 text-xs mt-1">대화를 시작하려면 의견을 적어보세요</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 수정 모달 ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-gray-900 border border-gray-800/60 rounded-xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 border-b border-gray-800/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">게시물 수정</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="제목"
                className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800/60 text-white text-sm"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="내용"
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800/60 text-white text-sm resize-none"
              />
              <input
                value={editYoutubeUrl}
                onChange={(e) => setEditYoutubeUrl(e.target.value)}
                placeholder="유튜브 URL (선택)"
                className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800/60 text-white text-sm"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg bg-gray-800/60 text-gray-300 text-sm">취소</button>
                <button
                  onClick={handleEditPost}
                  disabled={isSubmitting || !editTitle.trim()}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 text-sm"
                >
                  {isSubmitting ? '수정 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 신고 모달 ── */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-gray-900 border border-gray-800/60 rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-lg font-bold text-white mb-1">게시물 신고</h3>
              <p className="text-gray-500 text-xs">10건 이상 신고 시 자동으로 가려집니다.</p>
            </div>
            <div className="px-6 py-3 space-y-2">
              {['스팸 또는 광고', '혐오 발언 또는 차별', '괴롭힘', '성적인 콘텐츠', '기타'].map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    reportReason === r ? 'bg-red-600/20 text-red-400 border border-red-600/30' : 'hover:bg-gray-800/60 text-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="신고 사유를 직접 입력..."
                className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800/60 text-white text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => setShowReportModal(false)} disabled={isReporting} className="flex-1 py-2 rounded-lg bg-gray-800/60 text-gray-300 text-sm">취소</button>
              <button onClick={submitReport} disabled={isReporting || !reportReason.trim()} className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 text-sm">
                {isReporting ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedDetail

