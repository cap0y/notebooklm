import express, { Request, Response } from 'express'
import { query } from '../db'

const router = express.Router()

// ========== 게시글 API ==========

// 게시글 목록 조회 (페이지네이션)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 15, search = '', includeComments = 'false' } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const shouldIncludeComments = includeComments === 'true'

    let whereClause = ''
    const params: any[] = []
    let paramIdx = 1

    if (search) {
      whereClause = `WHERE title ILIKE $${paramIdx} OR content ILIKE $${paramIdx + 1}`
      params.push(`%${search}%`, `%${search}%`)
      paramIdx += 2
    }

    // 게시글 목록 조회 (content는 처음 500자만, 피드용)
    const posts = await query(
      `SELECT id, author_name, title,
              LEFT(content, 500) as content,
              views, comments_count, created_at, updated_at
       FROM posts
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, Number(limit), offset]
    )

    // 댓글이 필요한 경우에만 가져오기
    let postsWithComments = posts
    if (shouldIncludeComments && posts.length > 0) {
      const postIds = posts.map((p: any) => p.id)
      // 댓글이 있는 게시글만 필터링 (comments_count > 0)
      const postsWithCommentCount = posts.filter((p: any) => p.comments_count > 0)
      const postIdsWithComments = postsWithCommentCount.map((p: any) => p.id)

      let comments: any[] = []
      if (postIdsWithComments.length > 0) {
        // 각 게시글당 최신 댓글 5개만 가져오기 (더 적게 제한)
        const placeholders = postIdsWithComments.map((_, i) => `$${i + 1}`).join(',')
        comments = await query(
          `WITH ranked_comments AS (
             SELECT 
               id, post_id, parent_id, author_name, content, created_at,
               ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at DESC) as rn
             FROM post_comments
             WHERE post_id IN (${placeholders})
           )
           SELECT id, post_id, parent_id, author_name, content, created_at
           FROM ranked_comments
           WHERE rn <= 5
           ORDER BY post_id, created_at ASC`,
          postIdsWithComments
        )
      }

      // 게시글별로 댓글 그룹화
      const commentsByPostId: Record<number, any[]> = {}
      comments.forEach((comment) => {
        if (!commentsByPostId[comment.post_id]) {
          commentsByPostId[comment.post_id] = []
        }
        commentsByPostId[comment.post_id].push(comment)
      })

      // 게시글에 댓글 추가
      postsWithComments = posts.map((post: any) => ({
        ...post,
        comments: commentsByPostId[post.id] || [],
      }))
    } else {
      // 댓글 없이 반환
      postsWithComments = posts.map((post: any) => ({
        ...post,
        comments: [],
      }))
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM posts ${whereClause}`,
      params
    )
    const total = parseInt(countResult[0].total)

    res.json({
      posts: postsWithComments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    console.error('❌ 게시글 목록 조회 오류:', error)
    res.status(500).json({ error: '게시글 목록을 불러올 수 없습니다.' })
  }
})

// 게시글 상세 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' })
    }

    const posts = await query(
      `SELECT id, author_name, title, content, views, comments_count, created_at, updated_at
       FROM posts WHERE id = $1`,
      [postId]
    )

    if (posts.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    }

    // 조회수 증가
    await query(`UPDATE posts SET views = views + 1 WHERE id = $1`, [postId])

    const post = posts[0]
    post.views = post.views + 1

    res.json(post)
  } catch (error) {
    console.error('❌ 게시글 상세 조회 오류:', error)
    res.status(500).json({ error: '게시글을 불러올 수 없습니다.' })
  }
})

// 게시글 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const { author_name, password, title, content } = req.body

    if (!author_name || !password || !title || !content) {
      return res.status(400).json({ error: '작성자, 비밀번호, 제목, 내용은 필수입니다.' })
    }

    if (author_name.length > 50) {
      return res.status(400).json({ error: '작성자 이름은 50자 이내여야 합니다.' })
    }

    if (title.length > 255) {
      return res.status(400).json({ error: '제목은 255자 이내여야 합니다.' })
    }

    const result = await query(
      `INSERT INTO posts (author_name, password, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, author_name, title, content, views, comments_count, created_at, updated_at`,
      [author_name.trim(), password, title.trim(), content.trim()]
    )

    res.status(201).json(result[0])
  } catch (error) {
    console.error('❌ 게시글 생성 오류:', error)
    res.status(500).json({ error: '게시글을 생성할 수 없습니다.' })
  }
})

// 게시글 수정 (비밀번호 확인)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' })
    }
    
    const { password, title, content } = req.body

    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' })
    }

    // 비밀번호 확인
    const posts = await query(`SELECT password FROM posts WHERE id = $1`, [postId])
    if (posts.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    }
    if (posts[0].password !== password) {
      return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
    }

    const result = await query(
      `UPDATE posts SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, author_name, title, content, views, comments_count, created_at, updated_at`,
      [title.trim(), content.trim(), postId]
    )

    res.json(result[0])
  } catch (error) {
    console.error('❌ 게시글 수정 오류:', error)
    res.status(500).json({ error: '게시글을 수정할 수 없습니다.' })
  }
})

// 게시글 삭제 (비밀번호 확인)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' })
    }
    
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' })
    }

    const posts = await query(`SELECT password FROM posts WHERE id = $1`, [postId])
    if (posts.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    }
    if (posts[0].password !== password) {
      return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
    }

    await query(`DELETE FROM posts WHERE id = $1`, [postId])

    res.json({ success: true, message: '게시글이 삭제되었습니다.' })
  } catch (error) {
    console.error('❌ 게시글 삭제 오류:', error)
    res.status(500).json({ error: '게시글을 삭제할 수 없습니다.' })
  }
})

// ========== 댓글 API ==========

// 댓글 목록 조회
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' })
    }

    const comments = await query(
      `SELECT id, post_id, parent_id, author_name, content, created_at
       FROM post_comments
       WHERE post_id = $1
       ORDER BY created_at ASC`,
      [postId]
    )

    res.json({ comments })
  } catch (error) {
    console.error('❌ 댓글 목록 조회 오류:', error)
    res.status(500).json({ error: '댓글 목록을 불러올 수 없습니다.' })
  }
})

// 댓글 생성
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10)
    
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' })
    }
    
    const { author_name, password, content, parent_id } = req.body

    if (!author_name || !password || !content) {
      return res.status(400).json({ error: '작성자, 비밀번호, 내용은 필수입니다.' })
    }

    // 게시글 존재 확인
    const posts = await query(`SELECT id FROM posts WHERE id = $1`, [postId])
    if (posts.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' })
    }

    // 대댓글인 경우 부모 댓글 존재 확인
    const parentIdNum = parent_id ? parseInt(String(parent_id), 10) : null
    if (parentIdNum) {
      if (isNaN(parentIdNum)) {
        return res.status(400).json({ error: '유효하지 않은 부모 댓글 ID입니다.' })
      }
      const parentComments = await query(
        `SELECT id FROM post_comments WHERE id = $1 AND post_id = $2`,
        [parentIdNum, postId]
      )
      if (parentComments.length === 0) {
        return res.status(404).json({ error: '부모 댓글을 찾을 수 없습니다.' })
      }
    }

    const result = await query(
      `INSERT INTO post_comments (post_id, parent_id, author_name, password, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, post_id, parent_id, author_name, content, created_at`,
      [postId, parentIdNum, author_name.trim(), password, content.trim()]
    )

    res.status(201).json(result[0])
  } catch (error) {
    console.error('❌ 댓글 생성 오류:', error)
    res.status(500).json({ error: '댓글을 생성할 수 없습니다.' })
  }
})

// 댓글 삭제 (비밀번호 확인)
router.delete('/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10)
    
    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ error: '유효하지 않은 댓글 ID입니다.' })
    }
    
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' })
    }

    const comments = await query(`SELECT password FROM post_comments WHERE id = $1`, [commentId])
    if (comments.length === 0) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' })
    }
    if (comments[0].password !== password) {
      return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
    }

    await query(`DELETE FROM post_comments WHERE id = $1`, [commentId])

    res.json({ success: true, message: '댓글이 삭제되었습니다.' })
  } catch (error) {
    console.error('❌ 댓글 삭제 오류:', error)
    res.status(500).json({ error: '댓글을 삭제할 수 없습니다.' })
  }
})

export default router

