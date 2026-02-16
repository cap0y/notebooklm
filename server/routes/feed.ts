import express, { Request, Response } from 'express'
import { query } from '../db'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

// 피드 이미지 저장 디렉토리
const feedUploadDir = path.join(__dirname, '..', '..', 'uploads', 'feed')
if (!fs.existsSync(feedUploadDir)) {
  fs.mkdirSync(feedUploadDir, { recursive: true })
}

/**
 * base64 데이터를 파일로 저장하고 URL을 반환
 * - 이미 URL(http//)이면 그대로 반환 (기존 이미지 유지)
 * - data:image/... 형식이면 파일로 저장
 */
function saveBase64ToFile(base64: string): string {
  // 이미 파일 URL이면 그대로 반환
  if (base64.startsWith('/api/files/') || base64.startsWith('http')) {
    return base64
  }

  // base64 파싱
  const match = base64.match(/^data:image\/([\w+]+);base64,(.+)$/)
  if (!match) throw new Error('올바른 이미지 형식이 아닙니다.')

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1].replace('+xml', '')
  const buffer = Buffer.from(match[2], 'base64')
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`
  const filePath = path.join(feedUploadDir, filename)
  fs.writeFileSync(filePath, buffer)

  return `/api/files/feed/${filename}`
}

// 한글 등 비-ASCII 문자를 헤더에서 안전하게 처리하기 위한 미들웨어
router.use((req, _res, next) => {
  try {
    if (req.headers['x-author-name']) {
      req.headers['x-author-name'] = decodeURIComponent(req.headers['x-author-name'] as string)
    }
    if (req.headers['x-author-password']) {
      req.headers['x-author-password'] = decodeURIComponent(req.headers['x-author-password'] as string)
    }
  } catch { /* 디코딩 실패 시 원본 유지 */ }
  next()
})

// ========== 피드 게시글 API ==========

// 피드 게시글 목록 조회
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, sortBy = 'latest' } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const authorName = req.headers['x-author-name'] as string

    let orderBy = 'created_at DESC'
    if (sortBy === 'popular') orderBy = '(upvotes - downvotes) DESC, created_at DESC'
    if (sortBy === 'trending') orderBy = '(upvotes - downvotes + comment_count * 2) DESC'

    const posts = await query(
      `SELECT id, author_name, title, content,
              media_type, media_url, media_urls, thumbnail_url, youtube_url,
              upvotes, downvotes, comment_count, view_count, report_count,
              created_at, updated_at
       FROM feed_posts
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [Number(limit), offset]
    )

    // 현재 유저의 투표 상태 가져오기
    let postsWithVotes = posts
    if (authorName && posts.length > 0) {
      const postIds = posts.map((p: any) => p.id)
      const placeholders = postIds.map((_: any, i: number) => `$${i + 1}`).join(',')
      const votes = await query(
        `SELECT post_id, vote_type FROM feed_votes
         WHERE post_id IN (${placeholders}) AND author_name = $${postIds.length + 1}`,
        [...postIds, authorName]
      )
      const voteMap: Record<number, string> = {}
      votes.forEach((v: any) => { voteMap[v.post_id] = v.vote_type })

      postsWithVotes = posts.map((p: any) => ({
        ...p,
        userVote: voteMap[p.id] || null,
      }))
    } else {
      postsWithVotes = posts.map((p: any) => ({ ...p, userVote: null }))
    }

    // 리액션 데이터 가져오기
    if (postsWithVotes.length > 0) {
      const postIds = postsWithVotes.map((p: any) => p.id)
      const placeholders = postIds.map((_: any, i: number) => `$${i + 1}`).join(',')

      const reactionsQuery = authorName
        ? `SELECT post_id, emoji, COUNT(*)::int as count,
                  BOOL_OR(author_name = $${postIds.length + 1}) as user_reacted
           FROM feed_reactions
           WHERE post_id IN (${placeholders})
           GROUP BY post_id, emoji
           ORDER BY count DESC`
        : `SELECT post_id, emoji, COUNT(*)::int as count, false as user_reacted
           FROM feed_reactions
           WHERE post_id IN (${placeholders})
           GROUP BY post_id, emoji
           ORDER BY count DESC`

      const reactionsParams = authorName ? [...postIds, authorName] : postIds
      const reactions = await query(reactionsQuery, reactionsParams)

      const reactionMap: Record<number, Array<{ emoji: string; count: number; userReacted: boolean }>> = {}
      reactions.forEach((r: any) => {
        if (!reactionMap[r.post_id]) reactionMap[r.post_id] = []
        reactionMap[r.post_id].push({ emoji: r.emoji, count: r.count, userReacted: r.user_reacted })
      })

      postsWithVotes = postsWithVotes.map((p: any) => ({
        ...p,
        reactions: reactionMap[p.id] || [],
      }))
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM feed_posts`)
    const total = parseInt(countResult[0].total)

    res.json({
      posts: postsWithVotes,
      hasMore: offset + Number(limit) < total,
    })
  } catch (error) {
    console.error('❌ 피드 게시글 목록 조회 오류:', error)
    res.status(500).json({ error: '게시글 목록을 불러올 수 없습니다.' })
  }
})

// 피드 게시글 상세 조회
router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' })
    }

    const posts = await query(
      `SELECT id, author_name, title, content,
              media_type, media_url, media_urls, thumbnail_url, youtube_url,
              upvotes, downvotes, comment_count, view_count, report_count,
              created_at, updated_at
       FROM feed_posts WHERE id = $1`,
      [postId]
    )
    if (posts.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    }

    // 조회수 증가
    await query(`UPDATE feed_posts SET view_count = view_count + 1 WHERE id = $1`, [postId])

    const post = posts[0]
    post.view_count += 1

    // 투표 상태
    const authorName = req.headers['x-author-name'] as string
    if (authorName) {
      const votes = await query(
        `SELECT vote_type FROM feed_votes WHERE post_id = $1 AND author_name = $2`,
        [postId, authorName]
      )
      post.userVote = votes.length > 0 ? votes[0].vote_type : null
    } else {
      post.userVote = null
    }

    res.json(post)
  } catch (error) {
    console.error('❌ 피드 게시글 상세 조회 오류:', error)
    res.status(500).json({ error: '게시글을 불러올 수 없습니다.' })
  }
})

// 피드 게시글 생성
router.post('/posts', async (req: Request, res: Response) => {
  try {
    const { title, content, youtubeUrl, mediaType: clientMediaType, mediaBase64 } = req.body
    const authorName = req.headers['x-author-name'] as string
    const authorPassword = req.headers['x-author-password'] as string

    if (!authorName?.trim() || !authorPassword?.trim()) {
      return res.status(400).json({ error: '닉네임과 비밀번호를 설정해주세요.' })
    }
    if (!title?.trim()) {
      return res.status(400).json({ error: '제목을 입력해주세요.' })
    }

    let mediaType = clientMediaType || null
    let mediaUrl: string | null = null
    let mediaUrls: string[] | null = null

    // 이미지 처리: base64 → 파일 저장 (개당 10MB 이하)
    const MAX_BASE64_SIZE = 10 * 1024 * 1024 * 1.37
    if (Array.isArray(mediaBase64) && mediaBase64.length > 0) {
      const oversized = mediaBase64.some((b: string) => b.length > MAX_BASE64_SIZE)
      if (oversized) {
        return res.status(400).json({ error: '각 이미지는 10MB를 초과할 수 없습니다.' })
      }
      const nonImage = mediaBase64.some((b: string) => !b.startsWith('data:image') && !b.startsWith('/api/files/'))
      if (nonImage) {
        return res.status(400).json({ error: '이미지 파일만 첨부할 수 있습니다.' })
      }

      // base64를 파일로 변환
      const savedUrls = mediaBase64.map((b: string) => saveBase64ToFile(b))

      if (savedUrls.length === 1) {
        mediaUrl = savedUrls[0]
        if (!mediaType) mediaType = 'image'
      } else {
        mediaUrls = savedUrls
        if (!mediaType) mediaType = 'image'
      }
    }

    if (youtubeUrl?.trim()) {
      mediaType = 'youtube'
    }

    const result = await query(
      `INSERT INTO feed_posts (author_name, password, title, content, media_type, media_url, media_urls, youtube_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, author_name, title, content, media_type, media_url, media_urls, youtube_url,
                 upvotes, downvotes, comment_count, view_count, report_count, created_at`,
      [
        authorName.trim(),
        authorPassword,
        title.trim(),
        content?.trim() || null,
        mediaType,
        mediaUrl,
        mediaUrls,
        youtubeUrl?.trim() || null,
      ]
    )

    res.status(201).json(result[0])
  } catch (error) {
    console.error('❌ 피드 게시글 생성 오류:', error)
    res.status(500).json({ error: '게시글을 생성할 수 없습니다.' })
  }
})

// 피드 게시글 수정
router.put('/posts/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const { title, content, youtubeUrl, mediaType: clientMediaType, mediaBase64 } = req.body
    const authorPassword = req.headers['x-author-password'] as string

    if (!authorPassword) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' })
    }

    const posts = await query(`SELECT password FROM feed_posts WHERE id = $1`, [postId])
    if (posts.length === 0) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    if (posts[0].password !== authorPassword) return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })

    let updateFields = `title = $1, content = $2, youtube_url = $3, updated_at = CURRENT_TIMESTAMP`
    const params: any[] = [title?.trim(), content?.trim() || null, youtubeUrl?.trim() || null]

    // 이미지 처리: base64 → 파일 저장, 기존 URL은 유지
    const MAX_BASE64_SIZE = 10 * 1024 * 1024 * 1.37
    if (Array.isArray(mediaBase64)) {
      if (mediaBase64.length === 0) {
        updateFields += `, media_url = NULL, media_urls = NULL, media_type = NULL`
      } else {
        const oversized = mediaBase64.some((b: string) => b.length > MAX_BASE64_SIZE)
        if (oversized) {
          return res.status(400).json({ error: '각 이미지는 10MB를 초과할 수 없습니다.' })
        }
        const nonImage = mediaBase64.some((b: string) =>
          !b.startsWith('data:image') && !b.startsWith('/api/files/')
        )
        if (nonImage) {
          return res.status(400).json({ error: '이미지 파일만 첨부할 수 있습니다.' })
        }

        // base64를 파일로 변환 (기존 URL은 그대로 유지)
        const savedUrls = mediaBase64.map((b: string) => saveBase64ToFile(b))

        if (savedUrls.length === 1) {
          params.push(savedUrls[0])
          params.push('image')
          updateFields += `, media_url = $${params.length - 1}, media_type = $${params.length}, media_urls = NULL`
        } else {
          params.push(savedUrls)
          params.push('image')
          updateFields += `, media_urls = $${params.length - 1}, media_type = $${params.length}, media_url = NULL`
        }
      }
    }

    params.push(postId)
    const result = await query(
      `UPDATE feed_posts SET ${updateFields} WHERE id = $${params.length}
       RETURNING id, author_name, title, content, media_type, media_url, media_urls, youtube_url,
                 upvotes, downvotes, comment_count, view_count, created_at, updated_at`,
      params
    )

    res.json(result[0])
  } catch (error) {
    console.error('❌ 피드 게시글 수정 오류:', error)
    res.status(500).json({ error: '게시글을 수정할 수 없습니다.' })
  }
})

// 피드 게시글 삭제
router.delete('/posts/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const authorPassword = req.headers['x-author-password'] as string

    if (!authorPassword) return res.status(400).json({ error: '비밀번호를 입력해주세요.' })

    const posts = await query(`SELECT password FROM feed_posts WHERE id = $1`, [postId])
    if (posts.length === 0) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    if (posts[0].password !== authorPassword) return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })

    await query(`DELETE FROM feed_posts WHERE id = $1`, [postId])
    res.json({ success: true })
  } catch (error) {
    console.error('❌ 피드 게시글 삭제 오류:', error)
    res.status(500).json({ error: '게시글을 삭제할 수 없습니다.' })
  }
})

// ========== 투표 API ==========

router.post('/posts/:id/vote', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const { voteType } = req.body // 'upvote' | 'downvote'
    const authorName = req.headers['x-author-name'] as string

    if (!authorName) return res.status(400).json({ error: '닉네임이 필요합니다.' })
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: '올바른 투표 유형이 아닙니다.' })
    }

    // 기존 투표 확인
    const existing = await query(
      `SELECT id, vote_type FROM feed_votes WHERE post_id = $1 AND author_name = $2`,
      [postId, authorName]
    )

    if (existing.length > 0) {
      if (existing[0].vote_type === voteType) {
        // 같은 투표 → 취소
        await query(`DELETE FROM feed_votes WHERE id = $1`, [existing[0].id])
        const col = voteType === 'upvote' ? 'upvotes' : 'downvotes'
        await query(`UPDATE feed_posts SET ${col} = ${col} - 1 WHERE id = $1`, [postId])
      } else {
        // 다른 투표 → 변경
        await query(`UPDATE feed_votes SET vote_type = $1 WHERE id = $2`, [voteType, existing[0].id])
        const oldCol = existing[0].vote_type === 'upvote' ? 'upvotes' : 'downvotes'
        const newCol = voteType === 'upvote' ? 'upvotes' : 'downvotes'
        await query(
          `UPDATE feed_posts SET ${oldCol} = ${oldCol} - 1, ${newCol} = ${newCol} + 1 WHERE id = $1`,
          [postId]
        )
      }
    } else {
      // 새 투표
      await query(
        `INSERT INTO feed_votes (post_id, author_name, vote_type) VALUES ($1, $2, $3)`,
        [postId, authorName, voteType]
      )
      const col = voteType === 'upvote' ? 'upvotes' : 'downvotes'
      await query(`UPDATE feed_posts SET ${col} = ${col} + 1 WHERE id = $1`, [postId])
    }

    // 업데이트된 게시글 반환
    const updated = await query(
      `SELECT upvotes, downvotes FROM feed_posts WHERE id = $1`,
      [postId]
    )
    res.json(updated[0])
  } catch (error) {
    console.error('❌ 투표 오류:', error)
    res.status(500).json({ error: '투표에 실패했습니다.' })
  }
})

// ========== 댓글 API ==========

// 댓글 목록 조회
router.get('/posts/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const authorName = req.headers['x-author-name'] as string

    const comments = await query(
      `SELECT id, post_id, parent_id, author_name, content, upvotes, downvotes, created_at
       FROM feed_comments
       WHERE post_id = $1
       ORDER BY created_at ASC`,
      [postId]
    )

    // 현재 유저의 댓글 투표 상태
    let commentsWithVotes = comments
    if (authorName && comments.length > 0) {
      const commentIds = comments.map((c: any) => c.id)
      const placeholders = commentIds.map((_: any, i: number) => `$${i + 1}`).join(',')
      const votes = await query(
        `SELECT comment_id, vote_type FROM feed_comment_votes
         WHERE comment_id IN (${placeholders}) AND author_name = $${commentIds.length + 1}`,
        [...commentIds, authorName]
      )
      const voteMap: Record<number, string> = {}
      votes.forEach((v: any) => { voteMap[v.comment_id] = v.vote_type })

      commentsWithVotes = comments.map((c: any) => ({
        ...c,
        userVote: voteMap[c.id] || null,
      }))
    } else {
      commentsWithVotes = comments.map((c: any) => ({ ...c, userVote: null }))
    }

    res.json(commentsWithVotes)
  } catch (error) {
    console.error('❌ 피드 댓글 조회 오류:', error)
    res.status(500).json({ error: '댓글을 불러올 수 없습니다.' })
  }
})

// 댓글 생성
router.post('/posts/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const { content, parentId } = req.body
    const authorName = req.headers['x-author-name'] as string
    const authorPassword = req.headers['x-author-password'] as string

    if (!authorName?.trim() || !authorPassword?.trim()) {
      return res.status(400).json({ error: '닉네임과 비밀번호가 필요합니다.' })
    }
    if (!content?.trim()) {
      return res.status(400).json({ error: '내용을 입력해주세요.' })
    }

    const result = await query(
      `INSERT INTO feed_comments (post_id, parent_id, author_name, password, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, post_id, parent_id, author_name, content, upvotes, downvotes, created_at`,
      [postId, parentId || null, authorName.trim(), authorPassword, content.trim()]
    )

    res.status(201).json({ ...result[0], userVote: null })
  } catch (error) {
    console.error('❌ 피드 댓글 생성 오류:', error)
    res.status(500).json({ error: '댓글을 생성할 수 없습니다.' })
  }
})

// 댓글 삭제 (nested path)
router.delete('/posts/:id/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10)
    const authorPassword = req.headers['x-author-password'] as string

    if (!authorPassword) return res.status(400).json({ error: '비밀번호를 입력해주세요.' })

    const comments = await query(`SELECT password FROM feed_comments WHERE id = $1`, [commentId])
    if (comments.length === 0) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' })
    if (comments[0].password !== authorPassword) return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })

    await query(`DELETE FROM feed_comments WHERE id = $1`, [commentId])
    res.json({ success: true })
  } catch (error) {
    console.error('❌ 피드 댓글 삭제 오류:', error)
    res.status(500).json({ error: '댓글을 삭제할 수 없습니다.' })
  }
})

// 댓글 투표 (nested path)
router.post('/posts/:id/comments/:commentId/vote', async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10)
    const { voteType } = req.body
    const authorName = req.headers['x-author-name'] as string

    if (!authorName) return res.status(400).json({ error: '닉네임이 필요합니다.' })

    const existing = await query(
      `SELECT id, vote_type FROM feed_comment_votes WHERE comment_id = $1 AND author_name = $2`,
      [commentId, authorName]
    )

    if (existing.length > 0) {
      if (existing[0].vote_type === voteType) {
        await query(`DELETE FROM feed_comment_votes WHERE id = $1`, [existing[0].id])
        const col = voteType === 'upvote' ? 'upvotes' : 'downvotes'
        await query(`UPDATE feed_comments SET ${col} = ${col} - 1 WHERE id = $1`, [commentId])
      } else {
        await query(`UPDATE feed_comment_votes SET vote_type = $1 WHERE id = $2`, [voteType, existing[0].id])
        const oldCol = existing[0].vote_type === 'upvote' ? 'upvotes' : 'downvotes'
        const newCol = voteType === 'upvote' ? 'upvotes' : 'downvotes'
        await query(
          `UPDATE feed_comments SET ${oldCol} = ${oldCol} - 1, ${newCol} = ${newCol} + 1 WHERE id = $1`,
          [commentId]
        )
      }
    } else {
      await query(
        `INSERT INTO feed_comment_votes (comment_id, author_name, vote_type) VALUES ($1, $2, $3)`,
        [commentId, authorName, voteType]
      )
      const col = voteType === 'upvote' ? 'upvotes' : 'downvotes'
      await query(`UPDATE feed_comments SET ${col} = ${col} + 1 WHERE id = $1`, [commentId])
    }

    const updated = await query(
      `SELECT upvotes, downvotes FROM feed_comments WHERE id = $1`,
      [commentId]
    )
    res.json(updated[0])
  } catch (error) {
    console.error('❌ 댓글 투표 오류:', error)
    res.status(500).json({ error: '투표에 실패했습니다.' })
  }
})

// ========== 이모지 리액션 API ==========

// 리액션 토글 (추가/제거)
router.post('/posts/:id/reactions', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const { emoji } = req.body
    const authorName = req.headers['x-author-name'] as string

    if (!authorName) return res.status(400).json({ error: '닉네임이 필요합니다.' })
    if (!emoji?.trim()) return res.status(400).json({ error: '이모지를 선택해주세요.' })

    // 기존 리액션 확인
    const existing = await query(
      `SELECT id FROM feed_reactions WHERE post_id = $1 AND author_name = $2 AND emoji = $3`,
      [postId, authorName, emoji]
    )

    if (existing.length > 0) {
      // 이미 있으면 제거 (토글)
      await query(`DELETE FROM feed_reactions WHERE id = $1`, [existing[0].id])
    } else {
      // 없으면 추가
      await query(
        `INSERT INTO feed_reactions (post_id, author_name, emoji) VALUES ($1, $2, $3)`,
        [postId, authorName, emoji]
      )
    }

    // 해당 게시글의 모든 리액션 그룹별 반환
    const reactions = await query(
      `SELECT emoji, COUNT(*)::int as count,
              BOOL_OR(author_name = $2) as user_reacted
       FROM feed_reactions
       WHERE post_id = $1
       GROUP BY emoji
       ORDER BY count DESC`,
      [postId, authorName]
    )

    res.json({ reactions })
  } catch (error) {
    console.error('❌ 리액션 오류:', error)
    res.status(500).json({ error: '리액션에 실패했습니다.' })
  }
})

// ========== 신고 API ==========

router.post('/posts/:id/report', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    const { reason } = req.body
    const authorName = req.headers['x-author-name'] as string

    if (!authorName) return res.status(400).json({ error: '닉네임이 필요합니다.' })
    if (!reason?.trim()) return res.status(400).json({ error: '신고 사유를 입력해주세요.' })

    // 중복 신고 확인
    const existing = await query(
      `SELECT id FROM feed_reports WHERE post_id = $1 AND author_name = $2`,
      [postId, authorName]
    )
    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 신고한 게시글입니다.' })
    }

    await query(
      `INSERT INTO feed_reports (post_id, author_name, reason) VALUES ($1, $2, $3)`,
      [postId, authorName, reason.trim()]
    )
    await query(`UPDATE feed_posts SET report_count = report_count + 1 WHERE id = $1`, [postId])

    const updated = await query(`SELECT report_count FROM feed_posts WHERE id = $1`, [postId])
    res.json({ message: '신고가 접수되었습니다.', reportCount: updated[0].report_count })
  } catch (error) {
    console.error('❌ 신고 오류:', error)
    res.status(500).json({ error: '신고에 실패했습니다.' })
  }
})

export default router

